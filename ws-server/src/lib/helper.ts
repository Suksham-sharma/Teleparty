import WebSocket from "ws";

class WebSocketHelper {
  /**
   * Report a problem without tearing the socket down. Closing on a single bad
   * frame used to eject the viewer from the watch party entirely.
   */
  sendError(ws: WebSocket, message: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "error", message }));
    }
  }

  sendErrorAndClose(ws: WebSocket, message: string) {
    this.sendError(ws, message);
    ws.close();
  }

  validateMessage(message: unknown): { isValid: boolean; error?: string } {
    if (typeof message !== "object" || message === null) {
      return { isValid: false, error: "Message must be an object." };
    }

    const m = message as Record<string, unknown>;

    if (typeof m.type !== "string" || typeof m.roomId !== "string") {
      return { isValid: false, error: "type and roomId are required." };
    }

    if (
      m.type === "room:join" &&
      (typeof m.memberId !== "string" || typeof m.name !== "string")
    ) {
      return {
        isValid: false,
        error: "memberId and name are required to join a room.",
      };
    }

    if (
      m.type === "chat:message" &&
      (typeof m.chatMessage !== "string" || m.chatMessage.trim() === "")
    ) {
      return { isValid: false, error: "chatMessage is required." };
    }

    if (m.type === "reaction:send" && typeof m.emoji !== "string") {
      return { isValid: false, error: "emoji is required." };
    }

    return { isValid: true };
  }
}

export const webSocketHelper = new WebSocketHelper();
