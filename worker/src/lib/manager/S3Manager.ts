import {
  GetObjectCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import fs from "fs";
import { pipeline } from "stream/promises";
import dotenv from "dotenv";
import path from "path";
import { transcodeVideoWithFFmpeg } from "../transcode";

dotenv.config();

const s3ClientConfig = {
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
};

class S3Manager {
  static instance: S3Manager;
  private S3Client: S3Client;
  private bucketName = "easy-deploy";

  constructor() {
    this.S3Client = new S3Client(s3ClientConfig);
    console.log("S3 Manager initialized");
    console.log("asdf", process.env.AWS_ACCESS_KEY_ID);
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new S3Manager();
    }
    return this.instance;
  }

  async getDataFromS3andProcess(key: string) {
    const videoUniqueKey = `Originalvideos/${key}.mp4`;
    console.log(videoUniqueKey);
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: videoUniqueKey,
    });

    const response = await this.S3Client.send(command);

    const originalPath = `${key}`;
    const saveDir = path.resolve(__dirname, "../Originalvideos");
    fs.mkdirSync(saveDir, { recursive: true });

    if (!response.Body) throw new Error("No data found in S3");

    const writeStream = createWriteStream(originalPath);

    try {
      await pipeline(response.Body as NodeJS.ReadableStream, writeStream);
    } catch (error) {
      console.error("Error writing S3 stream to file:", error);
      throw error;
    }

    const originalVideoPath = path.resolve(originalPath);
    await transcodeVideoWithFFmpeg(originalVideoPath, path.basename(key));
    console.log("File downloaded successfully");
  }

  async uploadTranscodeVideoToS3(key: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fs.createReadStream(`${key}`),
    });
    const response = await this.S3Client.send(command);
  }
}

export const s3Manager = S3Manager.getInstance();
