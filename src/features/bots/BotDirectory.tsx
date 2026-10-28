import { Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useApprovedBots,
  useBotActions,
  usePendingBots,
  useServerBots,
} from "@/features/bots/use-bots";
import { useCurrentUser } from "@/features/auth/auth-store";
import { requireSupabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function BotDirectory({ serverId }: { serverId: string | undefined }) {
  const { t } = useTranslation();
  const { data: bots, isLoading } = useApprovedBots();
  const { data: installed } = useServerBots(serverId);
  const { installBot, uninstallBot } = useBotActions();

  const installedIds = new Set((installed ?? []).map((row) => row.botId));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[13px] font-semibold">{t("bots.directory.title")}</p>
        <p className="text-[11.5px] text-muted-foreground">{t("bots.directory.body")}</p>
      </div>

      {(bots ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
          {t("bots.directory.empty")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {bots?.map((bot) => {
            const active = installedIds.has(bot.id);
            return (
              <div
                key={bot.id}
                className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/60 p-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                  {bot.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="flex items-center gap-1.5 truncate text-[12.5px] font-medium">
                    {bot.name}
                    {bot.risk_tier >= 3 ? (
                      <ShieldCheck className="size-3 text-status-idle" />
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {bot.description || bot.permissions.slice(0, 2).join(", ")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={active ? "outline" : "default"}
                  className="h-7 text-[11.5px]"
                  disabled={!serverId || installBot.isPending || uninstallBot.isPending}
                  onClick={() => {
                    if (!serverId) return;
                    if (active) {
                      uninstallBot.mutate(
                        { botId: bot.id, serverId },
                        { onSuccess: () => toast.success(t("bots.directory.remove")) },
                      );
                    } else {
                      installBot.mutate(
                        { botId: bot.id, serverId },
                        {
                          onSuccess: () => toast.success(t("bots.directory.add")),
                          onError: () => toast.error(t("common.error")),
                        },
                      );
                    }
                  }}
                >
                  {active ? t("bots.directory.installed") : t("bots.directory.add")}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BotReviewQueue() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { data: pending } = usePendingBots();
  const { reviewBot } = useBotActions();

  const { data: isFounder } = useQuery({
    queryKey: ["is-founder", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data } = await supabase
        .from("servers")
        .select("id")
        .eq("owner_id", user!.id)
        .limit(1);
      return (data ?? []).length > 0;
    },
  });

  if (!isFounder || (pending ?? []).length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-status-idle/40 bg-status-idle/5 p-3">
      <p className="text-[12.5px] font-semibold">
        {t("bots.review.title", { count: pending?.length ?? 0 })}
      </p>
      {pending?.map((bot) => (
        <div key={bot.id} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">{bot.name}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {bot.permissions.join(", ")}
            </p>
          </div>
          <Button
            size="sm"
            className="h-7 text-[11px]"
            onClick={() =>
              reviewBot.mutate(
                { botId: bot.id, decision: "approved" },
                { onSuccess: () => toast.success(t("bots.review.approved")) },
              )
            }
          >
            <ShieldCheck className="mr-1 size-3" />
            {t("bots.review.approve")}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() =>
              reviewBot.mutate({ botId: bot.id, decision: "rejected" })
            }
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function InstalledBots({ serverId }: { serverId: string | undefined }) {
  const { t } = useTranslation();
  const { data: installed } = useServerBots(serverId);
  const { uninstallBot } = useBotActions();

  if (!serverId || (installed ?? []).length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[12px] font-semibold">{t("bots.directory.installed")}</p>
      {installed?.map((row) => (
        <div key={row.botId} className="flex items-center gap-2 rounded-lg bg-accent/40 px-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[12px]">{row.bot?.name ?? ""}</span>
          <Button
            size="icon"
            variant="ghost"
            className={cn("size-6 text-muted-foreground hover:text-destructive")}
            onClick={() =>
              uninstallBot.mutate({ botId: row.botId, serverId })
            }
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
