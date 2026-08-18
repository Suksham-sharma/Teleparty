import axiosInstance from "@/lib/axios";
import type { Membership, PlayableVideo, Room, RoomMessage } from "./types";

export const createRoom = async (input?: {
  title?: string;
  hostName?: string;
}): Promise<Room> => {
  const { data } = await axiosInstance.post("/rooms", input ?? {});
  return data.room;
};

export const getRoom = async (
  code: string
): Promise<{ room: Room; membership: Membership | null }> => {
  const { data } = await axiosInstance.get(`/rooms/${code}`);
  return data;
};

/** Rooms you are hosting that haven't ended. Guests always get an empty list. */
export const listMyRooms = async (): Promise<Room[]> => {
  const { data } = await axiosInstance.get("/rooms/mine");
  return data.rooms ?? [];
};

export const joinRoom = async (
  code: string,
  displayName?: string
): Promise<Membership> => {
  const { data } = await axiosInstance.post(`/rooms/${code}/join`, {
    displayName,
  });
  return data.membership;
};

export const endRoom = async (code: string) => {
  await axiosInstance.post(`/rooms/${code}/end`);
};

export const setRoomSource = async (
  code: string,
  url: string
): Promise<PlayableVideo> => {
  const { data } = await axiosInstance.post(`/rooms/${code}/source`, { url });
  return data.video;
};

export const addToQueue = async (
  code: string,
  input: { url?: string; videoId?: string }
): Promise<{ id: string; status: "SUGGESTED" | "QUEUED"; video: PlayableVideo }> => {
  const { data } = await axiosInstance.post(`/rooms/${code}/queue`, input);
  return data.item;
};

export const approveSuggestion = async (code: string, itemId: string) => {
  await axiosInstance.post(`/rooms/${code}/queue/${itemId}/approve`);
};

export const playNext = async (
  code: string,
  afterVideoId: string
): Promise<boolean> => {
  const { data } = await axiosInstance.post(`/rooms/${code}/next`, {
    afterVideoId,
  });
  return Boolean(data.advanced);
};

export const removeFromQueue = async (code: string, itemId: string) => {
  await axiosInstance.delete(`/rooms/${code}/queue/${itemId}`);
};

export const setMemberRole = async (
  code: string,
  memberId: string,
  role: "COHOST" | "VIEWER"
) => {
  await axiosInstance.post(`/rooms/${code}/role`, { memberId, role });
};

export const getMessages = async (code: string): Promise<RoomMessage[]> => {
  const { data } = await axiosInstance.get(`/rooms/${code}/messages`);
  return data.messages;
};
