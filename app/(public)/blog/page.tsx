import type { Metadata } from 'next';
import BlogListClient from './BlogListClient';
import { ALL_BLOG_POSTS, getAllBlogCategories } from '@/lib/blog-data';
import { getBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Beauty & Bridal Journal: 50+ Expert Guides — Shree Beauty Studio Surat',
  description:
    'Explore 50+ in-depth guides on bridal makeup (HD vs Airbrush), hair Botox, keratin smoothing, skincare facials, waxing, and beauty tips in Katargam, Surat.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Beauty & Bridal Journal | Shree Beauty Studio Katargam Surat',
    description:
      '50+ professional beauty articles and salon guides crafted by master aestheticians and bridal stylists in Surat. Expert skincare, hair care, and wedding advice.',
    url: 'https://shree-beauty-studio.vercel.app/blog',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Studio Blog',
      },
    ],
  },
};

export default function BlogPage() {
  const categories = getAllBlogCategories();
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <BlogListClient initialPosts={ALL_BLOG_POSTS} categories={categories} />
    </>
  );
}
