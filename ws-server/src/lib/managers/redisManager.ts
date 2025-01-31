import { createClient, type RedisClientType } from "redis";
import { roomManager } from "./roomManager";

class RedisManager {
  private static instance: RedisManager;
  private client: RedisClientType;

  private constructor() {
    this.client = createClient();
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  public async connect() {
    try {
      await this.client.connect();
      console.log("Connected to Redis");
    } catch (error) {
      console.log("Redis connection error:", error);
    }
  }

  public async listenForVideoUpdates() {
    try {
      while (true) {
        const response = await this.client.brPop("video-Data", 0);
        if (response) {
          const data = JSON.parse(response.element);
          console.log("Received video update:", data);
          roomManager.handleVideoUpdate({
            userId: data.userId,
            roomId: data.roomId,
            videoId: data.videoId,
            action: data.action,
            currentTime: data.currentTime,
          });
        }
      }
    } catch (error) {
      console.log("Error listening for video updates:", error);
    }
  }
}

export const redisManager = RedisManager.getInstance();
