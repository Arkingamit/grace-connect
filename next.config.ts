import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  async headers() {
    return [
      // Static assets built by Next.js (fingerprinted, safe to cache forever)
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Public static files (logo, favicon, etc.) — cache 1 day
      {
        source: '/:path(logo\\.png|logo1\\.png|logo2\\.png|logo\\.svg|favicon\\.ico|manifest\\.json|warli-bg\\.svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=43200',
          },
        ],
      },
      // Service Worker — must always check for updates
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // API routes — prevent browser caching of auth-gated data and remove CORS restrictions
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  output: 'standalone',
  serverExternalPackages: ['mongoose'], // optimization for mongoose with app router

  // Image optimization: serve modern formats with long cache
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days
  },
};

export default nextConfig;

