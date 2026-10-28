import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldOff, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MemberRow } from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export interface AutomodConfig {
  server_id: string;
  enabled: boolean;
  banned_words: string[];
  block_invites: boolean;
  max_mentions: number;
  max_messages_per_10s: number;
  mute_seconds: number;
  log_channel_id: string | null;
}

export function useAutomod(serverId: string | undefined) {
  return useQuery({
    queryKey: ["automod", serverId],
    enabled: Boolean(serverId),
    queryFn: async (): Promise<AutomodConfig | null> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_automod")
        .select(
          "server_id, enabled, banned_words, block_invites, max_mentions, max_messages_per_10s, mute_seconds, log_channel_id",
        )
        .eq("server_id", serverId!)
        .maybeSingle();
      if (error) throw error;
      return (data as AutomodConfig) ?? null;
    },
  });
}

export function useModerationMutations(serverId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["automod", serverId] });
    void queryClient.invalidateQueries({ queryKey: ["bans", serverId] });
    void queryClient.invalidateQueries({ queryKey: ["mod-actions", serverId] });
    void queryClient.invalidateQueries({ queryKey: ["members", serverId] });
  };

  const saveAutomod = useMutation({
    mutationFn: async (patch: Partial<AutomodConfig>) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("server_automod")
        .update(patch)
        .eq("server_id", serverId!);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const timeout = useMutation({
    mutationFn: async (input: { userId: string; seconds: number; reason?: string }) => {
      const supabase = requireSupabase();
      const until = new Date(Date.now() + input.seconds * 1000).toISOString();
      const { error } = await supabase.from("member_timeouts").upsert({
        server_id: serverId!,
        user_id: input.userId,
        until_at: until,
        reason: input.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const kick = useMutation({
    mutationFn: async (input: { userId: string; reason?: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("server_members")
        .delete()
        .eq("server_id", serverId!)
        .eq("user_id", input.userId);
      if (error) throw error;
      await supabase.from("mod_actions").insert({
        server_id: serverId!,
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_id: input.userId,
        action: "kick",
        reason: input.reason ?? null,
      });
    },
    onSuccess: invalidate,
  });

  const ban = useMutation({
    mutationFn: async (input: { userId: string; reason?: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase.from("server_bans").upsert({
        server_id: serverId!,
        user_id: input.userId,
        reason: input.reason ?? null,
        banned_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
      await supabase
        .from("server_members")
        .delete()
        .eq("server_id", serverId!)
        .eq("user_id", input.userId);
      await supabase.from("mod_actions").insert({
        server_id: serverId!,
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_id: input.userId,
        action: "ban",
        reason: input.reason ?? null,
      });
    },
    onSuccess: invalidate,
  });

  const unban = useMutation({
    mutationFn: async (userId: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("server_bans")
        .delete()
        .eq("server_id", serverId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { saveAutomod, timeout, kick, ban, unban };
}

export function useBans(serverId: string | undefined) {
  return useQuery({
    queryKey: ["bans", serverId],
    enabled: Boolean(serverId),
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_bans")
        .select("user_id, reason, created_at, profiles!server_bans_user_id_fkey(id, display_name, username, avatar_url)")
        .eq("server_id", serverId!);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        userId: row.user_id as string,
        reason: row.reason as string | null,
        profile: row.profiles as unknown as {
          id: string;
          display_name: string;
          username: string;
          avatar_url: string | null;
        },
      }));
    },
  });
}

const TIMEOUT_CHOICES = [
  { seconds: 300, label: "5m" },
  { seconds: 3600, label: "1h" },
  { seconds: 86400, label: "1d" },
];

export function ModerationSettings({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const { data: config } = useAutomod(serverId);
  const { data: bans } = useBans(serverId);
  const { saveAutomod, unban } = useModerationMutations(serverId);
  const [words, setWords] = useState("");

  useEffect(() => {
    if (config) setWords(config.banned_words.join(", "));
  }, [config?.server_id, config?.banned_words.join(",")]);

  if (!config) return null;

  const save = (patch: Partial<AutomodConfig>) => {
    saveAutomod.mutate(patch, {
      onError: () => toast.error(t("common.error")),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
        <div>
          <p className="text-[12.5px] font-semibold">{t("moderation.automod")}</p>
          <p className="text-[11.5px] text-muted-foreground">
            {t("moderation.automodHint")}
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(value) => save({ enabled: value })}
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[11.5px]">{t("moderation.maxMentions")}</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={config.max_mentions}
            onChange={(event) => save({ max_mentions: Number(event.target.value) || 8 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11.5px]">{t("moderation.rateLimit")}</Label>
          <Input
            type="number"
            min={2}
            max={30}
            value={config.max_messages_per_10s}
            onChange={(event) =>
              save({ max_messages_per_10s: Number(event.target.value) || 6 })
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
        <span className="text-[12px]">{t("moderation.blockInvites")}</span>
        <Switch
          checked={config.block_invites}
          onCheckedChange={(value) => save({ block_invites: value })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11.5px]">{t("moderation.bannedWords")}</Label>
        <Input
          value={words}
          placeholder={t("moderation.bannedWordsPlaceholder")}
          onChange={(event) => setWords(event.target.value)}
          onBlur={() =>
            save({
              banned_words: words
                .split(",")
                .map((word) => word.trim())
                .filter(Boolean),
            })
          }
        />
        <p className="text-[10.5px] text-muted-foreground">
          {t("moderation.bannedWordsHint")}
        </p>
      </div>

      {saveAutomod.isPending ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {t("common.save")}
        </p>
      ) : null}

      {(bans ?? []).length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold">{t("moderation.bans")}</p>
          {bans?.map((ban) => (
            <div
              key={ban.userId}
              className="flex items-center gap-2 rounded-lg bg-accent/40 px-2 py-1.5"
            >
              <Avatar
                profile={{
                  id: ban.userId,
                  display_name: ban.profile?.display_name ?? "?",
                  avatar_url: ban.profile?.avatar_url ?? null,
                  accent_color: "#4F46E5",
                }}
                size="xs"
              />
              <span className="min-w-0 flex-1 truncate text-[12px]">
                {ban.profile?.display_name ?? ban.userId.slice(0, 8)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10.5px]"
                onClick={() => unban.mutate(ban.userId)}
              >
                {t("moderation.unban")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ModerationActions({
  serverId,
  member,
  canModerate,
  isOwner,
}: {
  serverId: string | undefined;
  member: MemberRow;
  canModerate: boolean;
  isOwner: boolean;
}) {
  const { t } = useTranslation();
  const { timeout, kick, ban } = useModerationMutations(serverId);

  if (!canModerate || isOwner) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1 border-t border-border/60 pt-2">
      {TIMEOUT_CHOICES.map((choice) => (
        <button
          key={choice.seconds}
          type="button"
          onClick={() =>
            timeout.mutate(
              { userId: member.user_id, seconds: choice.seconds },
              {
                onSuccess: () =>
                  toast.success(t("moderation.timedOut", { duration: choice.label })),
                onError: () => toast.error(t("common.error")),
              },
            )
          }
          className={cn(
            "flex items-center gap-1 rounded-md bg-accent/70 px-1.5 py-1 text-[10px] transition-colors hover:bg-accent",
          )}
        >
          <VolumeX className="size-2.5" />
          {choice.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          kick.mutate(
            { userId: member.user_id },
            { onSuccess: () => toast.success(t("moderation.kicked")) },
          )
        }
        className="rounded-md bg-accent/70 px-1.5 py-1 text-[10px] transition-colors hover:bg-accent"
      >
        {t("moderation.kick")}
      </button>
      <button
        type="button"
        onClick={() =>
          ban.mutate(
            { userId: member.user_id },
            { onSuccess: () => toast.success(t("moderation.banned")) },
          )
        }
        className="flex items-center gap-1 rounded-md bg-destructive/12 px-1.5 py-1 text-[10px] text-destructive transition-colors hover:bg-destructive/20"
      >
        <ShieldOff className="size-2.5" />
        {t("moderation.ban")}
      </button>
    </div>
  );
}
