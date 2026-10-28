import type { StickerDef } from "@/features/stickers/catalog";
import { cn } from "@/lib/utils";

const MOTION_CLASS: Record<StickerDef["motion"], string> = {
  pop: "sticker-pop",
  bounce: "sticker-bounce",
  wobble: "sticker-wobble",
  pulse: "sticker-pulse",
  float: "sticker-float",
  shake: "sticker-shake",
};

export function StickerTile({
  sticker,
  size = "md",
  className,
}: {
  sticker: StickerDef;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box =
    size === "lg" ? "size-[132px] text-[62px]" : size === "sm" ? "size-14 text-[24px]" : "size-[68px] text-[32px]";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[18px]",
        box,
        MOTION_CLASS[sticker.motion],
        className,
      )}
      style={{
        background: `linear-gradient(150deg, color-mix(in oklab, ${sticker.hue} 22%, var(--card)) 0%, color-mix(in oklab, ${sticker.hue} 8%, var(--card)) 100%)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${sticker.hue} 22%, transparent)`,
      }}
      aria-label={sticker.labelTr}
      role="img"
    >
      <span className="sticker-glyph drop-shadow-sm select-none">{sticker.glyph}</span>
    </div>
  );
}

export function StickerMessage({
  sticker,
  onOpen,
}: {
  sticker: StickerDef;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-1.5 block transition-transform hover:scale-[1.03] active:scale-95"
    >
      <StickerTile sticker={sticker} size="lg" />
    </button>
  );
}
