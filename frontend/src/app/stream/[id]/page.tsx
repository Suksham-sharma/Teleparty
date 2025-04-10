import Navbar from "@/app/_components/navbar";
import VideoHero from "./hero";

export default async function VideoPage({
  params: { id },
  searchParams,
}: {
  params: { id: string };
  searchParams: { video?: string };
}) {
  const videoId = await Promise.resolve(searchParams.video);

  return (
    <main>
      <Navbar />
      <VideoHero videoId={videoId} roomId={id} />
    </main>
  );
}
