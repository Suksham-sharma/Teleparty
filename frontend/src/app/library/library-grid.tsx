"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createRoom } from "@/services/room";
import { notifyVideoChange } from "@/services/video";
import { FileUploadDialog } from "@/app/_components/video-upload";
import { Button } from "@/components/ui/button";

interface LibraryVideo {
  id: string;
  title: string;
  description: string;
  thumbnailId: string | null;
}

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
        {videos.map((video) => (
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
                  className="object-cover"
                />
              )}
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h2 className="text-md font-semibold leading-snug text-white">
                {video.title}
              </h2>
              <p className="mt-1.5 line-clamp-2 flex-1 text-base text-grey">
                {video.description}
              </p>

              <Button
                onClick={() => play(video.id)}
                disabled={busyId !== null}
                size="sm"
                className="mt-4 w-full"
              >
                {busyId === video.id && <Loader2 className="animate-spin" />}
                {roomCode ? "Play in room" : "Open a room with this"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8">
        <FileUploadDialog />
      </div>
    </>
  );
}
