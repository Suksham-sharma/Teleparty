"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Copy,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TINTS = ["f2e3c8", "cfe0e8", "f0d4d4", "d9e5cd", "e3d8ec", "f0e6c4"];

const CAST = [
  { name: "Ana", role: "HOST" },
  { name: "Jo", role: "VIEWER" },
  { name: "Sam", role: "COHOST" },
  { name: "Riya", role: "VIEWER" },
  { name: "Dev", role: "VIEWER" },
  { name: "Kabir", role: "VIEWER" },
];

const avatarFor = (seed: string, tint: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=${tint}&radius=0`;

const CHROME = 233;
const SIDEBAR = 340;
const SIDEBAR_MAX = 520;
const PAGE_PAD = 48;
const GAP = 16;
const TILE_GAP = 8;
const ROW = 4;
const ROW_MAX = 6;
const RAIL_H = 64;

function useStageHeight() {
  const [h, setH] = useState(728);
  useEffect(() => {
    const measure = () => setH(Math.max(320, window.innerHeight - CHROME));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return h;
}

function useStageWidth() {
  const [w, setW] = useState(1512);
  useEffect(() => {
    const measure = () => setW(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return w;
}

function sidebarFor(stageW: number) {
  return Math.round(
    Math.min(SIDEBAR_MAX, Math.max(SIDEBAR, (stageW - PAGE_PAD) * 0.28))
  );
}

function solveStage(
  stageH: number,
  stageW: number,
  cams: number,
  playing: boolean
) {
  const colW = stageW - PAGE_PAD - sidebarFor(stageW) - GAP;
  const fit = (budget: number) => {
    const h = Math.min(budget, (colW * 9) / 16);
    return { frameH: h, frameW: (h * 16) / 9 };
  };

  if (!playing) {
    const { frameH, frameW } = fit(stageH);
    return { mode: "lobby" as const, bandH: 0, frameH, frameW, tileW: 0, tileH: 0, colW };
  }

  if (cams === 0) {
    const { frameH, frameW } = fit(stageH - RAIL_H - 12);
    return { mode: "rail" as const, bandH: RAIL_H, frameH, frameW, tileW: 0, tileH: 0, colW };
  }

  const cols = Math.min(Math.max(cams, ROW), ROW_MAX);

  let bandH = 160;
  let frameH = 0;
  let frameW = 0;
  let tileW = 0;

  for (let i = 0; i < 4; i++) {
    ({ frameH, frameW } = fit(stageH - bandH - 12));
    tileW = (frameW - TILE_GAP * (cols - 1)) / cols;
    bandH = (tileW * 9) / 16 + 20;
  }

  return {
    mode: "band" as const,
    bandH,
    frameH,
    frameW,
    tileW,
    tileH: (tileW * 9) / 16,
    colW,
  };
}

function solveLobbyGrid(n: number, w: number, h: number) {
  const gap = 12;
  let best = { cols: 1, tileW: 0, tileH: 0 };

  for (let cols = 1; cols <= n; cols++) {
    const tileW = (w - gap * (cols - 1)) / cols;
    const tileH = (tileW * 9) / 16;
    const rows = Math.ceil(n / cols);
    if (rows * tileH + gap * (rows - 1) > h) continue;
    if (tileW > best.tileW) best = { cols, tileW, tileH };
  }

  if (best.tileW === 0) {
    const cols = Math.min(n, ROW);
    const tileW = (w - gap * (cols - 1)) / cols;
    return { cols, tileW, tileH: (tileW * 9) / 16 };
  }

  return best;
}

export default function LayoutPreview() {
  const [people, setPeople] = useState(3);
  const [cams, setCams] = useState(3);
  const [playing, setPlaying] = useState(true);
  const [speaking, setSpeaking] = useState(0);

  const stageH = useStageHeight();
  const stageW = useStageWidth();
  const camCount = Math.min(cams, people);
  const s = solveStage(stageH, stageW, camCount, playing);
  const sidebar = sidebarFor(stageW);

  useEffect(() => {
    const t = setInterval(
      () => setSpeaking((n) => (n + 1) % Math.max(people, 1)),
      2600
    );
    return () => clearInterval(t);
  }, [people]);

  const cast = CAST.slice(0, people);
  const onCam = cast.slice(0, camCount);
  const micOnly = cast.slice(camCount);

  return (
    <div className="min-h-screen bg-black">
      <Controls
        people={people}
        setPeople={setPeople}
        cams={cams}
        setCams={setCams}
        playing={playing}
        setPlaying={setPlaying}
        readout={s}
        camCount={camCount}
        sidebar={sidebar}
      />

      <main className="flex flex-col">
        <header className="shrink-0 border-b border-hair">
          <div className="mx-auto w-full max-w-stage px-6">
            <div
              className="mx-auto flex h-14 items-center justify-between gap-4"
              style={{ maxWidth: s.colW + GAP + sidebar }}
            >
              <span className="text-md font-semibold text-white">bulb</span>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="inline-flex h-9 items-center gap-2 rounded-full border border-butter-mute pl-3.5 pr-1.5">
                  <code className="text-sm font-medium tracking-[0.08em] text-butter">
                    WOLF-42
                  </code>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card-2">
                    <Copy className="h-3 w-3" />
                  </span>
                </span>
                <Button variant="outline" size="sm">
                  End party
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-stage flex-col px-6 pb-4 pt-3">
          <div
            className="mx-auto flex min-h-[28px] w-full items-center justify-between gap-4"
            style={{ maxWidth: s.colW + GAP + sidebar }}
          >
            <h1 className="truncate text-lg font-medium text-white">
              Friday night · Dune
            </h1>
            {playing && (
              <span className="flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-butter">
                <span className="h-1.5 w-1.5 animate-filament rounded-full bg-butter" />
                Live
              </span>
            )}
          </div>

          <div
            className="mx-auto flex w-full flex-col gap-4"
            style={{ maxWidth: s.colW + GAP + sidebar }}
          >
            <div className="flex gap-4">
              <div
                className="flex min-w-0 flex-col items-start gap-3"
                style={{ width: s.colW }}
              >
                {playing ? (
                  <div
                    className="frame relative"
                    style={{ height: s.frameH, width: s.frameW }}
                  >
                    <Image
                      src="/still.jpg"
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                      priority
                    />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute inset-x-5 bottom-5 flex items-center gap-3">
                      <span className="h-1 flex-1 rounded-full bg-white/20">
                        <span className="block h-1 w-1/3 rounded-full bg-butter" />
                      </span>
                      <span className="font-mono text-xs text-white">
                        41:12
                      </span>
                    </div>
                    <span className="absolute left-5 top-5 rounded-full bg-black/70 px-3 py-1 font-mono text-xs text-butter-mute">
                      frame {Math.round(s.frameW)} × {Math.round(s.frameH)}
                    </span>
                  </div>
                ) : (
                  <LobbyStage
                    height={s.frameH}
                    width={s.frameW}
                    cast={cast}
                    speaking={speaking}
                    camCount={camCount}
                  />
                )}

                {playing && s.mode === "band" && (
                  <Band
                    width={s.frameW}
                    onCam={onCam}
                    micOnly={micOnly}
                    tileW={s.tileW}
                    tileH={s.tileH}
                    height={s.bandH}
                    speaking={speaking}
                  />
                )}

                {playing && s.mode === "rail" && (
                  <Rail
                    cast={cast}
                    height={s.bandH}
                    width={s.frameW}
                    speaking={speaking}
                  />
                )}

                <div
                  className="flex min-h-[36px] items-center justify-between gap-3"
                  style={{ width: s.frameW }}
                >
                  <span className="truncate text-sm text-grey">
                    Next up: <span className="text-ash">Arrival</span>
                  </span>
                  <Button variant="outline" size="sm">
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
              </div>

              <aside
                className="flex shrink-0 flex-col overflow-hidden rounded-lg bg-card"
                style={{ width: sidebar, height: s.frameH + s.bandH + 12 }}
              >
                <div className="flex shrink-0 items-center gap-1 border-b border-hair p-2">
                  <span className="inline-flex h-8 items-center rounded-full bg-card-2 px-3.5 text-base text-white">
                    Chat
                  </span>
                  <span className="inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-base text-grey">
                    Up next <span className="font-mono text-xs text-butter">2</span>
                  </span>
                  <span className="inline-flex h-8 items-center rounded-full px-3.5 text-base text-grey">
                    People
                  </span>
                  <span className="ml-auto pr-2 text-sm text-grey">
                    {people} here
                  </span>
                </div>
                <FakeChat cast={cast} />
              </aside>
            </div>

            <div className="flex min-h-[40px] flex-wrap items-center justify-between gap-x-5 gap-y-2">
              <span className="rounded-full border border-butter-mute px-3.5 py-1 font-mono text-xs tracking-[0.06em] text-butter">
                you control playback
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 border-r border-hair pr-4">
                  <CircleBtn>
                    <Mic className="h-4 w-4" />
                  </CircleBtn>
                  <CircleBtn muted>
                    <VideoOff className="h-4 w-4" />
                  </CircleBtn>
                  <Button variant="outline" size="sm">
                    <PhoneOff className="h-4 w-4" />
                    Leave
                  </Button>
                </span>
                <span className="text-base text-grey">Library</span>
                <div className="flex gap-1.5">
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
          </div>
        </div>
      </main>
    </div>
  );
}

function Band({
  width,
  onCam,
  micOnly,
  tileW,
  tileH,
  height,
  speaking,
}: {
  onCam: { name: string; role: string }[];
  micOnly: { name: string; role: string }[];
  tileW: number;
  tileH: number;
  height: number;
  width: number;
  speaking: number;
}) {
  return (
    <div className="flex items-center gap-4" style={{ height, width }}>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto">
      {onCam.map((p, i) => (
        <div
          key={p.name}
          className={`relative shrink-0 overflow-hidden rounded-lg bg-card-2 ring-2 transition-colors ${
            speaking === i ? "ring-butter" : "ring-transparent"
          }`}
          style={{ width: tileW, height: tileH }}
        >
          <Image
            src={avatarFor(p.name, TINTS[i % TINTS.length])}
            alt={p.name}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5">
            <Mic className="h-3.5 w-3.5 shrink-0 text-grey" />
            <span className="truncate text-sm text-white">
              {p.name}
              {i === 0 ? " (you)" : ""}
            </span>
          </div>
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-butter-mute">
            {Math.round(tileW)}×{Math.round(tileH)}
          </span>
        </div>
      ))}

      {micOnly.length > 0 && (
        <div className="flex shrink-0 flex-col items-start gap-1.5 pl-1">
          <div className="flex">
            {micOnly.map((p, i) => (
              <span
                key={p.name}
                title={p.name}
                className={`-ml-2.5 inline-block h-9 w-9 overflow-hidden rounded-full border-2 bg-card-2 first:ml-0 ${
                  speaking === onCam.length + i
                    ? "border-butter"
                    : "border-black"
                }`}
              >
                <Image
                  src={avatarFor(p.name, TINTS[(onCam.length + i) % TINTS.length])}
                  alt={p.name}
                  width={36}
                  height={36}
                  unoptimized
                />
              </span>
            ))}
          </div>
          <span className="label-mute">mic only</span>
        </div>
      )}

      </div>
    </div>
  );
}

function Rail({
  cast,
  height,
  width,
  speaking,
}: {
  cast: { name: string; role: string }[];
  height: number;
  width: number;
  speaking: number;
}) {
  return (
    <div
      className="flex items-center gap-3.5 rounded-lg bg-card px-3.5"
      style={{ height, width }}
    >
      <div className="flex">
        {cast.map((p, i) => (
          <span
            key={p.name}
            className={`-ml-2.5 inline-block h-9 w-9 overflow-hidden rounded-full border-2 bg-card-2 first:ml-0 ${
              speaking === i ? "border-butter" : "border-black"
            }`}
          >
            <Image
              src={avatarFor(p.name, TINTS[i % TINTS.length])}
              alt={p.name}
              width={36}
              height={36}
              unoptimized
            />
          </span>
        ))}
      </div>
      <span className="text-base text-grey">
        {cast.length} here · {cast.length} on call
      </span>
    </div>
  );
}

function LobbyStage({
  height,
  width,
  cast,
  speaking,
  camCount,
}: {
  height: number;
  width: number;
  cast: { name: string; role: string }[];
  speaking: number;
  camCount: number;
}) {
  const grid = solveLobbyGrid(cast.length, width - 32, height - 32 - 60);

  return (
    <div
      className="frame flex flex-col bg-card p-4"
      style={{ height, width }}
    >
      <div className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-3">
        {cast.map((p, i) => (
          <div
            key={p.name}
            className={`relative shrink-0 overflow-hidden rounded-lg bg-card-2 ring-2 transition-colors ${
              speaking === i ? "ring-butter" : "ring-transparent"
            }`}
            style={{ width: grid.tileW, height: grid.tileH }}
          >
            {i < camCount ? (
              <Image
                src={avatarFor(p.name, TINTS[i % TINTS.length])}
                alt={p.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-black text-lg font-medium text-butter">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5">
              {i < camCount ? (
                <Mic className="h-3.5 w-3.5 shrink-0 text-grey" />
              ) : (
                <MicOff className="h-3.5 w-3.5 shrink-0 text-butter" />
              )}
              <span className="truncate text-sm text-white">{p.name}</span>
            </div>
            <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-butter-mute">
              {Math.round(grid.tileW)}×{Math.round(grid.tileH)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex h-11 shrink-0 items-center gap-2">
        <span className="flex h-11 flex-1 items-center rounded-full border border-hair bg-card-2 px-4 text-base text-grey-dim">
          Paste a video or song link
        </span>
        <Button size="sm">Play</Button>
      </div>
    </div>
  );
}

function FakeChat({ cast }: { cast: { name: string; role: string }[] }) {
  const lines = [
    { who: 0, text: "ok this scene is unreal" },
    { who: 1, text: "the sound design???" },
    { who: 2, text: "pausing for snacks, 2 min" },
    { who: 0, text: "hurry up" },
    { who: 1, text: "who queued Arrival, good pick" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 p-4">
      {lines.map((l, i) => {
        const p = cast[l.who % cast.length];
        return (
          <div key={i}>
            <p
              className={`text-sm font-semibold ${
                l.who === 0 ? "text-butter" : "text-grey"
              }`}
            >
              {p?.name ?? "Guest"}
            </p>
            <p className="text-base text-ash">{l.text}</p>
          </div>
        );
      })}
      <span className="mt-1 flex h-11 items-center rounded-full border border-hair bg-card-2 px-4 text-base text-grey-dim">
        Say something
      </span>
    </div>
  );
}

function CircleBtn({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border bg-card-2 ${
        muted ? "border-butter-mute text-butter" : "border-transparent text-white"
      }`}
    >
      {children}
    </span>
  );
}

function Controls({
  people,
  setPeople,
  cams,
  setCams,
  playing,
  setPlaying,
  readout,
  camCount,
  sidebar,
}: {
  people: number;
  setPeople: (n: number) => void;
  cams: number;
  setCams: (n: number) => void;
  playing: boolean;
  setPlaying: (b: boolean) => void;
  readout: ReturnType<typeof solveStage>;
  camCount: number;
  sidebar: number;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-x-5 gap-y-2 rounded-full border border-butter-mute bg-coal px-5 py-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="label-mute hover:text-butter"
      >
        {open ? "hide ×" : "preview"}
      </button>

      {!open && null}

      {open && (<>
      <Group label="people">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Pick key={n} on={people === n} onClick={() => setPeople(n)}>
            {n}
          </Pick>
        ))}
      </Group>

      <Group label="cameras on">
        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
          <Pick key={n} on={cams === n} onClick={() => setCams(n)}>
            {n}
          </Pick>
        ))}
      </Group>

      <Group label="state">
        <Pick on={!playing} onClick={() => setPlaying(false)}>
          lobby
        </Pick>
        <Pick on={playing} onClick={() => setPlaying(true)}>
          playing
        </Pick>
      </Group>

      <span className="font-mono text-xs text-grey">
        {readout.mode} · frame {Math.round(readout.frameW)}×
        {Math.round(readout.frameH)} · band {Math.round(readout.bandH)}
        {readout.tileW > 0 &&
          ` · tile ${Math.round(readout.tileW)}×${Math.round(readout.tileH)}`}
        {` · ${camCount} cam · sidebar ${sidebar}`}
      </span>
      </>)}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-xs text-grey-dim">{label}</span>
      <span className="flex gap-1">{children}</span>
    </span>
  );
}

function Pick({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2.5 font-mono text-xs transition-colors ${
        on ? "bg-butter text-black" : "bg-card-2 text-grey hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
