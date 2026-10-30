import type { Participant, Room, Track } from "livekit-client";
import { useCallback, useEffect } from "react";

import { useVoiceStore, type VoiceParticipant } from "@/features/voice/voice-store";
import { classifyVoiceError } from "@/features/voice/errors";
import { requireSupabase } from "@/lib/supabase";

type TokenResponse = { token: string; url: string; room: string };
type LiveKit = typeof import("livekit-client");

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


// The LiveKit room is owned by the module, not by a hook instance. Several
// components (the call bar, the full room view, the DM header) all need the same
// connection; keeping it per-hook made every one of them see a different, empty
// room.
const roomRef: { current: Room | null } = { current: null };
const lkRef: { current: LiveKit | null } = { current: null };
const speaking: { current: Set<string> } = { current: new Set() };
let heartbeat: ReturnType<typeof setInterval> | null = null;

export function useVoice() {
  const channelId = useVoiceStore((state) => state.channelId);
  const connected = useVoiceStore((state) => state.connected);
  const connecting = useVoiceStore((state) => state.connecting);

  const sync = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    useVoiceStore.getState().setState({
      participants: collect(room, speaking.current),
      connected: room.state === "connected",
    });
  }, []);

  const stopHeartbeat = () => {
    if (heartbeat !== null) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const startHeartbeat = (id: string) => {
    stopHeartbeat();
    const supabase = requireSupabase();
    heartbeat = setInterval(() => {
      void supabase.rpc("voice_heartbeat", { target_channel: id }).then(() => undefined);
    }, 60_000);
  };

  const leave = useCallback(async () => {
    stopHeartbeat();
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

        // livekit-client is ~450 KB and only needed once the user actually
        // joins a call, so it is loaded on demand instead of at boot.
        const lk = lkRef.current ?? (await import("livekit-client"));
        lkRef.current = lk;

        const room = new lk.Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: { width: 1280, height: 720 } },
        });
        roomRef.current = room;

        room
          .on(lk.RoomEvent.ParticipantConnected, sync)
          .on(lk.RoomEvent.ParticipantDisconnected, sync)
          .on(lk.RoomEvent.TrackMuted, sync)
          .on(lk.RoomEvent.TrackUnmuted, sync)
          .on(lk.RoomEvent.LocalTrackPublished, sync)
          .on(lk.RoomEvent.LocalTrackUnpublished, sync)
          .on(lk.RoomEvent.TrackSubscribed, sync)
          .on(lk.RoomEvent.TrackUnsubscribed, sync)
          .on(lk.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            speaking.current = new Set(speakers.map((speaker) => speaker.identity));
            sync();
          })
          .on(lk.RoomEvent.ConnectionStateChanged, sync)
          .on(lk.RoomEvent.Disconnected, () => {
            stopHeartbeat();
            roomRef.current = null;
            useVoiceStore.getState().reset();
          });

        await room.connect(data.url, data.token);

        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          useVoiceStore.getState().setState({ micEnabled: true });
        } catch (micError) {
          // Joining with the mic off is better than not joining at all. The
          // reason is kept so the bar can explain what to fix.
          useVoiceStore.getState().setState({
            micEnabled: false,
            error: classifyVoiceError(micError),
          });
        }

        useVoiceStore.getState().setState({
          connecting: false,
          connected: true,
        });
        startHeartbeat(id);
        sync();
      } catch (error) {
        useVoiceStore.getState().setState({
          connecting: false,
          connected: false,
          error: classifyVoiceError(error),
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
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      useVoiceStore.getState().setState({ micEnabled: next, error: null });
    } catch (error) {
      useVoiceStore.getState().setState({ error: classifyVoiceError(error) });
    }
    sync();
  }, [sync]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isCameraEnabled;
    try {
      await room.localParticipant.setCameraEnabled(next);
      useVoiceStore.getState().setState({ cameraEnabled: next });
    } catch (error) {
      useVoiceStore.getState().setState({ cameraEnabled: false, error: classifyVoiceError(error) });
    }
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
      });
      useVoiceStore.getState().setState({ screenSharing: next });
    } catch {
      useVoiceStore.getState().setState({ screenSharing: false });
    }
    sync();
  }, [sync]);

  const getRoom = useCallback(() => roomRef.current, []);

  useEffect(() => {
    // No teardown on unmount: the room outlives any single component and is
    // closed explicitly by `leave`.
    return undefined;
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
