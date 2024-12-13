import { Router, Request, Response } from "express";
import prismaClient from "../lib/prismaClient";
import { updateVideoTimeData, uploadVideoData } from "../schemas";
import { redisManager } from "../lib/redisManager";
import { upload } from "../lib/multer";
import { s3Service } from "../lib/s3uploader";
import fs from "fs";

export const videosRouter = Router();

videosRouter.get("/feed", async (req: Request, res: Response) => {
  console.log("1");
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
  console.log("3");
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

videosRouter.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      console.log(req.body);
      const videoUploadPayload = uploadVideoData.safeParse(req.body);

      const filePath = req.file?.path;
      const key = `Originalvideos/${Date.now()}${req.file?.originalname}`;

      if (!filePath) {
        res.status(400).json({ error: "Invalid file upload." });
        return;
      }

      const fileType = req.file?.mimetype;
      if (!fileType) {
        console.log("fileType Error", fileType);
        return;
      }

      const response = await s3Service.uploadDataToS3(filePath, fileType, key);

      console.log("response", response);

      fs.unlinkSync(filePath);

      if (!videoUploadPayload.success) {
        res.status(400).json({
          error: "Invalid video upload data.",
        });
        return;
      }

      const { title, description, category } = videoUploadPayload.data;

      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const findChannel = await prismaClient.channel.findUnique({
        where: { creatorId: req.userId },
      });

      if (!findChannel) {
        res.status(404).json({ error: "Channel not found." });
        return;
      }

      const video = await prismaClient.video.create({
        data: {
          title,
          description,
          category,
          creatorId: req.userId,
          channelId: findChannel.id,
          video_urls: {
            "240p": `https://example.com/${filePath}240p`,
            "480p": `https://example.com/${filePath}480p`,
            "720p": `https://example.com/${filePath}720p`,
          },
        },
      });

      res.status(200).json({ ...video, processing_status: "PROCESSING" });
    } catch (error: any) {
      console.error("Error uploading video:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

videosRouter.get("/:video_id", async (req: Request, res: Response) => {
  console.log("5");
  try {
    const { video_id } = req.params;

    const video = await prismaClient.video.findUnique({
      where: { id: video_id },
      include: {
        creator: {
          select: {
            username: true,
            id: true,
          },
        },
      },
    });

    if (!video) {
      res.status(404).json({ error: "Video not found." });
      return;
    }

    video.video_urls = {
      "240p": "<https://example.com/video_240p.mp4>",
      "480p": "<https://example.com/video_480p.mp4>",
      "720p": "<https://example.com/video_720p.mp4>",
    };

    res.status(200).json({ ...video, status: "TRANSCODED" });
  } catch (error: any) {
    console.log("Error fetching video:", error);
  }
});
