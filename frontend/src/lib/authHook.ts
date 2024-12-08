"use client";
import { useAuthStore } from "@/store/authStore";

export const isUserAuthenticated = () => {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (!isAuthenticated) {
    return null;
  }

  return user;
};
