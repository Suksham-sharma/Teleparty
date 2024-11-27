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
exports.authRouter = exports.JWT_SECRET = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const schemas_1 = require("../schemas");
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
exports.JWT_SECRET = "secret";
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const signupPayload = schemas_1.signUpData.safeParse(req.body);
        if (!signupPayload.success) {
            throw new Error("Invalid format , not Valid");
        }
        const { username, password, email } = signupPayload.data;
        const findUser = yield prismaClient_1.default.user.findFirst({
            where: {
                OR: [{ email: email }, { username: username }],
            },
        });
        if (findUser) {
            res.status(409).json({ error: "User already exists" });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 8);
        const user = yield prismaClient_1.default.user.create({
            data: {
                username,
                password: hashedPassword,
                email,
            },
        });
        res.status(201).json({
            userId: user === null || user === void 0 ? void 0 : user.id,
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
        return;
    }
}));
exports.authRouter.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const signInPayload = schemas_1.signInData.safeParse(req.body);
        if (!signInPayload.success) {
            throw new Error("Invalid format , not Valid");
        }
        const findUser = yield prismaClient_1.default.user.findUnique({
            where: {
                email: signInPayload.data.email,
            },
        });
        if (!findUser) {
            throw new Error("User doesn't exist");
        }
        const isAuthenticated = bcryptjs_1.default.compare(signInPayload.data.password, findUser === null || findUser === void 0 ? void 0 : findUser.password);
        if (!isAuthenticated) {
            throw new Error("Invalid Password");
        }
        const token = jsonwebtoken_1.default.sign({
            id: findUser.id,
            username: findUser.username,
        }, exports.JWT_SECRET);
        res.cookie("Authentication", token, {
            httpOnly: true,
            sameSite: "strict",
        });
        res.status(200).json({
            access_token: token,
            user: {
                id: findUser.id,
                username: findUser.username,
                email: findUser.email,
            },
        });
    }
    catch (error) {
        res.status(403).json({ error: error.message });
        return;
    }
}));
