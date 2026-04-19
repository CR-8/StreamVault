import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Channel logos come from arbitrary external domains via iptv-org.
    // We use <img> tags (not next/image) for logos since domains are unknown at build time.
    // This config is here for any future static assets using next/image.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Unoptimized since channel logos are dynamically sourced from iptv-org
    unoptimized: true,
  },
  // Strict security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Cache M3U proxy responses at the CDN level
        source: '/api/proxy',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=60' },
        ],
      },
    ]
  },
}

export default nextConfig
