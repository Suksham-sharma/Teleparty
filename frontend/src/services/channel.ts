import axiosInstance from "@/lib/axios";

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
    console.error("Error creating channel:", error);
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

    return response.data.channel;
  } catch (error: unknown) {
    console.error("Error getting channel for user:", error);
    return false;
  }
};

export const getChannelBySlug = async (slug: string) => {
  try {
    const response = await axiosInstance.get(`/channels/${slug}`);
    if (!response) {
      throw new Error("No data returned from server");
    }
    console.log("Channel Info", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error getting channel info:", error);
    return false;
  }
};
