import Image from "next/image";

/**
 * A room, running. This is the landing page's argument — the product itself
 * rather than a description of it (docs/DESIGN.md §5, rule 6).
 *
 * Deliberately static and server-rendered: it never opens a socket, and none of
 * this is wired to real room state.
 */

const CAST = [
  { name: "Suksham", bg: "f2e3c8", host: true },
  { name: "Priya", bg: "cfe0e8" },
  { name: "Dev", bg: "f0d4d4" },
  { name: "Ana", bg: "d9e5cd" },
  { name: "Kabir", bg: "e3d8ec" },
  { name: "Mei", bg: "f0e6c4" },
];

const TRANSCRIPT = [
  { who: "Priya", body: "wait go back, what did the note actually say" },
  { who: "Suksham", body: "rewinding 20s, hold on", host: true },
  { who: "Dev", body: "lmaooo the way he just walked off" },
  { who: "Ana", body: "he is SO not going to open that door" },
  { who: "You", body: "he's opening the door", you: true },
  { who: "Kabir", body: "called it 💀" },
  { who: "Mei", body: "the score in this scene is unreal" },
];

export function avatarFor(seed: string, bg = "f2e3c8") {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=${bg}&radius=50`;
}

export function RoomPreview() {
  return (
    <div className="mx-auto grid max-w-shell gap-4 px-6 md:px-10 lg:grid-cols-[1fr_330px]">
      <div className="flex flex-col gap-3.5">
        <div className="frame relative aspect-video w-full">
          <Image
            src="/still.jpg"
            alt="A film playing in a watch party room"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 960px"
            className="object-cover"
          />

          {/* vignette keeps the controls legible over any frame */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(78% 82% at 62% 40%, transparent 34%, rgba(0,0,0,.7) 100%)",
            }}
          />

          <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/60 px-4 py-1.5 text-base text-white">
            In <b className="font-semibold text-butter">WOLF-42</b> · 6 watching
          </span>

          <div className="pointer-events-none absolute bottom-24 left-5 flex flex-col items-start gap-1.5">
            <Chip emoji="🔥" name="Mei" className="opacity-40" />
            <Chip emoji="😮" name="Dev" className="opacity-70" />
            <Chip emoji="❤️" name="Priya" />
          </div>

          {/* solid scrim, never a blur */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-5 pb-4 pt-11">
            <div className="relative mb-3.5 h-1 rounded-full bg-white/20">
              <div className="absolute inset-y-0 left-0 w-[41%] rounded-full bg-butter" />
              <div className="absolute left-[41%] top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-butter" />
            </div>
            <div className="flex items-center gap-4 font-mono text-xs text-white/80">
              <span>48:12 / 1:57:04</span>
              <span className="flex-1" />
              <span className="text-butter">● in sync</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex">
              {CAST.map((m) => (
                <span
                  key={m.name}
                  title={m.host ? `${m.name} · host` : m.name}
                  className={`-ml-2.5 inline-block h-9 w-9 overflow-hidden rounded-full border-2 first:ml-0 ${
                    m.host ? "border-butter" : "border-black"
                  }`}
                >
                  <Image
                    src={avatarFor(m.name, m.bg)}
                    alt={m.name}
                    width={36}
                    height={36}
                    unoptimized
                  />
                </span>
              ))}
            </div>
            <span className="text-base text-grey">6 watching</span>
          </div>

          <div className="hidden gap-1.5 sm:flex">
            {["😂", "😮", "❤️", "🔥"].map((e) => (
              <span
                key={e}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-lg"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden flex-col overflow-hidden rounded-lg bg-card lg:flex">
        <div className="flex items-center justify-between border-b border-hair px-4 py-3.5">
          <h3 className="text-md font-semibold text-white">Chat</h3>
          <span className="text-sm text-grey">6 here</span>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-3 px-4 py-4">
          <p className="text-sm text-grey-dim">
            <b className="font-medium text-grey">Ana</b> joined · caught up to
            46:58
          </p>
          {TRANSCRIPT.map((m, i) => (
            <div key={i}>
              <span
                className={`text-sm font-semibold ${
                  m.you || m.host ? "text-butter" : "text-grey"
                }`}
              >
                {m.who}
                {m.host && (
                  <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-butter-mute">
                    host
                  </span>
                )}
              </span>
              <p className="text-base text-ash">{m.body}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-hair p-3">
          <div className="rounded-full bg-card-2 px-5 py-2.5 text-base text-grey-dim">
            Message the room
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  emoji,
  name,
  className = "",
}: {
  emoji: string;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/70 py-1 pl-2.5 pr-3 text-sm text-white ${className}`}
    >
      <span className="text-base leading-none">{emoji}</span>
      {name}
    </span>
  );
}
