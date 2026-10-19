const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @fitguide/shared lives in ../packages, outside this app's folder.
  turbopack: { root: path.join(__dirname, '..') },
  outputFileTracingRoot: path.join(__dirname, '..'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
    ],
  },
  // NEXT_PUBLIC_* variables from .env are inlined automatically; the API URL
  // default lives in src/lib/api.js.
};

module.exports = nextConfig;
