import { useTranslation } from "react-i18next";

import { useAppStore } from "@/features/app/app-store";
import { useProfileCache } from "@/features/profiles/profile-cache";

const EMPTY: string[] = [];

export function TypingIndicator({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const names = useAppStore((state) => state.typingNames[channelId]) ?? EMPTY;
  const profiles = useProfileCache((state) => state.profiles);

  if (names.length === 0) return null;

  const labels = names
    .slice(0, 3)
    .map((id) => profiles[id]?.display_name)
    .filter((value): value is string => Boolean(value));

  if (labels.length === 0) return null;

  return (
    <div className="flex h-5 items-center gap-1.5 px-5 text-[11px] text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground" />
      </span>
      {labels.join(", ")} {t("chat.typing")}
    </div>
  );
}
