import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "vancord.auth",
      },
      realtime: {
        params: { eventsPerSecond: 20 },
      },
      global: {
        headers: { "x-client-info": "vancord-desktop" },
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  return supabase;
}

export function publicUrl(bucket: string, path: string): string {
  if (!supabase) return "";
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
