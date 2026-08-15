"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listMyRooms } from "@/services/room";
import type { Room } from "@/services/types";

/**
 * Rooms are disposable and the link is the artifact, so most people have none
 * of these. The strip renders nothing at all when the list is empty rather
 * than occupying the page with a zero state.
 */
export function OpenRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    listMyRooms()
      .then(setRooms)
      .catch(() => {});
  }, []);

  if (rooms.length === 0) return null;

  return (
    <section className="mb-10">
      <p className="label-mute mb-3">Still open</p>
      <div className="flex flex-wrap gap-2.5">
        {rooms.map((room) => (
          <Link
            key={room.code}
            href={`/r/${room.code}`}
            className="group inline-flex items-center gap-3 rounded-full bg-card py-2 pl-4 pr-5 transition-colors hover:bg-card-2"
          >
            <span className="h-1.5 w-1.5 shrink-0 animate-filament rounded-full bg-butter" />
            <code className="text-sm font-medium tracking-[0.1em] text-butter">
              {room.code}
            </code>
            <span className="max-w-[22ch] truncate text-base text-grey">
              {room.title}
            </span>
            <span className="text-base text-grey-dim">
              {room.members.length}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
