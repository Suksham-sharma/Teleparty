import { redisManager } from "./lib/manager/redisManager";
import { s3Manager } from "./lib/manager/S3Manager";

export const handleIncomingRequests = async (message: any) => {
  const { key, requestId } = message;
  if (!key || !requestId) {
    throw new Error("Invalid message received");
  }

  console.log("Processing incoming message", message);

  try {
    // await s3Manager.getDataFromS3(key);
  } catch (error: any) {
    console.log("Error handling incoming message", error);
  }
};

async function main() {
  try {
    while (true) {
      await redisManager.getDataFromQueue();
    }
  } catch (error: any) {}
}

main();
