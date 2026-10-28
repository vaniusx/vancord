// Delivers message events to installed bots as signed webhooks.
// Only the database may call this: the request carries an internal HMAC that is
// checked before anything is dispatched.
import { createClient } from "jsr:@supabase/supabase-js@2";

const serviceKey =
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

async function hmac(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readSecret(key: string) {
  const { data } = await admin.rpc("get_integration_secret", { secret_key: key });
  return typeof data === "string" && data.length > 0 ? data : undefined;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const internalSecret = await readSecret("internal_dispatch_secret");
  if (!internalSecret) return new Response("not_configured", { status: 503 });

  const raw = await req.text();
  const provided = req.headers.get("X-Vancord-Internal") ?? "";
  const expected = await hmac(internalSecret, raw);
  if (provided !== expected) return new Response("forbidden", { status: 403 });

  let payload: {
    bot_id?: string;
    event?: string;
    body?: Record<string, unknown>;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("invalid_body", { status: 400 });
  }

  const botId = payload.bot_id;
  const event = payload.event ?? "messageCreate";
  const body = payload.body ?? {};
  if (!botId) return new Response("missing_bot", { status: 400 });

  const { data: bot } = await admin
    .from("bots")
    .select("id, webhook_url, token_hash, permissions")
    .eq("id", botId)
    .eq("status", "approved")
    .maybeSingle();

  if (!bot) return new Response("unknown_bot", { status: 404 });

  const permission = event === "memberJoin" ? "members.read" : "messages.read";
  if (!(bot.permissions ?? []).includes(permission)) {
    return new Response("missing_permission", { status: 403 });
  }

  // The webhook secret is derived per bot so one leaked secret cannot forge
  // events for another bot.
  const signingSecret = await hmac(bot.token_hash, internalSecret);
  const envelope = JSON.stringify({
    event,
    delivery: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
    data: body,
  });
  const signature = await hmac(signingSecret, envelope);
  const started = Date.now();

  try {
    const response = await fetch(bot.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Vancord-Event": event,
        "X-Vancord-Signature": `sha256=${signature}`,
      },
      body: envelope,
      signal: AbortSignal.timeout(4000),
    });

    await admin.from("bot_events").insert({
      bot_id: bot.id,
      event,
      status: response.status,
      latency_ms: Date.now() - started,
      error: response.ok ? null : `http_${response.status}`,
    });

    return new Response("delivered", { status: 202 });
  } catch (error) {
    await admin.from("bot_events").insert({
      bot_id: bot.id,
      event,
      status: 0,
      latency_ms: Date.now() - started,
      error: error instanceof Error ? error.message : "delivery_failed",
    });
    return new Response("delivery_failed", { status: 502 });
  }
});
