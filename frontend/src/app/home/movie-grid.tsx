"use client";

import { motion } from "framer-motion";
import { Star, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const movies = [
  {
    id: 1,
    title: "Moana",
    rating: 7.8,
    year: 2023,
    image:
      "https://i.postimg.cc/fLmQWF2v/Moana-Vintage-Movie-Poster-Original-1-Sheet-27x41-bdcf66ed-3ca5-4b65-8a1f-354a91911694-510x.jpg",
  },
  {
    id: 2,
    title: "Toy Story",
    rating: 9.0,
    year: 2023,
    image:
      "https://i.postimg.cc/nL6tJZkz/Toy-Story-Vintage-Movie-Poster-Original-1-Sheet-27x41-3febadbb-a42c-4f11-afae-f0ee5adbcf9d-510x.jpg",
  },
  {
    id: 3,
    title: "Up ",
    rating: 7.1,
    year: 2023,
    image:
      "https://i.postimg.cc/GpTZzVC1/Up-Vintage-Movie-Poster-Original-1-Sheet-27x41-05a70f0b-d492-4b27-9b53-1df79e7b9aa2-510x.jpg",
  },
  {
    id: 4,
    title: "Frozen",
    rating: 7.8,
    year: 2023,
    image:
      "https://i.postimg.cc/fWf1HY6k/Frozen-Vintage-Movie-Poster-Original-1-Sheet-27x41-510x.jpg",
  },
  {
    id: 5,
    title: "Cars",
    rating: 6.1,
    year: 2006,
    image:
      "https://i.postimg.cc/GhMVRd3C/cars-vintage-movie-poster-original-french-1-panel-47x63-510x.jpg",
  },
  {
    id: 6,
    title: "Little Mermaid",
    rating: 6.5,
    year: 2002,
    image:
      "https://i.postimg.cc/TPb4nbVd/The-Little-Mermaid-Vintage-Movie-Poster-Original-1-Sheet-27x41-510x.jpg0",
  },
];

export function MovieGrid() {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-4xl font-bold text-gray-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400"
      >
        Trending in Animation
      </motion.h2>
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Link href="#" className="block">
              <div className="aspect-[3/4] relative">
                <Image
                  src={movie.image}
                  alt={movie.title}
                  width={300}
                  height={400}
                  className="object-cover w-full h-full rounded-2xl transform transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Watch Now</span>
                  </motion.button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 transition-all duration-300">
                  <h3 className="text-lg font-semibold text-white mb-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-white/90 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">{movie.rating}</span>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-indigo-600/80 backdrop-blur-sm text-xs font-medium">
                      {movie.year}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
