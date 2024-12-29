import { EnhancedChannel } from "./components/details";
import Navbar from "../_components/navbar";
import { cookies } from "next/headers";
import { getChannelForUser } from "@/services/api";
import { VideoGrid } from "./components/video";

export default async function ChannelPage({}: { params: { slug: string } }) {
  const cookieStore = await cookies();
  const authHeader = cookieStore.get("Authentication");
  console.log(authHeader);

  if (!authHeader?.value) return;

  const data = await getChannelForUser(authHeader?.value);
  console.log("data", data);

  return (
    <div className="min-h-screen bg-indigo-50">
      <Navbar isHome />
      <EnhancedChannel channel={data} joinCode={data.slug} />
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6 text-indigo-800">Your Videos</h2>
      </main>
      <VideoGrid videos={data.videos} />
    </div>
  );
}
