"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createRoom } from "@/services/room";
import { notifyVideoChange } from "@/services/video";
import { FileUploadDialog } from "@/app/_components/video-upload";
import { Button } from "@/components/ui/button";

type VideoStatus = "PENDING" | "TRANSCODING" | "READY" | "FAILED";

interface LibraryVideo {
  id: string;
  title: string;
  description: string;
  thumbnailId: string | null;
  status: VideoStatus;
  durationMs: number | null;
  failureReason: string | null;
}

/** Anything not READY cannot be played — the HLS manifest may not exist yet. */
const isPlayable = (video: LibraryVideo) => video.status === "READY";
const isWorking = (video: LibraryVideo) =>
  video.status === "PENDING" || video.status === "TRANSCODING";

const STATUS_LABEL: Record<VideoStatus, string | null> = {
  PENDING: "Queued",
  TRANSCODING: "Encoding",
  READY: null,
  FAILED: "Failed",
};

const formatDuration = (ms: number | null) => {
  if (!ms || ms < 0) return null;
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
};

export function LibraryGrid({
  videos,
  roomCode,
}: {
  videos: LibraryVideo[];
  roomCode: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * The worker reports completion through Redis to the API, which writes
   * `Video.status` — but nothing pushes that to this page, so poll while any
   * film is still in flight and stop as soon as they all settle. A socket for
   * this would mean joining a room just to watch an upload.
   */
  const pending = videos.filter(isWorking).length;
  useEffect(() => {
    if (pending === 0) return;
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [pending, router]);

  /**
   * Two entry points converge here: picking a film for a room you're already
   * in (`?room=CODE`), or starting a fresh party from the library.
   */
  const play = async (videoId: string) => {
    setBusyId(videoId);
    try {
      const code = roomCode ?? (await createRoom()).code;
      await notifyVideoChange(videoId, code);
      router.push(`/r/${code}`);
    } catch {
      toast.error("Could not start playback");
      setBusyId(null);
    }
  };

  if (videos.length === 0) {
    return (
      <div className="rounded-lg bg-card p-12 text-center">
        <p className="label-mute mb-4">Nothing here yet</p>
        <p className="mx-auto mb-7 max-w-[44ch] text-md text-grey">
          Upload a film and it&rsquo;ll be transcoded for adaptive streaming.
        </p>
        <FileUploadDialog />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => {
          const playable = isPlayable(video);
          const working = isWorking(video);
          const label = STATUS_LABEL[video.status];
          const duration = formatDuration(video.durationMs);

          return (
            <article
              key={video.id}
              className="group flex flex-col overflow-hidden rounded-lg bg-card"
            >
              {/* The thumbnail is the only saturated thing in the card. */}
              <div className="relative aspect-video bg-coal">
                {video.thumbnailId && (
                  <Image
                    src={video.thumbnailId}
                    alt={video.title}
                    fill
                    unoptimized
                    className={`object-cover ${
                      playable ? "" : "opacity-40 grayscale"
                    }`}
                  />
                )}

                {label && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-butter-mute bg-black/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-butter">
                    {working && (
                      <span className="h-1.5 w-1.5 animate-filament rounded-full bg-butter" />
                    )}
                    {label}
                  </span>
                )}

                {duration && playable && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs text-white">
                    {duration}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h2 className="text-md font-semibold leading-snug text-white">
                  {video.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 flex-1 text-base text-grey">
                  {video.description}
                </p>

                {video.status === "FAILED" && (
                  <p className="mt-2 line-clamp-2 text-base text-grey-dim">
                    {video.failureReason ?? "Transcode failed."}
                  </p>
                )}

                <Button
                  onClick={() => play(video.id)}
                  disabled={!playable || busyId !== null}
                  size="sm"
                  className="mt-4 w-full"
                >
                  {busyId === video.id && <Loader2 className="animate-spin" />}
                  {working
                    ? "Processing"
                    : video.status === "FAILED"
                      ? "Unavailable"
                      : roomCode
                        ? "Play in room"
                        : "Open a room with this"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8">
        <FileUploadDialog />
      </div>
    </>
  );
}
