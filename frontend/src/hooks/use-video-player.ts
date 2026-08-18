"use client";

import { useEffect, useMemo, useRef } from "react";
import Plyr from "plyr";
import Hls from "hls.js";

export type SourceKind = "hls" | "file" | "youtube";

export type PlayerEvent = "play" | "pause" | "timeupdate" | "ended" | "error";

const RELAYED_EVENTS: PlayerEvent[] = [
  "play",
  "pause",
  "timeupdate",
  "ended",
  "error",
];

interface UseVideoPlayerProps {
  src: string;
  kind: SourceKind;
  canControl?: boolean;
}

export interface VideoPlayerControls {
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seek: (time: number) => void;
  isPlaying: () => boolean;
  setPlaybackRate: (rate: number) => void;
  isMeasurable: () => boolean;
  canNudgeRate: () => boolean;
  on: (event: PlayerEvent, handler: () => void) => () => void;
}

export function useVideoPlayer({
  src,
  kind,
  canControl = true,
}: UseVideoPlayerProps): {
  containerRef: React.RefObject<HTMLDivElement>;
  controls: VideoPlayerControls;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const plyrRef = useRef<Plyr>();
  const hlsRef = useRef<Hls | null>(null);
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const kindRef = useRef<SourceKind>(kind);
  const isReadyRef = useRef(false);
  const isSeekingRef = useRef(false);
  const isTearingDownRef = useRef(false);
  const listenersRef = useRef(new Map<PlayerEvent, Set<() => void>>());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    kindRef.current = kind;
    isReadyRef.current = false;
    isSeekingRef.current = false;
    isTearingDownRef.current = false;

    const dispatch = (event: PlayerEvent) => {
      if (isTearingDownRef.current) return;
      listenersRef.current.get(event)?.forEach((handler) => handler());
    };

    const media = document.createElement(kind === "youtube" ? "div" : "video");

    if (kind === "youtube") {
      media.dataset.plyrProvider = "youtube";
      media.dataset.plyrEmbedId = src;
    } else {
      const video = media as HTMLVideoElement;
      video.className = "plyr-react plyr";
      video.playsInline = true;
      if (kind === "hls") video.crossOrigin = "anonymous";
      mediaRef.current = video;
    }

    container.appendChild(media);

    let hls: Hls | null = null;

    const initPlyr = (qualityOptions?: number[]) => {
      const player = new Plyr(media, {
        controls: canControl
          ? [
              "play-large",
              "play",
              "progress",
              "current-time",
              "mute",
              "volume",
              "settings",
              "fullscreen",
            ]
          : ["progress", "current-time", "mute", "volume", "settings", "fullscreen"],
        clickToPlay: canControl,
        keyboard: { focused: canControl, global: false },
        ...(qualityOptions
          ? {
              settings: ["quality", "speed"],
              quality: {
                default: qualityOptions[0],
                options: qualityOptions,
                forced: true,
                onChange: (quality: number) => {
                  const level = hlsRef.current?.levels.findIndex(
                    (l) => l.height === quality
                  );
                  if (level !== undefined && level !== -1 && hlsRef.current) {
                    hlsRef.current.currentLevel = level;
                  }
                },
              },
            }
          : {}),
        speed: canControl
          ? { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }
          : { selected: 1, options: [1] },
      });

      plyrRef.current = player;

      player.on("ready", () => {
        isReadyRef.current = true;
      });
      player.on("seeking", () => {
        isSeekingRef.current = true;
      });
      player.on("seeked", () => {
        isSeekingRef.current = false;
      });
      RELAYED_EVENTS.forEach((event) => player.on(event, () => dispatch(event)));
    };

    if (kind === "hls" && Hls.isSupported()) {
      hls = new Hls({ debug: false });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const qualityOptions = data.levels
          .map((level) => level.height)
          .filter((h): h is number => h !== undefined);
        initPlyr(qualityOptions.length > 0 ? qualityOptions : undefined);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("Fatal HLS error:", data);
          hls?.destroy();
          hlsRef.current = null;
          dispatch("error");
        }
      });

      hls.loadSource(src);
      hls.attachMedia(media as HTMLVideoElement);
    } else {
      if (kind !== "youtube") (media as HTMLVideoElement).src = src;
      initPlyr();
    }

    return () => {
      isTearingDownRef.current = true;
      hls?.destroy();
      hlsRef.current = null;
      try {
        plyrRef.current?.destroy();
      } catch (error) {
        console.error("Error destroying player:", error);
      }
      plyrRef.current = undefined;
      mediaRef.current = null;
      container.innerHTML = "";
    };
  }, [src, kind, canControl]);

  const controls: VideoPlayerControls = useMemo(
    () => ({
      play: async () => {
        try {
          if (!plyrRef.current || !isReadyRef.current) {
            setTimeout(() => {
              if (plyrRef.current && isReadyRef.current) {
                plyrRef.current.play();
              }
            }, 100);
            return;
          }
          await plyrRef.current.play();
        } catch (error) {
          console.error("Error playing video:", error);
        }
      },
      pause: () => plyrRef.current?.pause(),
      getCurrentTime: () => plyrRef.current?.currentTime || 0,
      getDuration: () => plyrRef.current?.duration || 0,
      seek: (time: number) => {
        if (plyrRef.current) {
          plyrRef.current.currentTime = time;
        }
      },
      isPlaying: () => !plyrRef.current?.paused,
      setPlaybackRate: (rate: number) => {
        if (kindRef.current === "youtube") {
          const player = plyrRef.current;
          if (player && player.speed !== rate) player.speed = rate;
          return;
        }
        const video = mediaRef.current;
        if (video && video.playbackRate !== rate) video.playbackRate = rate;
      },
      isMeasurable: () => {
        if (kindRef.current === "youtube") {
          const player = plyrRef.current;
          return Boolean(
            player &&
              isReadyRef.current &&
              !isSeekingRef.current &&
              player.duration > 0
          );
        }
        const video = mediaRef.current;
        return !!video && !video.seeking && video.readyState >= 2;
      },
      canNudgeRate: () => kindRef.current !== "youtube",
      on: (event: PlayerEvent, handler: () => void) => {
        const handlers = listenersRef.current.get(event) ?? new Set();
        handlers.add(handler);
        listenersRef.current.set(event, handlers);
        return () => {
          handlers.delete(handler);
        };
      },
    }),
    []
  );

  return { containerRef, controls };
}
