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
exports.handleIncomingRequests = void 0;
const awsManager_1 = require("./lib/manager/awsManager");
const handleIncomingRequests = (message) => __awaiter(void 0, void 0, void 0, function* () {
    const { key, requestId } = message;
    if (!key || !requestId) {
        throw new Error("Invalid message received");
    }
    try {
        yield awsManager_1.s3Manager.getDataFromS3(key);
    }
    catch (error) {
        console.log("Error handling incoming message", error);
    }
});
exports.handleIncomingRequests = handleIncomingRequests;
(0, exports.handleIncomingRequests)({
    key: "Originalvideos/1732863317082downloaded-video.mp4",
    requestId: "123",
});
