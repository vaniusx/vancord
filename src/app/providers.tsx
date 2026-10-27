import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { router } from "@/app/router";
import { ThemeProvider, useIsDark } from "@/app/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { queryClient } from "@/lib/query";

function AppToaster() {
  const dark = useIsDark();
  return (
    <Toaster
      theme={dark ? "dark" : "light"}
      position="bottom-right"
      closeButton
    />
  );
}

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={250}>
            <RouterProvider router={router} />
            <AppToaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
