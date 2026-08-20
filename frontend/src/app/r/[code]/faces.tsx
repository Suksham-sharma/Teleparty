"use client";

import Image from "next/image";
import {
  VideoTrack,
  useIsSpeaking,
  useParticipants,
  useParticipantTracks,
} from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { Mic, MicOff } from "lucide-react";
import type { RoomMember } from "@/services/types";
import { solveLobbyGrid, LOBBY_GAP } from "@/lib/room-layout";
import { useCall } from "./call-provider";

const TINTS = ["f2e3c8", "cfe0e8", "f0d4d4", "d9e5cd", "e3d8ec", "f0e6c4"];

const avatarFor = (seed: string, tint: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=${tint}&radius=50`;

export interface Face {
  id: string;
  name: string;
  role: RoomMember["role"];
  tint: string;
  participant?: Participant;
}

export function useFaces(members: RoomMember[]): {
  faces: Face[];
  onCamera: Face[];
  offCamera: Face[];
} {
  const { status } = useCall();
  const participants = useParticipants();

  const live = new Map(
    status === "joined" ? participants.map((p) => [p.identity, p]) : []
  );

  const faces = members.map((member, i) => ({
    id: member.id,
    name: member.name ?? "Guest",
    role: member.role,
    tint: TINTS[i % TINTS.length],
    participant: live.get(member.id),
  }));

  const publishing = (face: Face) =>
    face.participant?.isCameraEnabled ?? false;

  return {
    faces,
    onCamera: faces.filter(publishing),
    offCamera: faces.filter((face) => !publishing(face)),
  };
}

export function FacesBand({
  onCamera,
  offCamera,
  tileW,
  tileH,
  height,
  width,
}: {
  onCamera: Face[];
  offCamera: Face[];
  tileW: number;
  tileH: number;
  height: number;
  width: number;
}) {
  return (
    <div className="flex items-center gap-4" style={{ height, width }}>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto">
        {onCamera.map((face) => (
          <CameraTile
            key={face.id}
            face={face}
            width={tileW}
            height={tileH}
          />
        ))}

        {offCamera.length > 0 && (
          <div className="flex shrink-0 flex-col items-start gap-1.5 pl-2">
            <AvatarStack faces={offCamera} />
            <span className="label-mute">mic only</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function FacesRail({
  faces,
  height,
  width,
}: {
  faces: Face[];
  height: number;
  width: number;
}) {
  const inCall = faces.filter((face) => face.participant).length;

  return (
    <div
      className="flex items-center gap-3.5 rounded-lg bg-card px-3.5"
      style={{ height, width }}
    >
      <AvatarStack faces={faces.slice(0, 8)} />
      <span className="text-base text-grey">
        {faces.length > 8 && `+${faces.length - 8} · `}
        {faces.length} here
        {inCall > 0 && ` · ${inCall} on call`}
      </span>
    </div>
  );
}

export function FacesStage({
  faces,
  width,
  height,
}: {
  faces: Face[];
  width: number;
  height: number;
}) {
  const grid = solveLobbyGrid(Math.max(faces.length, 1), width, height);

  return (
    <div
      className="flex flex-wrap content-center items-center justify-center"
      style={{ width, height, gap: LOBBY_GAP }}
    >
      {faces.map((face) => (
        <CameraTile
          key={face.id}
          face={face}
          width={grid.tileW}
          height={grid.tileH}
        />
      ))}
    </div>
  );
}

function CameraTile({
  face,
  width,
  height,
}: {
  face: Face;
  width: number;
  height: number;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-card-2"
      style={{ width, height }}
    >
      {face.participant ? (
        <LiveTile face={face} />
      ) : (
        <RestingTile face={face} />
      )}
    </div>
  );
}

function LiveTile({ face }: { face: Face }) {
  const participant = face.participant!;
  const speaking = useIsSpeaking(participant);
  const cameraTracks = useParticipantTracks(
    [Track.Source.Camera],
    participant.identity
  );
  const camera = cameraTracks[0];

  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-10 rounded-lg ring-2 transition-colors ${
          speaking ? "ring-butter" : "ring-transparent"
        }`}
      />

      {camera ? (
        <VideoTrack trackRef={camera} className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <Initials name={face.name} />
        </span>
      )}

      <TileLabel
        name={`${face.name}${participant.isLocal ? " (you)" : ""}`}
        micOn={participant.isMicrophoneEnabled}
      />
    </>
  );
}

function RestingTile({ face }: { face: Face }) {
  return (
    <>
      <span className="absolute inset-0 flex items-center justify-center">
        <Initials name={face.name} />
      </span>
      <TileLabel name={face.name} micOn={false} resting />
    </>
  );
}

function TileLabel({
  name,
  micOn,
  resting,
}: {
  name: string;
  micOn: boolean;
  resting?: boolean;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5">
      {resting ? null : micOn ? (
        <Mic className="h-3.5 w-3.5 shrink-0 text-grey" />
      ) : (
        <MicOff className="h-3.5 w-3.5 shrink-0 text-butter" />
      )}
      <span className="truncate text-sm text-white">{name}</span>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black text-lg font-medium text-butter">
      {initials}
    </span>
  );
}

function AvatarStack({ faces }: { faces: Face[] }) {
  return (
    <div className="flex">
      {faces.map((face) => (
        <StackedAvatar key={face.id} face={face} />
      ))}
    </div>
  );
}

function StackedAvatar({ face }: { face: Face }) {
  return face.participant ? (
    <LiveAvatar face={face} participant={face.participant} />
  ) : (
    <Avatar face={face} lit={face.role === "HOST"} />
  );
}

function LiveAvatar({
  face,
  participant,
}: {
  face: Face;
  participant: Participant;
}) {
  const speaking = useIsSpeaking(participant);
  return <Avatar face={face} lit={speaking || face.role === "HOST"} />;
}

function Avatar({ face, lit }: { face: Face; lit: boolean }) {
  return (
    <span
      title={`${face.name}${
        face.role !== "VIEWER" ? ` · ${face.role.toLowerCase()}` : ""
      }`}
      className={`-ml-2.5 inline-block h-9 w-9 overflow-hidden rounded-full border-2 bg-card-2 first:ml-0 ${
        lit ? "border-butter" : "border-black"
      }`}
    >
      <Image
        src={avatarFor(face.name, face.tint)}
        alt={face.name}
        width={36}
        height={36}
        unoptimized
      />
    </span>
  );
}
