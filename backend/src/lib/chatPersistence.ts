import { createClient, type RedisClientType } from "redis";
import prismaClient from "./prismaClient";
import { REDIS_URL } from "./config";
import { CHAT_QUEUE_KEY } from "./redisManager";
import {
  authorIdsIn,
  buildChatRows,
  parseChatBatch,
  type ChatAuthor,
} from "./chatBatch";

const BATCH_LINGER_MS = 500;
const MAX_BATCH = 200;

class ChatPersistence {
  private static instance: ChatPersistence;
  private client: RedisClientType;
  private stopped = false;

  private constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.client.on("error", (error) =>
      console.error("Chat persistence client error:", error)
    );
  }

  public static getInstance() {
    if (!this.instance) this.instance = new ChatPersistence();
    return this.instance;
  }

  public stop() {
    this.stopped = true;
  }

  public async start() {
    try {
      await this.client.connect();
    } catch (error) {
      console.error("Could not connect chat persistence consumer:", error);
      return;
    }

    console.log(`Persisting chat from "${CHAT_QUEUE_KEY}"`);
    void this.listen();
  }

  private async listen() {
    while (!this.stopped) {
      try {
        const first = await this.client.brPop(CHAT_QUEUE_KEY, 0);
        if (!first) continue;

        await new Promise((resolve) => setTimeout(resolve, BATCH_LINGER_MS));

        const rest =
          (await this.client.rPopCount(CHAT_QUEUE_KEY, MAX_BATCH - 1)) ?? [];

        await this.persist([first.element, ...rest]);
      } catch (error) {
        console.error("Error persisting chat batch:", error);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  private async persist(elements: string[]) {
    const { messages, dropped } = parseChatBatch(elements);
    if (dropped > 0) {
      console.error(`Dropped ${dropped} malformed chat message(s)`);
    }
    if (messages.length === 0) return;

    const authors = (await prismaClient.roomMember.findMany({
      where: { id: { in: authorIdsIn(messages) } },
      select: {
        id: true,
        userId: true,
        roomId: true,
        room: { select: { code: true } },
      },
    })) as ChatAuthor[];

    const rows = buildChatRows(messages, authors);
    if (rows.length === 0) return;

    const { count } = await prismaClient.message.createMany({
      data: rows,
      skipDuplicates: true,
    });

    if (count !== messages.length) {
      console.log(`Persisted ${count} of ${messages.length} chat messages`);
    }
  }
}

export const chatPersistence = ChatPersistence.getInstance();
