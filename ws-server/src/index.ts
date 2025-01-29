import { WebSocketServer } from "ws";
import http from "http";
import { handleIncomingRequests, handleConnectionClosed } from "./lib/handlers";
import { webSocketHelper } from "./lib/helper";
import { roomManager } from "./lib/managers/roomManager";
import { redisManager } from "./lib/managers/redisManager";
import { webSocketManager } from "./lib/managers/webSocketManager";

const server = http.createServer();
const wss = new WebSocketServer({ server });

interface RoomUpdateData {
  userId: string;
  roomId: string;
  timestamp?: number;
}

wss.on("connection", (ws) => {
  console.log(`${new Date().toISOString()} New client connected`);

  ws.on("error", (error) => {
    console.log("WebSocket error:", error);
    webSocketHelper.sendErrorAndClose(ws, "An internal server error occurred");
  });

  ws.on("message", (message) => {
    handleIncomingRequests(message, ws);
  });

  ws.on("close", () => {
    const userId = webSocketManager.removeConnection(ws);
    if (userId) {
      handleConnectionClosed(ws, userId);
    }
  });
});

async function startServer() {
  try {
    await redisManager.connect();

    server.listen(8080, () => {
      console.log("Server is listening on port 8080");
    });
    redisManager.listenForVideoUpdates();
  } catch (error) {
    console.log("Server error:", error);
  }
}

startServer();
