import VideoPlayer from "@/components/VideoPlayer";

export default function VideoHero() {
  return (
    <div className="grid grid-cols-4 gap-10 mt-20 min-h-[50vh] py-10 max-w-7xl mx-auto">
      <VideoPlayer
        className="col-span-3"
        src="https://d3uupbz3igyr5f.cloudfront.net/transcoded/4ba26d13-3d98-4f02-88f2-fd95cac3b1ce/master.m3u8"
      />
      <div className="h-full border"></div>
    </div>
  );
}
