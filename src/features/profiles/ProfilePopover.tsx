import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MessageSquare, UserPlus } from "lucide-react";

import { Avatar } from "@/components/common/avatar";
import { BrandMark } from "@/components/common/brand-mark";
import { BadgeRowList, useBadges } from "@/features/badges/use-badges";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useStartDm } from "@/features/dm/use-dms";
import { useFriendMutations, useFriendships } from "@/features/friends/use-friends";
import { useLiveStatus } from "@/features/realtime/realtime";
import { StatusDot } from "@/features/shell/presence";
import { accentFor } from "@/lib/format";
import type { ProfileSummary, ServerRole } from "@/lib/models";
import { cn } from "@/lib/utils";

function ActivityLine({ profile }: { profile: ProfileSummary }) {
  const { t } = useTranslation();
  const activity = profile.activity;

  if (!profile.activity_visible || !activity) return null;

  return (
    <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-background/70 px-2.5 py-2 dark:bg-black/25">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-[12px]">
        🎮
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[12px] font-medium">{activity.name}</p>
        <p className="truncate text-[10.5px] text-muted-foreground">
          {t("profile.nowPlaying")}
        </p>
      </div>
    </div>
  );
}

interface ProfilePopoverProps {
  profile: ProfileSummary | null;
  role?: ServerRole;
  joinedAt?: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function ProfilePopover({
  profile,
  role,
  joinedAt,
  children,
  side = "right",
}: ProfilePopoverProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { data: badges } = useBadges(profile?.id);
  const { data: edges } = useFriendships();
  const { sendRequest } = useFriendMutations();
  const startDm = useStartDm();
  const status = useLiveStatus(profile?.id ?? "", profile?.status ?? "offline");

  if (!profile) return <>{children}</>;

  const isSelf = currentUser?.id === profile.id;
  const accent = profile.banner_color || accentFor(profile.id);

  const relationship = (edges ?? []).find(
    (edge) => edge.requester_id === profile.id || edge.addressee_id === profile.id,
  );
  const isFriend = relationship?.status === "accepted";
  const isPending = relationship?.status === "pending";

  const openDm = async () => {
    const channelId = await startDm.mutateAsync(profile.id);
    navigate(`/dm/${channelId}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="contents"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") event.stopPropagation();
          }}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="start"
        sideOffset={6}
        collisionPadding={8}
        avoidCollisions
        className="w-[min(290px,calc(100vw-1rem))] overflow-hidden p-0"
      >
        <div
          className="h-16 w-full"
          style={
            profile.banner_url
              ? {
                  backgroundImage: `url(${profile.banner_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `linear-gradient(135deg, ${accent} 0%, color-mix(in oklab, ${accent} 55%, var(--card)) 100%)`,
                }
          }
        />

        <div className="px-3.5 pb-3.5">
          <div className="-mt-6 flex items-end justify-between">
            <div className="relative">
              <Avatar profile={profile} size="lg" className="ring-4 ring-popover" />
              <StatusDot
                status={status}
                className="absolute -right-0.5 -bottom-0.5 size-3 ring-popover"
              />
            </div>
            {role ? (
              <span className="mb-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold">
                {t(`members.roles.${role}`)}
              </span>
            ) : null}
          </div>

          <div className="mt-2">
            <p className="truncate text-[14px] font-semibold">{profile.display_name}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">
              @{profile.username}
            </p>
          </div>

          {badges && badges.length > 0 ? (
            <div className="mt-2.5">
              <BadgeRowList badges={badges} language={i18n.language} limit={6} />
            </div>
          ) : null}

          {profile.custom_status ? (
            <p className="mt-2.5 text-[12px] text-foreground/80">
              {profile.custom_status}
            </p>
          ) : null}

          {profile.bio ? (
            <>
              <div className="my-2.5 h-px bg-border/70" />
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("settings.profile.bio")}
              </p>
              <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            </>
          ) : null}

          <ActivityLine profile={profile} />

          {joinedAt ? (
            <p className="mt-2.5 text-[10.5px] text-muted-foreground">
              {t("profile.memberSince", {
                date: new Date(joinedAt).toLocaleDateString(
                  i18n.language === "tr" ? "tr-TR" : "en-US",
                  { year: "numeric", month: "long", day: "numeric" },
                ),
              })}
            </p>
          ) : null}

          {isSelf ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/60 px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
              <BrandMark size={14} tone="mono" className="opacity-60" />
              {t("profile.thisIsYou")}
            </div>
          ) : (
            <div className="mt-3 flex gap-1.5">
              <Button
                size="sm"
                className="h-8 flex-1 text-[12px]"
                onClick={() => void openDm()}
              >
                <MessageSquare className="mr-1.5 size-3.5" />
                {t("profile.message")}
              </Button>
              {!isFriend ? (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("h-8 text-[12px]", isPending && "opacity-60")}
                  disabled={isPending}
                  onClick={() => {
                    sendRequest.mutate(profile.id, {
                      onSuccess: () =>
                        toast.success(
                          t("friends.requestSent", { name: profile.display_name }),
                        ),
                      onError: () => toast.error(t("common.error")),
                    });
                  }}
                >
                  <UserPlus className="mr-1.5 size-3.5" />
                  {isPending ? t("friends.pending") : t("friends.add")}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
