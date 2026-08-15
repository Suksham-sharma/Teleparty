import axios from "axios";
import { API_URL, SERVER_API_URL } from "./config";

// In the browser the relative path is rewritten by Next; on the server there
// is no origin to be relative to, so call the backend directly.
const baseURL =
  typeof window === "undefined" ? `${SERVER_API_URL}/api` : API_URL;

const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  // Carries both the Authentication JWT and the guestId cookie.
  withCredentials: true,
});

export default axiosInstance;
