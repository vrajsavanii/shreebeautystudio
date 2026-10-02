import type { Metadata } from 'next';
import ContactClient from './ContactClient';
import { getBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Contact Us & Studio Location | Shree Beauty Studio, Katargam, Surat',
  },
  description:
    'Visit Shree Beauty Studio at 22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat. Call or WhatsApp +91 98241 83769. Open all 7 days for ladies beauty & bridal services.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Shree Beauty Studio — Surat’s Premier Ladies Salon',
    description:
      'Contact our studio in Katargam, Surat for appointments, bridal makeover consultations, and beauty inquiries. Call +91 98241 83769.',
    url: 'https://shreebeauty.studio/contact',
    type: 'website',
    images: [
      {
        url: '/logo-with-name.png',
        width: 800,
        height: 600,
        alt: 'Contact Shree Beauty Studio Surat',
      },
    ],
  },
};

export default function ContactPage() {
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Contact Us', url: '/contact' },
  ]);

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Shree Beauty Studio',
    description:
      'Contact details, address, opening timings, and Google Maps location for Shree Beauty Studio in Katargam, Surat.',
    mainEntity: {
      '@type': 'BeautySalon',
      name: 'Shree Beauty Studio',
      telephone: '+91 98241 83769',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '22, Radhika Society, Opp. Cancer Hospital',
        addressLocality: 'Katargam',
        addressRegion: 'Surat',
        postalCode: '395004',
        addressCountry: 'IN',
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '10:00',
          closes: '19:00',
        },
      ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <ContactClient />
    </>
  );
}
