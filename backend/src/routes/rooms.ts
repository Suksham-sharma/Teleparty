import { Request, Response, Router } from "express";
import { Prisma, Role, RoomStatus } from "@prisma/client";
import prismaClient from "../lib/prismaClient";
import { generateRoomCode } from "../lib/roomCode";
import {
  createRoomData,
  joinRoomData,
  queueAddData,
  setRoleData,
} from "../schemas";
import {
  findMembership,
  requireHost,
  requireController,
  serializeRoom,
} from "../lib/rooms";
import { redisManager } from "../lib/redisManager";

export const roomsRouter = Router();

/**
 * Create a room. Deliberately available to guests: "start a watch party" is the
 * primary call to action on the landing page and must not be gated behind
 * signup. The creator becomes the HOST member.
 */
roomsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const payload = createRoomData.safeParse(req.body ?? {});
    if (!payload.success) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }

    const identity = req.identity!;
    const code = await generateRoomCode();

    const hostName =
      identity.kind === "user"
        ? identity.displayName
        : payload.data.hostName?.trim() || "Host";

    const title = payload.data.title?.trim() || `${hostName}'s watch party`;

    const room = await prismaClient.room.create({
      data: {
        code,
        title,
        hostUserId: identity.kind === "user" ? identity.userId : null,
        members: {
          create: {
            role: Role.HOST,
            userId: identity.kind === "user" ? identity.userId : null,
            guestId: identity.kind === "guest" ? identity.guestId : null,
            guestName: identity.kind === "guest" ? hostName : null,
          },
        },
      },
      include: { members: true, queue: { include: { video: true } } },
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
      include: { members: true, queue: { include: { video: true } } },
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
      include: {
        members: true,
        queue: { include: { video: true }, orderBy: { position: "asc" } },
      },
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

roomsRouter.post("/:code/queue", async (req: Request, res: Response) => {
  try {
    const payload = queueAddData.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }

    const guard = await requireController(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    const video = await prismaClient.video.findUnique({
      where: { id: payload.data.videoId },
      select: { id: true },
    });

    if (!video) {
      res.status(404).json({ error: "Video not found." });
      return;
    }

    const last = await prismaClient.queueItem.findFirst({
      where: { roomId: guard.room.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const item = await prismaClient.queueItem.create({
      data: {
        roomId: guard.room.id,
        videoId: video.id,
        position: (last?.position ?? -1) + 1,
        addedBy: guard.membership.id,
      },
      include: { video: true },
    });

    redisManager.sendRoomEvent({
      roomId: guard.room.code,
      type: "queue:updated",
    });

    res.status(201).json({ item });
  } catch (error) {
    console.error("Error adding to queue:", error);
    res.status(500).json({ error: "Could not add to queue." });
  }
});

roomsRouter.delete("/:code/queue/:itemId", async (req: Request, res: Response) => {
  try {
    const guard = await requireController(req.params.code, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    await prismaClient.queueItem.deleteMany({
      where: { id: req.params.itemId, roomId: guard.room.id },
    });

    redisManager.sendRoomEvent({
      roomId: guard.room.code,
      type: "queue:updated",
    });

    res.status(200).json({ message: "Removed." });
  } catch (error) {
    console.error("Error removing from queue:", error);
    res.status(500).json({ error: "Could not remove from queue." });
  }
});

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
      data: { role: payload.data.role },
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
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.status(200).json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Could not fetch messages." });
  }
});
