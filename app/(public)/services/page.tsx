import type { Metadata } from 'next';
import ServicesClient from './ServicesClient';
import { getBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Beauty Services & Transparent Pricing — Shree Beauty Studio, Katargam Surat',
  description:
    'Explore 50+ luxury salon services in Katargam, Surat: hair Botox, smoothing, keratin, bridal & party makeup, herbal & Hydra facials, waxing, and pedicures. Transparent prices, book online.',
  alternates: {
    canonical: '/services',
  },
  openGraph: {
    title: 'Beauty Services & Prices | Shree Beauty Studio Surat',
    description:
      'Complete menu of luxury salon services with transparent pricing in Katargam, Surat. Hair treatments, bridal makeup, skincare facials & body care.',
    url: 'https://shree-beauty-studio.vercel.app/services',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Studio Services Menu Surat',
      },
    ],
  },
};

export default function ServicesPage() {
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Services', url: '/services' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ServicesClient />
    </>
  );
}
