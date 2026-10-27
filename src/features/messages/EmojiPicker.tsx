import { Smile } from "lucide-react";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const LazyPicker = lazy(async () => {
  const [pickerModule, dataModule] = await Promise.all([
    import("@emoji-mart/react"),
    import("@emoji-mart/data"),
  ]);
  const Picker = pickerModule.default;
  const data = dataModule.default;
  return {
    default: (props: { theme: "dark" | "light"; onSelect: (emoji: string) => void }) => (
      <Picker
        data={data}
        theme={props.theme}
        previewPosition="none"
        skinTonePosition="none"
        navPosition="bottom"
        perLine={8}
        maxFrequentRows={2}
        onEmojiSelect={(emoji: { native: string }) => props.onSelect(emoji.native)}
      />
    ),
  };
});

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
        <Suspense fallback={<div className="h-64 w-72" />}>
          <LazyPicker theme={dark ? "dark" : "light"} onSelect={onSelect} />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}
