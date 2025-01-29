import WebSocket from "ws";
import { RoomData, videoUpdateData, chatMessageData } from "../../types";

class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomData> = new Map();

  private constructor() {}

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RoomManager();
    }
    return this.instance;
  }

  private broadcastToRoom(
    roomId: string,
    message: string,
    type: string,
    userId?: string
  ) {
    const room = this.rooms.get(roomId);

    const messageData: any = {
      type,
      message,
    };

    if (userId) messageData.userId = userId;

    const formattedMessage = JSON.stringify(messageData);

    if (room) {
      room.members.forEach((member) => {
        member.send(formattedMessage);
      });
    }
  }

  public joinRoom(roomId: string, ws: WebSocket) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        members: [],
      };
      this.rooms.set(roomId, room);
    }
    room.members.push(ws);
    this.broadcastToRoom(roomId, "User Joined", "room:join");
  }

  public leaveRoom(roomId: string, ws: WebSocket) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.members = room.members.filter((member) => member !== ws);
      this.broadcastToRoom(roomId, "A user has left the room", "room:leave");
      if (room.members.length === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  public broadcastVideoUpdate(data: videoUpdateData) {
    const { userId, roomId, videoId } = data;
    this.broadcastToRoom(roomId, videoId, "video:update", userId);
  }

  public broadcastChatMessage(data: chatMessageData) {
    const { userId, roomId, message } = data;
    this.broadcastToRoom(roomId, message, "chat:message", userId);
  }

  public leaveAllRooms(ws: WebSocket): void {
    for (const [roomId, room] of this.rooms) {
      room.members = room.members.filter((member) => member !== ws);
      if (room.members.length === 0) {
        this.rooms.delete(roomId);
      }
    }
  }
}

export const roomManager = RoomManager.getInstance();
