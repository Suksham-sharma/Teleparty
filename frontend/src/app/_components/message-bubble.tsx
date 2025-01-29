import Image from "next/image";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string;
    };
  };
  currentUserId: string;
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const isCurrentUser = message.sender.id === currentUserId;
  const avatarUrl = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${message.sender.name}`;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 transition-opacity",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Image
        src={avatarUrl}
        alt={message.sender.name}
        width={32}
        height={32}
        className="rounded-full ring-1 ring-offset-1 transition-transform group-hover:scale-105"
      />
      <div className={cn("flex-1 min-w-0 items-start")}>
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs font-medium text-zinc-600 tracking-wide">
            {isCurrentUser ? "" : message.sender.name}
          </span>
        </div>
        <div
          className={cn(
            "relative max-w-[80%] rounded-xl px-3.5 py-2 shadow-sm transition-all hover:shadow-md",
            isCurrentUser
              ? "bg-indigo-500 text-white ml-auto"
              : "bg-zinc-100 text-zinc-900"
          )}
        >
          <p className="break-words text-xs">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
