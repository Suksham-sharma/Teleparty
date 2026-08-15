import { createClient, type RedisClientType } from "redis";
import { REDIS_URL } from "./config";

type VideoAction = "play" | "pause" | "update" | "timestamp";

/**
 * Everything the API pushes to the ws-server travels on one list as a tagged
 * union, so the consumer can switch exhaustively instead of guessing from the
 * shape of the payload.
 *
 * Note this is a Redis *list* (`brPop`), not pub/sub: exactly one ws-server
 * instance receives each message. Multi-instance fanout requires pub/sub —
 * tracked in docs/REBUILD.md Phase 5.
 */
export type WsQueueMessage =
  | {
      kind: "video";
      roomId: string;
      userId: string;
      videoId: string;
      action: VideoAction;
      currentTime?: string;
    }
  | {
      kind: "room";
      roomId: string;
      type: "room:ended" | "queue:updated" | "room:roles-updated";
    };

export const WS_QUEUE_KEY = "video-Data";
export const TRANSCODE_QUEUE_KEY = "video-transcode";

class RedisManager {
  static instance: RedisManager;
  private queueClient: RedisClientType;

  constructor() {
    this.queueClient = createClient({ url: REDIS_URL });
    this.queueClient.on("error", (error) =>
      console.error("Redis client error:", error)
    );
    this.queueClient.connect().catch((error) => {
      console.error("Could not connect to Redis:", error);
    });
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  sendToWorkerAndSubscribe = async (key: string) => {
    try {
      await this.queueClient.lPush(
        TRANSCODE_QUEUE_KEY,
        JSON.stringify({ key, requestId: key })
      );
    } catch (error) {
      console.error("Error queueing transcode job:", error);
    }
  };

  /** Playback events: play/pause/seek/video-change. */
  sendUpdatesToWs = async (
    data: Omit<Extract<WsQueueMessage, { kind: "video" }>, "kind">
  ) => {
    await this.push({ kind: "video", ...data });
  };

  /** Non-playback room events: queue changes, role changes, room ended. */
  sendRoomEvent = async (
    data: Omit<Extract<WsQueueMessage, { kind: "room" }>, "kind">
  ) => {
    await this.push({ kind: "room", ...data });
  };

  private push = async (message: WsQueueMessage) => {
    try {
      await this.queueClient.lPush(WS_QUEUE_KEY, JSON.stringify(message));
    } catch (error) {
      console.error("Error publishing to ws queue:", error);
    }
  };
}

export const redisManager = RedisManager.getInstance();
