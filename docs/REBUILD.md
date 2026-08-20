# Rebuild Spec

The plan for turning the current channel-as-room prototype into a watch-party product:
disposable rooms, a real member model, video calls, and a coherent visual identity.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## 1. Product shape

### The problem with today's flow

`room === channel === user`. A channel is auto-created at signup, its slug is the room
code forever, and there is exactly one per account. Consequences: you can't run two
parties, can't end one, can't host on someone else's channel, and there's no concept of a
room being "live". The invite artifact is an 8-char code buried on `/channel` that you copy
out of band to a friend, who must then create an account before they can use it.

### The new flow

```
/                 "Start a watch party" → room created → you're in it
/r/{code}         the room. one URL, pasteable into any chat app.
                  a friend opens it → "what's your name?" → they're in. no signup.
/library          your uploaded videos (what /channel used to be)
/r/{code}/lobby   pre-roll state: who's here, what's queued, host picks something
```

Rules:

- Rooms are cheap and disposable. A user may host many; they end explicitly or expire.
- **Guests need no account to *join*.** Name + a `guestId` cookie. Signing in buys
  persistence (your library, your history) and the ability to host. Hosting is gated
  because a film comes from a library and a library needs an account — a guest host
  could open a room but never play anything in it. Enforced in Phase 2.
- The room code is the invite. `/r/WOLF-42` is the whole sharing story — no separate page,
  no dialog, no copy-the-code step.
- Playback authority is `Room.hostId` (plus co-hosts), not `Channel.creatorId`.

---

## 2. Design system — "Bulb"

**Superseded.** The design system now lives in [`DESIGN.md`](./DESIGN.md), which is the
source of truth. The reference implementation is `docs/mockups/index.html` — a static,
self-contained mockup of the landing page and a room mid-film.

The short version: the page is a dark room and the video is the only light source. True
black ground, one butter-yellow accent (`#FEF297`), geometric sans, pills and 16px cards.
Elevation is a step in lightness, never a shadow.

### What was wrong with Cinema Programme

The previous system was warm cream paper, ink hairlines, vermilion, editorial serif. It
was replaced for three reasons, all worth remembering:

- **A reading aesthetic on a video product.** A cream page around a video frame raises the
  surround's luminance, the viewer's iris stops down, and the film's shadow detail is
  crushed. The page fought the content.
- **The accent failed as text.** Vermilion was 3.6:1 on paper, so it could never be body
  copy, which forced a second token (`vermilion-deep`) to exist purely to work around the
  first. Butter yellow is 18.4:1 on black, so one accent covers text, fills and signals.
- **No layout system.** Tokens were written and components improvised one at a time.

### Deletions (done)

`retro-grid` · `floating-element` · `flip-words` · `marquee` · `blur-in` · `background` ·
`components/video-player.tsx` · `components/navbar.tsx` · `_components/wrapper` · every
`bg-clip-text` gradient heading · every `backdrop-blur` · every `shadow-*` · the indigo
auth page and its dot-grid backdrop.

Note: `DESIGN.md` §4 re-permits a rotating headline word, which the old spec banned as
`flip-words`. The pattern is allowed; the old component is not.

---

## 3. Data model

`Channel` is demoted to a library. `Room` becomes the unit of everything live.

```prisma
model Room {
  id             String   @id @default(cuid())
  code           String   @unique          // WOLF-42, human-speakable
  title          String
  hostId         String
  status         RoomStatus @default(LOBBY) // LOBBY | LIVE | ENDED
  visibility     Visibility @default(UNLISTED)
  currentVideoId String?
  positionMs     Int      @default(0)
  isPlaying      Boolean  @default(false)
  scheduledFor   DateTime?
  createdAt      DateTime @default(now())
  endedAt        DateTime?
}

model RoomMember {
  id        String   @id @default(cuid())
  roomId    String
  userId    String?                        // null for guests
  guestId   String?                        // cookie-backed anonymous identity
  guestName String?
  role      Role     @default(VIEWER)      // HOST | COHOST | VIEWER
  joinedAt  DateTime @default(now())
  lastSeenAt DateTime @updatedAt
  @@unique([roomId, userId])
  @@unique([roomId, guestId])
}

model Message {
  id          String   @id @default(cuid())
  roomId      String
  authorLabel String                       // denormalized display name
  userId      String?
  body        String
  videoTimeMs Int?                         // set → timestamped comment
  createdAt   DateTime @default(now())
  @@index([roomId, createdAt])
}

model QueueItem {
  id       String @id @default(cuid())
  roomId   String
  videoId  String
  position Int
  addedBy  String
  @@index([roomId, position])
}
```

Also on `Video`, finally populated by the worker: `durationMs`, `status`
(`PENDING | TRANSCODING | READY | FAILED`), `variants Json`, `spriteVttUrl`,
`subtitleVttUrl`, `transcript`.

And for pasted links: `source (UPLOAD | FILE | HLS | YOUTUBE)` plus a unique
`sourceUrl` and `thumbnailUrl`, with `channelId` and `creatorId` nullable — an
external source is a `Video` row that belongs to no library.

`QueueItem` gains `status (SUGGESTED | QUEUED)` and `createdAt`. A viewer's
addition lands as `SUGGESTED` and only a host or co-host can promote it.

---

## 4. HTTP API

```
POST   /api/rooms                    create; returns { code }        (auth or guest)
GET    /api/rooms/:code              room + members + queue + current state
POST   /api/rooms/:code/join         { guestName? } → sets guestId cookie, adds member
POST   /api/rooms/:code/end          host only
POST   /api/rooms/:code/queue        { videoId }                     host/cohost
DELETE /api/rooms/:code/queue/:id                                    host/cohost
POST   /api/rooms/:code/role         { memberId, role }              host only
GET    /api/rooms/:code/messages     ?before= paginated history
POST   /api/rooms/:code/source     { url } → play a pasted link      host/cohost
POST   /api/rooms/:code/queue        { url } | { videoId }             any member
POST   /api/rooms/:code/queue/:id/approve  promote a suggestion        host/cohost
POST   /api/rooms/:code/next         { afterVideoId } → play the head  host/cohost
GET    /api/videos                   my library (replaces /channels/me)
```

`/api/videos/interaction/:videoId` keeps its shape but authorizes against
`RoomMember.role ∈ {HOST, COHOST}` instead of `Channel.creatorId`.

---

## 5. WebSocket protocol

Existing `namespace:verb` convention continues. New and changed types:

| Type | Direction | Payload |
|---|---|---|
| `room:join` | → | `{ roomId, identity }` — server replies with full snapshot |
| `room:snapshot` | ← | members, queue, currentVideoId, positionMs, isPlaying, last 50 messages |
| `room:presence` | ← | member joined/left/renamed |
| `video:update` | ← | unchanged |
| `queue:add` / `queue:next` | ↔ | queue mutations, broadcast |
| `reaction:send` | ↔ | `{ emoji, videoTimeMs }` |
| `rtc:offer` / `rtc:answer` / `rtc:ice` | ↔ | relayed peer-to-peer, `{ to, from, payload }` |
| `rtc:peer-joined` / `rtc:peer-left` | ← | drives mesh connect/teardown |

**Known scaling constraint:** `video-Data` is a Redis *list* consumed via `brPop`, so
exactly one ws-server instance receives each event. Multi-instance requires swapping to
pub/sub and moving `RoomManager` state into Redis hashes. Tracked in Phase 5.

---

## 6. Video calls

> **Superseded.** Calls ship on managed LiveKit Cloud, not this mesh design. See
> [`CALLS-AND-MUSIC.md`](./CALLS-AND-MUSIC.md) and Phase 3 below. The section is kept as
> the record of what was considered and why TURN operation was the thing that killed it.

**WebRTC mesh over the existing ws-server signaling**, capped at 6 cameras.

- Signaling rides the room's existing socket list — offers/answers/ICE are relayed by
  `to` member id, never broadcast.
- **TURN is required**, not optional: coturn on a small VPS or a hosted provider. Without
  it a meaningful fraction of peers behind symmetric NAT never connect.
- Media constraints: 320×240 @ 15fps, mono audio. Cams are thumbnails and HLS is already
  competing for the same downlink.
- **Audio ducking:** Web Audio `AnalyserNode` per remote stream; when RMS crosses a
  threshold, ramp the player volume to ~20% over 200ms and back on silence. This is the
  detail that makes it feel like a product rather than a demo.
- Push-to-talk (hold `Space` — must not conflict with the player's play/pause binding),
  mute/cam toggles, speaking ring on the avatar, filmstrip layout beside the player.
- Mesh is O(n²) uplinks. Document the SFU migration path (mediasoup/LiveKit) rather than
  pretending it scales.

---

## 7. Roadmap

### Phase 0 — Foundation `[x]`
- [x] ~~Cinema Programme tokens~~ → **"Bulb"** tokens in `globals.css` + `tailwind.config.ts`
- [x] Fonts wired (Outfit + JetBrains Mono; Inter and Instrument Serif dropped)
- [x] `Room` / `RoomMember` / `Message` / `QueueItem` schema + `VideoStatus` on `Video`
- [x] Migration authored **and applied**: `20260815000000_rooms_and_video_status`.
      `npx prisma migrate status` reports 13 migrations, schema up to date.

      This entry previously said "not yet applied" because of a P1000 auth failure. That
      diagnosis was wrong and cost real time, so it is worth recording accurately: the
      migration had been applied all along, to a container that was simply stopped. The
      failure was a **port collision**, not bad credentials.

      - `collabyt-postgres` was created mapped to host port **5434**; while it was down,
        another project's `meet-bot-ai-postgres-1` took 5434, and `crashpad-postgres`
        took 5432.
      - `backend/.env` pointed at `postgres@localhost:5432` with **no database name** —
        wrong user, wrong port, wrong server. It never matched the container even when
        that container was running.
      - `docker ps` hides stopped containers, so the database looked absent entirely.
        Use `docker ps -a`.

      Now: **`collabyt-db` on port 5435**, attached to the original data volume, with
      `DATABASE_URL=postgresql://collabyt:***@localhost:5435/collabyt`. The old
      `collabyt-postgres` container is stopped and redundant; it can be removed with
      `docker rm collabyt-postgres` (**without** `-v` — the volume is the live one).

      This will break again on every Docker restart, because the port mapping is baked
      into the container. Docker Compose (Phase 5) is the real fix.
- [x] Signup returned `{ userId }` while the client read `data.user`, so every new account
      landed with `isAuthenticated: true` and `user: undefined` and could never open a
      stream. `/signup` now returns the same `{ access_token, user }` shape as `/login`.
- [x] Green `next build` restored — it was failing on `main` (Next 15 promised
      `params`/`searchParams` in `stream/[id]/page.tsx`, plus two lint errors)
- [x] Delete dead components listed in §2 — all gone with the landing/`/home` rewrite
- [x] `JWT_SECRET`, DB URL, S3 bucket/region, CDN host, API/WS URLs → env config

### Phase 1 — Rooms on the fly `[x]`
- [x] Room CRUD + guest identity (`resolveIdentity` mints a `guestId` cookie and
      never rejects); `POST /rooms`, `GET /rooms/:code`, join, end, queue, role, messages
- [x] Playback authority moved off `Channel.creatorId` onto HOST/COHOST membership,
      centralised in `lib/rooms.ts` so no future control surface can bypass it
- [x] `RoomManager` keyed by room code; membership is `Map<socket, Participant>`
- [x] **Catch-up snapshot on join** — video, position, play state, roster, last 50 messages
- [x] Landing with a working CTA → `/r/{code}`; guest name gate; `/library`;
      `/home`, `/channel`, `/stream` and all landing decoration deleted
- [x] Room shell: framed player, height-matched chat, presence rail, reactions,
      copy-link code button, role-aware empty state
- [x] `test/room-sync.js` — 16 end-to-end checks over the real API + Redis + sockets
- [x] Config extracted to env (`JWT_SECRET`, ports, CORS origin, S3 bucket/region,
      CDN host, API/WS URLs); hardcoded `"secret"` removed

Fixed along the way:
- **Guest identity never persisted.** The `guestId` cookie was set from a different
  origin (`:4000`), so the browser dropped it and every request minted a new guest —
  a host wasn't even a member of the room they had just created. The API is now
  proxied through Next (`next.config.ts` rewrite), making the cookie first-party.
  This is also how it deploys behind one domain.
- **Presence double-counted tabs.** The roster was per-socket, so one person with two
  tabs appeared twice with duplicate React keys. `RoomManager.roster()` now
  de-duplicates by `memberId`, and join/leave only fire when a person actually
  arrives or fully departs.
- `resolveIdentity` doesn't reject, so `POST /videos/presignedurl` (previously behind
  `protectRoute`) gained an explicit signed-in check — otherwise anonymous callers
  could mint S3 upload URLs.
- A malformed WS frame used to close the socket, ejecting the viewer from the party;
  it now returns an error and keeps the session.
- A throw in the Redis consume loop used to silently stop *all* playback sync for the
  life of the process; the loop now recovers and backs off.
- Plyr touches `document` at import time, so the player is loaded with `ssr: false`.
- `dotenv` was resolving transitively in the backend; now a declared dependency.

### Phase 1.5 — Visual rebuild `[x]`

The whole visual layer was redone against [`DESIGN.md`](./DESIGN.md). Backend, WS
protocol, `use-room-socket.ts` and `VideoPlayer.tsx` sync logic were not touched;
`test/room-sync.js` still passes 16/16.

- [x] "Bulb" tokens, 8-step type scale, `max-w-shell`, filament + rotate keyframes
- [x] Outfit + JetBrains Mono via `next/font`; `<title>` and description rewritten
- [x] `plyr.css` re-pointed off Plyr's `#00b2ff` default onto the accent
- [x] `components/ui/*` — pills, 16px cards, every `shadow-*` removed, butter focus rings
- [x] Landing rebuilt: rotating headline, and a real room running instead of the three
      numbered step cards (which were the same pattern Watch2Gether uses)
- [x] Room, chat, presence rail restyled; reactions became chips, not bare floating emoji
- [x] Join gate and `/auth` rebuilt as "doorways" on a shared `Ambient` backdrop — no
      card on a slab. `/auth` now defaults to sign-in, not sign-up
- [x] `/library` became the signed-in home: **Open a room** as its primary action, plus an
      open-rooms strip off `GET /rooms/mine` that renders nothing when empty
- [x] **No `/home` route.** Rooms are disposable and the link is the artifact, so a
      "your rooms" screen would be empty for most people. `/library` absorbs the job

Known gap, deliberately not fixed here — **since resolved in Phase 2:**

- ~~**A guest host has nothing to play.**~~ `POST /videos/presignedurl` requires an
  account, so someone who opened a room without signing in could not supply a film at
  all. Rather than working around it, hosting now requires an account and the case no
  longer exists. Guests still join freely. See Phase 2.

### Phase 1.6 — Auth page + identity `[x]`

- [x] **`/auth` given a second column.** It had the join gate's skeleton with half its
      content — the gate fills its upper half with the room you're walking into, and auth
      had a heading and one paragraph, so two thirds of a desktop viewport was dead. The
      lamp (`_components/lamp.tsx`) fills it. Not a decorative illustration, which
      `DESIGN.md` §5 rule 6 rules out: it is the system's own metaphor, `aria-hidden`,
      and dropped entirely below `lg`.
      - `mix-blend-screen` is load-bearing. The source is an opaque rectangle on pure
        black; under `screen` black contributes nothing, so it composites onto `Ambient`
        with no visible edge. The asset must stay true `#000000` or the whole rectangle
        greys up.
      - `unoptimized` is also load-bearing: at 1023px the source is smaller than anything
        `next/image` would emit, and letting the optimizer upscale it toward `w=3840`
        blocked the single-threaded dev image queue for minutes at a time.
- [x] Form restyled — 44px controls, not the join gate's 52px. Three stacked pills at
      52px matched the submit button exactly and left the form with no hierarchy.
- [x] Password reveal hit target 17×17 → 36×36 (WCAG 2.5.8 wants ≥24×24).
- [x] **The mark.** The butter dot became an aperture with one blade lit
      (`_components/mark.tsx`), plus `icon.svg` / `favicon.ico` / `apple-icon.png` /
      `manifest.webmanifest`. See `DESIGN.md` §6 for the tier rule and why favicons carry
      their own black ground.

Known gaps, deliberately not fixed here:

- **Input borders fail WCAG 1.4.11.** `hair-strong` is 1.93:1 on black and the `card`
  fill is 1.22:1 — both under the 3:1 non-text threshold, so a field's boundary is not
  reliably perceivable. This is system-wide (join gate, chat composer), not an auth bug.
  Passing needs a border around **`#595959`**, a gap in the palette between `hair-strong`
  (`#3D3D3D`) and `grey-dim` (`#8A8A8A`).
- `Upload Files` in `video-upload.tsx` is Title Case; every other action in the app is
  sentence case.

Worth knowing, because it will bite again: **`pnpm build` and `pnpm dev` share `.next/`.**
Running a build to check types while the dev server is up silently breaks the running
server — `main-app.js` starts 404ing, React never hydrates, and it presents as "the UI
stopped responding to clicks", which looks nothing like the cause. Kill the dev server,
`rm -rf .next`, restart.

### Phase 2 — Room UX (Tier 1) `[x]`
- [x] Catch-up snapshot on join (position + play state + last 50 messages)
- [x] Presence rail with named avatars
- [x] Synced reactions
- [x] Co-host grant (`POST /rooms/:code/role`)
- [x] **Chat persisted to Postgres, in batches.**

      The `Message` table existed and nothing wrote to it, so history died with the
      room — and with the ws-server process, which is worse, because a restart
      emptied a live room's scrollback.

      **The ws-server still does not talk to Postgres.** It has no Prisma client and
      should not grow one: the established direction here is worker → Redis list →
      API, with the API as the single writer of a table, exactly as `video-status`
      closed the transcode loop. Chat takes the same route on a third list,
      `chat-persist`, and the API is the only writer of `Message`.

      - **Batched, because chat is the one thing in this app that arrives in bursts.**
        The consumer blocks on `brPop` for the first line, lingers 500ms, then drains
        up to 200 more with `rPopCount` and writes them in one `createMany`. A quiet
        room costs one insert per line; an argument about the film costs one insert
        for the argument. The 500ms is invisible: readers are served by the socket
        and the ring buffer, so persistence lag is never on the read path.
      - `lPush` + `brPop`/`rPopCount` is FIFO — push at the head, pop from the tail —
        so a burst keeps the order it was said in. Worth stating because reaching for
        `lPopCount` instead reverses the batch and nothing else in the system would
        notice.
      - **Attribution is resolved server-side, per batch, not per message.** The wire
        payload carries a `memberId`; the API resolves the distinct ids in one
        `roomMember.findMany` and takes `roomId`, `userId` and the author label from
        the row. A message whose member does not exist, or whose member belongs to a
        different room than the code claims, is dropped — persistence is not a second
        identity system, and the ws-server's join frame is client-supplied.
      - `Message` gained a nullable `memberId` (`onDelete: SetNull`). Chat renders
        "You" by comparing `memberId`, so without it every one of your own lines came
        back from history under your name — visibly a different person from the live
        ones directly below. Nullable because history should outlive the membership.
      - Ids are the UUIDs the ws-server already minted for the wire, so the ring
        buffer and the table agree on identity: the client merges history under live
        chat by id and the seam is invisible. `createMany` uses `skipDuplicates`, so a
        redelivered batch cannot double-write.
      - The room now hydrates from `GET /rooms/:code/messages` on mount, held in state
        separate from the socket's. Merging them in a `useMemo` rather than writing
        history into the same array is what makes the fetch and the snapshot
        order-independent — otherwise whichever landed second won, and on a fast
        connection that was the snapshot, silently discarding everything older.
      - Tests: `backend/test/chat-batch.js` — 21 checks on parsing and row-building,
        no services needed — plus 5 end-to-end checks in `room-sync.js`.
- [x] **Queue, viewer suggestions, and auto-advance on `ended`.**

      `POST /rooms/:code/queue` takes a url or a videoId and the caller's role decides
      where it lands: host and co-hosts queue directly, everyone else lands in
      `SUGGESTED` and waits for approval. That is the "viewer asks, host approves"
      rule applied to content rather than to roles, and it is the reason the room
      survives its own link being forwarded — a stranger can ask, not hijack. Pending
      suggestions are capped at 5 per member so the tray can't be flooded, and a
      member may withdraw their own item but nobody else's.

      - The sidebar is now tabbed **Chat | Up next**, with the count on the tab. The
        panel carries now-playing, the queue, its own add field (labelled "Suggest"
        for a viewer) and, for controllers only, the suggestions tray. Chat lost its
        own header — the tab is the header now.
      - Auto-advance: the controller's player posts `/next` on `ended`; the server
        pops the head, and `deleteMany` is what claims it, so two controllers racing
        produce one advance rather than two. `afterVideoId` rejects an advance for a
        film the room has already left.
      - **Real titles and thumbnails with no API key.** YouTube's oEmbed endpoint
        gives the title (best-effort, 2.5s timeout, falls back to "YouTube video")
        and the thumbnail is `i.ytimg.com/vi/<id>/hqdefault.jpg`. Rows created before
        this refresh themselves the next time the same link is pasted, since dedupe
        on `sourceUrl` would otherwise keep a placeholder title forever.

      **The bug this shook out is the one worth remembering.** `ended` can fire while
      Plyr is being torn down — and the player is torn down every time the film
      changes. So one advance destroyed a player, that destruction emitted `ended`,
      which advanced again: a single video ending drained the entire queue in about a
      second. It took two guards. The event bus drops everything dispatched after
      teardown begins, and the `ended` handler additionally refuses to advance unless
      the player really is at the end (`duration > 0` and within 1.5s of it) — which
      also covers YouTube's `ended` getter reading `currentTime === duration` as true
      when both are still 0 at init.
- [x] **Drift correction via `playbackRate` nudge; hard seek only past 2s; drift readout.**

      The interesting part was not the nudge, it was discovering that the thing
      being compared against was wrong. Nothing in the pipeline carries a timestamp,
      so the `currentTime` a viewer receives is already stale by the whole round trip
      (host debounce → HTTP → Postgres → Redis → ws-server → socket, ~0.5–1s), and the
      host has moved on since. The old code compared the viewer's clock against that
      stale value and hard-seeked whenever it differed by >1s — which means it was
      seeking viewers *backwards* to a position the host had already left, and then
      doing it again a second later. Correcting toward a stale target is worse than
      not correcting.

      So the viewer now anchors on receipt (`{ hostTime, capturedAt }`) and projects
      the host forward while the host is playing, rather than trusting the raw sample.
      Everyone ends up equally behind the host by roughly one network hop, which is
      what actually matters — a watch party needs viewers in sync with *each other*.

      - Pure decision logic in `lib/playback-drift.ts`, applied by
        `hooks/use-playback-sync.ts` on a 250ms tick. Splitting it that way is what
        makes it testable without a DOM.
      - Deadband 0.25s → hold. Past that → `playbackRate` nudge, gain 0.15/s capped
        at ±8%. Past 2s → hard seek to the *projected* position.
      - Host paused → the projection stops advancing and small offsets are seeked
        instead of nudged, since rate does nothing to a paused element.
      - Correction is skipped while the element is seeking or below
        `HAVE_CURRENT_DATA`; measuring during a buffering stall reads a stale
        position and turns a hiccup into a spurious seek.
      - `frontend/test/playback-drift.js` — 24 checks. A 1s drift converges into the
        deadband in 11s, by nudging alone, without oscillating. First cut used a 5%
        cap and took 27.8s, which is too slow to be worth having.
      - **Seeks are rate-limited, and that took three attempts to get right.** Playing
        it against a real HLS stream exposed what unit tests had not: hls.js snaps a
        seek to a keyframe, so a correction lands slightly off target, the next 250ms
        tick measures it as still off, and seeks again — forever. On a second device
        that reads as flicker, and it only shows while the host is *paused*, because
        a playing host's projection moves past the residual on its own.
        The fix is a 1.2s cooldown plus a remembered "settled" residual: once a
        correction has landed, an offset that matches where it landed is left alone,
        but an offset that *differs* from it means the position genuinely moved and is
        corrected. Only offsets within `SNAP_TOLERANCE_SECONDS` (2s) may be accepted
        as a snap residual, so a viewer 90s out of position can never be mistaken for
        one. The two intermediate versions both had bugs — "correct once per anchor"
        stranded anyone knocked out of position, and recording the residual inside the
        seek branch meant an accurate landing never cleared the flag and swallowed the
        next genuine seek. Both are now regression checks.

      Fixed alongside, both prerequisites rather than extras:

      - **`play`/`pause` carried no position.** Only `timestamp` did, so every
        pause/resume injected up to a second of drift at exactly the moment people
        notice. The wire already allowed it (`currentTime` was optional on the
        schema); the player simply never sent it and the backend only persisted it
        for `timestamp`. Five new checks in `test/room-sync.js` cover it (21 total).
      - **`controls` was rebuilt on every render** in `use-video-player.ts`, and it
        sits in the dependency array of the sync effects — so the media listeners
        were torn down and reattached on every state change, and an interval driven
        off it could not stay alive. Memoised; it only reads refs.

      Now verified against a real HLS stream. There are still no transcoded videos in
      the dev database, so testing ran against a public test stream — which is now
      just a pasted link. Confirmed by demoting a member to VIEWER:
      jumps to 90s and 45s are both pulled back, and a settled viewer performs zero
      seeks over six seconds. Still unconfirmed: whether a ±8% nudge is imperceptible
      to a person, which needs two humans rather than two tabs.
- [x] **A viewer's player is read-only.** Authority was enforced server-side from
      Phase 1 — `requireController` rejects a viewer's POST — but the client never
      enforced it, so a viewer had a fully working Plyr: they could press play while
      the host was paused, scrub anywhere, change speed. They were not controlling the
      room, only desyncing themselves, and then fighting the drift corrector.

      Non-controllers now get the play button, large play button, speed menu,
      click-to-play and keyboard shortcuts removed, and a scrubber pinned with
      `pointer-events: none` (`.playback-locked` in `plyr.css`). They keep volume,
      quality and fullscreen, which are local concerns.

      Hiding controls is not enough on its own: media keys, Picture-in-Picture and
      extensions can all start playback without touching Plyr's UI. A `play` listener
      re-pauses a viewer the moment the host is paused, so the invariant holds however
      playback was started.

      Worth knowing: drift correction only runs after a viewer clicks the join
      overlay, because browsers require a gesture before audio can play. Before that
      click a viewer is unmanaged — which is why the first attempt to reproduce the
      seek bug appeared to do nothing at all.
- [x] **Hosting requires an account.** `POST /api/rooms` now 401s a guest, the landing
      CTA becomes "Sign in to host", and the room's empty state no longer offers a
      guest an upload it cannot perform. This closes the Phase 1.5 gap rather than
      working around it, and it restores §1's stated rule — signing in buys "your
      library, your history, **the ability to host**". Guests still join any room with
      nothing but the link, which is the part that matters.

      Consequence: `ws-server/test/room-sync.js` created its room as an anonymous
      guest and so had been failing since this landed. It now signs up a throwaway
      host first. Each run leaves one user row in the dev database.
- [x] **The room fills the screen.** It was capped at `max-w-stage: 1920px`, so on a
      wide display the player was width-bound with ~340px of dead margin either side
      and a band of unclaimed space beneath it. The stage width is now derived from
      the viewport *height* (`calc((100vh-172px)*16/9+336px)`) with the cap raised to
      2400px, the chat narrowed 360 → 320px, and the leftover height centred so it
      splits evenly above and below instead of pooling at the bottom. The room title
      sits directly under the header rather than inside the centred block, which is
      what gives the player room to breathe without pushing it down the page.
      Measured at 2000×1187: player 840×473 → 1616×909, height used 55% → 95%.
- [x] **Player chrome matches the design system.** `VideoPlayer.tsx` still carried its
      pre-rebuild inline styles — `--plyr-color-main: #9333ea` and a purple gradient —
      which overrode the butter theme `plyr.css` had already set. Phase 1.5 skipped
      this file deliberately, so nobody had seen it against an actual video. Removed,
      along with the `shadow-lg` and two `backdrop-blur`s that `DESIGN.md` bans. Plyr
      also sized itself to the video's intrinsic ratio and overflowed the 16:9 frame by
      15px, clipping the control bar on the rounded corners; it is now pinned to the
      frame with `object-fit: contain`, so an off-ratio film letterboxes instead of
      distorting the frame.

      The control bar keeps its gradient scrim. `DESIGN.md` §5 bans gradients on
      surfaces and a literal reading condemns this one, but a scrim over moving
      picture is a legibility device, not elevation. Left as an explicit exception so
      the next pass does not "fix" it again — as this one did.
- [x] **Co-host requests, and the People panel that answers them.**

      Asking for *content* was done; asking for *control* was not, and the grant
      endpoint had no UI at all — a host could only promote someone by hand-rolling
      a POST.

      **A request is a field on the membership, not a row of its own.** `RoomMember`
      gained `controlRequestedAt`; null means nothing pending. One person can want
      control or not want it, so a table would have needed the same per-member cap
      the queue needed for suggestions, plus dedupe on every ask. As a nullable
      timestamp the request is idempotent by construction, orders itself, and cannot
      be flooded — asking twice is the same state.

      - `POST /rooms/:code/control-request` to ask, `DELETE …/:memberId` to answer.
        The delete is the withdraw *and* the decline: you may clear your own, the
        host may clear anyone's. That mirrors the queue's "withdraw your own, not
        someone else's" rule, extended by one case.
      - **Approval is HOST-only, unlike queue approval, which any controller can do.**
        A bad suggestion costs the room a film; a co-host who can appoint co-hosts is
        a takeover path. `/role` already used `requireHost` and stays that way, and
        any role change clears the pending flag so an approved request cannot linger.
      - No new socket event: role changes already broadcast `room:roles-updated`, and
        the client already refetches on it. The tray updates for free.
      - The sidebar gained a third tab, **People** — the roster with the host's
        promote/demote per row, the pending-request tray above it, and "Ask to
        co-host" for anyone who is neither. The count on the tab is pending requests,
        matching how the queue tab counts suggestions.
      - The roster shown is the socket's (who is *here*, fresh on every join)
        enriched from the REST members (roles and pending requests). Filtering REST
        members by presence instead would have dropped anyone who joined since the
        last refetch, because a join does not bump the room revision.

      **The bug this shook out is worth recording.** `membership` is handed to the
      room once, at join, and never updated — so `membership.role` was stale the
      moment anyone's role changed. Promoting someone left them with the viewer UI
      *and a read-only player* until they reloaded, which had been invisible only
      because nothing could change a role without hand-writing a request. The live
      role now comes from the roster, and the promotion lands across the whole room
      at once: control chip, both paste-a-link surfaces, player authority.

      Guard messages were wrong here too: a co-host refused a role change was told
      "You do not control playback in this room", which they do. A host-only refusal
      now says so.
- [x] ~~**A demo film every room can reach.**~~ Resolved by paste-a-URL rather than by
      shipping a demo film: any room can now play a public link, so
      `NEXT_PUBLIC_DEMO_HLS_URL`, the reserved `hls-demo` id and the
      `frontend/.env.local` that carried them are all deleted.
- [x] **Paste-a-URL.** A host or co-host pastes a link and the room plays it —
      YouTube, a direct `.mp4`/`.webm`, or an external HLS `.m3u8`.

      **An external source is a `Video` row, not a second kind of thing.** That is
      what keeps it cheap: `Room.currentVideoId`, `QueueItem.videoId`, the snapshot
      and the sync loop all keep working untouched. `Video` gained
      `source (UPLOAD | FILE | HLS | YOUTUBE)` and a unique `sourceUrl`, and
      `channelId`/`creatorId` became nullable — a pasted link belongs to no library,
      and to no user at all when a guest co-host pastes it. `/library` reads through
      `Channel.videos`, so external rows stay out of it with no filter to remember.

      - Playback URLs are no longer derived on the client. `playbackUrlFor` resolves
        `UPLOAD` by the old CDN convention and everything else to its own url, and
        the room serializes a `currentVideo` alongside `currentVideoId`. The socket
        still carries only an id, so the room refetches when it reports one the
        client can't resolve — one request per film change.
      - `Room.currentVideoId` is now a real foreign key (`onDelete: SetNull`). The
        migration nulls orphan pointers before adding the constraint, because
        `hls-demo` was exactly such an orphan.
      - Validation lives in `backend/src/lib/videoSource.ts` and is a whitelist, not a
        blacklist: http(s) only, YouTube hosts canonicalised to
        `watch?v=<11-char id>`, otherwise an extension we can actually play. A
        `javascript:` or `data:` url would otherwise reach a `<video src>`.
        `backend/test/video-source.js` — 24 checks, no services needed.
      - `POST /rooms/:code/source` goes through `requireController` like every other
        control surface, and upserts on `sourceUrl` so the same link pasted twice is
        one row.

      **YouTube cost a player refactor, and the reason is worth recording.** A
      YouTube embed has no `HTMLVideoElement`, so every listener the sync loop hung
      off the media element had to move. `use-video-player.ts` now builds the media
      element imperatively (React never owns a node Plyr replaces), takes a
      `kind: hls | file | youtube`, and exposes a stable `controls.on()` event bus
      that survives the player being torn down and rebuilt. `VideoPlayer.tsx` reports
      play/pause/timeupdate through that bus instead of DOM listeners, so both
      providers take the same path.

      - **A ±8% rate nudge does nothing to YouTube.** Its API only accepts the rates
        in `getAvailablePlaybackRates()` and silently ignores anything else, so the
        drift corrector would have "nudged" forever while the viewer stayed out of
        sync. `resolveDrift` takes a `canNudge` flag; without it, correction is seek
        only, and the playing threshold tightens from 2s to 1.5s to compensate for
        losing the fine control in between. Verified against a real embed: after a
        host jump the viewer settles at a steady 0.6s behind and performs no further
        seeks.
      - `crossOrigin="anonymous"` is now set **only** for HLS. On a plain `<video>`
        it turns an ordinary third-party mp4 into a load failure, since most hosts
        send no `Access-Control-Allow-Origin` — and hls.js needs CORS regardless.
      - The viewer lock had a hole a YouTube embed walks straight through: hiding
        Plyr's controls leaves the iframe clickable, and a click there is a play
        inside YouTube's own player. `.playback-locked` now also kills
        `pointer-events` on the embed iframe.
      - A link that doesn't load used to leave a silent black frame. Media errors are
        relayed through the same bus and the frame now says so — the common cases are
        private videos, region locks and hotlink protection, none of which we can
        detect ahead of time.

      Not covered: Vimeo and other providers, and anything requiring an account or
      DRM (Netflix, Prime). YouTube's own title bar and "Watch on YouTube" button
      appear on a paused embed; that is their branding requirement, not a bug to fix.

- [x] **The host can remove someone.**

      `DELETE /rooms/:code/members/:memberId`, host only, and the host cannot
      remove themselves. **The membership row is kept and stamped `removedAt`
      rather than deleted** — `Message.memberId` points at it, and chat should not
      lose its attribution because someone was shown the door. Removal also clears
      any pending control request, demotes them, and deletes their pending
      suggestions, so nothing of theirs is left waiting for an answer.

      Removing has to reach the socket or it means nothing: a viewer whose row is
      marked but whose connection survives keeps receiving the whole broadcast. The
      API pushes a new `member` kind onto `video-Data` — the existing `room` kind
      has no field for *who* — and `RoomManager.evict` drops that member's sockets
      from the room, sends them `room:removed`, and re-broadcasts presence. The
      client turns that into a "you left this party" screen.

      **A removal is only as strong as the identity it is removing.** A guest is a
      cookie, so the ejected viewer can clear it — or open a private window — and
      rejoin as a new member. `resolveIdentity` mints a fresh `guestId` and there is
      nothing to match them against. Verified, not assumed: the same person rejoined
      seconds after being removed. This is a real gap, not a detail, and the UI is
      careful not to promise otherwise. Closing it needs an identity a guest cannot
      re-roll — a room-level invite token, or account-gated rooms — and belongs with
      the Phase 5 platform work rather than bolted on here.

### Phase 3 — Voice + video calls `[x]`

**The mesh plan in §6 is dead.** Calls run on managed **LiveKit Cloud** (an SFU), not
WebRTC mesh over our own signaling. `docs/CALLS-AND-MUSIC.md` is the spec and supersedes
§6 in full; where the two disagree, trust that document.

The trade that decided it: a mesh needs TURN to work across home networks, and TURN means
running coturn on a VPS and keeping it alive. LiveKit Cloud runs global STUN/TURN itself,
so cross-network calls work on day one with no box to operate. It also adds no fifth
service — the backend only mints tokens; media never touches our infrastructure.

- [x] **Backend mints scoped access tokens.** `LiveKitManager` singleton
      (`backend/src/lib/livekit.ts`) wrapping `AccessToken`, plus
      `POST /api/rooms/:code/call-token` under `resolveIdentity`.
      - Authorization is **membership, not control** — any viewer may join the call — so
        it resolves through `requireMember`, never `requireController`.
      - `identity = membership.id`. That is the same key the socket roster uses, which is
        what lets one roster merge presence and call state later.
      - A removed member (`removedAt` set) is refused, mirroring the ws-server eviction,
        so a booted guest cannot rejoin the call.
      - 503s cleanly when the LiveKit env vars are absent, so the app still runs without
        them.
- [x] **Frontend joins opt-in, headless.** `services/call.ts` + `room-call.tsx` built on
      `useTracks` / `useParticipants` / `RoomAudioRenderer`. The prebuilt
      `<VideoConference>` was deliberately avoided — it ships its own chrome and would
      fight the design system.
- [x] **Song on the main stage.** `AUDIO` added to `VideoSource`
      (`20260818175858_audio_source`), an audio-extension branch in `videoSource.ts`, and
      an `<audio>` branch in the player with a now-playing panel. A song is just a `Video`
      whose media is audio, so it reuses the source → sync → drift → queue path wholesale.
      Unlike YouTube an `<audio>` element **can** be rate-nudged, so it syncs better than
      the YouTube path. `test/video-source.js` grew 24 → 34 checks.
- [ ] Host moderation — `RoomServiceClient` for `mutePublishedTrack` / `removeParticipant`
- [ ] Screen share (`setScreenShareEnabled` — nearly free on LiveKit)
- [ ] Audio ducking while someone speaks
- [ ] Uploaded songs (the worker's ladder is a 240/480/720p *video* ladder; audio needs
      its own branch or an untranscoded passthrough)

**No schema change for calls.** LiveKit holds call membership and track state. And the
ws-server's single-instance limit is irrelevant here — call media never rides
`video-Data`. It still gates playback-sync scaling, exactly as before.

### Phase 3.5 — Faces as a first-class layer `[~]`

Calls shipped working but second-class: `<RoomCall>` is an island that mounts its own
LiveKit connection, owns its own tiles, and renders in exactly one place — a block above
the sidebar. Nothing else in the room knows it exists, so the room ends up with **three
separate answers to "who is here"** (the presence rail, the People tab, the call tiles) and
faces get whatever height the frame leaves over.

Spec: [`ROOM-LAYOUT.md`](./ROOM-LAYOUT.md). It supersedes the room-shell description in
`DESIGN.md` §7 and the UI half of `CALLS-AND-MUSIC.md`.

The shape of it: the call stops being a panel and becomes the room's **presence layer** —
one component at three sizes, merging the socket roster with LiveKit participants on
`memberId`. Layout follows room state with no mode toggle: nothing playing → the call *is*
the stage; playing → faces take a band beneath the frame; nobody on camera → the band
collapses to a rail and the frame takes the space back.

- [x] Spec written, with the sizing solved and checked against a live preview at
      `/layout-preview` (a throwaway route — delete it when the real layout lands)
- [x] Hoist the connection to a `CallProvider` above `RoomStage` — a single long-lived
      `Room` handed down through `RoomContext`, so the LiveKit hooks are always valid and
      return nothing when disconnected, rather than throwing wherever there is no
      connection. `RoomCall` renders identically; it just no longer owns the connection.
      Fixed alongside: a denied microphone used to tear down a connection that had
      already succeeded — connect and publish are now separate steps, so you land in the
      call able to listen.
- [ ] `faces.tsx` at three sizes; delete `presence-rail.tsx`
- [ ] Band + computed frame height in `room-stage.tsx`; call controls to the bottom strip
- [ ] Lobby grid replacing `EmptyStage`'s empty frame
- [ ] The doorway: "Join with mic" / "Just watch", and `room-view.tsx` admission change
- [ ] People-tab call badges

Three things the preview turned up that the spec now carries:

- **`stageWidth`'s `100vh-172px` was always wrong.** Real chrome is ~233px once the header,
  title row, up-next row and bottom strip are counted.
- **Sizing the sidebar off the frame is a trap.** It fills the dead side margins, but then
  the chat panel resizes every time somebody toggles a camera. The sidebar has to derive
  from the viewport alone.
- **Four cameras set the band ceiling.** Below four, tiles do not grow — so the band height
  is identical from one camera to four and there is no reflow as friends switch on one by
  one. Above four they shrink so everyone stays in one row.

Not started, and worth deciding before the band lands: **narrow viewports have no plan.**
Everything specced is the `lg:` layout.

### Phase 4 — Pipeline (Tier 2)
- [x] **Transcode loop closed.** The worker now reports completion on a third Redis list,
      `video-status`, and the API is the only writer of `Video.status`:

      ```
      worker ──LPUSH "video-status"──► backend consumer ──► Video row
              TRANSCODING → READY {durationMs, variants} | FAILED {failureReason}
      ```

      - `publishDataToServer()` implemented (was an empty stub). Emits TRANSCODING on
        pickup, READY with `durationMs` + `variants` on success, FAILED with the reason
        on any throw — so a row is never abandoned mid-flight.
      - `durationMs` comes from `ffprobe`, run *before* transcoding because the source
        file is unlinked at the end of it. Resolves `null` rather than throwing: a missing
        duration degrades the UI, it doesn't fail a good transcode.
      - The consumer (`backend/src/lib/transcodeStatus.ts`) runs on its **own** Redis
        client. `brPop` blocks its connection, so sharing `redisManager`'s client would
        stall every `lPush` the API makes, playback sync included.
      - Malformed JSON and updates for deleted rows are logged and skipped; the loop
        keeps running. Verified by pushing both through it.
      - `/library` shows Queued / Encoding / Failed / ready-with-duration, and polls
        `router.refresh()` every 4s **only while something is in flight**.

      Fixed alongside: `POST /videos/upload` enqueued the job *before* creating the row,
      so TRANSCODING could arrive before the row existed. And the worker's consume loop
      did not `await` its handler — jobs overlapped on a CPU-bound ffmpeg, and rejections
      surfaced as unhandled promises instead of a FAILED status.

      Not done here: `Video.video_urls` is still written as `[]` and playback URLs are
      still derived by convention (`<CDN>/transcoded/<videoId>/master.m3u8`). `variants`
      now describes the ladder, but nothing consumes it yet.
- [ ] ffmpeg `-progress` → Redis → live upload progress
- [ ] Auto thumbnail + ffprobe duration
- [ ] Sprite sheet + WebVTT scrub previews (Plyr `previewThumbnails`)
- [ ] Whisper transcript → subtitle track → chapters → "what did I miss?" summary
- [ ] Clip export
- [ ] Retry with backoff + dead-letter list
- [ ] Source-aware ladder (stop upscaling)

### Phase 5 — Platform (Tier 3)
- [ ] Scheduled parties + countdown lobby + `.ics`
- [ ] Retention/concurrency analytics from existing timestamp events
- [ ] Redis pub/sub + externalized room state → multi-instance ws-server
- [ ] Docker Compose (postgres, redis, all four services, localstack)
- [ ] Deploy end to end; demo GIF in README
- [ ] pino logging, `/health`, `/metrics`
- [ ] Convert `frontend/public/still.jpg` (1.6 MB) to WebP — it is the landing's LCP image
- [ ] Tests: `RoomManager` transitions, authorization guards, two-context Playwright sync test
- [ ] Rewrite README to match reality
