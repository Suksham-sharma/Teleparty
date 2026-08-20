"use client";

import React from "react";
import { Play, AudioLines } from "lucide-react";
import { useVideoPlayer, type SourceKind } from "@/hooks/use-video-player";
import { usePlaybackSync } from "@/hooks/use-playback-sync";
import "plyr/dist/plyr.css";
import { videoInteractionService } from "@/services/video-interaction";

const REPORT_INTERVAL_SECONDS = 1;
const REPORT_DEBOUNCE_MS = 500;
const END_TOLERANCE_SECONDS = 1.5;

type VideoPlayerProps = {
  src: string;
  kind: SourceKind;
  title?: string;
  isPlaying?: boolean;
  roomId: string;
  videoId: string;
  isChannelOwner?: boolean;
  currentTime?: number | null;
  engaged?: boolean;
  onEngage?: () => void;
  onDrift?: (drift: number | null) => void;
  onEnded?: () => void;
} & React.HTMLAttributes<HTMLDivElement>;

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  kind,
  title,
  className,
  isPlaying,
  roomId,
  videoId,
  isChannelOwner,
  currentTime,
  engaged,
  onEngage,
  onDrift,
  onEnded,
}) => {
  const { containerRef, controls } = useVideoPlayer({
    src,
    kind,
    canControl: Boolean(isChannelOwner),
  });
  const [dismissed, setDismissed] = React.useState(false);
  const showOverlay = !engaged && !dismissed;
  const [failed, setFailed] = React.useState(false);
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
    setFailed(false);
    return controls.on("error", () => setFailed(true));
  }, [controls, src]);

  React.useEffect(() => {
    if (!isChannelOwner || !onEnded) return;

    return controls.on("ended", () => {
      const duration = controls.getDuration();
      if (duration > 0 && controls.getCurrentTime() >= duration - END_TOLERANCE_SECONDS) {
        onEnded();
      }
    });
  }, [controls, isChannelOwner, onEnded]);

  React.useEffect(() => {
    if (isChannelOwner) return;

    return controls.on("play", () => {
      if (!isPlaying && controls.isPlaying()) controls.pause();
    });
  }, [controls, isChannelOwner, isPlaying]);

  React.useEffect(() => {
    if (!isChannelOwner) return;

    const report = (action: "play" | "pause" | "timestamp", at: number) =>
      videoInteractionService.handleInteraction(videoId, {
        roomId,
        action,
        currentTime: at.toString(),
      });

    const offPlay = controls.on("play", () =>
      report("play", controls.getCurrentTime())
    );
    const offPause = controls.on("pause", () =>
      report("pause", controls.getCurrentTime())
    );
    const offTimeUpdate = controls.on("timeupdate", () => {
      const at = controls.getCurrentTime();
      if (Math.abs(at - lastReportedTime.current) <= REPORT_INTERVAL_SECONDS) {
        return;
      }
      lastReportedTime.current = at;

      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
      reportTimeoutRef.current = setTimeout(() => {
        report("timestamp", at);
        reportTimeoutRef.current = undefined;
      }, REPORT_DEBOUNCE_MS);
    });

    return () => {
      offPlay();
      offPause();
      offTimeUpdate();
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
    };
  }, [controls, isChannelOwner, roomId, videoId]);

  React.useEffect(() => {
    if (isPlaying && !showOverlay) {
      controls.play();
    } else {
      controls.pause();
    }
  }, [isPlaying, controls, showOverlay]);

  const handleOverlayClick = () => {
    setDismissed(true);
    onEngage?.();
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
        {kind === "audio" && !failed && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-coal px-6 text-center">
            <span className="animate-filament inline-flex h-16 w-16 items-center justify-center rounded-full bg-butter/10 text-butter">
              <AudioLines className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="label-mute mb-1.5">Now playing</p>
              <p className="line-clamp-2 text-lg font-medium text-white">
                {title ?? "Audio track"}
              </p>
            </div>
          </div>
        )}

        <div ref={containerRef} className="h-full w-full" />

        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 px-6 text-center">
            <div className="max-w-[42ch]">
              <p className="label-mute mb-3">Can&rsquo;t play this link</p>
              <p className="text-base text-grey">
                {isChannelOwner
                  ? "The file didn't load. It may be private, region-locked, or blocked from playing on other sites. Try another link."
                  : "The host's link didn't load here."}
              </p>
            </div>
          </div>
        )}

        {showOverlay && !failed && (
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
