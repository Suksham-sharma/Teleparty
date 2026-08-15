import type { NextConfig } from "next";

/**
 * The API is proxied through Next rather than called cross-origin.
 *
 * Guests are identified by an httpOnly `guestId` cookie. Served from a
 * different origin (localhost:4000) that cookie is third-party and browsers
 * drop it, so a guest silently loses their identity on every request and can
 * never stay a member of a room. Proxying makes it first-party, removes the
 * CORS/credentials dance, and matches how this is deployed behind one domain.
 */
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
