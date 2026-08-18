"use client";

import { useState } from "react";
import Image from "next/image";
import axios from "axios";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  addToQueue,
  approveSuggestion,
  removeFromQueue,
} from "@/services/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlayableVideo, QueuedVideo } from "@/services/types";

const reasonFrom = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const reason = error.response?.data?.error;
    if (typeof reason === "string") return reason;
  }
  return "That didn't work.";
};

const formatDuration = (ms: number | null) => {
  if (!ms || ms < 0) return null;
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export function RoomQueue({
  code,
  canControl,
  nowPlaying,
  queue,
  suggestions,
  onChanged,
}: {
  code: string;
  canControl: boolean;
  nowPlaying: PlayableVideo | null;
  queue: QueuedVideo[];
  suggestions: QueuedVideo[];
  onChanged: () => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    try {
      const item = await addToQueue(code, { url: trimmed });
      setUrl("");
      onChanged();
      toast.success(
        item.status === "QUEUED"
          ? `Queued — ${item.video.title}`
          : "Suggested — the host decides"
      );
    } catch (error) {
      toast.error(reasonFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const act = async (itemId: string, run: () => Promise<void>) => {
    setActingOn(itemId);
    try {
      await run();
      onChanged();
    } catch (error) {
      toast.error(reasonFrom(error));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        {nowPlaying && (
          <section>
            <p className="label-mute mb-2.5">Now playing</p>
            <Row video={nowPlaying} />
          </section>
        )}

        <section>
          <p className="label-mute mb-2.5">
            Up next{queue.length > 0 && ` · ${queue.length}`}
          </p>

          {queue.length === 0 ? (
            <p className="text-base text-grey-dim">
              Nothing queued. Add a link and it plays when this one ends.
            </p>
          ) : (
            <ul className="space-y-2">
              {queue.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Row video={item.video} by={item.addedByName} />
                  <IconButton
                    label={`Remove ${item.video.title}`}
                    busy={actingOn === item.id}
                    onClick={() =>
                      act(item.id, () => removeFromQueue(code, item.id))
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </section>

        {canControl && suggestions.length > 0 && (
          <section>
            <p className="label-mute mb-2.5">
              Suggested · {suggestions.length}
            </p>
            <ul className="space-y-2">
              {suggestions.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Row video={item.video} by={item.addedByName} />
                  <IconButton
                    label={`Add ${item.video.title} to the queue`}
                    busy={actingOn === item.id}
                    accent
                    onClick={() =>
                      act(item.id, () => approveSuggestion(code, item.id))
                    }
                  >
                    <Check className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    label={`Dismiss ${item.video.title}`}
                    busy={actingOn === item.id}
                    onClick={() =>
                      act(item.id, () => removeFromQueue(code, item.id))
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!canControl && suggestions.length > 0 && (
          <p className="text-base text-grey-dim">
            {suggestions.length === 1
              ? "1 suggestion waiting on the host."
              : `${suggestions.length} suggestions waiting on the host.`}
          </p>
        )}
      </div>

      <form onSubmit={add} className="flex items-center gap-2 p-3 pt-0">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={canControl ? "Add a link to the queue" : "Suggest a link"}
          aria-label={canControl ? "Add a link to the queue" : "Suggest a link"}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          className="h-10 px-4 text-base"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={busy || url.trim().length === 0}
        >
          {busy && <Loader2 className="animate-spin" />}
          {canControl ? "Add" : "Suggest"}
        </Button>
      </form>
    </div>
  );
}

function Row({ video, by }: { video: PlayableVideo; by?: string }) {
  const duration = formatDuration(video.durationMs);

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <div className="relative h-11 w-[74px] shrink-0 overflow-hidden rounded-md bg-coal">
        {video.thumbnailUrl && (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-base leading-snug text-ash">
          {video.title}
        </p>
        <p className="mt-0.5 truncate font-mono text-xs text-grey-dim">
          {[by, duration].filter(Boolean).join(" · ") || video.source.toLowerCase()}
        </p>
      </div>
    </div>
  );
}

function IconButton({
  label,
  busy,
  accent,
  onClick,
  children,
}: {
  label: string;
  busy: boolean;
  accent?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
        accent
          ? "bg-butter text-black hover:bg-butter-deep"
          : "bg-card-2 text-grey hover:text-ash"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}
