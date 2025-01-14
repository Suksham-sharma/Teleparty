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

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr>();
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initPlayer = () => {
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: true,
          startLevel: 1,
          xhrSetup: (xhr, url) => {
            console.log("Attempting to load:", url, xhr);
          },
        });

        hlsRef.current = hls;

        // Error handling for HLS
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.log(event);

          if (data.fatal) {
            console.error("Fatal HLS error:", data);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Network error occurred, attempting to recover...");
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Media error occurred, attempting to recover...");
                hls?.recoverMediaError();
                break;
              default:
                console.log("Unrecoverable error");
                hls?.destroy();
                break;
            }
          }
        });

        // Handle quality levels
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log(
            "HLS manifest parsed, qualities available:",
            data.levels,
            event
          );

          // Create quality options for Plyr
          // const qualities = data.levels.map((level, index) => ({
          // 	src: videoUrl,
          // 	size: level.height,
          // 	default: level.height === 480, // Make 480p default
          // }));

          // Initialize Plyr with quality options
          if (videoRef.current) {
            plyrRef.current = new Plyr(videoRef.current, {
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
              settings: ["quality", "speed"],
              quality: {
                default: 480,
                options: [360, 480, 720],
                forced: true,
                onChange: (quality: number) => {
                  // Find the index of the quality in levels
                  const levelIndex = data.levels.findIndex(
                    (level) => level.height === quality
                  );
                  if (levelIndex !== -1) {
                    hls.currentLevel = levelIndex;
                  }
                },
              },
            });
          }

          video.play().catch((error) => {
            console.error("Playback failed:", error);
          });
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        return hls;
      }
      return null;
    };

    const hls = initPlayer();

    // Cleanup
    return () => {
      if (hls) {
        hls.destroy();
      }
      if (plyrRef.current) {
        plyrRef.current.destroy();
      }
    };
  }, [src]);

  return (
    <div className={` ${className}`}>
      <div className="video-container">
        <video
          ref={videoRef}
          className="plyr-react plyr"
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
