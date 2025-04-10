import z from "zod";

export const signUpData = z.object({
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
});

export const signInData = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createChannelData = z.object({
  name: z.string(),
  description: z.string(),
});

export const updateVideoTimeData = z.object({
  timestamp: z.number(),
});

export const uploadVideoData = z.object({
  title: z.string(),
  description: z.string(),
  videoId: z.string(),
  thumbnailId: z.string(),
});

export const videoInteractionData = z.object({
  roomId: z.string(),
  action: z.enum(["play", "pause", "timestamp"]),
  currentTime: z.string().optional(),
});
