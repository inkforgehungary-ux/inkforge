/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,

  // A kepek a repo gyokereben levo public/ mappaban vannak (nem a web/public-ban),
  // ezert a Next.js-t arra allitjuk, hogy azt is kiszolgalja.
  // Igy a /fejlec-1920.png, /inkforge-logo.png stb. elerheto marad.
  experimental: {
    externalDir: true,
  },

  images: {
    // A PNG-k nagyok (4 MB), ezert a Next.js optimalizalja es WebP-re konvertalja.
    formats: ['image/webp'],
    deviceSizes: [640, 800, 1200, 1600, 1920, 2560],
    imageSizes: [64, 128, 256],
    minimumCacheTTL: 2592000,
  },

  // A gyoker public/ mappa tartalmanak kiszolgalasa: atiranyitas
  async rewrites() {
    return [
      { source: '/fejlec-1920.png', destination: '/api/static/fejlec-1920.png' },
    ];
  },
};

module.exports = nextConfig;
