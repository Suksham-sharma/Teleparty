import { createClient } from "redis";
import WebSocket, { RawData, WebSocketServer } from "ws";
import http from "http";
const server = http.createServer();

const redisClient = createClient();
const wss = new WebSocketServer({ server });

interface data {
  action: "new-add" | "update-time";
  videoId: string;
  timestamp?: number;
}

export const SubsriptionData: {
  videoId: string;
  subscribers: WebSocket[];
}[] = [];

function sendUpdatesToWs(data: data) {
  const { action, videoId, timestamp } = data;
  SubsriptionData.forEach((sub) => {
    if (sub.videoId === videoId) {
      sub.subscribers.forEach((subscriber) => {
        subscriber.send(JSON.stringify({ action, videoId, timestamp }));
      });
    }
  });
}

async function handleIncomingRequests(message: RawData, ws: WebSocket) {
  console.log("Received message", message.toString());
  const { type, video_id } = JSON.parse(message.toString());

  if (type === "video:subscribe") {
    let subscription = SubsriptionData.find((sub) => sub.videoId === video_id);
    if (!subscription) {
      subscription = {
        videoId: video_id,
        subscribers: [],
      };
      SubsriptionData.push(subscription);
    }
    subscription.subscribers.push(ws);
    ws.send("Subscribed");

    console.log("SubsriptionData", SubsriptionData);
  }
  if (type === "video:unsubscribe") {
    SubsriptionData.forEach((sub) => {
      if (sub.videoId === video_id) {
        sub.subscribers = sub.subscribers.filter(
          (subscriber: any) => subscriber !== ws
        );
      }
    });
    ws.send("Unsubscribed");
  }
}

async function handleConnectionClosed(ws: WebSocket) {}

wss.on("connection", (ws) => {
  console.log(`${new Date().toISOString()} New client connected`);
  ws.send("connection successfull");
  ws.on("error", console.error);

  ws.on("message", (message) => {
    handleIncomingRequests(message, ws);
  });

  ws.on("close", () => {
    handleConnectionClosed(ws);
  });
});

async function startServer() {
  try {
    await redisClient.connect();
    console.log("Connected to Redis");

    server.listen(8080, function () {
      console.log(" Server is listening on port 8080");
    });

    while (true) {
      const response = await redisClient.brPop("video-Data", 0);
      if (response) {
        console.log("Received message from Redis", response);
        console.log("Data after stringifying", JSON.parse(response?.element));
        sendUpdatesToWs(JSON.parse(response?.element));
      }
    }
  } catch (err) {
    console.error(err);
  }
}

startServer();
