import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { getLocalBusinessSchema, getWebSiteSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shree Beauty Studio — Luxury Salon & Bridal Makeup in Katargam, Surat',
  description:
    'Surat’s premier ladies beauty salon & bridal makeup studio in Katargam. 10+ years of trusted excellence in bridal makeovers, HD & airbrush makeup, hair Botox, keratin, and customized skincare facials. Book online or visit us today.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Shree Beauty Studio — Luxury Salon & Bridal Makeup in Katargam, Surat',
    description:
      'Premier ladies beauty parlour and bridal makeup studio in Katargam, Surat. Expert bridal packages, hair transformations, and radiant skincare. Book your appointment today.',
    url: 'https://shree-beauty-studio.vercel.app',
    siteName: 'Shree Beauty Studio',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Studio Katargam Surat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shree Beauty Studio — Salon & Bridal Makeup in Katargam, Surat',
    description:
      'Luxury beauty parlour & bridal studio in Katargam, Surat. Bridal packages, hair care & facials.',
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
