import { Channel } from "./components/details";
import Navbar from "../_components/navbar";
import { getChannelForUser } from "@/services/api";
import { VideoGrid } from "./components/video";
import { cookies } from "next/headers";

export default async function ChannelPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("Authentication");
  if (!authToken) return null;

  const data = await getChannelForUser(authToken.value);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <Navbar isHome />
      <div className="pt-16">
        <Channel channel={data} joinCode={data.slug} />
      </div>
      <main className="container mx-auto px-4 py-16 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold text-indigo-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-blue-700">
            Your Videos
          </h2>
        </div>
        <div className="bg-white/30 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
          <VideoGrid videos={data?.videos} slug={data.slug} />
        </div>
      </main>
    </div>
  );
}
