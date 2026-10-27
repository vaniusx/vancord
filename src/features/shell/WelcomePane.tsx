import { Hash, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { demoChannels, DEMO_SERVER } from "@/features/shell/demo-data";

export function WelcomePane() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 bg-background p-10 text-center">
      <div className="brand-gradient flex size-16 items-center justify-center rounded-2xl text-white shadow-lg shadow-brand/20">
        <Sparkles className="size-8" />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("app.name")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
      </div>

      <div className="w-full max-w-sm space-y-1 rounded-xl border border-border bg-card p-3 text-left shadow-sm">
        <p className="px-1 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {DEMO_SERVER.name}
        </p>
        {demoChannels.slice(0, 3).map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() => navigate(`/channels/${channel.id}`)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Hash className="size-4" />
            <span className="truncate">{channel.name}</span>
          </button>
        ))}
      </div>

      <Button onClick={() => navigate(`/channels/${demoChannels[0].id}`)}>
        {t("sidebar.textChannels")}
      </Button>
    </section>
  );
}
