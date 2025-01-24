import { Channel } from "../components/details";
import Navbar from "../../_components/navbar";
import { getChannelForUser } from "@/services/api";
import { VideoGrid } from "../components/video";
import { cookies } from "next/headers";

export default async function ChannelPage({}: { params: { slug: string } }) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("authToken");
  if (!authToken) return;

  const data = await getChannelForUser(authToken.value);
  console.log("data", data);

  return (
    <div className="min-h-screen bg-indigo-50">
      <Navbar isHome />
      <Channel channel={data} joinCode={data.slug} />
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6 text-indigo-800">Your Videos</h2>
      </main>
      <VideoGrid videos={data?.videos} />
    </div>
  );
}
