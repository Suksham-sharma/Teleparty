"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, SkipForward } from "lucide-react";
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
import { PasteSource } from "./paste-source";
import { RoomQueue } from "./room-queue";
import { RoomPeople } from "./room-people";
import { CallControls } from "./call-controls";
import {
  FacesBand,
  FacesCluster,
  FacesRail,
  FacesStage,
  useFaces,
  type Face,
} from "./faces";
import { solveStage, GAP } from "@/lib/room-layout";

// Plyr reaches for `document` at import time, so it can never be evaluated
// during SSR.
const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
  ssr: false,
  loading: () => <div className="frame aspect-video w-full bg-card" />,
});

const kindOf = (source: VideoSource): SourceKind =>
  source === "YOUTUBE"
    ? "youtube"
    : source === "AUDIO"
      ? "audio"
      : source === "FILE"
        ? "file"
        : "hls";

const DESKTOP = 1024;

function useViewport() {
  const [size, setSize] = useState({ width: 1512, height: 945 });

  useEffect(() => {
    const measure = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return size;
}

export function RoomStage({
  code,
  room,
  membership,
  displayName,
  onRoomChange,
  onRoomEnded,
  onRemoved,
}: {
  code: string;
  room: Room;
  membership: Membership;
  displayName: string;
  onRoomChange: (room: Room) => void;
  onRoomEnded: () => void;
  onRemoved: () => void;
}) {
  const { user } = useAuthStore();
  const viewport = useViewport();
  const [copied, setCopied] = useState(false);
  const [drift, setDrift] = useState<number | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [tab, setTab] = useState<"chat" | "queue" | "people">("chat");

  const {
    status,
    playback,
    members,
    messages,
    reactions,
    roomRevision,
    hasEnded,
    wasRemoved,
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

  useEffect(() => {
    if (wasRemoved) onRemoved();
  }, [wasRemoved, onRemoved]);

  const videoId = playback.videoId ?? room.currentVideoId;
  const video = room.currentVideo?.id === videoId ? room.currentVideo : null;
  const upNext = room.queue[0] ?? null;
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

  const { faces, onCamera, offCamera } = useFaces(people);
  const isDesktop = viewport.width >= DESKTOP;
  const layout = solveStage(
    viewport.width,
    viewport.height,
    onCamera.length,
    Boolean(videoId)
  );
  const stageMax = layout.colW + GAP + layout.sidebar;
  const shell = isDesktop
    ? { maxWidth: stageMax }
    : { maxWidth: undefined };

  const advance = () => {
    if (!canControl || !videoId) return;
    setEngaged(true);
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
            className="mx-auto flex h-14 w-full items-center justify-between gap-4"
            style={shell}
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
          className="mx-auto flex min-h-[28px] w-full items-center justify-between gap-4"
          style={shell}
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

        <div
          className="mx-auto flex w-full flex-col gap-4"
          style={shell}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div
              className="flex min-w-0 flex-1 flex-col items-start gap-3"
              style={isDesktop ? { width: layout.colW, flex: "none" } : undefined}
            >
              <div
                className="relative w-full"
                style={
                  isDesktop
                    ? { width: layout.frameW, height: layout.frameH }
                    : undefined
                }
              >
                {video ? (
                  <VideoPlayer
                    key={video.id}
                    src={video.url}
                    kind={kindOf(video.source)}
                    title={video.title}
                    videoId={video.id}
                    roomId={code}
                    isPlaying={playback.isPlaying}
                    currentTime={playback.currentTime}
                    isChannelOwner={canControl}
                    engaged={engaged}
                    onEngage={() => setEngaged(true)}
                    onDrift={setDrift}
                    onEnded={advance}
                    className={
                      isDesktop
                        ? "frame frame-fill h-full w-full"
                        : "frame aspect-video w-full"
                    }
                  />
                ) : videoId ? (
                  <div
                    className={`frame bg-card ${isDesktop ? "h-full w-full" : "aspect-video w-full"}`}
                  />
                ) : (
                  <EmptyStage
                    canControl={canControl}
                    isGuest={!user}
                    code={code}
                    faces={faces}
                    onCamera={onCamera}
                    width={isDesktop ? layout.frameW : 0}
                    height={isDesktop ? layout.frameH : 0}
                    copied={copied}
                    onCopy={copyLink}
                    onEngage={() => setEngaged(true)}
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

              {isDesktop && videoId && layout.mode === "band" && (
                <FacesBand
                  onCamera={onCamera}
                  offCamera={offCamera}
                  tileW={layout.tileW}
                  tileH={layout.tileH}
                  height={layout.bandH}
                  width={layout.frameW}
                />
              )}

              {videoId && (!isDesktop || layout.mode === "rail") && (
                <FacesRail
                  faces={faces}
                  height={layout.bandH}
                  width={isDesktop ? layout.frameW : 0}
                />
              )}

              {video && (
                <div
                  className="flex min-h-[36px] w-full items-center justify-between gap-3"
                  style={isDesktop ? { width: layout.frameW } : undefined}
                >
                  <span className="min-w-0 truncate text-sm text-grey">
                    {upNext ? (
                      <>
                        Next up:{" "}
                        <span className="text-ash">{upNext.video.title}</span>
                      </>
                    ) : (
                      "Nothing queued next"
                    )}
                  </span>
                  {canControl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={advance}
                      disabled={!upNext}
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div
              className="flex flex-col gap-4 lg:shrink-0"
              style={isDesktop ? { width: layout.sidebar } : undefined}
            >
              <aside
                className="flex h-[380px] flex-col overflow-hidden rounded-lg bg-card lg:h-auto lg:min-h-0"
                style={
                  isDesktop
                    ? {
                        height: layout.frameH + layout.bandH + 12,
                        flex: "none",
                      }
                    : undefined
                }
              >
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
                    connected={status === "open"}
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
          </div>

          <div className="flex min-h-[40px] flex-wrap items-center justify-between gap-x-5 gap-y-2">
            <div className="flex items-center gap-4">
              {canControl ? (
                <span className="rounded-full border border-butter-mute px-3.5 py-1 font-mono text-xs tracking-[0.06em] text-butter">
                  you control playback
                </span>
              ) : (
                videoId && <SyncChip drift={drift} />
              )}
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2">
              <span className="flex items-center border-r border-hair pr-4">
                <CallControls />
              </span>

              {canControl && videoId && (
                <div className="w-full max-w-[340px]">
                  <PasteSource
                    code={code}
                    size="sm"
                    onEngage={() => setEngaged(true)}
                  />
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
  faces,
  onCamera,
  width,
  height,
  copied,
  onCopy,
  onEngage,
}: {
  canControl: boolean;
  isGuest: boolean;
  code: string;
  faces: Face[];
  onCamera: Face[];
  width: number;
  height: number;
  copied: boolean;
  onCopy: () => void;
  onEngage?: () => void;
}) {
  const sized = width > 0 && height > 0;
  const others = faces.length - 1;

  const presence =
    others <= 0
      ? "Just you in here so far"
      : `${faces.length} people in here`;

  return (
    <div
      className={`frame flex flex-col items-center justify-center gap-7 bg-card p-6 ${
        sized ? "" : "aspect-video w-full"
      }`}
      style={sized ? { width, height } : undefined}
    >
      {onCamera.length > 0 ? (
        <FacesStage
          faces={onCamera}
          width={width - 48}
          height={height - 220}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          {faces.length > 0 && <FacesCluster faces={faces} />}
          <p className="text-base text-grey">{presence}</p>
        </div>
      )}

      <div className="flex w-full max-w-xl flex-col items-center gap-3">
        {canControl ? (
          <>
            <p className="text-lg font-medium text-white">
              Put something on
            </p>
            <PasteSource code={code} onEngage={onEngage} />
            {!isGuest && (
              <p className="text-base text-grey-dim">
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
        ) : (
          <>
            <p className="text-lg font-medium text-white">
              Nothing playing yet
            </p>
            <p className="text-base text-grey">
              The host is picking something. Say hello in the meantime.
            </p>
          </>
        )}
      </div>

      <div className="flex w-full max-w-xl flex-col items-center gap-3 border-t border-hair pt-6">
        <p className="text-base text-grey">
          Anyone with this link can walk in
        </p>
        <button
          onClick={onCopy}
          className="group inline-flex h-10 items-center gap-2.5 rounded-full border border-butter-mute pl-4 pr-1.5 transition-colors hover:border-butter"
          aria-label={`Copy the invite link for room ${code}`}
        >
          <code className="text-md font-medium tracking-[0.1em] text-butter">
            {code}
          </code>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-card-2 transition-colors group-hover:bg-butter group-hover:text-black">
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
