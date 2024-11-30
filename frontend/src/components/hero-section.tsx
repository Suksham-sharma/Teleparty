"use client";

import { useState, useEffect } from "react";
import { CheckSquare } from "lucide-react";
import { FloatingElement } from "./floating-element";
import { FlipWords } from "./ui/flip-words";
import { BackgroundAnimation } from "@/app/_components/background";
import { motion } from "framer-motion";

export function HeroSection() {
  const [randomPositions, setRandomPositions] = useState<
    { left: number; top: number; duration: number; delay: number }[]
  >([]);
  const words = ["classmates", "cuties", "friends", "pyaar"];
  const floatingEmojis = ["💖", "🔥", "🥰", "😍", "🌟", "🎈", "🥳", "🤩", "💫"];

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
    <section className="relative min-h-screen pt-16 pb-20 flex items-center justify-center overflow-hidden ">
      <BackgroundAnimation />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

      <div className="container px-4 md:px-6 relative">
        <div className="flex flex-col items-center text-center gap-8">
          <FloatingElement
            className="absolute left-[5%] top-[-30%] md:block hidden z-5"
            delay={0.2}
          >
            <div className="bg-yellow-100 p-6 rounded-lg shadow-lg rotate-[-16deg] max-w-[200px]">
              <p className="text-sm font-handwriting">
                Take notes to keep track of crucial details, and accomplish more
                tasks with ease.
              </p>
              <div className="mt-4 bg-white p-2 rounded-md shadow-sm">
                <CheckSquare className="text-blue-600 h-6 w-6" />
              </div>
            </div>
          </FloatingElement>

          <FloatingElement
            className="absolute right-[10%] top-[50%] md:block hidden"
            delay={0.2}
          >
            <div className="bg-purple-100 p-6 rounded-lg shadow-lg rotate-[12deg] max-w-[200px]">
              <p className="text-sm font-handwriting">
                Take notes to keep track of crucial details, and accomplish more
                tasks with ease.
              </p>
              <div className="mt-4 bg-white p-2 rounded-md shadow-sm">
                <CheckSquare className="text-blue-600 h-6 w-6" />
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
                    opacity: [0, 0.3, 0.5, 0.7, 0.3, 0],
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
          <FloatingElement delay={0} className="">
            <h1 className="text-3xl md:text-[48px] font-bold tracking-tighter mb-4 ">
              Cherish and Make Memories
              <span className="block text-gray-400 mt-5">
                with your <FlipWords words={words} />
              </span>
            </h1>
            <p className="text-gray-600 max-w-[600px] mb-8">
              Your Only Platform to connect !!
            </p>
          </FloatingElement>
        </div>
      </div>
    </section>
  );
}
