import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  //config for Images
  images: {
    domains: [
      "avatar.vercel.sh",
      "m.media-amazon.com",
      "www.google.com",
      "fakeimg.pl",
      "i.postimg.cc",
    ],
  },
};

export default nextConfig;
