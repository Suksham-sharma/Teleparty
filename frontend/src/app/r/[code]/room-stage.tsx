"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { endRoom, getRoom, playNext } from "@/services/room";
import { useRoomSocket } from "@/hooks/use-room-socket";
import { DEADBAND_SECONDS } from "@/lib/playback-drift";
import { useAuthStore } from "@/store/authStore";
import type { Membership, Room, VideoSource } from "@/services/types";
import type { SourceKind } from "@/hooks/use-video-player";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/app/_components/site-header";
import { RoomChat } from "./room-chat";
import { PresenceRail } from "./presence-rail";
import { PasteSource } from "./paste-source";
import { RoomQueue } from "./room-queue";
import { RoomPeople } from "./room-people";

// Plyr reaches for `document` at import time, so it can never be evaluated
// during SSR.
const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
  ssr: false,
  loading: () => <div className="frame aspect-video w-full bg-card" />,
});

const kindOf = (source: VideoSource): SourceKind =>
  source === "YOUTUBE" ? "youtube" : source === "FILE" ? "file" : "hls";

const stageWidth =
  "mx-auto w-full lg:max-w-[calc((100vh-172px)*16/9+336px)]";

export function RoomStage({
  code,
  room,
  membership,
  displayName,
  onRoomChange,
  onRoomEnded,
}: {
  code: string;
  room: Room;
  membership: Membership;
  displayName: string;
  onRoomChange: (room: Room) => void;
  onRoomEnded: () => void;
}) {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [drift, setDrift] = useState<number | null>(null);
  const [tab, setTab] = useState<"chat" | "queue" | "people">("chat");

  const {
    status,
    playback,
    members,
    messages,
    reactions,
    roomRevision,
    hasEnded,
    sendChat,
    sendReaction,
  } = useRoomSocket(code, membership, displayName);

  // The queue and roles change over REST; the socket only tells us they did.
  useEffect(() => {
    if (status !== "open") return;
    getRoom(code).then(({ room: fresh }) => onRoomChange(fresh)).catch(() => {});
  }, [status, roomRevision, code, onRoomChange]);

  useEffect(() => {
    if (hasEnded) onRoomEnded();
  }, [hasEnded, onRoomEnded]);

  const videoId = playback.videoId ?? room.currentVideoId;
  const video = room.currentVideo?.id === videoId ? room.currentVideo : null;
  const roster = members.length > 0 ? members : room.members;

  const known = new Map(room.members.map((member) => [member.id, member]));
  const people = roster.map((member) => ({
    ...member,
    ...(known.get(member.id) ?? {}),
  }));

  const me = {
    ...membership,
    role: known.get(membership.id)?.role ?? membership.role,
  };
  const canControl = me.role === "HOST" || me.role === "COHOST";
  const pendingRequests =
    me.role === "HOST"
      ? people.filter(
          (member) => member.controlRequestedAt && member.role === "VIEWER"
        ).length
      : 0;

  useEffect(() => {
    if (!videoId || video) return;
    getRoom(code).then(({ room: fresh }) => onRoomChange(fresh)).catch(() => {});
  }, [videoId, video, code, onRoomChange]);

  const advance = () => {
    if (!canControl || !videoId) return;
    playNext(code, videoId).catch(() => {});
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
    setCopied(true);
    toast.success("Link copied — send it to anyone");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex min-h-screen flex-col">
      <header className="shrink-0 border-b border-hair">
        <div className="mx-auto w-full max-w-stage px-6">
          <div
            className={`${stageWidth} flex h-14 items-center justify-between gap-4`}
          >
            <Wordmark />

            <div className="flex shrink-0 items-center gap-2.5">
              <button
                onClick={copyLink}
                title="Copy the invite link"
                className="group inline-flex h-9 items-center gap-2 rounded-full border border-butter-mute pl-3.5 pr-1.5 transition-colors hover:border-butter"
                aria-label={`Copy the invite link for room ${code}`}
              >
                <code className="text-sm font-medium tracking-[0.08em] text-butter">
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

              {me.role === "HOST" && (
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
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-stage flex-1 flex-col px-6 pb-4 pt-3">
        <div
          className={`${stageWidth} flex min-h-[28px] items-center justify-between gap-4`}
        >
          <h1 className="truncate text-lg font-medium text-white">
            {room.title}
          </h1>
          {playback.isPlaying && (
            <span className="flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-butter">
              <span className="h-1.5 w-1.5 animate-filament rounded-full bg-butter" />
              Live
            </span>
          )}
        </div>

        <div className={`${stageWidth} flex flex-1 flex-col justify-center gap-4`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="relative min-w-0 flex-1">
              {video ? (
                <VideoPlayer
                  key={video.id}
                  src={video.url}
                  kind={kindOf(video.source)}
                  videoId={video.id}
                  roomId={code}
                  isPlaying={playback.isPlaying}
                  currentTime={playback.currentTime}
                  isChannelOwner={canControl}
                  onDrift={setDrift}
                  onEnded={advance}
                  className="frame aspect-video w-full"
                />
              ) : videoId ? (
                <div className="frame aspect-video w-full bg-card" />
              ) : (
                <EmptyStage
                  canControl={canControl}
                  isGuest={!user}
                  code={code}
                />
              )}

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

            <aside className="flex h-[380px] flex-col overflow-hidden rounded-lg bg-card lg:h-auto lg:w-[320px] lg:shrink-0">
              <div className="flex shrink-0 items-center gap-1 border-b border-hair p-2">
                <Tab
                  active={tab === "chat"}
                  onClick={() => setTab("chat")}
                  label="Chat"
                />
                <Tab
                  active={tab === "queue"}
                  onClick={() => setTab("queue")}
                  label="Up next"
                  count={
                    room.queue.length +
                    (canControl ? room.suggestions.length : 0)
                  }
                />
                <Tab
                  active={tab === "people"}
                  onClick={() => setTab("people")}
                  label="People"
                  count={pendingRequests}
                />

                <span className="ml-auto pr-2 text-sm text-grey">
                  {status === "open" ? (
                    `${roster.length} here`
                  ) : status === "connecting" ? (
                    "connecting…"
                  ) : (
                    <span className="text-grey-dim">disconnected</span>
                  )}
                </span>
              </div>

              <div className="min-h-0 flex-1">
                {tab === "chat" ? (
                  <RoomChat
                    messages={messages}
                    memberId={membership.id}
                    onSend={sendChat}
                  />
                ) : tab === "people" ? (
                  <RoomPeople
                    code={code}
                    members={people}
                    membership={me}
                    onChanged={() =>
                      getRoom(code)
                        .then(({ room: fresh }) => onRoomChange(fresh))
                        .catch(() => {})
                    }
                  />
                ) : (
                  <RoomQueue
                    code={code}
                    canControl={canControl}
                    nowPlaying={video}
                    queue={room.queue}
                    suggestions={room.suggestions}
                    onChanged={() =>
                      getRoom(code)
                        .then(({ room: fresh }) => onRoomChange(fresh))
                        .catch(() => {})
                    }
                  />
                )}
              </div>
            </aside>
          </div>

          <div className="flex min-h-[40px] flex-wrap items-center justify-between gap-x-5 gap-y-2">
            <div className="flex items-center gap-4">
              <PresenceRail members={roster} />
              {canControl ? (
                <span className="rounded-full border border-butter-mute px-3.5 py-1 font-mono text-xs tracking-[0.06em] text-butter">
                  you control playback
                </span>
              ) : (
                videoId && <SyncChip drift={drift} />
              )}
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2">
              {canControl && (
                <div className="w-full max-w-[340px]">
                  <PasteSource code={code} size="sm" />
                </div>
              )}

              {canControl && user && (
                <Link
                  href={`/library?room=${code}`}
                  className="shrink-0 text-base text-grey transition-colors hover:text-ash"
                >
                  Library
                </Link>
              )}

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
          </div>
        </div>
      </div>
    </main>
  );
}

function Tab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-base transition-colors ${
        active ? "bg-card-2 text-white" : "text-grey hover:text-ash"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="font-mono text-xs text-butter">{count}</span>
      )}
    </button>
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
      <div className="w-full max-w-lg px-6 text-center">
        <p className="label-mute mb-4">Nothing playing</p>

        {!canControl && (
          <p className="text-base text-grey">
            Waiting for the host to start the screening.
          </p>
        )}

        {canControl && (
          <>
            <p className="mb-6 text-base text-grey">
              Paste a link and everyone here watches it together.
            </p>

            <PasteSource code={code} />

            {!isGuest && (
              <p className="mt-5 text-base text-grey-dim">
                or play something from your{" "}
                <Link
                  href={`/library?room=${code}`}
                  className="text-butter underline underline-offset-4"
                >
                  library
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
