export type PresenceStatus = "online" | "idle" | "dnd" | "invisible" | "offline";
export type ServerRole = "owner" | "admin" | "member";
export type ChannelType = "text" | "voice" | "dm";
export type FriendshipStatus = "pending" | "accepted" | "blocked";

export interface ProfileSummary {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  status: PresenceStatus;
  custom_status: string | null;
  bio?: string | null;
  banner_color?: string | null;
  banner_url?: string | null;
  animated_avatar?: boolean;
  activity?: ActivityState | null;
  activity_visible?: boolean;
}

export interface ActivityState {
  type: "game";
  name: string;
  appId?: number;
  startedAt: string;
}

export interface BadgeRow {
  id: string;
  name_tr: string;
  name_en: string;
  description_tr: string;
  description_en: string;
  color: string;
  icon: string;
  sort: number;
}

export interface ServerSummary {
  id: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  banner_url: string | null;
  accent_color: string | null;
  owner_id: string;
  role: ServerRole;
}

export interface ChannelRow {
  id: string;
  server_id: string | null;
  type: ChannelType;
  name: string | null;
  topic: string | null;
  position: number;
}

export interface MemberRow {
  user_id: string;
  role: ServerRole;
  joined_at: string;
  profile: ProfileSummary;
}

export interface AttachmentRow {
  id: string;
  message_id: string;
  storage_path: string;
  mime: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
}

export interface ReactionRow {
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface BotSummary {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface MessageRow {
  id: string;
  channel_id: string;
  author_id: string | null;
  bot_id: string | null;
  content: string;
  created_at: string;
  edited_at: string | null;
  author: ProfileSummary | null;
  bot: BotSummary | null;
  message_attachments: AttachmentRow[];
  reactions: ReactionRow[];
}

export interface DmChannel {
  id: string;
  members: ProfileSummary[];
  lastMessageAt: string | null;
}

export interface FriendEdge {
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  requester: ProfileSummary | null;
  addressee: ProfileSummary | null;
}
