import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCurrentUser } from "@/features/auth/auth-store";
import { requireSupabase } from "@/lib/supabase";

export const ALL_DISPLAY_PERMISSIONS = [
  "messages.read",
  "messages.write",
  "messages.manage",
  "reactions.write",
  "members.read",
  "members.moderate",
  "channels.read",
  "channels.manage",
] as const;

export type BotPermission = (typeof ALL_DISPLAY_PERMISSIONS)[number];

export interface BotRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  webhook_url: string;
  permissions: string[];
  risk_tier: number;
  status: string;
  created_at: string;
}

export function useMyBots() {
  const user = useCurrentUser();

  return useQuery({
    queryKey: ["bots", "mine", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<BotRow[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("bots")
        .select(
          "id, owner_id, name, description, avatar_url, webhook_url, permissions, risk_tier, status, created_at",
        )
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as BotRow[];
    },
  });
}

export function useApprovedBots() {
  return useQuery({
    queryKey: ["bots", "approved"],
    queryFn: async (): Promise<BotRow[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("bots")
        .select(
          "id, owner_id, name, description, avatar_url, webhook_url, permissions, risk_tier, status, created_at",
        )
        .eq("status", "approved")
        .order("name");

      if (error) throw error;
      return (data ?? []) as BotRow[];
    },
  });
}

export function useServerBots(serverId: string | undefined) {
  return useQuery({
    queryKey: ["bots", "installed", serverId],
    enabled: Boolean(serverId),
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("bot_installs")
        .select("bot_id, bots!inner(id, name, avatar_url, description)")
        .eq("server_id", serverId!);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        botId: row.bot_id as string,
        bot: row.bots as unknown as { id: string; name: string; avatar_url: string | null; description: string | null },
      }));
    },
  });
}

export function useBotActions() {
  const queryClient = useQueryClient();

  const createBot = useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      webhook: string;
      permissions: string[];
    }) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("create_bot", {
        bot_name: input.name,
        bot_description: input.description,
        bot_webhook: input.webhook,
        bot_permissions: input.permissions,
      });
      if (error) throw error;
      const row = (data ?? [])[0] as { bot_id: string; token: string } | undefined;
      if (!row) throw new Error("no_token");
      return row;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  const testBot = useMutation({
    mutationFn: async (botId: string) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.functions.invoke<{
        passed: boolean;
        score: number;
        checks: Array<{ id: string; label: string; passed: boolean; detail: string }>;
      }>("bot-review", { body: { botId } });
      if (error) throw error;
      if (!data) throw new Error("no_result");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  const rotateToken = useMutation({
    mutationFn: async (botId: string) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("rotate_bot_token", { target_bot: botId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  const deleteBot = useMutation({
    mutationFn: async (botId: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.from("bots").delete().eq("id", botId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  const installBot = useMutation({
    mutationFn: async (input: { botId: string; serverId: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("bot_installs")
        .insert({ bot_id: input.botId, server_id: input.serverId });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bots", "installed"] });
    },
  });

  const uninstallBot = useMutation({
    mutationFn: async (input: { botId: string; serverId: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("bot_installs")
        .delete()
        .eq("bot_id", input.botId)
        .eq("server_id", input.serverId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bots", "installed"] });
    },
  });

  const reviewBot = useMutation({
    mutationFn: async (input: { botId: string; decision: string; note?: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc("review_bot", {
        target_bot: input.botId,
        decision: input.decision,
        note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  return { createBot, testBot, rotateToken, deleteBot, installBot, uninstallBot, reviewBot };
}

export function useBotErrorMessage() {
  const { t } = useTranslation();

  return (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (message.includes("bot_limit_reached")) return t("bots.errors.limit");
    if (message.includes("webhook_must_be_https")) return t("bots.errors.https");
    if (message.includes("name_too_short")) return t("bots.errors.nameShort");
    return t("common.error");
  };
}

export function usePendingBots() {
  return useQuery({
    queryKey: ["bots", "pending"],
    queryFn: async (): Promise<BotRow[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("bots")
        .select(
          "id, owner_id, name, description, avatar_url, webhook_url, permissions, risk_tier, status, created_at",
        )
        .eq("status", "pending_review")
        .order("created_at");

      if (error) throw error;
      return (data ?? []) as BotRow[];
    },
  });
}

export function notifyResult(passed: boolean, score: number) {
  if (passed) {
    toast.success(`Test geçti · ${score}/100`);
    return;
  }
  toast.error(`Test başarısız · ${score}/100`);
}
