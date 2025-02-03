"use client";

import { useState, useEffect } from "react";
import { getChannelBySlug } from "@/services/channel";
import { useAuthStore } from "@/store/authStore";

export function useChannelOwnership(roomId: string) {
  const [isChannelOwner, setIsChannelOwner] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const checkChannelOwnership = async () => {
      try {
        console.log("RoomID", roomId);
        const { channel } = await getChannelBySlug(roomId);
        if (channel && channel.creatorId === user.id) {
          setIsChannelOwner(true);
        }
        console.log("Is Channel Owner", isChannelOwner);
      } catch (error) {
        if (error instanceof Error)
          console.log("Error checking channel ownership:", error.message);
      }
    };

    checkChannelOwnership();
  }, [isChannelOwner, roomId, user]);

  return { isChannelOwner };
}
