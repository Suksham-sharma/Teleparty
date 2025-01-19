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

  return (
    <div className="grid grid-cols-4 gap-10 mt-20 min-h-[50vh] py-10 max-w-7xl mx-auto">
      <VideoPlayer
        className="col-span-3"
        src="https://d3uupbz3igyr5f.cloudfront.net/transcoded/4ba26d13-3d98-4f02-88f2-fd95cac3b1ce/master.m3u8"
      />
      {ws && (
        <ChatCard
          chatName="Live Chat"
          ws={ws}
          theme="light"
          className="w-full h-full"
          initialMessages={[]}
        />
      )}
    </div>
  );
}
