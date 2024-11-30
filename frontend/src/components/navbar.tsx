import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 w-full border-b bg-white/50 backdrop-blur-md z-50 justify-center flex">
      <nav className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link
          className="flex items-center gap-2 text-lg font-semibold"
          href="#"
        >
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-600" />
            <div className="h-2 w-2 rounded-full bg-blue-600" />
          </div>
          Teleparty
        </Link>
        <div className="flex gap-4 items-center">
          <Button asChild variant={"outline"}>
            <Link className="text-sm font-medium transition-colors" href="#">
              Sign in
            </Link>
          </Button>
          <Button className="rounded-sm">Get demo</Button>
        </div>
      </nav>
    </header>
  );
}
