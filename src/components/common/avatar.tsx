import { cn } from "@/lib/utils";
import { frameLook, isAnimatedFrame, nameplateColor } from "@/lib/cosmetics";
import { accentFor, initials } from "@/lib/format";
import type { ProfileSummary } from "@/lib/models";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
  xl: "size-20 text-2xl",
} as const;

const RING_WIDTH: Record<keyof typeof SIZES, number> = {
  xs: 2,
  sm: 2,
  md: 2.5,
  lg: 3,
  xl: 4,
};

function Ring({ look, size }: { look: NonNullable<ReturnType<typeof frameLook>>; size: keyof typeof SIZES }) {
  const width = RING_WIDTH[size];
  const animated = isAnimatedFrame(look);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -inset-[3px] rounded-full",
        look.style === "glow" && "blur-[3px]",
        animated && "animate-[spin_6s_linear_infinite]",
      )}
      style={{
        padding: width,
        background: `conic-gradient(from 0deg, ${look.outer}, ${look.inner}, ${look.outer})`,
        maskImage: `radial-gradient(farthest-side, transparent calc(100% - ${width}px), #000 calc(100% - ${width}px))`,
        WebkitMaskImage: `radial-gradient(farthest-side, transparent calc(100% - ${width}px), #000 calc(100% - ${width}px))`,
      }}
    />
  );
}

export function Avatar({
  profile,
  size = "md",
  className,
  showFrame = true,
}: {
  profile: Pick<
    ProfileSummary,
    "id" | "display_name" | "avatar_url" | "accent_color"
  > &
    Partial<Pick<ProfileSummary, "frame_sku">>;
  size?: keyof typeof SIZES;
  className?: string;
  /** Frames are skipped inside dense lists where a ring reads as noise. */
  showFrame?: boolean;
}) {
  const accent = profile.accent_color || accentFor(profile.id);
  const look = showFrame ? frameLook(profile.frame_sku) : null;

  return (
    <div className={cn("relative shrink-0", className)}>
      {look ? <Ring look={look} size={size} /> : null}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-black/10 ring-inset select-none",
          SIZES[size],
        )}
        style={{
          // Both stops are opaque. The old gradient faded to 53% alpha, so the
          // lower half of every initials avatar became near-white and the white
          // label dropped to a 1.04 contrast ratio.
          backgroundImage: `linear-gradient(140deg, ${accent} 0%, color-mix(in oklab, ${accent} 74%, #000) 100%)`,
        }}
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
    </div>
  );
}

/** A display name tinted by its nameplate, falling back to normal ink. */
export function Nameplate({
  profile,
  className,
  children,
}: {
  profile: Pick<ProfileSummary, "nameplate_sku">;
  className?: string;
  children: React.ReactNode;
}) {
  const color = nameplateColor(profile.nameplate_sku);
  return (
    <span className={className} style={color ? { color } : undefined}>
      {children}
    </span>
  );
}
