"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "@/lib/config";
import type { LiveMessage, Membership, Role, RoomMember } from "@/services/types";

/**
 * The socket identifies participants by `memberId`; the REST roster uses `id`.
 * Normalise here so the two sources are interchangeable downstream — otherwise
 * list keys come back undefined the moment presence updates arrive.
 */
interface WireParticipant {
  memberId: string;
  name: string;
  role: Role;
}

const toMembers = (participants: WireParticipant[] = []): RoomMember[] =>
  participants.map((p) => ({
    id: p.memberId,
    role: p.role,
    name: p.name,
    userId: null,
    joinedAt: "",
  }));

type Status = "connecting" | "open" | "closed" | "error";

interface PlaybackState {
  videoId: string | null;
  currentTime: number | null;
  isPlaying: boolean;
}

interface UseRoomSocket {
  status: Status;
  playback: PlaybackState;
  members: RoomMember[];
  messages: LiveMessage[];
  reactions: { id: string; emoji: string; name: string }[];
  sendChat: (body: string) => void;
  sendReaction: (emoji: string) => void;
}

/**
 * One socket per room. On join the server replies with a full snapshot
 * (current video, position, play state, roster, recent chat) so someone
 * arriving mid-film is immediately in sync rather than staring at a blank
 * player until the host next touches the controls.
 */
export function useRoomSocket(
  code: string,
  membership: Membership | null,
  displayName: string
): UseRoomSocket {
  const [status, setStatus] = useState<Status>("connecting");
  const [playback, setPlayback] = useState<PlaybackState>({
    videoId: null,
    currentTime: null,
    isPlaying: false,
  });
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [reactions, setReactions] = useState<
    { id: string; emoji: string; name: string }[]
  >([]);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!membership) return;

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;
    setStatus("connecting");

    socket.onopen = () => {
      setStatus("open");
      socket.send(
        JSON.stringify({
          type: "room:join",
          roomId: code,
          memberId: membership.id,
          name: displayName,
          role: membership.role,
        })
      );
    };

    socket.onmessage = (event) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        case "room:snapshot": {
          setPlayback({
            videoId: (data.videoId as string) ?? null,
            currentTime: data.currentTime
              ? parseFloat(data.currentTime as string)
              : null,
            isPlaying: Boolean(data.isCurrentlyPlaying),
          });
          setMembers(toMembers(data.members as WireParticipant[]));
          setMessages((data.messages as LiveMessage[]) ?? []);
          break;
        }

        case "video:update": {
          setPlayback({
            videoId: (data.videoId as string) ?? null,
            currentTime: data.currentTime
              ? parseFloat(data.currentTime as string)
              : null,
            isPlaying: Boolean(data.isCurrentlyPlaying),
          });
          break;
        }

        case "room:presence":
          setMembers(toMembers(data.members as WireParticipant[]));
          break;

        case "chat:message":
          setMessages((prev) => [
            ...prev,
            {
              id: data.id as string,
              memberId: data.memberId as string,
              name: data.name as string,
              body: data.body as string,
              sentAt: data.sentAt as string,
            },
          ]);
          break;

        case "reaction:send": {
          const reaction = {
            id: `${data.memberId}-${Date.now()}`,
            emoji: data.emoji as string,
            name: data.name as string,
          };
          setReactions((prev) => [...prev, reaction]);
          // Reactions are ephemeral confetti, not history.
          setTimeout(
            () => setReactions((prev) => prev.filter((r) => r.id !== reaction.id)),
            3000
          );
          break;
        }
      }
    };

    socket.onerror = () => setStatus("error");
    socket.onclose = () => setStatus("closed");

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "room:leave", roomId: code }));
      }
      socket.close();
      socketRef.current = null;
    };
  }, [code, membership, displayName]);

  const sendChat = useCallback(
    (body: string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !body.trim())
        return;
      socket.send(
        JSON.stringify({ type: "chat:message", roomId: code, chatMessage: body })
      );
    },
    [code]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: "reaction:send", roomId: code, emoji }));
    },
    [code]
  );

  return { status, playback, members, messages, reactions, sendChat, sendReaction };
}
