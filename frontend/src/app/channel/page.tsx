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
      <Channel channel={data} joinCode={data.slug} />
      <main className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 text-indigo-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-blue-700">
          Your Videos
        </h2>
      </main>
      <VideoGrid videos={data?.videos} slug={data.slug} />
    </div>
  );
}
