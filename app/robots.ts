import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://shreebeauty.studio';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/services',
          '/bridal',
          '/book',
          '/my-appointments',
          '/faq',
          '/about',
          '/blog',
          '/blog/',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/login',
          '/(auth)/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
