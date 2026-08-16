"use client";

import { useEffect, useRef, useState } from "react";
import {
  resolveDrift,
  shouldApplySeek,
  isSnapResidual,
  SEEK_COOLDOWN_MS,
} from "@/lib/playback-drift";

const TICK_MS = 250;
const READOUT_PRECISION = 10;

interface SyncControls {
  getCurrentTime: () => number;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  isPlaying: () => boolean;
  isMeasurable: () => boolean;
}

interface HostAnchor {
  hostTime: number;
  capturedAt: number;
  hostIsPlaying: boolean;
}

export function usePlaybackSync({
  enabled,
  hostTime,
  hostIsPlaying,
  controls,
}: {
  enabled: boolean;
  hostTime: number | null;
  hostIsPlaying: boolean;
  controls: SyncControls;
}): number | null {
  const anchorRef = useRef<HostAnchor | null>(null);
  const lastSeekAtRef = useRef(0);
  const settledOffsetRef = useRef<number | null>(null);
  const awaitingSettleRef = useRef(false);
  const [drift, setDrift] = useState<number | null>(null);

  useEffect(() => {
    if (hostTime === null) {
      anchorRef.current = null;
      return;
    }
    anchorRef.current = {
      hostTime,
      capturedAt: performance.now(),
      hostIsPlaying,
    };
    settledOffsetRef.current = null;
    awaitingSettleRef.current = false;
  }, [hostTime, hostIsPlaying]);

  useEffect(() => {
    if (!enabled) {
      controls.setPlaybackRate(1);
      setDrift(null);
      return;
    }

    const correct = () => {
      const anchor = anchorRef.current;
      if (!anchor || !controls.isMeasurable()) return;
      if (anchor.hostIsPlaying && !controls.isPlaying()) return;

      const { offset, correction } = resolveDrift({
        localTime: controls.getCurrentTime(),
        hostTime: anchor.hostTime,
        hostIsPlaying: anchor.hostIsPlaying,
        secondsSinceAnchor: (performance.now() - anchor.capturedAt) / 1000,
      });

      const rounded =
        Math.round(offset * READOUT_PRECISION) / READOUT_PRECISION;
      setDrift((previous) => (previous === rounded ? previous : rounded));

      const now = performance.now();
      const msSinceLastSeek = now - lastSeekAtRef.current;

      if (awaitingSettleRef.current && msSinceLastSeek >= SEEK_COOLDOWN_MS) {
        settledOffsetRef.current = isSnapResidual(offset) ? offset : null;
        awaitingSettleRef.current = false;
      }

      if (correction.kind === "seek") {
        const permitted = shouldApplySeek({
          hostIsPlaying: anchor.hostIsPlaying,
          msSinceLastSeek,
          offset,
          settledOffset: settledOffsetRef.current,
        });

        if (!permitted) return;

        lastSeekAtRef.current = now;
        awaitingSettleRef.current = true;
        settledOffsetRef.current = null;
        controls.setPlaybackRate(1);
        controls.seek(correction.to);
        return;
      }

      controls.setPlaybackRate(
        correction.kind === "rate" ? correction.value : 1
      );
    };

    const timer = setInterval(correct, TICK_MS);
    return () => {
      clearInterval(timer);
      controls.setPlaybackRate(1);
    };
  }, [enabled, controls]);

  return drift;
}
