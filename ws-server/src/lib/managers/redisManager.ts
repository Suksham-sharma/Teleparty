import { createClient, type RedisClientType } from "redis";
import { roomManager } from "./roomManager";
import type { QueueMessage } from "../../types";

const WS_QUEUE_KEY = "video-Data";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

class RedisManager {
  private static instance: RedisManager;
  private client: RedisClientType;
  private stopped = false;

  private constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.client.on("error", (error) =>
      console.error("Redis client error:", error)
    );
  }

  public static getInstance() {
    if (!this.instance) this.instance = new RedisManager();
    return this.instance;
  }

  public async connect() {
    await this.client.connect();
    console.log("Connected to Redis");
  }

  public stop() {
    this.stopped = true;
  }

  /**
   * Long-poll the API's event list. A parse failure or a bad payload must not
   * end the loop — previously any throw here silently stopped *all* playback
   * sync for the lifetime of the process.
   */
  public async listenForVideoUpdates() {
    while (!this.stopped) {
      try {
        const response = await this.client.brPop(WS_QUEUE_KEY, 0);
        if (!response) continue;

        const message = JSON.parse(response.element) as QueueMessage;
        roomManager.handleQueueMessage(message);
      } catch (error) {
        console.error("Error processing queue message:", error);
        // Back off briefly so a persistent failure can't spin the CPU.
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
}

export const redisManager = RedisManager.getInstance();
