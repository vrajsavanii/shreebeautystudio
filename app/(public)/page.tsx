import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { getLocalBusinessSchema, getWebSiteSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Shree Beauty Parlour & Studio — Official Website | Best Ladies Salon & Bridal Studio',
  },
  description:
    'Shree Beauty Parlour & Studio is Gujarat’s premier 100% ladies-only beauty salon & bridal studio (Operating Hub: Katargam, Surat). 25+ years of verified excellence for bridal makeovers, hair treatments, and skin care.',
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
    title: 'Shree Beauty Parlour & Studio — Official Website | Best Ladies Salon',
    description:
      'Shree Beauty Parlour & Studio is Gujarat’s premier 100% ladies-only beauty salon & bridal studio (Operating Hub: Katargam, Surat). 25+ years of verified excellence.',
    url: 'https://shreebeauty.studio',
    siteName: 'Shree Beauty Studio & Parlour',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Parlour & Studio — Official Website',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shree Beauty Parlour & Studio — Official Website | Best Ladies Salon',
    description:
      'Shree Beauty Parlour & Studio is Gujarat’s premier 100% ladies-only beauty salon & bridal studio (Operating Hub: Katargam, Surat).',
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
