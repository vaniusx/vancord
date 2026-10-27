import { useTranslation } from "react-i18next";

import { demoMembers, type DemoMember } from "@/features/shell/demo-data";
import { StatusDot } from "@/features/shell/presence";
import { cn } from "@/lib/utils";

function MemberRow({ member }: { member: DemoMember }) {
  const offline = member.status === "offline";

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-sidebar-accent/60",
        offline && "opacity-50",
      )}
    >
      <div className="relative">
        <div
          className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: member.color }}
        >
          {member.name.slice(0, 1)}
        </div>
        <StatusDot
          status={member.status}
          className="absolute -right-0.5 -bottom-0.5"
        />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13.5px] font-medium">{member.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {member.role}
        </p>
      </div>
    </button>
  );
}

export function MemberList() {
  const { t } = useTranslation();

  const online = demoMembers.filter((member) => member.status !== "offline");
  const offline = demoMembers.filter((member) => member.status === "offline");

  return (
    <aside className="scrollbar-none hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto border-l border-sidebar-border bg-sidebar px-2 py-4 text-sidebar-foreground lg:flex">
      <section className="space-y-0.5">
        <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("sidebar.online")} — {online.length}
        </h2>
        {online.map((member) => (
          <MemberRow key={member.id} member={member} />
        ))}
      </section>

      {offline.length > 0 ? (
        <section className="space-y-0.5">
          <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("sidebar.offline")} — {offline.length}
          </h2>
          {offline.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </section>
      ) : null}
    </aside>
  );
}
