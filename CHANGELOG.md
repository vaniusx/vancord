# Changelog

All notable changes to Vancord. Versions follow semantic versioning.

## 1.0.0 — 2026-10-29

First release meant to be used by people other than the author.

### Updates
- The desktop app checks for a new version before it opens and installs it behind
  a native "Updating" screen; the UI does not appear until the new build is in
  place.
- The check gives up after three seconds so a slow network never blocks launch.
- Disabling automatic updates in Settings → About is respected: the app opens and
  shows a notice instead.
- A version that fails to install twice is skipped for 24 hours, and pre-release
  versions are never installed automatically.
- The version now lives in one place and CI fails when `package.json`,
  `tauri.conf.json` and `Cargo.toml` disagree.

### Chat
- Reply to a message from the context menu; the quoted original appears above the
  reply and stays clickable.
- Pin messages and read them from a panel in the channel header.
- Search across every channel you can read, with full-text ranking.
- Mentions (`@name`, `@everyone`) are resolved server side, highlighted in the
  message, counted per channel and listed in an inbox.
- Mention autocomplete in the composer with keyboard navigation.
- Group direct messages for up to ten people.
- New-message indicator, message grouping and scroll restoration fixes.

### Servers
- Custom roles with seventeen permissions, editable per server, assignable to
  members.
- Per-channel permission overrides for roles and individual members, with allow,
  deny and inherit.
- Channel categories that collapse in the sidebar.
- Server emoji and sticker storage, gated on the manage-emojis permission.
- Audit log recording server, role, boost and moderation actions.
- Boost levels (1/2/3) driven by active boosts.

### Economy
- A points ledger. Balance is always derived from an append-only table, so it
  cannot drift and a client cannot write to it.
- Points are earned for sending messages (one per minute), staying in voice (two
  per minute, daily cap) and claiming a daily reward with a streak.
- Shop with Vancord+ and Vancord Ultra memberships, server boosts, a premium
  theme pack and cosmetic badges.
- Purchases, boosts and daily claims all go through security-definer functions.

### Android and mobile
- Fixed servers not appearing: the desktop rail is hidden on phones and the
  bottom bar only showed the active server, so there was no way to switch. There
  is now a full server list with add and join.
- Mention counter in the mobile bar, safe-area padding and 44px targets.

### Design
- Badges are struck metal medallions with a punched-out glyph, legible from 14px.
- Avatar initials no longer sit on a translucent gradient (they were 1.04:1).
- The server rail uses an active gutter marker and neutral inactive tiles.
- Channel rows use a neutral active surface with an accent marker.
- Added a documented spacing and type scale, one focus ring, and reduced-motion
  support.
- Column headers are all 52px.

### Security and performance
- Revoked anonymous execute on every public function; grants are an explicit
  allowlist.
- Pinned `search_path` on all helper functions.
- Added the eighteen missing foreign-key indexes.
- Full-text search index on messages.
- Realtime patches the query cache instead of refetching on every event.

### Tooling
- Vitest with unit tests for formatting, the update guard and markdown
  sanitising and mention handling.
- CI runs type checking, version consistency and tests before it builds.
