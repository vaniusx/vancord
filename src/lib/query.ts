import { QueryClient, MutationCache, QueryCache } from "@tanstack/react-query";
import { toast } from "sonner";

import { explainError } from "@/lib/errors";
import i18n from "@/lib/i18n";

/**
 * Turns an error into a toast. Mutations that already show their own message opt
 * out with `meta: { handled: true }`, so nothing is reported twice.
 */
function report(error: unknown) {
  const explained = explainError(error);
  const translated = i18n.t(explained.message);
  const message =
    translated === explained.message ? explained.message : translated;
  toast.error(message, { id: explained.message });
}

export const queryClient = new QueryClient({
  // A background refetch that fails should not shout; it retries quietly and the
  // next successful fetch fixes the screen. Only mutations raise a toast.
  queryCache: new QueryCache({
    onError: () => {
      // intentionally silent: stale data stays on screen
    },
  }),

  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // The mutation supplied its own handler (usually a specific toast).
      if (mutation.options.onError) return;
      if (mutation.meta?.handled) return;
      report(error);
    },
  }),

  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const explained = explainError(error);
        if (explained.permanent) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
