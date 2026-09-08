import type { Metadata } from 'next';
import FAQClient from './FAQClient';
import { FAQ_DATA } from './faq-data';
import { getFAQSchema, getBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions (FAQ) — Shree Beauty Studio Katargam Surat',
  description:
    'Got questions about salon timings, bridal packages, hair Botox, keratin treatments, skin facials, or booking policies in Katargam, Surat? Read our comprehensive FAQ.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions (FAQ) | Shree Beauty Studio Surat',
    description:
      'Clear answers to common questions about bridal makeup, hair treatments, facial care, appointment booking, and prices at Shree Beauty Studio, Katargam.',
    url: 'https://shree-beauty-studio.vercel.app/faq',
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
};

export default function FAQPage() {
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
