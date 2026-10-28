export type StickerMotion = "pop" | "bounce" | "wobble" | "pulse" | "float" | "shake";

export interface StickerDef {
  id: string;
  glyph: string;
  labelTr: string;
  labelEn: string;
  category: string;
  motion: StickerMotion;
  hue: string;
}

/**
 * Vancord's own sticker set. Rendering is parametric (one component draws every
 * sticker), so the bundle cost is a few kilobytes instead of megabytes of GIFs,
 * nothing is fetched at runtime, and there is no third-party artwork licensing.
 */
export const STICKER_CATEGORIES = [
  { id: "reaction", labelTr: "Tepki", labelEn: "Reactions" },
  { id: "celebrate", labelTr: "Kutlama", labelEn: "Celebrate" },
  { id: "feeling", labelTr: "Duygu", labelEn: "Feelings" },
  { id: "gaming", labelTr: "Oyun", labelEn: "Gaming" },
  { id: "daily", labelTr: "Günlük", labelEn: "Everyday" },
  { id: "critter", labelTr: "Hayvan", labelEn: "Critters" },
] as const;

export const STICKERS: StickerDef[] = [
  // reactions
  { id: "ok", glyph: "👌", labelTr: "Tamam", labelEn: "Okay", category: "reaction", motion: "pop", hue: "#4F46E5" },
  { id: "nope", glyph: "🙅", labelTr: "Olmaz", labelEn: "Nope", category: "reaction", motion: "shake", hue: "#DC2626" },
  { id: "yes", glyph: "✅", labelTr: "Evet", labelEn: "Yes", category: "reaction", motion: "pop", hue: "#047857" },
  { id: "thinking", glyph: "🤔", labelTr: "Düşünüyorum", labelEn: "Thinking", category: "reaction", motion: "wobble", hue: "#B45309" },
  { id: "shrug", glyph: "🤷", labelTr: "Bilmem", labelEn: "Shrug", category: "reaction", motion: "wobble", hue: "#7C3AED" },
  { id: "eyes", glyph: "👀", labelTr: "Bakıyorum", labelEn: "Watching", category: "reaction", motion: "float", hue: "#0369A1" },
  { id: "salute", glyph: "🫡", labelTr: "Anlaşıldı", labelEn: "Salute", category: "reaction", motion: "pop", hue: "#4F46E5" },
  { id: "clap", glyph: "👏", labelTr: "Bravo", labelEn: "Bravo", category: "reaction", motion: "bounce", hue: "#B45309" },

  // celebrate
  { id: "tada", glyph: "🎉", labelTr: "Kutlama", labelEn: "Celebrate", category: "celebrate", motion: "bounce", hue: "#DB2777" },
  { id: "party", glyph: "🥳", labelTr: "Parti", labelEn: "Party", category: "celebrate", motion: "bounce", hue: "#7C3AED" },
  { id: "fire", glyph: "🔥", labelTr: "Alev", labelEn: "Fire", category: "celebrate", motion: "pulse", hue: "#DC2626" },
  { id: "star", glyph: "⭐", labelTr: "Yıldız", labelEn: "Star", category: "celebrate", motion: "pulse", hue: "#B45309" },
  { id: "rocket", glyph: "🚀", labelTr: "Fırlat", labelEn: "Launch", category: "celebrate", motion: "float", hue: "#4F46E5" },
  { id: "trophy", glyph: "🏆", labelTr: "Zafer", labelEn: "Trophy", category: "celebrate", motion: "pop", hue: "#B45309" },
  { id: "sparkles", glyph: "✨", labelTr: "Işıltı", labelEn: "Sparkles", category: "celebrate", motion: "pulse", hue: "#7C3AED" },
  { id: "hundred", glyph: "💯", labelTr: "Yüzde yüz", labelEn: "One hundred", category: "celebrate", motion: "pop", hue: "#DC2626" },

  // feelings
  { id: "love", glyph: "❤️", labelTr: "Sevgi", labelEn: "Love", category: "feeling", motion: "pulse", hue: "#DB2777" },
  { id: "joy", glyph: "😂", labelTr: "Kahkaha", labelEn: "Laughing", category: "feeling", motion: "bounce", hue: "#B45309" },
  { id: "cry", glyph: "😭", labelTr: "Ağlıyorum", labelEn: "Crying", category: "feeling", motion: "shake", hue: "#0369A1" },
  { id: "sad", glyph: "🥲", labelTr: "Hüzün", labelEn: "Blue", category: "feeling", motion: "float", hue: "#0369A1" },
  { id: "angry", glyph: "😤", labelTr: "Sinir", labelEn: "Annoyed", category: "feeling", motion: "shake", hue: "#DC2626" },
  { id: "cool", glyph: "😎", labelTr: "Sakin", labelEn: "Cool", category: "feeling", motion: "pop", hue: "#4F46E5" },
  { id: "sleep", glyph: "😴", labelTr: "Uykum var", labelEn: "Sleepy", category: "feeling", motion: "float", hue: "#7C3AED" },
  { id: "mind", glyph: "🤯", labelTr: "Şok", labelEn: "Mind blown", category: "feeling", motion: "pulse", hue: "#DB2777" },

  // gaming
  { id: "gg", glyph: "🎮", labelTr: "GG", labelEn: "GG", category: "gaming", motion: "pop", hue: "#4F46E5" },
  { id: "wp", glyph: "🫱", labelTr: "WP", labelEn: "WP", category: "gaming", motion: "pop", hue: "#047857" },
  { id: "lag", glyph: "📶", labelTr: "Lag", labelEn: "Lag", category: "gaming", motion: "shake", hue: "#DC2626" },
  { id: "crit", glyph: "⚔️", labelTr: "Kritik", labelEn: "Critical", category: "gaming", motion: "wobble", hue: "#B45309" },
  { id: "dice", glyph: "🎲", labelTr: "Zar", labelEn: "Dice", category: "gaming", motion: "wobble", hue: "#7C3AED" },
  { id: "boss", glyph: "🐉", labelTr: "Boss", labelEn: "Boss", category: "gaming", motion: "pulse", hue: "#047857" },
  { id: "afk", glyph: "🚶", labelTr: "AFK", labelEn: "AFK", category: "gaming", motion: "float", hue: "#0369A1" },
  { id: "clutch", glyph: "🏅", labelTr: "Clutch", labelEn: "Clutch", category: "gaming", motion: "pop", hue: "#B45309" },

  // everyday
  { id: "hello", glyph: "👋", labelTr: "Selam", labelEn: "Hello", category: "daily", motion: "wobble", hue: "#4F46E5" },
  { id: "brb", glyph: "⏱️", labelTr: "Hemen geliyorum", labelEn: "BRB", category: "daily", motion: "pulse", hue: "#B45309" },
  { id: "thanks", glyph: "🙏", labelTr: "Teşekkürler", labelEn: "Thanks", category: "daily", motion: "pop", hue: "#047857" },
  { id: "food", glyph: "🍜", labelTr: "Yemek", labelEn: "Food", category: "daily", motion: "float", hue: "#B45309" },
  { id: "coffee", glyph: "☕", labelTr: "Kahve", labelEn: "Coffee", category: "daily", motion: "pulse", hue: "#7C3AED" },
  { id: "music", glyph: "🎧", labelTr: "Müzik", labelEn: "Music", category: "daily", motion: "wobble", hue: "#0369A1" },
  { id: "work", glyph: "💻", labelTr: "Çalışıyorum", labelEn: "Working", category: "daily", motion: "pulse", hue: "#4F46E5" },
  { id: "goodnight", glyph: "🌙", labelTr: "İyi geceler", labelEn: "Good night", category: "daily", motion: "float", hue: "#7C3AED" },

  // critters
  { id: "cat", glyph: "🐱", labelTr: "Kedi", labelEn: "Cat", category: "critter", motion: "wobble", hue: "#B45309" },
  { id: "dog", glyph: "🐶", labelTr: "Köpek", labelEn: "Dog", category: "critter", motion: "bounce", hue: "#4D7C0F" },
  { id: "panda", glyph: "🐼", labelTr: "Panda", labelEn: "Panda", category: "critter", motion: "float", hue: "#0369A1" },
  { id: "fox", glyph: "🦊", labelTr: "Tilki", labelEn: "Fox", category: "critter", motion: "pop", hue: "#B45309" },
  { id: "penguin", glyph: "🐧", labelTr: "Penguen", labelEn: "Penguin", category: "critter", motion: "wobble", hue: "#0369A1" },
  { id: "frog", glyph: "🐸", labelTr: "Kurbağa", labelEn: "Frog", category: "critter", motion: "bounce", hue: "#4D7C0F" },
  { id: "octopus", glyph: "🐙", labelTr: "Ahtapot", labelEn: "Octopus", category: "critter", motion: "float", hue: "#DB2777" },
  { id: "whale", glyph: "🐳", labelTr: "Balina", labelEn: "Whale", category: "critter", motion: "float", hue: "#0369A1" },
];

export const STICKER_PREFIX = "sticker:";

export function stickerById(id: string): StickerDef | undefined {
  return STICKERS.find((sticker) => sticker.id === id);
}

export function parseSticker(content: string): StickerDef | undefined {
  if (!content.startsWith(STICKER_PREFIX)) return undefined;
  const id = content.slice(STICKER_PREFIX.length).trim();
  return stickerById(id);
}

export function stickerMessage(id: string) {
  return `${STICKER_PREFIX}${id}`;
}

/** A message made only of emoji renders at sticker size, like a jumbo emoji. */
export function isJumboEmoji(content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 24) return false;
  const withoutEmoji = trimmed
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/\s+/g, "");
  return withoutEmoji.length === 0;
}
