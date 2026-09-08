import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://shree-beauty-studio.vercel.app';

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
