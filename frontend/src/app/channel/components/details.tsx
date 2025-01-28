"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import JoinStreamBanner from "./join-stream-banner";

interface ChannelProps {
  channel: {
    name: string;
    description: string;
    avatarUrl: string;
    bannerUrl: string;
    subscribers: string;
    totalViews: string;
  };
  joinCode: string;
}

export function Channel({ channel, joinCode }: ChannelProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="relative overflow-hidden group min-h-[400px]">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/40 via-indigo-700/50 to-indigo-900/95 backdrop-blur-md" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

        <div className="relative flex flex-col md:flex-row gap-8 z-10 text-center text-white px-6 py-16 container mx-auto items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 flex flex-1 items-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group"
            >
              <div className="relative">
                <Image
                  src={`https://api.dicebear.com/9.x/glass/svg?seed=${channel.name}`}
                  alt={channel.name}
                  width={140}
                  height={140}
                  className="relative rounded-full border-2 border-white/40 shadow-2xl transform transition-all duration-300 group-hover:border-white/60"
                />
              </div>
            </motion.div>

            <div className="text-left ml-8 max-w-2xl">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200"
              >
                {channel.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-lg text-indigo-50 font-medium leading-relaxed"
              >
                {channel.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 flex flex-wrap items-center gap-4 text-sm"
              >
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white font-medium">
                    {channel.subscribers} subscribers
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-white font-medium">
                    {channel.totalViews} total views
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
          <JoinStreamBanner
            joinCode={joinCode}
            copyToClipboard={copyToClipboard}
            copied={copied}
          />
        </div>
      </div>
    </div>
  );
}
