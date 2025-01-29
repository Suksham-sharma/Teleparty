import WebSocket, { RawData } from "ws";
import { roomManager } from "./managers/roomManager";
import { webSocketHelper } from "./helper";

export async function handleIncomingRequests(message: RawData, ws: WebSocket) {
  try {
    console.log("Received message", message.toString());
    const parsedMessage = JSON.parse(message.toString());
    const { type, roomId, userId, chatMessage } = parsedMessage;

    const validation = webSocketHelper.validateMessage(parsedMessage);
    if (!validation.isValid) {
      webSocketHelper.sendErrorAndClose(ws, validation.error!);
      return;
    }

    switch (type) {
      case "room:join":
        roomManager.joinRoom(roomId, ws);
        break;
      case "room:leave":
        roomManager.leaveRoom(roomId, ws);
        break;
      case "chat:message":
        roomManager.broadcastChatMessage({
          userId,
          roomId,
          message: chatMessage,
        });
        break;
      default:
        console.log(`Unhandled message type: ${type}`);
    }
  } catch (error) {
    console.log("Error handling incoming request:", error);
    webSocketHelper.sendErrorAndClose(ws, "An internal server error occurred");
  }
}

export async function handleConnectionClosed(ws: WebSocket) {
  roomManager.leaveAllRooms(ws);
}
