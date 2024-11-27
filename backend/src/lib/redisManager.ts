import { createClient, type RedisClientType } from "redis";

interface data {
  action: "new-add" | "update-time";
  videoId: string;
  timestamp?: number;
}

class RedisManager {
  static instance: RedisManager;
  private publisherClient: RedisClientType;
  constructor() {
    try {
      this.publisherClient = createClient();
      this.publisherClient.connect();
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

  sendUpdatesToWs = async (data: data) => {
    console.log("Sending data to Redis", data);
    this.publisherClient.lPush("video-Data", JSON.stringify(data));
  };
}

export const redisManager = RedisManager.getInstance();
