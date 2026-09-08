/**
 * lib/seo.ts
 * Reusable JSON-LD structured data generators for Shree Beauty Studio.
 * Only use verifiable, factually accurate data.
 */

const BASE_URL = 'https://shree-beauty-studio.vercel.app';

// ─── Business Constants ──────────────────────────────────────────────────────

export const BUSINESS = {
  name: 'Shree Beauty Studio',
  url: BASE_URL,
  telephone: '+91-98241-83769',
  whatsapp: '919824183769',
  address: {
    streetAddress: '22, Radhika Society, Opp. Cancer Hospital',
    addressLocality: 'Katargam',
    addressRegion: 'Surat',
    addressCountry: 'IN',
    postalCode: '395004',
  },
  geo: {
    latitude: 21.2156,
    longitude: 72.8258,
  },
  openingHours: ['Mo-Su 10:00-19:00'],
  image: `${BASE_URL}/logo-with-name.png`,
  logo: `${BASE_URL}/shree-logo.png`,
  description:
    'Shree Beauty Studio is a premium beauty salon and bridal makeup studio in Katargam, Surat, Gujarat. Offering bridal packages, party makeup, hair treatments, skincare facials, and professional beauty services for over 10 years.',
  areaServed: ['Surat', 'Gujarat', 'India'],
  priceRange: '₹₹',
} as const;

// ─── LocalBusiness / BeautySalon Schema ─────────────────────────────────────

export function getLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'BeautySalon'],
    '@id': `${BASE_URL}/#business`,
    name: BUSINESS.name,
    description: BUSINESS.description,
    url: BUSINESS.url,
    telephone: BUSINESS.telephone,
    image: BUSINESS.image,
    logo: {
      '@type': 'ImageObject',
      url: BUSINESS.logo,
      width: 400,
      height: 400,
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
      'https://www.google.com/maps/place/Shree+Beauty+Studio/@21.2156,72.8258,17z',
    ],
    hasMap: 'https://maps.google.com/?q=Radhika+Society+Katargam+Surat',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Credit Card, Debit Card',
    knowsLanguage: ['English', 'Hindi', 'Gujarati'],
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
