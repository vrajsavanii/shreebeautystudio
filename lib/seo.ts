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
  alternateName: [
    'Shree Beauty Parlour',
    'Shree Beauty Parlour Surat',
    'Shree Beauty Parlour Ahmedabad',
    'Shree Beauty Parlour Gujarat',
    'Shree Beauty Parlour Katargam',
    'Shree Studio',
    'Shree Studio Surat',
    'Shree Bridal Studio',
  ],
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
    'Shree Beauty Studio is widely recognized as the best beauty studio, luxury ladies salon, and premier beauty parlour in Surat, Gujarat, serving clients across Gujarat and all over India with destination bridal makeovers, advanced hair botox, and luxury skincare.',
  slogan: 'The Best Beauty Studio, Ladies Salon & Bridal Studio in Surat',
  award: 'Rated #1 Best Beauty Studio in Katargam, Surat (4.9★, 210+ Google Reviews)',
  areaServed: [
    { '@type': 'Country', name: 'India' },
    { '@type': 'State', name: 'Gujarat' },
    { '@type': 'City', name: 'Surat' },
    { '@type': 'City', name: 'Ahmedabad' },
    { '@type': 'City', name: 'Vadodara' },
    { '@type': 'City', name: 'Rajkot' },
    { '@type': 'City', name: 'Gandhinagar' },
    { '@type': 'City', name: 'Mumbai' },
    { '@type': 'AdministrativeArea', name: 'Katargam' },
    { '@type': 'AdministrativeArea', name: 'Varachha' },
    { '@type': 'AdministrativeArea', name: 'Adajan' },
    { '@type': 'AdministrativeArea', name: 'Vesu' },
  ],
  priceRange: '₹₹',
  knowsAbout: [
    'Best Beauty Studio in Surat',
    'Best Beauty Salon in Surat',
    'Best Beauty Parlour in Surat',
    'Best Bridal Studio in Surat',
    'Bridal Makeovers in Surat',
    'Hair Treatments in Surat',
    'Skin Care in Surat',
    'Ladies Beauty Parlour Katargam',
    'Top Salon in Surat Gujarat',
    'Bridal Makeup Artist in Surat',
    'HD Bridal Makeover',
    'Airbrush Bridal Makeup',
    'Gujarati Bridal Hairstyling & Saree Draping',
    'Pre-Bridal Skincare Routine',
    'Hair Botox Treatment Surat',
    'Nanoplastia Hair Smoothing Surat',
    'Hydra Facial Therapy Surat',
    'Painless Rica Waxing',
    'Navratri & Festive Makeovers',
  ],
} as const;

// ─── LocalBusiness / BeautySalon Schema ───────────────────────────────────────

export function getLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'Brand', 'LocalBusiness', 'BeautySalon', 'DaySpa'],
    '@id': `${BASE_URL}/#business`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    alternateName: BUSINESS.alternateName,
    brand: {
      '@type': 'Brand',
      name: 'Shree Beauty Parlour',
      alternateName: 'Shree Beauty Studio',
      url: BASE_URL,
      logo: BUSINESS.logo,
    },
    description: BUSINESS.description,
    slogan: BUSINESS.slogan,
    award: BUSINESS.award,
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
    areaServed: BUSINESS.areaServed,
    priceRange: BUSINESS.priceRange,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '210',
      bestRating: '5',
      worstRating: '1',
    },
    review: [
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: 'Pooja Patel' },
        reviewBody: 'The best bridal makeup studio in Katargam, Surat! My wedding makeup stayed radiant for over 14 hours. 100% recommended for brides.',
      },
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: 'Drashti Shah' },
        reviewBody: 'Got Hair Botox done here. Incredible shine, zero frizz, and so soft. Polite, professional, and very hygienic ladies sanctuary.',
      },
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: 'Janki Prajapati' },
        reviewBody: 'A true ladies-only sanctuary in Katargam. Authentic luxury products used for facials and makeup with transparent pricing.',
      },
    ],
    audience: {
      '@type': 'PeopleAudience',
      suggestedGender: 'female',
    },
    sameAs: [
      'https://www.instagram.com/shreebeauty.studio/',
      'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8',
      'https://www.google.com/maps/place/Shree+beauty+studio/@21.2369033,72.8158985,17z/data=!3m1!4b1!4m6!3m5!1s0x3be04f0b9062c70f:0xa017a32a652d8ad2!8m2!3d21.2369033!4d72.8158985!16s%2Fg%2F11kqdqq61p',
    ],
    hasMap:
      'https://www.google.com/maps/place/Shree+beauty+studio/@21.2369033,72.8158985,17z/data=!3m1!4b1!4m6!3m5!1s0x3be04f0b9062c70f:0xa017a32a652d8ad2!8m2!3d21.2369033!4d72.8158985!16s%2Fg%2F11kqdqq61p',
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
    alternateName: BUSINESS.alternateName,
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
    name: 'Luxury Bridal Makeup & Destination Wedding Artistry across Gujarat & India',
    serviceType: 'Bridal Makeup',
    provider: {
      '@id': `${BASE_URL}/#business`,
    },
    areaServed: [
      { '@type': 'Country', name: 'India' },
      { '@type': 'State', name: 'Gujarat' },
      { '@type': 'City', name: 'Surat' },
      { '@type': 'City', name: 'Ahmedabad' },
      { '@type': 'City', name: 'Vadodara' },
      { '@type': 'City', name: 'Rajkot' },
      { '@type': 'City', name: 'Mumbai' },
    ],
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

// ─── Salon Services Catalog Schema ───────────────────────────────────────────

export function getServicesCatalogSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${BASE_URL}/services#service-catalog`,
    name: 'Salon Services & Beauty Therapies in Katargam, Surat',
    serviceType: 'Beauty Salon Services',
    provider: {
      '@id': `${BASE_URL}/#business`,
    },
    areaServed: {
      '@type': 'City',
      name: 'Surat',
    },
    description:
      'Complete menu of luxury salon services in Katargam, Surat: Hair Botox, Nanoplastia, Keratin Smoothing, Hydra Facials, Diamond Facials, Rica Waxing, and bridal party makeover services with transparent pricing.',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Shree Beauty Studio Services Menu',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Hair Botox Treatment',
            description: 'Intensive deep conditioning and frizz elimination for damaged hair. Starting price tailored to hair length.',
          },
          price: '3500',
          priceCurrency: 'INR',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Nanoplastia Hair Smoothing',
            description: 'Formaldehyde-free organic straightening and mirror shine gloss therapy.',
          },
          price: '4500',
          priceCurrency: 'INR',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Hydra Facial Deep Glow',
            description: 'Multi-step clinical suction, pore extraction, hydration and antioxidant infusion.',
          },
          price: '2500',
          priceCurrency: 'INR',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Diamond Radiance Facial',
            description: 'Cellular rejuvenation with micro-diamond exfoliants for instant bridal glow.',
          },
          price: '1800',
          priceCurrency: 'INR',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Full Body Rica Waxing',
            description: 'Colophony-free Italian liposoluble waxing for sensitive skin.',
          },
          price: '1800',
          priceCurrency: 'INR',
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

export interface FAQItem {
  question: string;
  answer: string;
}

export const CANONICAL_FAQS: FAQItem[] = [
  {
    question: 'What is the best beauty salon in Surat?',
    answer:
      'Shree Beauty Studio, located at 22, Radhika Society, Opposite Cancer Hospital, Katargam, Surat, is consistently rated as Surat’s best 100% ladies-only beauty salon & bridal studio with a 4.9★ Google rating, 25+ years of verified heritage, and over 5,000+ happy brides.',
  },
  {
    question: 'Is Shree Beauty Studio ladies-only?',
    answer:
      'Yes, Shree Beauty Studio is 100% exclusively dedicated to women. No male visitors or staff are admitted, ensuring complete privacy, sanctuary comfort, and discreet ladies-only care for all styling, waxing, skincare, and bridal sessions.',
  },
  {
    question: 'Do you offer bridal makeup packages in Surat?',
    answer:
      'Yes, luxury bridal packages start from ₹15,000 for single event makeovers up to couture 3-session packages (Wedding, Mandap Muhurat, Sangeet) featuring MAC, Huda Beauty, Bobbi Brown, Dior, NARS, and Charlotte Tilbury cosmetics with trial sessions and HD styling.',
  },
  {
    question: 'What hair treatments do you offer?',
    answer:
      'Our specialized hair menu includes Keratin Smoothing (from ₹3,000), Nanoplastia Organic Glass Hair Smoothing (from ₹4,500), Hair Botox Deep Conditioning (from ₹3,500), Intensive Hair Spa (from ₹800), and global hair coloring with authentic L’Oréal Professionnel products.',
  },
  {
    question: 'Where is Shree Beauty Studio located?',
    answer:
      'We are located at 22, Radhika Society, Opposite Cancer Hospital, Katargam, Surat, Gujarat 395004. We are open 7 days a week, Monday through Sunday, from 10:00 AM to 07:00 PM IST.',
  },
  {
    question: 'Do you serve cities other than Surat?',
    answer:
      'Yes, Shree Beauty Studio accepts destination bridal makeovers, pre-bridal consultations, and hair treatment bookings from clients across Gujarat including Vadodara, Ahmedabad, Navsari, Bharuch, and Rajkot.',
  },
  {
    question: 'What are your prices?',
    answer:
      'Services start at ₹50 for fixed-rate eyebrow threading. Haircuts from ₹350, facials from ₹700 (Hydra Facial from ₹2,500), hair treatments from ₹3,000, and full 3-session bridal packages from ₹25,300. All prices are transparent with zero hidden fees.',
  },
  {
    question: 'Are your beauty products genuine?',
    answer:
      'Yes, 100% of our salon products and cosmetics are authentic original sealed formulations from L’Oréal Professionnel, Huda Beauty, MAC, NARS, Bobbi Brown, Dior, and PAC — never counterfeit or diluted.',
  },
];

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

export function getCanonicalFAQSchema() {
  return getFAQSchema(CANONICAL_FAQS);
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

// ─── Blog CollectionPage / ItemList Schema ──────────────────────────────────

export function getBlogCollectionSchema(
  posts: Array<{ slug: string; title: string; excerpt?: string; image?: string; publishedAt?: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${BASE_URL}/blog#collection`,
    url: `${BASE_URL}/blog`,
    name: `Beauty & Bridal Journal: ${posts.length}+ Guides | Shree Beauty Studio, Surat`,
    description: `Explore ${posts.length}+ authoritative beauty guides on bridal makeup, hair botox, skin therapies, and salon advice in Katargam, Surat.`,
    isPartOf: { '@id': `${BASE_URL}/#website` },
    about: { '@id': `${BASE_URL}/#business` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${BASE_URL}/blog/${post.slug}`,
        name: post.title,
        description: post.excerpt,
        image: post.image,
      })),
    },
  };
}

