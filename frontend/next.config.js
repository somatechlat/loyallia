/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true,
  experimental: {
    optimizePackageImports: ['recharts'],
    serverActions: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'localhost:33906,rewards.loyallia.com').split(','),
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
