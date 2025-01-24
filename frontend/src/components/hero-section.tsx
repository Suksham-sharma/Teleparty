"use client";

import { useState, useEffect } from "react";
import { Play, Users, Clock } from "lucide-react";
import { FloatingElement } from "./floating-element";
import { FlipWords } from "./ui/flip-words";
import { BackgroundAnimation } from "@/app/_components/background";
import { motion } from "framer-motion";
import RetroGrid from "./ui/retro-grid";
import { Button } from "./ui/button";

export function HeroSection() {
  const [randomPositions, setRandomPositions] = useState<
    { left: number; top: number; duration: number; delay: number }[]
  >([]);
  const words = ["friends", "family", "loved ones", "community"];
  const floatingEmojis = ["🎬", "📺", "🍿", "❤️", "🎵", "🎮", "🌟", "🎪", "🎯"];

  useEffect(() => {
    const topPos = Math.random();
    const positions = floatingEmojis.map(() => ({
      left: Math.random() * 100,
      top: topPos > 0.8 ? 20 : topPos * 100,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 10,
    }));
    setRandomPositions(positions);
  }, []);

  return (
    <section className="relative min-h-screen pt-16 pb-20 flex items-center justify-center overflow-hidden bg-gradient-to-b from-white to-gray-50">
      <BackgroundAnimation />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

      <div className="container px-4 md:px-6 relative">
        <div className="flex flex-col items-center text-center gap-8">
          <FloatingElement
            className="absolute left-[5%] top-[50%] md:block hidden z-50"
            delay={0.2}
          >
            <div className="bg-blue-50 p-6 rounded-xl shadow-lg rotate-[-8deg] max-w-[220px] border border-blue-100">
              <p className="text-sm font-medium text-blue-700">
                Watch your favorite content in perfect sync with friends and
                family
              </p>
              <div className="mt-4 bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
                <Users className="text-blue-600 h-5 w-5" />
                <span className="text-sm font-medium text-blue-600">
                  Real-time sync
                </span>
              </div>
            </div>
          </FloatingElement>

          <FloatingElement
            className="absolute right-[8%] top-[50%] md:block hidden z-50"
            delay={0.2}
          >
            <div className="bg-purple-50 p-6 rounded-xl shadow-lg rotate-[8deg] max-w-[220px] border border-purple-100">
              <p className="text-sm font-medium text-purple-700">
                Chat, react, and share moments together while streaming
              </p>
              <div className="mt-4 bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
                <Clock className="text-purple-600 h-5 w-5" />
                <span className="text-sm font-medium text-purple-600">
                  Live interaction
                </span>
              </div>
            </div>
          </FloatingElement>

          {floatingEmojis.map(
            (emoji, index) =>
              randomPositions[index] && (
                <motion.div
                  key={index}
                  className="absolute text-4xl"
                  initial={{ opacity: 0, y: 100 }}
                  animate={{
                    opacity: [0, 0.5, 0.7, 0.5, 0],
                    y: [-100, -200 - Math.random() * 100],
                    x: Math.random() * 300 - 200,
                  }}
                  transition={{
                    duration: randomPositions[index].duration,
                    repeat: Infinity,
                    delay: randomPositions[index].delay,
                  }}
                  style={{
                    left: `${randomPositions[index].left}%`,
                    top: `${randomPositions[index].top}%`,
                  }}
                >
                  {emoji}
                </motion.div>
              )
          )}

          {/* Main Content */}
          <FloatingElement delay={0} className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Stream Together,{" "}
              <span className="text-indigo-600">Create Memories</span>
              <span className="block text-2xl md:text-3xl font-medium text-gray-600 mt-4">
                with your{" "}
                <FlipWords
                  words={words}
                  className="text-indigo-600 font-semibold"
                />
              </span>
            </h1>
            <p className="text-gray-600 text-lg md:text-xl max-w-[600px] mb-8 mx-auto">
              Experience the joy of watching together, no matter where you are!
            </p>
          </FloatingElement>
          <Button
            variant={"default"}
            className=" bg-indigo-600 text-white px-8 py-6 rounded-xl text-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 z-50"
          >
            <Play className="h-6 w-6" />
            <span>Watch Now</span>
          </Button>
        </div>
      </div>
      <RetroGrid />
    </section>
  );
}
