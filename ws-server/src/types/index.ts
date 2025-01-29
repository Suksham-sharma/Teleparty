import { WebSocket } from "ws";

interface RoomData {
  roomId: string;
  ownerId?: string;
  members: WebSocket[];
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
  roomId: string;
  message: string;
}

export { RoomData, videoUpdateData, chatMessageData };
