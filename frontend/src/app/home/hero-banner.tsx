"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import Image from "next/image";

const banners = [
  {
    id: 1,
    title: "Avengers: Endgame",
    image:
      "https://i.postimg.cc/9F4zPXn8/Avengers-Endgame-2019-Desktop-Movie-Wallpapers-HD-4-1.jpg",
  },
  {
    id: 2,
    title: "The Wild Robot",
    image:
      "https://i.postimg.cc/5jcJSJXT/the-wild-robot-preview-et00421338-1732603459.jpg",
  },
];

export function HeroBanner() {
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[600px] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBanner}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <div className="relative h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent" />
            <Image
              src={banners[currentBanner].image}
              alt={banners[currentBanner].title}
              width={"1200"}
              height={"600"}
              objectFit="cover"
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 flex items-center">
              <div className="container px-4 mx-auto">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-lg"
                >
                  <h1 className="mb-4 text-5xl font-bold text-white">
                    {banners[currentBanner].title}
                  </h1>
                  <button className="inline-flex items-center px-6 py-3 space-x-2 text-white rounded-lg bg-primary hover:bg-primary/90">
                    <Play className="w-5 h-5" />
                    <span>Let&apos;s Stream Together</span>
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentBanner(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentBanner ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
