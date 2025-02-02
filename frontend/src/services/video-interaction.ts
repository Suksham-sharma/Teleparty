import axiosInstance from "@/lib/axios";

interface VideoInteractionPayload {
  roomId: string;
  action: "play" | "pause" | "timestamp";
  currentTime?: string;
}

export const videoInteractionService = {
  handleInteraction: async (
    videoId: string,
    payload: VideoInteractionPayload
  ) => {
    try {
      console.log("Request Sent to backend", payload);
      const response = await axiosInstance.post(
        `/videos/interaction/${videoId}`,
        payload
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error in video interaction:", error.message);
      }
    }
  },
};
