"use client";
import Link from "next/link";
import { FileUploadDialog } from "./video-upload";
import { Bell, LogOut } from "lucide-react";
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
        <div className="flex items-center space-x-6">
          {isHome && (
            <>
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
              </div>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <CustomAvatar src={avatarSrc} fallback={data?.username ?? ""} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white border border-gray-200 rounded-md shadow-lg">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">{data?.username}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="h-px bg-gray-200" />
              <DropdownMenuItem
                className="flex items-center cursor-pointer hover:bg-gray-100 focus:bg-gray-100 text-red-600"
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
