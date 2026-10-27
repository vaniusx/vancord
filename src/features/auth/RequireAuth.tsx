import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

import { useAuthStatus } from "@/features/auth/auth-store";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStatus();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
