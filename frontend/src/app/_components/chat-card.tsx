"use client";

import {
  SmilePlus,
  Check,
  CheckCheck,
  MoreHorizontal,
  Send,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

type WebSocket = globalThis.WebSocket;

export interface Message {
  id: string;
  content: string;
  sender: {
    name: string;
    avatar: string;
    isOnline: boolean;
    isCurrentUser?: boolean;
  };
  timestamp: string;
  status: "sent" | "delivered" | "read";
  reactions?: Array<{
    emoji: string;
    count: number;
    reacted: boolean;
  }>;
}

interface ChatCardProps {
  chatName?: string;
  membersCount?: number;
  onlineCount?: number;
  initialMessages?: Message[];
  currentUser?: {
    name: string;
    avatar: string;
  };
  onSendMessage?: (message: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onMoreClick?: () => void;
  className?: string;
  theme?: "light" | "dark";
  ws: WebSocket;
}

export function ChatCard({
  chatName = "Team Chat",
  membersCount = 3,
  onlineCount = 2,
  initialMessages = [
    {
      id: "1",
      content: "Hey everyone! How's it going?",
      sender: {
        name: "Alice",
        avatar:
          "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-01-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png",
        isOnline: true,
      },
      timestamp: "10:30 AM",
      status: "read",
      reactions: [
        { emoji: "👋", count: 2, reacted: true },
        { emoji: "❤️", count: 1, reacted: false },
      ],
    },
    {
      id: "2",
      content: "Just finished the new feature implementation!",
      sender: {
        name: "Bob",
        avatar:
          "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png",
        isOnline: false,
      },
      timestamp: "10:32 AM",
      status: "delivered",
    },
  ],
  currentUser = {
    name: "You",
    avatar:
      "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-03-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png",
  },
  onSendMessage,
  onReaction,
  onMoreClick,
  className,
  theme = "light",
  ws,
}: ChatCardProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");

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
        isOnline: true,
        isCurrentUser: true,
      },
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
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

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === messageId) {
          const existingReaction = message.reactions?.find(
            (r) => r.emoji === emoji
          );
          const newReactions = message.reactions || [];

          if (existingReaction) {
            return {
              ...message,
              reactions: newReactions.map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.reacted ? r.count - 1 : r.count + 1,
                      reacted: !r.reacted,
                    }
                  : r
              ),
            };
          } else {
            return {
              ...message,
              reactions: [...newReactions, { emoji, count: 1, reacted: true }],
            };
          }
        }
        return message;
      })
    );
    onReaction?.(messageId, emoji);
    ws.send(
      JSON.stringify({
        type: "reaction",
        messageId,
        emoji,
      })
    );
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
        {/* Header */}
        <div
          className={cn(
            "sticky top-0 px-4 py-3 flex items-center justify-between border-b backdrop-blur-sm z-10",
            isLightTheme
              ? "border-zinc-200 bg-white/90"
              : "border-zinc-800 bg-zinc-900/90"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-lg font-medium text-white">
                {chatName.charAt(0)}
              </div>
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2",
                  isLightTheme ? "ring-white" : "ring-zinc-900"
                )}
              />
            </div>
            <div>
              <h3
                className={cn(
                  "font-medium",
                  isLightTheme ? "text-zinc-900" : "text-zinc-100"
                )}
              >
                {chatName}
              </h3>
              <p
                className={cn(
                  "text-sm",
                  isLightTheme ? "text-zinc-500" : "text-zinc-400"
                )}
              >
                {membersCount} members • {onlineCount} online
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onMoreClick}
            className={cn(
              "p-2 rounded-full",
              isLightTheme
                ? "hover:bg-zinc-100 text-zinc-500"
                : "hover:bg-zinc-800 text-zinc-400"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                width={36}
                height={36}
                className="rounded-full ring-2 ring-offset-2 transition-transform group-hover:scale-105"
              />
              <div
                className={cn(
                  "flex-1 min-w-0",
                  message.sender.isCurrentUser ? "items-end" : "items-start"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "font-medium",
                      isLightTheme ? "text-zinc-900" : "text-zinc-100"
                    )}
                  >
                    {message.sender.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isLightTheme ? "text-zinc-500" : "text-zinc-500"
                    )}
                  >
                    {message.timestamp}
                  </span>
                </div>
                <div
                  className={cn(
                    "relative max-w-[80%] rounded-2xl px-4 py-2 shadow-sm transition-all",
                    message.sender.isCurrentUser
                      ? isLightTheme
                        ? "bg-indigo-500 text-white ml-auto"
                        : "bg-indigo-600 text-white ml-auto"
                      : isLightTheme
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-100"
                  )}
                >
                  <p className="break-words text-sm">{message.content}</p>
                </div>
                {message.reactions && message.reactions.length > 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-1 mt-2",
                      message.sender.isCurrentUser
                        ? "justify-end"
                        : "justify-start"
                    )}
                  >
                    {message.reactions.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        onClick={() =>
                          handleReaction(message.id, reaction.emoji)
                        }
                        className={cn(
                          "px-2 py-1 rounded-full text-sm flex items-center gap-1 transition-all",
                          reaction.reacted
                            ? isLightTheme
                              ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                              : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                            : isLightTheme
                            ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        )}
                      >
                        <span className="transform hover:scale-110 transition-transform">
                          {reaction.emoji}
                        </span>
                        <span className="text-xs font-medium">
                          {reaction.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
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
