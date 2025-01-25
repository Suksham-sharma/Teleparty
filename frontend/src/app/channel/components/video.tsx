import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailId: string;
  uploadedAt: string;
  view_count?: number;
}

export function VideoGrid({ videos, slug }: { videos: Video[]; slug: string }) {
  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos?.length > 0 ? (
          videos?.map((video) => (
            <div
              key={video.id}
              className="group rounded-xl overflow-hidden bg-white hover:bg-gray-50 transition-all duration-300"
            >
              <Link href={`/stream/${slug}?video=${video.id}`}>
                <div className="relative aspect-video overflow-hidden rounded-xl">
                  <Image
                    src={video.thumbnailId}
                    alt={video.title}
                    fill
                    className="object-cover transform transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />

                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full flex items-center gap-1.5 max-w-[66%]">
                    <h3 className="text-md font-medium text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {video.title}
                    </h3>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{video.view_count || "0"}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl">
            <h2 className="text-xl font-medium text-gray-900">
              No videos found
            </h2>
            <p className="mt-2 text-gray-600">
              Start uploading or explore other content
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoGrid;
