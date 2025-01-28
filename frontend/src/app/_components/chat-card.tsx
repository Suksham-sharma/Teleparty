"use client";

import { SmilePlus, Check, CheckCheck, Send } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

type WebSocket = globalThis.WebSocket;

export interface Message {
  id: string;
  content: string;
  sender: {
    name: string;
    avatar: string;
    isCurrentUser?: boolean;
  };
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

interface ChatCardProps {
  initialMessages?: Message[];
  currentUser?: {
    name: string;
    avatar: string;
  };
  onSendMessage?: (message: string) => void;
  className?: string;
  theme?: "light" | "dark";
  ws: WebSocket;
}

export function ChatCard({
  initialMessages = [
    {
      id: "1",
      content: "Hey everyone! Ready to watch the movie?",
      sender: {
        name: "Alice",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
        isCurrentUser: false,
      },
      timestamp: "2:30 pm",
      status: "read",
    },
    {
      id: "2",
      content: "Yes, I've got my popcorn ready! 🍿",
      sender: {
        name: "Bob",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
        isCurrentUser: false,
      },
      timestamp: "2:31 pm",
      status: "delivered",
    },
    {
      id: "3",
      content: "Great! I'll start the video in 2 minutes.",
      sender: {
        name: "You",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
        isCurrentUser: true,
      },
      timestamp: "2:32 pm",
      status: "sent",
    },
  ],
  currentUser = {
    name: "You",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
  },
  onSendMessage,
  className,
  theme = "light",
  ws,
}: ChatCardProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data.toString());

      switch (data.type) {
        case "chat_message":
          setMessages((prevMessages) => [...prevMessages, data.message]);
          break;
        case "user_joined":
          const { name, count }: { name: string; count: number } = data;
          console.log(`${name} joined. Total users: ${count}`);
          break;
        case "user_left":
          const {
            name: leftName,
            count: leftCount,
          }: { name: string; count: number } = data;
          console.log(`${leftName} left. Total users: ${leftCount}`);
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [ws]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: {
        name: currentUser.name,
        avatar: currentUser.avatar,
        isCurrentUser: true,
      },
      timestamp: new Date()
        .toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .toLowerCase(),
      status: "sent",
    };

    ws.send(
      JSON.stringify({
        type: "chat_message",
        message: newMessage,
      })
    );

    setInputValue("");
    onSendMessage?.(inputValue);
  };

  const isLightTheme = theme === "light";

  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto rounded-2xl overflow-hidden",
        isLightTheme
          ? "bg-white text-zinc-900 border border-zinc-200"
          : "bg-zinc-900 text-zinc-100",
        className
      )}
    >
      <div className="flex flex-col h-[600px] relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "group flex items-start gap-3 transition-opacity",
                message.sender.isCurrentUser ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Image
                src={message.sender.avatar || "/placeholder.svg"}
                alt={message.sender.name}
                width={32}
                height={32}
                className="rounded-full ring-1 ring-offset-1 transition-transform group-hover:scale-105"
              />
              <div
                className={cn(
                  "flex-1 min-w-0",
                  message.sender.isCurrentUser ? "items-end" : "items-start"
                )}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isLightTheme ? "text-zinc-900" : "text-zinc-100"
                    )}
                  >
                    {message.sender.name}
                  </span>
                </div>
                <div
                  className={cn(
                    "relative max-w-[80%] rounded-xl px-3 py-1.5 shadow-sm transition-all",
                    message.sender.isCurrentUser
                      ? isLightTheme
                        ? "bg-indigo-500 text-white ml-auto"
                        : "bg-indigo-600 text-white ml-auto"
                      : isLightTheme
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-100"
                  )}
                >
                  <p className="break-words text-xs">{message.content}</p>
                </div>
              </div>
              <div className="flex items-center mt-1">
                {message.status === "read" && (
                  <div className="flex">
                    <CheckCheck className="w-3 h-3 text-indigo-500" />
                  </div>
                )}
                {message.status === "delivered" && (
                  <Check
                    className={cn(
                      "w-3 h-3",
                      isLightTheme ? "text-zinc-400" : "text-zinc-500"
                    )}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className={cn(
            "sticky bottom-0 p-4 border-t backdrop-blur-sm",
            isLightTheme
              ? "bg-white/90 border-zinc-200"
              : "bg-zinc-900/90 border-zinc-800"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Write a message..."
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-offset-0",
                  isLightTheme
                    ? "bg-zinc-100 text-zinc-900 placeholder-zinc-500 border-zinc-200 focus:ring-indigo-500/20"
                    : "bg-zinc-800 text-zinc-100 placeholder-zinc-500 border-zinc-700 focus:ring-indigo-500/20"
                )}
              />
              <button
                type="button"
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all",
                  isLightTheme
                    ? "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-600"
                    : "hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300"
                )}
              >
                <SmilePlus className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              className={cn(
                "p-2.5 rounded-xl transition-all flex items-center justify-center",
                inputValue.trim()
                  ? "bg-indigo-500 text-white hover:bg-indigo-600"
                  : isLightTheme
                  ? "bg-zinc-100 text-zinc-400"
                  : "bg-zinc-800 text-zinc-500"
              )}
              disabled={!inputValue.trim()}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
