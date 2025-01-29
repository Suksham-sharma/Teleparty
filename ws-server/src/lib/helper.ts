import WebSocket from "ws";

class WebSocketHelper {
  constructor() {}

  sendErrorAndClose(ws: WebSocket, message: string) {
    const errorResponse = {
      type: "error",
      message,
    };

    ws.send(JSON.stringify(errorResponse));
    ws.close();
  }

  validateMessage(message: any) {
    if (!message.type || !message.roomId) {
      return {
        isValid: false,
        error: "Missing required fields: type and roomId are required",
      };
    }

    if (
      message.type === "chat:message" &&
      (!message.chatMessage || !message.userId || !message.username)
    ) {
      return {
        isValid: false,
        error:
          "Missing required fields: chatMessage and userId are required for chat messages",
      };
    }

    return { isValid: true };
  }
}

export const webSocketHelper = new WebSocketHelper();
