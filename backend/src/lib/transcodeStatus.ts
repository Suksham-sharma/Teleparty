import { createClient, type RedisClientType } from "redis";
import { VideoStatus } from "@prisma/client";
import prismaClient from "./prismaClient";
import { REDIS_URL } from "./config";
import {
  TRANSCODE_STATUS_KEY,
  type TranscodeStatusMessage,
} from "./redisManager";

/**
 * Consumes the worker's completion reports and is the only writer of
 * `Video.status`. Closes the loop that left every upload stuck at PENDING.
 *
 * Runs on a **dedicated client**: `brPop` blocks the connection for as long as
 * the list is empty, so sharing `redisManager`'s client would stall every
 * `lPush` the API makes — playback sync included.
 */
class TranscodeStatusConsumer {
  private static instance: TranscodeStatusConsumer;
  private client: RedisClientType;
  private stopped = false;

  private constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.client.on("error", (error) =>
      console.error("Transcode status client error:", error)
    );
  }

  public static getInstance() {
    if (!this.instance) this.instance = new TranscodeStatusConsumer();
    return this.instance;
  }

  public stop() {
    this.stopped = true;
  }

  public async start() {
    try {
      await this.client.connect();
    } catch (error) {
      console.error("Could not connect transcode status consumer:", error);
      return;
    }

    console.log(`Listening for transcode status on "${TRANSCODE_STATUS_KEY}"`);
    void this.listen();
  }

  /**
   * A bad payload or a dead row must not end the loop — the same failure mode
   * that once stopped all playback sync for the life of the process.
   */
  private async listen() {
    while (!this.stopped) {
      try {
        const response = await this.client.brPop(TRANSCODE_STATUS_KEY, 0);
        if (!response) continue;

        const message = JSON.parse(
          response.element
        ) as Partial<TranscodeStatusMessage>;

        await this.apply(message);
      } catch (error) {
        console.error("Error processing transcode status:", error);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  private async apply(message: Partial<TranscodeStatusMessage>) {
    if (!message?.videoId || !message.status) {
      console.error("Malformed transcode status, dropping:", message);
      return;
    }

    const data: Record<string, unknown> = { status: message.status };

    if (message.status === "READY") {
      const ready = message as Extract<
        TranscodeStatusMessage,
        { status: "READY" }
      >;
      // durationMs is nullable: an ffprobe failure should not block READY.
      if (typeof ready.durationMs === "number") {
        data.durationMs = ready.durationMs;
      }
      if (Array.isArray(ready.variants)) data.variants = ready.variants;
      // Clear any reason left over from an earlier failed attempt.
      data.failureReason = null;
    }

    if (message.status === "FAILED") {
      data.failureReason =
        (message as Extract<TranscodeStatusMessage, { status: "FAILED" }>)
          .failureReason ?? "Transcode failed.";
    }

    try {
      await prismaClient.video.update({
        where: { id: message.videoId },
        data: data as { status: VideoStatus },
      });
      console.log(`Video ${message.videoId} → ${message.status}`);
    } catch (error) {
      // Most likely the row was deleted between upload and completion. Log and
      // move on rather than retrying a job whose target no longer exists.
      console.error(
        `Could not apply ${message.status} to video ${message.videoId}:`,
        error
      );
    }
  }
}

export const transcodeStatusConsumer = TranscodeStatusConsumer.getInstance();
