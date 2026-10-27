import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-store";
import type { Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type Profile = Tables<"profiles">;

export const profileQueryKey = (userId: string | undefined) =>
  ["profile", userId] as const;

export function useProfile() {
  const user = useCurrentUser();

  return useQuery({
    queryKey: profileQueryKey(user?.id),
    enabled: Boolean(supabase && user?.id),
    queryFn: async (): Promise<Profile | null> => {
      if (!supabase || !user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
