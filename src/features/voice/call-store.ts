import { create } from "zustand";

export type CallStatus = "ringing" | "accepted" | "declined" | "missed" | "ended" | "cancelled";

export interface CallInvitation {
  id: string;
  channel_id: string;
  caller_id: string;
  callee_id: string;
  status: CallStatus;
  video: boolean;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
}

export interface IncomingCall extends CallInvitation {
  callername: string;
  callerAvatar: string | null;
  channelName: string | null;
}

interface CallState {
  /** The call the user is being asked to answer. */
  incoming: IncomingCall | null;
  /** The call the user started and is waiting on. */
  outgoing: CallInvitation | null;
  /** Timestamp the current answered call began, for the duration counter. */
  startedAt: number | null;
  setIncoming: (call: IncomingCall | null) => void;
  setOutgoing: (call: CallInvitation | null) => void;
  setStartedAt: (at: number | null) => void;
  clear: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  incoming: null,
  outgoing: null,
  startedAt: null,
  setIncoming: (incoming) => set({ incoming }),
  setOutgoing: (outgoing) => set({ outgoing }),
  setStartedAt: (startedAt) => set({ startedAt }),
  clear: () => set({ incoming: null, outgoing: null, startedAt: null }),
}));
