import type { Metadata } from 'next';
import BlogListClient from './BlogListClient';
import { ALL_BLOG_POSTS, getAllBlogCategories } from '@/lib/blog-data';
import { getBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Beauty & Bridal Journal: 150+ Guides | Shree Beauty Studio, Surat',
  },
  description:
    'Explore 150+ guides on bridal makeup, hair Botox, Nanoplastia, Hydra facials, and beauty tips in Katargam, Surat. Expert advice for Gujarat women.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Beauty & Bridal Journal | 150+ Guides | Shree Beauty Studio Surat',
    description:
      '150+ professional beauty articles and salon guides crafted by master aestheticians and bridal stylists in Surat. Expert skincare, hair care, and Gujarati wedding advice.',
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
