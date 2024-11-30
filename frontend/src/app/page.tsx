import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";

export default function Page() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <HeroSection />
    </main>
  );
}
