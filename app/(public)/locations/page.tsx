import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Sparkles, ArrowRight, ShieldCheck, Star, Award, Heart } from 'lucide-react';
import { LOCATIONS_DATA, ALL_LOCATION_SLUGS } from '@/lib/locations-data';
import { BASE_URL, BUSINESS } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Locations Served across Gujarat & India | Shree Beauty Parlour & Studio',
  },
  description:
    'Explore cities and regions served by Shree Beauty Parlour & Studio. From our Katargam, Surat flagship sanctuary to Ahmedabad, Vadodara, Rajkot, Mumbai, and pan-India destination weddings.',
  keywords: [
    'shree beauty parlour locations',
    'shree beauty studio locations',
    'beauty parlour gujarat',
    'bridal makeup artist gujarat',
    'destination wedding makeup india',
    'beauty parlour surat',
    'beauty parlour ahmedabad',
    'beauty parlour vadodara',
    'beauty parlour rajkot',
  ],
  alternates: {
    canonical: `${BASE_URL}/locations`,
  },
  openGraph: {
    title: 'Locations Served across Gujarat & India | Shree Beauty Parlour & Studio',
    description:
      'Explore cities and regions served by Shree Beauty Parlour & Studio. Flagship Katargam sanctuary and on-location bridal teams across Gujarat & India.',
    url: `${BASE_URL}/locations`,
    siteName: 'Shree Beauty Studio & Parlour',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function LocationsHubPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Shree Beauty Parlour & Studio Service Locations across Gujarat & India',
    itemListElement: ALL_LOCATION_SLUGS.map((slug, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: LOCATIONS_DATA[slug].cityName,
      url: `${BASE_URL}/locations/${slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main style={{ backgroundColor: '#FAF8F5', color: '#1A2328', minHeight: '100vh' }}>
        {/* Hero Section */}
        <section
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #021a1d 0%, #05424A 50%, #032B30 100%)',
            color: '#ffffff',
            padding: 'clamp(56px, 7vw, 90px) 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 18px',
                borderRadius: 999,
                backgroundColor: 'rgba(234, 186, 56, 0.15)',
                border: '1px solid rgba(234, 186, 56, 0.35)',
                color: '#EABA38',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.05em',
                marginBottom: 20,
              }}
            >
              <Sparkles size={14} />
              <span>Pan-Gujarat &amp; Pan-India Coverage</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(32px, 5vw, 54px)',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'Cormorant Garamond, serif',
                lineHeight: 1.15,
                marginBottom: 18,
              }}
            >
              Locations &amp; Destination Services
            </h1>

            <p
              style={{
                fontSize: 'clamp(15px, 2vw, 18px)',
                lineHeight: 1.7,
                color: '#cbd5e1',
                maxWidth: 720,
                margin: '0 auto',
              }}
            >
              From our flagship 100% ladies sanctuary in Katargam, Surat to destination bridal makeovers in Ahmedabad, Vadodara, Rajkot, Mumbai, and across India—experience 25+ years of beauty mastery.
            </p>
          </div>
        </section>

        {/* Locations Grid */}
        <section style={{ maxWidth: 1200, margin: '-30px auto 80px', padding: '0 20px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {ALL_LOCATION_SLUGS.map((slug) => {
              const loc = LOCATIONS_DATA[slug];
              const isSurat = slug === 'surat';

              return (
                <div
                  key={slug}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    border: isSurat ? '2px solid #EABA38' : '1px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isSurat && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        backgroundColor: '#EABA38',
                        color: '#032B30',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 999,
                        letterSpacing: '0.04em',
                      }}
                    >
                      FLAGSHIP STUDIO
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#05424A', marginBottom: 12 }}>
                      <MapPin size={20} color="#05424A" />
                      <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#032B30' }}>
                        {loc.cityName}
                      </h2>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: '#EABA38', marginBottom: 12 }}>
                      {loc.tagline}
                    </div>

                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                      {loc.metaDescription}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
                      {loc.localities.slice(0, 4).map((area, i) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: '#FAF8F5',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 12,
                            color: '#475569',
                          }}
                        >
                          {area}
                        </span>
                      ))}
                      {loc.localities.length > 4 && (
                        <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>
                          +{loc.localities.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/locations/${slug}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSurat ? '#05424A' : '#FAF8F5',
                      color: isSurat ? '#ffffff' : '#05424A',
                      border: isSurat ? 'none' : '1px solid #cbd5e1',
                      fontWeight: 700,
                      fontSize: 14,
                      padding: '12px 18px',
                      borderRadius: 12,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>Explore {loc.cityName} Services</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
