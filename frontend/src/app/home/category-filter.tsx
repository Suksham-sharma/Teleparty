"use client";

import { motion } from "framer-motion";
import { Flame, Swords, Heart, Ghost, Sparkles, Moon } from "lucide-react";

const categories = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "action", label: "Action", icon: Swords },
  { id: "romance", label: "Romance", icon: Heart },
  { id: "horror", label: "Horror", icon: Ghost },
  { id: "special", label: "Special", icon: Sparkles },
  { id: "drakor", label: "Drakor", icon: Moon },
];

export function CategoryFilter() {
  return (
    <div className="flex flex-wrap gap-3 p-4 bg-white/50 backdrop-blur-sm rounded-2xl  border border-white/20">
      {categories.map((category) => (
        <motion.button
          key={category.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center px-6 py-2.5 space-x-2 text-sm font-medium rounded-full
            bg-gradient-to-r from-indigo-50 to-white
            border border-indigo-100
            text-indigo-700
            shadow-sm
            hover:shadow-md hover:from-indigo-100 hover:to-white
            transition-all duration-200 ease-in-out"
        >
          <category.icon className="w-4 h-4" />
          <span>{category.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
