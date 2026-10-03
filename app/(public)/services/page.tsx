import type { Metadata } from 'next';
import ServicesClient from './ServicesClient';
import { getBreadcrumbSchema, getLocalBusinessSchema, getServicesCatalogSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Best Beauty Salon Services & Rate List in Surat | Shree Beauty Studio',
  },
  description:
    'Explore 50+ luxury salon services with transparent rate list at the best ladies beauty parlour in Surat: hair Botox, Nanoplastia, bridal makeup, Hydra facials, and Rica waxing in Katargam, Surat.',
  keywords: [
    'best beauty salon in Surat',
    'best beauty parlour in Surat',
    'beauty parlour rate list Surat',
    'salon services Katargam Surat',
    'hair Botox price Surat',
    'nanoplastia cost Surat',
    'hydra facial cost Surat',
    'keratin treatment Katargam',
    'bridal makeup Katargam Surat',
    'ladies beauty parlour Surat',
    'Shree Beauty Studio services',
  ],
  alternates: {
    canonical: '/services',
  },
  openGraph: {
    title: 'Best Beauty Salon Services & Rate List in Surat | Shree Beauty Studio',
    description:
      'Complete menu of luxury salon services with transparent pricing in Katargam, Surat. Hair treatments, bridal makeup, skincare facials & body care.',
    url: 'https://shreebeauty.studio/services',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Best Beauty Salon Services Menu Surat — Shree Beauty Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Beauty Salon Services & Rate List in Surat | Shree Beauty Studio',
    description:
      'Explore 50+ luxury salon services in Katargam, Surat: hair Botox, Hydra facials, and Rica waxing.',
    images: ['/logo-with-name.png'],
  },
};

export default function ServicesPage() {
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Services', url: '/services' },
  ]);
  const localBusinessJsonLd = getLocalBusinessSchema();
  const servicesCatalogJsonLd = getServicesCatalogSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesCatalogJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ServicesClient />
    </>
  );
}
