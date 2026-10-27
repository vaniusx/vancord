# Vancord

A lightweight, fast desktop chat application for small groups of friends. Built with Tauri 2,
React 19 and Supabase. No always-on server to pay for: the client talks straight to Supabase and
row level security is the only trust boundary.

## Features

- Email/password accounts with a provisioned profile, personal server and starter channel
- Servers, invite codes, roles (owner / admin / member) and member list
- Text channels with markdown, reactions, file and image attachments, inline editing
- Live message updates, typing indicators and presence over Supabase Realtime
- Direct messages plus a friends list with requests
- Desktop notifications, system tray, window state, autostart and signed auto-updates
- Turkish and English UI, dark and light themes that follow the system

## Stack

| Layer | Choice |
| --- | --- |
| Shell | Tauri 2 (Rust) with a frameless window and tray |
| UI | React 19, Vite, Tailwind CSS v4, shadcn/ui, Radix primitives |
| Data | Supabase Postgres, Auth, Realtime, Storage (RLS on every table) |
| State | TanStack Query + Zustand |

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
pnpm tauri dev      # desktop app with hot reload
pnpm tauri build    # NSIS + MSI installers
```

## Release and updates

1. Generate signing keys once:

   ```bash
   pnpm tauri signer generate -w ~/.tauri/vancord.key
   ```

   Copy the public key into `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`.

2. Point `plugins.updater.endpoints` at your repository's
   `releases/latest/download/latest.json`.

3. Add these repository secrets:

   | Secret | Value |
   | --- | --- |
   | `TAURI_SIGNING_PRIVATE_KEY` | contents of the private key file |
   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | its password, empty if none |
   | `VITE_SUPABASE_URL` | project URL |
   | `VITE_SUPABASE_ANON_KEY` | publishable or anon key |

4. Push a tag such as `v0.1.0`. `.github/workflows/release.yml` builds the installers, signs the
   updater artifacts and publishes them.

`keepalive.yml` pings the project every other day so a free Supabase project does not pause.

## Security notes

- Only the anon/publishable key ships with the app. The service role key never leaves your machine.
- Every table has row level security; membership and channel access are checked through
  `security definer` helpers that are not executable by anonymous users.
- Attachments are limited to 5 MB and images are compressed to WebP on the client.
- Updates are verified against the public key baked into the app.
- The CSP only allows Supabase, the local dev server and Tauri IPC.

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
