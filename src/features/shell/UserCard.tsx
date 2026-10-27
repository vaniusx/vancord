import { LogOut, Settings, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/features/app/app-store";
import { useProfile, useUpdateProfile } from "@/features/profiles/use-profile";
import { StatusDot, type PresenceStatus } from "@/features/shell/presence";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const STATUSES: PresenceStatus[] = ["online", "idle", "dnd", "invisible"];

export function UserCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const openSettings = useAppStore((state) => state.openSettings);

  if (!profile) {
    return (
      <div className="flex items-center gap-2 border-t border-sidebar-border/70 px-3 py-2.5">
        <div className="size-8 animate-pulse rounded-full bg-secondary" />
        <div className="flex-1 space-y-1">
          <div className="h-2.5 w-24 animate-pulse rounded bg-secondary" />
          <div className="h-2 w-16 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    );
  }

  const signOut = async () => {
    await supabase?.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border/70 px-2 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-sidebar-accent/60"
          >
            <div className="relative">
              <Avatar profile={profile} size="sm" />
              <StatusDot
                status={profile.status}
                className="absolute -right-0.5 -bottom-0.5 size-2.5"
              />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold">
                {profile.display_name}
              </p>
              <p
                className={cn(
                  "truncate text-[11px]",
                  profile.custom_status
                    ? "text-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                {profile.custom_status || `@${profile.username}`}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <UserRound className="size-3.5" />
            {profile.display_name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUSES.map((status) => (
            <DropdownMenuItem
              key={status}
              onSelect={() => updateProfile.mutate({ status })}
              className="gap-2"
            >
              <StatusDot status={status} ring={false} />
              {t(`status.${status}`)}
              {profile.status === status ? (
                <span className="ml-auto text-[11px] text-primary">•</span>
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openSettings("profile")}>
            <Settings className="mr-2 size-4" />
            {t("settings.title")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void signOut()} variant="destructive">
            <LogOut className="mr-2 size-4" />
            {t("auth.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground"
        aria-label={t("settings.title")}
        onClick={() => openSettings("appearance")}
      >
        <Settings className="size-4" />
      </Button>
    </div>
  );
}
