import { VancordClient } from "../src/index.js";

const client = new VancordClient({
  token: process.env.VANCORD_BOT_TOKEN,
  secret: process.env.VANCORD_BOT_SECRET,
});

const WELCOME_CHANNEL = process.env.VANCORD_WELCOME_CHANNEL;

client.on("messageCreate", async (event) => {
  const message = event.message;
  const content = message?.content ?? "";
  if (!content.startsWith("!ping")) return;
  await client.send(message.channelId, `pong — ${new Date().toISOString()}`);
});

client.on("memberJoin", async (event) => {
  if (!WELCOME_CHANNEL) return;
  const name = event.member?.displayName ?? "yeni üye";
  await client.send(WELCOME_CHANNEL, `Hoş geldin ${name}!`);
});

await client.listen();
