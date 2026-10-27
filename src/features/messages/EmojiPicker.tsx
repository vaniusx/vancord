import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smile } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsDark } from "@/app/theme";
import { cn } from "@/lib/utils";

export function EmojiPicker({
  onSelect,
  trigger,
  children,
  align = "end",
  className,
}: {
  onSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const { t } = useTranslation();
  const dark = useIsDark();

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children ??
          trigger ?? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("chat.emoji")}
            className={cn("size-9 shrink-0 text-muted-foreground", className)}
          >
            <Smile className="size-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side="top"
        className="w-auto border-none bg-transparent p-0 shadow-none"
      >
        <Picker
          data={data}
          theme={dark ? "dark" : "light"}
          previewPosition="none"
          skinTonePosition="none"
          navPosition="bottom"
          perLine={8}
          maxFrequentRows={2}
          onEmojiSelect={(emoji) => onSelect(emoji.native)}
        />
      </PopoverContent>
    </Popover>
  );
}
