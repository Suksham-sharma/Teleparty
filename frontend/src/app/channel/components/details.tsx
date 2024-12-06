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

export function EnhancedChannel({ channel, joinCode }: ChannelProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="relative overflow-hidden group pt-14">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/60 to-black/70" />

        <div className="relative flex gap-8 z-10 text-center text-white px-6 py-20 container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 flex flex-1"
          >
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Image
                src={`https://api.dicebear.com/9.x/glass/svg?seed=${channel.name}`}
                alt={channel.name}
                width={96}
                height={96}
                className="mx-auto rounded-full border-4 border-white/30 shadow-xl"
              />
            </motion.div>

            <div className="text-left ml-4">
              <h1 className="text-4xl font-bold tracking-tight">
                {channel.name}
              </h1>
              <p className="mt-2 text-indigo-100 max-w-xl mx-auto">
                {channel.description}
              </p>
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
