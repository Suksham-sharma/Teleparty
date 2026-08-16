"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createRoom } from "@/services/room";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

export function StartParty() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const room = await createRoom();
      router.push(`/r/${room.code}`);
    } catch {
      toast.error("Could not open the room");
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto mt-9 max-w-[600px]">
      <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        {user ? (
          <Button
            size="lg"
            onClick={handleCreate}
            disabled={creating}
            className="h-[52px] w-full sm:w-auto"
          >
            {creating && <Loader2 className="animate-spin" />}
            {creating ? "Opening the room" : "Open a room"}
          </Button>
        ) : (
          <Button size="lg" asChild className="h-[52px] w-full sm:w-auto">
            <Link href="/auth">Sign in to host</Link>
          </Button>
        )}
      </div>

      <p className="mt-4 text-center text-base text-grey-dim">
        {user
          ? "Your room is ready in one click"
          : "Hosting needs an account · everyone you invite joins with just the link"}
      </p>
    </div>
  );
}
