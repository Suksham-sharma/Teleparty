import VideoPlayer from "@/components/video-player";

export default function VideoHero() {
  return (
    <div className="grid grid-cols-4 gap-10 mt-20 min-h-[50vh] py-10 max-w-7xl mx-auto">
      <VideoPlayer
        className="col-span-3"
        src="https://www.sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"
      />
      <div className="h-full border"></div>
    </div>
  );
}
