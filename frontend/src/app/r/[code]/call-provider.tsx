"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RoomAudioRenderer, RoomContext } from "@livekit/components-react";
import { Room, RoomEvent } from "livekit-client";
import { toast } from "sonner";
import { getCallToken } from "@/services/call";

type CallStatus = "idle" | "joining" | "joined";

interface CallValue {
  status: CallStatus;
  join: () => void;
  leave: () => void;
}

const CallCtx = createContext<CallValue>({
  status: "idle",
  join: () => {},
  leave: () => {},
});

export const useCall = () => useContext(CallCtx);

export function CallProvider({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) {
  const room = useMemo(() => new Room(), []);
  const [status, setStatus] = useState<CallStatus>("idle");

  useEffect(() => {
    const settle = () => setStatus("idle");
    room.on(RoomEvent.Disconnected, settle);
    return () => {
      room.off(RoomEvent.Disconnected, settle);
      room.disconnect();
    };
  }, [room]);

  const join = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("joining");

    try {
      const { token, url } = await getCallToken(code);
      await room.connect(url, token);
    } catch {
      toast.error("Couldn't join the call");
      room.disconnect();
      setStatus("idle");
      return;
    }

    setStatus("joined");

    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch {
      toast.error("You're in, but your mic is off — check permissions");
    }
  }, [code, room, status]);

  const leave = useCallback(() => {
    room.disconnect();
  }, [room]);

  const value = useMemo(() => ({ status, join, leave }), [status, join, leave]);

  return (
    <CallCtx.Provider value={value}>
      <RoomContext.Provider value={room}>
        <RoomAudioRenderer />
        {children}
      </RoomContext.Provider>
    </CallCtx.Provider>
  );
}
