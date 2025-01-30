import { Channel } from "./components/details";
import Navbar from "../_components/navbar";

import { VideoGrid } from "./components/video";
import { cookies } from "next/headers";
import { getChannelForUser } from "@/services/channel";

export default async function ChannelPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("Authentication");

  if (!authToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-indigo-900">
            Authentication Required
          </h1>
          <p className="text-indigo-600">Please sign in to view your channel</p>
        </div>
      </div>
    );
  }

  const data = await getChannelForUser(authToken.value);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <Navbar isHome />
      <div className="mx-auto">
        <Channel channel={data} joinCode={data.slug} />
        <div className="py-16 space-y-6  mx-auto px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-indigo-900">Your Videos</h2>
          </div>
          <div className=" bg-white/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/30">
            <VideoGrid videos={data?.videos} slug={data.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
