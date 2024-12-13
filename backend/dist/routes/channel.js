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
exports.channelRouter = void 0;
const express_1 = require("express");
const schemas_1 = require("../schemas");
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
exports.channelRouter = (0, express_1.Router)();
exports.channelRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Creating channel");
        console.log(req.body);
        const createChannelPayload = schemas_1.createChannelData.safeParse(req.body);
        if (!createChannelPayload.success) {
            res.status(400).json({ error: "Invalid format, not valid" });
            return;
        }
        const randomSlug = Math.random().toString(36).substring(2, 6) +
            "-" +
            Math.random().toString(36).substring(2, 6);
        if (!req.userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const existingChannel = yield prismaClient_1.default.channel.findFirst({
            where: {
                creatorId: req.userId,
            },
        });
        if (existingChannel) {
            res.status(411).json({ error: "User already has a channel" });
            return;
        }
        const createdChannel = yield prismaClient_1.default.channel.create({
            data: {
                name: createChannelPayload.data.name,
                description: createChannelPayload.data.description,
                slug: randomSlug,
                creatorId: req.userId,
            },
        });
        res.status(201).json({
            id: createdChannel.id,
            name: createdChannel.name,
            description: createdChannel.description,
            slug: createdChannel.slug,
        });
    }
    catch (error) {
        console.error("Error creating channel:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
    }
}));
exports.channelRouter.get("/me", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Getting channel for user");
    try {
        const channel = yield prismaClient_1.default.channel.findFirst({
            where: {
                creatorId: req.userId,
            },
            include: {
                videos: true,
            },
        });
        console.log("Channel", channel);
        res.status(200).json({
            channel,
        });
    }
    catch (error) {
        res.json({ error: "Internal server error" });
    }
}));
