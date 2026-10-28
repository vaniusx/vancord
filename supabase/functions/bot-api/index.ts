// Bot REST API. Authenticated with `Authorization: Bot <token>`.
// The token is stored as a SHA-256 hash; only the prefix is queryable.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-vancord-delivery",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface BotRecord {
  id: string;
  owner_id: string;
  permissions: string[];
  webhook_url: string;
  token_hash: string;
}

async function authenticate(req: Request): Promise<BotRecord | null> {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bot ")) return null;

  const token = header.slice(4).trim();
  const [prefix] = token.split(".");
  if (!prefix || !token.includes(".")) return null;

  const { data } = await admin
    .from("bots")
    .select("id, owner_id, permissions, webhook_url, token_hash")
    .eq("token_prefix", prefix)
    .eq("status", "approved")
    .maybeSingle();

  if (!data) return null;
  const hash = await sha256(token);
  if (hash !== data.token_hash) return null;
  return data as BotRecord;
}

function has(permissions: string[], needed: string) {
  return permissions.includes(needed);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const bot = await authenticate(req);
  if (!bot) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/bot-api\/?/, "").replace(/^v1\//, "");

  // GET /channels — channels of the servers this bot is installed in
  if (req.method === "GET" && path === "channels") {
    if (!has(bot.permissions, "channels.read")) return json({ error: "missing_permission" }, 403);

    const { data: installs } = await admin
      .from("bot_installs")
      .select("server_id")
      .eq("bot_id", bot.id);

    const serverIds = (installs ?? []).map((row) => row.server_id);
    if (serverIds.length === 0) return json({ channels: [] });

    const { data, error } = await admin
      .from("channels")
      .select("id, server_id, type, name, topic, position")
      .in("server_id", serverIds)
      .order("position");

    if (error) return json({ error: error.message }, 500);
    return json({ channels: data });
  }

  // GET /members?server_id=...
  if (req.method === "GET" && path === "members") {
    if (!has(bot.permissions, "members.read")) return json({ error: "missing_permission" }, 403);

    const serverId = url.searchParams.get("server_id");
    if (!serverId) return json({ error: "missing_server_id" }, 400);

    const { data: install } = await admin
      .from("bot_installs")
      .select("server_id")
      .eq("bot_id", bot.id)
      .eq("server_id", serverId)
      .maybeSingle();
    if (!install) return json({ error: "not_installed" }, 403);

    const { data, error } = await admin
      .from("server_members")
      .select("role, joined_at, profiles!inner(id, username, display_name, avatar_url, status)")
      .eq("server_id", serverId);

    if (error) return json({ error: error.message }, 500);
    return json({ members: data });
  }

  // POST /messages — send a message as the bot
  if (req.method === "POST" && path === "messages") {
    if (!has(bot.permissions, "messages.write")) return json({ error: "missing_permission" }, 403);

    let body: { channel_id?: string; content?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }

    const channelId = body.channel_id;
    const content = (body.content ?? "").trim();
    if (!channelId) return json({ error: "missing_channel_id" }, 400);
    if (!content) return json({ error: "missing_content" }, 400);
    if (content.length > 4000) return json({ error: "content_too_long" }, 400);

    const { data: channel } = await admin
      .from("channels")
      .select("id, server_id, type")
      .eq("id", channelId)
      .maybeSingle();
    if (!channel || channel.type !== "text") return json({ error: "invalid_channel" }, 400);

    const { data: install } = await admin
      .from("bot_installs")
      .select("server_id")
      .eq("bot_id", bot.id)
      .eq("server_id", channel.server_id)
      .maybeSingle();
    if (!install) return json({ error: "not_installed" }, 403);

    // Light rate limit: 20 messages per minute per bot.
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id)
      .gte("created_at", since);

    if ((count ?? 0) >= 20) return json({ error: "rate_limited" }, 429);

    const { data, error } = await admin
      .from("messages")
      .insert({ channel_id: channelId, bot_id: bot.id, content, author_id: null })
      .select("id, created_at")
      .single();

    if (error) return json({ error: error.message }, 500);
    return json({ message: data }, 201);
  }

  return json({ error: "not_found" }, 404);
});
