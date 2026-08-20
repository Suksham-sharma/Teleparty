import axiosInstance from "@/lib/axios";

export interface CallCredentials {
  token: string;
  url: string;
}

export const getCallToken = async (code: string): Promise<CallCredentials> => {
  const { data } = await axiosInstance.post(`/rooms/${code}/call-token`);
  return data;
};
