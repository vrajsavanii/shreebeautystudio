import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://shreebeauty.studio';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/bridal',
          '/services',
          '/about',
          '/contact',
          '/ContactUs',
          '/faq',
          '/book',
          '/my-appointments',
          '/blog',
          '/blog/',
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
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
