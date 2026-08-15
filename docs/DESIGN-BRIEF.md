# Design brief — UI revamp

Paste the block below into a fresh session.

---

I want to redesign the UI of this watch-party app. **Do not write any application code until I've
approved a visual direction.** The process is: research → static HTML mockups → I pick → then implement.

## The product

A watch party platform. Anyone — signed in or not — starts a room in one click, shares `/r/{code}`,
and everyone's video playback stays in sync with the host's, alongside live chat, reactions and a
live member list. Uploaded films are transcoded to adaptive HLS and served from CloudFront. Video
calls between viewers are planned next.

Read `CLAUDE.md` and `docs/REBUILD.md` first — REBUILD.md is the spec and roadmap, and is accurate.
`Readme.md` is stale, ignore it.

## What already works (do not break or redesign)

Phase 1 shipped and is verified: disposable rooms with human codes, guest participation with no
signup, HOST/COHOST/VIEWER roles with server-side playback authority, a catch-up snapshot on join,
live chat and presence. The backend, the WebSocket protocol, `use-room-socket.ts`, `VideoPlayer.tsx`
sync logic and the API layer are all sound. `cd ws-server && node test/room-sync.js` runs 16 checks.

**Only the visual layer is being redone**: design tokens, layout, and roughly six components.

## Why we're redoing it

The current theme is "Cinema Programme" — warm cream paper, ink text, vermilion accent, editorial
serif. It's wrong for this product. It's a *reading* aesthetic on a *video* product: a cream page
around a video frame fights the content instead of framing it. It was also built without any design
planning — tokens were written and components improvised one at a time, so there is no layout
system or hierarchy.

The landing page is the worst of it: it's a bare form plus three numbered paragraphs. It describes
the product in text instead of showing it.

## Constraints

- **Dark, but absolutely not a generic SaaS/dashboard dark.** No slate-900 + indigo. No
  glassmorphism, no backdrop-blur cards, no gradient-filled headings, no glowing borders, no
  floating emoji, no animated grid backgrounds. If it looks like a shadcn landing template or a
  Vercel clone, it's wrong.
- **Video-forward.** Dark surround exists for a functional reason: contrast and immersion. The video
  should be the brightest, most saturated thing on screen and everything else should recede.
- **The landing page must show the product** — a room with video playing, faces, chat moving — not
  describe it. Look at how real products present themselves.
- Accessibility is not optional: check contrast ratios and state them. Body text must pass AA.
- It should feel like something a person designed with a point of view, not something assembled
  from a component library.

## What I want you to do

1. **Research.** Look at how video, watch-party, and cinema-adjacent products actually present
   themselves — the streaming players, the social-viewing apps, the film-culture sites. Work out
   what makes the good ones feel good, and what specifically makes the bad ones feel generic.
   Tell me what you found before you design anything.

2. **Build static HTML mockups.** One self-contained HTML file, no build step, no app changes.
   Show **two screens** per direction:
   - the **landing page**
   - a **room mid-film** — video playing, member avatars, chat with real-looking messages,
     reactions, the room code, the host's controls

   Give me **two or three genuinely different directions** — different in structure and mood, not
   the same layout in three palettes. Include a small swatch/type spec for each.

3. **Show me screenshots** and let me react. Iterate on the mockup, not on the app.

4. **Only once I've approved a direction**, implement it: replace the tokens in
   `frontend/src/app/globals.css` and `frontend/tailwind.config.ts`, then restyle
   `app/page.tsx`, `app/_components/start-party.tsx`, `app/r/[code]/*` (room-stage, room-chat,
   presence-rail, join-gate), `app/library/*`, `app/auth/*` and `components/ui/*`.

## Running it locally

```bash
docker start collabyt-postgres          # postgres on :5434
cd backend   && pnpm dev                # :4000
cd ws-server && pnpm dev                # :8080
cd frontend  && pnpm dev                # :3000
```

`backend/.env` needs `DATABASE_URL="postgresql://collabyt:collabyt@localhost:5434/collabyt"` and a
`JWT_SECRET`. Redis must be on :6379.

Gotchas that cost me time already:
- `pnpm dev` in backend/ws-server/worker is `build && start`, not watch mode — rerun after changes.
- Never run `pnpm build` in `frontend/` while `pnpm dev` is running; it clobbers `.next` and the
  dev server starts serving unstyled pages.
- Kill services by port (`lsof -ti:8080 | xargs kill -9`), not by script path — `pkill -f
  dist/index.js` matches several services and leaves a stale listener serving old code.
