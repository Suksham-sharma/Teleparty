const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-source-"));
const stub = path.join(outDir, "src", "lib");

fs.mkdirSync(stub, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "shim.ts"),
  `export const VideoSource = {
  UPLOAD: "UPLOAD",
  FILE: "FILE",
  HLS: "HLS",
  YOUTUBE: "YOUTUBE",
} as const;
export type VideoSource = (typeof VideoSource)[keyof typeof VideoSource];
export const CDN_HOST = "https://cdn.example";
`
);

const source = fs
  .readFileSync(path.join(root, "src/lib/videoSource.ts"), "utf8")
  .replace('from "@prisma/client"', 'from "./shim"')
  .replace('from "./config"', 'from "./shim"');

fs.writeFileSync(path.join(outDir, "videoSource.ts"), source);

execSync(
  `npx tsc ${path.join(outDir, "videoSource.ts")} ${path.join(outDir, "shim.ts")} ` +
    `--outDir ${outDir} --module commonjs --target es2020 --strict --skipLibCheck`,
  { cwd: root, stdio: "inherit" }
);

const { parseVideoSource, playbackUrlFor } = require(
  path.join(outDir, "videoSource.js")
);

const results = [];
const check = (label, ok, extra = "") => {
  results.push({ label, ok: !!ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`, extra);
};

const parse = (url) => parseVideoSource(url);
const rejects = (url) => "error" in parse(url);

console.log("");

const watch = parse("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s");
check(
  "a youtube watch url is canonicalised to its id",
  watch.source === "YOUTUBE" &&
    watch.url === "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
);

const short = parse("https://youtu.be/dQw4w9WgXcQ?si=abc");
check(
  "a youtu.be short link resolves to the same canonical url",
  short.url === watch.url
);

["https://www.youtube.com/shorts/dQw4w9WgXcQ",
 "https://www.youtube.com/embed/dQw4w9WgXcQ",
 "https://www.youtube.com/live/dQw4w9WgXcQ",
 "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
 "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"].forEach((url) => {
  const parsed = parse(url);
  check(
    `${url.replace("https://", "")} resolves to the canonical watch url`,
    !("error" in parsed) && parsed.url === watch.url
  );
});

check(
  "a youtube url with no video is refused",
  rejects("https://www.youtube.com/results?search_query=cats")
);

check(
  "an id of the wrong length is refused rather than passed through",
  rejects("https://www.youtube.com/watch?v=tooshort")
);

const mp4 = parse("https://films.example/reels/The_Third_Man.mp4");
check(
  "a direct mp4 is a FILE source titled from its filename",
  mp4.source === "FILE" && mp4.title === "The Third Man",
  `(title "${mp4.title}")`
);

const hls = parse("https://cdn.example/vod/master.m3u8?token=xyz");
check(
  "an m3u8 is an HLS source and keeps its query string",
  hls.source === "HLS" && hls.url.includes("token=xyz")
);

const encoded = parse("https://films.example/a%20quiet%20place.webm");
check(
  "a percent-encoded filename is decoded for the title",
  encoded.source === "FILE" && encoded.title === "a quiet place",
  `(title "${encoded.title}")`
);

check("a non-url is refused", rejects("not a link at all"));
check("an empty string is refused", rejects("   "));
check(
  "a javascript: url is refused",
  rejects("javascript:alert(document.cookie)")
);
check("a data: url is refused", rejects("data:video/mp4;base64,AAAA"));
check(
  "a file: url is refused",
  rejects("file:///Users/someone/Movies/private.mp4")
);
check(
  "credentials embedded in the url are refused",
  rejects("https://user:secret@films.example/reel.mp4")
);
check(
  "a page that is not a media file is refused",
  rejects("https://vimeo.com/76979871")
);
check(
  "a dash manifest is refused while nothing can play it",
  rejects("https://cdn.example/vod/manifest.mpd")
);
check(
  "an over-long url is refused",
  rejects(`https://films.example/${"x".repeat(2100)}.mp4`)
);
check(
  "an http link is accepted so local dev can serve one",
  parse("http://localhost:8000/reel.mp4").source === "FILE"
);

check(
  "an uploaded video's url is still derived from the cdn by convention",
  playbackUrlFor({ id: "vid123", source: "UPLOAD", sourceUrl: null }) ===
    "https://cdn.example/transcoded/vid123/master.m3u8"
);

check(
  "an external video plays from its own url",
  playbackUrlFor({
    id: "vid456",
    source: "HLS",
    sourceUrl: "https://cdn.example/vod/master.m3u8",
  }) === "https://cdn.example/vod/master.m3u8"
);

fs.rmSync(outDir, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? `\nall ${results.length} checks passed`
    : `\n${failed.length}/${results.length} failed`
);
process.exit(failed.length === 0 ? 0 : 1);
