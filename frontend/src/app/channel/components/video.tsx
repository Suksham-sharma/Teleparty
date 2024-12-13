"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  uploadedAt: string;
}

export function VideoGrid({ videos }: { videos: Video[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
      {videos.length > 0 ? (
        videos.map((video) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group"
          >
            <Link href={`/video/${video.id}`} className="block">
              <div className="hover:scale-[102%] transition-transform duration-300 ease-in-out">
                <div className="relative h-48 overflow-hidden rounded-xl group-hover:shadow-lg">
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    style={{ objectFit: "cover" }}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="py-4 grid gap-2">
                  <h3 className="text-xl font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{video.uploadedAt}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))
      ) : (
        <div className="col-span-full text-center py-10 text-blue-600">
          <h2 className="text-2xl font-medium">No videos found</h2>
          <p className="mt-2 text-blue-500">
            Start Uploading or Explore Other Content
          </p>
        </div>
      )}
    </div>
  );
}
