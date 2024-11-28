import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Request } from "express";

class S3VideoUploader {
  static instance: S3VideoUploader;
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new S3VideoUploader();
    }
    return this.instance;
  }

  async uploadVideoStream(req: ReadableStream, key: string) {
    const bucket = "easy-deploy";

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: req,
        ContentType: "video/mp4",
      },
      partSize: 1 * 1024 * 1024,
      queueSize: 4,
    });

    upload.on("httpUploadProgress", (progress) => {
      console.log(`Upload progress: ${progress.loaded} / ${progress.total}`);
    });

    try {
      const result = await upload.done();

      return {
        success: true,
        key: key,
        location:
          result.Location || `https://${bucket}.s3.amazonaws.com/${key}`,
      };
    } catch (error) {
      console.error("Video upload failed:", error);
      throw error;
    }
  }
}

export const s3VideoUploader = S3VideoUploader.getInstance();
