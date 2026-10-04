import type { MetadataRoute } from 'next';
import { ALL_BLOG_POSTS } from '@/lib/blog-data';
import { ALL_LOCATION_SLUGS } from '@/lib/locations-data';
import { ALL_SERVICE_SEO_SLUGS } from '@/lib/services-seo-data';

const BASE_URL = 'https://shreebeauty.studio';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/bridal`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/book`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/my-appointments`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const servicePages: MetadataRoute.Sitemap = ALL_SERVICE_SEO_SLUGS.map((slug) => ({
    url: `${BASE_URL}/services/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const blogPages: MetadataRoute.Sitemap = ALL_BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt).toISOString() : now,
    changeFrequency: 'monthly',
    priority: 0.75,
  }));

  const locationPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/locations`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...ALL_LOCATION_SLUGS.map((slug) => ({
      url: `${BASE_URL}/locations/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: slug === 'surat' || slug === 'katargam' ? 0.95 : 0.9,
    })),
  ];

  return [...staticPages, ...servicePages, ...locationPages, ...blogPages];
}
