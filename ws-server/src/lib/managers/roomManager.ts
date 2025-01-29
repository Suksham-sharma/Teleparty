import WebSocket from "ws";

interface RoomData {
  roomId: string;
  ownerId?: string;
  members: WebSocket[];
  currentVideoId?: string;
  currentVideoTime?: string;
}

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
  }

  public leaveRoom(roomId: string, ws: WebSocket): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.members = room.members.filter((member) => member !== ws);
      if (room.members.length === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  public broadcastVideoUpdate(data: {
    userId: string;
    roomId: string;
    videoId?: number;
  }) {
    const { userId, roomId, videoId } = data;
    const room = this.rooms.get(roomId);

    if (room) {
      room.members.forEach((member) => {
        member.send(
          JSON.stringify({
            type: "video:update",
            userId,
            videoId,
          })
        );
      });
    }
  }

  public broadcastChatMessage(data: {
    userId: string;
    roomId: string;
    message: string;
  }): void {
    const { userId, roomId, message } = data;
    const room = this.rooms.get(roomId);

    if (room) {
      room.members.forEach((member) => {
        member.send(
          JSON.stringify({
            type: "chat:message",
            userId,
            message,
          })
        );
      });
    }
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
