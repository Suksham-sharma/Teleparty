import WebSocket from "ws";
import { randomUUID } from "crypto";
import { chatQueue } from "./chatQueue";
import type {
  ChatMessage,
  Participant,
  QueueMessage,
  RoomData,
} from "../../types";

const RECENT_MESSAGE_LIMIT = 50;

/**
 * Rooms are keyed by the human room code (WOLF-42), the same identifier that
 * appears in the /r/{code} URL and in every API call. A room here is pure
 * fanout state; the durable record lives in Postgres.
 *
 * Membership is a Map<socket, Participant> rather than a parallel array + Set,
 * so a disconnect removes the identity and the socket in one step and the
 * member list can never drift out of sync with the connection list.
 */
class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomData> = new Map();

  private constructor() {}

  public static getInstance() {
    if (!this.instance) this.instance = new RoomManager();
    return this.instance;
  }

  private getOrCreate(code: string): RoomData {
    let room = this.rooms.get(code);
    if (!room) {
      room = {
        code,
        connections: new Map(),
        currentVideoTime: "0",
        isCurrentlyPlaying: false,
        recentMessages: [],
      };
      this.rooms.set(code, room);
    }
    return room;
  }

  private send(ws: WebSocket, payload: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private broadcast(code: string, payload: unknown, except?: WebSocket) {
    const room = this.rooms.get(code);
    if (!room) return;

    const message = JSON.stringify(payload);
    room.connections.forEach((_participant, socket) => {
      if (socket !== except && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });
  }

  /**
   * One entry per *person*, not per socket. Someone with the room open in two
   * tabs is still one participant — without this the roster reports them twice
   * and duplicate ids break list rendering on the client.
   */
  private roster(room: RoomData): Participant[] {
    const byMember = new Map<string, Participant>();
    room.connections.forEach((participant) => {
      byMember.set(participant.memberId, participant);
    });
    return Array.from(byMember.values());
  }

  private presence(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    const members = this.roster(room);
    this.broadcast(code, {
      type: "room:presence",
      members,
      totalMembers: members.length,
    });
  }

  /** Does this person still have any other socket open in the room? */
  private stillPresent(room: RoomData, memberId: string) {
    return Array.from(room.connections.values()).some(
      (p) => p.memberId === memberId
    );
  }

  /**
   * Join, then immediately hand the newcomer everything they need to be in
   * sync: current video, position, play state, roster and recent chat. Without
   * this a late joiner sees a blank player until the host happens to act.
   */
  public joinRoom(code: string, ws: WebSocket, participant: Participant) {
    const room = this.getOrCreate(code);
    const isReconnect = this.stillPresent(room, participant.memberId);
    room.connections.set(ws, participant);

    const members = this.roster(room);

    this.send(ws, {
      type: "room:snapshot",
      roomId: code,
      videoId: room.currentVideoId,
      currentTime: room.currentVideoTime,
      isCurrentlyPlaying: room.isCurrentlyPlaying,
      members,
      totalMembers: members.length,
      messages: room.recentMessages,
    });

    // A second tab from someone already here is not a new arrival.
    if (!isReconnect) {
      this.broadcast(
        code,
        {
          type: "room:join",
          memberId: participant.memberId,
          name: participant.name,
          totalMembers: members.length,
        },
        ws
      );
      this.presence(code);
    }
  }

  public leaveRoom(code: string, ws: WebSocket) {
    const room = this.rooms.get(code);
    if (!room) return;

    const participant = room.connections.get(ws);
    if (!participant) return;

    room.connections.delete(ws);

    if (room.connections.size === 0) {
      // Nobody left to fan out to. Postgres holds the durable state, so the
      // room rehydrates from the API snapshot when someone returns.
      this.rooms.delete(code);
      return;
    }

    // Closing one of several tabs is not leaving the room.
    if (this.stillPresent(room, participant.memberId)) return;

    this.broadcast(code, {
      type: "room:leave",
      memberId: participant.memberId,
      name: participant.name,
      totalMembers: this.roster(room).length,
    });

    this.presence(code);
  }

  public leaveAllRooms(ws: WebSocket) {
    Array.from(this.rooms.keys()).forEach((code) => {
      if (this.rooms.get(code)?.connections.has(ws)) this.leaveRoom(code, ws);
    });
  }

  public broadcastChatMessage(code: string, ws: WebSocket, body: string) {
    const room = this.rooms.get(code);
    const participant = room?.connections.get(ws);
    if (!room || !participant) return;

    const message: ChatMessage = {
      id: randomUUID(),
      memberId: participant.memberId,
      name: participant.name,
      body,
      sentAt: new Date().toISOString(),
    };

    room.recentMessages.push(message);
    if (room.recentMessages.length > RECENT_MESSAGE_LIMIT) {
      room.recentMessages.shift();
    }

    this.broadcast(code, { type: "chat:message", ...message });
    chatQueue.push(code, message);
  }

  private evict(code: string, memberId: string) {
    const room = this.rooms.get(code);
    if (!room) return;

    const sockets = Array.from(room.connections.entries())
      .filter(([, participant]) => participant.memberId === memberId)
      .map(([socket]) => socket);

    if (sockets.length === 0) return;

    sockets.forEach((socket) => {
      room.connections.delete(socket);
      this.send(socket, { type: "room:removed", roomId: code });
    });

    this.broadcast(code, {
      type: "room:roles-updated",
      roomId: code,
    });

    if (room.connections.size === 0) this.rooms.delete(code);
    else this.presence(code);
  }

  public broadcastReaction(code: string, ws: WebSocket, emoji: string) {
    const participant = this.rooms.get(code)?.connections.get(ws);
    if (!participant) return;

    this.broadcast(code, {
      type: "reaction:send",
      memberId: participant.memberId,
      name: participant.name,
      emoji,
      videoTime: this.rooms.get(code)?.currentVideoTime,
    });
  }

  /** Playback and room events relayed from the API via Redis. */
  public handleQueueMessage(message: QueueMessage) {
    const code = message.roomId;

    if (message.kind === "room") {
      // Only meaningful if someone is actually connected.
      if (!this.rooms.has(code)) return;
      this.broadcast(code, { type: message.type, roomId: code });
      if (message.type === "room:ended") this.rooms.delete(code);
      return;
    }

    if (message.kind === "member") {
      this.evict(code, message.memberId);
      return;
    }

    // A video change may arrive before anyone has connected (the host picks a
    // film, then shares the link), so create the room to hold that state.
    const room =
      message.action === "update"
        ? this.getOrCreate(code)
        : this.rooms.get(code);
    if (!room) return;

    switch (message.action) {
      case "update":
        room.currentVideoId = message.videoId;
        room.currentVideoTime = "0";
        room.isCurrentlyPlaying = false;
        break;
      case "timestamp":
        if (message.currentTime) room.currentVideoTime = message.currentTime;
        break;
      default:
        room.isCurrentlyPlaying = message.action === "play";
        if (message.currentTime) room.currentVideoTime = message.currentTime;
    }

    this.broadcast(code, {
      type: "video:update",
      roomId: code,
      videoId: room.currentVideoId,
      currentTime: room.currentVideoTime,
      isCurrentlyPlaying: room.isCurrentlyPlaying,
      totalMembers: this.roster(room).length,
    });
  }
}

export const roomManager = RoomManager.getInstance();
