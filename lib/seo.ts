/**
 * lib/seo.ts
 * Reusable, evidence-based JSON-LD structured data generators for Shree Beauty Studio.
 * Complies strictly with Schema.org standards and Google Search/AI Guidelines.
 */

export const BASE_URL = 'https://shreebeauty.studio';

// ─── Verified Business Constants ─────────────────────────────────────────────

export const BUSINESS = {
  name: 'Shree Beauty Studio',
  legalName: 'Shree Beauty Studio',
  url: BASE_URL,
  telephone: ['+91-98241-83769'],
  whatsapp: '919824183769',
  address: {
    streetAddress: '22, Radhika Society, Opp. Cancer Hospital',
    addressLocality: 'Katargam',
    addressRegion: 'Surat',
    addressCountry: 'IN',
    postalCode: '395004',
  },
  geo: {
    latitude: 21.2369033,
    longitude: 72.8158985,
  },
  openingHours: ['Mo-Su 10:00-19:00'],
  image: `${BASE_URL}/logo-with-name.png`,
  logo: `${BASE_URL}/icon.png`,
  description:
    'Shree Beauty Studio is a premier ladies-only beauty salon and bridal makeover studio in Katargam, Surat, Gujarat. Specializing in luxury HD bridal makeup, pre-bridal skincare, hair treatments (Keratin, Botox, Rebonding), and aesthetic salon services.',
  areaServed: [
    'Katargam',
    'Surat',
    'Varachha',
    'Mota Varachha',
    'Amroli',
    'Adajan',
    'Pal',
    'Vesu',
    'Gujarat',
  ],
  priceRange: '₹₹',
  knowsAbout: [
    'Bridal Makeup',
    'HD Bridal Makeover',
    'Bridal Hairstyling',
    'Pre-Bridal Skincare',
    'Hair Botox Treatment',
    'Nanoplastia Hair Smoothing',
    'Hydra Facial Therapy',
    'Rica Waxing',
    'Saree Draping',
  ],
} as const;

// ─── LocalBusiness / BeautySalon Schema ───────────────────────────────────────

export function getLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'BeautySalon', 'DaySpa'],
    '@id': `${BASE_URL}/#business`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    description: BUSINESS.description,
    url: BUSINESS.url,
    telephone: BUSINESS.telephone,
    image: BUSINESS.image,
    logo: {
      '@type': 'ImageObject',
      url: BUSINESS.logo,
      width: 512,
      height: 512,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address.streetAddress,
      addressLocality: BUSINESS.address.addressLocality,
      addressRegion: BUSINESS.address.addressRegion,
      addressCountry: BUSINESS.address.addressCountry,
      postalCode: BUSINESS.address.postalCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '10:00',
        closes: '19:00',
      },
    ],
    areaServed: BUSINESS.areaServed.map((area) => ({
      '@type': 'City',
      name: area,
    })),
    priceRange: BUSINESS.priceRange,
    sameAs: [
      'https://www.instagram.com/shreebeauty.studio/',
      'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8',
    ],
    hasMap: 'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Credit Card, Debit Card, Net Banking',
    knowsLanguage: ['English', 'Hindi', 'Gujarati'],
    knowsAbout: BUSINESS.knowsAbout,
  };
}

// ─── WebSite Schema ──────────────────────────────────────────────────────────

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: BUSINESS.name,
    description: BUSINESS.description,
    publisher: {
      '@id': `${BASE_URL}/#business`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/services?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-IN',
  };
}

// ─── Bridal Service Schema ───────────────────────────────────────────────────

export function getBridalServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${BASE_URL}/#bridal-service`,
    name: 'Bridal Makeup & Makeover Packages in Surat',
    serviceType: 'Bridal Makeup',
    provider: {
      '@id': `${BASE_URL}/#business`,
    },
    areaServed: {
      '@type': 'City',
      name: 'Surat',
    },
    description:
      'Complete luxury bridal makeup, pre-bridal skincare, advanced hairstyling, jewelry setting, lens application, and saree draping using international luxury cosmetics (MAC, Huda Beauty, Bobbi Brown, Dior, NARS, Charlotte Tilbury).',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: '15000',
      highPrice: '80200',
      offerCount: '6',
    },
    termsOfService: `${BASE_URL}/faq`,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Bridal Packages',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'MAC & Forever52 Bridal Package (3 Sessions)',
            description: '3 sessions bridal makeup, hairstyle, jewelry setting, lenses, eyelashes & draping.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Huda Beauty & Bobbi Brown Bridal Package (3 Sessions)',
            description: 'Luxury HD bridal look, hairstyling, jewelry setting & draping.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Dior, NARS & Armani Couture Bridal Package (3 Sessions)',
            description: 'Ultra-luxury couture bridal makeup with premium waterproof longevity.',
          },
        },
      ],
    },
  };
}

// ─── BreadcrumbList Schema ───────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

// ─── FAQPage Schema ──────────────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

export function getFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// ─── WebPage Schema ──────────────────────────────────────────────────────────

export function getWebPageSchema(opts: {
  title: string;
  description: string;
  url: string;
  breadcrumb?: BreadcrumbItem[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${BASE_URL}${opts.url}#webpage`,
    url: `${BASE_URL}${opts.url}`,
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': `${BASE_URL}/#website` },
    about: { '@id': `${BASE_URL}/#business` },
    inLanguage: 'en-IN',
    ...(opts.breadcrumb && {
      breadcrumb: getBreadcrumbSchema(opts.breadcrumb),
    }),
  };
}
