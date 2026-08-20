export interface User {
  id: string;
  username: string;
  email: string;
}

export type Role = "HOST" | "COHOST" | "VIEWER";

export interface Membership {
  id: string;
  role: Role;
}

export interface RoomMember {
  id: string;
  role: Role;
  name: string | null;
  userId: string | null;
  joinedAt: string;
  controlRequestedAt?: string | null;
}

export type VideoSource = "UPLOAD" | "FILE" | "HLS" | "YOUTUBE" | "AUDIO";

export interface PlayableVideo {
  id: string;
  title: string;
  source: VideoSource;
  url: string;
  status: "PENDING" | "TRANSCODING" | "READY" | "FAILED";
  durationMs: number | null;
  thumbnailUrl: string | null;
}

export interface QueuedVideo {
  id: string;
  position: number;
  addedBy: string;
  addedByName: string;
  video: PlayableVideo;
}

export interface Room {
  code: string;
  title: string;
  status: "LOBBY" | "LIVE" | "ENDED";
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  currentVideoId: string | null;
  currentVideo: PlayableVideo | null;
  positionMs: number;
  isPlaying: boolean;
  scheduledFor: string | null;
  createdAt: string;
  members: RoomMember[];
  queue: QueuedVideo[];
  suggestions: QueuedVideo[];
}

export interface RoomMessage {
  id: string;
  memberId: string | null;
  authorLabel: string;
  body: string;
  createdAt: string;
  videoTimeMs: number | null;
}

/** A chat line as it arrives over the socket. */
export interface LiveMessage {
  id: string;
  memberId: string;
  name: string;
  body: string;
  sentAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  slug: string;
}

export interface VideoUploadData {
  title: string | undefined;
  description: string | undefined;
  thumbnailId: string;
  videoId: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}
