/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  httpAgentOptions: {
    keepAlive: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    // Tree-shake icon libraries and animation libraries so only used exports ship
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      'recharts',
    ],
  },
  // Enable Next.js built-in image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Aggressive caching headers for static assets and immutable Next.js chunks
  async headers() {
    return [
      // Service worker — must revalidate immediately so updates deploy instantly
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // Manifest & icons
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // Static service images — 1 year immutable
      {
        source: '/services/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Studio photos — 1 year immutable
      {
        source: '/studio-photos/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Studio backgrounds & salon assets — 1 year immutable
      {
        source: '/(studio-bg|salon-bg)/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Favicon & logo assets — 30 days stale-while-revalidate
      {
        source: '/(favicon.*|apple-touch-icon.*|icon-.*|shree-logo.*|logo.*|cropped-logo.*|only-.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=604800' },
        ],
      },
      // Next.js static chunk files — immutable (they're content-hashed)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Next.js image optimisation — 30 days cache
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/ContactUs',
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/admin/ai-poster',
        destination: '/admin',
        permanent: false,
      },
      {
        source: '/blog/bridal-hair-styling-trends-2026',
        destination: '/blog/how-to-choose-bridal-hairstyle-face-shape',
        permanent: true,
      },
    ];
  },
  // Compress output
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
