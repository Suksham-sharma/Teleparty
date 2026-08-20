import { AccessToken } from "livekit-server-sdk";
import {
  CALLS_ENABLED,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
} from "./config";

interface CallGrant {
  roomCode: string;
  identity: string;
  name: string;
  role: string;
}

class LiveKitManager {
  private static instance: LiveKitManager;

  private constructor() {}

  public static getInstance() {
    if (!this.instance) this.instance = new LiveKitManager();
    return this.instance;
  }

  public get enabled() {
    return CALLS_ENABLED;
  }

  public get url() {
    return LIVEKIT_URL;
  }

  public async mintToken({
    roomCode,
    identity,
    name,
    role,
  }: CallGrant): Promise<string> {
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name,
      metadata: JSON.stringify({ role }),
      ttl: "6h",
    });

    token.addGrant({
      roomJoin: true,
      room: roomCode,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return token.toJwt();
  }
}

export const livekitManager = LiveKitManager.getInstance();
