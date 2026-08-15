import { WebSocket } from "ws";

export type VideoAction = "play" | "pause" | "update" | "timestamp";

/** Who a socket belongs to. Mirrors the API's guest-or-user identity. */
export interface Participant {
  memberId: string;
  name: string;
  role: "HOST" | "COHOST" | "VIEWER";
}

export interface ChatMessage {
  id: string;
  memberId: string;
  name: string;
  body: string;
  sentAt: string;
}

export interface RoomData {
  code: string;
  connections: Map<WebSocket, Participant>;
  currentVideoId?: string;
  /** Seconds, as a string, matching the wire format the player emits. */
  currentVideoTime: string;
  isCurrentlyPlaying: boolean;
  /** Ring buffer for the catch-up snapshot a late joiner receives. */
  recentMessages: ChatMessage[];
}

/** Messages arriving from the API via the Redis list. */
export type QueueMessage =
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

/** Messages a client sends us. */
export type ClientMessage =
  | {
      type: "room:join";
      roomId: string;
      memberId: string;
      name: string;
      role?: Participant["role"];
    }
  | { type: "room:leave"; roomId: string }
  | { type: "chat:message"; roomId: string; chatMessage: string }
  | { type: "reaction:send"; roomId: string; emoji: string };
