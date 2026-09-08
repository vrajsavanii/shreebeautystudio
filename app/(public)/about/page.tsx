import type { Metadata } from 'next';
import AboutClient from './AboutClient';
import { getBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Us — 10+ Years of Beauty Excellence in Katargam, Surat | Shree Beauty Studio',
  description:
    'Discover the story behind Shree Beauty Studio. Over 10 years delivering premier bridal makeovers, luxury hair transformations, and skincare in Katargam, Surat. 100% authentic international brands.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Shree Beauty Studio — Surat’s Premier Ladies Salon',
    description:
      'Learn about our philosophy, 10+ years heritage, authentic international products, and commitment to hygiene in Katargam, Surat.',
    url: 'https://shree-beauty-studio.vercel.app/about',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'About Shree Beauty Studio Surat',
      },
    ],
  },
};

export default function AboutPage() {
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About Us', url: '/about' },
  ]);

  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Shree Beauty Studio',
    description:
      'Shree Beauty Studio is a premier luxury ladies salon and bridal makeover studio in Katargam, Surat with over 10 years of trusted service.',
    mainEntity: {
      '@type': 'BeautySalon',
      name: 'Shree Beauty Studio',
      telephone: '+91-98241-83769',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '22, Radhika Society, Opp. Cancer Hospital',
        addressLocality: 'Katargam',
        addressRegion: 'Surat',
        postalCode: '395004',
        addressCountry: 'IN',
      },
      foundingDate: '2014',
      priceRange: '₹₹',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <AboutClient />
    </>
  );
}
