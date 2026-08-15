"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { Room } from "@/services/types";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/app/_components/site-header";
import { Ambient } from "@/app/_components/ambient";

const TINTS = ["f2e3c8", "cfe0e8", "f0d4d4", "d9e5cd", "e3d8ec", "f0e6c4"];
const avatarFor = (seed: string, tint: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=${tint}&radius=50`;

/**
 * The no-signup door. A friend who opens /r/WOLF-42 gives a name and is in.
 *
 * Deliberately not a card on a slab: you see the room you're walking into —
 * its name, its code, who is already sitting there — and the prompt is one
 * line across the bottom of that, not a form you fill in first.
 */
export function JoinGate({
  room,
  code,
  onJoin,
}: {
  room: Room | null;
  code: string;
  onJoin: (displayName: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await onJoin(name.trim());
    setBusy(false);
  };

  const members = room?.members ?? [];
  const watching = members.length;

  return (
    <main className="relative flex min-h-screen flex-col">
      <Ambient />

      <div className="px-6 py-5 md:px-10">
        <Wordmark />
      </div>

      <div className="flex flex-1 items-center px-6 pb-20 md:px-10">
        <div className="mx-auto w-full max-w-[680px]">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-butter-mute px-3.5 py-1 font-mono text-sm tracking-[0.1em] text-butter">
              {code}
            </span>
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-butter">
              <span className="h-1.5 w-1.5 animate-filament rounded-full bg-butter" />
              {room?.status === "LIVE" ? "Playing now" : "Waiting to start"}
            </span>
          </div>

          <h1 className="text-2xl font-extralight tracking-[-0.03em] md:text-[3.25rem] md:leading-[1.05]">
            {room?.title ?? "Watch party"}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            {watching > 0 && (
              <div className="flex">
                {members.slice(0, 6).map((m, i) => (
                  <span
                    key={m.id}
                    title={m.name ?? "Guest"}
                    className={`-ml-2.5 inline-block h-10 w-10 overflow-hidden rounded-full border-2 bg-card-2 first:ml-0 ${
                      m.role === "HOST" ? "border-butter" : "border-black"
                    }`}
                  >
                    <Image
                      src={avatarFor(m.name ?? m.id, TINTS[i % TINTS.length])}
                      alt={m.name ?? "Guest"}
                      width={40}
                      height={40}
                      unoptimized
                    />
                  </span>
                ))}
              </div>
            )}
            <p className="text-md text-grey">
              {watching === 0
                ? "You'll be the first one here."
                : `${members
                    .slice(0, 2)
                    .map((m) => m.name ?? "Guest")
                    .join(", ")}${
                    watching > 2 ? ` and ${watching - 2} more` : ""
                  } ${watching === 1 ? "is" : "are"} already here.`}
            </p>
          </div>

          {/* One line, not a form. */}
          <div className="mt-9 flex flex-col gap-2.5 sm:flex-row">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submit()}
              placeholder="What should we call you?"
              aria-label="What should we call you?"
              maxLength={40}
              className="h-[52px] flex-1 rounded-full border border-hair bg-card px-6 text-md text-white outline-none transition-colors placeholder:text-grey-dim focus:border-butter focus:bg-card-2"
            />
            <Button
              onClick={submit}
              disabled={busy || !name.trim()}
              className="h-[52px] px-9"
            >
              {busy && <Loader2 className="animate-spin" />}
              Join
            </Button>
          </div>

          <p className="mt-4 text-base text-grey-dim">
            No account needed. Your name is only shown inside this room.
          </p>
        </div>
      </div>
    </main>
  );
}
