import React from "react";
import { HeroBanner } from "./hero-banner";
import { CategoryFilter } from "./category-filter";
import { MovieGrid } from "./movie-grid";
import Navbar from "../_components/navbar";
import RetroGrid from "@/components/ui/retro-grid";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden relative bg-gradient-to-b from-indigo-50 via-white to-indigo-50">
      <RetroGrid className="fixed inset-0" />
      <div className="relative z-10">
        <Navbar isHome={true} />
        <HeroBanner />
        <div className="container px-4 py-12 mx-auto space-y-12">
          <CategoryFilter />
          <MovieGrid />
        </div>
      </div>
    </main>
  );
}
