// Mints a LiveKit access token for the calling user.
// Secrets: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL
import { createClient } from "jsr:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2.9.5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("LIVEKIT_URL");
  const apiKey = Deno.env.get("LIVEKIT_API_KEY");
  const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

  if (!url || !apiKey || !apiSecret) {
    return json({ error: "livekit_not_configured" }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: "unauthenticated" }, 401);

  let channelId: string | undefined;
  try {
    const body = await req.json();
    channelId = typeof body?.channelId === "string" ? body.channelId : undefined;
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!channelId) return json({ error: "missing_channel" }, 400);

  // Row level security decides whether this user may see the channel at all.
  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select("id, type, server_id")
    .eq("id", channelId)
    .maybeSingle();

  if (channelError || !channel) return json({ error: "forbidden" }, 403);
  if (channel.type !== "voice") return json({ error: "not_a_voice_channel" }, 400);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userData.user.id)
    .maybeSingle();

  const room = `voice_${channelId}`;
  const token = new AccessToken(apiKey, apiSecret, {
    identity: userData.user.id,
    name: profile?.display_name ?? userData.user.email ?? "Vancord",
    ttl: "2h",
    metadata: JSON.stringify({ avatar: profile?.avatar_url ?? null }),
  });

  token.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return json({ token: await token.toJwt(), url, room });
});
