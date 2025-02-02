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
        const channelData = await getChannelBySlug(roomId);
        if (channelData && channelData.owner.id === user.id) {
          setIsChannelOwner(true);
        }
      } catch (error) {
        if (error instanceof Error)
          console.log("Error checking channel ownership:", error.message);
      }
    };

    checkChannelOwnership();
  }, [roomId, user]);

  return { isChannelOwner };
}
