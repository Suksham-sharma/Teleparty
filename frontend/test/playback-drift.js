const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "drift-"));

execSync(
  `npx tsc ${path.join(root, "src/lib/playback-drift.ts")} ` +
    `--outDir ${outDir} --module commonjs --target es2020 --strict`,
  { cwd: root, stdio: "inherit" }
);

const {
  resolveDrift,
  shouldApplySeek,
  isSnapResidual,
  DEADBAND_SECONDS,
  HARD_SEEK_SECONDS,
  MAX_RATE_DELTA,
  SEEK_COOLDOWN_MS,
  SEEK_ONLY_THRESHOLD_SECONDS,
} = require(path.join(outDir, "playback-drift.js"));

const results = [];
const check = (label, ok, extra = "") => {
  results.push({ label, ok: !!ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`, extra);
};

const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) < tolerance;

const playing = (localTime, hostTime, secondsSinceAnchor = 0) =>
  resolveDrift({
    localTime,
    hostTime,
    hostIsPlaying: true,
    secondsSinceAnchor,
  });

console.log("");

const stale = playing(10.8, 10, 0.8);
check(
  "a viewer level with the host is not corrected while the sample ages",
  stale.correction.kind === "hold",
  `(offset ${stale.offset.toFixed(3)})`
);

const naive = playing(10.8, 10, 0);
check(
  "without projection the same viewer would look 0.8s ahead",
  near(naive.offset, 0.8) && naive.correction.kind === "rate"
);

const inSync = playing(30.1, 30);
check(
  "drift inside the deadband holds",
  inSync.correction.kind === "hold",
  `(${DEADBAND_SECONDS}s deadband)`
);

const ahead = playing(31, 30);
check(
  "a viewer ahead of the host is slowed",
  ahead.correction.kind === "rate" && ahead.correction.value < 1,
  `(rate ${ahead.correction.value})`
);

const behind = playing(29, 30);
check(
  "a viewer behind the host is sped up",
  behind.correction.kind === "rate" && behind.correction.value > 1,
  `(rate ${behind.correction.value})`
);

const clamped = playing(31.9, 30);
check(
  "the nudge never exceeds the rate cap",
  Math.abs(1 - clamped.correction.value) <= MAX_RATE_DELTA + 1e-9,
  `(rate ${clamped.correction.value})`
);

let oscillated = false;
let previousSign = 0;
let signFlips = 0;

const far = playing(45, 30);
check(
  "drift past the hard-seek threshold seeks instead of nudging",
  far.correction.kind === "seek" && near(far.correction.to, 30),
  `(${HARD_SEEK_SECONDS}s threshold)`
);

const boundary = playing(30 + HARD_SEEK_SECONDS, 30);
check(
  "exactly at the threshold still nudges, it does not seek",
  boundary.correction.kind === "rate"
);

const seekTarget = playing(100, 30, 5);
check(
  "a seek targets the projected host position, not the raw sample",
  seekTarget.correction.kind === "seek" && near(seekTarget.correction.to, 35)
);

const pausedDrift = resolveDrift({
  localTime: 30.4,
  hostTime: 30,
  hostIsPlaying: false,
  secondsSinceAnchor: 12,
});
check(
  "while the host is paused the projection does not advance",
  near(pausedDrift.projectedHostTime, 30)
);
check(
  "while the host is paused a small offset is seeked, not rate-nudged",
  pausedDrift.correction.kind === "seek" && near(pausedDrift.correction.to, 30)
);

const pausedTight = resolveDrift({
  localTime: 30.1,
  hostTime: 30,
  hostIsPlaying: false,
  secondsSinceAnchor: 12,
});
check(
  "a paused viewer inside the deadband is left alone",
  pausedTight.correction.kind === "hold"
);

const backwards = playing(30, 30, -1);
check(
  "a negative elapsed time cannot rewind the projection",
  near(backwards.projectedHostTime, 30)
);

let rate = 1;
let local = 31;
let host = 30;
let ticksToSettle = null;
for (let tick = 0; tick < 400; tick++) {
  const result = resolveDrift({
    localTime: local,
    hostTime: host,
    hostIsPlaying: true,
    secondsSinceAnchor: 0,
  });
  rate = result.correction.kind === "rate" ? result.correction.value : 1;
  if (result.correction.kind === "seek") {
    oscillated = true;
    local = result.correction.to;
  }
  local += 0.25 * rate;
  host += 0.25;

  const sign = Math.sign(local - host);
  if (previousSign !== 0 && sign !== 0 && sign !== previousSign) signFlips++;
  if (sign !== 0) previousSign = sign;

  if (ticksToSettle === null && Math.abs(local - host) <= DEADBAND_SECONDS) {
    ticksToSettle = tick + 1;
  }
}
check(
  "a 1s drift converges into the deadband and stays there",
  ticksToSettle !== null && Math.abs(local - host) <= DEADBAND_SECONDS,
  `(settled after ${((ticksToSettle ?? 0) * 0.25).toFixed(1)}s, resting at ${(local - host).toFixed(4)}s)`
);
check("it converges by nudging alone, never seeking", !oscillated);
check("it does not oscillate around the host", signFlips === 0, `(${signFlips} flips)`);

const KEYFRAME_SNAP = 0.4;

function runPausedViewer({ ticks, jumpAtTick, jumpTo, snap = KEYFRAME_SNAP }) {
  let seeks = 0;
  let localTime = 31;
  let msSinceLastSeek = SEEK_COOLDOWN_MS;
  let settledOffset = null;
  let awaitingSettle = false;

  for (let tick = 0; tick < ticks; tick++) {
    if (tick === jumpAtTick) localTime = jumpTo;

    const result = resolveDrift({
      localTime,
      hostTime: 30,
      hostIsPlaying: false,
      secondsSinceAnchor: tick * 0.25,
    });

    if (awaitingSettle && msSinceLastSeek >= SEEK_COOLDOWN_MS) {
      settledOffset = isSnapResidual(result.offset) ? result.offset : null;
      awaitingSettle = false;
    }

    if (
      result.correction.kind === "seek" &&
      shouldApplySeek({
        hostIsPlaying: false,
        msSinceLastSeek,
        offset: result.offset,
        settledOffset,
      })
    ) {
      seeks++;
      msSinceLastSeek = 0;
      awaitingSettle = true;
      settledOffset = null;
      localTime = result.correction.to - snap;
    }
    msSinceLastSeek += 250;
  }
  return { seeks, localTime };
}

const steady = runPausedViewer({ ticks: 60, jumpAtTick: -1 });
check(
  "a paused host is corrected once, even when the seek lands off-target",
  steady.seeks === 1,
  `(${steady.seeks} seeks; hls snapped ${KEYFRAME_SNAP}s short)`
);

const jumped = runPausedViewer({ ticks: 60, jumpAtTick: 30, jumpTo: 90 });
check(
  "a viewer who moves while the host is paused is still pulled back",
  jumped.seeks === 2 && Math.abs(jumped.localTime - 30) < 1,
  `(${jumped.seeks} seeks, ended at ${jumped.localTime.toFixed(2)}s)`
);

const landedClean = runPausedViewer({
  ticks: 60,
  jumpAtTick: 30,
  jumpTo: 90,
  snap: 0,
});
check(
  "an accurate correction does not swallow the next genuine seek",
  landedClean.seeks === 2 && Math.abs(landedClean.localTime - 30) < 0.01,
  `(${landedClean.seeks} seeks, ended at ${landedClean.localTime.toFixed(2)}s)`
);

check(
  "a large offset is never accepted as a keyframe-snap residual",
  !isSnapResidual(90) && isSnapResidual(0.4)
);

check(
  "without the guard that same case seeks on every tick",
  (() => {
    let n = 0;
    let t = 31;
    for (let i = 0; i < 40; i++) {
      const r = resolveDrift({
        localTime: t,
        hostTime: 30,
        hostIsPlaying: false,
        secondsSinceAnchor: i * 0.25,
      });
      if (r.correction.kind === "seek") {
        n++;
        t = r.correction.to - KEYFRAME_SNAP;
      }
    }
    return n > 30;
  })(),
  "(this is the flicker the guard prevents)"
);

check(
  "a playing host may seek again once the cooldown expires",
  shouldApplySeek({
    hostIsPlaying: true,
    msSinceLastSeek: SEEK_COOLDOWN_MS + 1,
    offset: 5,
    settledOffset: 0.4,
  })
);

check(
  "no seek may fire inside the cooldown window",
  !shouldApplySeek({
    hostIsPlaying: true,
    msSinceLastSeek: SEEK_COOLDOWN_MS - 1,
    offset: 5,
    settledOffset: null,
  })
);

check(
  "a residual matching where the last seek settled is not chased",
  !shouldApplySeek({
    hostIsPlaying: false,
    msSinceLastSeek: SEEK_COOLDOWN_MS * 10,
    offset: 0.4,
    settledOffset: 0.4,
  })
);

const seekOnly = (localTime, hostTime, hostIsPlaying = true) =>
  resolveDrift({
    localTime,
    hostTime,
    hostIsPlaying,
    secondsSinceAnchor: 0,
    canNudge: false,
  });

const ytSmall = seekOnly(30.9, 30);
check(
  "a source that cannot be nudged holds instead of changing rate",
  ytSmall.correction.kind === "hold",
  `(offset ${ytSmall.offset.toFixed(2)}s, under ${SEEK_ONLY_THRESHOLD_SECONDS}s)`
);

const ytNudgeable = playing(30.9, 30);
check(
  "the same offset is nudged when the source supports fine rates",
  ytNudgeable.correction.kind === "rate"
);

const ytSeek = seekOnly(32.1, 30);
check(
  "past its threshold a nudge-less source seeks to the projected position",
  ytSeek.correction.kind === "seek" && near(ytSeek.correction.to, 30)
);

const ytEarlierThanHtml5 = seekOnly(31.6, 30);
check(
  "a nudge-less source seeks earlier than the 2s hard-seek threshold",
  ytEarlierThanHtml5.correction.kind === "seek" &&
    playing(31.6, 30).correction.kind === "rate"
);

const ytPaused = seekOnly(30.5, 30, false);
check(
  "a paused nudge-less source still seeks small offsets",
  ytPaused.correction.kind === "seek" && near(ytPaused.correction.to, 30)
);

fs.rmSync(outDir, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? `\nall ${results.length} checks passed`
    : `\n${failed.length}/${results.length} failed`
);
process.exit(failed.length === 0 ? 0 : 1);
