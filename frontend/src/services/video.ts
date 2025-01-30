import axiosInstance from "@/lib/axios";
import { VideoUploadData } from "./types";
import { toast } from "sonner";

export const generatePresignedUrl = async (
  fileName: string | undefined,
  type: string
) => {
  try {
    const response = await axiosInstance.post("/videos/presignedurl", {
      fileName,
      type,
    });

    if (!response) {
      throw new Error("No data returned from server");
    }

    return response.data;
  } catch (error: unknown) {
    console.error("Error getting presigned URL:", error);
    throw error;
  }
};

export const uploadVideo = async (videoData: VideoUploadData) => {
  try {
    const response = await axiosInstance.post("/videos/upload", videoData);

    if (!response) {
      throw new Error("No data returned from server");
    }

    if (response.status !== 201) {
      throw new Error("Something went wrong");
    }

    return response.data;
  } catch (error: unknown) {
    console.error("Error uploading video:", error);
    throw error;
  }
};

export const notifyVideoChange = async (videoId: string) => {
  try {
    const response = await axiosInstance.post(
      `/videos/current/${videoId}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response) {
      throw new Error("No data returned from server");
    }

    toast.success("Video started");

    return response.data;
  } catch (error: unknown) {
    console.error("Error notifying video change:", error);
    return false;
  }
};
