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
      'best beauty studio in surat',
      'best beauty parlour in Surat',
      'best beauty salon in Surat',
      'best ladies salon in Surat',
      'Shree Beauty Studio Surat',
      'Katargam beauty parlour',
      'bridal makeup Surat Gujarat',
      'ladies beauty parlour Katargam',
      'hair botox salon Surat',
      'hydra facial Katargam Surat',
    ],
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.metaTitle} | Shree Beauty Studio, Surat`,
      description: post.metaDescription,
      url: `https://shreebeauty.studio/blog/${post.slug}`,
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
      'geo.placename': 'Katargam, Surat, Gujarat, India',
      'geo.position': '21.2369033;72.8158985',
      'ICBM': '21.2369033, 72.8158985',
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
        url: 'https://shreebeauty.studio',
      },
    },
    publisher: {
      '@type': 'BeautySalon',
      name: 'Shree Beauty Studio',
      telephone: ['+91-98241-83769'],
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
        latitude: 21.2369033,
        longitude: 72.8158985,
      },
      logo: {
        '@type': 'ImageObject',
        url: 'https://shreebeauty.studio/shree-logo.png',
      },
    },
    about: [
      {
        '@type': 'BeautySalon',
        name: 'Shree Beauty Studio',
        description: 'Best beauty parlour and luxury ladies salon in Surat, Gujarat. 100% ladies-only sanctuary.',
        telephone: ['+91-98241-83769'],
        address: {
          '@type': 'PostalAddress',
          streetAddress: '22, Radhika Society, Opp. Cancer Hospital',
          addressLocality: 'Katargam',
          addressRegion: 'Surat',
          postalCode: '395004',
          addressCountry: 'IN',
        },
      },
      {
        '@type': 'City',
        name: 'Surat',
        containedInPlace: {
          '@type': 'AdministrativeArea',
          name: 'Gujarat',
        },
      },
    ],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://shreebeauty.studio/blog/${post.slug}`,
    },
    keywords: [
      ...post.tags,
      'best beauty parlour in Surat',
      'best beauty salon in Surat',
      'ladies parlour Katargam',
    ].join(', '),
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
