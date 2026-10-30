import { AlertCircle, Loader2, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { VoiceErrorCode } from "@/features/voice/errors";
import { useVoice } from "@/features/voice/use-voice";
import { useVoiceStore } from "@/features/voice/voice-store";
import { VoiceStage } from "@/features/voice/VoiceBar";
import { cn } from "@/lib/utils";

/**
 * Maps a stored voice error code to a translated, actionable sentence. The code
 * is not a translation key because it is stored in the shared voice store; this
 * table is the single place that decides the wording.
 */
const ERROR_KEY: Record<VoiceErrorCode, string> = {
  voice_not_configured: "voice.notConfigured",
  voice_unauthenticated: "voice.unauthenticated",
  voice_forbidden: "voice.forbidden",
  voice_channel_unavailable: "voice.channelUnavailable",
  voice_mic_denied: "voice.micDenied",
  voice_mic_busy: "voice.micBusy",
  voice_no_device: "voice.noDevice",
  voice_network: "voice.network",
  voice_websocket_blocked: "voice.websocketBlocked",
  voice_room_full: "voice.roomFull",
  voice_connect_failed: "voice.connectFailed",
};

export function voiceErrorKey(code: string | null): string | null {
  if (!code) return null;
  return ERROR_KEY[code as VoiceErrorCode] ?? "voice.connectFailed";
}

function VoiceErrorPanel({
  code,
  onRetry,
}: {
  code: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const key = voiceErrorKey(code);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
      <div className="flex size-9 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        <AlertCircle className="size-4" />
      </div>
      <p className="text-[13px] leading-relaxed text-foreground">
        {key ? t(key) : t("voice.connectFailed")}
      </p>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t("voice.retry")}
        </Button>
      ) : null}
    </div>
  );
}

export function VoiceRoom({ channelId, channelName }: { channelId: string; channelName: string }) {
  const { t } = useTranslation();
  const { join, leave, toggleMic, toggleCamera, toggleScreen, getRoom, channelId: activeId } = useVoice();
  const { connecting, connected, error, micEnabled, cameraEnabled, screenSharing, participants } =
    useVoiceStore();

  const isHere = activeId === channelId;

  if (!isHere) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Mic className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-[18px] font-semibold">{channelName}</h1>
          <p className="max-w-sm text-[13px] text-muted-foreground">{t("voice.join")}</p>
        </div>

        {error ? (
          <VoiceErrorPanel
            code={error}
            onRetry={() => void join(channelId, channelName)}
          />
        ) : (
          <Button onClick={() => void join(channelId, channelName)} disabled={connecting}>
            {connecting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t("voice.join")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Mic className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[14.5px] font-semibold">{channelName}</h1>
          <p className="truncate text-[12px] text-muted-foreground">
            {connecting
              ? t("voice.connecting")
              : connected
                ? `${t("voice.connected")} · ${participants.length}`
                : t("voice.connectFailed")}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant={micEnabled ? "ghost" : "destructive"}
            className="size-8"
            aria-label={micEnabled ? t("voice.mute") : t("voice.unmute")}
            onClick={() => void toggleMic()}
          >
            {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("size-8", cameraEnabled && "bg-accent")}
            onClick={() => void toggleCamera()}
          >
            {cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("size-8", screenSharing && "bg-primary/15 text-primary")}
            onClick={() => void toggleScreen()}
          >
            <MonitorUp className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="size-8"
            onClick={() => void leave()}
            aria-label={t("voice.leave")}
          >
            <PhoneOff className="size-4" />
          </Button>
        </div>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
        {error ? (
          <VoiceErrorPanel
            code={error}
            onRetry={() => {
              void leave().then(() => join(channelId, channelName));
            }}
          />
        ) : (
          <VoiceStage room={getRoom()} />
        )}
      </div>
    </div>
  );
}
