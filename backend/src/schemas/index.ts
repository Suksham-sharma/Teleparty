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

export const createRoomData = z.object({
  title: z.string().max(80).optional(),
  // Guests name themselves at creation time; signed-in users use their username.
  hostName: z.string().min(1).max(40).optional(),
});

export const joinRoomData = z.object({
  displayName: z.string().min(1).max(40).optional(),
});

export const queueAddData = z
  .object({
    url: z.string().min(1).max(2048).optional(),
    videoId: z.string().optional(),
  })
  .refine((data) => Boolean(data.url || data.videoId));

export const setSourceData = z.object({
  url: z.string().min(1).max(2048),
});

export const setRoleData = z.object({
  memberId: z.string(),
  role: z.enum(["COHOST", "VIEWER"]),
});
