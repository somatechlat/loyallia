/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true,
  experimental: {
    optimizePackageImports: ['recharts'],
    serverActions: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'localhost,localhost:33906,127.0.0.1:33906,0.0.0.0:33906').split(','),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/assets/**',
      },
      {
        protocol: 'https',
        hostname: '*.loyallia.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://rewards.loyallia.com https://*.tile.openstreetmap.org",
            "frame-src 'self' https://accounts.google.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ') },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: `${process.env.NEXT_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:33905'}/api/:path*/`,
      },
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:33905'}/api/:path*/`,
      },
    ];
  },
};

module.exports = nextConfig;
