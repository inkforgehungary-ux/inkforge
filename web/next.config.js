/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 800, 1200, 1600, 1920, 2560],
    imageSizes: [64, 128, 256],
    minimumCacheTTL: 2592000,
  },
};

module.exports = nextConfig;
