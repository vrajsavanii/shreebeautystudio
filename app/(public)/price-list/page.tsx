import type { Metadata } from 'next';
import PriceListClient from './PriceListClient';
import { getBreadcrumbSchema, getLocalBusinessSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Official Salon & Bridal Price List 2026 in Surat | Shree Beauty Studio',
  },
  description:
    'Complete, transparent 2026 price list for Shree Beauty Studio, Katargam, Surat. Genuine pricing for HD & Airbrush Bridal Makeup, Hair Botox, Nanoplastia, Hydra Facials, Rica Waxing, and Pre-Bridal Packages.',
  keywords: [
    'beauty parlour in surat with price list',
    'ladies beauty parlour price list surat',
    'shree beauty studio price list',
    'bridal makeup price surat',
    'hair botox cost in surat',
    'nanoplastia price surat',
    'hydra facial price katargam',
    'rica wax price in parlour surat',
    'salon packages with price surat',
    'katargam parlour rate chart',
    'pre bridal package price surat',
  ],
  alternates: {
    canonical: '/price-list',
  },
  openGraph: {
    title: 'Official Salon & Bridal Price List 2026 in Surat | Shree Beauty Studio',
    description:
      'Explore transparent salon pricing at Shree Beauty Studio, Katargam, Surat. 100% ladies-only studio with 25+ years expertise.',
    url: 'https://shreebeauty.studio/price-list',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Studio Official Price List 2026 Surat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Official Salon & Bridal Price List 2026 in Surat | Shree Beauty Studio',
    description: 'Transparent rates for bridal makeup, hair botox, hydra facials and salon packages in Surat.',
    images: ['/logo-with-name.png'],
  },
};

export default function PriceListPage() {
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Services', url: '/services' },
    { name: 'Price List', url: '/price-list' },
  ]);

  const localBusinessJsonLd = getLocalBusinessSchema();

  const priceCatalogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Shree Beauty Studio Service & Bridal Price Menu',
    itemListElement: [
      {
        '@type': 'OfferCatalog',
        name: 'Bridal & Occasion Makeup',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'HD Bridal Makeover (Signature)',
              description: '3-session luxury bridal makeup with MAC & Huda Beauty, jewelry pinning & draping.',
            },
            price: '15000',
            priceCurrency: 'INR',
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Airbrush 4K Bridal Makeover',
              description: 'Ultra HD transfer-proof airbrush makeup with Dior & Charlotte Tilbury.',
            },
            price: '25000',
            priceCurrency: 'INR',
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Sider & Reception Glam Makeover',
              description: 'Party, Engagement, or Sangeet glam makeover with hairstyling.',
            },
            price: '3500',
            priceCurrency: 'INR',
          },
        ],
      },
      {
        '@type': 'OfferCatalog',
        name: 'Hair Reconstruction & Aesthetics',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Hair Botox Treatment',
              description: 'Formaldehyde-free collagen bond repair for dry, damaged hair.',
            },
            price: '3500',
            priceCurrency: 'INR',
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Nanoplastia Glass-Hair Therapy',
              description: 'Organic amino acid smoothing providing pin-straight mirror shine for 5-6 months.',
            },
            price: '5000',
            priceCurrency: 'INR',
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'L’Oréal Mythic Oil Spa',
              description: 'Deep nourishment steam spa for frizz control and scalp relaxation.',
            },
            price: '1200',
            priceCurrency: 'INR',
          },
        ],
      },
      {
        '@type': 'OfferCatalog',
        name: 'Medi-Facials & Clinical Skincare',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Hydra Glow Vortex Facial',
              description: '7-step vortex vacuum deep pore cleanup, serum infusion and LED therapy.',
            },
            price: '2500',
            priceCurrency: 'INR',
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'O3+ Bridal Radiance Treatment',
              description: 'Clinical brightening facial for intense pigmentation removal and wedding glow.',
            },
            price: '2000',
            priceCurrency: 'INR',
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(priceCatalogJsonLd) }}
      />
      <PriceListClient />
    </>
  );
}
