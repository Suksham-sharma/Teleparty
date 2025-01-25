import Navbar from "@/app/_components/navbar";
import VideoHero from "./hero";

export default function VideoPage({
  searchParams,
}: {
  params: { id: string };
  searchParams: { video: string };
}) {
  const videoId = searchParams.video;

  return (
    <main>
      <Navbar />
      <VideoHero videoId={videoId} />
    </main>
  );
}
