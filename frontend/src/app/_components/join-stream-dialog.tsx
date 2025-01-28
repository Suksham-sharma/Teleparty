"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayCircle } from "lucide-react";
import { getChannelBySlug } from "@/services/api";
import { toast } from "sonner";

export function JoinStreamDialog() {
  const [streamCode, setStreamCode] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleJoinStream = async () => {
    if (!streamCode.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const channelInfo = await getChannelBySlug(streamCode);
      if (!channelInfo) {
        toast.error("No Channel Found !!!");
        return;
      }
      toast.success("Joining the stream");
      console.log(channelInfo);
      router.push(`/stream/${channelInfo.channel.slug}`);
    } catch (error: unknown) {
      console.log(error);
      toast.error("Failed to join stream");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-medium transition-colors duration-200"
        >
          Join Stream
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-6 bg-white shadow-lg border-0">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Join a Stream
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2.5">
            <Label
              htmlFor="streamCode"
              className="text-sm font-medium text-gray-700"
            >
              Stream Code <span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Input
              id="streamCode"
              value={streamCode}
              onChange={(e) => setStreamCode(e.target.value)}
              placeholder="Enter stream code"
              className="h-11 text-base border-gray-200 focus:border-indigo-500 transition-colors duration-200"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleJoinStream();
                }
              }}
            />
          </div>

          <Button
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-base transition-colors duration-200 rounded-md shadow-sm"
            onClick={handleJoinStream}
            disabled={!streamCode.trim() || isLoading}
          >
            <PlayCircle
              className={`mr-2.5 h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Joining..." : "Join Stream"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
