import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
import { supabase } from "@/lib/supabase";

/**
 * Keeps the auth store in sync with the Supabase session. Runs once at the
 * root so every screen can read the current session synchronously.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }

    let disposed = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (!disposed) setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      disposed = true;
      data.subscription.unsubscribe();
    };
  }, [setSession]);

  return <>{children}</>;
}
