import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    domains: [
      "i.postimg.cc",
      "images.unsplash.com",
      "api.dicebear.com",
      "d3uupbz3igyr5f.cloudfront.net",
    ],
  },
};

export default nextConfig;
