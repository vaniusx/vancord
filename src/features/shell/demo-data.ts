import type { PresenceStatus } from "@/features/shell/presence";

export interface DemoServer {
  id: string;
  name: string;
  initials: string;
  gradient: string;
}

export interface DemoChannel {
  id: string;
  name: string;
  unread: number;
  mention: number;
}

export interface DemoMember {
  id: string;
  name: string;
  role: string;
  status: PresenceStatus;
  color: string;
}

export interface DemoMessage {
  id: string;
  authorId: string;
  author: string;
  color: string;
  time: string;
  content: string;
  mine?: boolean;
}

export const DEMO_SERVER = {
  id: "demo-server",
  name: "Vancord Test",
} as const;

export const demoChannel: DemoChannel = {
  id: "genel",
  name: "genel",
  unread: 0,
  mention: 0,
};

export const demoChannels: DemoChannel[] = [
  { id: "genel", name: "genel", unread: 0, mention: 0 },
  { id: "duyurular", name: "duyurular", unread: 3, mention: 0 },
  { id: "tasarim", name: "tasarim", unread: 0, mention: 2 },
  { id: "gelistirme", name: "gelistirme", unread: 0, mention: 0 },
  { id: "off-topic", name: "off-topic", unread: 1, mention: 0 },
];

export const demoMembers: DemoMember[] = [
  { id: "u1", name: "Enes", role: "Kurucu", status: "online", color: "#6366f1" },
  { id: "u2", name: "Mert", role: "Yönetici", status: "online", color: "#8b5cf6" },
  { id: "u3", name: "Zeynep", role: "Üye", status: "idle", color: "#22c55e" },
  { id: "u4", name: "Kerem", role: "Üye", status: "dnd", color: "#f59e0b" },
  { id: "u5", name: "Selin", role: "Üye", status: "offline", color: "#ef4444" },
  { id: "u6", name: "Deniz", role: "Üye", status: "offline", color: "#0ea5e9" },
];

export const demoMessages: DemoMessage[] = [
  {
    id: "m1",
    authorId: "u2",
    author: "Mert",
    color: "#8b5cf6",
    time: "14:02",
    content: "Selam! Arayüz iskeleti hazır mı?",
  },
  {
    id: "m2",
    authorId: "u3",
    author: "Zeynep",
    color: "#22c55e",
    time: "14:03",
    content: "Başlık çubuğu ve kenar panelleri yerinde görünüyor.",
  },
  {
    id: "m3",
    authorId: "u1",
    author: "Enes",
    color: "#6366f1",
    time: "14:04",
    content:
      "Renk paleti de bağlandı. Koyu ve açık tema arasında geçiş yapabiliyoruz.",
    mine: true,
  },
  {
    id: "m4",
    authorId: "u2",
    author: "Mert",
    color: "#8b5cf6",
    time: "14:05",
    content: "Bir sonraki adım veritabanı şeması olsun o zaman.",
  },
];

export const demoUser = {
  id: "u1",
  name: "Enes",
  tag: "@enes",
  color: "#6366f1",
} as const;
