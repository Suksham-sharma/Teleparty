"use client";
import VideoPlayer from "@/components/VideoPlayer";
import { ChatCard } from "@/app/_components/chat-card";
import { useEffect, useState } from "react";

export default function VideoHero({ videoId }: { videoId: string }) {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket(`ws://your-backend-url/chat/${videoId}`);
    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [videoId]);

  const videoUrl = `https://d3uupbz3igyr5f.cloudfront.net/transcoded/${videoId}/master.m3u8`;
  console.log("cidf", videoUrl);
  console.log("video Id", videoId);

  return (
    <div className="grid grid-cols-4 gap-10 mt-20 min-h-[50vh] py-10 max-w-7xl mx-auto">
      <VideoPlayer className="col-span-3" src={videoUrl} />
      {ws && (
        <ChatCard
          chatName="Live Chat"
          ws={ws}
          theme="light"
          className="w-full h-full"
        />
      )}
    </div>
  );
}
