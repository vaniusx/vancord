import { cn } from "@/lib/utils";

/**
 * Vancord mark: a rounded speech bubble with the V cut out of it. The bubble
 * signals chat, the V is the name, and the single path means it stays crisp at
 * 16px in the title bar and at 512px in an installer.
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
  const fill =
    tone === "mono"
      ? "currentColor"
      : tone === "inverse"
        ? "var(--primary-foreground)"
        : "var(--brand)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        fill={fill}
        fillRule="evenodd"
        d="M256 168H768A120 120 0 0 1 888 288V680A120 120 0 0 1 768 800H612L470 918C448 936 414 920 414 892V800H256A120 120 0 0 1 136 680V288A120 120 0 0 1 256 168ZM352 322H466L512 620L558 322H672L556 700H468Z"
      />
    </svg>
  );
}
