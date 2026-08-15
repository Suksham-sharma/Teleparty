"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import type { LiveMessage } from "@/services/types";

/**
 * No bubbles: a watch-party chat is glanceable peripheral content, and bubbles
 * halve the density. Name above message, bottom-anchored so the newest line
 * sits on the input. docs/DESIGN.md §6.
 */
export function RoomChat({
  messages,
  memberId,
  memberCount,
  status,
  onSend,
}: {
  messages: LiveMessage[];
  memberId: string;
  memberCount: number;
  status: "connecting" | "open" | "closed" | "error";
  onSend: (body: string) => void;
}) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-card">
      <div className="flex items-center justify-between border-b border-hair px-4 py-3.5">
        <h3 className="text-md font-semibold text-white">Chat</h3>
        <span className="text-sm text-grey">
          {status === "open" ? (
            `${memberCount} here`
          ) : status === "connecting" ? (
            "connecting…"
          ) : (
            <span className="text-grey-dim">disconnected</span>
          )}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-base text-grey-dim">
            No messages yet. Say something.
          </p>
        )}

        {messages.map((message) => {
          const mine = message.memberId === memberId;
          return (
            <div key={message.id} className="animate-fade-up">
              <span
                className={`text-sm font-semibold ${
                  mine ? "text-butter" : "text-grey"
                }`}
              >
                {mine ? "You" : message.name}
              </span>
              <p className="text-base leading-relaxed text-ash">
                {message.body}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-hair p-3">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder="Message the room"
          aria-label="Message the room"
          disabled={status !== "open"}
          className="h-10 min-w-0 flex-1 rounded-full bg-card-2 px-5 text-base text-white outline-none transition-colors placeholder:text-grey-dim focus:ring-2 focus:ring-butter disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={status !== "open" || !value.trim()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-butter text-black transition-colors hover:bg-butter-deep disabled:bg-card-2 disabled:text-grey-dim"
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
