import Navbar from "@/app/_components/navbar";
import VideoHero from "./hero";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const searchParams = await params;
  const id = searchParams.id;

  return (
    <div>
      <Navbar />
      <VideoHero />
    </div>
  );
}
