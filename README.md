# Vancord

A small, calm desktop chat app for a closed group of friends. Built with Tauri 2, React 19 and
Supabase. There is no server to keep running: the client talks straight to Supabase and row level
security is the only trust boundary.

**[Download the latest release](https://github.com/vaniusx/vancord/releases/latest)** ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Windows
installer (NSIS or MSI). Updates are signed and install in place.

## Features

- Email/password accounts with a provisioned profile, personal server and starter channel
- Eight badges (founder, team, beta supporter, early beta developer, bug hunter,
  active member, moderator, verified bot) shown on profile cards and member rows
- Profile cards open from any name or avatar with bio, badges, banner and
  "now playing"; Steam titles are detected locally and can be hidden
- Floating-panel shell with six palettes and a per-server accent colour
- Servers with icon, banner, description, invite codes and owner/admin/member roles
- Text channels with markdown, 48 built-in stickers, reactions, image and GIF
  attachments (animation preserved), inline editing and jumbo emoji
- Voice channels with camera and screen sharing (LiveKit)
- Live message updates, typing indicators and presence over Supabase Realtime
- Direct messages, but only in the messages view; servers stay focused on channels
- Six colour palettes with dark and light mode, switchable from settings
- Profile customisation: avatar, banner, bio, status and accent
- Desktop notifications, system tray, window state, autostart and signed auto-updates
- Windows and Android from one codebase; the APK ships on every release
- Turkish and English UI

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

- Authentication ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€Â¢ Sign In / Providers ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€Â¢ Email: turn **Confirm email** off while developing,
  otherwise sign-up returns no session until the address is verified.
- Storage buckets `avatars` and `attachments` are created by the migration, together with their
  policies.

## Scripts

```bash
pnpm dev            # Vite only (browser preview)
pnpm build          # type check + production bundle
pnpm tauri dev      # desktop app with hot reload
pnpm tauri build    # NSIS + MSI installers
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

1. Settings â†’ Developer â†’ **New bot**, enter an HTTPS webhook and pick permissions.
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

## Android

`pnpm tauri android build --apk --target aarch64` produces a signed APK. Signing
reads `VANCORD_ANDROID_KEYSTORE`, `VANCORD_ANDROID_KEYSTORE_PASSWORD`,
`VANCORD_ANDROID_KEY_ALIAS` and `VANCORD_ANDROID_KEY_PASSWORD` from the
environment, so no keystore or password is committed. CI restores the keystore
from `ANDROID_KEYSTORE_BASE64` and attaches the APK to the release.

Screen sharing stays desktop-only: Android WebView does not implement
`getDisplayMedia`. Microphone and camera work on both.