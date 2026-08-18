import { Request, Response, Router } from "express";
import { Prisma, QueueStatus, Role, RoomStatus } from "@prisma/client";
import prismaClient from "../lib/prismaClient";
import { generateRoomCode } from "../lib/roomCode";
import {
  createRoomData,
  joinRoomData,
  queueAddData,
  setRoleData,
  setSourceData,
} from "../schemas";
import {
  findMembership,
  isController,
  requireHost,
  requireController,
  requireMember,
  roomInclude,
  serializeRoom,
  serializeVideo,
  setCurrentVideo,
} from "../lib/rooms";
import { videoFromUrl } from "../lib/externalVideo";
import { redisManager } from "../lib/redisManager";

export const roomsRouter = Router();

roomsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const payload = createRoomData.safeParse(req.body ?? {});
    if (!payload.success) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }

    const identity = req.identity!;
    if (identity.kind !== "user") {
      res.status(401).json({ error: "Sign in to host a watch party." });
      return;
    }

    const code = await generateRoomCode();
    const hostName = identity.displayName;
    const title = payload.data.title?.trim() || `${hostName}'s watch party`;

    const room = await prismaClient.room.create({
      data: {
        code,
        title,
        hostUserId: identity.userId,
        members: {
          create: {
            role: Role.HOST,
            userId: identity.userId,
          },
        },
      },
      include: roomInclude,
    });

    res.status(201).json({ room: serializeRoom(room) });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Could not create room." });
  }
});

/** Rooms hosted by the signed-in user. Guests get an empty list. */
roomsRouter.get("/mine", async (req: Request, res: Response) => {
  try {
    const identity = req.identity!;
    if (identity.kind !== "user") {
      res.status(200).json({ rooms: [] });
      return;
    }

    const rooms = await prismaClient.room.findMany({
      where: { hostUserId: identity.userId, status: { not: RoomStatus.ENDED } },
      orderBy: { createdAt: "desc" },
      include: roomInclude,
    });

    res.status(200).json({ rooms: rooms.map(serializeRoom) });
  } catch (error) {
    console.error("Error listing rooms:", error);
    res.status(500).json({ error: "Could not list rooms." });
  }
});

/**
 * Room snapshot. Readable without joining so the page can render a lobby (and a
 * "this party has ended" state) before the visitor picks a name.
 */
roomsRouter.get("/:code", async (req: Request, res: Response) => {
  try {
    const room = await prismaClient.room.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: roomInclude,
    });

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    const membership = findMembership(room.members, req.identity!);

    res.status(200).json({
      room: serializeRoom(room),
      membership: membership
        ? { id: membership.id, role: membership.role }
        : null,
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ error: "Could not fetch room." });
  }
});

/**
 * Join. Idempotent: re-opening the tab reuses the existing membership rather
 * than creating a duplicate, and lets a guest correct their display name.
 */
roomsRouter.post("/:code/join", async (req: Request, res: Response) => {
  try {
    const payload = joinRoomData.safeParse(req.body ?? {});
    if (!payload.success) {
      res.status(400).json({ error: "A display name is required." });
      return;
    }

    const room = await prismaClient.room.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: { members: true },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    if (room.status === RoomStatus.ENDED) {
      res.status(410).json({ error: "This watch party has ended." });
      return;
    }

    const identity = req.identity!;
    const existing = findMembership(room.members, identity);

    if (existing) {
      const member =
        identity.kind === "guest" && payload.data.displayName
          ? await prismaClient.roomMember.update({
              where: { id: existing.id },
              data: { guestName: payload.data.displayName.trim() },
            })
          : existing;

      res.status(200).json({ membership: { id: member.id, role: member.role } });
      return;
    }

    if (identity.kind === "guest" && !payload.data.displayName) {
      res.status(400).json({ error: "A display name is required." });
      return;
    }

    const member = await prismaClient.roomMember.create({
      data: {
        roomId: room.id,
        role: Role.VIEWER,
        userId: identity.kind === "user" ? identity.userId : null,
        guestId: identity.kind === "guest" ? identity.guestId : null,
        guestName:
          identity.kind === "guest"
            ? payload.data.displayName!.trim()
            : null,
      },
    });

    res.status(201).json({ membership: { id: member.id, role: member.role } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Two tabs raced the same join; the other one won and that is fine.
      res.status(409).json({ error: "Already joined." });
      return;
    }
    console.error("Error joining room:", error);
    res.status(500).json({ error: "Could not join room." });
  }
});

roomsRouter.post("/:code/end", async (req: Request, res: Response) => {
  try {
    const guard = await requireHost(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    await prismaClient.room.update({
      where: { id: guard.room.id },
      data: { status: RoomStatus.ENDED, endedAt: new Date(), isPlaying: false },
    });

    redisManager.sendRoomEvent({
      roomId: guard.room.code,
      type: "room:ended",
    });

    res.status(200).json({ message: "Room ended." });
  } catch (error) {
    console.error("Error ending room:", error);
    res.status(500).json({ error: "Could not end room." });
  }
});

roomsRouter.post("/:code/source", async (req: Request, res: Response) => {
  try {
    const payload = setSourceData.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: "Paste a link first." });
      return;
    }

    const guard = await requireController(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    const resolved = await videoFromUrl(payload.data.url, req.identity!);
    if ("error" in resolved) {
      res.status(400).json({ error: resolved.error });
      return;
    }

    await setCurrentVideo(guard.room, guard.membership, resolved.video.id);

    res.status(201).json({ video: serializeVideo(resolved.video) });
  } catch (error) {
    console.error("Error setting room source:", error);
    res.status(500).json({ error: "Could not start that link." });
  }
});

const SUGGESTION_LIMIT = 5;

const nextPosition = async (roomId: string) => {
  const last = await prismaClient.queueItem.findFirst({
    where: { roomId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (last?.position ?? -1) + 1;
};

const announceQueue = (code: string) =>
  redisManager.sendRoomEvent({ roomId: code, type: "queue:updated" });

roomsRouter.post("/:code/queue", async (req: Request, res: Response) => {
  try {
    const payload = queueAddData.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: "Paste a link first." });
      return;
    }

    const guard = await requireMember(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    const controls = isController(guard.membership);
    const { url, videoId } = payload.data;

    if (videoId && !controls) {
      res.status(403).json({ error: "Suggest a link instead." });
      return;
    }

    let video;
    if (url) {
      const resolved = await videoFromUrl(url, req.identity!);
      if ("error" in resolved) {
        res.status(400).json({ error: resolved.error });
        return;
      }
      video = resolved.video;
    } else {
      const found = await prismaClient.video.findUnique({
        where: { id: videoId! },
      });
      if (!found) {
        res.status(404).json({ error: "Video not found." });
        return;
      }
      video = found;
    }

    if (!controls) {
      const pending = await prismaClient.queueItem.count({
        where: {
          roomId: guard.room.id,
          addedBy: guard.membership.id,
          status: QueueStatus.SUGGESTED,
        },
      });
      if (pending >= SUGGESTION_LIMIT) {
        res.status(429).json({
          error: "You have enough suggestions waiting. Wait for the host.",
        });
        return;
      }
    }

    const item = await prismaClient.queueItem.create({
      data: {
        roomId: guard.room.id,
        videoId: video.id,
        position: await nextPosition(guard.room.id),
        addedBy: guard.membership.id,
        status: controls ? QueueStatus.QUEUED : QueueStatus.SUGGESTED,
      },
      include: { video: true },
    });

    announceQueue(guard.room.code);

    res.status(201).json({
      item: {
        id: item.id,
        status: item.status,
        video: serializeVideo(item.video),
      },
    });
  } catch (error) {
    console.error("Error adding to queue:", error);
    res.status(500).json({ error: "Could not add to queue." });
  }
});

roomsRouter.post(
  "/:code/queue/:itemId/approve",
  async (req: Request, res: Response) => {
    try {
      const guard = await requireController(req.params.code, req.identity!);
      if ("error" in guard) {
        res.status(guard.status).json({ error: guard.error });
        return;
      }

      const promoted = await prismaClient.queueItem.updateMany({
        where: {
          id: req.params.itemId,
          roomId: guard.room.id,
          status: QueueStatus.SUGGESTED,
        },
        data: {
          status: QueueStatus.QUEUED,
          position: await nextPosition(guard.room.id),
        },
      });

      if (promoted.count === 0) {
        res.status(404).json({ error: "That suggestion is gone." });
        return;
      }

      announceQueue(guard.room.code);
      res.status(200).json({ message: "Added to the queue." });
    } catch (error) {
      console.error("Error approving suggestion:", error);
      res.status(500).json({ error: "Could not approve that." });
    }
  }
);

roomsRouter.delete("/:code/queue/:itemId", async (req: Request, res: Response) => {
  try {
    const guard = await requireMember(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    const removed = await prismaClient.queueItem.deleteMany({
      where: {
        id: req.params.itemId,
        roomId: guard.room.id,
        ...(isController(guard.membership)
          ? {}
          : { addedBy: guard.membership.id }),
      },
    });

    if (removed.count === 0) {
      res.status(404).json({ error: "That item is not yours to remove." });
      return;
    }

    announceQueue(guard.room.code);
    res.status(200).json({ message: "Removed." });
  } catch (error) {
    console.error("Error removing from queue:", error);
    res.status(500).json({ error: "Could not remove from queue." });
  }
});

roomsRouter.post("/:code/next", async (req: Request, res: Response) => {
  try {
    const guard = await requireController(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    const afterVideoId = req.body?.afterVideoId;
    if (
      typeof afterVideoId === "string" &&
      guard.room.currentVideoId !== afterVideoId
    ) {
      res.status(200).json({ advanced: false });
      return;
    }

    const head = await prismaClient.queueItem.findFirst({
      where: { roomId: guard.room.id, status: QueueStatus.QUEUED },
      orderBy: { position: "asc" },
      include: { video: true },
    });

    if (!head) {
      res.status(200).json({ advanced: false });
      return;
    }

    const claimed = await prismaClient.queueItem.deleteMany({
      where: { id: head.id },
    });
    if (claimed.count === 0) {
      res.status(200).json({ advanced: false });
      return;
    }

    await setCurrentVideo(guard.room, guard.membership, head.videoId);
    announceQueue(guard.room.code);

    res.status(200).json({ advanced: true, video: serializeVideo(head.video) });
  } catch (error) {
    console.error("Error advancing the queue:", error);
    res.status(500).json({ error: "Could not play the next thing." });
  }
});

roomsRouter.post("/:code/control-request", async (req: Request, res: Response) => {
  try {
    const guard = await requireMember(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    if (isController(guard.membership)) {
      res.status(400).json({ error: "You already control this room." });
      return;
    }

    if (!guard.membership.controlRequestedAt) {
      await prismaClient.roomMember.update({
        where: { id: guard.membership.id },
        data: { controlRequestedAt: new Date() },
      });
    }

    redisManager.sendRoomEvent({
      roomId: guard.room.code,
      type: "room:roles-updated",
    });

    res.status(200).json({ message: "The host has been asked." });
  } catch (error) {
    console.error("Error requesting control:", error);
    res.status(500).json({ error: "Could not ask for control." });
  }
});

roomsRouter.delete(
  "/:code/control-request/:memberId",
  async (req: Request, res: Response) => {
    try {
      const guard = await requireMember(req.params.code, req.identity!);
      if ("error" in guard) {
        res.status(guard.status).json({ error: guard.error });
        return;
      }

      const { memberId } = req.params;
      const isOwn = memberId === guard.membership.id;

      if (!isOwn && guard.membership.role !== Role.HOST) {
        res.status(403).json({ error: "Only the host decides this." });
        return;
      }

      const cleared = await prismaClient.roomMember.updateMany({
        where: {
          id: memberId,
          roomId: guard.room.id,
          controlRequestedAt: { not: null },
        },
        data: { controlRequestedAt: null },
      });

      if (cleared.count === 0) {
        res.status(404).json({ error: "No request to answer." });
        return;
      }

      redisManager.sendRoomEvent({
        roomId: guard.room.code,
        type: "room:roles-updated",
      });

      res.status(200).json({ message: isOwn ? "Withdrawn." : "Declined." });
    } catch (error) {
      console.error("Error clearing a control request:", error);
      res.status(500).json({ error: "Could not answer that request." });
    }
  }
);

/** Promote or demote a member. Host only; the host cannot demote themselves. */
roomsRouter.post("/:code/role", async (req: Request, res: Response) => {
  try {
    const payload = setRoleData.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }

    const guard = await requireHost(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    if (payload.data.memberId === guard.membership.id) {
      res.status(400).json({ error: "The host cannot change their own role." });
      return;
    }

    const updated = await prismaClient.roomMember.updateMany({
      where: { id: payload.data.memberId, roomId: guard.room.id },
      data: { role: payload.data.role, controlRequestedAt: null },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: "Member not found." });
      return;
    }

    redisManager.sendRoomEvent({
      roomId: guard.room.code,
      type: "room:roles-updated",
    });

    res.status(200).json({ message: "Role updated." });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Could not update role." });
  }
});

/** Chat history, newest-last, for the catch-up snapshot on join. */
roomsRouter.get("/:code/messages", async (req: Request, res: Response) => {
  try {
    const room = await prismaClient.room.findUnique({
      where: { code: req.params.code.toUpperCase() },
      select: { id: true },
    });

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const before = req.query.before
      ? new Date(req.query.before as string)
      : undefined;

    const messages = await prismaClient.message.findMany({
      where: {
        roomId: room.id,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true,
        memberId: true,
        authorLabel: true,
        body: true,
        videoTimeMs: true,
        createdAt: true,
      },
    });

    res.status(200).json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Could not fetch messages." });
  }
});
