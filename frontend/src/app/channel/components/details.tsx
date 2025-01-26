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
      <div className="relative overflow-hidden group pt-14">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/80 via-indigo-800/70 to-black/80 backdrop-blur-sm" />

        <div className="relative flex gap-8 z-10 text-center text-white px-6 py-24 container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 flex flex-1 items-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-lg opacity-50" />
              <Image
                src={`https://api.dicebear.com/9.x/glass/svg?seed=${channel.name}`}
                alt={channel.name}
                width={120}
                height={120}
                className="relative mx-auto rounded-full border-4 border-white/40 shadow-2xl"
              />
            </motion.div>

            <div className="text-left ml-8">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200"
              >
                {channel.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-lg text-indigo-100 max-w-2xl font-medium"
              >
                {channel.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 flex items-center gap-6 text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-indigo-200">
                    {channel.subscribers} subscribers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-indigo-200">
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
