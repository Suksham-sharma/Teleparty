import React from "react";
import Image from "next/image";
import Link from "next/link";

interface VideoCardProps {
  title: string;
  description: string;
  thumbnailUrl: string;
}

function VideoCard({ title, description, thumbnailUrl }: VideoCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg bg-white">
      <div className="aspect-video overflow-hidden">
        <Image
          className="h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          src={thumbnailUrl || "/placeholder.svg?height=300&width=400"}
          alt={title}
          width={800}
          height={450}
        />
        <div className="absolute inset-0 bg-indigo-600 bg-opacity-40 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-full transition-transform duration-300 ease-in-out group-hover:translate-y-0 bg-gradient-to-t from-indigo-900 to-transparent">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm opacity-90">{description}</p>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 transform scale-x-0 transition-transform duration-300 ease-in-out group-hover:scale-x-100" />
    </div>
  );
}

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailId: string;
  uploadedAt: string;
  view_count?: number;
}

export function VideoGrid({ videos, slug }: { videos: Video[]; slug: string }) {
  if (!videos?.length) {
    return (
      <div className="w-full py-16 text-center bg-white/10 border border-white/20">
        <h2 className="text-2xl font-semibold text-indigo-900">
          No videos found
        </h2>
        <p className="mt-2 text-indigo-600">
          Start uploading or explore other content
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <Link
          key={video.id}
          href={`/stream/${slug}?video=${video.id}`}
          className="block"
        >
          <VideoCard
            title={video.title}
            description={video.description}
            thumbnailUrl={video.thumbnailId}
          />
        </Link>
      ))}
    </div>
  );
}

export default VideoGrid;
