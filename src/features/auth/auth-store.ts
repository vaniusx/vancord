import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  session: null,
  user: null,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      status: session ? "authenticated" : "unauthenticated",
    }),
}));

export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useAuthStatus = () => useAuthStore((state) => state.status);
