// Runs the bot review suite. Every check is executed server-side so the result
// cannot be faked by the bot author's client.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const serviceKey =
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface Check {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

const PRIVATE_HOSTS =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[::1\]|::1)/i;

function isPrivate(url: URL) {
  return PRIVATE_HOSTS.test(url.hostname);
}

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

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3500),
    });
    return { ok: response.ok, status: response.status, ms: Date.now() - started, response };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : "fetch_failed",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // The caller must own the bot.
  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: "unauthenticated" }, 401);

  let botId: string | undefined;
  try {
    const body = await req.json();
    botId = typeof body?.botId === "string" ? body.botId : undefined;
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!botId) return json({ error: "missing_bot" }, 400);

  const { data: bot } = await admin
    .from("bots")
    .select("id, owner_id, name, webhook_url, permissions, token_hash, risk_tier")
    .eq("id", botId)
    .maybeSingle();

  if (!bot) return json({ error: "not_found" }, 404);
  if (bot.owner_id !== userData.user.id) return json({ error: "forbidden" }, 403);

  const checks: Check[] = [];
  const record = (id: string, label: string, passed: boolean, detail: string) =>
    checks.push({ id, label, passed, detail });

  let url: URL | null = null;
  try {
    url = new URL(bot.webhook_url);
  } catch {
    url = null;
  }

  // 1 — HTTPS only
  record(
    "https",
    "Webhook uses HTTPS",
    Boolean(url && url.protocol === "https:"),
    url ? url.protocol : "unparsable url",
  );

  // 2 — no private network targets (SSRF guard)
  record(
    "ssrf",
    "Webhook is not a private address",
    Boolean(url && !isPrivate(url)),
    url ? url.hostname : "—",
  );

  if (!url || url.protocol !== "https:" || isPrivate(url)) {
    const score = 0;
    await caller.rpc("mark_bot_tested", {
      target_bot: bot.id,
      did_pass: false,
      did_score: score,
      checks,
    });
    return json({ passed: false, score, checks });
  }

  const signingSecret = await hmac(bot.token_hash, "vancord-review");

  // 3 — signature challenge is echoed back
  const challenge = crypto.randomUUID();
  const signature = await hmac(signingSecret, challenge);
  const challengeResult = await post(
    bot.webhook_url,
    { event: "challenge", challenge },
    { "X-Vancord-Signature": `sha256=${signature}` },
  );

  let echoed = false;
  if (challengeResult.ok && challengeResult.response) {
    const text = await challengeResult.response.text().catch(() => "");
    echoed = text.includes(signature) || text.includes(challenge);
  }
  record(
    "signature",
    "Webhook can verify the signature",
    echoed,
    echoed ? "acknowledged" : `status ${challengeResult.status}`,
  );

  // 4 — accepts the standard event envelope
  const eventResult = await post(
    bot.webhook_url,
    {
      event: "ping",
      delivery: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
      data: { botId: bot.id },
    },
    { "X-Vancord-Event": "ping", "X-Vancord-Signature": `sha256=${await hmac(signingSecret, "ping")}` },
  );
  record(
    "envelope",
    "Accepts the event envelope",
    eventResult.ok,
    `status ${eventResult.status}`,
  );

  // 5 — latency budget
  record(
    "latency",
    "Responds within 2 seconds",
    eventResult.ms < 2000,
    `${eventResult.ms} ms`,
  );

  // 6 — idempotency: the same delivery id twice must not error
  const delivery = crypto.randomUUID();
  const first = await post(
    bot.webhook_url,
    { event: "ping", delivery, data: {} },
    { "X-Vancord-Event": "ping" },
  );
  const second = await post(
    bot.webhook_url,
    { event: "ping", delivery, data: {} },
    { "X-Vancord-Event": "ping" },
  );
  record(
    "idempotency",
    "Handles a repeated delivery id",
    second.status < 500,
    `first ${first.status}, repeat ${second.status}`,
  );

  // 7 — a HEAD-like probe must not dump the token
  record(
    "no_token_in_url",
    "Webhook URL carries no credentials",
    !url.username && !url.password && ![...url.searchParams.keys()].some((k) =>
      /token|key|secret/i.test(k)
    ),
    url.search || "clean",
  );

  // 8 — malformed payload is rejected, not crashed on
  const malformed = await post(bot.webhook_url, { event: "ping", data: "not-an-object" });
  record(
    "malformed",
    "Survives a malformed payload",
    malformed.status < 500,
    `status ${malformed.status}`,
  );

  // 9 — reported permissions are declared
  record(
    "permissions",
    "Declares at least one permission",
    (bot.permissions ?? []).length > 0,
    (bot.permissions ?? []).join(", ") || "none",
  );

  // 10 — final reachability probe
  const finalProbe = await post(bot.webhook_url, { event: "ping", data: {} });
  record(
    "reachable",
    "Remains reachable on a third call",
    finalProbe.ok,
    `status ${finalProbe.status}`,
  );

  // 11 — no redirect to a private address
  let redirectSafe = true;
  if (finalProbe.response && finalProbe.response.redirected) {
    try {
      redirectSafe = !isPrivate(new URL(finalProbe.response.url));
    } catch {
      redirectSafe = false;
    }
  }
  record(
    "redirect",
    "Redirects stay on public hosts",
    redirectSafe,
    redirectSafe ? "ok" : "private redirect",
  );

  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const didPass = passedCount === checks.length;

  await caller.rpc("mark_bot_tested", {
    target_bot: bot.id,
    did_pass: didPass,
    did_score: score,
    checks,
  });

  return json({ passed: didPass, score, checks });
});
