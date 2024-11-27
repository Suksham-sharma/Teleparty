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
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisManager = void 0;
const redis_1 = require("redis");
class RedisManager {
    constructor() {
        this.sendUpdatesToWs = (data) => __awaiter(this, void 0, void 0, function* () {
            console.log("Sending data to Redis", data);
            this.publisherClient.lPush("video-Data", JSON.stringify(data));
        });
        try {
            this.publisherClient = (0, redis_1.createClient)();
            this.publisherClient.connect();
            console.log("Connected to Redis Clients 🚀");
        }
        catch (error) {
            throw new Error(`Error connecting to Redis: ${error}`);
        }
    }
    static getInstance() {
        if (!this.instance) {
            console.log("Creating new instance of RedisManager");
            this.instance = new RedisManager();
        }
        return this.instance;
    }
}
exports.redisManager = RedisManager.getInstance();
