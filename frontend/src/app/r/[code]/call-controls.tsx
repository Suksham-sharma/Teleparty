"use client";

import { useLocalParticipant } from "@livekit/components-react";
import {
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCall } from "./call-provider";

export function CallControls() {
  const { status, join } = useCall();

  if (status !== "joined") {
    return (
      <Button
        onClick={join}
        disabled={status === "joining"}
        size="sm"
        variant="outline"
      >
        {status === "joining" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
        Join call
      </Button>
    );
  }

  return <LiveControls />;
}

function LiveControls() {
  const { leave } = useCall();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();

  return (
    <div className="flex items-center gap-1.5">
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

      <Button variant="outline" size="sm" onClick={leave}>
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
          : "border-transparent bg-card text-white hover:border-butter-mute"
      }`}
    >
      {children}
    </button>
  );
}
