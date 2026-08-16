import { createClient, RedisClientType } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const TRANSCODE_QUEUE_KEY = "video-transcode";
export const TRANSCODE_STATUS_KEY = "video-status";

export type Variant = {
  height: number;
  bandwidth: number;
  playlist: string;
};

/**
 * The worker has no Prisma client, so completion travels back to the API on a
 * list of its own rather than being written to Postgres here. The backend
 * consumer is the only thing that touches the `Video` row.
 *
 * Same convention as the other two queues: `lPush` here, `brPop` there, which
 * makes it FIFO. It is a list and not pub/sub, so exactly one API instance
 * receives each message — fine, because the handler is an idempotent update.
 */
export type TranscodeStatusMessage =
  | { videoId: string; status: "TRANSCODING" }
  | {
      videoId: string;
      status: "READY";
      durationMs: number | null;
      variants: Variant[];
    }
  | { videoId: string; status: "FAILED"; failureReason: string };

class RedisManager {
  static instance: RedisManager;
  private queueClient: RedisClientType;
  private publisherClient: RedisClientType;
  private ready: Promise<unknown>;

  constructor() {
    this.queueClient = createClient({ url: REDIS_URL });
    this.publisherClient = createClient({ url: REDIS_URL });

    for (const client of [this.queueClient, this.publisherClient]) {
      client.on("error", (error) => console.error("Redis client error:", error));
    }

    // Connections were previously fired and forgotten, so the first job could
    // race the socket being open.
    this.ready = Promise.all([
      this.queueClient.connect(),
      this.publisherClient.connect(),
    ]).catch((error) => {
      console.error("Could not connect to Redis:", error);
      throw error;
    });
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  async getDataFromQueue() {
    await this.ready;
    // A throw here must not end the consume loop, so failures are reported and
    // swallowed; the caller treats undefined as "nothing to do".
    try {
      const response = await this.queueClient.brPop(TRANSCODE_QUEUE_KEY, 0);
      if (!response) return undefined;
      return JSON.parse(response.element);
    } catch (error) {
      console.error("Error getting data from queue:", error);
      return undefined;
    }
  }

  /**
   * Report progress back to the API. Never throws: losing a status update must
   * not abort a transcode that has already done the expensive work.
   */
  async publishDataToServer(message: TranscodeStatusMessage) {
    try {
      await this.ready;
      await this.publisherClient.lPush(
        TRANSCODE_STATUS_KEY,
        JSON.stringify(message)
      );
      console.log(`Reported ${message.status} for ${message.videoId}`);
    } catch (error) {
      console.error("Error publishing transcode status:", error);
    }
  }
}

export const redisManager = RedisManager.getInstance();
