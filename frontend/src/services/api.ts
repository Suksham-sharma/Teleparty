import axios from "axios";

const BASE_URL = "http://localhost:4000/api";

export const generatePresignedUrl = async (
  fileName: string | undefined,
  type: string
) => {
  try {
    const response = await axios.get(`${BASE_URL}/videos/presignedurl`, {
      params: {
        fileName,
        type,
      },
      withCredentials: true,
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
    const response = await axios.post(`${BASE_URL}/auth/signup`, {
      email,
      username,
      password,
    });

    if (!response) {
      throw new Error("No data returned from server");
    }

    return response.data;
  } catch (error: unknown) {
    console.log("Error signing up", error);
  }
};

export const userLogin = async (email: string, password: string) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/login`,
      {
        email,
        password,
      },
      {
        withCredentials: true,
      }
    );

    if (!response) {
      throw new Error("No data returned from server");
    }

    return response.data;
  } catch (error: unknown) {
    console.log("Error logging in", error);
  }
};
