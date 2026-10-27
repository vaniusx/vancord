import { Hash, Shield, Crown, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Avatar } from "@/components/common/avatar";
import { useLiveStatus } from "@/features/realtime/realtime";
import { StatusDot } from "@/features/shell/presence";
import type { ChannelRow, MemberRow } from "@/lib/models";
import { cn } from "@/lib/utils";

function MemberTile({ member }: { member: MemberRow }) {
  const status = useLiveStatus(member.user_id, member.profile.status);
  const offline = status === "offline";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50",
        offline && "opacity-55",
      )}
    >
      <div className="relative">
        <Avatar profile={member.profile} size="sm" />
        <StatusDot
          status={status}
          className="absolute -right-0.5 -bottom-0.5 size-2.5"
        />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-medium">
          {member.profile.display_name}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {member.profile.custom_status || `@${member.profile.username}`}
        </p>
      </div>
    </div>
  );
}

function RoleGroup({
  label,
  icon,
  members,
}: {
  label: string;
  icon: React.ReactNode;
  members: MemberRow[];
}) {
  if (members.length === 0) return null;

  return (
    <section className="space-y-0.5">
      <h3 className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {icon}
        {label}
        <span className="ml-auto tabular-nums">{members.length}</span>
      </h3>
      {members.map((member) => (
        <MemberTile key={member.user_id} member={member} />
      ))}
    </section>
  );
}

export function DetailContent({
  serverName,
  channel,
  members,
}: {
  serverName?: string;
  channel: ChannelRow;
  members: MemberRow[];
}) {
  const { t } = useTranslation();

  const owners = members.filter((member) => member.role === "owner");
  const admins = members.filter((member) => member.role === "admin");
  const regular = members.filter((member) => member.role === "member");

  return (
    <div className="scrollbar-thin flex h-full flex-col gap-4 overflow-y-auto p-3">
      <div className="rounded-xl border border-border/70 bg-card/60 p-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Hash className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{channel.name}</p>
            <p className="truncate text-[10.5px] text-muted-foreground">
              {serverName}
            </p>
          </div>
        </div>
        {channel.topic ? (
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            {channel.topic}
          </p>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground/70">
            {t("chat.noTopic")}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <RoleGroup
          label={t("members.roles.owner")}
          icon={<Crown className="size-3" />}
          members={owners}
        />
        <RoleGroup
          label={t("members.roles.admin")}
          icon={<Shield className="size-3" />}
          members={admins}
        />
        <RoleGroup
          label={t("members.roles.member")}
          icon={<User className="size-3" />}
          members={regular}
        />
      </div>
    </div>
  );
}
