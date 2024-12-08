import React from "react";
import { HeroBanner } from "./hero-banner";
import { CategoryFilter } from "./category-filter";
import { MovieGrid } from "./movie-grid";
import Navbar from "../_components/navbar";

export default function Home() {
  return (
    <main className="min-h-screen overflow-none bg-gradient-to-b from-gray-900 to-gray-800">
      <Navbar />
      <HeroBanner />
      <div className="container px-4 py-8 mx-auto space-y-8">
        <CategoryFilter />
        <MovieGrid />
      </div>
    </main>
  );
}
