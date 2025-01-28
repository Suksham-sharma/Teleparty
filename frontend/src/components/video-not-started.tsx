"use client";

import { Film } from "lucide-react";
import { motion } from "framer-motion";

export function VideoNotStarted() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full min-h-[400px] bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 rounded-xl shadow-lg flex items-center justify-center p-8 border border-gray-200/50"
    >
      <div className="text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.2,
            type: "spring",
            stiffness: 200,
          }}
          className="mb-4 relative"
        >
          <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-50" />
          <div className="relative bg-white p-4 rounded-full shadow-md border border-gray-100 inline-block">
            <Film className="w-12 h-12 text-indigo-500" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-2xl font-semibold text-gray-800 mb-3">
            Video Not Started
          </h3>
          <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
            The channel owner has not started the video yet. You will be
            notified as soon as it begins.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
