"use client";

import Image from "next/image";
import type { RoomMember } from "@/services/types";

// Warm, muted backgrounds so the faces sit on the dark surround rather than
// punching through it. docs/DESIGN.md §6.
const TINTS = ["f2e3c8", "cfe0e8", "f0d4d4", "d9e5cd", "e3d8ec", "f0e6c4"];

const avatarFor = (seed: string, tint: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=${tint}&radius=50`;

/** Who is in the room, named. Host carries the butter ring. */
export function PresenceRail({ members }: { members: RoomMember[] }) {
  if (members.length === 0) return <span />;

  const shown = members.slice(0, 8);
  const overflow = members.length - shown.length;

  return (
    <div className="flex items-center gap-3.5">
      <div className="flex">
        {shown.map((member, i) => (
          <span
            key={member.id}
            title={`${member.name ?? "Guest"}${
              member.role !== "VIEWER" ? ` · ${member.role.toLowerCase()}` : ""
            }`}
            className={`-ml-2.5 inline-block h-9 w-9 overflow-hidden rounded-full border-2 bg-card-2 first:ml-0 ${
              member.role === "HOST" ? "border-butter" : "border-black"
            }`}
          >
            <Image
              src={avatarFor(
                member.name ?? member.id,
                TINTS[i % TINTS.length]
              )}
              alt={member.name ?? "Guest"}
              width={36}
              height={36}
              unoptimized
            />
          </span>
        ))}
      </div>

      <span className="text-base text-grey">
        {overflow > 0 && `+${overflow} · `}
        {members.length} watching
      </span>
    </div>
  );
}
