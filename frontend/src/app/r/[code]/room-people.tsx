"use client";

import { useState } from "react";
import Image from "next/image";
import axios from "axios";
import { Check, Hand, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  clearControlRequest,
  requestControl,
  setMemberRole,
} from "@/services/room";
import { Button } from "@/components/ui/button";
import type { Membership, RoomMember } from "@/services/types";

const TINTS = ["f2e3c8", "cfe0e8", "f0d4d4", "d9e5cd", "e3d8ec", "f0e6c4"];

const avatarFor = (seed: string, tint: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=${tint}&radius=50`;

const reasonFrom = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const reason = error.response?.data?.error;
    if (typeof reason === "string") return reason;
  }
  return "That didn't work.";
};

const roleLabel = (role: RoomMember["role"]) =>
  role === "HOST" ? "host" : role === "COHOST" ? "co-host" : null;

export function RoomPeople({
  code,
  members,
  membership,
  onChanged,
}: {
  code: string;
  members: RoomMember[];
  membership: Membership;
  onChanged: () => void;
}) {
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const isHost = membership.role === "HOST";
  const canControl = isHost || membership.role === "COHOST";

  const me = members.find((member) => member.id === membership.id);
  const asked = Boolean(me?.controlRequestedAt);

  const requests = isHost
    ? members.filter(
        (member) => member.controlRequestedAt && member.role === "VIEWER"
      )
    : [];

  const act = async (memberId: string, run: () => Promise<void>) => {
    setActingOn(memberId);
    try {
      await run();
      onChanged();
    } catch (error) {
      toast.error(reasonFrom(error));
    } finally {
      setActingOn(null);
    }
  };

  const ask = async () => {
    setAsking(true);
    try {
      await requestControl(code);
      onChanged();
      toast.success("Asked — the host decides");
    } catch (error) {
      toast.error(reasonFrom(error));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        {requests.length > 0 && (
          <section>
            <p className="label-mute mb-2.5">
              Asking to co-host · {requests.length}
            </p>
            <ul className="space-y-2">
              {requests.map((member, i) => (
                <li key={member.id} className="flex items-center gap-2">
                  <Row member={member} tint={TINTS[i % TINTS.length]} />
                  <IconButton
                    label={`Make ${member.name ?? "them"} a co-host`}
                    busy={actingOn === member.id}
                    accent
                    onClick={() =>
                      act(member.id, () =>
                        setMemberRole(code, member.id, "COHOST")
                      )
                    }
                  >
                    <Check className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    label={`Decline ${member.name ?? "them"}`}
                    busy={actingOn === member.id}
                    onClick={() =>
                      act(member.id, () => clearControlRequest(code, member.id))
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <p className="label-mute mb-2.5">In the room · {members.length}</p>
          <ul className="space-y-2">
            {members.map((member, i) => (
              <li key={member.id} className="flex items-center gap-2">
                <Row
                  member={member}
                  tint={TINTS[i % TINTS.length]}
                  you={member.id === membership.id}
                />
                {isHost && member.id !== membership.id && (
                  <RoleAction
                    busy={actingOn === member.id}
                    member={member}
                    onClick={() =>
                      act(member.id, () =>
                        setMemberRole(
                          code,
                          member.id,
                          member.role === "COHOST" ? "VIEWER" : "COHOST"
                        )
                      )
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!canControl && (
        <div className="p-3 pt-0">
          {asked ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-base text-grey-dim">
                Waiting on the host.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={actingOn === membership.id}
                onClick={() =>
                  act(membership.id, () =>
                    clearControlRequest(code, membership.id)
                  )
                }
              >
                Withdraw
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={asking}
              onClick={ask}
            >
              {asking ? <Loader2 className="animate-spin" /> : <Hand />}
              Ask to co-host
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  member,
  tint,
  you,
}: {
  member: RoomMember;
  tint: string;
  you?: boolean;
}) {
  const label = roleLabel(member.role);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        className={`inline-block h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 bg-card-2 ${
          member.role === "HOST" ? "border-butter" : "border-transparent"
        }`}
      >
        <Image
          src={avatarFor(member.name ?? member.id, tint)}
          alt=""
          width={32}
          height={32}
          unoptimized
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base text-ash">
          {you ? "You" : member.name ?? "Guest"}
        </p>
        {label && (
          <p className="mt-0.5 truncate font-mono text-xs text-grey-dim">
            {label}
          </p>
        )}
      </div>
    </div>
  );
}

function RoleAction({
  member,
  busy,
  onClick,
}: {
  member: RoomMember;
  busy: boolean;
  onClick: () => void;
}) {
  if (member.role === "HOST") return null;

  const demote = member.role === "COHOST";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="shrink-0 rounded-full px-3 py-1 font-mono text-xs tracking-[0.04em] text-grey transition-colors hover:bg-card-2 hover:text-ash disabled:opacity-40"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : demote ? (
        "demote"
      ) : (
        "make co-host"
      )}
    </button>
  );
}

function IconButton({
  label,
  busy,
  accent,
  onClick,
  children,
}: {
  label: string;
  busy: boolean;
  accent?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
        accent
          ? "bg-butter text-black hover:bg-butter-deep"
          : "bg-card-2 text-grey hover:text-ash"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}
