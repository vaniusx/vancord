import { Compass, Plus, Settings2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { demoChannels, DEMO_SERVER } from "@/features/shell/demo-data";

const demoServerIcons = [
  { id: DEMO_SERVER.id, label: DEMO_SERVER.name, initials: "VT" },
  { id: "s2", label: "Tasarım Ekibi", initials: "TE" },
  { id: "s3", label: "Oyun Gecesi", initials: "OG" },
];

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className="group relative flex size-12 items-center justify-center"
        >
          <span
            className={cn(
              "absolute -left-3 w-1 rounded-r-full bg-foreground transition-all duration-150",
              active ? "h-8" : "h-2 opacity-0 group-hover:h-4 group-hover:opacity-100",
            )}
          />
          <span
            className={cn(
              "flex size-12 items-center justify-center text-sm font-semibold transition-all duration-150",
              active
                ? "rounded-xl bg-primary text-primary-foreground"
                : "rounded-2xl bg-sidebar text-sidebar-foreground group-hover:rounded-xl group-hover:bg-primary/90 group-hover:text-primary-foreground",
            )}
          >
            {children}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ServerRail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>(DEMO_SERVER.id);

  return (
    <nav
      aria-label={t("rail.home")}
      className="flex w-[72px] shrink-0 flex-col items-center gap-2 border-r border-black/10 bg-rail py-3 dark:border-white/5"
    >
      <RailButton
        label={t("rail.home")}
        active={activeId === "home"}
        onClick={() => {
          setActiveId("home");
          navigate("/");
        }}
      >
        <Sparkles className="size-5" />
      </RailButton>

      <div className="my-1 h-px w-8 bg-black/10 dark:bg-white/10" />

      <div className="scrollbar-none flex w-full flex-col items-center gap-2 overflow-y-auto">
        {demoServerIcons.map((server) => (
          <RailButton
            key={server.id}
            label={server.label}
            active={activeId === server.id}
            onClick={() => {
              setActiveId(server.id);
              navigate(`/channels/${demoChannels[0].id}`);
            }}
          >
            {server.initials}
          </RailButton>
        ))}

        <RailButton label={t("rail.addServer")}>
          <Plus className="size-5 text-status-online" />
        </RailButton>
        <RailButton label={t("rail.explore")}>
          <Compass className="size-5 text-status-online" />
        </RailButton>
      </div>

      <div className="mt-auto">
        <RailButton label={t("rail.settings")}>
          <Settings2 className="size-5" />
        </RailButton>
      </div>
    </nav>
  );
}
