import { redisManager } from "./manager/redisManager";
import { s3Manager } from "./manager/S3Manager";

export async function processDataFromQueue() {
  while (true) {
    const inputData = await redisManager.getDataFromQueue();

    if (!inputData) {
      continue;
    }

    handleIncomingRequests(inputData);
  }
}

const handleIncomingRequests = async (message: any) => {
  try {
    const { key, requestId } = message;
    if (!key || !requestId) {
      throw new Error("Invalid message received");
    }

    console.log("Processing incoming message", message);

    await s3Manager.getDataFromS3andProcess(key);
  } catch (error: any) {
    console.log("Error handling incoming message", error);
  }
};
