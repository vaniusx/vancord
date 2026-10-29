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
 * Badges are solid silhouettes, not outline icons: at 12px inside a member row an
 * outline collapses into a smudge, while a filled shape keeps its identity. Holes
 * are cut with `evenodd` so the glyph reads on any background.
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
    fill: "currentColor",
    "aria-hidden": true,
    className: cn("shrink-0", className),
  };

  switch (icon as BadgeIcon) {
    case "crown":
      return (
        <svg {...common}>
          <path d="M3.6 9.1l3.9 3 4.5-6.4 4.5 6.4 3.9-3-1.6 9.4H5.2z" />
          <rect x="5.2" y="19.4" width="13.6" height="1.7" rx="0.85" />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path d="M11 2.6l1.8 5.2 5.2 1.8-5.2 1.8L11 16.6l-1.8-5.2L4 9.6l5.2-1.8z" />
          <path d="M18.1 15.3l1 2.9 2.9 1-2.9 1-1 2.9-1-2.9-2.9-1 2.9-1z" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2.4l7.6 2.8v6.2c0 4.6-3.1 8.6-7.6 10.2-4.5-1.6-7.6-5.6-7.6-10.2V5.2zm-1.5 10.3l-2 2 3.4 3.4 5.5-5.5-2-2-3.5 3.5z"
          />
        </svg>
      );

    case "terminal":
      return (
        <svg {...common}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3 6.4A3.4 3.4 0 016.4 3h11.2A3.4 3.4 0 0121 6.4v11.2a3.4 3.4 0 01-3.4 3.4H6.4A3.4 3.4 0 013 17.6zM7.1 7.6l-1.4 1.5 4.7 4-4.7 4 1.4 1.5 6.2-5.5zm6.4 8.5v2h5.4v-2z"
          />
        </svg>
      );

    case "bug":
      return (
        <svg {...common}>
          <path d="M12 6.4c2.9 0 5.1 2.4 5.1 5.5s-2.2 5.5-5.1 5.5-5.1-2.4-5.1-5.5S9.1 6.4 12 6.4z" />
          <path d="M10.9 5.6a1.1 1.1 0 012.2 0v1.3h-2.2z" />
          <rect x="2.6" y="8.4" width="3.9" height="1.7" rx="0.85" transform="rotate(-22 4.55 9.25)" />
          <rect x="17.5" y="8.4" width="3.9" height="1.7" rx="0.85" transform="rotate(22 19.45 9.25)" />
          <rect x="2.2" y="11.4" width="4.2" height="1.7" rx="0.85" />
          <rect x="17.6" y="11.4" width="4.2" height="1.7" rx="0.85" />
          <rect x="2.6" y="14.6" width="3.9" height="1.7" rx="0.85" transform="rotate(22 4.55 15.45)" />
          <rect x="17.5" y="14.6" width="3.9" height="1.7" rx="0.85" transform="rotate(-22 19.45 15.45)" />
        </svg>
      );

    case "flame":
      return (
        <svg {...common}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.9 2.3c3.9 3.6 6 6.6 6 9.9a6.9 6.9 0 11-13.8 0c0-2.1 1-3.9 2.6-5.7.3 2 1.2 3.2 2.6 3.8.2-3 .5-5.4 2.6-8zm-.9 10.4c-1.5 0-2.6 1.2-2.6 2.9 0 1.7 1.2 3 2.6 3s2.6-1.3 2.6-3c0-1.7-1.1-2.9-2.6-2.9z"
          />
        </svg>
      );

    case "gavel":
      return (
        <svg {...common}>
          <rect x="3.4" y="19.1" width="9.4" height="1.9" rx="0.95" />
          <path d="M13.9 2.7l6.5 6.5-2.4 2.4-6.5-6.5z" />
          <path d="M10.4 6.2l6.5 6.5-2.4 2.4-6.5-6.5z" />
          <path d="M11.9 12.2l-1.6 1.6-4.6-4.6 1.6-1.6z" />
        </svg>
      );

    case "bot":
      return (
        <svg {...common}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6 8.2h12a3.4 3.4 0 013.4 3.4v6.2a3.4 3.4 0 01-3.4 3.4H6a3.4 3.4 0 01-3.4-3.4v-6.2A3.4 3.4 0 016 8.2zm1.9 4.4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8.2 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8.8 17.8h6.4v1.7H8.8z"
          />
          <rect x="11" y="3.4" width="2" height="4.4" rx="1" />
          <circle cx="12" cy="2.8" r="1.6" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.6" fillOpacity="0.18" />
          <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}
