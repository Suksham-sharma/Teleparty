import { createClient, RedisClientType } from "redis";

class RedisManager {
  static instance: RedisManager;
  private queueClient: RedisClientType;
  private publisherClient: RedisClientType;

  constructor() {
    this.queueClient = createClient();
    this.publisherClient = createClient();
    this.queueClient.connect();
    this.publisherClient.connect();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  async getDataFromQueue() {
    try {
      const response = await this.queueClient.brPop("video-transcode", 0);
      if (!response) {
        throw new Error("Error getting data from queue");
      }

      const IncomingData = JSON.parse(response.element);

      return IncomingData;
    } catch (error: any) {
      console.log("Error getting data from queue", error);
    }
  }

  async publishDataToServer() {}
}

export const redisManager = RedisManager.getInstance();
