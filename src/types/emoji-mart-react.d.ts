declare module "@emoji-mart/react" {
  import type { FunctionComponent } from "react";

  interface EmojiMartProps {
    data: unknown;
    theme?: "auto" | "light" | "dark";
    previewPosition?: "none" | "top" | "bottom";
    skinTonePosition?: "none" | "preview" | "search";
    onEmojiSelect?: (emoji: { native: string; id: string }) => void;
    locale?: string;
    perLine?: number;
    maxFrequentRows?: number;
    navPosition?: "top" | "bottom" | "none";
    searchPosition?: "sticky" | "static" | "none";
    className?: string;
  }

  const Picker: FunctionComponent<EmojiMartProps>;
  export default Picker;
}
