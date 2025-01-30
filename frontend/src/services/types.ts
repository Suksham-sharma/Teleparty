export interface User {
  id: string;
  username: string;
  email: string;
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
