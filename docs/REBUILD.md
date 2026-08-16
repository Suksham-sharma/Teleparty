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
- **Guests need no account.** Name + a `guestId` cookie. Signing in only buys persistence
  (your library, your history, the ability to host).
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

Known gap, deliberately not fixed here:

- **A guest host has nothing to play.** `POST /videos/presignedurl` requires an account,
  so someone who opens a room without signing in cannot supply a film at all. The empty
  stage now says this plainly and offers the two real exits (sign in, or promote a
  signed-in member to co-host — `requireController` accepts COHOST). Closing it properly
  is a product decision; see Phase 2.

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

### Phase 2 — Room UX (Tier 1) `[~]`
- [x] Catch-up snapshot on join (position + play state + last 50 messages)
- [x] Presence rail with named avatars
- [x] Synced reactions
- [x] Co-host grant (`POST /rooms/:code/role`) — UI for it still to come
- [ ] **Persist chat to Postgres** — the `Message` table exists but the ws-server
      still keeps only an in-memory ring buffer, so history dies with the room
- [ ] Queue + auto-advance on `ended` (API and schema done; player wiring pending)
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
      - `frontend/test/playback-drift.js` — 16 checks. A 1s drift converges into the
        deadband in 11s, by nudging alone, without oscillating. First cut used a 5%
        cap and took 27.8s, which is too slow to be worth having.

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

      Not verified end to end: there are no transcoded videos in the dev database, so
      the correction has not been watched against a real HLS stream. The logic is
      covered by unit checks and the room shell was confirmed to render, but the
      feel of it — whether ±8% is imperceptible in practice — is unconfirmed.
- [ ] Co-host request flow (viewer asks, host approves) — also the current workaround for
      a guest host with no library, so it is worth more than its size
- [ ] **Give a guest host something to play.** Ranked by cost:
      1. a shared demo film every room can reach — smallest change, makes a guest room
         useful immediately;
      2. guest uploads scoped by `guestId` with a size and TTL cap — the current block is
         a deliberate anti-abuse guard, so this needs a rate limit, not just removing the
         `req.userId` check;
      3. paste-a-URL — the biggest, and the feature Teleparty and Watch2Gether compete on.

### Phase 3 — Video calls
- [ ] Signaling message types + relay in `handlers.ts`
- [ ] Mesh peer connections, join/leave lifecycle, 6-peer cap
- [ ] TURN deployment
- [ ] Filmstrip UI, mute/cam, push-to-talk, speaking indicator
- [ ] Audio ducking

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
