import type { Metadata } from 'next';
import BridalClient from './BridalClient';
import { getBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Luxury Bridal Makeup Packages | Shree Beauty Studio, Surat',
  },
  description:
    'Bespoke bridal makeovers in Katargam, Surat: HD & Airbrush makeup, Panetar saree draping, and pre-bridal packages. 2,500+ happy Gujarati brides styled.',
  alternates: {
    canonical: '/bridal',
  },
  openGraph: {
    title: 'Luxury Bridal Makeup & Wedding Packages | Shree Beauty Studio Surat',
    description:
      'Turn your wedding dream into reality with couture bridal makeup, authentic international cosmetics, customized jewelry setting, and bridal party packages in Katargam, Surat.',
    url: 'https://shree-beauty-studio.vercel.app/bridal',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Studio Bridal Makeup Surat',
      },
    ],
  },
};

export default function BridalPage() {
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Bridal Packages', url: '/bridal' },
  ]);

  const bridalServiceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Bridal Makeup & Wedding Styling',
    name: 'Luxury Bridal Makeup Packages',
    provider: {
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
    },
    areaServed: {
      '@type': 'City',
      name: 'Surat',
    },
    description:
      'High-definition and airbrush bridal makeup, designer hairstyling, premium saree draping, and pre-bridal skin prep designed for Indian brides.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: '7000',
      highPrice: '35000',
      offerCount: '6',
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bridalServiceJsonLd) }}
      />
      <BridalClient />
    </>
  );
}
