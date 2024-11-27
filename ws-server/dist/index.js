"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubsriptionData = void 0;
const redis_1 = require("redis");
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const server = http_1.default.createServer();
const redisClient = (0, redis_1.createClient)();
const wss = new ws_1.WebSocketServer({ server });
exports.SubsriptionData = [];
function sendUpdatesToWs(data) {
    const { user_id, videoId, timestamp } = data;
    exports.SubsriptionData.forEach((sub) => {
        if (sub.videoId === videoId) {
            sub.subscribers.forEach((subscriber) => {
                subscriber.send(JSON.stringify({
                    type: "video:timestamp_updated",
                    user_id,
                    timestamp,
                }));
            });
        }
    });
}
function handleIncomingRequests(message, ws) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Received message", message.toString());
        const { type, video_id } = JSON.parse(message.toString());
        if (type === "video:subscribe") {
            let subscription = exports.SubsriptionData.find((sub) => sub.videoId === video_id);
            if (!subscription) {
                subscription = {
                    videoId: video_id,
                    subscribers: [],
                };
                exports.SubsriptionData.push(subscription);
            }
            subscription.subscribers.push(ws);
            console.log("SubsriptionData", exports.SubsriptionData);
        }
        if (type === "video:unsubscribe") {
            exports.SubsriptionData.forEach((sub) => {
                if (sub.videoId === video_id) {
                    sub.subscribers = sub.subscribers.filter((subscriber) => subscriber !== ws);
                }
            });
        }
    });
}
function handleConnectionClosed(ws) {
    return __awaiter(this, void 0, void 0, function* () { });
}
wss.on("connection", (ws) => {
    console.log(`${new Date().toISOString()} New client connected`);
    ws.on("error", console.error);
    ws.on("message", (message) => {
        handleIncomingRequests(message, ws);
    });
    ws.on("close", () => {
        handleConnectionClosed(ws);
    });
});
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield redisClient.connect();
            console.log("Connected to Redis");
            server.listen(8080, function () {
                console.log(" Server is listening on port 8080");
            });
            while (true) {
                const response = yield redisClient.brPop("video-Data", 0);
                if (response) {
                    console.log("Received message from Redis", response);
                    console.log("Data after stringifying", JSON.parse(response === null || response === void 0 ? void 0 : response.element));
                    sendUpdatesToWs(JSON.parse(response === null || response === void 0 ? void 0 : response.element));
                }
            }
        }
        catch (err) {
            console.error(err);
        }
    });
}
startServer();
