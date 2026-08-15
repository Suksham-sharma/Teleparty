"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getRoom, joinRoom } from "@/services/room";
import { useAuthStore } from "@/store/authStore";
import type { Membership, Room } from "@/services/types";
import { JoinGate } from "./join-gate";
import { RoomStage } from "./room-stage";

type Phase = "loading" | "gate" | "in" | "missing" | "ended";

export function RoomView({ code }: { code: string }) {
  const { user } = useAuthStore();
  const [phase, setPhase] = useState<Phase>("loading");
  const [room, setRoom] = useState<Room | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);

  const load = useCallback(async () => {
    try {
      const { room: fetched, membership: existing } = await getRoom(code);
      setRoom(fetched);

      if (fetched.status === "ENDED") {
        setPhase("ended");
        return;
      }

      if (existing) {
        setMembership(existing);
        setPhase("in");
        return;
      }

      // A signed-in visitor can be admitted without a prompt; guests need a name.
      if (user) {
        setMembership(await joinRoom(code));
        setPhase("in");
        return;
      }

      setPhase("gate");
    } catch {
      setPhase("missing");
    }
  }, [code, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleJoin = async (displayName: string) => {
    try {
      setMembership(await joinRoom(code, displayName));
      // Re-read so the roster includes us before the socket opens.
      const { room: fresh } = await getRoom(code);
      setRoom(fresh);
      setPhase("in");
    } catch {
      toast.error("Could not join this room");
    }
  };

  if (phase === "loading") {
    return (
      <Centered>
        <Loader2 className="h-5 w-5 animate-spin text-grey-dim" />
      </Centered>
    );
  }

  if (phase === "missing") {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">No room here</h1>
        <p className="mt-3 text-base text-grey">
          <code className="text-butter">{code}</code> doesn&rsquo;t match an open
          watch party. Check the code and try again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-base text-butter underline underline-offset-4"
        >
          Open your own room
        </Link>
      </Centered>
    );
  }

  if (phase === "ended") {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">This party has ended</h1>
        <p className="mt-3 text-base text-grey">
          {room?.title ?? "The room"} was closed by its host.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-base text-butter underline underline-offset-4"
        >
          Start a new one
        </Link>
      </Centered>
    );
  }

  if (phase === "gate" || !room || !membership) {
    return <JoinGate room={room} code={code} onJoin={handleJoin} />;
  }

  const displayName =
    user?.username ??
    room.members.find((m) => m.id === membership.id)?.name ??
    "Guest";

  return (
    <RoomStage
      code={code}
      room={room}
      membership={membership}
      displayName={displayName}
      onRoomChange={setRoom}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">{children}</div>
    </main>
  );
}
