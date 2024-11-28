export const handleIncomingRequests = async (message: any) => {
  const { key, requestId } = message;
  if (!key || !requestId) {
    throw new Error("Invalid message received");
  }

  try {
  } catch (error: any) {
    console.log("Error handling incoming message", error);
  }
};
