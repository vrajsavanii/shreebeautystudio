import type { Metadata } from 'next';
import CookiesPolicyClient from './CookiesPolicyClient';
import { getBreadcrumbSchema, getLocalBusinessSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Cookie Policy | Shree Beauty Studio & Bridal Salon Surat',
  },
  description:
    'Learn how Shree Beauty Studio in Katargam, Surat uses cookies, local storage, and privacy-first technologies to power secure appointment bookings and fast offline browsing.',
  keywords: [
    'Shree Beauty Studio cookie policy',
    'cookies policy beauty salon Surat',
    'ladies salon privacy policy Katargam',
    'Shree Beauty Studio privacy terms',
    'salon booking data protection Surat',
  ],
  alternates: {
    canonical: '/cookies-policy',
  },
  openGraph: {
    title: 'Cookie Policy | Shree Beauty Studio & Bridal Salon Surat',
    description:
      'Transparency and client privacy at Shree Beauty Studio. Understand the cookies and storage technologies we use on our website.',
    url: 'https://shreebeauty.studio/cookies-policy',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Studio Cookie Policy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cookie Policy | Shree Beauty Studio Surat',
    description:
      'Learn how Shree Beauty Studio uses cookies and privacy-first storage technologies for secure salon appointments.',
    images: ['/logo-with-name.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiesPolicyPage() {
  const localBusinessJsonLd = getLocalBusinessSchema();
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Cookie Policy', url: '/cookies-policy' },
  ]);

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Cookie Policy — Shree Beauty Studio',
    description:
      'Official Cookie Policy and Data Privacy disclosures for Shree Beauty Studio in Katargam, Surat.',
    url: 'https://shreebeauty.studio/cookies-policy',
    inLanguage: 'en-IN',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Shree Beauty Studio',
      url: 'https://shreebeauty.studio',
    },
  };

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <CookiesPolicyClient />
    </>
  );
}
