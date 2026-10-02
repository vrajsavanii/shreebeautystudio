'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Phone,
  MessageCircle,
  FileDown,
  ShieldCheck,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  Award,
  Heart,
  Gem,
  Crown,
} from 'lucide-react';
import { DEFAULT_BRIDAL_PACKAGES } from '@/lib/store';

export default function BridalClient() {
  const [activeTab, setActiveTab] = useState<'bridal' | 'siders'>('bridal');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const bridalPackages = DEFAULT_BRIDAL_PACKAGES.filter((p) => p.type === 'Bridal Package');
  const sidersPackages = DEFAULT_BRIDAL_PACKAGES.filter((p) => p.type === 'Siders Package');

  const faqs = [
    {
      q: 'How far in advance should I book my bridal makeup in Surat at Shree Beauty Studio?',
      a: 'We strongly recommend booking 2 to 4 months in advance, especially during the peak wedding season in Gujarat (November through March and May to June). Because we prioritize individual attention and personalized bridal suite scheduling, prime wedding dates and auspicious muhurat slots fill up rapidly.',
    },
    {
      q: 'What is included in Shree Beauty Studio’s 3-session Bridal Packages?',
      a: 'Our complete 3-session Couture Bridal Package covers three wedding events (such as Wedding, Mandap Muhurat, and Sangeet or Engagement). Each session includes complete HD or Airbrush bridal makeup, customized couture hairstyling, fine jewellery setting, cosmetic eye lenses, premium hair extensions, 3D mink eyelashes, fresh/floral hair decor, and traditional draping (sari or chaniya choli).',
    },
    {
      q: 'Which cosmetics and skincare brands are used for brides?',
      a: 'We use exclusively 100% authentic, sealed international luxury cosmetics. Depending on your chosen package tier, our kits feature MAC Cosmetics, Forever 52, Huda Beauty, Bobbi Brown, Giorgio Armani, Dior, NARS, Hourglass, Charlotte Tilbury, and Valentino. We never compromise on product authenticity or skin safety.',
    },
    {
      q: 'Can my sisters, mother, and bridesmaids get ready alongside me (Siders packages)?',
      a: 'Yes, absolutely. We offer specialized 1-session Siders Packages starting at ₹3,300 per person. Siders packages include complete event makeup, elegant hairstyling, and dupatta/sari draping so your bridal party looks harmoniously coordinated and photo-ready.',
    },
    {
      q: 'Do you help with bridal jewellery setting and traditional Gujarati draping?',
      a: 'Yes! Precise draping and heavy jewellery fixation are integral parts of our bridal service. Whether it is a traditional Panetar, Gharchola, designer Chaniya Choli, or modern Reception gown, our experienced draping artists ensure every pleat, pin, and dupatta is securely anchored for hours of comfortable movement.',
    },
    {
      q: 'Where is Shree Beauty Studio located in Surat?',
      a: 'Our bridal studio is situated at 22, Radhika Society, Opposite Cancer Hospital, Katargam, Surat, Gujarat 395004. We are easily accessible with convenient parking for brides traveling from Katargam, Adajan, Pal, Vesu, Varachha, and across Surat.',
    },
  ];

  return (
    <div style={{ backgroundColor: '#021e22', color: '#ffffff', minHeight: '100vh' }}>
      {/* 1. HERO SECTION */}
      <section
        style={{
          position: 'relative',
          padding: 'clamp(40px, 6vw, 68px) 20px clamp(28px, 4vw, 44px)',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(5, 60, 67, 0.8) 0%, #021e22 75%)',
          borderBottom: '1px solid rgba(234, 186, 56, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 1140, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          {/* Main H1 */}
          <h1
            style={{
              fontSize: 'clamp(32px, 5.5vw, 56px)',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: '0 auto 14px',
              maxWidth: 900,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 30%, #f5d87a 70%, #EABA38 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Bridal Makeup Artist in Surat
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(16px, 2.2vw, 20px)',
              color: '#cbd5e1',
              lineHeight: 1.6,
              maxWidth: 760,
              margin: '0 auto 20px',
            }}
          >
            Experience bespoke luxury bridal makeovers in Katargam, Surat. Flawless HD &amp; airbrush artistry, customized jewellery setting, and traditional Gujarati draping crafted for your most cherished moments.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 24,
            }}
          >
            <Link
              href="/book"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#EABA38',
                color: '#021e22',
                padding: '14px 30px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(234, 186, 56, 0.35)',
                transition: 'transform 0.2s ease',
              }}
            >
              <Calendar size={18} />
              <span>Book Bridal Consultation</span>
            </Link>

            <a
              href="https://wa.me/919824183769?text=Hi%20Shree%20Beauty%20Studio!%20I%20am%20looking%20for%20a%20bridal%20makeup%20package%20in%20Surat."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#25D366',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(37, 211, 102, 0.25)',
              }}
            >
              <MessageCircle size={18} />
              <span>WhatsApp Us</span>
            </a>

            <a
              href="/shree-bridal-rate-card.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                padding: '14px 24px',
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <FileDown size={17} color="#EABA38" />
              <span>Download Rate Card (PDF)</span>
            </a>
          </div>

          {/* Trust Highlights Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              maxWidth: 960,
              margin: '0 auto',
            }}
          >
            {[
              { icon: Award, title: '25+ Years Experience', desc: 'Trusted by generations of Surat brides' },
              { icon: ShieldCheck, title: '100% Genuine Brands', desc: 'Dior, NARS, Charlotte Tilbury, MAC' },
              { icon: Gem, title: '3-Session Couture', desc: 'Wedding, Mandap Muhurat, and Sangeet complete' },
              { icon: MapPin, title: 'Katargam, Surat', desc: 'Dedicated air-conditioned bridal studio' },
            ].map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(5, 60, 67, 0.45)',
                    border: '1px solid rgba(234, 186, 56, 0.15)',
                    borderRadius: 16,
                    padding: '16px 14px',
                    textAlign: 'center',
                  }}
                >
                  <IconComp size={22} color="#EABA38" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f5d87a', marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. PACKAGES SECTION */}
      <section
        id="packages"
        style={{
          padding: 'clamp(32px, 5vw, 60px) 20px',
          maxWidth: 1140,
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 12px',
            }}
          >
            Transparent Bridal &amp; Siders Packages
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 640, margin: '0 auto 18px', lineHeight: 1.6 }}>
            Every bride is unique. Choose your desired luxury product line with crystal-clear pricing and complete service inclusions.
          </p>

          {/* Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: 5,
              borderRadius: 999,
              border: '1px solid rgba(234, 186, 56, 0.25)',
            }}
          >
            <button
              onClick={() => setActiveTab('bridal')}
              style={{
                padding: '10px 24px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === 'bridal' ? '#EABA38' : 'transparent',
                color: activeTab === 'bridal' ? '#021e22' : '#cbd5e1',
              }}
            >
              👰 Bridal Packages (3 Sessions)
            </button>
            <button
              onClick={() => setActiveTab('siders')}
              style={{
                padding: '10px 24px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === 'siders' ? '#EABA38' : 'transparent',
                color: activeTab === 'siders' ? '#021e22' : '#cbd5e1',
              }}
            >
              💐 Siders &amp; Occasion (1 Session)
            </button>
          </div>
        </div>

        {/* Tab 1: Bridal Packages */}
        {activeTab === 'bridal' && (
          <div>
            <div
              style={{
                background: 'rgba(234, 186, 56, 0.08)',
                border: '1px solid rgba(234, 186, 56, 0.25)',
                borderRadius: 16,
                padding: '16px 20px',
                marginBottom: 20,
                textAlign: 'center',
                color: '#f5d87a',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              ✨ <strong>All 3-Session Bridal Packages Include:</strong> Makeup, Hairstyle, Jewellery Setting, Eye Lenses, Hair Extensions, 3D Eyelashes, Hair Decor &amp; Traditional Draping.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 24,
              }}
            >
              {bridalPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    backgroundColor: '#053C43',
                    border: '1px solid rgba(234, 186, 56, 0.2)',
                    borderRadius: 20,
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#EABA38',
                        background: 'rgba(234, 186, 56, 0.12)',
                        padding: '4px 10px',
                        borderRadius: 6,
                        marginBottom: 12,
                      }}
                    >
                      3-Session Bridal Package
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', margin: '0 0 8px' }}>
                      {pkg.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 18 }}>
                      <span style={{ fontSize: 30, fontWeight: 800, color: '#f5d87a' }}>
                        ₹{pkg.price.toLocaleString('en-IN')}/-
                      </span>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>for 3 sessions</span>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16, marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#80EEEE', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                        Package Inclusions:
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          '3 Full Wedding Sessions (Wedding, Mandap Muhurat, Sangeet)',
                          `Premium ${pkg.name} Product Formulations`,
                          'Couture Hairstyling & Extensions',
                          'Bridal Jewellery Setting & Lenses',
                          'Fresh/Floral Hair Decor & Eyelashes',
                          'Panetar, Gharchola & Saree/Dupatta Draping',
                        ].map((inc, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0' }}>
                            <CheckCircle2 size={15} color="#EABA38" style={{ flexShrink: 0 }} />
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/919824183769?text=${encodeURIComponent(
                      `Hi Shree Beauty Studio! I would like to inquire about the ${pkg.name} (₹${pkg.price}) 3-Session Bridal Package for my wedding in Surat.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(234, 186, 56, 0.15)',
                      color: '#f5d87a',
                      border: '1px solid rgba(234, 186, 56, 0.4)',
                      padding: '12px 18px',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>Inquire / Book via WhatsApp</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Siders Packages */}
        {activeTab === 'siders' && (
          <div>
            <div
              style={{
                background: 'rgba(128, 238, 238, 0.08)',
                border: '1px solid rgba(128, 238, 238, 0.25)',
                borderRadius: 16,
                padding: '16px 20px',
                marginBottom: 32,
                textAlign: 'center',
                color: '#80EEEE',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              💐 <strong>1-Time Event Package for Sisters &amp; Family:</strong> Includes complete event makeup, tailored hairstyle, and dupatta/sari draping.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 20,
              }}
            >
              {sidersPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    backgroundColor: '#053C43',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 19, fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>
                      {pkg.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: '#f5d87a' }}>
                        ₹{pkg.price.toLocaleString('en-IN')}/-
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>1 session</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 18px' }}>
                      Complete signature makeup with {pkg.name} products, customized hairstyling, and professional saree or dupatta draping.
                    </p>
                  </div>

                  <a
                    href={`https://wa.me/919824183769?text=${encodeURIComponent(
                      `Hi Shree Beauty Studio! I would like to inquire about the ${pkg.name} (₹${pkg.price}) Siders Package in Surat.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '10px 16px',
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: 13,
                      textDecoration: 'none',
                    }}
                  >
                    <MessageCircle size={15} color="#25D366" />
                    <span>Inquire for Family</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. THE SURAT BRIDE TIMELINE */}
      <section style={{ padding: 'clamp(60px, 9vw, 90px) 20px', maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(234, 186, 56, 0.12)',
              border: '1px solid rgba(234, 186, 56, 0.3)',
              color: '#f5d87a',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.04em',
              marginBottom: 16,
            }}
          >
            <Sparkles size={14} color="#EABA38" />
            <span>Curated Milestone Guide</span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 42px)',
              fontWeight: 800,
              margin: '0 0 14px',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 40%, #f5d87a 80%, #EABA38 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            The Bride Preparation Timeline
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 'clamp(14px, 2vw, 16px)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
            Follow our proven milestone guide to ensure a relaxed, glowing, and punctual wedding journey from consultation to your auspicious muhurat.
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Vertical Connecting Line on larger screens */}
          <div
            style={{
              position: 'absolute',
              left: 24,
              top: 30,
              bottom: 30,
              width: 2,
              background: 'linear-gradient(180deg, #EABA38 0%, rgba(234, 186, 56, 0.35) 70%, rgba(5, 60, 67, 0.2) 100%)',
              zIndex: 0,
            }}
          />

          {[
            {
              num: '01',
              phase: 'Phase 1 · Consultation & Vision',
              step: '3 to 4 Months Out',
              icon: Calendar,
              title: 'Consultation & Date Reservation',
              detail:
                'Visit Shree Beauty Studio in Katargam to discuss your wedding themes, lehenga colors, and jewelry. Confirm dates and lock auspicious muhurat slots before peak season slots fill up.',
              chips: ['Lock Auspicious Muhurat Slot', 'Outfit & Jewelry Theme Consultation', 'Skin & Hair Texture Analysis'],
            },
            {
              num: '02',
              phase: 'Phase 2 · Skincare & Hair Health',
              step: '1 to 2 Months Out',
              icon: Sparkles,
              title: 'Pre-Bridal Skincare & Hair Treatments',
              detail:
                'Begin customized monthly deep hydration facials and nourishing hair spa therapies. Finalize cosmetic lens shades and hair extension matching for zero wedding-day stress.',
              chips: ['Hydrating Pre-Bridal Facials', 'Nourishing Hair Spa Therapies', 'Lenses & Extensions Matching'],
            },
            {
              num: '03',
              phase: 'Phase 3 · Body Grooming & Polish',
              step: '1 Week Out',
              icon: Gem,
              title: 'Final Grooming & Body Rituals',
              detail:
                'Schedule full body Rica waxing, eyebrow shaping, spa manicure, and pedicure 4 to 5 days prior to mehendi application for silky, camera-ready perfection.',
              chips: ['Full Body Rica Waxing', 'Spa Manicure & Pedicure', 'Eyebrow Shaping & Skin Polish'],
            },
            {
              num: '04',
              phase: 'Phase 4 · The Grand Muhurat',
              step: 'Wedding Day',
              icon: Crown,
              title: 'Relaxed Studio Transformation',
              detail:
                'Step into our dedicated, air-conditioned private bridal suite. Our artists coordinate your makeup, couture hairstyling, jewelry setting, and traditional draping with strict adherence to your muhurat timing.',
              chips: ['Private AC Bridal Suite', 'Flawless HD/Airbrush Artistry', 'Traditional Gujarati Draping'],
            },
          ].map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  gap: 20,
                  alignItems: 'flex-start',
                }}
              >
                {/* Node Step Badge */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #05424A 0%, #03252a 100%)',
                    border: '2px solid #EABA38',
                    boxShadow: '0 0 16px rgba(234, 186, 56, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f5d87a',
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: '0.02em',
                  }}
                >
                  {item.num}
                </div>

                {/* Content Card */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(5, 60, 67, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(234, 186, 56, 0.18)',
                    borderRadius: 20,
                    padding: '16px 20px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-3px)';
                    el.style.borderColor = 'rgba(234, 186, 56, 0.5)';
                    el.style.boxShadow = '0 14px 36px rgba(234, 186, 56, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(0)';
                    el.style.borderColor = 'rgba(234, 186, 56, 0.18)';
                    el.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.25)';
                  }}
                >
                  {/* Top Header Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#80EEEE',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {item.phase}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: 'rgba(234, 186, 56, 0.15)',
                        border: '1px solid rgba(234, 186, 56, 0.35)',
                        color: '#f5d87a',
                        fontWeight: 700,
                        fontSize: 12,
                        padding: '4px 12px',
                        borderRadius: 999,
                      }}
                    >
                      <IconComp size={13} color="#EABA38" />
                      <span>{item.step}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      fontSize: 'clamp(17px, 2.2vw, 20px)',
                      fontWeight: 800,
                      color: '#ffffff',
                      marginBottom: 8,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </div>

                  {/* Detail */}
                  <p
                    style={{
                      fontSize: 14,
                      color: '#cbd5e1',
                      lineHeight: 1.65,
                      margin: '0 0 10px',
                    }}
                  >
                    {item.detail}
                  </p>

                  {/* Key Highlights Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {item.chips.map((chip, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: 'rgba(2, 30, 34, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          padding: '5px 11px',
                          borderRadius: 8,
                          fontSize: 12,
                          color: '#e2e8f0',
                        }}
                      >
                        <CheckCircle2 size={13} color="#EABA38" style={{ flexShrink: 0 }} />
                        <span>{chip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. WHY BRIDES CHOOSE SHREE BEAUTY STUDIO */}
      <section
        style={{
          padding: 'clamp(32px, 5vw, 56px) 20px',
          backgroundColor: '#03252a',
          borderTop: '1px solid rgba(234, 186, 56, 0.15)',
        }}
      >
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, margin: '0 0 12px' }}>
              Why Brides Choose Shree Beauty Studio
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 660, margin: '0 auto', lineHeight: 1.6 }}>
              A sanctuary exclusively dedicated to women, built on 25+ years of trust, artistry, and authentic formulations.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {[
              {
                title: 'Camera-Ready Durability',
                desc: 'Our HD & airbrush techniques are formulated to endure Gujarat’s evening climate, intense mandap lighting, and high-definition photography without cracking or melting.',
              },
              {
                title: 'Gujarati Draping Mastery',
                desc: 'Specialized expertise in traditional seedha palla, pleated dupatta anchors, and heavy chaniya choli stabilization so you can celebrate freely without adjusting your outfit.',
              },
              {
                title: 'Strict Hygiene Standards',
                desc: 'Hospital-grade sanitization between every bride. Fresh single-use applicators, sanitized makeup brushes, and sealed genuine cosmetics for total skin safety.',
              },
              {
                title: 'Private & Serene Environment',
                desc: 'A calm, 100% ladies-only boutique space in Katargam, Surat designed to keep the bride relaxed, pampered, and stress-free on her wedding day.',
              },
            ].map((d, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#053C43',
                  border: '1px solid rgba(234, 186, 56, 0.15)',
                  borderRadius: 16,
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 700, color: '#f5d87a', marginBottom: 8 }}>
                  {d.title}
                </div>
                <div style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.6 }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ ACCORDION SECTION */}
      <section style={{ padding: 'clamp(32px, 5vw, 56px) 20px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, margin: '0 0 12px' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6 }}>
            Everything you need to know about booking your bridal makeup in Surat.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'rgba(5, 60, 67, 0.4)',
                  border: isOpen ? '1px solid #EABA38' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 15,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} color="#EABA38" /> : <ChevronDown size={18} color="#94a3b8" />}
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 20px 18px',
                      fontSize: 14,
                      color: '#cbd5e1',
                      lineHeight: 1.6,
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: 12,
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. STUDIO LOCATION & CONTACT BANNER */}
      <section
        style={{
          padding: 'clamp(36px, 5vw, 60px) 20px',
          background: 'linear-gradient(180deg, #03252a 0%, #011619 100%)',
          borderTop: '1px solid rgba(234, 186, 56, 0.2)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 40px)', fontWeight: 800, margin: '0 0 16px', color: '#ffffff' }}>
            Ready to Begin Your Bridal Journey?
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: 16, lineHeight: 1.6, margin: '0 0 20px' }}>
            Visit our boutique in Katargam, Surat or schedule a personal bridal consultation today.
          </p>

          <div
            style={{
              backgroundColor: 'rgba(5, 60, 67, 0.6)',
              border: '1px solid rgba(234, 186, 56, 0.3)',
              borderRadius: 20,
              padding: '20px 20px',
              marginBottom: 20,
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f5d87a', fontWeight: 700, marginBottom: 6 }}>
                <MapPin size={18} />
                <span>Studio Location</span>
              </div>
              <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004
              </div>
              <a
                href="https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#80EEEE', textDecoration: 'none', display: 'inline-block', marginTop: 6 }}
              >
                Open in Google Maps ↗
              </a>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f5d87a', fontWeight: 700, marginBottom: 6 }}>
                <Phone size={18} />
                <span>Call &amp; Inquiries</span>
              </div>
              <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                <a href="tel:+919824183769" style={{ color: '#ffffff', textDecoration: 'none' }}>+91 98241 83769</a>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                Monday to Sunday: 10:00 AM – 07:00 PM
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link
              href="/book"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#EABA38',
                color: '#021e22',
                padding: '14px 30px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: 'none',
              }}
            >
              <Calendar size={18} />
              <span>Book Appointment Online</span>
            </Link>

            <a
              href="https://wa.me/919824183769?text=Hi%20Shree%20Beauty%20Studio!%20I%20would%20like%20to%20consult%20for%20bridal%20makeup."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#25D366',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: 'none',
              }}
            >
              <MessageCircle size={18} />
              <span>WhatsApp Consultation</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
