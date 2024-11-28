import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

interface S3Config {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

interface S3Response {
  success: boolean;
  data?: any;
  error?: Error;
}

const s3ClientConfig: S3Config = {
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
};

export class S3Service {
  private s3Client: S3Client;
  static instance: S3Service;

  static getInstance(config: S3Config) {
    if (!this.instance) {
      this.instance = new S3Service(config);
    }
    return this.instance;
  }

  constructor(config: S3Config) {
    this.s3Client = new S3Client(config);
  }

  async uploadDataToS3(
    filePath: string,
    fileType: string,
    key: string
  ): Promise<S3Response> {
    try {
      const bucket = "easy-deploy";

      const uploadParams = {
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: fileType,
      };

      const command = new PutObjectCommand(uploadParams);
      const response = await this.s3Client.send(command);

      console.log(`Successfully uploaded data to ${bucket}/${key}`);
      return { success: true, data: response };
    } catch (error) {
      console.error("Error uploading to S3:", error);
      throw error;
    }
  }
}

export const s3Service = S3Service.getInstance(s3ClientConfig);
