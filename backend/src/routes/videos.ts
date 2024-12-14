import { Router, Request, Response } from "express";
import prismaClient from "../lib/prismaClient";
import { updateVideoTimeData, uploadVideoData } from "../schemas";
import { redisManager } from "../lib/redisManager";
import { upload } from "../lib/multer";
import { s3Service } from "../lib/s3uploader";
import fs from "fs";

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

videosRouter.get("/presignedurl", async (req: Request, res: Response) => {
  console.log("req.query", req.query);
  try {
    const { fileName, type } = req.query;

    if (!fileName) {
      res.status(400).json({ error: "Invalid request." });
      return;
    }

    const key =
      type === "video"
        ? `Originalvideos/${fileName}`
        : `Thumbnails/${fileName}`;

    const presignedUrl = await s3Service.generatePresignedUrl(
      key as string,
      type as string
    );

    res.status(200).json({ presignedUrl });
  } catch (error: any) {}
});

videosRouter.put("/:video_id/time", async (req: Request, res: Response) => {
  const { video_id } = req.params;

  console.log("video_id", video_id);

  try {
    console.log("req.body", req.body);
    const updateTimeStampPayload = updateVideoTimeData.safeParse(req.body);

    if (!updateTimeStampPayload.success) {
      res.status(408).json({
        error: updateTimeStampPayload.error.errors.map(
          (error) => error.message
        ),
      });
      return;
    }

    const { timestamp } = updateTimeStampPayload.data;
    const video = await prismaClient.video.findUnique({
      where: { id: video_id },
    });

    if (!video) {
      res.status(404).json({ error: "Video not found." });
      return;
    }

    const videoDuration = video.duration;

    const stringTimestamp = timestamp.toString();

    await prismaClient.video.update({
      where: { id: video_id },
      data: { timeStamp: stringTimestamp },
    });

    res.status(201).json({ message: "Timestamp updated successfully." });
    if (req.userId)
      redisManager.sendUpdatesToWs({
        user_id: req.userId,
        videoId: video_id,
        timestamp,
      });
  } catch (error: any) {
    console.error("Error updating video timestamp:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

videosRouter.post("/upload", async (req: Request, res: Response) => {
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

    const { title, description, thumbnailUrl } = uploadVideoPayload.data;

    const video = await prismaClient.video.create({
      data: {
        title,
        description,
        thumbnail_url: thumbnailUrl,
        creatorId: req.userId,
        channelId: findChannel.id,
        video_urls: [],
      },
    });
  } catch (error: any) {}
});
