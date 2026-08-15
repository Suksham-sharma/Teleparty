import { WebSocketServer } from "ws";
import http from "http";
import { handleIncomingRequests, handleConnectionClosed } from "./lib/handlers";
import { redisManager } from "./lib/managers/redisManager";

const PORT = Number(process.env.WS_PORT ?? 8080);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("error", (error) => console.error("WebSocket error:", error));
  ws.on("message", (message) => handleIncomingRequests(message, ws));
  ws.on("close", () => handleConnectionClosed(ws));
});

async function startServer() {
  try {
    await redisManager.connect();

    server.listen(PORT, () => {
      console.log(`ws-server listening on :${PORT}`);
    });

    // Runs for the life of the process.
    await redisManager.listenForVideoUpdates();
  } catch (error) {
    console.error("Fatal server error:", error);
    process.exit(1);
  }
}

startServer();
