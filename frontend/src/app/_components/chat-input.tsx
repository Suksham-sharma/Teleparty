import { SmilePlus, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className={cn(
        "sticky bottom-0 p-4 border-t backdrop-blur-sm bg-white/90 border-zinc-200"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            className={cn(
              "w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-0",
              "bg-zinc-100 text-zinc-900 placeholder-zinc-500 border-zinc-200"
            )}
            disabled={disabled}
          />
          <button
            type="button"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all",
              "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-600"
            )}
          >
            <SmilePlus className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={onSend}
          className={cn(
            "p-2.5 rounded-xl transition-all flex items-center justify-center",
            value.trim()
              ? "bg-indigo-500 text-white hover:bg-indigo-600"
              : "bg-zinc-100 text-zinc-400"
          )}
          disabled={!value.trim() || disabled}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
