import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Shield, ShieldOff, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Avatar } from "@/components/common/avatar";
import { BadgeRowList, useBadges } from "@/features/badges/use-badges";
import { ModerationActions } from "@/features/moderation/ModerationSettings";
import { ProfilePopover } from "@/features/profiles/ProfilePopover";
import { useStartDm } from "@/features/dm/use-dms";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useLiveStatus, usePresenceStore } from "@/features/realtime/realtime";
import { StatusDot } from "@/features/shell/presence";
import type { MemberRow, PresenceStatus } from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const RANK: Record<PresenceStatus, number> = {
  online: 0,
  idle: 1,
  dnd: 2,
  invisible: 3,
  offline: 4,
};

function MemberBadges({ userId }: { userId: string }) {
  const { i18n } = useTranslation();
  const { data: badges } = useBadges(userId);
  if (!badges || badges.length === 0) return null;
  return (
    <div className="mt-1">
      <BadgeRowList badges={badges} language={i18n.language} size="sm" limit={4} />
    </div>
  );
}

function MemberTile({
  member,
  canModerate,
}: {
  member: MemberRow;
  canModerate?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startDm = useStartDm();
  const status = useLiveStatus(member.user_id, member.profile.status);
  const offline = status === "offline";

  const openDm = async () => {
    const channelId = await startDm.mutateAsync(member.user_id);
    navigate(`/dm/${channelId}`);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <ProfilePopover profile={member.profile} role={member.role} joinedAt={member.joined_at}>
      <div
        className={cn(
          "flex w-full cursor-pointer gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/60",
          offline && "opacity-55",
        )}
      >
        <div className="relative mt-0.5 shrink-0">
          <Avatar profile={member.profile} size="sm" />
          <StatusDot
            status={status}
            className="absolute -right-0.5 -bottom-0.5 size-2.5"
          />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium">
            <span className="truncate">{member.profile.display_name}</span>
            {member.role !== "member" ? (
              <span className="shrink-0 rounded bg-primary/10 px-1 py-px text-[10px] font-semibold text-primary">
                {t(`members.roles.${member.role}`)}
              </span>
            ) : null}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {member.profile.custom_status || `@${member.profile.username}`}
          </p>
          <MemberBadges userId={member.user_id} />
        </div>
      </div>
    </ProfilePopover>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => void openDm()}>
          <MessageSquare className="mr-2 size-4" />
          {t("friends.message")}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            void navigator.clipboard.writeText(member.profile.username);
          }}
        >
          <UserRound className="mr-2 size-4" />
          {t("profiles.copyUsername")}
        </ContextMenuItem>
        {canModerate && member.role !== "owner" ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => {
                void navigator.clipboard.writeText(member.user_id);
              }}
            >
              <Shield className="mr-2 size-4" />
              {t("moderation.copyId")}
            </ContextMenuItem>
            <ContextMenuItem disabled>
              <ShieldOff className="mr-2 size-4" />
              {t("profiles.usePanelToModerate")}
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function useTimedOutMembers(serverId: string | undefined) {
  return useQuery({
    queryKey: ["timeouts", serverId],
    enabled: Boolean(serverId),
    queryFn: async (): Promise<Set<string>> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("member_timeouts")
        .select("user_id, until_at")
        .eq("server_id", serverId!)
        .gt("until_at", new Date().toISOString());
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.user_id as string));
    },
  });
}

export function MemberList({
  members,
  serverId,
  canModerate = false,
}: {
  members: MemberRow[];
  serverId?: string;
  canModerate?: boolean;
}) {
  const { t } = useTranslation();
  const { data: timedOut } = useTimedOutMembers(serverId);

  // Sorting and the online count must use the live status; using the stored
  // column put offline people at the top and inflated the count.
  const liveStatuses = usePresenceStore((state) => state.statuses);

  const statusOf = (member: MemberRow): PresenceStatus => {
    const live = liveStatuses[member.user_id];
    if (live === "invisible") return "offline";
    return live ?? "offline";
  };

  const sorted = [...members].sort((a, b) => {
    const rank = RANK[statusOf(a)] - RANK[statusOf(b)];
    if (rank !== 0) return rank;
    return a.profile.display_name.localeCompare(b.profile.display_name, "tr");
  });

  const onlineCount = members.filter((member) => statusOf(member) !== "offline").length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between border-b border-border/60 px-4 py-3">
        <p className="text-[13px] font-semibold">{t("sidebar.members")}</p>
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {onlineCount}/{members.length}
        </p>
      </div>

      <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto p-2">
        {sorted.map((member) => (
          <div key={member.user_id}>
            <MemberTile member={member} canModerate={canModerate} />
            {timedOut?.has(member.user_id) ? (
              <p className="px-2 text-[10px] font-medium text-status-idle">
                {t("moderation.muted")}
              </p>
            ) : null}
            {canModerate ? (
              <ModerationActions
                serverId={serverId}
                member={member}
                canModerate={canModerate}
                isOwner={member.role === "owner"}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}