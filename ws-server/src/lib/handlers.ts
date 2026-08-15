import WebSocket, { RawData } from "ws";
import { roomManager } from "./managers/roomManager";
import { webSocketHelper } from "./helper";
import type { ClientMessage } from "../types";

const MAX_CHAT_LENGTH = 1000;

export async function handleIncomingRequests(message: RawData, ws: WebSocket) {
  let parsed: ClientMessage;

  try {
    parsed = JSON.parse(message.toString());
  } catch {
    webSocketHelper.sendError(ws, "Malformed message.");
    return;
  }

  const validation = webSocketHelper.validateMessage(parsed);
  if (!validation.isValid) {
    // A bad frame is a client bug, not a reason to drop the whole session —
    // the previous behaviour closed the socket and killed the watch party.
    webSocketHelper.sendError(ws, validation.error!);
    return;
  }

  try {
    switch (parsed.type) {
      case "room:join":
        roomManager.joinRoom(parsed.roomId, ws, {
          memberId: parsed.memberId,
          name: parsed.name,
          role: parsed.role ?? "VIEWER",
        });
        break;

      case "room:leave":
        roomManager.leaveRoom(parsed.roomId, ws);
        break;

      case "chat:message":
        roomManager.broadcastChatMessage(
          parsed.roomId,
          ws,
          parsed.chatMessage.slice(0, MAX_CHAT_LENGTH)
        );
        break;

      case "reaction:send":
        roomManager.broadcastReaction(parsed.roomId, ws, parsed.emoji);
        break;

      default:
        webSocketHelper.sendError(
          ws,
          `Unhandled message type: ${(parsed as { type: string }).type}`
        );
    }
  } catch (error) {
    console.error("Error handling message:", error);
    webSocketHelper.sendError(ws, "An internal server error occurred.");
  }
}

export function handleConnectionClosed(ws: WebSocket) {
  roomManager.leaveAllRooms(ws);
}
