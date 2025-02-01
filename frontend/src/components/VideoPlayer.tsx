"use client";

import React, { useEffect, useRef } from "react";
import Plyr from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";

interface VideoPlayerProps {
  src: string;
  type?: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, type, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr>();
  const hlsRef = useRef<Hls | null>(null);

  const isHLS =
    type === "application/vnd.apple.mpegurl" || src.includes(".m3u8");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    const initPlyr = (qualityOptions?: number[]) => {
      plyrRef.current?.destroy();
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

  return (
    <div className={className}>
      <div className="video-container">
        <video
          ref={videoRef}
          className="plyr-react plyr"
          crossOrigin="anonymous"
          style={
            {
              "--plyr-color-main": "#9333ea",
              "--plyr-range-fill-background": "#a855f7",
              "--plyr-video-controls-background":
                "linear-gradient(rgba(147, 51, 234, 0.5), rgba(0, 0, 0, 0.7))",
              "--plyr-menu-background": "#1f1f1f",
              "--plyr-menu-item-active-background": "#9333ea",
              "--plyr-menu-color": "#ffffff",
              "--plyr-menu-item-active-color": "#ffffff",
              "--plyr-menu-border-color": "rgba(255, 255, 255, 0.15)",
              "--plyr-menu-radius": "4px",
              "--plyr-menu-shadow": "0 1px 3px rgba(0, 0, 0, 0.3)",
              "--plyr-menu-arrow-color": "#1f1f1f",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
