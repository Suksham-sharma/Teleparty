import Navbar from "@/app/_components/navbar";
import VideoHero from "./hero";

export default function VideoPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <Navbar />
      <VideoHero videoId={params.id} />
    </main>
  );
}
