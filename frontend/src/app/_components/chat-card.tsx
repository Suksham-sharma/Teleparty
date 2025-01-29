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
  currentUser?: {
    id: string;
    name: string;
  };
  onSendMessage?: (message: string) => void;
  className?: string;
  ws: WebSocket;
}

export function ChatCard({
  initialMessages = [
    {
      id: "1",
      content: "Hey everyone! Ready to watch the movie?",
      sender: {
        id: "alice123",
        name: "Alice",
      },
    },
    {
      id: "2",
      content: "Yes, I've got my popcorn ready! 🍿",
      sender: {
        id: "bob123",
        name: "Bob",
      },
    },
    {
      id: "3",
      content: "Great! I'll start the video in 2 minutes.",
      sender: {
        id: "current123",
        name: "Aloha",
      },
    },
  ],
  currentUser = {
    id: "current123",
    name: "Aloha",
  },
  onSendMessage,
  className,

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
        id: currentUser.id,
        name: currentUser.name,
      },
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

  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto rounded-2xl overflow-hidden",
        "bg-white text-zinc-900 border border-zinc-200",
        className
      )}
    >
      <div className="flex flex-col h-[600px] relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUserId={currentUser.id}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
        />
      </div>
    </div>
  );
}
