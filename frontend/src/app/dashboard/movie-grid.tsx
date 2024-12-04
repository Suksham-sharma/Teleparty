"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";

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
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">
        Trending in Animation
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-lg"
          >
            <div className="aspect-[3/4]">
              <Image
                src={movie.image}
                alt={movie.title}
                width={300}
                height={400}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="absolute inset-0 flex flex-col justify-end p-4 transition-opacity bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100">
              <h3 className="text-sm font-semibold text-white">
                {movie.title}
              </h3>
              <div className="flex items-center mt-1 space-x-2 text-xs text-white/80">
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
                  {movie.rating}
                </div>
                <span>{movie.year}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
