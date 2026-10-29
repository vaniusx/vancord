# Vancord

A small, calm desktop chat app for a closed group of friends. Built with Tauri 2, React 19 and
Supabase. There is no server to keep running: the client talks straight to Supabase and row level
security is the only trust boundary.

**[Download the latest release](https://github.com/vaniusx/vancord/releases/latest)** → Windows
installer (NSIS or MSI). Updates are signed and install in place.

## Features

- Email/password accounts with a provisioned profile, personal server and starter channel
- Automatic updates: a new build installs before the window opens, and can be
  turned off in Settings → About
- Text, voice, forum and category channels; direct messages and group DMs for up
  to ten people
- Custom roles with seventeen permissions and per-channel allow/deny overrides
- Message replies, pins, full-text search and an @mention inbox
- Markdown, GIFs, server emoji and stickers, reactions, image attachments and
  inline editing
- Points economy: earn by chatting and by time in voice, spend on Vancord+,
  Vancord Ultra, server boosts, themes and cosmetic badges
- Eight badges shown on profile cards and member rows
- Profile cards with bio, badges, banner and "now playing" via local Steam detection
- Floating-panel shell with six palettes and a per-server accent colour
- Windows and Android from one codebase; the APK ships on every release

## Optional integrations

| Feature | Setup | Cost |
| --- | --- | --- |
| Voice + screen share | Create a LiveKit Cloud project, then set the Edge Function secrets `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Free tier: 5,000 WebRTC minutes/month, 100 concurrent |
| GIF picker | `VITE_GIPHY_API_KEY` from developers.giphy.com | Free |
| Email verification codes | Paste `supabase/templates/confirmation.html` into Authentication > Emails > Confirm signup, then set `app_settings.email_verification_mode = code` | Free |

With `app_settings.email_verification_mode = auto` (the default) accounts are confirmed on
signup and the client signs in immediately, so no email is needed at all. Switching the setting to
`code` makes the app require the 6-digit token from the confirmation email; that template must
contain `{{ .Token }}` for the code to appear in the message.

## Stack

| Layer | Choice |
| --- | --- |
| Shell | Tauri 2 (Rust) with a frameless window and tray |
| UI | React 19, Vite, Tailwind CSS v4, shadcn/ui, Radix primitives |
| Data | Supabase Postgres, Auth, Realtime, Storage (RLS on every table) |
| State | TanStack Query + Zustand |

Design direction, palette and measured contrast live in [`docs/DESIGN.md`](docs/DESIGN.md).

## Getting started

```bash
pnpm install
cp .env.example .env.local      # fill in your Supabase URL and publishable/anon key
pnpm tauri dev
```

The database schema lives in `supabase/migrations`. Apply it with the Supabase MCP server, the
dashboard SQL editor, or `supabase db push`.

### Required Supabase settings

- Authentication → Sign In / Providers → Email: turn **Confirm email** off while developing,
  otherwise sign-up returns no session until the address is verified.
- Storage buckets `avatars` and `attachments` are created by the migration, together with their
  policies.

## Scripts

```bash
pnpm dev            # Vite only (browser preview)
pnpm build          # type check + production bundle
pnpm test           # unit tests (Vitest)
pnpm tauri dev      # desktop app with hot reload
pnpm tauri build    # NSIS + MSI installers
node scripts/check-version.mjs   # version consistency across the three manifests
```

## Release and updates

Releases are already wired for this repository. The signing key has no password, so only four
secrets are needed and three are stored:

| Secret | Value |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | contents of the private key file (already set) |
| `VITE_SUPABASE_URL` | project URL (already set) |
| `VITE_SUPABASE_ANON_KEY` | publishable or anon key (already set) |

The updater endpoint is `https://github.com/vaniusx/vancord/releases/latest/download/latest.json`
and the public key is baked into `src-tauri/tauri.conf.json`.

To ship a new version:

```bash
# bump the version in package.json and src-tauri/tauri.conf.json
git commit -am "release: v0.2.0"
git tag v0.2.0
git push && git push --tags
```

`.github/workflows/release.yml` type checks, builds the NSIS and MSI installers, signs the updater
artifacts and publishes the release with `latest.json`. `keepalive.yml` pings the project every
other day so the free Supabase project does not pause.

Keep the private key at `~/.tauri/vancord/vancord.key`. Losing it means existing installs can no
longer auto-update.

## Security notes

- Only the anon/publishable key ships with the app. The service role key never leaves your machine.
- Every table has row level security; membership and channel access are checked through
  `security definer` helpers that are not executable by anonymous users.
- Attachments are limited to 5 MB and images are compressed to WebP on the client.
- Updates are verified against the public key baked into the app.
- The CSP only allows Supabase, the local dev server and Tauri IPC.
- The repository is public so the updater can fetch release metadata without a token. No secrets
  are committed; database access is guarded by RLS, not by repo visibility.

## Project layout

```
src/
  app/          router, providers, theme
  components/   shared UI primitives and shadcn components
  features/     auth, servers, chat, messages, friends, settings, realtime
  lib/          supabase client, formatting, uploads, updater, i18n
  locales/      tr.json, en.json
src-tauri/      Rust shell, tray, capabilities, updater config
supabase/       SQL migrations
```

## Bot platform

Bots receive signed webhook events and act through a small REST API. The SDK lives
in `packages/vancord.js` with two runnable examples.

1. Settings → Developer → **New bot**, enter an HTTPS webhook and pick permissions.
2. Run **Test**: eleven checks execute server-side (HTTPS, SSRF guard, signature
   echo, envelope, latency, duplicate delivery, credential-in-URL, malformed
   payload, declared permissions, reachability, redirect target).
3. Tier 1 and 2 permission sets are approved on a passing run; tier 3
   (`members.moderate`, `channels.manage`) waits for the founder's review.
4. Install the bot in a server you administer.

Events are delivered by `bot-dispatch`, which verifies an internal HMAC before
signing the payload with a per-bot secret. A token is 41+ characters, stored only
as a SHA-256 hash with a queryable prefix, and shown once.

## Moderation

Every server gets an automatic `#mod-log` channel. `server_automod` blocks invite
links, banned words, mention floods and message floods at the database level, so
the rule applies even if a client is out of date. Moderators also get timeout,
kick and ban actions from the member list.

## Points and memberships

Points are recorded in an append-only ledger; a balance is always derived, never
stored, so it cannot drift and the client cannot write to it.

| Action | Points |
|---|---|
| Sending a message | 1 per minute, server channels only, minimum five characters |
| Time in voice | 2 per minute, 120 a day, clamped to real elapsed time |
| Daily claim | 10, or 15 with a streak |

| Item | Price |
|---|---|
| Vancord+ (30 days) | 3000 |
| Vancord Ultra (30 days) | 6000 |
| Server boost (30 days) | 1000 |
| Premium theme pack | 1200 |
| Cosmetic badges | 800–1500 |

There is no real-money purchase path. Everything is earned in the app.

## Automatic updates

On launch the desktop build checks for a new version, and if one exists it is
installed behind a full-screen "Updating" view; the app appears only once the new
build is in place. The check times out after three seconds so a slow network
never blocks opening. Turning the option off in Settings → About makes the app
open with a notice instead. A version that fails twice is skipped for 24 hours.

## Android

`pnpm tauri android build --apk --target aarch64` produces a signed APK. Signing
reads `VANCORD_ANDROID_KEYSTORE`, `VANCORD_ANDROID_KEYSTORE_PASSWORD`,
`VANCORD_ANDROID_KEY_ALIAS` and `VANCORD_ANDROID_KEY_PASSWORD` from the
environment, so no keystore or password is committed. CI restores the keystore
from `ANDROID_KEYSTORE_BASE64` and attaches the APK to the release.

Screen sharing stays desktop-only: Android WebView does not implement
`getDisplayMedia`. Microphone and camera work on both.