import axiosInstance from "@/lib/axios";
import { useAuthStore } from "../store/authStore";

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
    console.log("Error getting presigned URL", error);
  }
};

export const userSignup = async (
  email: string,
  username: string,
  password: string
) => {
  try {
    const response = await axiosInstance.post("/auth/signup", {
      email,
      username,
      password,
    });

    if (!response) {
      throw new Error("No data returned from server");
    }

    useAuthStore.getState().login(response.data);

    return response.data;
  } catch (error: unknown) {
    console.log("Error signing up", error);
  }
};

export const userLogin = async (email: string, password: string) => {
  console.log("Logging in herre");
  try {
    const response = await axiosInstance.post("/auth/login", {
      email,
      password,
    });

    if (!response) {
      throw new Error("No data returned from server");
    }

    useAuthStore.getState().login(response.data.user);
    console.log("Logged in", response.data.user);

    return response.data;
  } catch (error: unknown) {
    console.log("Error logging in", error);
  }
};

export const createChannel = async (name: string, description: string) => {
  try {
    const response = await axiosInstance.post("/channels", {
      name,
      description,
    });

    if (!response) {
      throw new Error("No data returned from server");
    }

    if (response.status !== 201) {
      throw new Error("Something went wrong");
    }

    return response.data;
  } catch (error: unknown) {
    console.log("Error creating channel", error);
    return false;
  }
};

export const getChannelForUser = async (authToken: string) => {
  try {
    const response = await axiosInstance.get("/channels/me", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.data) {
      throw new Error("No data returned from server");
    }

    console.log("response", response.data);

    return response.data.channel;
  } catch (error: unknown) {
    console.log("Error getting channel for user", error);
    return false;
  }
};

type videoData = {
  title: string | undefined;
  description: string | undefined;
  thumbnailId: string;
  videoId: string;
};

export const uploadVideo = async (videoData: videoData) => {
  console.log("uploading video");
  try {
    const response = await axiosInstance.post("/videos/upload", videoData);

    if (!response) {
      throw new Error("No data returned from server");
    }

    console.log("response hghghghg", response);

    if (response.status !== 201) {
      throw new Error("Something went wrong");
    }

    return response.data;
  } catch (error: unknown) {
    console.log("Error uploading video", error);
    return false;
  }
};
