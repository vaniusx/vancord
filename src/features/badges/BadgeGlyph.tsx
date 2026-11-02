import { cn } from "@/lib/utils";

export type BadgeIcon =
  | "spark"
  | "terminal"
  | "crown"
  | "shield"
  | "bug"
  | "flame"
  | "gavel"
  | "bot"
  | "calendar"
  | "bolt"
  | "globe"
  | "palette"
  | "heart"
  | "star";

const GLYPHS: Record<string, string> = {
  // Crown: three points, a band, and a base.
  crown:
    "M4 9.4l3.7 2.8L12 5.6l4.3 6.6L20 9.4l-1.5 8.1H5.5zM6.1 19.3h11.8v1.6H6.1z",
  spark:
    "M11 2.8l1.7 4.9 4.9 1.7-4.9 1.7L11 16l-1.7-4.9L4.4 9.4l4.9-1.7zM18.2 15.4l.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9z",
  shield:
    "M12 2.5l7.4 2.7v6c0 4.5-3 8.4-7.4 9.9-4.4-1.5-7.4-5.4-7.4-9.9v-6zm-1.4 10.2l-2 2 3.3 3.3 5.4-5.4-2-2-3.4 3.4z",
  terminal:
    "M3.2 6.6A3.4 3.4 0 016.6 3.2h10.8a3.4 3.4 0 013.4 3.4v10.8a3.4 3.4 0 01-3.4 3.4H6.6a3.4 3.4 0 01-3.4-3.4zM7.4 7.9L5.9 9.4l4.6 3.9-4.6 3.9 1.5 1.5 6.1-5.4zm6.2 8.6v1.9h5.2v-1.9z",
  bug:
    "M12 6.5c2.9 0 5.2 2.4 5.2 5.6s-2.3 5.6-5.2 5.6-5.2-2.4-5.2-5.6S9.1 6.5 12 6.5zM10.9 5.5a1.1 1.1 0 012.2 0v1.4h-2.2zM2.4 8.2l3.8 1.3-.7 1.9-3.8-1.3zM21.6 8.2l-3.8 1.3.7 1.9 3.8-1.3zM2 11.9h4.1v2H2zM17.9 11.9H22v2h-4.1zM2.4 15.9l3.8-1.3.7 1.9-3.8 1.3zM21.6 15.9l-3.8-1.3-.7 1.9 3.8 1.3z",
  flame:
    "M12.9 2.3c3.9 3.6 6 6.6 6 9.9a6.9 6.9 0 11-13.8 0c0-2.1 1-3.9 2.6-5.7.3 2 1.2 3.2 2.6 3.8.2-3 .5-5.4 2.6-8zm-.9 10.4c-1.5 0-2.7 1.2-2.7 3s1.2 3 2.7 3 2.7-1.2 2.7-3-1.2-3-2.7-3z",
  gavel:
    "M3.3 19.1h9.6v1.9H3.3zM13.8 2.6l6.6 6.6-2.4 2.4-6.6-6.6zM10.3 6.1l6.6 6.6-2.4 2.4-6.6-6.6zM11.8 12.1L10.2 13.7 5.5 9l1.6-1.6z",
  bot:
    "M6 8.2h12a3.4 3.4 0 013.4 3.4v6.2a3.4 3.4 0 01-3.4 3.4H6a3.4 3.4 0 01-3.4-3.4v-6.2A3.4 3.4 0 016 8.2zm1.9 4.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8.2 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8.8 17.6h6.4v1.7H8.8zM11 3.3h2v4.5h-2z",
  // Calendar: a squared body with a punched header and two rings.
  calendar:
    "M7.2 3.2h2v2.4h-2zM14.8 3.2h2v2.4h-2zM4.6 6.4h14.8a1.6 1.6 0 011.6 1.6v10.4a1.6 1.6 0 01-1.6 1.6H4.6A1.6 1.6 0 013 18.4V8a1.6 1.6 0 011.6-1.6zm1.6 4.2v7.6h11.6V10.6z",
  // Bolt: a solid lightning wedge.
  bolt: "M13.6 2.2L5.4 13.1h4.7l-1.2 8.7 8.3-11.1h-4.8z",
  // Globe: a disc with two meridian cuts and an equator.
  globe:
    "M12 2.2a9.8 9.8 0 100 19.6 9.8 9.8 0 000-19.6zm0 2.1c1.4 1 2.4 2.9 2.8 5.2H9.2c.4-2.3 1.4-4.2 2.8-5.2zM9 11.5h6c0 1 .1 2 .3 2.9H8.7c.2-.9.3-1.9.3-2.9zm-2.2 0c0 1-.1 2-.3 2.9H4.4a7.7 7.7 0 010-2.9zm10.3 0h2.1a7.7 7.7 0 010 2.9h-2.1c.2-.9.2-1.9 0-2.9zM5.1 16.2h1.6c.4 1.5 1 2.7 1.8 3.4a7.7 7.7 0 01-3.4-3.4zm3.9 0h6c-.4 2.3-1.4 4.1-3 4.9-1.6-.8-2.6-2.6-3-4.9zm9.9 0h1.6a7.7 7.7 0 01-3.4 3.4c.8-.7 1.4-1.9 1.8-3.4z",
  // Palette: a disc with a thumb hole and three paint dots.
  palette:
    "M12 2.6a9.4 9.4 0 00-1.1 18.7c1.4.2 2-.7 2-1.5 0-.6-.3-1.1-.7-1.6-.3-.4-.5-.8-.5-1.3 0-.9.8-1.6 1.8-1.6h1.6c3.2 0 5.6-2.3 5.6-5.6 0-4-3.9-7.1-8.7-7.1zM7.6 8.1a1.4 1.4 0 110 2.8 1.4 1.4 0 010-2.8zm4.1-1.7a1.4 1.4 0 110 2.8 1.4 1.4 0 010-2.8zm4.2 1.1a1.4 1.4 0 110 2.8 1.4 1.4 0 010-2.8zM8.2 13.4a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6z",
  // Heart: two lobes and a point, slightly squared off.
  heart:
    "M12 20.9l-1.2-1.1C6.2 15.7 3 12.9 3 9.5A4.7 4.7 0 017.7 4.8c1.6 0 3.1.8 4.3 2 1.2-1.2 2.7-2 4.3-2A4.7 4.7 0 0121 9.5c0 3.4-3.2 6.2-7.8 10.3z",
  // Star: five points, cut straight rather than curved.
  star:
    "M12 2.4l2.8 6 6.5.8-4.8 4.4 1.3 6.4L12 16.8 6.2 20l1.3-6.4L2.7 9.2l6.5-.8z",
};

/** Shapes drawn as holes in the medallion, so the metal shows through the cut. */
function glyphPath(icon: string): string {
  return GLYPHS[icon] ?? GLYPHS.spark;
}

let counter = 0;

/**
 * A badge rendered as a struck metal medallion: outer rim, brushed face, inner
 * bevel and a cut-out glyph. It uses one inline SVG with its own gradient ids so
 * a list of badges never shares a definition by accident.
 */
export function BadgeMedallion({
  icon,
  color,
  size = 22,
  className,
}: {
  icon: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const uid = `bm${(counter = (counter + 1) % 100000)}`;
  const rim = `${uid}-rim`;
  const face = `${uid}-face`;
  const gloss = `${uid}-gloss`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={rim} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.42" />
        </linearGradient>
        <radialGradient id={face} cx="0.34" cy="0.24" r="0.85">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="0.45" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer rim */}
      <circle cx="12" cy="12" r="11.1" fill={`url(#${rim})`} />
      {/* Bevel shadow just inside the rim */}
      <circle cx="12" cy="12" r="9.6" fill={`url(#${face})`} />
      <circle
        cx="12"
        cy="12"
        r="9.6"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.28"
        strokeWidth="0.7"
      />
      {/* Brushed highlight across the top half */}
      <path
        d="M2.4 12a9.6 9.6 0 019.6-9.6 9.6 9.6 0 019.6 9.6z"
        fill={`url(#${gloss})`}
      />
      {/* The glyph is punched out of the metal. */}
      <path d={glyphPath(icon)} fill="#000000" fillOpacity="0.34" transform="translate(0 0.35)" />
      <path d={glyphPath(icon)} fill="#ffffff" fillOpacity="0.92" />
    </svg>
  );
}

/** Kept for callers that only want the silhouette on a flat background. */
export function BadgeGlyph({
  icon,
  size = 18,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path d={glyphPath(icon)} />
    </svg>
  );
}
