import { createClient, type RedisClientType } from "redis";
import type { ChatMessage } from "../../types";

const CHAT_QUEUE_KEY = "chat-persist";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export interface ChatPersistMessage extends ChatMessage {
  code: string;
}

class ChatQueue {
  private static instance: ChatQueue;
  private client: RedisClientType;
  private ready = false;

  private constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.client.on("error", (error) =>
      console.error("Chat queue client error:", error)
    );
  }

  public static getInstance() {
    if (!this.instance) this.instance = new ChatQueue();
    return this.instance;
  }

  public async connect() {
    await this.client.connect();
    this.ready = true;
    console.log(`Persisting chat via "${CHAT_QUEUE_KEY}"`);
  }

  public push(code: string, message: ChatMessage) {
    if (!this.ready) return;

    const payload: ChatPersistMessage = { ...message, code };

    this.client
      .lPush(CHAT_QUEUE_KEY, JSON.stringify(payload))
      .catch((error) => console.error("Could not queue chat message:", error));
  }
}

export const chatQueue = ChatQueue.getInstance();
