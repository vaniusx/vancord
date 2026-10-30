import { Loader2, Phone, PhoneOff, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/features/voice/use-voice";
import { useCallStore } from "@/features/voice/call-store";
import {
  formatCallDuration,
  useAnswerCall,
  useEndCall,
} from "@/features/voice/use-calls";
import { cn } from "@/lib/utils";

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/** Full-screen card shown to the person being called. */
export function IncomingCallOverlay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const incoming = useCallStore((state) => state.incoming);
  const answer = useAnswerCall();
  const voice = useVoice();

  if (!incoming) return null;

  const accept = async () => {
    try {
      await answer.mutateAsync({ callId: incoming.id, accept: true });
      navigate(`/dm/${incoming.channel_id}`);
      await voice.join(
        incoming.channel_id,
        incoming.channelName ?? incoming.callername,
      );
      if (incoming.video) await voice.toggleCamera();
    } catch {
      toast.error(t("errors.unknown"));
    }
  };

  const decline = () => {
    answer.mutate({ callId: incoming.id, accept: false });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("calls.incoming")}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-8 bg-background/95 px-6 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <span className="absolute inset-0 -m-3 animate-ping rounded-full bg-primary/20" />
          <Avatar
            profile={{
              id: incoming.caller_id,
              display_name: incoming.callername,
              avatar_url: incoming.callerAvatar,
              accent_color: "#1f5f52",
            }}
            size="xl"
            className="relative ring-4 ring-background"
          />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {incoming.video ? t("calls.incomingVideo") : t("calls.incoming")}
          </p>
          <h1 className="text-[22px] font-semibold">{incoming.callername}</h1>
          <p className="text-[13px] text-muted-foreground">{t("calls.ringing")}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={decline}
          disabled={answer.isPending}
          aria-label={t("calls.decline")}
          className="flex size-16 flex-col items-center justify-center gap-1 rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <PhoneOff className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => void accept()}
          disabled={answer.isPending}
          aria-label={t("calls.accept")}
          className="flex size-16 flex-col items-center justify-center gap-1 rounded-full bg-status-online text-white shadow-lg transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {answer.isPending ? (
            <Loader2 className="size-6 animate-spin" />
          ) : incoming.video ? (
            <Video className="size-6" />
          ) : (
            <Phone className="size-6" />
          )}
        </button>
      </div>

      <div className="flex gap-8 text-[11px] text-muted-foreground">
        <span>{t("calls.decline")}</span>
        <span>{t("calls.accept")}</span>
      </div>
    </div>
  );
}

/** Compact strip shown to the caller while the phone is ringing. */
export function OutgoingCallBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const outgoing = useCallStore((state) => state.outgoing);
  const startedAt = useCallStore((state) => state.startedAt);
  const endCall = useEndCall();
  const voice = useVoice();
  const now = useNow(Boolean(outgoing));
  const answered = outgoing?.status === "accepted";

  // The caller only joins the room once the callee picks up, so a declined call
  // never opens a microphone.
  useEffect(() => {
    if (!answered || !outgoing) return;
    if (voice.connected && voice.channelId === outgoing.channel_id) return;
    navigate(`/dm/${outgoing.channel_id}`);
    void voice.join(outgoing.channel_id, t("calls.connected"));
    if (outgoing.video) void voice.toggleCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, outgoing?.id]);

  if (!outgoing) return null;

  const label = answered ? formatCallDuration(startedAt, now) : t("calls.calling");

  return (
    <div className="mx-2 mb-2 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2 text-[12px]">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          answered ? "bg-status-online" : "animate-pulse bg-status-idle",
        )}
      />
      <p className="min-w-0 flex-1 truncate">
        {answered ? t("calls.connected") : t("calls.calling")} ·{" "}
        <span className="tabular-nums">{label}</span>
      </p>
      <Button
        size="sm"
        variant="destructive"
        className="h-7 shrink-0 px-2 text-[11.5px]"
        disabled={endCall.isPending}
        onClick={() => endCall.mutate(outgoing.id)}
      >
        <PhoneOff className="mr-1 size-3.5" />
        {t("calls.end")}
      </Button>
    </div>
  );
}
