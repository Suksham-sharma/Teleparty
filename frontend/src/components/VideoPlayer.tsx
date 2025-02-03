"use client";

import React from "react";
import { useVideoPlayer } from "@/hooks/use-video-player";
import "plyr/dist/plyr.css";
import { videoInteractionService } from "@/services/video-interaction";

type VideoPlayerProps = {
  src: string;
  type?: string;
  isPlaying?: boolean;
  roomId: string;
  videoId: string;
  isChannelOwner?: boolean;
  currentTime?: number | null;
} & React.HTMLAttributes<HTMLDivElement>;

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  type,
  className,
  isPlaying,
  roomId,
  videoId,
  isChannelOwner,
  currentTime,
}) => {
  const { videoRef, controls } = useVideoPlayer({ src, type });
  const [showOverlay, setShowOverlay] = React.useState(true);
  const seekTimeoutRef = React.useRef<NodeJS.Timeout>();
  const lastSeekTime = React.useRef<number>(0);

  React.useEffect(() => {
    if (!videoRef.current || isChannelOwner) return;
    if (!currentTime) return;

    const currentPlayerTime = controls.getCurrentTime();
    if (Math.abs(currentPlayerTime - currentTime) > 1) {
      controls.seek(currentTime);
    }
  }, [currentTime, controls, videoRef, isChannelOwner]);

  React.useEffect(() => {
    if (!videoRef.current || !isChannelOwner) return;

    const handlePlay = () => {
      videoInteractionService.handleInteraction(videoId, {
        roomId,
        action: "play",
      });
    };

    const handlePause = () => {
      videoInteractionService.handleInteraction(videoId, {
        roomId,
        action: "pause",
      });
    };

    const handleTimeUpdate = () => {
      const currentTime = videoRef.current?.currentTime || 0;
      if (Math.abs(currentTime - lastSeekTime.current) > 1) {
        console.log("Seeking", currentTime);
        lastSeekTime.current = currentTime;

        // Clear any existing timeout
        console.log("the seekTImeoutRef is", seekTimeoutRef.current);
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
          console.log("Cleared existing timeout");
        }

        // Set new timeout
        console.log("Setting timeout");

        const timeoutId = setTimeout(() => {
          console.log("Inside timeout callback");
          try {
            videoInteractionService.handleInteraction(videoId, {
              roomId,
              action: "timestamp",
              currentTime: currentTime.toString(),
            });

            console.log("Actual Data Sent", {
              videoId,
              roomId,
              currentTime: currentTime.toString(),
            });
            seekTimeoutRef.current = undefined;
          } catch (error) {
            console.error("Error sending data:", error);
          }
        }, 500);

        seekTimeoutRef.current = timeoutId;
        console.log("sdfv", seekTimeoutRef.current);
      }
    };

    const video = videoRef.current;
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, [videoRef, controls, isChannelOwner, roomId, videoId, lastSeekTime]);

  React.useEffect(() => {
    if (!videoRef.current) return;

    if (isPlaying && !showOverlay) {
      console.log("Attempting to play video");
      controls.play();
    } else {
      controls.pause();
    }
  }, [isPlaying, controls, videoRef, showOverlay]);

  const handleOverlayClick = () => {
    setShowOverlay(false);
    if (isPlaying) {
      controls.play();
    }
  };

  return (
    <div className={className}>
      <div className="video-container relative rounded-xl overflow-clip shadow-lg">
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
        {showOverlay && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center cursor-pointer hover:bg-black/50 transition-all duration-300 ease-in-out"
            onClick={handleOverlayClick}
          >
            <div className="transform hover:scale-110 transition-transform duration-300 bg-white/20 p-6 rounded-full backdrop-blur-md shadow-xl hover:bg-white/30 group">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white/90 group-hover:text-white transition-colors duration-300"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
