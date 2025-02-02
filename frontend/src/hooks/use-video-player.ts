"use client";

import { useEffect, useRef } from "react";
import Plyr from "plyr";
import Hls from "hls.js";

interface UseVideoPlayerProps {
  src: string;
  type?: string;
}

interface VideoPlayerControls {
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seek: (time: number) => void;
  isPlaying: () => boolean;
}

export function useVideoPlayer({ src, type }: UseVideoPlayerProps): {
  videoRef: React.RefObject<HTMLVideoElement>;
  controls: VideoPlayerControls;
} {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr>();
  const hlsRef = useRef<Hls | null>(null);
  const isReadyRef = useRef<boolean>(false);

  const isHLS =
    type === "application/vnd.apple.mpegurl" || src.includes(".m3u8");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    const initPlyr = (qualityOptions?: number[]) => {
      if (plyrRef.current) {
        plyrRef.current.destroy();
      }

      plyrRef.current = new Plyr(video, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "settings",
          "fullscreen",
        ],
        ...(isHLS && qualityOptions
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
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      });

      // Add ready event listener
      plyrRef.current.on("ready", () => {
        console.log("Plyr is ready");
        isReadyRef.current = true;
      });

      plyrRef.current.on("error", (error) => {
        console.error("Plyr error:", error);
      });
    };

    if (isHLS && Hls.isSupported()) {
      hls = new Hls({ debug: false });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const qualityOptions = data.levels
          .map((level) => level.height)
          .filter((h): h is number => h !== undefined);
        initPlyr(qualityOptions);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("Fatal HLS error:", data);
          hls?.destroy();
          hlsRef.current = null;
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
      if (type) video.setAttribute("type", type);
      initPlyr();
    }

    return () => {
      hls?.destroy();
      plyrRef.current?.destroy();
    };
  }, [src, type, isHLS]);

  const controls: VideoPlayerControls = {
    play: async () => {
      try {
        console.log("Attempting to play");
        if (!plyrRef.current || !isReadyRef.current) {
          console.log("Waiting for player to be ready...");
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
  };

  return { videoRef, controls };
}
