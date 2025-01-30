import { Router, Request, Response } from "express";
import prismaClient from "../lib/prismaClient";
import { updateVideoTimeData, uploadVideoData } from "../schemas";
import { redisManager } from "../lib/redisManager";
import { s3Service } from "../lib/s3uploader";

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
  console.log("Acfbx");
  console.log("req.query", req.body);
  try {
    const { fileName, type } = req.body;

    if (!fileName) {
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

  try {
    const video = await prismaClient.video.findUnique({
      where: { id: videoId },
    });

    if (!video) throw new Error("Video not found.");

    const channel = await prismaClient.channel.findUnique({
      where: { id: video.channelId },
    });

    if (!channel) throw new Error("Channel not found.");

    if (req.userId === channel.creatorId) throw new Error("Unauthorized.");

    res.status(201).json({ message: "Video Update Broadcasted" });
    redisManager.sendUpdatesToWs({
      userId: req.userId!,
      videoId: videoId,
      roomId: channel.slug,
      type: "video:action",
      action: "change",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

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

    console.log("here...");

    res.status(201).json({ message: "Video uploaded successfully." });
  } catch (error: any) {
    console.log("Errror", error);
    res.status(500).json({ error: "Internal server error." });
  }
});
