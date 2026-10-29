import { cn } from "@/lib/utils";
import { accentFor, initials } from "@/lib/format";
import type { ProfileSummary } from "@/lib/models";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
  xl: "size-20 text-2xl",
} as const;

export function Avatar({
  profile,
  size = "md",
  className,
}: {
  profile: Pick<ProfileSummary, "id" | "display_name" | "avatar_url" | "accent_color">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const accent = profile.accent_color || accentFor(profile.id);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-black/10 ring-inset select-none",
        SIZES[size],
        className,
      )}
      style={{
        // Both stops are opaque. The old gradient faded to 53% alpha, so the
        // lower half of every initials avatar became near-white and the white
        // label dropped to a 1.04 contrast ratio.
        backgroundImage: `linear-gradient(140deg, ${accent} 0%, color-mix(in oklab, ${accent} 74%, #000) 100%)`,
      }}
      title={profile.display_name}
    >
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className="size-full object-cover"
          draggable={false}
        />
      ) : (
        <span>{initials(profile.display_name)}</span>
      )}
    </div>
  );
}
