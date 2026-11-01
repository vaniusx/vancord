import {
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Users,
  X,
} from "@/components/icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateEvent,
  useServerEvents,
  useSetAttendance,
  useUpdateEvent,
  type ServerEvent,
} from "@/features/events/use-events";
import type { ChannelRow } from "@/lib/models";
import { clockTime, dayLabel, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EventCard({
  event,
  canManage,
  onAttendance,
  onCancel,
}: {
  event: ServerEvent;
  canManage: boolean;
  onAttendance: (status: "going" | "interested" | "declined" | null) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const start = new Date(event.starts_at);
  const past = start.getTime() < Date.now() - 3_600_000;
  const cancelled = Boolean(event.cancelled_at);

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        cancelled
          ? "border-border/50 bg-card/40 opacity-60"
          : past
            ? "border-border/60 bg-card/50"
            : "border-primary/25 bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
          <span className="text-[10px] font-semibold uppercase">
            {start.toLocaleDateString(undefined, { month: "short" })}
          </span>
          <span className="text-[15px] leading-none font-bold">{start.getDate()}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{event.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {dayLabel(start)} · {clockTime(start)}
            </span>
            {event.channel_name ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />#{event.channel_name}
              </span>
            ) : event.location ? (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="size-3" />
                {event.location}
              </span>
            ) : null}
            <span className="flex items-center gap-1 tabular-nums">
              <Users className="size-3" />
              {event.counts.going}
            </span>
          </div>
          {event.description ? (
            <p className="mt-1.5 line-clamp-2 text-[12px] text-muted-foreground">
              {event.description}
            </p>
          ) : null}
          {cancelled ? (
            <p className="mt-1 text-[11.5px] font-medium text-destructive">
              {t("events.cancelled")}
            </p>
          ) : null}
        </div>
      </div>

      {!past && !cancelled ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          <Button
            size="sm"
            variant={event.mine === "going" ? "default" : "outline"}
            className="h-7 text-[11.5px]"
            onClick={() =>
              onAttendance(event.mine === "going" ? null : "going")
            }
          >
            {event.mine === "going" ? <Check className="mr-1 size-3.5" /> : null}
            {t("events.going")}
          </Button>
          <Button
            size="sm"
            variant={event.mine === "interested" ? "default" : "ghost"}
            className="h-7 text-[11.5px]"
            onClick={() =>
              onAttendance(event.mine === "interested" ? null : "interested")
            }
          >
            {t("events.interested")}
          </Button>
          {canManage ? (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-[11.5px] text-destructive"
              onClick={onCancel}
            >
              <X className="mr-1 size-3.5" />
              {t("events.cancel")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CreateEventDialog({
  open,
  onOpenChange,
  serverId,
  channels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string | undefined;
  channels: ChannelRow[];
}) {
  const { t } = useTranslation();
  const create = useCreateEvent(serverId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [duration, setDuration] = useState("60");
  const [channelId, setChannelId] = useState("");

  const voiceChannels = channels.filter(
    (channel) => channel.type === "voice" || channel.type === "text",
  );

  const submit = () => {
    if (!title.trim()) return;
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) {
      toast.error(t("events.invalidDate"));
      return;
    }
    const minutes = Number(duration) || 0;
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt: start.toISOString(),
        endsAt: minutes > 0 ? new Date(start.getTime() + minutes * 60_000).toISOString() : null,
        channelId: channelId || null,
      },
      {
        onSuccess: () => {
          toast.success(t("events.created"));
          setTitle("");
          setDescription("");
          onOpenChange(false);
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <CalendarDays className="size-4 text-primary" />
            {t("events.create")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("events.create")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="event-title">{t("events.titleField")}</Label>
          <Input
            id="event-title"
            value={title}
            maxLength={100}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("events.titlePlaceholder")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-desc">{t("events.descriptionField")}</Label>
          <Textarea
            id="event-desc"
            value={description}
            rows={2}
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("events.descriptionPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-start">{t("events.startsAt")}</Label>
            <Input
              id="event-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-duration">{t("events.duration")}</Label>
            <select
              id="event-duration"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              <option value="30">30 min</option>
              <option value="60">1 h</option>
              <option value="120">2 h</option>
              <option value="180">3 h</option>
              <option value="0">{t("events.noEnd")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-channel">{t("events.channel")}</Label>
          <select
            id="event-channel"
            value={channelId}
            onChange={(event) => setChannelId(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
          >
            <option value="">{t("events.noChannel")}</option>
            {voiceChannels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={submit} disabled={create.isPending || !title.trim()}>
            {create.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EventsPanel({
  serverId,
  channels,
  canManage,
}: {
  serverId: string | undefined;
  channels: ChannelRow[];
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const { data: events, isLoading } = useServerEvents(serverId);
  const setAttendance = useSetAttendance(serverId);
  const update = useUpdateEvent(serverId);
  const [creating, setCreating] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now() - 3_600_000;
    const all = events ?? [];
    return {
      upcoming: all.filter(
        (event) => !event.cancelled_at && new Date(event.starts_at).getTime() >= now,
      ),
      past: all.filter(
        (event) => event.cancelled_at || new Date(event.starts_at).getTime() < now,
      ),
    };
  }, [events]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">{t("events.title")}</p>
          <p className="text-[11.5px] text-muted-foreground">{t("events.subtitle")}</p>
        </div>
        {canManage ? (
          <Button size="sm" variant="outline" className="h-7" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-3.5" />
            {t("events.create")}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">
                {t("events.empty")}
              </p>
            ) : (
              upcoming.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  canManage={canManage}
                  onAttendance={(status) =>
                    setAttendance.mutate({ eventId: event.id, status })
                  }
                  onCancel={() =>
                    update.mutate(
                      { id: event.id, cancel: true },
                      { onSuccess: () => toast.success(t("events.cancelledToast")) },
                    )
                  }
                />
              ))
            )}
          </div>

          {past.length > 0 ? (
            <details className="pt-1">
              <summary className="cursor-pointer text-[11.5px] text-muted-foreground hover:text-foreground">
                {t("events.pastCount", { count: past.length })}
              </summary>
              <div className="mt-1.5 space-y-1.5 opacity-80">
                {past.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-[11.5px] text-muted-foreground"
                  >
                    <span className="min-w-0 flex-1 truncate">{event.title}</span>
                    <span className="shrink-0">{relativeTime(event.starts_at)}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}

      <CreateEventDialog
        open={creating}
        onOpenChange={setCreating}
        serverId={serverId}
        channels={channels}
      />
    </div>
  );
}
