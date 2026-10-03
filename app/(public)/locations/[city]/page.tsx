import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  Star,
  Sparkles,
  CheckCircle2,
  Phone,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Heart,
  Award,
  Clock,
  Compass,
} from 'lucide-react';
import { LOCATIONS_DATA, ALL_LOCATION_SLUGS } from '@/lib/locations-data';
import { BASE_URL, BUSINESS } from '@/lib/seo';

interface Props {
  params: {
    city: string;
  };
}

export function generateStaticParams() {
  return ALL_LOCATION_SLUGS.map((slug) => ({
    city: slug,
  }));
}

export function generateMetadata({ params }: Props): Metadata {
  const data = LOCATIONS_DATA[params.city.toLowerCase()];
  if (!data) return {};

  const url = `${BASE_URL}/locations/${data.slug}`;

  return {
    title: {
      absolute: data.metaTitle,
    },
    description: data.metaDescription,
    keywords: data.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url,
      siteName: 'Shree Beauty Studio & Parlour',
      locale: 'en_IN',
      type: 'website',
      images: [
        {
          url: '/logo-with-name.png',
          width: 800,
          height: 600,
          alt: `${data.headline} — Shree Beauty Studio`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.metaTitle,
      description: data.metaDescription,
      images: ['/logo-with-name.png'],
    },
  };
}

export default function LocationCityPage({ params }: Props) {
  const data = LOCATIONS_DATA[params.city.toLowerCase()];
  if (!data) {
    notFound();
  }

  const pageUrl = `${BASE_URL}/locations/${data.slug}`;

  // Structured Data Schema
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${pageUrl}#service`,
        name: `Bridal Makeover & Luxury Salon Artistry in ${data.cityName}`,
        description: data.metaDescription,
        provider: {
          '@type': ['LocalBusiness', 'BeautySalon'],
          '@id': `${BASE_URL}/#business`,
          name: BUSINESS.name,
          alternateName: BUSINESS.alternateName,
          url: BASE_URL,
          telephone: BUSINESS.telephone[0],
          address: {
            '@type': 'PostalAddress',
            streetAddress: BUSINESS.address.streetAddress,
            addressLocality: BUSINESS.address.addressLocality,
            addressRegion: BUSINESS.address.addressRegion,
            postalCode: BUSINESS.address.postalCode,
            addressCountry: BUSINESS.address.addressCountry,
          },
        },
        areaServed: {
          '@type': data.slug === 'india' ? 'Country' : 'City',
          name: data.cityName,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: BASE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Locations',
            item: `${BASE_URL}/locations`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: data.cityName,
            item: pageUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: data.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Shree Beauty Studio! I am contacting you from ${data.cityName}. I am interested in booking an appointment / bridal makeover consultation.`
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main style={{ backgroundColor: '#FAF8F5', color: '#1A2328', minHeight: '100vh' }}>
        {/* Breadcrumb Bar */}
        <div style={{ backgroundColor: '#032B30', borderBottom: '1px solid rgba(234, 186, 56, 0.2)', padding: '12px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/locations" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Locations</Link>
            <span>/</span>
            <span style={{ color: '#EABA38', fontWeight: 600 }}>{data.cityName}</span>
          </div>
        </div>

        {/* Hero Section */}
        <section
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #021a1d 0%, #05424A 50%, #032B30 100%)',
            color: '#ffffff',
            padding: 'clamp(48px, 6vw, 80px) 20px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(234, 186, 56, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            {/* Pill Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                borderRadius: 999,
                backgroundColor: 'rgba(234, 186, 56, 0.12)',
                border: '1px solid rgba(234, 186, 56, 0.35)',
                color: '#EABA38',
                fontSize: 13.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                marginBottom: 20,
              }}
            >
              <Compass size={15} />
              <span>{data.heroBadge}</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(28px, 4.5vw, 48px)',
                fontWeight: 800,
                lineHeight: 1.2,
                color: '#ffffff',
                marginBottom: 16,
                fontFamily: 'Cormorant Garamond, serif',
                letterSpacing: '-0.01em',
              }}
            >
              {data.headline}
            </h1>

            <p
              style={{
                fontSize: 'clamp(15px, 2vw, 18px)',
                lineHeight: 1.7,
                color: '#cbd5e1',
                maxWidth: 820,
                marginBottom: 32,
              }}
            >
              {data.subheadline}
            </p>

            {/* Quick Metrics Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 36,
              }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 14,
                  padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EABA38', fontSize: 13, fontWeight: 700 }}>
                  <Star size={15} fill="#EABA38" />
                  <span>4.9 / 5.0 Rating</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
                  210+ Verified Client Reviews
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 14,
                  padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#80EEEE', fontSize: 13, fontWeight: 700 }}>
                  <Award size={15} />
                  <span>25+ Years Heritage</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
                  Master Bridal & Salon Styling
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 14,
                  padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f5d87a', fontSize: 13, fontWeight: 700 }}>
                  <ShieldCheck size={15} />
                  <span>100% Ladies Only</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
                  Private Suites & Female Crew
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
              <a
                href={`https://wa.me/919824183769?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14.5,
                  padding: '13px 24px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(37, 211, 102, 0.35)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <span>WhatsApp Booking & Inquiry</span>
                <ArrowRight size={16} />
              </a>

              <Link
                href="/book"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#EABA38',
                  color: '#032B30',
                  fontWeight: 700,
                  fontSize: 14.5,
                  padding: '13px 24px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(234, 186, 56, 0.3)',
                }}
              >
                <Calendar size={16} />
                <span>Book Appointment Online</span>
              </Link>

              <a
                href="tel:+919824183769"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 14,
                  padding: '13px 20px',
                  borderRadius: 999,
                  textDecoration: 'none',
                }}
              >
                <Phone size={15} />
                <span>+91 98241 83769</span>
              </a>
            </div>
          </div>
        </section>

        {/* Search Intent Direct Explanation Box */}
        <section style={{ maxWidth: 1100, margin: '-24px auto 0', padding: '0 20px', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              border: '1px solid rgba(5, 66, 74, 0.1)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.06)',
              padding: 'clamp(24px, 4vw, 36px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#05424A',
                  color: '#EABA38',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700, color: '#032B30', margin: '0 0 8px' }}>
                  Looking for Shree Beauty Parlour in {data.cityName}?
                </h2>
                <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.7, margin: 0 }}>
                  <strong>Shree Beauty Studio</strong> is Surat’s iconic, 4.9★ rated ladies-only beauty parlour and bridal studio in Katargam. We proudly serve brides and clients across <strong>{data.cityName}</strong> with on-location destination bridal makeovers, couture hairstyling, Sabyasachi &amp; Gujarati Panetar draping, and VIP bridal team travel. Whether you are hosting a wedding in {data.cityName} or visiting South Gujarat for luxury hair Botox and skincare, experience 25+ years of verified excellence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Highlights */}
        <section style={{ maxWidth: 1100, margin: '60px auto', padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ color: '#EABA38', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {data.tagline}
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: '#032B30', fontFamily: 'Cormorant Garamond, serif' }}>
              Signature Services Available for {data.cityName}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {data.serviceHighlights.map((srv, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 18,
                  border: '1px solid #e2e8f0',
                  padding: 28,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(5, 66, 74, 0.08)',
                      color: '#05424A',
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 14,
                    }}
                  >
                    {srv.badge}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#032B30', marginBottom: 10 }}>
                    {srv.title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                    {srv.description}
                  </p>
                </div>

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  <Link
                    href="/bridal"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: '#05424A',
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Pricing &amp; Packages</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Localities Covered */}
        <section style={{ backgroundColor: '#ffffff', padding: '60px 20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <MapPin size={22} color="#05424A" />
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: '#032B30', margin: 0 }}>
                Neighborhoods &amp; Areas Served in {data.cityName}
              </h2>
            </div>
            <p style={{ fontSize: 14.5, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
              Our bridal team is mobile and accepts on-location wedding assignments across all premier residential hubs, luxury banquet halls, and five-star resorts in {data.cityName}:
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {data.localities.map((loc, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#FAF8F5',
                    border: '1px solid #e2e8f0',
                    borderRadius: 999,
                    padding: '8px 18px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#05424A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#EABA38' }} />
                  <span>{loc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Destination & Trust Highlights */}
        <section style={{ maxWidth: 1100, margin: '60px auto', padding: '0 20px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
              color: '#ffffff',
              borderRadius: 24,
              padding: 'clamp(32px, 5vw, 48px)',
              boxShadow: '0 20px 48px rgba(5, 66, 74, 0.2)',
            }}
          >
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, fontFamily: 'Cormorant Garamond, serif', marginBottom: 16 }}>
              Why Brides Choose Shree Beauty Studio Over Ordinary Parlours
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 24 }}>
              {data.destinationHighlights.map((point, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <CheckCircle2 size={18} color="#EABA38" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14.5, color: '#e2e8f0', lineHeight: 1.6 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section style={{ maxWidth: 1100, margin: '60px auto', padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#032B30', fontFamily: 'Cormorant Garamond, serif' }}>
              Frequently Asked Questions for {data.cityName}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  padding: '20px 24px',
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#032B30', margin: '0 0 8px' }}>
                  {faq.question}
                </h3>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: 0 }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Other Cities Grid */}
        <section style={{ backgroundColor: '#FAF8F5', padding: '40px 20px 80px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
              Explore Other Regions &amp; Cities Served
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {ALL_LOCATION_SLUGS.filter((slug) => slug !== data.slug).map((slug) => (
                <Link
                  key={slug}
                  href={`/locations/${slug}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 999,
                    padding: '8px 20px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#05424A',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {LOCATIONS_DATA[slug].cityName}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
