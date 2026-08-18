export const MAX_BODY_LENGTH = 1000;

export type ChatPersistMessage = {
  id: string;
  code: string;
  memberId: string;
  name: string;
  body: string;
  sentAt: string;
};

export type ChatAuthor = {
  id: string;
  userId: string | null;
  roomId: string;
  room: { code: string };
};

export type ChatRow = {
  id: string;
  roomId: string;
  authorLabel: string;
  userId: string | null;
  memberId: string;
  body: string;
  createdAt: Date;
};

const isPersistable = (
  message: Partial<ChatPersistMessage> | null
): message is ChatPersistMessage =>
  typeof message?.id === "string" &&
  typeof message.code === "string" &&
  typeof message.memberId === "string" &&
  typeof message.name === "string" &&
  typeof message.body === "string" &&
  message.body.length > 0;

export function parseChatBatch(elements: string[]): {
  messages: ChatPersistMessage[];
  dropped: number;
} {
  const messages: ChatPersistMessage[] = [];
  let dropped = 0;

  elements.forEach((element) => {
    let parsed: Partial<ChatPersistMessage> | null = null;
    try {
      parsed = JSON.parse(element);
    } catch {
      parsed = null;
    }

    if (isPersistable(parsed)) messages.push(parsed);
    else dropped += 1;
  });

  return { messages, dropped };
}

export function buildChatRows(
  messages: ChatPersistMessage[],
  authors: ChatAuthor[],
  now: Date = new Date()
): ChatRow[] {
  const byId = new Map(authors.map((author) => [author.id, author]));
  const rows: ChatRow[] = [];
  const claimed = new Set<string>();

  messages.forEach((message) => {
    const author = byId.get(message.memberId);
    if (!author) return;
    if (author.room.code !== message.code.toUpperCase()) return;
    if (claimed.has(message.id)) return;

    claimed.add(message.id);

    const sentAt = new Date(message.sentAt);

    rows.push({
      id: message.id,
      roomId: author.roomId,
      authorLabel: message.name,
      userId: author.userId,
      memberId: author.id,
      body: message.body.slice(0, MAX_BODY_LENGTH),
      createdAt: isNaN(sentAt.getTime()) ? now : sentAt,
    });
  });

  return rows;
}

export const authorIdsIn = (messages: ChatPersistMessage[]): string[] => [
  ...new Set(messages.map((message) => message.memberId)),
];
