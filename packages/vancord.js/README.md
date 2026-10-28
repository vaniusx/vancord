# vancord.js

The bot SDK for Vancord. A bot receives events on an HTTPS webhook and acts back
through a small REST API.

```bash
npm install   # nothing to install, Node 20+ is enough
VANCORD_BOT_TOKEN=vc_xxx.yyy \
VANCORD_BOT_SECRET=... \
node examples/ping.js
```

## Lifecycle

1. In the app open **Settings → Developer**, then **New bot**. You get a token
   (`vc_<prefix>.<secret>`) exactly once — store it in your environment.
2. Run your webhook locally or deploy it somewhere with HTTPS.
3. Run **Test**. Eleven checks execute server-side; the bot is approved
   automatically for low and medium risk permissions, and lands in the founder
   review queue for high risk ones.
4. Install the bot into a server you administer.

## Permissions and risk

| Permission | What it allows |
| --- | --- |
| `messages.read` | receive `messageCreate` events |
| `messages.write` | `client.send()` |
| `messages.manage` | delete or edit any message |
| `reactions.write` | add and remove reactions |
| `members.read` | read the member list, receive `memberJoin` |
| `members.moderate` | timeout, kick and ban |
| `channels.read` | list channels |
| `channels.manage` | create, rename and delete channels |

Risk tier is derived from what you request:

- **Tier 1** (read/write/reactions/channels.read/members.read): approved when the
  suite passes.
- **Tier 2** (`messages.manage`): approved, flagged for a later spot check.
- **Tier 3** (`members.moderate`, `channels.manage`): needs the founder's approval
  after passing.

## Events

Every delivery is a POST with:

```
X-Vancord-Event: messageCreate
X-Vancord-Signature: sha256=<hmac>
```

Body:

```json
{
  "event": "messageCreate",
  "delivery": "uuid",
  "sentAt": "2026-10-28T12:00:00.000Z",
  "data": {
    "message": {
      "id": "uuid",
      "channelId": "uuid",
      "serverId": "uuid",
      "content": "hello",
      "createdAt": "…",
      "authorId": "uuid",
      "botId": null
    },
    "author": { "displayName": "Deniz", "avatarUrl": "…" }
  }
}
```

`client.verify(rawBody, header)` checks the signature. The listener rejects
unsigned requests and answers duplicate `delivery` ids without re-running the
handler.

## Client

```js
import { VancordClient } from "vancord.js";

const client = new VancordClient({
  token: process.env.VANCORD_BOT_TOKEN,
  secret: process.env.VANCORD_BOT_SECRET,
});

client.on("messageCreate", async ({ message }) => {
  if (message.content === "!ping") await client.send(message.channelId, "pong");
});

await client.listen(8080);
```

Methods: `send(channelId, content)`, `channels()`, `members(serverId)`,
`verify()`, `listen(port)`, `close()`.

## Review checks

| Check | Why |
| --- | --- |
| HTTPS webhook | tokens and content must not travel in clear |
| public host only | blocks SSRF against internal services |
| signature echo | proves the bot verifies authenticity |
| event envelope | proves the payload shape is understood |
| under 2 s | a slow bot stalls every message |
| duplicate delivery id | Vancord retries on network hiccups |
| no credentials in the URL | URLs leak into logs |
| malformed payload | must not crash the handler |
| declares permissions | the UI cannot render an empty scope |
| third reachability probe | catches flapping endpoints |
| redirect stays public | blocks open-redirect abuse |

Rate limit: 20 messages per minute per bot.
