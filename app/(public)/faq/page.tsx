import type { Metadata } from 'next';
import FAQClient from './FAQClient';
import { FAQ_DATA } from './faq-data';
import { getFAQSchema, getBreadcrumbSchema, getLocalBusinessSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Frequently Asked Questions (FAQ) | Shree Beauty Studio, Surat',
  },
  description:
    'Questions about salon timings, bridal packages, hair Botox, facials, or booking policies in Katargam, Surat? Read our comprehensive client FAQ guide.',
  keywords: [
    'best beauty parlour in Surat',
    'best beauty salon in Surat',
    'Shree Beauty Studio FAQ',
    'salon timings Katargam Surat',
    'bridal makeup queries Surat',
    'hair Botox questions Surat',
    'ladies salon Katargam reviews',
  ],
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions (FAQ) | Shree Beauty Studio Surat',
    description:
      'Clear answers to common questions about bridal makeup, hair treatments, facial care, appointment booking, and prices at Shree Beauty Studio, Katargam.',
    url: 'https://shreebeauty.studio/faq',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Shree Beauty Studio FAQ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frequently Asked Questions (FAQ) | Shree Beauty Studio Surat',
    description:
      'Questions about salon timings, bridal packages, hair Botox, or facials in Katargam, Surat? Read our FAQ.',
    images: ['/logo-with-name.png'],
  },
};

export default function FAQPage() {
  const localBusinessJsonLd = getLocalBusinessSchema();
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'FAQ', url: '/faq' },
  ]);

  const faqJsonLd = getFAQSchema(
    FAQ_DATA.map((item) => ({
      question: item.question,
      answer: item.answer,
    }))
  );

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQClient />
    </>
  );
}
