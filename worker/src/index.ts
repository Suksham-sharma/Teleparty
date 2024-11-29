import { s3Manager } from "./lib/manager/S3Manager";

export const handleIncomingRequests = async (message: any) => {
  const { key, requestId } = message;
  if (!key || !requestId) {
    throw new Error("Invalid message received");
  }

  try {
    await s3Manager.getDataFromS3(key);
  } catch (error: any) {
    console.log("Error handling incoming message", error);
  }
};

handleIncomingRequests({
  key: "Originalvideos/1732863317082downloaded-video.mp4",
  requestId: "123",
});
