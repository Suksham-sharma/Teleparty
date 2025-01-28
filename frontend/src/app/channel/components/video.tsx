import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import { motion } from "framer-motion";

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
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos?.length > 0 ? (
          videos?.map((video) => (
            <div
              key={video.id}
              className="group relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
            >
              <Link href={`/stream/${slug}?video=${video.id}`}>
                <div className="relative aspect-video overflow-hidden rounded-t-2xl">
                  <Image
                    src={video.thumbnailId}
                    alt={video.title}
                    fill
                    className="object-cover transform transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 via-indigo-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-indigo-200 transition-colors">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
                        <Eye className="w-4 h-4" />
                        <span>{video.view_count || "0"}</span>
                      </div>
                      <div className="text-sm text-indigo-200 line-clamp-1">
                        {video.description}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="col-span-full flex flex-col items-center justify-center py-16 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg"
          >
            <h2 className="text-2xl font-semibold text-white">
              No videos found
            </h2>
            <p className="mt-2 text-indigo-200">
              Start uploading or explore other content
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default VideoGrid;
