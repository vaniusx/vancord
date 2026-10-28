import { Smile } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  STICKERS,
  STICKER_CATEGORIES,
  type StickerDef,
} from "@/features/stickers/catalog";
import { StickerTile } from "@/features/stickers/Sticker";
import { cn } from "@/lib/utils";

export function StickerPicker({
  onSelect,
  children,
}: {
  onSelect: (sticker: StickerDef) => void;
  children?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(STICKER_CATEGORIES[0].id);

  const visible = STICKERS.filter((sticker) => sticker.category === category);
  const turkish = i18n.language === "tr";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("stickers.title")}
            className="size-8 shrink-0 text-muted-foreground"
          >
            <Smile className="size-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-[312px] p-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="px-1 text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("stickers.title")}
          </p>
          <span className="pr-1 text-[10.5px] text-muted-foreground">
            {STICKERS.length} {t("stickers.count")}
          </span>
        </div>

        <div className="scrollbar-none mb-2 flex gap-1 overflow-x-auto">
          {STICKER_CATEGORIES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setCategory(entry.id)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                category === entry.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {turkish ? entry.labelTr : entry.labelEn}
            </button>
          ))}
        </div>

        <div className="scrollbar-thin grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto pr-0.5">
          {visible.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              title={turkish ? sticker.labelTr : sticker.labelEn}
              onClick={() => {
                onSelect(sticker);
                setOpen(false);
              }}
              className="rounded-[18px] transition-transform hover:scale-105 focus-visible:scale-105"
            >
              <StickerTile sticker={sticker} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
