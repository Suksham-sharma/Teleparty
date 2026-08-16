"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { playlistUrl } from "@/lib/config";
import { endRoom, getRoom } from "@/services/room";
import { useRoomSocket } from "@/hooks/use-room-socket";
import { DEADBAND_SECONDS } from "@/lib/playback-drift";
import { useAuthStore } from "@/store/authStore";
import type { Membership, Room } from "@/services/types";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/app/_components/site-header";
import { RoomChat } from "./room-chat";
import { PresenceRail } from "./presence-rail";

// Plyr reaches for `document` at import time, so it can never be evaluated
// during SSR.
const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
  ssr: false,
  loading: () => <div className="frame aspect-video w-full bg-card" />,
});

export function RoomStage({
  code,
  room,
  membership,
  displayName,
  onRoomChange,
}: {
  code: string;
  room: Room;
  membership: Membership;
  displayName: string;
  onRoomChange: (room: Room) => void;
}) {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [drift, setDrift] = useState<number | null>(null);
  const canControl = membership.role === "HOST" || membership.role === "COHOST";

  const {
    status,
    playback,
    members,
    messages,
    reactions,
    sendChat,
    sendReaction,
  } = useRoomSocket(code, membership, displayName);

  // The queue and roles change over REST; the socket only tells us they did.
  useEffect(() => {
    if (status !== "open") return;
    getRoom(code).then(({ room: fresh }) => onRoomChange(fresh)).catch(() => {});
  }, [status, code, onRoomChange]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const videoId = playback.videoId ?? room.currentVideoId;
  const roster = members.length > 0 ? members : room.members;

  return (
    <main className="min-h-screen">
      <header className="border-b border-hair">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-10">
          <div className="flex min-w-0 items-baseline gap-4">
            <Wordmark />
            <span className="truncate text-base text-grey">{room.title}</span>
          </div>

          <div className="flex items-center gap-3">
            {playback.isPlaying && (
              <span className="hidden items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-butter sm:flex">
                <span className="h-1.5 w-1.5 animate-filament rounded-full bg-butter" />
                Live
              </span>
            )}

            {/* The code is the invite, so it gets the accent. */}
            <button
              onClick={copyLink}
              className="group inline-flex items-center gap-2.5 rounded-full border border-butter-mute py-1.5 pl-4 pr-1.5 transition-colors hover:border-butter"
              aria-label={`Copy invite link for room ${code}`}
            >
              <code className="text-sm font-medium tracking-[0.1em] text-butter">
                {code}
              </code>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card-2 transition-colors group-hover:bg-butter group-hover:text-black">
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </span>
            </button>

            {membership.role === "HOST" && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await endRoom(code);
                  toast.success("Party ended");
                }}
              >
                End party
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-shell items-stretch gap-5 px-6 py-6 md:px-10 lg:grid-cols-[1fr_352px]">
        <div className="flex flex-col gap-4">
          <div className="relative">
            {videoId ? (
              <VideoPlayer
                src={playlistUrl(videoId)}
                videoId={videoId}
                roomId={code}
                isPlaying={playback.isPlaying}
                currentTime={playback.currentTime}
                isChannelOwner={canControl}
                onDrift={setDrift}
                className="frame aspect-video w-full"
              />
            ) : (
              <EmptyStage
                canControl={canControl}
                isGuest={!user}
                code={code}
              />
            )}

            {/* Reactions drift up off the frame and expire on their own. */}
            <div className="pointer-events-none absolute bottom-20 left-5 flex flex-col items-start gap-1.5">
              {reactions.map((reaction) => (
                <span
                  key={reaction.id}
                  className="inline-flex animate-react-rise items-center gap-2 rounded-full border border-white/15 bg-black/70 py-1 pl-2.5 pr-3 text-sm text-white"
                >
                  <span className="text-base leading-none">
                    {reaction.emoji}
                  </span>
                  {reaction.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <PresenceRail members={roster} />

            <div className="flex gap-1.5">
              {["😂", "😮", "❤️", "🔥"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-card text-lg transition-colors hover:border-butter-mute hover:bg-card-2"
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {canControl ? (
              <span className="rounded-full border border-butter-mute px-3.5 py-1 font-mono text-xs tracking-[0.06em] text-butter">
                you control playback
              </span>
            ) : (
              videoId && <SyncChip drift={drift} />
            )}

            {canControl && user && (
              <Link
                href={`/library?room=${code}`}
                className="text-base text-grey transition-colors hover:text-ash"
              >
                Change film
              </Link>
            )}
          </div>
        </div>

        <aside className="min-h-[520px] lg:h-auto">
          <RoomChat
            messages={messages}
            memberId={membership.id}
            memberCount={roster.length}
            status={status}
            onSend={sendChat}
          />
        </aside>
      </div>
    </main>
  );
}

function SyncChip({ drift }: { drift: number | null }) {
  const isSettling = drift !== null && Math.abs(drift) > DEADBAND_SECONDS;

  const label =
    drift === null
      ? "syncing"
      : !isSettling
        ? "in sync"
        : `${Math.abs(drift).toFixed(1)}s ${drift > 0 ? "ahead" : "behind"}`;

  return (
    <span
      aria-live="polite"
      className={
        isSettling
          ? "rounded-full border border-butter-mute px-3.5 py-1 font-mono text-xs tracking-[0.06em] text-butter"
          : "rounded-full border border-hair px-3.5 py-1 font-mono text-xs tracking-[0.06em] text-grey-dim"
      }
    >
      {label}
    </span>
  );
}

function EmptyStage({
  canControl,
  isGuest,
  code,
}: {
  canControl: boolean;
  isGuest: boolean;
  code: string;
}) {
  return (
    <div className="frame flex aspect-video w-full items-center justify-center bg-card">
      <div className="max-w-md px-6 text-center">
        <p className="label-mute mb-4">Nothing playing</p>

        {!canControl && (
          <p className="text-base text-grey">
            Waiting for the host to start the screening.
          </p>
        )}

        {canControl && !isGuest && (
          <p className="text-base text-grey">
            Pick something from your{" "}
            <Link
              href={`/library?room=${code}`}
              className="text-butter underline underline-offset-4"
            >
              library
            </Link>
            , or upload a film there first.
          </p>
        )}

        {canControl && isGuest && (
          <>
            <p className="text-base text-grey">
              You&rsquo;re hosting as a guest, so there&rsquo;s nothing to play
              yet &mdash; uploading a film needs an account.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button size="sm" asChild>
                <Link href="/auth">Sign in to upload</Link>
              </Button>
              <span className="text-base text-grey-dim">
                or make someone with a library a co-host
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
