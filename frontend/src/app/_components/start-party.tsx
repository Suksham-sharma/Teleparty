"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createRoom } from "@/services/room";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

/**
 * The landing CTA. Creating a room must work without an account — that is the
 * whole point of the flow — so a guest is asked only for a display name.
 *
 * Joining by code lives in the header (`join-code.tsx`).
 */
export function StartParty() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hostName, setHostName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user && !hostName.trim()) {
      toast.error("Tell us your name first");
      return;
    }

    setCreating(true);
    try {
      const room = await createRoom({ hostName: hostName.trim() || undefined });
      router.push(`/r/${room.code}`);
    } catch {
      toast.error("Could not open the room");
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto mt-9 max-w-[600px]">
      <div className="flex flex-col items-center gap-2.5 sm:flex-row">
        {!user && (
          <input
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleCreate()}
            placeholder="Your name"
            aria-label="Your name"
            maxLength={40}
            className="h-[52px] w-full flex-1 rounded-full border border-hair bg-card px-6 text-md text-white outline-none transition-colors placeholder:text-grey-dim focus:border-butter focus:bg-card-2"
          />
        )}
        <Button
          size="lg"
          onClick={handleCreate}
          disabled={creating}
          className="h-[52px] w-full sm:w-auto"
        >
          {creating && <Loader2 className="animate-spin" />}
          {creating ? "Opening the room" : "Open a room"}
        </Button>
      </div>

      <p className="mt-4 text-center text-base text-grey-dim">
        No account needed · your room is ready in one click
      </p>
    </div>
  );
}
