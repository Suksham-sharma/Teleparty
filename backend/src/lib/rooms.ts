import {
  Prisma,
  QueueStatus,
  Role,
  Room,
  RoomMember,
  RoomStatus,
  Video,
} from "@prisma/client";
import prismaClient from "./prismaClient";
import { CDN_HOST } from "./config";
import { playbackUrlFor } from "./videoSource";
import { redisManager } from "./redisManager";
import type { Identity } from "../types";

/**
 * Playback authority lives here. It is deliberately the *only* place that
 * decides who may drive a room, so adding a new control surface can't
 * accidentally reintroduce the old "is this your channel?" check.
 */
const CONTROLLERS: Role[] = [Role.HOST, Role.COHOST];

export const findMembership = <T extends Pick<RoomMember, "userId" | "guestId">>(
  members: T[],
  identity: Identity
): T | undefined =>
  identity.kind === "user"
    ? members.find((m) => m.userId === identity.userId)
    : members.find((m) => m.guestId === identity.guestId);

export const displayNameOf = (
  member: Pick<RoomMember, "guestName">,
  user?: { username: string } | null
) => user?.username ?? member.guestName ?? "Guest";

type MemberWithUser = RoomMember & { user?: { username: string } | null };

type RoomWithMembers = Room & {
  members: MemberWithUser[];
  currentVideo?: Video | null;
  queue?: (Prisma.QueueItemGetPayload<{ include: { video: true } }>)[];
};

export const roomInclude = {
  members: { include: { user: { select: { username: true } } } },
  currentVideo: true,
  queue: {
    include: { video: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.RoomInclude;

type Guard =
  | { room: Room; membership: RoomMember }
  | { error: string; status: number };

const guard = async (
  code: string,
  identity: Identity,
  allowed: Role[]
): Promise<Guard> => {
  const room = await prismaClient.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { members: true },
  });

  if (!room) return { error: "Room not found.", status: 404 };
  if (room.status === RoomStatus.ENDED)
    return { error: "This watch party has ended.", status: 410 };

  const membership = findMembership(room.members, identity);
  if (!membership) return { error: "You are not in this room.", status: 403 };
  if (membership.removedAt)
    return { error: "You are no longer in this room.", status: 403 };
  if (!allowed.includes(membership.role))
    return {
      error:
        allowed.length === 1 && allowed[0] === Role.HOST
          ? "Only the host can do that."
          : "You do not control playback in this room.",
      status: 403,
    };

  return { room, membership };
};

/** HOST only — ending the room, changing roles. */
export const requireHost = (code: string, identity: Identity) =>
  guard(code, identity, [Role.HOST]);

/** HOST or COHOST — playback, queue. */
export const requireController = (code: string, identity: Identity) =>
  guard(code, identity, CONTROLLERS);

export const requireMember = (code: string, identity: Identity) =>
  guard(code, identity, [Role.HOST, Role.COHOST, Role.VIEWER]);

export const isController = (member: Pick<RoomMember, "role">) =>
  CONTROLLERS.includes(member.role);

export const serializeVideo = (video: Video) => ({
  id: video.id,
  title: video.title,
  source: video.source,
  url: playbackUrlFor(video),
  status: video.status,
  durationMs: video.durationMs,
  thumbnailUrl:
    video.thumbnailUrl ??
    (video.thumbnailId
      ? `${CDN_HOST}/Thumbnails/${video.thumbnailId}.jpeg`
      : null),
});

export const setCurrentVideo = async (
  room: Room,
  membership: RoomMember,
  videoId: string
) => {
  await prismaClient.room.update({
    where: { id: room.id },
    data: {
      currentVideoId: videoId,
      positionMs: 0,
      isPlaying: false,
      status: RoomStatus.LIVE,
    },
  });

  await redisManager.sendUpdatesToWs({
    userId: membership.id,
    videoId,
    roomId: room.code,
    action: "update",
  });
};

export const serializeRoom = (room: RoomWithMembers) => ({
  code: room.code,
  title: room.title,
  status: room.status,
  visibility: room.visibility,
  currentVideoId: room.currentVideoId,
  currentVideo: room.currentVideo ? serializeVideo(room.currentVideo) : null,
  positionMs: room.positionMs,
  isPlaying: room.isPlaying,
  scheduledFor: room.scheduledFor,
  createdAt: room.createdAt,
  members: room.members
    .filter((m) => !m.removedAt)
    .map((m) => ({
      id: m.id,
      role: m.role,
      name: displayNameOf(m, m.user),
      userId: m.userId,
      joinedAt: m.joinedAt,
      controlRequestedAt: m.controlRequestedAt,
    })),
  queue: serializeQueue(room, QueueStatus.QUEUED),
  suggestions: serializeQueue(room, QueueStatus.SUGGESTED),
});

const serializeQueue = (room: RoomWithMembers, status: QueueStatus) =>
  (room.queue ?? [])
    .filter((item) => item.status === status)
    .map((item) => ({
      id: item.id,
      position: item.position,
      addedBy: item.addedBy,
      addedByName: (() => {
        const member = room.members.find((m) => m.id === item.addedBy);
        return member ? displayNameOf(member, member.user) : "Someone";
      })(),
      video: serializeVideo(item.video),
    }));
