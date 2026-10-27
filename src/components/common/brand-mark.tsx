import { cn } from "@/lib/utils";

/**
 * Vancord mark: a petrol square with a rounded V cut into it. The V arms are
 * deliberately unequal so it reads as drawn rather than generated.
 */
export function BrandMark({
  className,
  size = 22,
  tone = "solid",
}: {
  className?: string;
  size?: number;
  tone?: "solid" | "mono" | "inverse";
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="8.6"
        fill={
          tone === "mono"
            ? "currentColor"
            : tone === "inverse"
              ? "var(--primary-foreground)"
              : "var(--brand)"
        }
      />
      <path
        d="M9.7 9.6 L16 22.4 L21.8 9.6"
        fill="none"
        stroke={
          tone === "mono"
            ? "var(--sidebar)"
            : tone === "inverse"
              ? "var(--primary)"
              : "var(--background)"
        }
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
