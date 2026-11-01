import {
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  LogOut,
  Video,
  VideoOff,
  X,
} from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVoice } from "@/features/voice/use-voice";
import { voiceErrorKey } from "@/features/voice/VoiceRoom";
import { useVoiceStore } from "@/features/voice/voice-store";
import { ParticipantTile, SCREEN_SHARE, VideoTile } from "@/features/voice/VoiceTiles";
import { cn } from "@/lib/utils";

export function VoiceBar() {
  const { t } = useTranslation();
  const { leave, toggleMic, toggleCamera, toggleScreen, getRoom, sync } = useVoice();
  const {
    channelName,
    connected,
    connecting,
    error,
    micEnabled,
    cameraEnabled,
    screenSharing,
    participants,
  } = useVoiceStore();
  const [expanded, setExpanded] = useState(false);

  if (!channelName && !error) return null;

  if (error) {
    const key = voiceErrorKey(error);
    return (
      <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-destructive/8 px-3 py-2 text-[12px] text-destructive">
        <span className="min-w-0 flex-1 leading-relaxed">
          {key ? t(key) : t("voice.connectFailed")}
        </span>
        <button
          type="button"
          onClick={() => useVoiceStore.getState().reset()}
          aria-label={t("common.close")}
          className="shrink-0 rounded p-1 hover:bg-destructive/10"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  const room = getRoom();
  const screens = participants.filter((participant) => participant.screenShare);

  return (
    <>
      {screens.length > 0 || cameraEnabled ? (
        <div
          className={cn(
            "border-t border-border/60 bg-sidebar/60 p-2",
            expanded && "fixed inset-x-0 top-10 bottom-0 z-50 overflow-y-auto bg-background p-4",
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {t("voice.participants")} · {participants.length}
            </p>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={t("palette.title")}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>
          <VoiceStage room={room} />
        </div>
      ) : null}

      <div className="border-t border-border/60 bg-sidebar px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold">
              {connecting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <span className="size-1.5 rounded-full bg-status-online" />
              )}
              {channelName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {connecting
                ? t("voice.connecting")
                : connected
                  ? t("voice.connected")
                  : t("voice.connectFailed")}
            </p>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={micEnabled ? "ghost" : "destructive"}
                className="size-8"
                aria-label={micEnabled ? t("voice.mute") : t("voice.unmute")}
                onClick={() => void toggleMic()}
              >
                {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {micEnabled ? t("voice.mute") : t("voice.unmute")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn("size-8", cameraEnabled && "bg-accent")}
                aria-label={t("voice.join")}
                onClick={() => void toggleCamera()}
              >
                {cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("voice.join")}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn("size-8", screenSharing && "bg-primary/15 text-primary")}
                aria-label={screenSharing ? t("voice.stopScreen") : t("voice.screen")}
                onClick={() => void toggleScreen()}
              >
                <MonitorUp className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {screenSharing ? t("voice.stopScreen") : t("voice.screen")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="destructive"
                className="size-8"
                aria-label={t("voice.leave")}
                onClick={() => void leave()}
              >
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("voice.leave")}</TooltipContent>
          </Tooltip>
        </div>

        {participants.length > 1 ? (
          <button
            type="button"
            onClick={() => {
              sync();
              setExpanded(true);
            }}
            className="mt-1.5 flex w-full items-center gap-1 overflow-x-auto"
          >
            {participants.slice(0, 6).map((participant) => (
              <span
                key={participant.identity}
                className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10.5px] text-accent-foreground"
              >
                {participant.name}
              </span>
            ))}
          </button>
        ) : null}
      </div>
    </>
  );
}

export function VoiceStage({
  room,
  compact = false,
}: {
  room: ReturnType<ReturnType<typeof useVoice>["getRoom"]>;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const participants = useVoiceStore((state) => state.participants);
  const [focused, setFocused] = useState<string | null>(null);

  const screens = participants.filter((participant) => participant.screenShare);
  const cameras = participants.filter(
    (participant) => participant.cameraEnabled && !participant.screenShare,
  );
  const others = participants.filter(
    (participant) => !participant.cameraEnabled && !participant.screenShare,
  );

  const focusedParticipant = focused
    ? participants.find((participant) => participant.identity === focused)
    : undefined;
  const stageParticipant = focusedParticipant ?? screens[0];
  const stageSource =
    stageParticipant && stageParticipant.screenShare ? SCREEN_SHARE : undefined;

  if (participants.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-muted-foreground">
        {t("voice.noParticipants")}
      </p>
    );
  }

  // A screen share owns the stage: it is the thing somebody is trying to read.
  // Everything else shrinks to a strip underneath, a row of thumbnails beside
  // it. Cameras that are not screen sharing stay on in that strip.
  if (stageParticipant && !compact) {
    const strip = participants.filter(
      (participant) => participant.identity !== stageParticipant.identity,
    );

    return (
      <div className="flex min-h-0 flex-col gap-2">
        <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-xl bg-black">
          <VideoTile
            room={room}
            participant={stageParticipant}
            source={stageSource ?? (stageParticipant.cameraEnabled ? undefined : SCREEN_SHARE)}
            fill
          />
          {focused ? (
            <button
              type="button"
              onClick={() => setFocused(null)}
              className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
            >
              {t("voice.restore")}
            </button>
          ) : null}
        </div>

        {strip.length > 0 ? (
          <div className="scrollbar-thin flex shrink-0 gap-2 overflow-x-auto pb-1">
            {strip.map((participant) =>
              participant.cameraEnabled ? (
                <div key={participant.identity} className="w-40 shrink-0">
                  <VideoTile
                    room={room}
                    participant={participant}
                    onExpand={() => setFocused(participant.identity)}
                  />
                </div>
              ) : (
                <div key={participant.identity} className="w-40 shrink-0">
                  <ParticipantTile participant={participant} />
                </div>
              ),
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // No screen share: cameras in a grid, everyone without one as a card.
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cameras.map((participant) => (
        <VideoTile
          key={participant.identity}
          room={room}
          participant={participant}
          onExpand={() => setFocused(participant.identity)}
        />
      ))}
      {others.map((participant) => (
        <ParticipantTile key={participant.identity} participant={participant} />
      ))}
    </div>
  );
}
