import { Prisma, Role, Room, RoomMember, RoomStatus } from "@prisma/client";
import prismaClient from "./prismaClient";
import { CDN_HOST } from "./config";
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

type RoomWithMembers = Room & {
  members: RoomMember[];
  queue?: (Prisma.QueueItemGetPayload<{ include: { video: true } }>)[];
};

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
  if (!allowed.includes(membership.role))
    return { error: "You do not control playback in this room.", status: 403 };

  return { room, membership };
};

/** HOST only — ending the room, changing roles. */
export const requireHost = (code: string, identity: Identity) =>
  guard(code, identity, [Role.HOST]);

/** HOST or COHOST — playback, queue. */
export const requireController = (code: string, identity: Identity) =>
  guard(code, identity, CONTROLLERS);

export const serializeRoom = (room: RoomWithMembers) => ({
  code: room.code,
  title: room.title,
  status: room.status,
  visibility: room.visibility,
  currentVideoId: room.currentVideoId,
  positionMs: room.positionMs,
  isPlaying: room.isPlaying,
  scheduledFor: room.scheduledFor,
  createdAt: room.createdAt,
  members: room.members.map((m) => ({
    id: m.id,
    role: m.role,
    name: m.guestName,
    userId: m.userId,
    joinedAt: m.joinedAt,
  })),
  queue:
    room.queue?.map((item) => ({
      id: item.id,
      position: item.position,
      video: {
        id: item.video.id,
        title: item.video.title,
        status: item.video.status,
        durationMs: item.video.durationMs,
        thumbnailUrl: item.video.thumbnailId
          ? `${CDN_HOST}/Thumbnails/${item.video.thumbnailId}.jpeg`
          : null,
      },
    })) ?? [],
});
