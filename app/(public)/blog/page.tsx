import type { Metadata } from 'next';
import BlogListClient from './BlogListClient';
import { ALL_BLOG_POSTS, getAllBlogCategories } from '@/lib/blog-data';
import { getBreadcrumbSchema, getLocalBusinessSchema, getBlogCollectionSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Beauty & Bridal Journal: 180+ Guides | Shree Beauty Studio, Surat',
  },
  description:
    'Explore 180+ comprehensive guides on bridal makeup, hair Botox, Nanoplastia, Hydra facials, festive looks, and skincare tips in Katargam, Surat. Expert advice for Gujarat women.',
  keywords: [
    'beauty blog Surat',
    'bridal makeup guide Gujarat',
    'hair botox advice Surat',
    'hydra facial benefits Katargam',
    'skincare tips Indian brides',
    'Shree Beauty Studio articles',
    'makeup trends Surat',
    'festive garba makeup Katargam',
    'best beauty parlour articles Surat',
  ],
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Beauty & Bridal Journal | 180+ Guides | Shree Beauty Studio Surat',
    description:
      '180+ professional beauty articles and salon guides crafted by master aestheticians and bridal stylists in Surat. Expert skincare, hair care, and Gujarati wedding advice.',
    url: 'https://shreebeauty.studio/blog',
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
  twitter: {
    card: 'summary_large_image',
    title: 'Beauty & Bridal Journal: 180+ Guides | Shree Beauty Studio Surat',
    description:
      '180+ professional beauty articles, skincare routines, and bridal guides from Katargam, Surat.',
    images: ['/logo-with-name.png'],
  },
};

export default function BlogPage() {
  const categories = getAllBlogCategories();
  const localBusinessJsonLd = getLocalBusinessSchema();
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
  ]);
  const blogCollectionJsonLd = getBlogCollectionSchema(ALL_BLOG_POSTS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogCollectionJsonLd) }}
      />
      <BlogListClient initialPosts={ALL_BLOG_POSTS} categories={categories} />
    </>
  );
}
