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
const redis_1 = require("redis");
const __1 = require("../..");
class RedisManager {
    constructor() {
        this.queueClient = (0, redis_1.createClient)();
        this.publisherClient = (0, redis_1.createClient)();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }
        return this.instance;
    }
    getDataFromQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.queueClient.brPop("video-transcode", 0);
                if (!response) {
                    throw new Error("Error getting data from queue");
                }
                const IncomingData = JSON.parse(response.element);
                (0, __1.handleIncomingRequests)(IncomingData);
            }
            catch (error) {
                console.log("Error getting data from queue", error);
            }
        });
    }
    publishDataToServer() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
