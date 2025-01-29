"use client";
import VideoPlayer from "@/components/VideoPlayer";
import { ChatCard } from "@/app/_components/chat-card";
import { useEffect, useState } from "react";
import { VideoNotStarted } from "@/components/video-not-started";
import { useAuthStore } from "@/store/authStore";

export default function VideoHero({
  roomId,
  videoId,
}: {
  roomId: string;
  videoId: string;
}) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const websocket = new WebSocket(`ws://localhost:8080`);

    websocket.onopen = () => {
      console.log("Connected to WebSocket server");
      websocket.send(
        JSON.stringify({
          type: "room:join",
          roomId: `stream-${roomId}`,
          userId: user.id,
        })
      );
    };

    setWs(websocket);

    return () => {
      if (websocket) {
        websocket.send(
          JSON.stringify({
            type: "room:leave",
            roomId: `stream-${roomId}`,
          })
        );
        websocket.close();
      }
    };
  }, [roomId, user, isAuthenticated]);

  const videoUrl = videoId
    ? `https://d3uupbz3igyr5f.cloudfront.net/transcoded/${videoId}/master.m3u8`
    : null;

  return (
    <div className="grid grid-cols-4 gap-10 mt-20 min-h-[50vh] py-10 max-w-7xl mx-auto">
      <div className="col-span-3">
        {videoUrl ? <VideoPlayer src={videoUrl} /> : <VideoNotStarted />}
      </div>
      {ws && user && (
        <ChatCard
          ws={ws}
          roomId={roomId}
          className="w-full h-full"
          currentUser={{
            id: user.id,
            name: user.username,
          }}
        />
      )}
    </div>
  );
}
