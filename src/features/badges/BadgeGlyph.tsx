import { cn } from "@/lib/utils";

export type BadgeIcon =
  | "spark"
  | "terminal"
  | "crown"
  | "shield"
  | "bug"
  | "flame"
  | "gavel"
  | "bot";

/**
 * Badge glyphs are drawn as filled vector shapes so they stay crisp at 14px in a
 * member list and at 64px on a profile card. Nothing is bitmap.
 */
export function BadgeGlyph({
  icon,
  size = 18,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("shrink-0", className),
  };

  switch (icon as BadgeIcon) {
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
          <path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
        </svg>
      );
    case "terminal":
      return (
        <svg {...common}>
          <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
          <path d="M6.8 10.2l2.4 2.3-2.4 2.3M12.4 15.2h4.4" />
        </svg>
      );
    case "crown":
      return (
        <svg {...common}>
          <path d="M3.2 8.6l3.6 2.7L12 5.2l5.2 6.1 3.6-2.7-1.6 9.2H4.8z" />
          <path d="M4.8 20.2h14.4" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 2.8l7.2 2.6v6.1c0 4.3-2.9 8.1-7.2 9.7-4.3-1.6-7.2-5.4-7.2-9.7V5.4z" />
          <path d="M9.2 12.1l2.1 2.1 3.9-4" />
        </svg>
      );
    case "bug":
      return (
        <svg {...common}>
          <rect x="7.5" y="8" width="9" height="11" rx="4.5" />
          <path d="M9.5 8V6.4a2.5 2.5 0 015 0V8M3.6 12.5h3.9M16.5 12.5h3.9M4.6 7.6l2.6 1.6M19.4 7.6l-2.6 1.6M4.6 17.4l2.6-1.6M19.4 17.4l-2.6-1.6" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 2.6c3.6 3.4 6 6.1 6 9.4A6 6 0 016 12c0-2 1-3.6 2.4-5.2.4 1.7 1.2 2.7 2.4 3.2.3-3-.1-5.1 1.2-7.4z" />
        </svg>
      );
    case "gavel":
      return (
        <svg {...common}>
          <path d="M4 20.4h8.6M14.8 3.6l5.6 5.6-2.1 2.1-5.6-5.6zM11.4 7l5.6 5.6-2.1 2.1-5.6-5.6zM6.6 15.9l4.2-4.2" />
        </svg>
      );
    case "bot":
    default:
      return (
        <svg {...common}>
          <rect x="3.6" y="7.4" width="16.8" height="12" rx="3.4" />
          <path d="M12 3.4v4M8.4 12.6v.1M15.6 12.6v.1M9.6 16.4h4.8" />
          <circle cx="12" cy="3" r="1.4" />
        </svg>
      );
  }
}
