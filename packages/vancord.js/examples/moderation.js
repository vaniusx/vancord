import { VancordClient } from "../src/index.js";

/**
 * Reference moderation bot.
 *
 * Automated rules in the database already delete spam, invite links and banned
 * words. This bot adds the parts that need conversational context: repeated
 * warnings, escalating mutes and a readable audit trail in the log channel.
 */

const client = new VancordClient({
  token: process.env.VANCORD_BOT_TOKEN,
  secret: process.env.VANCORD_BOT_SECRET,
});

const LOG_CHANNEL = process.env.VANCORD_MODLOG_CHANNEL;
const WARN_THRESHOLD = Number(process.env.VANCORD_WARN_THRESHOLD ?? 3);

const warnings = new Map();
const recent = new Map();

function key(message) {
  return `${message.channelId}:${message.authorId}`;
}

async function log(line) {
  if (!LOG_CHANNEL) return;
  await client.send(LOG_CHANNEL, line).catch(() => {});
}

client.on("messageCreate", async (event) => {
  const message = event.message;
  if (!message?.content) return;

  // 1 — duplicate flooding inside 8 seconds
  const bucket = recent.get(key(message)) ?? [];
  const now = Date.now();
  const windowed = [...bucket, { at: now, content: message.content }].filter(
    (entry) => now - entry.at < 8000,
  );
  recent.set(key(message), windowed);

  const sameContent = windowed.filter((entry) => entry.content === message.content).length;
  const total = windowed.length;

  if (sameContent >= 4 || total >= 7) {
    const count = (warnings.get(message.authorId) ?? 0) + 1;
    warnings.set(message.authorId, count);

    await log(
      `⚠️ <${message.authorId}> flood (${total} mesaj / 8sn) — uyarı ${count}/${WARN_THRESHOLD}`,
    );

    if (count >= WARN_THRESHOLD) {
      warnings.set(message.authorId, 0);
      await log(
        `🔨 <${message.authorId}> ${WARN_THRESHOLD} uyarıya ulaştı, moderasyon panelinden susturulmalı.`,
      );
    }
    return;
  }

  // 2 — shout in caps
  const letters = message.content.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 12) {
    const upper = letters.replace(/[^A-ZÇĞİÖŞÜ]/g, "").length;
    if (upper / letters.length > 0.85) {
      await client.send(message.channelId, "Lütfen büyük harfle yazmayı azalt.");
      await log(`🔊 <${message.authorId}> caps-lock mesajı`);
    }
  }
});

client.on("memberJoin", async (event) => {
  const name = event.member?.displayName ?? "yeni üye";
  await log(`➜ ${name} sunucuya katıldı`);
});

await client.listen();
