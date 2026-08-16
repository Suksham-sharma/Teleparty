"use client";

import React from "react";
import { Play } from "lucide-react";
import { useVideoPlayer } from "@/hooks/use-video-player";
import { usePlaybackSync } from "@/hooks/use-playback-sync";
import "plyr/dist/plyr.css";
import { videoInteractionService } from "@/services/video-interaction";

const REPORT_INTERVAL_SECONDS = 1;
const REPORT_DEBOUNCE_MS = 500;

type VideoPlayerProps = {
  src: string;
  type?: string;
  isPlaying?: boolean;
  roomId: string;
  videoId: string;
  isChannelOwner?: boolean;
  currentTime?: number | null;
  onDrift?: (drift: number | null) => void;
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
  onDrift,
}) => {
  const { videoRef, controls } = useVideoPlayer({
    src,
    type,
    canControl: Boolean(isChannelOwner),
  });
  const [showOverlay, setShowOverlay] = React.useState(true);
  const reportTimeoutRef = React.useRef<NodeJS.Timeout>();
  const lastReportedTime = React.useRef<number>(0);

  const drift = usePlaybackSync({
    enabled: !isChannelOwner && !showOverlay,
    hostTime: currentTime ?? null,
    hostIsPlaying: Boolean(isPlaying),
    controls,
  });

  React.useEffect(() => {
    onDrift?.(drift);
  }, [drift, onDrift]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || isChannelOwner) return;

    const followHost = () => {
      if (!isPlaying && !video.paused) video.pause();
    };

    video.addEventListener("play", followHost);
    return () => video.removeEventListener("play", followHost);
  }, [videoRef, isChannelOwner, isPlaying]);

  React.useEffect(() => {
    if (!videoRef.current || !isChannelOwner) return;

    const report = (
      action: "play" | "pause" | "timestamp",
      at: number
    ) =>
      videoInteractionService.handleInteraction(videoId, {
        roomId,
        action,
        currentTime: at.toString(),
      });

    const handlePlay = () => report("play", controls.getCurrentTime());
    const handlePause = () => report("pause", controls.getCurrentTime());

    const handleTimeUpdate = () => {
      const at = videoRef.current?.currentTime ?? 0;
      if (Math.abs(at - lastReportedTime.current) <= REPORT_INTERVAL_SECONDS) {
        return;
      }
      lastReportedTime.current = at;

      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
      reportTimeoutRef.current = setTimeout(() => {
        report("timestamp", at);
        reportTimeoutRef.current = undefined;
      }, REPORT_DEBOUNCE_MS);
    };

    const video = videoRef.current;
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
    };
  }, [videoRef, controls, isChannelOwner, roomId, videoId]);

  React.useEffect(() => {
    if (!videoRef.current) return;

    if (isPlaying && !showOverlay) {
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
      <div
        className={`video-container frame-fill relative w-full overflow-clip${
          isChannelOwner ? "" : " playback-locked"
        }`}
      >
        <video ref={videoRef} className="plyr-react plyr" crossOrigin="anonymous" />

        {showOverlay && (
          <button
            onClick={handleOverlayClick}
            aria-label="Join the screening"
            className="group absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 transition-colors hover:bg-black/40"
          >
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-butter text-black transition-colors group-hover:bg-butter-deep">
              <Play className="h-8 w-8 translate-x-0.5 fill-current" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
