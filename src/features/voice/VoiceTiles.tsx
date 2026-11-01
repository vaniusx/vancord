import { Maximize2, MicOff, MonitorUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Avatar } from "@/components/common/avatar";
import { StatusDot } from "@/features/shell/presence";
import { trackOf } from "@/features/voice/use-voice";
import type { VoiceParticipant } from "@/features/voice/voice-store";
import { accentFor } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Room, Track } from "livekit-client";

// Plain strings so this module never pulls livekit-client into the initial
// bundle: the values match Track.Source exactly.
export const CAMERA = "camera" as Track.Source;
export const SCREEN_SHARE = "screen_share" as Track.Source;

function useTrackAttach(
  room: Room | null,
  identity: string,
  source: Track.Source,
) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const track = trackOf(room, identity, source);
    const element = ref.current;
    if (!element) return;
    if (track) track.attach(element);
    return () => {
      if (track) track.detach(element);
    };
  }, [room, identity, source]);

  return ref;
}

function participantProfile(participant: VoiceParticipant) {
  return {
    id: participant.identity,
    display_name: participant.name,
    avatar_url: participant.avatar,
    accent_color: accentFor(participant.identity),
  };
}

/**
 * One video surface. `fill` stretches it to the height of the stage (used for a
 * screen share, which should not be boxed into a 16:9 tile), while the default
 * keeps the aspect ratio for camera tiles in a grid.
 */
export function VideoTile({
  room,
  participant,
  source = CAMERA,
  fill = false,
  onExpand,
}: {
  room: Room | null;
  participant: VoiceParticipant;
  source?: Track.Source;
  fill?: boolean;
  onExpand?: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useTrackAttach(room, participant.identity, source);
  const hasVideo =
    source === SCREEN_SHARE ? participant.screenShare : participant.cameraEnabled;
  const screening = source === SCREEN_SHARE;

  if (!hasVideo) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-secondary",
          fill ? "size-full" : "aspect-video",
        )}
      >
        <Avatar profile={participantProfile(participant)} size="lg" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl bg-black",
        fill ? "size-full" : "aspect-video",
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className={cn("size-full", screening ? "object-contain" : "object-cover")}
      />

      <span className="absolute bottom-2 left-2 flex max-w-[70%] items-center gap-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
        {screening ? <MonitorUp className="size-3 shrink-0" /> : null}
        {!participant.micEnabled ? <MicOff className="size-3 shrink-0 text-status-dnd" /> : null}
        <span className="truncate">
          {participant.name}
          {screening ? ` · ${t("voice.screen")}` : ""}
        </span>
      </span>

      {onExpand ? (
        <button
          type="button"
          onClick={onExpand}
          aria-label={t("voice.expand")}
          title={t("voice.expand")}
          className="absolute top-2 right-2 rounded-md bg-black/55 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Maximize2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function ParticipantTile({
  participant,
  compact = false,
}: {
  participant: VoiceParticipant;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-2 py-1.5",
          participant.speaking
            ? "border-primary/60 bg-primary/8"
            : "border-border/60 bg-card/50",
        )}
      >
        <div className="relative shrink-0">
          <Avatar profile={participantProfile(participant)} size="sm" />
          <StatusDot
            status={participant.micEnabled ? "online" : "dnd"}
            className="absolute -right-0.5 -bottom-0.5 size-2.5"
          />
        </div>
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium">
          {participant.name}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
        participant.speaking
          ? "border-primary bg-primary/8"
          : "border-border/70 bg-card/60",
      )}
    >
      <div className="relative">
        <Avatar profile={participantProfile(participant)} size="lg" />
        <StatusDot
          status={participant.micEnabled ? "online" : "dnd"}
          className="absolute -right-0.5 -bottom-0.5 size-3"
        />
      </div>
      <p className="max-w-full truncate text-[12.5px] font-medium">
        {participant.name}
      </p>
    </div>
  );
}
