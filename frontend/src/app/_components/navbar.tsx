"use client";
import Link from "next/link";
import { FileUploadDialog } from "./video-upload";
import { LogOut } from "lucide-react";
import { JoinStreamDialog } from "./join-stream-dialog";
import { isUserAuthenticated } from "@/lib/authHook";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";

const CustomAvatar = dynamic(() => import("./avatar"), { ssr: false });

export default function Navbar({ isHome = false }: { isHome?: boolean }) {
  const router = useRouter();
  const data = isUserAuthenticated();

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.push("/");
  };

  const avatarSrc = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${data?.username}`;
  return (
    <nav className="fixed top-0 flex justify-between w-full z-50 bg-gradient-to-b from-gray-900/90 via-gray-900/70 to-transparent backdrop-blur-md shadow-lg">
      <div className="w-full flex justify-between items-center px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-bold text-white flex items-center gap-2 hover:opacity-90 transition-opacity duration-200"
        >
          <div className="flex gap-1.5">
            <div className="h-3.5 w-3.5 rounded-full bg-blue-500 shadow-glow-blue" />
            <div className="h-3.5 w-3.5 rounded-full bg-blue-500 shadow-glow-blue" />
          </div>
          Teleparty
        </Link>
        <div className="flex items-center space-x-8">
          {isHome && (
            <>
              <div className="flex items-center space-x-6">
                <Link
                  href="/channel"
                  className="text-sm font-medium text-white hover:text-blue-200 transition-colors duration-200"
                >
                  Your Channel
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <JoinStreamDialog />
                <FileUploadDialog />
              </div>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="hover:opacity-90 transition-opacity duration-200 cursor-pointer">
                <CustomAvatar src={avatarSrc} fallback={data?.username ?? ""} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl mt-2 animate-in fade-in-80 zoom-in-95">
              <DropdownMenuLabel className="font-medium px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-gray-900">{data?.username}</span>
                  <span className="text-sm text-gray-500 mt-0.5">
                    Your Profile
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="h-px bg-gray-200" />
              <DropdownMenuItem
                className="flex items-center cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600 px-3 py-2 transition-colors duration-200"
                onSelect={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
