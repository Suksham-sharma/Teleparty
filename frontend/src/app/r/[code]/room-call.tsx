"use client";

import { useCallback, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useParticipantTracks,
  useRoomContext,
} from "@livekit/components-react";
import {
  ConnectionState,
  Track,
  type Participant,
} from "livekit-client";
import {
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";
import { getCallToken, type CallCredentials } from "@/services/call";
import { Button } from "@/components/ui/button";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export function RoomCall({ code }: { code: string }) {
  const [creds, setCreds] = useState<CallCredentials | null>(null);
  const [connecting, setConnecting] = useState(false);

  const join = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      setCreds(await getCallToken(code));
    } catch {
      toast.error("Couldn't join the call");
    } finally {
      setConnecting(false);
    }
  }, [code, connecting]);

  const leave = useCallback(() => setCreds(null), []);

  if (!creds) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-base text-grey">
          <VideoIcon className="h-4 w-4 shrink-0" />
          See everyone
        </span>
        <Button onClick={join} disabled={connecting} size="sm">
          {connecting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          Join call
        </Button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={creds.url}
      token={creds.token}
      connect
      audio
      video={false}
      onDisconnected={leave}
      onError={() => {
        toast.error("The call dropped");
        leave();
      }}
      className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-card lg:flex-1"
    >
      <RoomAudioRenderer />
      <CallBody onLeave={leave} />
    </LiveKitRoom>
  );
}

function CallBody({ onLeave }: { onLeave: () => void }) {
  const participants = useParticipants();
  const state = useConnectionState();
  const connecting =
    state === ConnectionState.Connecting ||
    state === ConnectionState.Reconnecting;

  const columns = participants.length <= 2 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="flex min-h-0 flex-col gap-2.5 p-2.5">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {participants.length === 0 ? (
          <p className="py-6 text-center text-base text-grey">
            {connecting ? "connecting…" : "waiting for others to join"}
          </p>
        ) : (
          <div className={`grid gap-2 ${columns}`}>
            {participants.map((participant) => (
              <CallTile key={participant.sid} participant={participant} />
            ))}
          </div>
        )}
      </div>
      <CallControls onLeave={onLeave} />
    </div>
  );
}

function CallTile({ participant }: { participant: Participant }) {
  const speaking = useIsSpeaking(participant);
  const cameraTracks = useParticipantTracks(
    [Track.Source.Camera],
    participant.identity
  );
  const camera = cameraTracks[0];
  const name = participant.name || participant.identity;
  const micOn = participant.isMicrophoneEnabled;

  return (
    <div
      className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-card-2 ring-2 transition-colors ${
        speaking ? "ring-butter" : "ring-transparent"
      }`}
    >
      {camera ? (
        <VideoTrack trackRef={camera} className="h-full w-full object-cover" />
      ) : (
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black text-lg font-medium text-butter">
          {initials(name)}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5">
        {micOn ? (
          <Mic className="h-3.5 w-3.5 shrink-0 text-grey" />
        ) : (
          <MicOff className="h-3.5 w-3.5 shrink-0 text-butter" />
        )}
        <span className="truncate text-sm text-white">
          {name}
          {participant.isLocal ? " (you)" : ""}
        </span>
      </div>
    </div>
  );
}

function CallControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  const room = useRoomContext();

  const hangUp = () => {
    room.disconnect();
    onLeave();
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <CircleButton
        onClick={() =>
          localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
        }
        label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
        muted={!isMicrophoneEnabled}
      >
        {isMicrophoneEnabled ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
      </CircleButton>

      <CircleButton
        onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        label={isCameraEnabled ? "Stop camera" : "Start camera"}
        muted={!isCameraEnabled}
      >
        {isCameraEnabled ? (
          <VideoIcon className="h-4 w-4" />
        ) : (
          <VideoOff className="h-4 w-4" />
        )}
      </CircleButton>

      <Button variant="outline" size="sm" onClick={hangUp}>
        <PhoneOff className="h-4 w-4" />
        Leave
      </Button>
    </div>
  );
}

function CircleButton({
  onClick,
  label,
  muted,
  children,
}: {
  onClick: () => void;
  label: string;
  muted: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
        muted
          ? "border-butter-mute bg-card-2 text-butter"
          : "border-transparent bg-card-2 text-white hover:border-butter-mute"
      }`}
    >
      {children}
    </button>
  );
}
