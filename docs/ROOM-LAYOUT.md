# Room layout — faces as a first-class layer

How `/r/{code}` is laid out once video calls are part of the product rather than an
accessory. This supersedes the room-shell description in `DESIGN.md` §7 and the UI half
of `CALLS-AND-MUSIC.md` Feature B. Where it and either of those disagree about the room,
trust this.

Status: **spec, not built.**

---

## Why

Calls shipped as an island. `<RoomCall>` mounts its own `LiveKitRoom`, owns its own tiles
and controls, and renders in exactly one place — a block above the sidebar. Nothing else
in the room knows it exists. Four consequences:

1. **Three answers to "who is here."** `PresenceRail` in the bottom strip, the People tab,
   and the call tiles. The same set of humans, three representations, none aware of the
   others.
2. **The right column is a fight.** `LiveKitRoom` and the `<aside>` both carry `lg:flex-1`
   and both claim the leftover height of a 340px column. Four participants means a 2-across
   grid of ~160px tiles.
3. **The defaults say don't.** `video={false}`, camera opt-in, everything behind a button.
   Nothing signals that a call is already running, so nobody goes first.
4. **The moment calls matter most is a dead grey box.** `EmptyStage` — nothing playing,
   everyone deciding what to watch. That is the hangout, and it renders as an empty frame
   with a paste field while the call sits in a 44px strip.

The strip being small is a symptom, not the disease. `stageWidth` is
`calc((100vh-172px)*16/9+336px)` — the frame claims the entire vertical budget, so anything
beneath it is a remainder by construction.

---

## Decisions (locked)

| Question | Decision | Consequence |
| --- | --- | --- |
| Call's place in the room | **The room's presence layer**, not a panel | One roster component rendered at several sizes. Joining the call upgrades your own representation from avatar to live face; it is not entering a sub-app. |
| Layout model | **Adaptive by room state**, no mode toggle | Nothing playing → the call is the stage. Playing → faces take a band beneath the frame. No switch for anyone to miss. |
| Frame budget | **Generous, not maximal** — the four-person band is the ceiling | On a 1512 × 945 viewport the frame goes 1038 × 584 → 972 × 547 once anyone is on camera, and back up as more join. Still by far the largest thing on screen, so `DESIGN.md` Rule 1 holds. |
| Tile allocation | **By cameras, not by people** | Mic-only members collapse into a compact avatar cluster. Space spent on the band is spent on real faces. |
| Call on-ramp | **Asked at the doorway**, when meaningful | Guests always choose; signed-in visitors choose only when the room is not empty. |

---

## What does not change

The **playback sync loop is untouched**, exactly as `CALLS-AND-MUSIC.md` states. Media
rides LiveKit's own connection. `video-Data`, `RoomManager`, `resolveDrift` and
`requireController` remain unaware that calls exist.

The **sidebar keeps its three tabs** — Chat, Up next, People — at its current 340px. Chat
is not demoted; the band takes its height from the frame, not from the sidebar.

`identity = membership.id` in the minted token stays. It is the join key that makes a
single roster possible, and it already works.

---

## The three states

### Lobby — nothing playing

The call **is** the stage. A face grid fills the region the frame would occupy; the paste
box sits beneath it. This is the state the current design serves worst and the one where
a watch party is most obviously a hangout.

```
┌────────────────────────────┬────────┐
│     [ face ]  [ face ]     │ Chat   │
│         [ face ]           │        │
│                            │        │
│  ── paste a video or song ─│        │
└────────────────────────────┴────────┘
   centred on both axes; an odd last
   row centres rather than stranding
```

### Screening — at least one camera on

Frame generous, band beneath it. At 1512 × 945 with one to four cameras: band 153, frame
972 × 547, tiles 237 × 133. See the table under Sizing for other counts.

```
┌────────────────────────────┬────────┐
│          VIDEO             │ Chat   │
│         972 × 547          │        │
├────────────────────────────┤        │
│ ┌─────┐┌─────┐┌─────┐  ●●  │        │
│ │face ││face ││face │  +2  │        │
│ └─────┘└─────┘└─────┘ mic  │        │
└────────────────────────────┴────────┘
  🎙 📹 ☎  ·  Library  ·  😂 😮 ❤️ 🔥
```

### Screening — nobody on camera

The band collapses to a 64px rail: avatars, a count, and the call controls. This is
today's layout, arrived at correctly rather than by default, and it means a room where
everyone is audio-only pays nothing for empty boxes.

```
┌────────────────────────────┬────────┐
│          VIDEO             │ Chat   │
│        1038 × 584          │        │
├────────────────────────────┤        │
│ ●●●●●  5 here · 3 on call  │        │
│              🎙 📹 ☎       │        │
└────────────────────────────┴────────┘
```

---

## Sizing

Band height derives from tile size, not the other way round. Tiles are 16:9, and the band
is **one row, always** — nobody is hidden behind a scroll.

```
cams = participants publishing a camera track
cols = clamp(cams, 4, 6)
tileW = (frameWidth - 8 * (cols - 1)) / cols
tileH = tileW * 9 / 16
bandH = tileH + 20
```

The `clamp` is the whole rule. **Four people set the ceiling**: below four, tiles do not
grow to fill the row, so the band height is identical whether one person or four is on
camera — no reflow as friends turn their cameras on one by one. Above four, tiles shrink so
everyone stays visible, and the frame reclaims the difference. Past six they hold at the
six-across size and scroll, because faces that small stop being faces.

`tileW` and `frameW` are mutually dependent, so solve them by iterating from a seed — three
passes converge, and that is what the preview does.

Measured at a 1512 × 945 viewport:

| cameras | band | tile | frame |
| --- | --- | --- | --- |
| 0 | 64 (rail) | — | 1038 × 584 |
| 1–4 | 153 | 237 × 133 | 972 × 547 |
| 5 | 130 | 196 × 110 | 1038 × 584 |
| 6 | 114 | 167 × 94 | 1038 × 584 |

Past four cameras the frame is width-limited by the column rather than height-limited by the
band, so it stops growing at 1038 — the band shrinking simply buys back vertical slack.

So the only layout shift in the whole system is the one between nobody-on-camera and
somebody-on-camera: a 37px change in frame height, once.

### Width, and why the band was creating side margins

The room is sized from viewport **height**: the frame is 16:9 filling whatever height is
left, and the container is centred. On a 1512 × 945 viewport that produced `971 + 16 + 340
= 1327`, leaving **185px of dead margin** — 92px a side.

The band makes it worse, because the two budgets are coupled: every vertical pixel the band
takes costs the frame `16/9 ×` that in width. A 153px band throws away 272px of frame width,
and it reappears as side margin.

The fix is to stop deriving the container from the frame. **The sidebar is sized from the
viewport alone**, so it is stable no matter what the band is doing:

```
sidebar = clamp(340, (stageW - 48) * 0.28, 520)
colW    = stageW - 48 - sidebar - 16
frameH  = min(stageH - bandH - 12, colW * 9 / 16)
frameW  = frameH * 16 / 9
```

Sizing the sidebar off the *frame* instead is a trap worth naming: it fills the margins, but
the chat panel then resizes every time somebody toggles a camera, which is a far worse
reflow than the band's. The sidebar must not move.

The frame is **left-aligned** in its column, not centred, so its left edge stays put across
every state and stays aligned with the title above it. Leftover column width becomes a
gutter between frame and sidebar (16px when the frame fills the column, up to ~82px when it
is height-limited).

At 1512 × 945 this gives sidebar 410, colW 1038, and page margins of 24px a side in every
state — the design's own `px-6`, and no dead space.

`stageWidth`'s `(100vh-172px)*16/9+336px` goes away entirely. That `172` was always wrong:
the real chrome is **~233px** once the header, title row, up-next row, bottom strip and
paddings are counted.

**Call controls do not live in the band.** Tiles plus a mic/camera/leave cluster overrun the
frame width and clip the last tile. The cluster belongs in the existing bottom strip beside
the reactions — which is where `CALLS-AND-MUSIC.md` originally put it — leaving the band's
full width for faces.

Camera-off members render at the end of the band as 36px avatars matching
`presence-rail.tsx`, carrying the butter speaking ring. The speaking ring is the only
accent in the band; tiles are `card-2` on the `black` ground with no border until someone
speaks.

### The lobby grid

Nothing playing means no ceiling to respect, so the grid takes the stage and is **centred
on both axes**. Column count is solved rather than fixed: try every count from 1 to n, keep
the one with the largest tile that still fits the available height.

Centring is what makes an odd last row read as deliberate — three people land as two over
one, centred, instead of a 2-column grid stranding the third beside dead space.

---

## The doorway

`room-view.tsx` currently auto-admits a signed-in visitor (`if (user) { joinRoom; phase =
"in" }`), so the gate is a guest-only surface today. The choice is asked **only when it is
meaningful**:

- **Guest** — always. They need a name field regardless, so the two buttons cost nothing.
- **Signed in, room already has members** — a name-less gate: just the two buttons over the
  room's title and roster.
- **Signed in, room is empty** — skipped entirely. There is no call to join yet, and the
  band's own control is one tap away.

Copy is `Join with mic` / `Just watch`. Camera stays off either way; it is toggled inside.

Showing "2 on the call" at the doorway needs call presence, which lives in LiveKit rather
than Postgres. Either `LiveKitManager` grows the `RoomServiceClient` it was always meant to
hold, or v1 ships the gate without that line. **Deferred** — it is a nicety, not a blocker.

---

## Changes by file

1. **`frontend/src/app/r/[code]/room-call.tsx`** — dissolved. `LiveKitRoom` hoists to a
   provider mounted in `room-stage.tsx` (or `room-view.tsx`) so participants are readable
   from the band, the People tab and the doorway. The connection becomes room-scoped state,
   not a widget's private business.

2. **New `frontend/src/app/r/[code]/faces.tsx`** — the presence layer. One component, three
   size variants (`stage` / `band` / `rail`), merging the socket roster with LiveKit
   participants on `memberId`. Absorbs `presence-rail.tsx`, which is deleted.

3. **`frontend/src/app/r/[code]/room-stage.tsx`** — the state machine above. Derives
   `lobby | band | rail` from `videoId` and camera count, replaces the `stageWidth` calc
   with the viewport-derived sidebar + column budget, and moves the call controls into the band. The
   `RoomCall` block and the `PresenceRail` in the bottom strip both go.

4. **`frontend/src/app/r/[code]/join-gate.tsx`** — the two-button choice, plus a name-less
   variant.

5. **`frontend/src/app/r/[code]/room-view.tsx`** — stop auto-admitting a signed-in visitor
   unconditionally; route them to the gate when the room already has members. Carry the
   mic choice through to the stage.

6. **`frontend/src/app/r/[code]/room-people.tsx`** — badge who is on the call, now that the
   participant list is readable from the provider.

No backend change. No migration. The token route, the grant and `identity = membership.id`
are all already correct for this.

---

## Risks

- **The band resizing is a layout shift under people.** It is triggered by a deliberate
  human action — someone toggling a camera — so it is legible, but a ~130px height change
  exceeds `DESIGN.md`'s motion rule of ≤12px translate at ≤150ms. This needs a considered
  exception written into `DESIGN.md`, not a default transition dropped on it.
- **Rule 1 is the thing to keep watching.** Faces must not outrank the frame. The 26%
  budget and the `card-2` tiles are what hold that line; the speaking ring is the only
  accent allowed in the band.
- **Narrow viewports have no plan yet.** Everything above is the `lg:` layout. Below it the
  sidebar already stacks as a fixed 380px block, and the band has to fold into something —
  most likely the 64px rail always, with the grid reserved for the lobby.
- **Hoisting `LiveKitRoom` means the connection outlives the widget.** Leaving the call must
  tear down cleanly without unmounting the provider, and an `onDisconnected` that nulls the
  credentials is no longer sufficient on its own.
- **Past six cameras the band scrolls.** Acceptable for a friend-group product; if rooms
  get bigger, the band needs a speaker-ordered overflow rather than raw scroll.

---

## Order of work

1. Hoist the LiveKit connection to a provider; `room-call.tsx` keeps working unchanged
   against it. No visual change, and it is the prerequisite for everything else.
2. Build `faces.tsx` and delete `presence-rail.tsx`. Render it in the `rail` variant only,
   where the presence rail is today. Still no layout change.
3. Add the `band` variant and the computed frame height. This is the visible change.
4. Add the `lobby` variant, replacing `EmptyStage`'s empty frame.
5. The doorway, and the `room-view.tsx` admission change.
6. People-tab call badges.
