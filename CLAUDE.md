# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A "watch party" platform. Anyone — signed in or not — starts a room in one click, shares `/r/{code}`, and everyone's playback stays in sync with the host's, alongside live chat and reactions. Uploaded films are transcoded to adaptive HLS and served from CloudFront.

The product was rebuilt around disposable rooms; `docs/REBUILD.md` is the spec and the roadmap, and it is the document to trust when this file and `Readme.md` disagree.

Four independent Node services, each with its own `package.json` — there is no workspace root. Install and run each separately.

## Commands

Run each service from its own directory. There is no test *runner*, CI, or Docker setup yet — the one test is a plain node script (below).

```bash
cd backend    && pnpm install && pnpm dev   # tsc + node dist  → :4000
cd ws-server  && pnpm install && pnpm dev   # tsc + node dist  → :8080
cd worker     && pnpm install && pnpm dev   # tsc -b + node dist (needs ffmpeg on PATH)
cd frontend   && pnpm install && pnpm dev   # next dev         → :3000
```

End-to-end sync check (needs all of the above running):

```bash
cd ws-server && node test/room-sync.js
```

When restarting a service, kill by port rather than by script path — `pkill -f dist/index.js`
matches several of these and a stale listener will silently keep serving old code while the
new process dies with EADDRINUSE:

```bash
lsof -ti:8080 | xargs kill -9
```

`dev` is **not** watch mode in backend/ws-server/worker — it is `build && start`. Re-run it after every change.

Prisma (from `backend/`):

```bash
npx prisma migrate dev --name <change>   # create + apply migration
npx prisma generate                      # regenerate client after schema edits
npx prisma studio                        # inspect data
```

Frontend lint: `cd frontend && pnpm lint`.

Requires locally: PostgreSQL, Redis, ffmpeg, and AWS credentials. Backend env (`backend/.env`): `DATABASE_URL`, `JWT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`; optional `PORT`, `CORS_ORIGIN`, `REDIS_URL`, `S3_BUCKET`, `AWS_REGION`, `CDN_HOST`. Frontend: optional `BACKEND_ORIGIN` (default `http://localhost:4000`), `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_CDN_HOST`.

## Architecture

```
frontend (Next 15 App Router)
   │  REST  ──────────────► backend :4000  ──► Postgres (Prisma)
   │                            │  LPUSH "video-transcode"  ──► worker ──► S3 ──► CloudFront
   │                            └─ LPUSH "video-Data" ───────► ws-server
   └─ WebSocket ────────────────────────────────────────────► ws-server :8080
```

### The sync loop (the core of the app)

This is the part that spans all four services — read it before touching playback:

1. Only a **HOST or COHOST** player emits events. `VideoPlayer` (`frontend/src/components/VideoPlayer.tsx`) attaches `play`/`pause`/`timeupdate` listeners only when it may control the room.
2. That browser POSTs to `/api/videos/interaction/:videoId` (or `/api/videos/current/:videoId` to switch the film). The backend **re-verifies authority server-side** via `requireController` in `backend/src/lib/rooms.ts` — that module is the single source of truth for who may drive a room. Any new control surface must go through it.
3. Backend persists the new position/play state on the `Room` row, then `LPUSH`es a tagged event onto the Redis list `video-Data`.
4. ws-server's `redisManager.listenForVideoUpdates()` sits in a `brPop("video-Data", 0)` loop and hands each event to `roomManager.handleQueueMessage`.
5. `RoomManager` (keyed by room **code**, e.g. `WOLF-42`) mutates in-memory fanout state and broadcasts `video:update` to every socket in the room.
6. Clients receive it in `useRoomSocket` (`frontend/src/hooks/use-room-socket.ts`), which lifts playback into state for `RoomStage`. Non-controllers seek only when drift exceeds 1 second.

On join the server replies with a **`room:snapshot`** — current video, position, play state, roster and recent chat — so a late arrival is immediately in sync instead of waiting for the host's next action.

Consequences worth knowing:
- **Room fanout state is in-process memory only** (`Map` in `RoomManager`) and the queue is a Redis *list*, not pub/sub, so `video-Data` is consumed by exactly one ws-server instance. Running more than one breaks sync for rooms split across instances. Horizontal scaling requires pub/sub plus room state in Redis (docs/REBUILD.md Phase 5).
- The durable record lives in Postgres; the in-memory room is rebuilt from the API snapshot when someone returns.
- Chat is still only an in-memory ring buffer of the last 50 messages. The `Message` table exists but nothing writes to it, so history dies with the room.
- The roster is de-duplicated by `memberId`: one person with two tabs is one participant.

### Upload / transcode pipeline

1. Client asks backend for a presigned S3 PUT (`POST /api/videos/presignedurl`), gets `{ url, resourceId }`, and uploads the file **directly to S3** — bytes never pass through the backend.
2. Client then POSTs metadata to `/api/videos/upload` with `videoId`/`thumbnailId` = the `resourceId`s. Backend creates the `Video` row and `LPUSH`es `{ key, requestId }` onto `video-transcode`.
3. Worker `brPop`s the job, downloads `Originalvideos/<key>.mp4` from S3, runs `transcodeVideoToHLS2` (ffmpeg → 240p/480p/720p HLS variants + hand-written `master.m3u8`), uploads each segment, and deletes local temp files.
4. Playback URLs are **derived by convention**, not stored: `https://<cf-domain>/transcoded/<videoId>/master.m3u8`. `Video.video_urls` is written as `[]` and never updated — the worker's `publishDataToServer()` is an empty stub, so nothing ever reports transcode completion back. There is no "processing/ready" status anywhere in the flow.

S3 layout (bucket and region from `S3_BUCKET`/`AWS_REGION`, defaulting to `easy-deploy` / `ap-south-1`):
`Originalvideos/<uuid>.mp4` · `Thumbnails/<uuid>.jpeg` · `transcoded/<videoId>/<res>/segment_*.ts` · `transcoded/<videoId>/master.m3u8`

### Identity — two kinds of caller

There are **users** and **guests**, and most of the app accepts either.

- `resolveIdentity` (`backend/src/middleware/identity.ts`) resolves the `Authentication` JWT if present, otherwise mints an httpOnly `guestId` cookie. It **never rejects** — a friend opening `/r/WOLF-42` must be able to participate without an account. It populates `req.identity`, a discriminated union of `{kind:"user"}` / `{kind:"guest"}`.
- `protectRoute` is the older, strict middleware and still guards `/api/channels`. Because `/api/videos` now runs under `resolveIdentity`, routes there that genuinely need an account (e.g. `presignedurl`) check `req.userId` explicitly.
- **The frontend calls the API through a Next rewrite (`/api/*` → backend), not cross-origin.** This is load-bearing: served from a different origin the `guestId` cookie is third-party, browsers drop it, and guests lose their identity on every request. Don't point the browser at `:4000` directly.

### Data model

`Room` is the unit of everything live — disposable, addressed by a human `code` (`WOLF-42`), shared as `/r/{code}`. `RoomMember` carries either a `userId` or a `guestId` plus a role (`HOST`/`COHOST`/`VIEWER`); playback authority is role-based. `QueueItem` and `Message` hang off the room.

`Channel` is now just a **library** — the container uploads belong to (`User 1—1 Channel`, `Channel 1—* Video`). It no longer has anything to do with rooms. `Video.status`/`durationMs`/`variants`/`spriteVttUrl`/`subtitleVttUrl`/`transcript` exist for the transcode feedback loop but nothing writes them yet; `view_count`, `duration`, `timeStamp` and `category` remain unused.

## Conventions

- Singleton managers: every cross-service resource (Redis, S3, rooms, socket map) is a class with a private constructor and `static getInstance()`, exported as a ready-made instance (`export const redisManager = RedisManager.getInstance()`). Follow that pattern rather than exporting loose functions.
- Frontend HTTP goes through `services/*.ts` (thin wrappers over the shared `lib/axios.ts` instance with `withCredentials: true`); components should not call axios directly. One exception: `video-upload.tsx` uses raw axios for the presigned S3 PUT, which must *not* carry credentials.
- WebSocket messages are `{ type, roomId, ... }` with `namespace:verb` types (`room:join`, `room:snapshot`, `room:presence`, `chat:message`, `reaction:send`, `video:update`). Validation lives in `ws-server/src/lib/helper.ts`, dispatch in `handlers.ts`. A bad frame returns an error and keeps the socket open — never close it, that ejects the viewer from the party.
- Config comes from `backend/src/lib/config.ts` and `frontend/src/lib/config.ts`. Nothing is hardcoded: ports, CORS origin, S3 bucket/region, CDN host, JWT secret, API/WS URLs.
- Request bodies are validated with zod schemas in `backend/src/schemas/index.ts`.
- UI is shadcn-style (`components.json`, Radix + CVA + `cn()` in `lib/utils.ts`) in `components/ui/`; route-local components live beside their route.
- **Design system is "Cinema Programme"** — see docs/REBUILD.md §2 for the rules and validated contrast ratios. Warm paper, ink hairlines, one vermilion accent. Flat: elevation comes from border weight and `paper → bone`, never shadow or backdrop-blur. `radius: 2px`. Body text is never vermilion (it fails AA); use `vermilion-deep`. Motion is opacity plus ≤4px translate, ≤150ms.

## Known rough edges

Useful context before making changes — these are current facts about the code, not a to-do list.

- **The transcode loop is still open.** `Video.status` never leaves `PENDING`: the worker's `publishDataToServer()` is an empty stub, so nothing reports completion. Playback URLs are derived by convention (`<CDN>/transcoded/<videoId>/master.m3u8`), and the UI cannot tell a ready film from one still encoding. This is Phase 4 and the highest-value remaining work.
- Chat is not persisted (see the sync-loop notes above).
- `GET /api/videos/feed` is implemented with pagination and a category filter, but nothing calls it — there is no browse surface any more.
- `POST /api/videos/upload` still requires the caller to have a `Channel`, created best-effort at signup. A user whose channel creation failed can sign in but not upload.
- Error handling is inconsistent in the older code: several handlers `console.log` and return `false`/`undefined` rather than throwing (e.g. `videosRouter.get("/feed")` has an empty catch). The rooms router is the pattern to follow.
- The worker's download path is relative to `process.cwd()` (`Originalvideos/<key>.mp4`) while the `mkdir` it performs targets a different, `__dirname`-relative directory — it works only because `worker/Originalvideos/` happens to exist locally.
- `worker/src/lib/transcode.ts` also exports an unused MP4-ladder transcoder (`transcodeVideoWithFFmpeg`) superseded by the HLS path.
- `Readme.md` still describes the pre-rebuild product and claims features that don't exist (pub/sub completion, dark mode, typing indicators, private channels, chat history, thumbnail generation, 1080p — the ladder tops out at 720p). `docs/REBUILD.md` is the accurate document.
