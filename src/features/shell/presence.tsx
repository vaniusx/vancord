import { cn } from "@/lib/utils";

export type PresenceStatus = "online" | "idle" | "dnd" | "invisible" | "offline";

const STATUS_CLASS: Record<PresenceStatus, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  invisible: "bg-status-offline",
  offline: "bg-status-offline",
};

export function StatusDot({
  status,
  className,
  ring = true,
}: {
  status: PresenceStatus;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2.5 rounded-full",
        STATUS_CLASS[status],
        ring && "ring-2 ring-sidebar",
        className,
      )}
    />
  );
}
