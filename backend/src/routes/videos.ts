import { Router, Request, Response } from "express";
import { RoomStatus } from "@prisma/client";
import prismaClient from "../lib/prismaClient";
import { uploadVideoData, videoInteractionData } from "../schemas";
import { redisManager } from "../lib/redisManager";
import { s3Service } from "../lib/s3uploader";
import { requireController } from "../lib/rooms";

export const videosRouter = Router();

videosRouter.get("/feed", async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const whereClause: any = {};
    if (req.query.category) {
      whereClause.category = {
        contains: req.query.category as string,
      };
    }

    const totalVideos = await prismaClient.video.count({
      where: whereClause,
    });

    const videos = await prismaClient.video.findMany({
      skip: +page === 1 ? 0 : (+page - 1) * +limit,
      take: +limit,
      where: whereClause,
      include: {
        creator: {
          select: {
            username: true,
            id: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalVideos / +limit);

    res.status(200).json({
      videos,
      totalPages,
      currentPage: +page,
    });
  } catch (error: any) {}
});

videosRouter.post("/presignedurl", async (req: Request, res: Response) => {
  try {
    // This router now runs under resolveIdentity (which never rejects, so
    // guests can control playback). Issuing S3 upload URLs still requires an
    // account — otherwise anonymous callers could mint writes to the bucket.
    if (!req.userId) {
      res.status(401).json({ error: "Sign in to upload." });
      return;
    }

    const { fileName, type } = req.body;

    if (!fileName || typeof type !== "string" || !type.includes("/")) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }

    const [contentType, extension] = type.split("/");
    console.log("contentType", contentType);
    console.log("extension", extension);

    const data = await s3Service.generatePresignedUrl(
      extension as string,
      contentType as string
    );

    res.status(200).json(data);
  } catch (error: any) {
    console.log("Error generating presigned URL:", error);
  }
});

videosRouter.post("/current/:videoId", async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { roomId } = req.body;

  try {
    if (typeof roomId !== "string" || !roomId) {
      res.status(400).json({ error: "roomId is required." });
      return;
    }

    const video = await prismaClient.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    });

    if (!video) {
      res.status(404).json({ error: "Video not found." });
      return;
    }

    // Authority is HOST/COHOST membership of the room, not channel ownership.
    const guard = await requireController(roomId, req.identity!);
    if ("error" in guard) {
      res.status(guard.status).json({ error: guard.error });
      return;
    }

    await prismaClient.room.update({
      where: { id: guard.room.id },
      data: {
        currentVideoId: videoId,
        positionMs: 0,
        isPlaying: false,
        status: RoomStatus.LIVE,
      },
    });

    await redisManager.sendUpdatesToWs({
      userId: guard.membership.id,
      videoId,
      roomId: guard.room.code,
      action: "update",
    });

    res.status(201).json({ message: "Video update broadcast." });
  } catch (error) {
    console.error("Error broadcasting video update:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

videosRouter.post(
  "/interaction/:videoId",
  async (req: Request, res: Response) => {
    const { videoId } = req.params;
    try {
      const payload = videoInteractionData.safeParse(req.body);
      if (!payload.success) {
        res.status(400).json({ error: "Invalid request." });
        return;
      }

      const { roomId, action, currentTime } = payload.data;
      if (action === "timestamp" && !currentTime) {
        res.status(400).json({ error: "currentTime is required." });
        return;
      }

      const guard = await requireController(roomId, req.identity!);
      if ("error" in guard) {
        res.status(guard.status).json({ error: guard.error });
        return;
      }

      // Persist so a late joiner's snapshot is accurate even if the
      // ws-server has restarted since the last event.
      await prismaClient.room.update({
        where: { id: guard.room.id },
        data:
          action === "timestamp"
            ? { positionMs: Math.round(parseFloat(currentTime!) * 1000) }
            : { isPlaying: action === "play" },
      });

      await redisManager.sendUpdatesToWs({
        userId: guard.membership.id,
        videoId,
        roomId: guard.room.code,
        action,
        ...(action === "timestamp" ? { currentTime } : {}),
      });

      res.status(201).json({ message: "Video interaction broadcast." });
    } catch (error) {
      console.error("Error broadcasting interaction:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

videosRouter.post("/upload", async (req: Request, res: Response) => {
  console.log("Starting Video Upload");
  try {
    const uploadVideoPayload = uploadVideoData.safeParse(req.body);

    if (!uploadVideoPayload.success) {
      res.status(400).json({
        error: uploadVideoPayload.error.errors.map((error) => error.message),
      });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const findChannel = await prismaClient.channel.findFirst({
      where: {
        creatorId: req.userId,
      },
    });

    if (!findChannel) {
      res.status(404).json({ error: "Channel not found." });
      return;
    }

    const { title, description, thumbnailId, videoId } =
      uploadVideoPayload.data;

    redisManager.sendToWorkerAndSubscribe(videoId);

    const video = await prismaClient.video.create({
      data: {
        id: videoId,
        title,
        description,
        thumbnailId: thumbnailId,
        creatorId: req.userId,
        channelId: findChannel.id,
        video_urls: [],
      },
    });

    res.status(201).json({ message: "Video uploaded successfully." });
  } catch (error: any) {
    console.log("Errror", error);
    res.status(500).json({ error: "Internal server error." });
  }
});
