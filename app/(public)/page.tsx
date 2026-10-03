import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { getLocalBusinessSchema, getWebSiteSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Best Beauty Parlour & Salon in Surat | Shree Beauty Studio (Ladies Only)',
  },
  description:
    'Ranked #1 best beauty parlour & luxury ladies salon in Surat, Gujarat. 25+ years expertise in Katargam for HD bridal makeup, hair Botox, Nanoplastia & Hydra facials. 100% ladies-only sanctuary.',
  keywords: [
    'best beauty parlour in Surat',
    'best beauty salon in Surat',
    'best ladies salon in Surat',
    'beauty parlour Katargam Surat',
    'top salon in Surat Gujarat',
    'bridal makeup artist Surat',
    'hair botox salon Surat',
    'nanoplastia treatment Surat',
    'hydra facial Surat',
    'ladies beauty parlour Surat',
    'Shree Beauty Studio',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Best Beauty Parlour & Salon in Surat | Shree Beauty Studio (Ladies Only)',
    description:
      'Ranked #1 best beauty parlour & ladies salon in Surat, Gujarat. 25+ years of excellence in Katargam for bridal makeovers, hair Botox, Nanoplastia & Hydra facials.',
    url: 'https://shreebeauty.studio',
    siteName: 'Shree Beauty Studio',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Best Beauty Parlour & Salon in Surat — Shree Beauty Studio Katargam',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Beauty Parlour & Salon in Surat | Shree Beauty Studio',
    description:
      'Ranked #1 best beauty parlour & ladies salon in Surat, Gujarat. 25+ years experience in Katargam.',
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
