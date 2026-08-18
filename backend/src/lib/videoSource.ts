import { VideoSource } from "@prisma/client";
import { CDN_HOST } from "./config";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);

const YOUTUBE_PATH_PREFIXES = ["embed", "shorts", "live", "v"];
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const FILE_EXTENSIONS = new Set(["mp4", "webm", "ogg", "ogv", "mov", "m4v"]);
const HLS_EXTENSIONS = new Set(["m3u8"]);

const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 80;

export interface ParsedSource {
  source: VideoSource;
  url: string;
  title: string;
  thumbnailUrl: string | null;
}

const OEMBED_TIMEOUT_MS = 2500;

export type ParseResult = ParsedSource | { error: string };

export const isParsed = (result: ParseResult): result is ParsedSource =>
  !("error" in result);

const segments = (url: URL) =>
  url.pathname.split("/").filter((segment) => segment.length > 0);

const youtubeId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase();
  const path = segments(url);

  if (host === "youtu.be" || host === "www.youtu.be") {
    return path[0] ?? null;
  }

  if (path[0] === "watch") {
    return url.searchParams.get("v");
  }

  if (path.length >= 2 && YOUTUBE_PATH_PREFIXES.includes(path[0])) {
    return path[1];
  }

  return null;
};

const extensionOf = (url: URL) => {
  const last = segments(url).pop();
  if (!last || !last.includes(".")) return null;
  return last.split(".").pop()!.toLowerCase();
};

const titleFromPath = (url: URL) => {
  const last = segments(url).pop();
  if (!last) return url.hostname;

  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {
    decoded = last;
  }

  const withoutExtension = decoded.replace(/\.[A-Za-z0-9]+$/, "");
  const readable = withoutExtension.replace(/[._-]+/g, " ").trim();

  return (readable || url.hostname).slice(0, MAX_TITLE_LENGTH);
};

export function parseVideoSource(input: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) return { error: "Paste a link first." };
  if (trimmed.length > MAX_URL_LENGTH) return { error: "That link is too long." };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { error: "That doesn't look like a link." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { error: "Only http and https links can be played." };
  }

  if (url.username || url.password) {
    return { error: "Links with embedded credentials aren't accepted." };
  }

  if (YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    const id = youtubeId(url);
    if (!id || !YOUTUBE_ID.test(id)) {
      return { error: "That YouTube link doesn't point at a video." };
    }
    return {
      source: VideoSource.YOUTUBE,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: "YouTube video",
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  const extension = extensionOf(url);

  if (extension && HLS_EXTENSIONS.has(extension)) {
    return {
      source: VideoSource.HLS,
      url: url.toString(),
      title: titleFromPath(url),
      thumbnailUrl: null,
    };
  }

  if (extension && FILE_EXTENSIONS.has(extension)) {
    return {
      source: VideoSource.FILE,
      url: url.toString(),
      title: titleFromPath(url),
      thumbnailUrl: null,
    };
  }

  return {
    error:
      "Only YouTube links and direct video files (.mp4, .webm, .m3u8) can be played.",
  };
}

export async function resolveTitle(parsed: ParsedSource): Promise<string> {
  if (parsed.source !== VideoSource.YOUTUBE) return parsed.title;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(parsed.url)}`,
      { signal: controller.signal }
    );
    if (!response.ok) return parsed.title;

    const data = (await response.json()) as { title?: unknown };
    return typeof data.title === "string" && data.title.trim()
      ? data.title.trim().slice(0, 200)
      : parsed.title;
  } catch {
    return parsed.title;
  } finally {
    clearTimeout(timer);
  }
}

export const playbackUrlFor = (video: {
  id: string;
  source: VideoSource;
  sourceUrl: string | null;
}) =>
  video.source === VideoSource.UPLOAD || !video.sourceUrl
    ? `${CDN_HOST}/transcoded/${video.id}/master.m3u8`
    : video.sourceUrl;
