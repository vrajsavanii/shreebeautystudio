import type { Metadata } from 'next';
import BookClient from './BookClient';
import { getBreadcrumbSchema, getLocalBusinessSchema } from '@/lib/seo';
import { CustomerAuthProvider } from '@/lib/customer-context';

export const metadata: Metadata = {
  title: 'Book Appointment Online — Shree Beauty Studio, Katargam Surat',
  description:
    'Book your haircut, facial, hair spa, bridal makeover, or party styling appointment online with instant confirmation at Shree Beauty Studio in Katargam, Surat.',
  keywords: [
    'book salon appointment Surat',
    'beauty parlour Katargam booking',
    'bridal makeup appointment Surat',
    'ladies salon booking Katargam',
    'Shree Beauty Studio appointment',
  ],
  alternates: {
    canonical: '/book',
  },
  openGraph: {
    title: 'Book Salon Appointment Online | Shree Beauty Studio Surat',
    description:
      'Instant online booking for salon & bridal services at Shree Beauty Studio, Katargam, Surat. Choose your services, date, and preferred time slot.',
    url: 'https://shreebeauty.studio/book',
    type: 'website',
    siteName: 'Shree Beauty Studio',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Book Appointment at Shree Beauty Studio Katargam Surat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Book Salon Appointment Online | Shree Beauty Studio Surat',
    description: 'Instant online booking for salon & bridal services at Shree Beauty Studio, Katargam, Surat.',
    images: ['/logo-with-name.png'],
  },
};

export default function BookPage() {
  const localBusinessJsonLd = getLocalBusinessSchema();
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Book Appointment', url: '/book' },
  ]);

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
      <CustomerAuthProvider>
        <BookClient />
      </CustomerAuthProvider>
    </>
  );
}
