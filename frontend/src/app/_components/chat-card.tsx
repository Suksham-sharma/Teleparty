"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";

type WebSocket = globalThis.WebSocket;

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
  };
}

interface ChatCardProps {
  initialMessages?: Message[];
  currentUser: {
    id: string;
    name: string;
  };
  onSendMessage?: (message: string) => void;
  className?: string;
  ws: WebSocket;
  roomId: string;
}

export function ChatCard({
  initialMessages = [],
  currentUser,
  className,
  ws,
  roomId,
}: ChatCardProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [totalMembers, setTotalMembers] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!ws) return;

    const haneleEvent = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (data.totalMembers) setTotalMembers(data.totalMembers);

      switch (data.type) {
        case "chat:message":
          const newMessage: Message = {
            id: Date.now().toString(),
            content: data.message,
            sender: {
              id: data.userId,
              name: data.username || currentUser.name,
            },
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          break;
        case "room:join":
          console.log(data.message);
          break;
        case "room:leave":
          console.log(data.message);
          break;
        case "error":
          console.error("WebSocket error:", data.message);
          break;
      }
    };

    ws.addEventListener("message", haneleEvent);
    return () => ws.removeEventListener("message", haneleEvent);
  }, [ws, currentUser.name]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !ws) return;

    ws.send(
      JSON.stringify({
        type: "chat:message",
        roomId: `${roomId}`,
        userId: currentUser.id,
        username: currentUser.name,
        chatMessage: inputValue.trim(),
      })
    );

    setInputValue("");
  };

  console.log(messages);

  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto rounded-2xl overflow-hidden shadow-lg transition-all duration-200 hover:shadow-xl",
        "bg-white/95 text-zinc-900 border border-zinc-200/80 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col h-[600px] relative">
        <div className="px-6 py-4 border-b border-zinc-200/80 bg-gradient-to-r from-white via-zinc-50/80 to-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg tracking-tight text-zinc-900 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                Live Chat
              </h3>
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse ring-4 ring-green-500/20"></div>
            </div>
            <span className="text-sm font-medium bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 px-3 py-1 rounded-full text-zinc-600 border border-zinc-200/60 shadow-sm">
              {totalMembers}{" "}
              {totalMembers === 1 ? "participant" : "participants"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-zinc-50/50">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUserId={currentUser.id}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
        />
      </div>
    </div>
  );
}
