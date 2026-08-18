"use client";

import { useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setRoomSource } from "@/services/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLACEHOLDER = "Paste a YouTube or .mp4 link";

const reasonFrom = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const reason = error.response?.data?.error;
    if (typeof reason === "string") return reason;
  }
  return "Could not start that link.";
};

export function PasteSource({
  code,
  size = "default",
}: {
  code: string;
  size?: "default" | "sm";
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = url.trim();
    if (!trimmed || busy) return;

    if (
      window.location.protocol === "https:" &&
      trimmed.toLowerCase().startsWith("http:")
    ) {
      toast.error("An http link can't play on an https page");
      return;
    }

    setBusy(true);
    try {
      const video = await setRoomSource(code, trimmed);
      setUrl("");
      toast.success(`Now playing — ${video.title}`);
    } catch (error) {
      toast.error(reasonFrom(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full items-center gap-2">
      <Input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder={PLACEHOLDER}
        aria-label="Link to play in this room"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        disabled={busy}
        className={size === "sm" ? "h-9 px-4 text-base" : undefined}
      />
      <Button type="submit" size={size} disabled={busy || url.trim().length === 0}>
        {busy && <Loader2 className="animate-spin" />}
        Play
      </Button>
    </form>
  );
}
