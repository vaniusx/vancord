# Changelog

All notable changes to Vancord. Versions follow semantic versioning.

## 2.0.0 — 2026-11-02

The release the app was aiming at: a server that feels like a place, a store
whose cosmetics actually appear, and an interface drawn in one icon language.

### Icons
- The whole interface moved from 1.5 px outlines to Phosphor solid glyphs, held
  behind one module so the weight is a single decision. At 14–16 px an outline
  loses its shape; a filled mark does not, which is what made the UI read as
  low quality.
- Badges are struck medallions with a punched glyph, and grew from eight to
  fourteen: event host, booster, translator, artist, helper and legend.

### Cosmetics that exist
- Frames, nameplates and themes now have an equipped state on the profile, so
  buying one changes what people see. A frame draws around the avatar, a
  nameplate tints the display name in messages, the member list and the profile
  card.
- Equipping is checked server-side: a wrong slot or an item the user does not
  own is refused.
- Animated avatars require a membership, enforced in the database rather than by
  the client.

### Sound
- Twenty-four cues instead of twelve, retuned for a bright, soft, short feel:
  sine and triangle bodies with a quiet partial, a 4 ms attack, a 6 kHz low-pass
  and nothing over 300 ms except the ring. A master volume slider sits above the
  per-cue switches.

### Call and screen sharing
- A screen share owns the stage with a thumbnail strip beneath it; cameras
  expand on demand and collapse back. Tile labels are translated rather than
  hardcoded.
- DM rows carry voice and video buttons, so a call starts from the list.
- Mute, deafen, camera and screen share all play their own cue.

### Motion
- A routed screen enters with a short, consistent fade-and-lift; buttons scale
  on press, which is the only affordance a touch screen has.
- "Reduce motion" and "compact" message density now do something: they set
  attributes the stylesheet reads, instead of only being stored.

### Fixed
- A sent GIF and the GIF picker no longer spill over the composer.
- Right-clicking a member offers a role submenu instead of a disabled label.
- Friend requests arrive over realtime with a notification, so they no longer
  need a reload.
- Events are one click from the channel list.

## 1.3.0 — 2026-10-31

Servers grow up, settings get real, and the store becomes something to browse.

### Servers
- Invite codes are now readable words instead of a random hash, and every server
  can claim a vanity slug once it reaches boost level 2. A hosted join link works
  as well as the bare code.
- Server settings split into eight tabs: general, roles, emoji, events, boosts,
  moderation, bots and danger zone.
- Custom emojis and stickers can be uploaded. Slots are enforced by boost level,
  so buying a boost is what unlocks the next set.
- Perks are listed in the boost tab instead of being implied: emoji slots, upload
  size, stream quality and the vanity slug.

### Events
- A server can schedule events with a title, description, start and end time, a
  location and an optional voice channel. The panel shows upcoming and past
  events, who is attending, and reminds attendees shortly before the start.
- Events are reachable from the channel list, not buried in settings.

### Settings
- Fourteen sections in six groups. New: account (password change, active
  sessions, account deletion), security (authenticator app enrolment), voice and
  video (input mode, noise suppression, echo cancellation, output volume), sound
  effects (per-event toggle and volume), accessibility (reduced motion, message
  density), privacy (activity visibility, data export) and keyboard shortcuts.
- "Delete my account" and "export my data" run server-side, so removing the
  client does not leave a stranded account.

### Store
- Five tabs: plans, frames, themes, badges and nameplates, with a live preview
  drawn from the profile itself — a frame preview is your own avatar inside that
  ring, a nameplate preview is your own display name in that colour.
- Vancord+ and Ultra are compared line by line: animated avatar and banner,
  upload size, stream quality, accent colour, profile theme, frames and the
  soundboard.
- Any cosmetic can be gifted to another user by username, paid from your balance.

### Games
- Detection now covers Riot, Epic, Battle.net, EA, Ubisoft, GOG, Rockstar and
  standalone launchers, not just Steam. League, VALORANT, Fortnite, Overwatch 2,
  Cyberpunk, Elden Ring and about fifty more titles are recognised from the
  process list, and the profile card says which launcher the game came from.

### Official bot
- Every server gets one, silently. It greets new members, writes timeouts, kicks
  and bans into the log channel, and announces boosts with the new level. It is
  hidden from the member list and has switches in the bots tab.

## 1.2.0 — 2026-10-30

First batch of the v2 cleanup: the failures that made the app feel broken.

### Calls
- Direct messages can actually ring. A new `call_invitations` table records who
  called whom and whether it was answered, so a missed call survives a reconnect
  instead of vanishing with a broadcast.
- The callee gets a full-screen card with a ring tone, accept and decline, and a
  45 second timeout. The caller sees a live timer and an end button.
- The caller only joins the room once the callee accepts, so a declined call never
  opens a microphone.
- Android raises a system notification for an incoming call.

### Performance
- Realtime was subscribed to every message in the database with no filter, so each
  client received every chat line on the server. The subscription is now limited
  to the channels the user can open.
- Chat rows outside the viewport skip layout and paint.
- The shell no longer refetches the member roster for every route.

### Reliability
- 35 mutations silently ignored their errors. A single mutation-level handler now
  turns failures into a sentence that says what to do, with Postgres, Auth and
  app-specific codes mapped.
- Sending a friend request used a raw insert on a table keyed by
  `(requester, addressee)`. Adding someone who had already added you produced a
  duplicate-key error that disappeared. Requests now go through a function that
  accepts a mutual request, ignores a repeat and refuses a block.
- Marking an inaccessible channel read is a no-op instead of a 409.
- "Do not disturb" now actually suppresses notifications.

### Android
- `POST_NOTIFICATIONS` and `VIBRATE` declared; the runtime prompt is requested.
- `versionCode` is derived from the semantic version, so a new APK installs over
  the old one instead of being refused.
- Android can check the release feed and hand the APK to the system installer.
- Invite deep links: `vancord://join/<code>` and the hosted https fallback.

### Interface
- Members have a context menu: message, copy username, copy id.
- The profile card flips to stay inside the viewport.
- Message GIF picker, profile card and the pinned panel no longer overflow on a
  phone.
- Added a capabilities layer so screens ask what the platform can do instead of
  guessing from a viewport width.

## 1.0.1 — 2026-10-30

Bug fixes for issues reported on 0.3 and 1.0.

### Voice
- The packaged app blocked its own voice connection: the content security policy
  did not allow the LiveKit WebSocket, so the room never connected. It only
  worked in development because the dev server skips that policy. Added
  `wss://*.livekit.cloud` and the Giphy endpoints.
- Every voice failure used to read "LiveKit is not configured". Errors are now
  classified: expired session, no permission, denied microphone, missing device,
  device in use, network failure, blocked WebSocket, full room. Each one explains
  the fix, and microphone problems offer a retry.

### GIFs
- The GIF picker could not reach `api.giphy.com` for the same policy reason.
  Fixed by the same change.

### Sidebar
- Closing the channel panel on desktop made it unreachable; only Ctrl+B brought
  it back. There is now a visible toggle between the rail and the content.

### Presence
- Every member appeared online regardless of activity, because the resolver fell
  back to the stored profile column which defaults to online. A member with no
  live presence entry is now offline, and the roster sorts and counts from the
  live status.

### Performance
- The shell subscribed to the member roster on every route, so each presence or
  unread update re-rendered the whole app. The routed screen is now memoised and
  the roster is only read while a server dialog is open.
- Steam detection ran every 45 seconds and re-read every library manifest; the
  library scan is cached for five minutes and the process scan for twenty
  seconds, polling moved to 90 seconds, and a hidden window does no work.
- Activity changes patch the member cache instead of invalidating every roster.

### Other
- Added the missing `friends.empty` and `sidebar.showChannels` strings.
- Added unit tests for voice error classification and presence resolution.

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
