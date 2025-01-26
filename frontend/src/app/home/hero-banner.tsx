"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  const [nextBanner, setNextBanner] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
      setNextBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[600px] w-full overflow-hidden">
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
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent z-10" />
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
                  <div className="max-w-lg">
                    <h1 className="mb-4 text-5xl font-bold text-white">
                      {banner.title}
                    </h1>
                    <button className="inline-flex items-center px-6 py-3 space-x-2 text-white rounded-lg bg-primary hover:bg-primary/90 transition-all duration-300">
                      <Play className="w-5 h-5" />
                      <span>Lets Stream Together</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-30">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentBanner(index);
              setNextBanner((index + 1) % banners.length);
            }}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentBanner ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
