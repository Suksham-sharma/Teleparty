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
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <motion.button
          key={category.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center px-4 py-2 space-x-2 text-sm  rounded-full  border-2 border-black text-black bg-gray-200 hover:bg-gray-100"
        >
          <category.icon className="w-4 h-4" />
          <span>{category.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
