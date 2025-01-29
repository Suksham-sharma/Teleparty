import { WebSocket } from "ws";

interface RoomData {
  roomId: string;
  ownerId?: string;
  connections: WebSocket[];
  members: Set<string>;
  currentVideoId?: string;
  currentVideoTime?: string;
}

interface videoUpdateData {
  userId: string;
  roomId: string;
  videoId: string;
}

interface chatMessageData {
  userId: string;
  username: string;
  roomId: string;
  message: string;
}

export { RoomData, videoUpdateData, chatMessageData };
