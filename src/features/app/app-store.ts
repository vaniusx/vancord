import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SettingsSection =
  | "profile"
  | "appearance"
  | "activity"
  | "notifications"
  | "language"
  | "about";

interface AppState {
  membersOpen: boolean;
  setMembersOpen: (open: boolean) => void;
  toggleMembers: () => void;
  channelsOpen: boolean;
  setChannelsOpen: (open: boolean) => void;
  toggleChannels: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  settingsOpen: boolean;
  settingsSection: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
  activeChannelId: string | null;
  setActiveChannelId: (channelId: string | null) => void;
  lastServerId: string | null;
  setLastServerId: (serverId: string | null) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  gameDetection: boolean;
  setGameDetection: (enabled: boolean) => void;
  manualGame: string | null;
  setManualGame: (game: string | null) => void;
  drafts: Record<string, string>;
  setDraft: (channelId: string, value: string) => void;
  clearDraft: (channelId: string) => void;
  typingNames: Record<string, string[]>;
  setTyping: (channelId: string, userId: string, active: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      membersOpen: false,
      setMembersOpen: (membersOpen) => set({ membersOpen }),
      toggleMembers: () => set((state) => ({ membersOpen: !state.membersOpen })),
      channelsOpen: true,
      setChannelsOpen: (channelsOpen) => set({ channelsOpen }),
      toggleChannels: () => set((state) => ({ channelsOpen: !state.channelsOpen })),
      paletteOpen: false,
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      settingsOpen: false,
      settingsSection: "profile",
      openSettings: (section = "profile") =>
        set({ settingsOpen: true, settingsSection: section }),
      closeSettings: () => set({ settingsOpen: false }),
      activeChannelId: null,
      setActiveChannelId: (activeChannelId) => set({ activeChannelId }),
      lastServerId: null,
      setLastServerId: (lastServerId) => set({ lastServerId }),
      notificationsEnabled: true,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      gameDetection: true,
      setGameDetection: (gameDetection) => set({ gameDetection }),
      manualGame: null,
      setManualGame: (manualGame) => set({ manualGame }),
      drafts: {},
      setDraft: (channelId, value) =>
        set((state) => ({ drafts: { ...state.drafts, [channelId]: value } })),
      clearDraft: (channelId) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[channelId];
          return { drafts: next };
        }),
      typingNames: {},
      setTyping: (channelId, userId, active) =>
        set((state) => {
          const current = state.typingNames[channelId] ?? [];
          const next = active
            ? current.includes(userId)
              ? current
              : [...current, userId]
            : current.filter((id) => id !== userId);
          return {
            typingNames: { ...state.typingNames, [channelId]: next },
          };
        }),
    }),
    {
      name: "vancord.app",
      partialize: (state) => ({
        membersOpen: state.membersOpen,
        channelsOpen: state.channelsOpen,
        notificationsEnabled: state.notificationsEnabled,
        gameDetection: state.gameDetection,
        manualGame: state.manualGame,
        lastServerId: state.lastServerId,
      }),
    },
  ),
);
