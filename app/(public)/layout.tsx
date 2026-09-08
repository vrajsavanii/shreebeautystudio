import type { Metadata } from 'next';
import PublicLayoutClient from '@/components/customer/PublicLayoutClient';

export const metadata: Metadata = {
  title: {
    default: 'Shree Beauty Studio — Luxury Salon & Bridal Makeup in Katargam, Surat',
    template: '%s | Shree Beauty Studio, Surat',
  },
  description:
    'Shree Beauty Studio is a premium beauty salon in Katargam, Surat offering bridal makeup, hair treatments, skincare facials, and professional beauty services. Book your appointment online or on WhatsApp.',
  keywords: [
    'beauty salon Surat',
    'beauty studio Katargam Surat',
    'bridal makeup Surat',
    'hair salon Surat',
    'ladies salon Surat',
    'facial Surat',
    'makeup artist Surat',
    'hair treatment Surat',
    'Shree Beauty Studio',
    'best salon Surat',
  ],
  authors: [{ name: 'Shree Beauty Studio' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Shree Beauty Studio',
    images: [
      {
        url: '/logo-with-name.png',
        width: 400,
        height: 400,
        alt: 'Shree Beauty Studio — Luxury Salon in Surat',
      },
    ],
  },
  twitter: {
    card: 'summary',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayoutClient>{children}</PublicLayoutClient>;
}
