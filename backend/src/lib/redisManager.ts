import { createClient, type RedisClientType } from "redis";

type VideoAction = "play" | "pause" | "update" | "timestamp";

interface BaseRedisMessage {
  userId: string;
  roomId: string;
  videoId: string;
  action: VideoAction;
}

interface TimestampMessage extends BaseRedisMessage {
  action: "timestamp";
  currentTime: string;
}

interface VideoControlMessage extends BaseRedisMessage {
  action: "play" | "pause" | "update";
}

type RedisMessage = TimestampMessage | VideoControlMessage;

class RedisManager {
  static instance: RedisManager;
  private queueClient: RedisClientType;
  private subscribeClient: RedisClientType;
  constructor() {
    try {
      this.queueClient = createClient();
      this.queueClient.connect();
      this.subscribeClient = createClient();
      this.subscribeClient.connect();
      console.log("Connected to Redis Clients 🚀");
    } catch (error) {
      throw new Error(`Error connecting to Redis: ${error}`);
    }
  }

  public static getInstance() {
    if (!this.instance) {
      console.log("Creating new instance of RedisManager");
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  private generateRandomId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  sendToWorkerAndSubscribe = async (key: string) => {
    try {
      const id = this.generateRandomId();
      await this.subscribeClient.subscribe(id, (message: any) => {});

      console.log("Sending data to worker", { key: key, requestId: id });

      await this.queueClient.lPush(
        "video-transcode",
        JSON.stringify({ key: key, requestId: id })
      );
    } catch (error: any) {
      console.log("Error sending data to worker", error);
    }
  };

  sendUpdatesToWs = async (data: RedisMessage) => {
    console.log("Sending data to Redis", data);
    this.queueClient.lPush("video-Data", JSON.stringify(data));
  };
}

export const redisManager = RedisManager.getInstance();
