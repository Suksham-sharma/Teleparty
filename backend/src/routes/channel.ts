import { Request, Router, Response } from "express";
import { createChannelData } from "../schemas";
import prismaClient from "../lib/prismaClient";

export const channelRouter = Router();
channelRouter.post("/", async (req: Request, res: Response) => {
  try {
    console.log("Creating channel");
    console.log(req.body);
    const createChannelPayload = createChannelData.safeParse(req.body);

    if (!createChannelPayload.success) {
      res.status(400).json({ error: "Invalid format, not valid" });
      return;
    }

    const randomSlug =
      Math.random().toString(36).substring(2, 6) +
      "-" +
      Math.random().toString(36).substring(2, 6);

    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const existingChannel = await prismaClient.channel.findFirst({
      where: {
        creatorId: req.userId,
      },
    });

    if (existingChannel) {
      res.status(411).json({ error: "User already has a channel" });
      return;
    }

    const createdChannel = await prismaClient.channel.create({
      data: {
        name: createChannelPayload.data.name,
        description: createChannelPayload.data.description,
        slug: randomSlug,
        creatorId: req.userId,
      },
    });

    res.status(201).json({
      id: createdChannel.id,
      name: createdChannel.name,
      description: createdChannel.description,
      slug: createdChannel.slug,
    });
  } catch (error: any) {
    console.log("Error creating channel:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

channelRouter.get("/me", async (req: Request, res: Response) => {
  console.log("Getting channel for user");
  try {
    const channel = await prismaClient.channel.findFirst({
      where: {
        creatorId: req.userId,
      },
      include: {
        videos: true,
      },
    });

    channel?.videos.map((video) => {
      video.thumbnailId = `https://d3uupbz3igyr5f.cloudfront.net/Thumbnails/${video.thumbnailId}.jpeg`;
    });

    console.log("Channel", channel);

    res.status(200).json({
      channel,
    });
  } catch (error: any) {
    res.json({ error: "Internal server error" });
  }
});

channelRouter.get("/:slug", async (req: Request, res: Response) => {
  console.log("Getting channel for user");
  try {
    const channel = await prismaClient.channel.findFirst({
      where: {
        slug: req.params.slug,
      },
    });

    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    res.status(200).json({
      channel,
    });
  } catch (error: any) {
    res.json({ error: "Internal server error" });
  }
});
