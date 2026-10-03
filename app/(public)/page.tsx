import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { getLocalBusinessSchema, getWebSiteSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Shree Beauty Parlour & Studio Surat — Best Ladies Salon & Bridal Studio',
  },
  description:
    'Shree Beauty Parlour & Studio is Surat’s premier 100% ladies-only beauty salon in Katargam. 25+ years of verified excellence for bridal makeovers, hair treatments, and skin care.',
  keywords: [
    'shree beauty parlour',
    'shree beauty parlour surat',
    'shree beauty parlour katargam',
    'shree beauty studio',
    'shree beauty studio surat',
    'best beauty studio in surat',
    'best beauty salon in Surat',
    'best beauty parlour in Surat',
    'best bridal studio in Surat',
    'beauty studio Surat',
    'bridal makeovers Surat',
    'hair treatments Surat',
    'skin care Surat',
    'beauty parlour Katargam Surat',
    'top salon in Surat Gujarat',
    'bridal makeup artist Surat',
    'hair botox salon Surat',
    'nanoplastia treatment Surat',
    'hydra facial Surat',
    'ladies beauty parlour Surat',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Shree Beauty Parlour & Studio Surat — Best Ladies Salon & Bridal Studio',
    description:
      'Shree Beauty Parlour & Studio is Surat’s premier 100% ladies-only beauty salon in Katargam. 25+ years of excellence for bridal makeovers, hair treatments, and skin care.',
    url: 'https://shreebeauty.studio',
    siteName: 'Shree Beauty Studio & Parlour',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Parlour & Studio Surat — Best Ladies Salon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shree Beauty Parlour & Studio Surat — Best Ladies Salon',
    description:
      'Shree Beauty Parlour & Studio is Surat’s premier 100% ladies-only beauty salon in Katargam. 25+ years of excellence.',
    images: ['/logo-with-name.png'],
  },
};

export default function HomePage() {
  const localBusinessJsonLd = getLocalBusinessSchema();
  const webSiteJsonLd = getWebSiteSchema();

  return (
    <>
      {/* Structured Data / JSON-LD for Search & Generative AI Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
