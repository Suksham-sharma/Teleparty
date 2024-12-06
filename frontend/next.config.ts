import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    domains: ["i.postimg.cc", "images.unsplash.com", "api.dicebear.com"],
  },
};

export default nextConfig;
