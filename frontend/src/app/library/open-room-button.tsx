"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createRoom } from "@/services/room";
import { Button } from "@/components/ui/button";

/** The primary action on the signed-in home: open an empty room right now. */
export function OpenRoomButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const room = await createRoom();
      router.push(`/r/${room.code}`);
    } catch {
      toast.error("Could not open the room");
      setBusy(false);
    }
  };

  return (
    <Button onClick={open} disabled={busy}>
      {busy && <Loader2 className="animate-spin" />}
      {busy ? "Opening" : "Open a room"}
    </Button>
  );
}
