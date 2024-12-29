import { createClient, type RedisClientType } from "redis";

interface data {
  user_id: string;
  videoId: string;
  timestamp?: number;
}

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

  sendUpdatesToWs = async (data: data) => {
    console.log("Sending data to Redis", data);
    this.queueClient.lPush("video-Data", JSON.stringify(data));
  };
}

export const redisManager = RedisManager.getInstance();
