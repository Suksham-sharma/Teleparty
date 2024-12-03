import axios from "axios";

const BASE_URL = "http://localhost:4000";

interface FileType {
  type: "video" | "thumbnail";
}

export const getPresignedUrl = async (type: FileType) => {
  try {
    const response = await axios.get(`${BASE_URL}/videos/presigned-url`, {
      params: {
        type: type,
      },
    });

    if (!response) {
      throw new Error("No data returned from server");
    }

    return response.data;
  } catch (error: unknown) {
    console.log("Error getting presigned URL", error);
  }
};
