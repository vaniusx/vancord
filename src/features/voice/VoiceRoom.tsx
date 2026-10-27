import { Loader2, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useVoice } from "@/features/voice/use-voice";
import { useVoiceStore } from "@/features/voice/voice-store";
import { VoiceStage } from "@/features/voice/VoiceBar";
import { cn } from "@/lib/utils";

export function VoiceRoom({ channelId, channelName }: { channelId: string; channelName: string }) {
  const { t } = useTranslation();
  const { join, leave, toggleMic, toggleCamera, toggleScreen, getRoom, channelId: activeId } = useVoice();
  const { connecting, connected, error, micEnabled, cameraEnabled, screenSharing, participants } =
    useVoiceStore();

  const isHere = activeId === channelId;

  if (!isHere) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Mic className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-[18px] font-semibold">{channelName}</h1>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            {t("voice.join")}
          </p>
        </div>
        <Button onClick={() => void join(channelId, channelName)} disabled={connecting}>
          {connecting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {t("voice.join")}
        </Button>
        {error ? <p className="text-[12px] text-destructive">{t("voice.notConfigured")}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background">
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
                ? `${t("voice.connected")} Â· ${participants.length}`
                : t("common.error")}
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
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
            {t("voice.notConfigured")}
          </p>
        ) : (
          <VoiceStage room={getRoom()} />
        )}
      </div>
    </div>
  );
}
