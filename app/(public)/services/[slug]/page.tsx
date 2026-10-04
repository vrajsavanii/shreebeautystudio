import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Sparkles,
  Star,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Calendar,
  ArrowRight,
  Droplets,
  Award,
  ChevronRight,
  Check,
} from 'lucide-react';
import {
  SERVICES_SEO_DATA,
  ALL_SERVICE_SEO_SLUGS,
  getServiceSeoData,
} from '@/lib/services-seo-data';
import { BASE_URL, BUSINESS } from '@/lib/seo';

interface Props {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return ALL_SERVICE_SEO_SLUGS.map((slug) => ({
    slug,
  }));
}

export function generateMetadata({ params }: Props): Metadata {
  const data = getServiceSeoData(params.slug);
  if (!data) return {};

  const pageUrl = `${BASE_URL}/services/${data.slug}`;

  return {
    title: {
      absolute: data.metaTitle,
    },
    description: data.metaDescription,
    keywords: data.keywords,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: pageUrl,
      siteName: 'Shree Beauty Studio & Bridal Parlour',
      locale: 'en_IN',
      type: 'website',
      images: [
        {
          url: data.heroImage.startsWith('http') ? data.heroImage : `${BASE_URL}${data.heroImage}`,
          width: 1200,
          height: 630,
          alt: `${data.serviceName} in Katargam, Surat — Shree Beauty Studio`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.metaTitle,
      description: data.metaDescription,
      images: [data.heroImage.startsWith('http') ? data.heroImage : `${BASE_URL}${data.heroImage}`],
    },
    other: {
      'geo.region': 'IN-GJ',
      'geo.placename': 'Katargam, Surat, Gujarat, India',
      'geo.position': '21.2369033;72.8158985',
      'ICBM': '21.2369033, 72.8158985',
    },
  };
}

export default function ServiceLandingPage({ params }: Props) {
  const data = getServiceSeoData(params.slug);
  if (!data) {
    notFound();
  }

  const pageUrl = `${BASE_URL}/services/${data.slug}`;

  // Structured Data Schemas
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${pageUrl}#service`,
        name: data.serviceName,
        serviceType: data.category,
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
          geo: {
            '@type': 'GeoCoordinates',
            latitude: BUSINESS.geo.latitude,
            longitude: BUSINESS.geo.longitude,
          },
          priceRange: BUSINESS.priceRange,
        },
        areaServed: [
          {
            '@type': 'City',
            name: 'Surat',
          },
          {
            '@type': 'AdministrativeArea',
            name: 'Katargam',
          },
          {
            '@type': 'State',
            name: 'Gujarat',
          },
        ],
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: data.priceCurrency,
          lowPrice: data.priceStarting.replace(/[^\d]/g, ''),
          offerCount: data.pricingOptions.length.toString(),
          url: `${BASE_URL}/book?service=${encodeURIComponent(data.bookServiceName)}`,
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: `${data.serviceName} Pricing & Options`,
          itemListElement: data.pricingOptions.map((opt) => ({
            '@type': 'Offer',
            name: opt.name,
            description: opt.description,
            price: opt.price.replace(/[^\d]/g, ''),
            priceCurrency: data.priceCurrency,
          })),
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
            name: 'Services',
            item: `${BASE_URL}/services`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: data.serviceName,
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
    `Hello Shree Beauty Studio! I would like to inquire about ${data.serviceName} at your Katargam, Surat studio.`
  );

  const otherServices = ALL_SERVICE_SEO_SLUGS.filter((s) => s !== data.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main style={{ backgroundColor: '#FAF8F5', color: '#1A2328', minHeight: '100vh' }}>
        {/* Breadcrumb Navigation */}
        <div style={{ backgroundColor: '#032B30', borderBottom: '1px solid rgba(234, 186, 56, 0.2)', padding: '12px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/services" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Services</Link>
            <span>/</span>
            <span style={{ color: '#EABA38', fontWeight: 600 }}>{data.serviceName}</span>
          </div>
        </div>

        {/* Hero Section */}
        <section
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #021a1d 0%, #05424A 50%, #032B30 100%)',
            color: '#ffffff',
            padding: 'clamp(48px, 6vw, 84px) 20px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 450,
              height: 450,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(234, 186, 56, 0.16) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: 1150, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40, alignItems: 'center' }}>
              <div>
                {/* Pill Badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 16px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(234, 186, 56, 0.15)',
                    border: '1px solid rgba(234, 186, 56, 0.4)',
                    color: '#EABA38',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    marginBottom: 20,
                  }}
                >
                  <Sparkles size={14} />
                  <span>{data.heroBadge}</span>
                </div>

                <h1
                  style={{
                    fontSize: 'clamp(30px, 4.5vw, 50px)',
                    fontWeight: 800,
                    lineHeight: 1.15,
                    color: '#ffffff',
                    marginBottom: 18,
                    fontFamily: 'Cormorant Garamond, serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {data.headline}
                </h1>

                <p
                  style={{
                    fontSize: 'clamp(15px, 2vw, 17.5px)',
                    lineHeight: 1.7,
                    color: '#cbd5e1',
                    marginBottom: 28,
                  }}
                >
                  {data.subheadline}
                </p>

                {/* Metrics Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 13,
                      color: '#EABA38',
                      fontWeight: 600,
                    }}
                  >
                    <Star size={14} fill="#EABA38" />
                    <span>{data.rating}</span>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 13,
                      color: '#80EEEE',
                      fontWeight: 600,
                    }}
                  >
                    <Clock size={14} />
                    <span>Duration: {data.duration}</span>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 13,
                      color: '#f5d87a',
                      fontWeight: 600,
                    }}
                  >
                    <Award size={14} />
                    <span>Starting {data.priceStarting}</span>
                  </div>
                </div>

                {/* Hero CTAs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                  <Link
                    href={`/book?service=${encodeURIComponent(data.bookServiceName)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: '#EABA38',
                      color: '#032B30',
                      fontWeight: 700,
                      fontSize: 14.5,
                      padding: '13px 26px',
                      borderRadius: 999,
                      textDecoration: 'none',
                      boxShadow: '0 8px 24px rgba(234, 186, 56, 0.35)',
                    }}
                  >
                    <Calendar size={16} />
                    <span>Book Appointment Online</span>
                  </Link>

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
                      padding: '13px 22px',
                      borderRadius: 999,
                      textDecoration: 'none',
                      boxShadow: '0 8px 20px rgba(37, 211, 102, 0.3)',
                    }}
                  >
                    <span>WhatsApp Inquiry</span>
                    <ArrowRight size={15} />
                  </a>
                </div>
              </div>

              {/* Hero Image Card */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 24,
                    overflow: 'hidden',
                    border: '1px solid rgba(234, 186, 56, 0.3)',
                    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.3)',
                    aspectRatio: '4/3',
                    backgroundColor: '#032B30',
                  }}
                >
                  <Image
                    src={data.heroImage}
                    alt={`${data.serviceName} at Shree Beauty Studio Katargam Surat`}
                    fill
                    style={{ objectFit: 'cover' }}
                    priority
                    sizes="(max-width: 768px) 100vw, 500px"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, rgba(3, 43, 48, 0.95), transparent)',
                      padding: '24px 20px 16px',
                      color: '#ffffff',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#EABA38', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Katargam Studio Flagship
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                      100% Ladies Only · 25+ Years Verified Excellence
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Answer Box (GEO / AI Overviews Target) */}
        <section style={{ maxWidth: 1100, margin: '-28px auto 0', padding: '0 20px', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              border: '1px solid rgba(5, 66, 74, 0.12)',
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
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#05424A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Quick Summary &amp; Expert Diagnosis
                </div>
                <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 800, color: '#032B30', margin: '0 0 10px' }}>
                  What You Need to Know About {data.serviceName}
                </h2>
                <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.75, margin: 0, fontWeight: 500 }}>
                  {data.quickAnswer}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Local Surat Climate & Tapi Water Advisory Box */}
        <section style={{ maxWidth: 1100, margin: '48px auto', padding: '0 20px' }}>
          <div
            style={{
              backgroundColor: 'rgba(5, 66, 74, 0.05)',
              border: '1px solid rgba(5, 66, 74, 0.18)',
              borderRadius: 18,
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#05424A',
                color: '#80EEEE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Droplets size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#032B30', margin: '0 0 6px' }}>
                {data.climateAdvice.title}
              </h3>
              <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.65, margin: 0 }}>
                {data.climateAdvice.description}
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section style={{ maxWidth: 1100, margin: '60px auto', padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ color: '#EABA38', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Proven Results &amp; Care
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: '#032B30', fontFamily: 'Cormorant Garamond, serif' }}>
              Why Clients Choose Our {data.serviceName}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {data.benefits.map((benefit, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  padding: '24px 22px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <CheckCircle2 size={20} color="#05424A" />
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#032B30', margin: 0 }}>
                    {benefit.title}
                  </h3>
                </div>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Step-by-Step Procedure */}
        <section style={{ backgroundColor: '#ffffff', padding: '64px 20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div style={{ color: '#05424A', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                The Clinical Protocol
              </div>
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: '#032B30', fontFamily: 'Cormorant Garamond, serif' }}>
                How Your Treatment Is Performed
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              {data.processSteps.map((step) => (
                <div
                  key={step.step}
                  style={{
                    backgroundColor: '#FAF8F5',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    padding: 24,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#05424A',
                      color: '#EABA38',
                      fontSize: 14,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                  >
                    {step.step}
                  </div>
                  <h3 style={{ fontSize: 16.5, fontWeight: 700, color: '#032B30', marginBottom: 8 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Transparent Pricing Cards */}
        <section style={{ maxWidth: 1100, margin: '64px auto', padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ color: '#EABA38', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Upfront &amp; Honest
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: '#032B30', fontFamily: 'Cormorant Garamond, serif' }}>
              Transparent Pricing &amp; Packages in Surat
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 650, margin: '8px auto 0' }}>
              Zero hidden salon taxes or surprise add-ons. What you see is what you pay.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 24 }}>
            {data.pricingOptions.map((opt, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  border: idx === 1 ? '2px solid #EABA38' : '1px solid #e2e8f0',
                  boxShadow: idx === 1 ? '0 12px 36px rgba(234, 186, 56, 0.2)' : '0 4px 16px rgba(0,0,0,0.03)',
                  padding: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                {idx === 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#EABA38',
                      color: '#032B30',
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '4px 14px',
                      borderRadius: 999,
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, color: '#032B30', marginBottom: 8 }}>
                    {opt.name}
                  </h3>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#05424A', marginBottom: 12 }}>
                    {opt.price}
                  </div>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                    {opt.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                    {opt.highlights.map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#334155' }}>
                        <Check size={16} color="#05424A" style={{ flexShrink: 0 }} />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/book?service=${encodeURIComponent(data.bookServiceName)}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    backgroundColor: idx === 1 ? '#05424A' : '#FAF8F5',
                    color: idx === 1 ? '#ffffff' : '#05424A',
                    border: idx === 1 ? 'none' : '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '12px 20px',
                    borderRadius: 999,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Book This Option
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Brands Used & 100% Genuine Guarantee */}
        <section style={{ backgroundColor: '#ffffff', padding: '50px 20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ color: '#05424A', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Product Authenticity Promise
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#032B30', marginBottom: 14 }}>
              100% Genuine Formulations Opened in Front of You
            </h3>
            <p style={{ fontSize: 14.5, color: '#64748b', maxWidth: 700, margin: '0 auto 24px', lineHeight: 1.6 }}>
              We never use counterfeit, diluted, or unverified generic cosmetics. Every product is sealed from certified luxury brand distributors:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {data.brandsUsed.map((b, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#FAF8F5',
                    border: '1px solid #e2e8f0',
                    borderRadius: 999,
                    padding: '8px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#05424A',
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Banner: 100% Ladies Only & Katargam Heritage */}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28, alignItems: 'center' }}>
              <div>
                <div style={{ color: '#EABA38', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Ladies-Only Sanctuary
                </div>
                <h3 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, fontFamily: 'Cormorant Garamond, serif', margin: '0 0 12px' }}>
                  Complete Privacy &amp; 25+ Years Experience
                </h3>
                <p style={{ fontSize: 14.5, color: '#cbd5e1', lineHeight: 1.65, margin: 0 }}>
                  Shree Beauty Studio is 100% exclusively reserved for women. Enjoy private therapy suites, zero male visitors, and an all-female certified styling team.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: '#e2e8f0' }}>
                  <ShieldCheck size={18} color="#EABA38" />
                  <span>Hospital-grade tool sanitization</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: '#e2e8f0' }}>
                  <Star size={18} color="#EABA38" fill="#EABA38" />
                  <span>4.9★ rating from 210+ verified Google reviews</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: '#e2e8f0' }}>
                  <Award size={18} color="#EABA38" />
                  <span>Located at 22, Radhika Society, Katargam, Surat</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section style={{ maxWidth: 1100, margin: '60px auto', padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#032B30', fontFamily: 'Cormorant Garamond, serif' }}>
              Frequently Asked Questions About {data.serviceName}
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
                  padding: '22px 26px',
                }}
              >
                <h3 style={{ fontSize: 16.5, fontWeight: 700, color: '#032B30', margin: '0 0 8px' }}>
                  {faq.question}
                </h3>
                <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.7, margin: 0 }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Explore Other Signature Services */}
        <section style={{ backgroundColor: '#FAF8F5', padding: '50px 20px 80px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
              Explore Other Specialized Treatments in Surat
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {otherServices.map((slug) => {
                const s = SERVICES_SEO_DATA[slug];
                return (
                  <Link
                    key={slug}
                    href={`/services/${slug}`}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 999,
                      padding: '9px 20px',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#05424A',
                      textDecoration: 'none',
                    }}
                  >
                    {s.serviceName}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
