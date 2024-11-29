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
exports.s3Service = exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = __importDefault(require("fs"));
const redisManager_1 = require("./redisManager");
const s3ClientConfig = {
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
};
class S3Service {
    static getInstance(config) {
        if (!this.instance) {
            this.instance = new S3Service(config);
        }
        return this.instance;
    }
    constructor(config) {
        this.s3Client = new client_s3_1.S3Client(config);
    }
    uploadDataToS3(filePath, fileType, key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const bucket = "easy-deploy";
                const uploadParams = {
                    Bucket: bucket,
                    Key: key,
                    Body: fs_1.default.createReadStream(filePath),
                    ContentType: fileType,
                };
                const command = new client_s3_1.PutObjectCommand(uploadParams);
                const response = yield this.s3Client.send(command);
                if (response.$metadata.httpStatusCode !== 200) {
                    throw new Error("Error uploading to S3");
                }
                redisManager_1.redisManager.sendToWorkerAndSubscribe(key);
                console.log(`Successfully uploaded data to ${bucket}/${key}`);
                return { success: true, data: response };
            }
            catch (error) {
                console.error("Error uploading to S3:", error);
                throw error;
            }
        });
    }
}
exports.S3Service = S3Service;
exports.s3Service = S3Service.getInstance(s3ClientConfig);
