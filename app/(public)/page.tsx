import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { getLocalBusinessSchema, getWebSiteSchema, getCanonicalFAQSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Shree Beauty Studio — Best Ladies Salon & Bridal Parlour in Surat, Katargam | 4.9★ | 25+ Years',
  },
  description:
    'Surat’s #1 ladies-only beauty salon & bridal studio in Katargam. 5,000+ happy brides, 4.9★ Google rating, 100% genuine luxury products. Book online instantly. Open 7 days.',
  keywords: [
    'best beauty salon in surat',
    'best beauty parlour in surat',
    'beauty parlour in surat',
    'beauty studio surat',
    'ladies salon surat',
    'best bridal makeup in surat',
    'bridal studio surat',
    'beauty parlour katargam',
    'ladies parlour katargam surat',
    'keratin treatment surat',
    'nanoplastia treatment surat',
    'hydra facial surat',
    'hair botox surat',
    'bridal makeup artist surat',
    '100% ladies only salon surat',
    'shree beauty parlour surat',
    'shree beauty studio surat',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Shree Beauty Studio — Best Ladies Salon & Bridal Parlour in Surat, Katargam | 4.9★ | 25+ Years',
    description:
      'Surat’s #1 ladies-only beauty salon & bridal studio in Katargam. 5,000+ happy brides, 4.9★ Google rating, 100% genuine luxury products. Book online instantly. Open 7 days.',
    url: 'https://shreebeauty.studio',
    siteName: 'Shree Beauty Studio & Parlour',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Studio — Best Ladies Salon & Bridal Parlour in Surat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shree Beauty Studio — Best Ladies Salon & Bridal Parlour in Surat, Katargam | 4.9★ | 25+ Years',
    description:
      'Surat’s #1 ladies-only beauty salon & bridal studio in Katargam. 5,000+ happy brides, 4.9★ Google rating, 100% genuine luxury products.',
    images: ['/logo-with-name.png'],
  },
};

export default function HomePage() {
  const localBusinessJsonLd = getLocalBusinessSchema();
  const webSiteJsonLd = getWebSiteSchema();
  const faqJsonLd = getCanonicalFAQSchema();

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomePageClient />
    </>
  );
}

