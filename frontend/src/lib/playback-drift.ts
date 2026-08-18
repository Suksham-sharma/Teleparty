export const DEADBAND_SECONDS = 0.25;
export const HARD_SEEK_SECONDS = 2;
export const RATE_GAIN_PER_SECOND = 0.15;
export const MAX_RATE_DELTA = 0.08;
export const SEEK_COOLDOWN_MS = 1200;
export const SNAP_TOLERANCE_SECONDS = 2;
export const SEEK_ONLY_THRESHOLD_SECONDS = 1.5;

export type Correction =
  | { kind: "seek"; to: number }
  | { kind: "rate"; value: number }
  | { kind: "hold" };

export interface DriftInput {
  localTime: number;
  hostTime: number;
  hostIsPlaying: boolean;
  secondsSinceAnchor: number;
  canNudge?: boolean;
}

export interface DriftResult {
  projectedHostTime: number;
  offset: number;
  correction: Correction;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function resolveDrift({
  localTime,
  hostTime,
  hostIsPlaying,
  secondsSinceAnchor,
  canNudge = true,
}: DriftInput): DriftResult {
  const projectedHostTime = hostIsPlaying
    ? hostTime + Math.max(0, secondsSinceAnchor)
    : hostTime;

  const offset = localTime - projectedHostTime;
  const magnitude = Math.abs(offset);

  const playingThreshold = canNudge
    ? HARD_SEEK_SECONDS
    : SEEK_ONLY_THRESHOLD_SECONDS;
  const seekThreshold = hostIsPlaying ? playingThreshold : DEADBAND_SECONDS;

  if (magnitude > seekThreshold) {
    return {
      projectedHostTime,
      offset,
      correction: { kind: "seek", to: projectedHostTime },
    };
  }

  if (canNudge && hostIsPlaying && magnitude > DEADBAND_SECONDS) {
    const delta = clamp(
      offset * RATE_GAIN_PER_SECOND,
      -MAX_RATE_DELTA,
      MAX_RATE_DELTA
    );
    return {
      projectedHostTime,
      offset,
      correction: { kind: "rate", value: 1 - delta },
    };
  }

  return { projectedHostTime, offset, correction: { kind: "hold" } };
}

export function isSnapResidual(offset: number): boolean {
  return Math.abs(offset) <= SNAP_TOLERANCE_SECONDS;
}

export function shouldApplySeek({
  hostIsPlaying,
  msSinceLastSeek,
  offset,
  settledOffset,
}: {
  hostIsPlaying: boolean;
  msSinceLastSeek: number;
  offset: number;
  settledOffset: number | null;
}): boolean {
  if (msSinceLastSeek < SEEK_COOLDOWN_MS) return false;
  if (hostIsPlaying) return true;
  if (settledOffset === null) return true;
  return Math.abs(offset - settledOffset) > DEADBAND_SECONDS;
}
