/**
 * Relative by default: requests go to the Next origin and are rewritten to the
 * backend (see next.config.ts), keeping the guestId cookie first-party.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** Server components can't use a relative URL — they need an absolute origin. */
export const SERVER_API_URL =
  process.env.BACKEND_ORIGIN ?? "http://localhost:4000";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

export const CDN_HOST =
  process.env.NEXT_PUBLIC_CDN_HOST ?? "https://d3uupbz3igyr5f.cloudfront.net";

export const thumbnailUrl = (thumbnailId: string) =>
  `${CDN_HOST}/Thumbnails/${thumbnailId}.jpeg`;
