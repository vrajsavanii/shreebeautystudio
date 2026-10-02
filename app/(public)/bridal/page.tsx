import type { Metadata } from 'next';
import BridalClient from './BridalClient';
import { getBreadcrumbSchema, getBridalServiceSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Bridal Makeup Artist in Surat | Shree Beauty Studio Katargam',
  },
  description:
    'Looking for the best bridal makeup artist in Surat? Shree Beauty Studio offers couture bridal packages, HD & airbrush finishes, hair styling, jewellery setting & Gujarati draping in Katargam, Surat. Book your consultation.',
  alternates: {
    canonical: '/bridal',
  },
  openGraph: {
    title: 'Bridal Makeup Artist in Surat | Shree Beauty Studio',
    description:
      'Couture 3-session bridal makeover packages from ₹25,300 with MAC, Huda Beauty, Dior, NARS & Charlotte Tilbury in Katargam, Surat. 25+ years experience.',
    url: 'https://shreebeauty.studio/bridal',
    type: 'website',
    images: [
      {
        url: '/services/royal_bridal_makeup.webp',
        width: 1200,
        height: 630,
        alt: 'Bridal Makeup Artist in Surat - Shree Beauty Studio Katargam',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bridal Makeup Artist in Surat | Shree Beauty Studio',
    description:
      'Luxury bridal makeovers, jewellery setting & draping in Katargam, Surat. Real products, transparent packages.',
    images: ['/services/royal_bridal_makeup.webp'],
  },
};

export default function BridalPage() {
  const breadcrumbJsonLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Bridal Makeup Surat', url: '/bridal' },
  ]);

  const bridalServiceJsonLd = getBridalServiceSchema();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How far in advance should I book my bridal makeup in Surat at Shree Beauty Studio?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We strongly recommend booking 2 to 4 months in advance, especially during the peak wedding season in Gujarat (November through March and May to June). Because we prioritize individual attention and personalized bridal suite scheduling, prime wedding dates and auspicious muhurat slots fill up rapidly.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is included in Shree Beauty Studio’s 3-session Bridal Packages?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our complete 3-session Couture Bridal Package covers three wedding events (such as Wedding, Reception, and Sangeet or Engagement). Each session includes complete HD or Airbrush bridal makeup, customized couture hairstyling, fine jewellery setting, cosmetic eye lenses, premium hair extensions, 3D mink eyelashes, fresh/floral hair decor, and traditional draping (sari or chaniya choli).',
        },
      },
      {
        '@type': 'Question',
        name: 'Which cosmetics and skincare brands are used for brides?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We use exclusively 100% authentic, sealed international luxury cosmetics. Depending on your chosen package tier, our kits feature MAC Cosmetics, Forever 52, Huda Beauty, Bobbi Brown, Giorgio Armani, Dior, NARS, Hourglass, Charlotte Tilbury, and Valentino. We never compromise on product authenticity or skin safety.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can my sisters, mother, and bridesmaids get ready alongside me (Siders packages)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, absolutely. We offer specialized 1-session Siders Packages starting at ₹3,300 per person. Siders packages include complete event makeup, elegant hairstyling, and dupatta/sari draping so your bridal party looks harmoniously coordinated and photo-ready.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do you help with bridal jewellery setting and traditional Gujarati draping?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Precise draping and heavy jewellery fixation are integral parts of our bridal service. Whether it is a traditional Panetar, Gharchola, designer Chaniya Choli, or modern Reception gown, our experienced draping artists ensure every pleat, pin, and dupatta is securely anchored for hours of comfortable movement.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where is Shree Beauty Studio located in Surat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our bridal studio is situated at 22, Radhika Society, Opposite Cancer Hospital, Katargam, Surat, Gujarat 395004. We are easily accessible with convenient parking for brides traveling from Katargam, Adajan, Pal, Vesu, Varachha, and across Surat.',
        },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bridalServiceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <BridalClient />
    </>
  );
}
