import axiosInstance from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { User, ApiResponse } from "./types";

export const userSignup = async (
  email: string,
  username: string,
  password: string
): Promise<ApiResponse<{ user: User }> | undefined> => {
  try {
    const response = await axiosInstance.post("/auth/signup", {
      email,
      username,
      password,
    });

    if (!response) {
      throw new Error("No data returned from server");
    }

    useAuthStore.getState().login(response.data.user);
    return response.data;
  } catch (error: unknown) {
    console.error("Error signing up:", error);
    throw error;
  }
};

export const userLogin = async (
  email: string,
  password: string
): Promise<ApiResponse<{ user: User }> | undefined> => {
  try {
    const response = await axiosInstance.post("/auth/login", {
      email,
      password,
    });

    if (!response) {
      throw new Error("No data returned from server");
    }

    useAuthStore.getState().login(response.data.user);
    return response.data;
  } catch (error: unknown) {
    console.error("Error logging in:", error);
    throw error;
  }
};
