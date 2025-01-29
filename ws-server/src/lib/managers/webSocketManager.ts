import WebSocket from "ws";

class WebSocketManager {
  private static instance: WebSocketManager;
  private wsToUserMap: Map<WebSocket, string> = new Map();

  private constructor() {}

  public static getInstance() {
    if (!this.instance) {
      this.instance = new WebSocketManager();
    }
    return this.instance;
  }

  public setUserId(ws: WebSocket, userId: string) {
    this.wsToUserMap.set(ws, userId);
  }

  public removeConnection(ws: WebSocket) {
    const userId = this.wsToUserMap.get(ws);
    this.wsToUserMap.delete(ws);
    return userId;
  }
}

export const webSocketManager = WebSocketManager.getInstance();
