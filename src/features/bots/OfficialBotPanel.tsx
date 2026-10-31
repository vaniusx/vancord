import { BadgeCheck, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Switch } from "@/components/ui/switch";
import { requireSupabase } from "@/lib/supabase";

interface OfficialSettings {
  welcome_enabled: boolean;
  modlog_enabled: boolean;
  boost_messages: boolean;
}

const settingsKey = (serverId: string) => ["official-bot", serverId] as const;

/**
 * Switches for the official Vancord bot.
 *
 * It is not installable: every server gets it, it never appears in the member
 * list, and the three behaviours are toggled here. The database enforces the
 * same rules, so turning everything off simply stops it writing.
 */
export function OfficialBotPanel({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: settingsKey(serverId),
    queryFn: async (): Promise<OfficialSettings> => {
      const supabase = requireSupabase();
      const { data: row } = await supabase
        .from("official_bot_settings")
        .select("welcome_enabled, modlog_enabled, boost_messages")
        .eq("server_id", serverId)
        .maybeSingle();
      return {
        welcome_enabled: row?.welcome_enabled ?? true,
        modlog_enabled: row?.modlog_enabled ?? true,
        boost_messages: row?.boost_messages ?? true,
      };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<OfficialSettings>) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("official_bot_settings")
        .upsert({ server_id: serverId, ...patch }, { onConflict: "server_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKey(serverId) });
    },
  });

  const rows: Array<{ field: keyof OfficialSettings; label: string; hint: string }> = [
    {
      field: "welcome_enabled",
      label: t("officialBot.welcome"),
      hint: t("officialBot.welcomeHint"),
    },
    {
      field: "modlog_enabled",
      label: t("officialBot.modlog"),
      hint: t("officialBot.modlogHint"),
    },
    {
      field: "boost_messages",
      label: t("officialBot.boost"),
      hint: t("officialBot.boostHint"),
    },
  ];

  return (
    <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <BadgeCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold">Vancord</p>
          <p className="text-[11px] text-muted-foreground">{t("officialBot.subtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          {rows.map((row) => (
            <div key={row.field} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-medium">{row.label}</p>
                <p className="text-[10.5px] text-muted-foreground">{row.hint}</p>
              </div>
              <Switch
                checked={Boolean(data?.[row.field])}
                disabled={update.isPending}
                onCheckedChange={(value) => update.mutate({ [row.field]: value })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
