import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://shreebeauty.studio';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/*.ico',
          '/*.png',
          '/*.jpg',
          '/*.jpeg',
          '/*.webp',
          '/*.svg',
          '/manifest.json',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/login',
          '/signup',
          '/forgot-password',
          '/(auth)/',
        ],
      },
      {
        userAgent: ['Googlebot', 'Googlebot-Image', 'Google-InspectionTool'],
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
