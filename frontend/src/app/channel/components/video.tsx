"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  views: string;
  uploadedAt: string;
}

export function VideoGrid({ videos }: { videos: Video[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
      {videos.map((video) => (
        <motion.div
          key={video.id}
          // initial={{ opacity: 0, y: 20 }}
          // animate={{ opacity: 1, y: 0 }}
          // transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Link href={`/video/${video.id}`}>
            <div
              // whileHover={{ scale: 1.05 }}
              className="hover:scale-[101%] transition-transform duration-200"
            >
              <div className="relative h-48">
                <Image
                  src={video.thumbnailUrl}
                  alt={video.title}
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-xl"
                />
              </div>
              <div className="py-4 grid gap-1">
                <h3 className="text-xl font-medium line-clamp-2">
                  {video.title}
                </h3>
                <div className="flex gap-5 text-sm text-gray-600">
                  <span>{video.uploadedAt}</span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
