# Calls & Music — feature spec

Adds two things to a room: **live voice + video calls** between everyone present, and
**songs on the main stage** (the screen can play audio, not just film). This document is
the spec; when it and `CLAUDE.md` disagree about these features, trust this.

## Status (as built)

Both features are implemented. Static checks pass: backend `tsc`, frontend `tsc --noEmit`
+ `next lint`, and `backend/test/video-source.js` (now 34 checks). A real LiveKit token
mints and decodes correctly against the configured cloud project.

The `AUDIO` migration (`20260818175858_audio_source`, `ALTER TYPE "VideoSource" ADD VALUE
'AUDIO'`) has been **applied** to the local database and verified. Video/voice calls need
no migration — they work as soon as the backend runs with the LiveKit env vars set
(already in `backend/.env`).

Remaining: end-to-end call + audio playback in a browser has **not** been exercised live
(needs all four services + Redis running); that is the last manual test.

## Decisions (locked)

| Question | Decision | Consequence |
| --- | --- | --- |
| Call transport | **Managed LiveKit Cloud** (SFU) | No media server or TURN box to run. LiveKit Cloud runs global STUN/TURN relays, so a call between two people on different home networks connects — this is the whole reason to go managed. Adds no 5th service; the backend only mints tokens. |
| Music model | **Song on the main stage** | A song is just a `Video` whose media is audio. Reuses the existing source → sync → drift → queue path wholesale. No parallel audio track, no ducking. |
| Call reach | **Cross-network, day one** | Satisfied entirely by LiveKit Cloud's TURN. Nothing to build for it. |

## What does NOT change

The **playback sync loop is untouched.** Media (camera/mic) rides an entirely separate
plane — LiveKit's own SFU connection — not the host→backend→Redis→ws-server path. The
`video-Data` relay, `RoomManager`, `resolveDrift`, `requireController`: none of it is
aware calls exist. That separation is the point; do not route call media through the
ws-server.

The ws-server's single-instance limitation (in-memory `Map`, Redis *list* not pub/sub)
is **irrelevant to calls** — LiveKit tracks call presence itself. It still gates playback
sync horizontal scaling (REBUILD Phase 5), exactly as before.

---

## Feature A — Song on the main stage

The screen already plays a `Video` of source `UPLOAD | FILE | HLS | YOUTUBE` with full
sync, drift correction and a role-aware queue. A song is that same machinery pointed at
audio. A YouTube *music* link already plays today (it is just a `YOUTUBE` source). The
work is to accept **direct audio** and render an audio-appropriate player.

### Scope for v1

- **Accept**: direct audio links (`.mp3 .m4a .aac .ogg .opus .wav .flac`) and YouTube
  music links (already works). 
- **Defer**: uploaded songs. The worker transcodes to a 240/480/720p **video** HLS
  ladder — wrong for audio. Uploading a song would need an audio-only branch (or serve
  the original untouched). Out of scope until asked; pasted links cover the feature.
- **Not possible**: Spotify / Apple Music full-track playback. DRM + ToS forbid raw
  audio; their embed SDKs need per-user premium auth and don't do synchronized group
  playback. The paste box must say "video or song link", not "any Spotify track".

### Changes

1. **`backend/prisma/schema.prisma`** — add `AUDIO` to `enum VideoSource`. A new
   migration (`npx prisma migrate dev --name audio-source`). The client already switches
   on `Video.source`, so an explicit value is cleaner than sniffing an extension at play
   time.

2. **`backend/src/lib/videoSource.ts`** — the whitelist parser. Add an audio-extension
   branch that classifies a direct audio URL as `source: AUDIO` (same shape as `FILE`:
   unique `sourceUrl`, no `channelId`/`creatorId`). `POST /rooms/:code/source` is
   unchanged — it still upserts a `Video` row and the sync loop carries it. Extend
   `backend/test/video-source.js` (currently 24 checks) to cover the new extensions and
   rejects.

3. **`frontend/src/hooks/use-video-player.ts` + `VideoPlayer.tsx`** — add an `audio`
   branch to the imperative media-element builder (Plyr supports `<audio>` natively).
   Because there is no picture, render a **now-playing panel** in the video frame:
   title, elapsed/total, and a Bulb-native visual (butter filament pulse / simple bar
   meter — no album art needed). `resolveDrift` works identically on an `<audio>`
   element, and unlike YouTube an `<audio>` element **can** be rate-nudged, so pass
   `canNudge: true` — smoother sync than the YouTube path.

4. **`frontend/src/app/r/[code]/room-stage.tsx`** — extend `kindOf` and the
   `SourceKind` union with `"audio"`; update the paste/empty-stage copy to "Paste a
   video or song link".

Interplay with a live call: a song on the stage is the room's audio, exactly like a
film. When a voice call is also active both play at once (music + talking) — expected,
and LiveKit's echo cancellation keeps the song from feeding back through mics. No ducking
in v1.

### Effort

Small and self-contained. One migration, one lib function + its test, one player branch,
minor copy. No new infra, no new dependency.

---

## Feature B — Voice + video calls (LiveKit)

LiveKit is an SFU: each client publishes one upstream (mic, optionally camera) and the
server forwards tracks to everyone else. The backend's only job is to mint a scoped,
signed **access token**; the browser connects to LiveKit directly with it. The LiveKit
"room" is keyed by the watch-party **room `code`** — the same identifier used everywhere
else.

### Provisioning (you do this once, before any code)

1. Create a free project at LiveKit Cloud → get **`LIVEKIT_URL`** (`wss://<project>.livekit.cloud`),
   **`LIVEKIT_API_KEY`**, **`LIVEKIT_API_SECRET`**.
2. Put the three in `backend/.env`; put `LIVEKIT_URL` (the wss URL is public) in the
   frontend env too, as `NEXT_PUBLIC_LIVEKIT_URL`. The key/secret **never** leave the
   backend.

### Backend

- **Dependency**: `livekit-server-sdk`.
- **`backend/src/lib/config.ts`** — add `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
  `LIVEKIT_API_SECRET` via the existing `required()`/env pattern. Nothing hardcoded.
- **`backend/src/lib/livekit.ts`** — a `LiveKitManager` singleton
  (`private constructor` + `static getInstance()`, matching every other manager). It
  wraps `AccessToken` minting now, and later a `RoomServiceClient` for moderation.
- **New route `POST /api/rooms/:code/call-token`** in `routes/rooms.ts`, under
  `resolveIdentity`. Authorization is **membership, not control** — any viewer may join
  the call — so resolve the caller with the existing `findMembership(room.members,
  req.identity)`, *not* `requireController`. Mint an `AccessToken` with:
  - `identity = membership.id` (the `memberId`, stable across tabs)
  - `name = displayName`
  - grant `{ roomJoin: true, room: code, canPublish: true, canSubscribe: true }`
  - `metadata = JSON.stringify({ role })` so the client can badge the host without a
    second lookup.
  
  Return `{ token, url: LIVEKIT_URL }`. A removed member (`removedAt` set) must be
  refused — mirror the eviction check the ws-server does, so a booted guest can't rejoin
  the call.
- **No schema change.** LiveKit holds call membership and track state. (A future
  `callActive` hint on `Room` is optional polish, not needed.)

### Frontend

- **Dependencies**: `livekit-client`, `@livekit/components-react`.
- **Design-system caution**: do **not** drop in the prebuilt `<VideoConference>` — it
  ships its own chrome and will fight Bulb (`docs/DESIGN.md`: true black, one butter
  accent, no shadows/blur/gradients, 999px radius). Use the **headless hooks**
  (`useTracks`, `useParticipants`, `RoomAudioRenderer`) and build tiles + controls that
  match the system.
- **`frontend/src/services/call.ts`** — `getCallToken(code)` through the shared axios
  instance (per the `services/*` convention).
- **`frontend/src/hooks/use-room-call.ts`** — owns a `livekit-client` `Room`: fetch
  token, `room.connect(url, token)`, expose participants + their camera/mic tracks, local
  mic/camera enabled state, and `toggleMic` / `toggleCamera` / `join` / `leave`. Calls
  are **opt-in** — connect only when the user taps "Join call", so lurkers aren't forced
  on-mic.
- **UI**, Bulb-native:
  - A **participant tile row** — small camera tiles (or avatar + butter speaking-ring
    when camera is off) tucked beneath the video frame, so the film stays the light
    source. `RoomAudioRenderer` plays everyone's audio.
  - A **control cluster** in the existing bottom strip next to the reactions:
    Join call → then mic toggle, camera toggle, leave. Mirror the reaction-button
    styling (40px, `rounded-full`, `bg-card`).
- Echo/feedback: `livekit-client` enables echo cancellation + noise suppression on the
  mic track by default — keep them on so the film/song doesn't loop through mics.

### Roles & moderation

- v1: everyone self-controls their own mic/camera. Role only decorates the tile (host
  badge) and gates playback as today.
- Phase 3: host moderation via `RoomServiceClient` on the backend — `mutePublishedTrack`
  to silence someone, `removeParticipant` to eject them from the call (independent of the
  existing room-removal). This is why the token minting lives in a manager that can also
  hold the service client.

---

## Suggested order

1. **Feature A (song on stage)** — smallest, no infra, no new dep, ships value immediately.
2. **Provision LiveKit Cloud** — 10 minutes, unblocks everything below.
3. **Feature B backend** — config + `LiveKitManager` + `call-token` route (unit-testable
   without the frontend: hit the route, decode the JWT, assert the grant).
4. **Feature B frontend** — deps, `use-room-call`, tiles + controls, `RoomAudioRenderer`.
5. **Phase 3 (optional)** — host mute/remove, screen-share (LiveKit gives it for nearly
   free via `setScreenShareEnabled`), and film-audio ducking while someone speaks.

## Risks & caveats

- **LiveKit prebuilt UI vs Bulb** — the single biggest quality risk. Go headless.
- **Spotify/Apple Music** — impossible for group sync; set expectations in the paste box.
- **Free-tier limits** — LiveKit Cloud's free tier caps participants/bandwidth per month;
  fine for demos and real friend-group use, worth watching if it grows.
- **Two audio sources at once** (song on stage + voice call) is by design; echo
  cancellation is what keeps it from howling — don't disable it.
- **Uploaded songs** are deferred; only pasted audio/YouTube in v1.
