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
const multer_1 = require("../lib/multer");
const s3uploader_1 = require("../lib/s3uploader");
const fs_1 = __importDefault(require("fs"));
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
        // if (timestamp > videoDuration) {
        //   res.status(400).json({
        //     error: `Timestamp cannot exceed video duration of ${videoDuration} seconds.`,
        //   });
        //   return;
        // }
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
exports.videosRouter.post("/upload", multer_1.upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        console.log(req.body);
        const videoUploadPayload = schemas_1.uploadVideoData.safeParse(req.body);
        const filePath = (_a = req.file) === null || _a === void 0 ? void 0 : _a.path;
        const key = `Originalvideos/${Date.now()}${(_b = req.file) === null || _b === void 0 ? void 0 : _b.originalname}`;
        if (!filePath) {
            res.status(400).json({ error: "Invalid file upload." });
            return;
        }
        const fileType = (_c = req.file) === null || _c === void 0 ? void 0 : _c.mimetype;
        if (!fileType) {
            console.log("fileType Error", fileType);
            return;
        }
        const response = yield s3uploader_1.s3Service.uploadDataToS3(filePath, fileType, key);
        console.log("response", response);
        fs_1.default.unlinkSync(filePath);
        if (!videoUploadPayload.success) {
            res.status(400).json({
                error: "Invalid video upload data.",
            });
            return;
        }
        const { title, description, category } = videoUploadPayload.data;
        if (!req.userId) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }
        const findChannel = yield prismaClient_1.default.channel.findUnique({
            where: { creatorId: req.userId },
        });
        if (!findChannel) {
            res.status(404).json({ error: "Channel not found." });
            return;
        }
        const video = yield prismaClient_1.default.video.create({
            data: {
                title,
                description,
                category,
                creatorId: req.userId,
                channelId: findChannel.id,
                video_urls: {
                    "240p": `https://example.com/${filePath}240p`,
                    "480p": `https://example.com/${filePath}480p`,
                    "720p": `https://example.com/${filePath}720p`,
                },
            },
        });
        res.status(200).json(Object.assign(Object.assign({}, video), { processing_status: "PROCESSING" }));
    }
    catch (error) {
        console.error("Error uploading video:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}));
exports.videosRouter.get("/:video_id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { video_id } = req.params;
        const video = yield prismaClient_1.default.video.findUnique({
            where: { id: video_id },
            include: {
                creator: {
                    select: {
                        username: true,
                        id: true,
                    },
                },
            },
        });
        if (!video) {
            res.status(404).json({ error: "Video not found." });
            return;
        }
        video.video_urls = {
            "240p": "<https://example.com/video_240p.mp4>",
            "480p": "<https://example.com/video_480p.mp4>",
            "720p": "<https://example.com/video_720p.mp4>",
        };
        res.status(200).json(Object.assign(Object.assign({}, video), { status: "TRANSCODED" }));
    }
    catch (error) {
        console.log("Error fetching video:", error);
    }
}));
// videosRouter.post("/upload-video", async (req, res) => {
//   const uploader = s3VideoUploader;
//   const bucket = process.env.S3_BUCKET_NAME;
//   try {
//     if (!req.readable) {
//       res.status(400).json({ error: "Invalid stream" });
//       return;
//     }
//     const videoUploadPayload = uploadVideoData.safeParse(req.body);
//     if (!videoUploadPayload.success) {
//       res.status(400).json({
//         error: "Invalid video upload data.",
//       });
//       return;
//     }
//     const { title, description, category } = videoUploadPayload.data;
//     if (!req.userId) {
//       res.status(401).json({ error: "Unauthorized." });
//       return;
//     }
//     const findChannel = await prismaClient.channel.findUnique({
//       where: { creatorId: req.userId },
//     });
//     if (!findChannel) {
//       res.status(404).json({ error: "Channel not found." });
//       return;
//     }
//     const key = `${title}-${Date.now()}.mp4`;
//     const uploadResult = await uploader.uploadVideoStream(req, key);
//     res.status(200).json({
//       message: "Video uploaded successfully",
//       ...uploadResult,
//     });
//   } catch (error: any) {
//     console.error("Upload error:", error);
//     res.status(500).json({
//       error: "Upload failed",
//       details: error.message,
//     });
//   }
// });
