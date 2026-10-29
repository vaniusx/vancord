import { useQuery } from "@tanstack/react-query";

import { BadgeGlyph } from "@/features/badges/BadgeGlyph";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/features/auth/auth-store";
import type { BadgeRow } from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export interface AwardedBadge extends BadgeRow {
  granted_at: string;
}

export const badgesKey = (userId: string | undefined) =>
  ["badges", userId] as const;

export function useBadges(userId?: string | null) {
  const currentUser = useCurrentUser();
  const id = userId ?? currentUser?.id;

  return useQuery({
    queryKey: badgesKey(id ?? undefined),
    enabled: Boolean(id),
    staleTime: 60_000,
    queryFn: async (): Promise<AwardedBadge[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("user_badges")
        .select(
          "granted_at, badges!inner(id, name_tr, name_en, description_tr, description_en, color, icon, sort)",
        )
        .eq("user_id", id!)
        .order("granted_at", { ascending: true });

      if (error) throw error;

      return (data ?? [])
        .map((row) => {
          const badge = row.badges as unknown as BadgeRow | null;
          if (!badge) return null;
          return { ...badge, granted_at: row.granted_at as string };
        })
        .filter((badge): badge is AwardedBadge => badge !== null)
        .sort((a, b) => a.sort - b.sort);
    },
  });
}

export function BadgeChip({
  badge,
  language,
  size = "md",
}: {
  badge: AwardedBadge;
  language: string;
  size?: "sm" | "md" | "lg";
}) {
  const label = language === "tr" ? badge.name_tr : badge.name_en;
  const description = language === "tr" ? badge.description_tr : badge.description_en;

  // A medallion rather than a rounded square: it reads as an award, keeps its
  // silhouette at 18px, and the inner radial gradient gives it depth without an
  // image asset.
  const box =
    size === "lg" ? "size-10" : size === "sm" ? "size-[18px]" : "size-[22px]";
  const glyph = size === "lg" ? 22 : size === "sm" ? 12 : 14;
  const color = badge.color;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            box,
          )}
          style={{
            color,
            background: `radial-gradient(120% 120% at 30% 22%, color-mix(in oklab, ${color} 42%, transparent), color-mix(in oklab, ${color} 12%, transparent) 62%, color-mix(in oklab, ${color} 7%, transparent))`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 55%, transparent), inset 0 1px 0 color-mix(in oklab, white 22%, transparent), 0 1px 2px rgb(0 0 0 / 0.18)`,
          }}
        >
          <BadgeGlyph icon={badge.icon} size={glyph} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-center">
        <p className="font-semibold">{label}</p>
        <p className="text-[11px] opacity-80">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
export function BadgeRowList({
  badges,
  language,
  size = "md",
  limit,
}: {
  badges: AwardedBadge[];
  language: string;
  size?: "sm" | "md" | "lg";
  limit?: number;
}) {
  if (badges.length === 0) return null;
  const visible = limit ? badges.slice(0, limit) : badges;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((badge) => (
        <BadgeChip key={badge.id} badge={badge} language={language} size={size} />
      ))}
      {limit && badges.length > limit ? (
        <span className="text-[10.5px] text-muted-foreground">
          +{badges.length - limit}
        </span>
      ) : null}
    </div>
  );
}
