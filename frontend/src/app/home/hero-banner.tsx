"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import Image from "next/image";

const banners = [
  {
    id: 1,
    title: "Avengers: Endgame",
    description: "Watch together with friends in real-time",
    image:
      "https://i.postimg.cc/9F4zPXn8/Avengers-Endgame-2019-Desktop-Movie-Wallpapers-HD-4-1.jpg",
  },
  {
    id: 2,
    title: "The Wild Robot",
    description: "Experience the magic of animation with your community",
    image:
      "https://i.postimg.cc/5jcJSJXT/the-wild-robot-preview-et00421338-1732603459.jpg",
  },
];

export function HeroBanner() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [nextBanner, setNextBanner] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
      setNextBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-b-3xl shadow-2xl">
      <div className="absolute inset-0 w-full h-full">
        {banners.map((banner, index) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: index === currentBanner ? 1 : 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: index === currentBanner ? 1 : 0 }}
          >
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-indigo-900/70 to-transparent z-10" />
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 z-20 flex items-center">
                <div className="container px-4 mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-lg space-y-6"
                  >
                    <h1 className="text-6xl font-bold text-white tracking-tight">
                      {banner.title}
                    </h1>
                    <p className="text-lg text-indigo-100">
                      {banner.description}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center px-8 py-4 space-x-3 text-white rounded-full bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-indigo-600/25"
                    >
                      <Play className="w-5 h-5" />
                      <span className="font-medium">Stream Together</span>
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 z-30">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentBanner(index);
              setNextBanner((index + 1) % banners.length);
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentBanner
                ? "bg-white scale-100"
                : "bg-white/50 scale-75 hover:scale-90 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
