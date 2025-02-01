"use client";
import VideoPlayer from "@/components/VideoPlayer";
import { ChatCard } from "@/app/_components/chat-card";
import { useEffect, useState } from "react";
import { VideoNotStarted } from "@/components/video-not-started";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

export default function VideoHero({
  roomId,
  videoId,
}: {
  roomId: string;
  videoId?: string;
}) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let isConnected = false;
    setIsConnecting(true);
    setConnectionError(null);
    const websocket = new WebSocket(`ws://localhost:8080`);

    websocket.onopen = () => {
      console.log("Connected to WebSocket server");
      isConnected = true;
      setIsConnecting(false);
      websocket.send(
        JSON.stringify({
          type: "room:join",
          roomId: `${roomId}`,
          userId: user.id,
        })
      );
      setWs(websocket);
    };

    websocket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      const { type, videoId: receivedVideoId } = data;
      if (type === "chat:message") return;

      if (!videoId && receivedVideoId) {
        console.log("Setting video url");
        setVideoUrl(
          `https://d3uupbz3igyr5f.cloudfront.net/transcoded/${receivedVideoId}/master.m3u8`
        );
      }
    });

    websocket.onerror = (error) => {
      console.log("WebSocket error:", error);
      setConnectionError(
        "Failed to connect to chat server. Please try again later."
      );
      setIsConnecting(false);
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed");
      isConnected = false;
      setWs(null);
      if (!connectionError) {
        setConnectionError(
          "Chat connection was lost. Please refresh to reconnect."
        );
      }
    };

    return () => {
      if (websocket && isConnected) {
        try {
          websocket.send(
            JSON.stringify({
              type: "room:leave",
              roomId: `${roomId}`,
            })
          );
        } catch (error) {
          console.log("Error sending leave message:", error);
        }
        websocket.close();
      }
    };
  }, [roomId, user, isAuthenticated]);

  useEffect(() => {
    if (videoId) {
      setVideoUrl(
        `https://d3uupbz3igyr5f.cloudfront.net/transcoded/${videoId}/master.m3u8`
      );
    }
  }, [videoId]);

  return (
    <div className="grid grid-cols-4 gap-10 mt-20 min-h-[50vh] py-10 max-w-7xl mx-auto">
      <div className="col-span-3">
        {videoUrl ? <VideoPlayer src={videoUrl} /> : <VideoNotStarted />}
      </div>
      <div className="relative">
        {isConnecting ? (
          <div className="w-full h-[600px] rounded-2xl bg-white/95 border border-zinc-200/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-zinc-600 font-medium">Connecting to chat...</p>
            </div>
          </div>
        ) : connectionError ? (
          <div className="w-full h-[600px] rounded-2xl bg-white/95 border border-red-200/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-red-600 font-medium">{connectionError}</p>
            </div>
          </div>
        ) : (
          ws &&
          user && (
            <ChatCard
              ws={ws}
              roomId={roomId}
              className="w-full h-full"
              currentUser={{
                id: user.id,
                name: user.username,
              }}
            />
          )
        )}
      </div>
    </div>
  );
}
