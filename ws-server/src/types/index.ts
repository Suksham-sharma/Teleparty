import { WebSocket } from "ws";

type videoAction = "play" | "pause" | "update" | "timestamp";

interface BroadcastData {
  userId?: string;
  username?: string;
  message: string;
}

interface MessageData {
  type: string;
  message: string;
  totalMembers: number;
  userId?: string;
  username?: string;
  videoId?: string;
  currentTime?: string;
  isCurrentlyPlaying?: boolean;
}

interface RoomData {
  roomId: string;
  ownerId?: string;
  connections: WebSocket[];
  members: Set<string>;
  currentVideoId?: string;
  currentVideoTime?: string;
  isCurrentlyPlaying?: boolean;
}

interface videoUpdateData {
  userId: string;
  roomId: string;
  videoId: string;
  action: videoAction;
  currentTime?: string;
}

interface chatMessageData {
  userId: string;
  username: string;
  roomId: string;
  message: string;
}

export {
  RoomData,
  videoUpdateData,
  chatMessageData,
  BroadcastData,
  MessageData as ResponseMessageData,
};
