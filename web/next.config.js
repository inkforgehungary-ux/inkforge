/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // A kepek a repo gyokereben levo public/ mappaban vannak,
  // ezert a Next.js kepoptimalizaloja ne probalja atiranyitani oket.
  images: { unoptimized: true },
};

module.exports = nextConfig;
