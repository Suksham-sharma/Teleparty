"use client";
import React from "react";
import Link from "next/link";
import { VideoCard } from "@/components/video-card";
import { notifyVideoChange } from "@/services/video";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailId: string;
  uploadedAt: string;
  view_count?: number;
}

export function VideoGrid({ videos, slug }: { videos: Video[]; slug: string }) {
  const handleVideoClick = async (videoId: string) => {
    await notifyVideoChange(videoId);
  };

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
          onClick={() => handleVideoClick(video.id)}
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
