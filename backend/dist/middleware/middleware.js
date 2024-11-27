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
exports.protectRoute = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const protectRoute = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // const token = req.cookies.Authentication;
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Not authorized - No Token",
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: "Not autorized - invalid token",
            });
            return;
        }
        const findUser = yield prismaClient_1.default.user.findUnique({
            where: {
                id: decoded.id,
            },
        });
        if (!findUser) {
            throw new Error("User not found");
        }
        req.userId = findUser.id;
        next();
    }
    catch (error) {
        console.log("Error while getting user details");
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: "Not authorized - Invalid token",
            });
            return;
        }
        else {
            res.status(500).json({
                success: false,
                message: "Error in server",
            });
            return;
        }
    }
});
exports.protectRoute = protectRoute;
