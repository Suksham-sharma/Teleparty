import { redisManager } from "./manager/redisManager";
import { s3Manager } from "./manager/S3Manager";

export async function processDataFromQueue() {
  while (true) {
    const inputData = await redisManager.getDataFromQueue();

    if (!inputData) {
      continue;
    }

    // Awaited deliberately. ffmpeg is CPU-bound across three resolutions, so
    // overlapping jobs only make every one of them slower — and previously
    // this was fire-and-forget, which also meant a rejection here surfaced as
    // an unhandled promise rather than a FAILED status.
    await handleIncomingRequests(inputData);
  }
}

const handleIncomingRequests = async (message: any) => {
  const { key, requestId } = message ?? {};

  if (!key || !requestId) {
    // No videoId to report against, so there is nothing to mark FAILED.
    console.log("Invalid message received, dropping:", message);
    return;
  }

  console.log("Processing incoming message", message);

  // `key` is the videoId — the client sends the S3 resourceId as both.
  await redisManager.publishDataToServer({
    videoId: key,
    status: "TRANSCODING",
  });

  try {
    const { durationMs, variants } = await s3Manager.getDataFromS3andProcess(
      key
    );

    await redisManager.publishDataToServer({
      videoId: key,
      status: "READY",
      durationMs,
      variants,
    });
  } catch (error: any) {
    console.log("Error handling incoming message", error);

    // The row must not be left at TRANSCODING forever — a stuck spinner is
    // worse than a stated failure.
    await redisManager.publishDataToServer({
      videoId: key,
      status: "FAILED",
      failureReason: String(error?.message ?? error).slice(0, 500),
    });
  }
};
