import Link from "next/link";
import { FileUploadDialog } from "./video-upload";
import { Bell } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Navbar({ isNotHome }: { isNotHome?: boolean }) {
  return (
    <nav className="fixed top-0 flex justify-between w-full z-50 bg-gradient-to-b from-gray-900/80 to-transparent backdrop-blur-sm">
      <div className="w-full flex justify-between items-center px-4 py-4">
        <Link
          href="/"
          className="text-2xl font-bold text-white flex items-center gap-2"
        >
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded-full bg-blue-600" />
            <div className="h-3 w-3 rounded-full bg-blue-600" />
          </div>
          Teleparty
        </Link>
        {!isNotHome && (
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/channel"
                className="text-sm text-white hover:text-gray-300"
              >
                Your Channel
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <FileUploadDialog />
              <button className="relative">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <Avatar>
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>SJ</AvatarFallback>
              </Avatar>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
