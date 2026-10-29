import { useEffect, useRef } from "react";

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

export function VideoTile({
  room,
  participant,
  source = CAMERA,
}: {
  room: Room | null;
  participant: VoiceParticipant;
  source?: Track.Source;
}) {
  const videoRef = useTrackAttach(room, participant.identity, source);
  const hasVideo =
    source === SCREEN_SHARE ? participant.screenShare : participant.cameraEnabled;

  if (!hasVideo) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-secondary">
        <Avatar
          profile={{
            id: participant.identity,
            display_name: participant.name,
            avatar_url: participant.avatar,
            accent_color: accentFor(participant.identity),
          }}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className="size-full object-contain"
      />
      <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {participant.name}
        {source === SCREEN_SHARE ? " · ekran" : ""}
      </span>
    </div>
  );
}

export function ParticipantTile({ participant }: { participant: VoiceParticipant }) {
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
        <Avatar
          profile={{
            id: participant.identity,
            display_name: participant.name,
            avatar_url: participant.avatar,
            accent_color: accentFor(participant.identity),
          }}
          size="lg"
        />
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
