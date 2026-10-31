import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/features/app/app-store";
import { cn } from "@/lib/utils";

/** Motion, density and readability. */
export function AccessibilitySection() {
  const { t } = useTranslation();
  const reduceMotion = useAppStore((state) => state.reduceMotion);
  const setReduceMotion = useAppStore((state) => state.setReduceMotion);
  const density = useAppStore((state) => state.messageDensity);
  const setDensity = useAppStore((state) => state.setMessageDensity);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium">{t("a11y.reduceMotion")}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("a11y.reduceMotionHint")}
          </p>
        </div>
        <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
      </div>

      <div className="space-y-1.5 border-t border-border/60 pt-4">
        <Label>{t("a11y.density")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["cozy", "compact"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDensity(value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors",
                density === value
                  ? "border-primary bg-primary/8 font-medium text-primary"
                  : "border-border hover:bg-accent/50",
              )}
            >
              {t(`a11y.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        {t("a11y.hint")}
      </p>
    </div>
  );
}

/** Activity visibility and direct-message rules. */
export function PrivacySection() {
  const { t } = useTranslation();
  const activityVisible = useAppStore((state) => state.activityVisible);
  const setActivityVisible = useAppStore((state) => state.setActivityVisible);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium">{t("privacy.activity")}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("privacy.activityHint")}
          </p>
        </div>
        <Switch checked={activityVisible} onCheckedChange={setActivityVisible} />
      </div>

      <div className="flex items-start justify-between gap-3 border-t border-border/60 pt-4">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium">{t("privacy.notifications")}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("privacy.notificationsHint")}
          </p>
        </div>
        <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
      </div>

      <p className="border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        {t("privacy.hint")}
      </p>
    </div>
  );
}

const SHORTCUTS = [
  { keys: "Ctrl K", label: "shortcuts.palette" },
  { keys: "Ctrl B", label: "shortcuts.channels" },
  { keys: "Ctrl Shift M", label: "shortcuts.members" },
  { keys: "Ctrl ,", label: "shortcuts.settings" },
  { keys: "Ctrl Shift D", label: "shortcuts.mute" },
  { keys: "Ctrl Shift V", label: "shortcuts.camera" },
  { keys: "Esc", label: "shortcuts.close" },
];

export function ShortcutsSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <p className="text-[12.5px] font-semibold">{t("shortcuts.title")}</p>
      <p className="text-[11.5px] text-muted-foreground">{t("shortcuts.body")}</p>
      <div className="mt-2 space-y-1">
        {SHORTCUTS.map((item) => (
          <div
            key={item.keys}
            className="flex items-center justify-between rounded-lg px-1.5 py-1.5 hover:bg-accent/40"
          >
            <span className="text-[12.5px]">{t(item.label)}</span>
            <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-sans text-[10.5px] text-muted-foreground">
              {item.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
