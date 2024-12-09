import axios from "axios";

const BASE_URL = "http://localhost:4000/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  console.log("Request", config.headers);
  return config;
});

export default axiosInstance;
