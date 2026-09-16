import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostClient from './BlogPostClient';
import { ALL_BLOG_POSTS, getBlogPostBySlug, getRelatedPosts } from '@/lib/blog-data';
import { getBreadcrumbSchema, getFAQSchema, getLocalBusinessSchema } from '@/lib/seo';

interface Props {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  return ALL_BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);
  if (!post) return { title: 'Article Not Found' };

  const cleanTitle = (post.metaTitle || post.title)
    .replace(/\s*\|\s*Shree Beauty Studio.*$/i, '')
    .replace(/\s*\|\s*Shree Studio.*$/i, '')
    .replace(/\s*\|\s*Katargam.*$/i, '')
    .replace(/\s*\|\s*Surat.*$/i, '')
    .trim();
  const absoluteTitle = `${cleanTitle} | Shree Beauty Studio, Surat`;

  return {
    title: {
      absolute: absoluteTitle,
    },
    description: post.metaDescription,
    keywords: [
      ...post.tags,
      'Shree Beauty Studio Surat',
      'Katargam beauty parlour',
      'best salon in Surat for women',
      'bridal makeup Surat Gujarat',
      'ladies beauty parlour Katargam',
    ],
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.metaTitle} | Shree Beauty Studio, Surat`,
      description: post.metaDescription,
      url: `https://shree-beauty-studio.vercel.app/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
      siteName: 'Shree Beauty Studio — Katargam, Surat',
      locale: 'en_IN',
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
          alt: `${post.title} — Shree Beauty Studio, Katargam, Surat`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.metaTitle,
      description: post.metaDescription,
      images: [post.image],
    },
    other: {
      'geo.region': 'IN-GJ',
      'geo.placename': 'Surat, Gujarat, India',
      'geo.position': '21.2156;72.8258',
      'ICBM': '21.2156, 72.8258',
      'article:section': post.category,
      'article:tag': post.tags.join(', '),
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(post.slug, post.category, 3);

  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  const localBusinessJsonLd = getLocalBusinessSchema();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    image: post.image,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author,
      jobTitle: post.authorRole,
      worksFor: {
        '@type': 'BeautySalon',
        name: 'Shree Beauty Studio',
        url: 'https://shree-beauty-studio.vercel.app',
      },
    },
    publisher: {
      '@type': 'BeautySalon',
      name: 'Shree Beauty Studio',
      telephone: '+91-97732-40010',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '22, Radhika Society, Opp. Cancer Hospital',
        addressLocality: 'Katargam',
        addressRegion: 'Surat',
        postalCode: '395004',
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 21.2156,
        longitude: 72.8258,
      },
      logo: {
        '@type': 'ImageObject',
        url: 'https://shree-beauty-studio.vercel.app/shree-logo.png',
      },
    },
    about: {
      '@type': 'BeautySalon',
      name: 'Shree Beauty Studio',
      description: 'Exclusive ladies-only luxury beauty salon and bridal makeup studio in Katargam, Surat, Gujarat.',
      telephone: '+91-97732-40010',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '22, Radhika Society, Opp. Cancer Hospital',
        addressLocality: 'Katargam',
        addressRegion: 'Surat',
        postalCode: '395004',
        addressCountry: 'IN',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://shree-beauty-studio.vercel.app/blog/${post.slug}`,
    },
    keywords: post.tags.join(', '),
  };

  const faqJsonLd = post.faq && post.faq.length > 0 ? getFAQSchema(post.faq) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <BlogPostClient post={post} relatedPosts={relatedPosts} />
    </>
  );
}
