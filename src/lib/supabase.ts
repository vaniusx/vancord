import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Single browser-side Supabase client. Row level security is the only
 * authority boundary: the service role key must never reach the client.
 */
export const supabase: TypedSupabaseClient | null = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Desktop webviews never receive an OAuth redirect fragment.
        detectSessionInUrl: false,
        storageKey: "vancord.auth",
      },
      global: {
        headers: { "x-client-info": "vancord-desktop" },
      },
    })
  : null;

export function requireSupabase(): TypedSupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  return supabase;
}
