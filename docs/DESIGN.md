# Design System — "Bulb"

The visual language for watchparty. This supersedes **Cinema Programme**
(`REBUILD.md` §2) in full; where the two disagree, this document wins.

Reference implementation: `docs/mockups/index.html` — open it in a browser. It is a
static, self-contained mockup of the landing page and a room mid-film, plus a swatch
and type sheet. It is the visual source of truth, not the app.

---

## 1. Why this replaced Cinema Programme

Cinema Programme was warm cream paper, ink hairlines, a vermilion accent and an
editorial serif. Three things were wrong with it:

- **It was a reading aesthetic on a video product.** A cream page around a video frame
  raises the surround's luminance, the viewer's iris stops down, and the film's shadow
  detail is crushed. The page was actively fighting the content.
- **The accent failed as text.** Vermilion `#D94F30` is 3.6:1 on paper, so it could
  never be body copy, which forced a second token (`vermilion-deep`) to exist purely to
  work around the first one.
- **There was no layout system.** Tokens were written, then components were improvised
  one at a time, so nothing shared a hierarchy.

The replacement is a single committed idea: **the page is a dark room and the video is
the only light source.** One accent — a butter yellow that reads as a bulb, a marquee,
a projector lamp — and it is bright enough to be used anywhere, including body text.

---

## 2. Palette

True black ground. Elevation is a step in lightness, never a shadow.

| Token | Hex | Role |
|---|---|---|
| `black` | `#000000` | page ground |
| `coal` | `#0D0D0D` | sunken wells, inset rails |
| `card` | `#1B1B1B` | chat, panels, inputs, raised surfaces |
| `card-2` | `#262626` | hover, focus fill, pressed |
| `hair` | `#2E2E2E` | dividers — **decorative only** |
| `hair-strong` | `#3D3D3D` | button outlines, interactive borders |
| `butter` | `#FEF297` | the accent: text, fills, live dot, host ring |
| `butter-deep` | `#E8D96F` | accent hover / pressed |
| `butter-mute` | `#8A8050` | accent labels, quiet metadata, code-chip border |
| `white` | `#FFFFFF` | headings |
| `ash` | `#EDEDED` | body text |
| `grey` | `#A3A3A3` | secondary text |
| `grey-dim` | `#8A8A8A` | metadata — **the floor; nothing dimmer carries meaning** |

### Measured contrast

Computed with the WCAG 2.1 relative-luminance formula, not estimated.

| Foreground | on `black` | on `card` | Verdict |
|---|---|---|---|
| `white` | 21.00:1 | 17.22:1 | AAA |
| `ash` | 17.94:1 | 14.71:1 | AAA |
| `grey` | 8.33:1 | 6.83:1 | AAA / AA |
| `grey-dim` | 6.08:1 | 4.99:1 | AA |
| `butter` | 18.36:1 | 15.06:1 | AAA |
| `butter-deep` | 14.59:1 | 11.96:1 | AAA |
| `butter-mute` | 5.28:1 | 4.33:1 | AA / large-and-UI only |

Black text on a `butter` fill is **18.36:1**.

**Every text token passes AA on both grounds.** That is the point of the palette: the
accent is usable as text, so live indicators, host names, links and button fills all
draw on one colour instead of needing a darker sibling.

`hair` at 1.55:1 is below the 3:1 non-text threshold. It is a visual grace note —
never the only thing distinguishing two regions, and never a focus indicator.

---

## 3. Type

| Role | Family | Weight | Size |
|---|---|---|---|
| Display | Outfit | 200, with 700 on the accent word | 40–66px, `-0.035em` |
| Heading | Outfit | 600 | 15–26px, `-0.015em` |
| Body | Outfit | 300–400 | 14.5–17.5px, 1.55 |
| Chat | Outfit | 400 body / 600 name | 14.5px / 13.5px |
| Mono | JetBrains Mono | 400–500 | room codes, timecodes, drift, counts |

**Outfit** is the geometric sans. It replaces Inter for UI and Instrument Serif for
display — there is no serif in this system.

The display signature is **light weight with the operative word set bold in butter**:

> Best nights in, with **friends.**

Scale: `12 · 13.5 · 14.5 · 16 · 20 · 26 · 40 · 66`. Nothing in between.

---

## 4. Shape, elevation, motion

**Radius.** `999px` on buttons, inputs and chips. `16px` on cards and panels. `20px` on
the video frame. `12px` only where a pill would be wrong. There is no `2px` any more —
Cinema Programme's hard-edged rule is gone.

**Elevation** is `black → coal → card → card-2`. No `box-shadow`, no `backdrop-blur`,
no glowing borders, no gradient fills on surfaces.

**Motion** is opacity plus ≤12px translate. Interactive feedback is ≤150ms. Two
exceptions, both deliberate:

- the **rotating headline word** (3.5s per word, crossfade with a 12px rise), and
- the **live dot**, a 2.4s opacity pulse — a filament, not a blink.

Both must be disabled under `prefers-reduced-motion: reduce`. This supersedes
`REBUILD.md` §2's ban on `flip-words`; the pattern is allowed, the old component is not.

---

## 5. Rules

1. **Nothing outranks the frame.** No element may be brighter or more saturated than
   the video. Panels sit at `card` and stay there.
2. **One accent.** Butter is the only hue in the system. Live, host, focus, primary
   action and links all use it. No red — the live dot is yellow, pulsing like a
   filament. Reaction emoji are the only other colour, and they are user content.
3. **Elevation by lightness only.** See above.
4. **`grey-dim` is the floor.** Anything carrying meaning stops there. `hair` and
   `butter-mute` are decorative or large-only.
5. **Focus is visible.** `butter` ring or border on every focusable control. Never
   remove the outline without replacing it.
6. **Show, don't list.** The landing hero is a real room running — frame, faces, chat,
   reactions. No numbered steps, no feature cards, no icon tiles.

---

## 6. Component patterns

**Button.** Primary is a `butter` fill with black text, pill, 600 weight. Secondary is
a `hair-strong` outline that fills to `card` on hover. Never two primaries in a view.

**Input.** `card` background, `hair` border, pill, `butter` border on focus with the
fill lifting to `card-2`.

**Room code chip.** `butter-mute` border, mono `butter` text at `0.1em`, with a copy
button that inverts to a `butter` fill on hover. The code is the invite; it gets the
accent.

**Avatar.** 36px circle, 2px `black` ring, `butter` ring when the member is HOST.
Overlap `-11px` in a stack. Images come from DiceBear `notionists` on a warm
background, which is what `presence-rail.tsx` already calls.

**Chat.** No bubbles. Name above message, 600 weight; `butter` for you and for the
host, `grey` for everyone else. Bottom-anchored so the newest message sits on the
input. System lines are `grey-dim`.

**Player controls.** A solid gradient scrim — not a blur. Scrub track is `butter` on
`rgba(255,255,255,.22)`.

**Reactions.** Small chips (emoji + name) over the frame, bottom-left, fading up. Not
bare floating emoji.

---

## 7. Routes

Four, and deliberately not five:

```
/            the pitch. Hero + a room running. Signed-out and signed-in alike.
/library     your films — and the signed-in home. Open a room lives here.
/r/{code}    the room.
/auth        sign in. Optional, and the copy says so.
```

**There is no `/home`.** Rooms are disposable and the link is the artifact, so a
"your rooms" screen would be empty or one row deep for most people. `/library`
absorbs the job: an **Open a room** button as its primary action, and an open-rooms
strip (`GET /api/rooms/mine`) that renders *nothing at all* when the list is empty
rather than showing a zero state.

### Doorways: the join gate and auth

Neither is a card on a slab. Both put the thing you are walking into first — the
room's code, title and who is already sitting there; or a plain statement that an
account is optional — with the input as one line across the bottom of that.

Behind both sits `Ambient` (`app/_components/ambient.tsx`): the still at 22%
opacity, blurred 3px and biased left, under a heavy radial that pulls the centre to
near-black. It is atmosphere, never a picture competing with the type, and it must
never lift the ground enough to put text under the contrast floor.

Auth defaults to **sign in**, not sign up. Returning users are the common case.

---

## 8. Token mapping

`globals.css` defines the raw palette on `:root` plus the shadcn semantic aliases
(`--background`, `--card`, `--primary`, `--ring`, …) so `components/ui/*` keeps working
without being rewritten. `tailwind.config.ts` exposes both layers.

Prefer the named tokens in new code:

```
bg-black  bg-coal  bg-card  bg-card-2
text-white  text-ash  text-grey  text-grey-dim
text-butter  bg-butter  border-butter-mute
border-hair  border-hair-strong
font-display  font-mono
```

The semantic aliases exist for the primitives. Do not reach for `bg-background` in
route code when `bg-black` says what you mean.
