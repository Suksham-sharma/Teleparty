import axiosInstance from "@/lib/axios";
import type { Membership, Room, RoomMessage } from "./types";

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

export const addToQueue = async (code: string, videoId: string) => {
  const { data } = await axiosInstance.post(`/rooms/${code}/queue`, { videoId });
  return data.item;
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
