import { create } from "zustand";

export interface VoiceParticipant {
  identity: string;
  name: string;
  isLocal: boolean;
  speaking: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenShare: boolean;
  avatar: string | null;
}

interface VoiceState {
  channelId: string | null;
  channelName: string | null;
  connecting: boolean;
  connected: boolean;
  error: string | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  participants: VoiceParticipant[];
  setState: (patch: Partial<VoiceState>) => void;
  reset: () => void;
}

const INITIAL = {
  channelId: null,
  channelName: null,
  connecting: false,
  connected: false,
  error: null,
  micEnabled: false,
  cameraEnabled: false,
  screenSharing: false,
  participants: [] as VoiceParticipant[],
};

export const useVoiceStore = create<VoiceState>((set) => ({
  ...INITIAL,
  setState: (patch) => set(patch),
  reset: () => set(INITIAL),
}));
