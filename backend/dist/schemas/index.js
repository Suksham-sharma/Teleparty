"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadVideoData = exports.updateVideoTimeData = exports.createChannelData = exports.signInData = exports.signUpData = void 0;
const zod_1 = __importDefault(require("zod"));
exports.signUpData = zod_1.default.object({
    email: zod_1.default.string().email(),
    username: zod_1.default.string(),
    password: zod_1.default.string(),
});
exports.signInData = zod_1.default.object({
    email: zod_1.default.string().email(),
    password: zod_1.default.string(),
});
exports.createChannelData = zod_1.default.object({
    name: zod_1.default.string(),
    description: zod_1.default.string(),
});
exports.updateVideoTimeData = zod_1.default.object({
    timestamp: zod_1.default.number(),
});
exports.uploadVideoData = zod_1.default.object({
    title: zod_1.default.string(),
    description: zod_1.default.string(),
    category: zod_1.default.string().optional(),
    file: zod_1.default.any(),
});
