import WebSocket from "ws";
import {
  RoomData,
  videoUpdateData,
  chatMessageData,
  BroadcastData,
  ResponseMessageData,
} from "../../types";

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

  private broadcastToRoom(type: string, roomId: string, data: BroadcastData) {
    const { userId, username, message } = data;
    const room = this.rooms.get(roomId);
    if (!message) return;
    if (!room) return;

    const messageData: ResponseMessageData = {
      type,
      message,
      totalMembers: room.members.size,
    };

    if (userId) messageData.userId = userId;
    if (username) messageData.username = username;

    if (type != "chat:message") {
      messageData.videoId = room.currentVideoId;
      messageData.currentTime = room.currentVideoTime;
      messageData.isCurrentlyPlaying = room.isCurrentlyPlaying;
    }

    const formattedMessage = JSON.stringify(messageData);

    room.connections.forEach((connection) => {
      connection.send(formattedMessage);
    });

    console.log(
      `[${type}] Broadcasting to room ${roomId}: ${formattedMessage}`
    );
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

  private initializeRoom(roomId: string) {
    const room = {
      roomId,
      connections: [],
      members: new Set<string>(),
      currentVideoTime: "0:00",
      isCurrentlyPlaying: false,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  public handleVideoUpdate(data: videoUpdateData) {
    const { userId, roomId, videoId, action, currentTime } = data;
    let room = this.rooms.get(roomId);

    if (!room && action !== "update") return;
    if (!room) room = this.initializeRoom(roomId);

    switch (action) {
      case "update": {
        room.currentVideoId = videoId;
        room.currentVideoTime = "0:00";
        room.isCurrentlyPlaying = false;
        room.ownerId = userId;
        break;
      }
      case "timestamp": {
        if (currentTime) room.currentVideoTime = currentTime;
        break;
      }
      default:
        room.isCurrentlyPlaying = action === "play";
    }

    this.broadcastVideoUpdate(roomId);
  }

  private broadcastVideoUpdate(roomId: string) {
    this.broadcastToRoom("video:update", roomId, {
      message: "video stats updated",
    });
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
