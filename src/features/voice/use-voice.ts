import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type Participant,
} from "livekit-client";
import { useCallback, useEffect, useRef } from "react";

import { useVoiceStore, type VoiceParticipant } from "@/features/voice/voice-store";
import { requireSupabase } from "@/lib/supabase";

type TokenResponse = { token: string; url: string; room: string };

function toParticipant(
  participant: Participant,
  isLocal: boolean,
  speaking: boolean,
): VoiceParticipant {
  let avatar: string | null = null;
  try {
    const meta = participant.metadata ? JSON.parse(participant.metadata) : null;
    avatar = typeof meta?.avatar === "string" ? meta.avatar : null;
  } catch {
    avatar = null;
  }

  return {
    identity: participant.identity,
    name: participant.name || participant.identity.slice(0, 8),
    isLocal,
    speaking,
    micEnabled: participant.isMicrophoneEnabled,
    cameraEnabled: participant.isCameraEnabled,
    screenShare: participant.isScreenShareEnabled,
    avatar,
  };
}

function collect(room: Room, speakingIdentities: Set<string>) {
  const list: VoiceParticipant[] = [
    toParticipant(room.localParticipant, true, speakingIdentities.has(room.localParticipant.identity)),
  ];
  room.remoteParticipants.forEach((participant) => {
    list.push(
      toParticipant(participant, false, speakingIdentities.has(participant.identity)),
    );
  });
  return list;
}

export function useVoice() {
  const roomRef = useRef<Room | null>(null);
  const speaking = useRef<Set<string>>(new Set());
  const { channelId, connected, connecting } = useVoiceStore();

  const sync = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    useVoiceStore.getState().setState({
      participants: collect(room, speaking.current),
      connected: room.state === ConnectionState.Connected,
    });
  }, []);

  const leave = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    speaking.current.clear();
    if (room) {
      await room.localParticipant.setScreenShareEnabled(false).catch(() => {});
      await room.disconnect().catch(() => {});
    }
    useVoiceStore.getState().reset();
  }, []);

  const join = useCallback(
    async (id: string, name: string) => {
      if (roomRef.current && useVoiceStore.getState().channelId === id) return;
      if (roomRef.current) await leave();

      const store = useVoiceStore.getState();
      store.setState({ channelId: id, channelName: name, connecting: true, error: null });

      try {
        const supabase = requireSupabase();
        const { data, error } = await supabase.functions.invoke<TokenResponse>(
          "livekit-token",
          { body: { channelId: id } },
        );

        if (error) throw error;
        if (!data?.token || !data?.url) throw new Error("livekit_not_configured");

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: { width: 1280, height: 720 } },
        } as never);
        roomRef.current = room;

        room
          .on(RoomEvent.ParticipantConnected, sync)
          .on(RoomEvent.ParticipantDisconnected, sync)
          .on(RoomEvent.TrackMuted, sync)
          .on(RoomEvent.TrackUnmuted, sync)
          .on(RoomEvent.LocalTrackPublished, sync)
          .on(RoomEvent.LocalTrackUnpublished, sync)
          .on(RoomEvent.TrackSubscribed, sync)
          .on(RoomEvent.TrackUnsubscribed, sync)
          .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
            speaking.current = new Set(speakers.map((speaker) => speaker.identity));
            sync();
          })
          .on(RoomEvent.ConnectionStateChanged, sync)
          .on(RoomEvent.Disconnected, () => {
            roomRef.current = null;
            useVoiceStore.getState().reset();
          });

        await room.connect(data.url, data.token);
        await room.localParticipant.setMicrophoneEnabled(true);

        useVoiceStore.getState().setState({
          connecting: false,
          connected: true,
          micEnabled: true,
        });
        sync();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "voice_connect_failed";
        useVoiceStore.getState().setState({
          connecting: false,
          connected: false,
          error: message,
          channelId: null,
          channelName: null,
        });
      }
    },
    [leave, sync],
  );

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    useVoiceStore.getState().setState({ micEnabled: next });
    sync();
  }, [sync]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(next);
    useVoiceStore.getState().setState({ cameraEnabled: next });
    sync();
  }, [sync]);

  const toggleScreen = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isScreenShareEnabled;
    try {
      await room.localParticipant.setScreenShareEnabled(next, {
        audio: true,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
      } as never);
      useVoiceStore.getState().setState({ screenSharing: next });
    } catch {
      useVoiceStore.getState().setState({ screenSharing: false });
    }
    sync();
  }, [sync]);

  const getRoom = useCallback(() => roomRef.current, []);

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      roomRef.current = null;
      if (room) void room.disconnect().catch(() => {});
    };
  }, []);

  return {
    channelId,
    connected,
    connecting,
    join,
    leave,
    toggleMic,
    toggleCamera,
    toggleScreen,
    getRoom,
    sync,
  };
}

export function trackOf(
  room: Room | null,
  identity: string,
  source: Track.Source,
): Track | null {
  if (!room) return null;
  if (identity === room.localParticipant.identity) {
    const publication = room.localParticipant.getTrackPublication(source);
    return publication?.track ?? null;
  }
  const participant = room.remoteParticipants.get(identity);
  const publication = participant?.getTrackPublication(source);
  return publication?.track ?? null;
}
