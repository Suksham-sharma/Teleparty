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
exports.videosRouter = void 0;
const express_1 = require("express");
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const schemas_1 = require("../schemas");
const redisManager_1 = require("../lib/redisManager");
const s3uploader_1 = require("../lib/s3uploader");
exports.videosRouter = (0, express_1.Router)();
exports.videosRouter.get("/feed", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10 } = req.query;
        const whereClause = {};
        if (req.query.category) {
            whereClause.category = {
                contains: req.query.category,
            };
        }
        const totalVideos = yield prismaClient_1.default.video.count({
            where: whereClause,
        });
        const videos = yield prismaClient_1.default.video.findMany({
            skip: +page === 1 ? 0 : (+page - 1) * +limit,
            take: +limit,
            where: whereClause,
            include: {
                creator: {
                    select: {
                        username: true,
                        id: true,
                    },
                },
            },
        });
        const totalPages = Math.ceil(totalVideos / +limit);
        res.status(200).json({
            videos,
            totalPages,
            currentPage: +page,
        });
    }
    catch (error) { }
}));
exports.videosRouter.get("/presignedurl", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("req.query", req.query);
    try {
        const { fileName, type } = req.query;
        if (!fileName) {
            res.status(400).json({ error: "Invalid request." });
            return;
        }
        const key = type === "video" ? `Originalvideos/` : `Thumbnails/`;
        const data = yield s3uploader_1.s3Service.generatePresignedUrl(key, type);
        res.status(200).json(data);
    }
    catch (error) {
        console.error("Error generating presigned URL:", error);
    }
}));
exports.videosRouter.put("/:video_id/time", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { video_id } = req.params;
    console.log("video_id", video_id);
    try {
        console.log("req.body", req.body);
        const updateTimeStampPayload = schemas_1.updateVideoTimeData.safeParse(req.body);
        if (!updateTimeStampPayload.success) {
            res.status(408).json({
                error: updateTimeStampPayload.error.errors.map((error) => error.message),
            });
            return;
        }
        const { timestamp } = updateTimeStampPayload.data;
        const video = yield prismaClient_1.default.video.findUnique({
            where: { id: video_id },
        });
        if (!video) {
            res.status(404).json({ error: "Video not found." });
            return;
        }
        const videoDuration = video.duration;
        const stringTimestamp = timestamp.toString();
        yield prismaClient_1.default.video.update({
            where: { id: video_id },
            data: { timeStamp: stringTimestamp },
        });
        res.status(201).json({ message: "Timestamp updated successfully." });
        if (req.userId)
            redisManager_1.redisManager.sendUpdatesToWs({
                user_id: req.userId,
                videoId: video_id,
                timestamp,
            });
    }
    catch (error) {
        console.error("Error updating video timestamp:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}));
exports.videosRouter.post("/upload", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("req.body", req.body);
    try {
        const uploadVideoPayload = schemas_1.uploadVideoData.safeParse(req.body);
        if (!uploadVideoPayload.success) {
            res.status(400).json({
                error: uploadVideoPayload.error.errors.map((error) => error.message),
            });
            return;
        }
        if (!req.userId) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const findChannel = yield prismaClient_1.default.channel.findFirst({
            where: {
                creatorId: req.userId,
            },
        });
        if (!findChannel) {
            res.status(404).json({ error: "Channel not found." });
            return;
        }
        const { title, description, thumbnailId, videoId } = uploadVideoPayload.data;
        const video = yield prismaClient_1.default.video.create({
            data: {
                title,
                description,
                thumbnailId: thumbnailId,
                creatorId: req.userId,
                channelId: findChannel.id,
                video_urls: [],
            },
        });
        res.status(201).json({ message: "Video uploaded successfully." });
    }
    catch (error) { }
}));
