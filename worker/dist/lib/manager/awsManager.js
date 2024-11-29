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
exports.s3Manager = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = require("fs");
const promises_1 = __importDefault(require("fs/promises"));
const promises_2 = require("stream/promises");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const s3ClientConfig = {
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
};
class S3Manager {
    constructor() {
        this.S3Client = new client_s3_1.S3Client(s3ClientConfig);
        console.log("S3 Manager initialized");
        console.log("asdf", process.env.AWS_ACCESS_KEY_ID);
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new S3Manager();
        }
        return this.instance;
    }
    getDataFromS3(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const bucketName = "easy-deploy";
            const command = new client_s3_1.GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });
            const response = yield this.S3Client.send(command);
            const originalPath = `./temp/${key}`;
            yield promises_1.default.mkdir("./temp/Originalvideos", { recursive: true });
            if (!response.Body)
                throw new Error("No data found in S3");
            const writeStream = (0, fs_1.createWriteStream)(originalPath);
            try {
                yield (0, promises_2.pipeline)(response.Body, writeStream);
            }
            catch (error) {
                console.error("Error writing S3 stream to file:", error);
                throw error;
            }
            console.log("File downloaded successfully");
        });
    }
    uploadTranscodedData() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
exports.s3Manager = S3Manager.getInstance();
