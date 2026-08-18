import { Prisma, Video, VideoStatus } from "@prisma/client";
import prismaClient from "./prismaClient";
import { isParsed, parseVideoSource, resolveTitle } from "./videoSource";
import type { Identity } from "../types";

type Resolved = { video: Video } | { error: string };

export async function videoFromUrl(
  url: string,
  identity: Identity
): Promise<Resolved> {
  const parsed = parseVideoSource(url);
  if (!isParsed(parsed)) return { error: parsed.error };

  const existing = await prismaClient.video.findUnique({
    where: { sourceUrl: parsed.url },
  });

  if (existing) {
    const stale =
      existing.title === parsed.title || existing.thumbnailUrl === null;
    if (!stale || !parsed.thumbnailUrl) return { video: existing };

    return {
      video: await prismaClient.video.update({
        where: { id: existing.id },
        data: {
          title: await resolveTitle(parsed),
          thumbnailUrl: parsed.thumbnailUrl,
        },
      }),
    };
  }

  const title = await resolveTitle(parsed);

  try {
    const video = await prismaClient.video.create({
      data: {
        title,
        description: "",
        source: parsed.source,
        sourceUrl: parsed.url,
        thumbnailUrl: parsed.thumbnailUrl,
        status: VideoStatus.READY,
        creatorId: identity.kind === "user" ? identity.userId : null,
      },
    });
    return { video };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prismaClient.video.findUnique({
        where: { sourceUrl: parsed.url },
      });
      if (raced) return { video: raced };
    }
    throw error;
  }
}
