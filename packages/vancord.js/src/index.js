import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const DEFAULT_API = "https://ctxevdhdoaceepdmzvot.supabase.co";
const API_BASE = process.env.VANCORD_API ?? DEFAULT_API;

const EVENTS = ["messageCreate", "memberJoin", "ping", "challenge", "review"];

/**
 * Minimal Vancord bot client.
 *
 *   const client = new VancordClient({ token, secret });
 *   client.on("messageCreate", async (event) => {
 *     if (event.content === "!ping") await client.send(event.channelId, "pong");
 *   });
 *   await client.listen(8080);
 *
 * `secret` is the value Vancord returns once when the bot passes review; it is
 * used to verify the X-Vancord-Signature header on every delivery.
 */
export class VancordClient {
  #token;
  #secret;
  #handlers = new Map();
  #seen = new Set();
  #server = null;

  constructor({ token, secret, apiBase = API_BASE }) {
    if (!token) throw new Error("A bot token is required");
    this.#token = token;
    this.#secret = secret ?? null;
    this.apiBase = apiBase.replace(/\/$/, "");
  }

  on(event, handler) {
    if (!EVENTS.includes(event)) {
      throw new Error(`Unknown event "${event}". Expected one of: ${EVENTS.join(", ")}`);
    }
    this.#handlers.set(event, handler);
    return this;
  }

  /** Verifies a delivery against the shared secret. */
  verify(rawBody, signatureHeader) {
    if (!this.#secret) return false;
    const provided = (signatureHeader ?? "").replace(/^sha256=/, "");
    const expected = createHmac("sha256", this.#secret).update(rawBody).digest("hex");
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  async request(method, path, body) {
    const response = await fetch(`${this.apiBase}/bot-api/${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.#token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`Vancord API ${response.status}: ${data?.error ?? text}`);
    }
    return data;
  }

  /** Send a message to a text channel. */
  async send(channelId, content) {
    return this.request("POST", "messages", { channel_id: channelId, content });
  }

  async channels() {
    const data = await this.request("GET", "channels");
    return data.channels ?? [];
  }

  async members(serverId) {
    const data = await this.request("GET", `members?server_id=${encodeURIComponent(serverId)}`);
    return data.members ?? [];
  }

  /** Start an HTTP listener that Vancord delivers events to. */
  async listen(port = Number(process.env.PORT ?? 8080)) {
    this.#server = createServer(async (req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405).end();
        return;
      }

      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");

      if (this.#secret && !this.verify(raw, req.headers["x-vancord-signature"])) {
        res.writeHead(401, { "Content-Type": "application/json" }).end('{"error":"invalid_signature"}');
        return;
      }

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        res.writeHead(400).end('{"error":"invalid_json"}');
        return;
      }

      // Replays are acknowledged but not re-processed.
      if (payload.delivery && this.#seen.has(payload.delivery)) {
        res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true,"duplicate":true}');
        return;
      }
      if (payload.delivery) {
        this.#seen.add(payload.delivery);
        if (this.#seen.size > 500) {
          this.#seen.delete(this.#seen.values().next().value);
        }
      }

      if (payload.event === "challenge") {
        res
          .writeHead(200, { "Content-Type": "application/json" })
          .end(JSON.stringify({ challenge: payload.challenge, echo: req.headers["x-vancord-signature"] }));
        return;
      }

      const handler = this.#handlers.get(payload.event);
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');

      if (handler) {
        try {
          await handler(payload.data ?? payload);
        } catch (error) {
          console.error(`[vancord] handler for ${payload.event} threw:`, error);
        }
      }
    });

    await new Promise((resolve) => this.#server.listen(port, resolve));
    console.log(`[vancord] listening on :${port}`);
    return this.#server;
  }

  async close() {
    if (!this.#server) return;
    await new Promise((resolve) => this.#server.close(resolve));
    this.#server = null;
  }
}

export default VancordClient;
