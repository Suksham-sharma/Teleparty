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

  private broadcastToRoom(type: string, roomId: string, data: any) {
    const { userId, username, message } = data;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageData: any = {
      type,
      message,
      totalMembers: room.members.size,
    };

    if (userId) messageData.userId = userId;
    if (username) messageData.username = username;

    const formattedMessage = JSON.stringify(messageData);

    room.connections.forEach((connection) => {
      connection.send(formattedMessage);
    });
  }

  public joinRoom(roomId: string, ws: WebSocket, userId: string) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        connections: [],
        members: new Set(),
      };
      this.rooms.set(roomId, room);
    }

    room.connections.push(ws);
    room.members.add(userId);

    this.broadcastToRoom("room:join", roomId, {
      message: "A user joined the room",
      userId,
    });
  }

  public leaveRoom(roomId: string, ws: WebSocket, userId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.connections = room.connections.filter((conn) => conn !== ws);
      room.members.delete(userId);

      this.broadcastToRoom("room:leave", roomId, {
        message: `A user left the room.`,
        userId,
      });

      if (room.connections.length === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  public broadcastVideoUpdate(data: videoUpdateData) {
    const { userId, roomId, videoId } = data;
    this.broadcastToRoom("video:update", roomId, { message: videoId, userId });
  }

  public broadcastChatMessage(data: chatMessageData) {
    const { userId, username, roomId, message } = data;
    this.broadcastToRoom("chat:message", roomId, { message, userId, username });
  }

  public leaveAllRooms(ws: WebSocket, userId: string): void {
    this.rooms.forEach((room, roomId) => {
      if (room.connections.includes(ws)) {
        this.leaveRoom(roomId, ws, userId);
      }
    });
  }
}

export const roomManager = RoomManager.getInstance();
