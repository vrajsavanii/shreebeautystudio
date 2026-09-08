'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Award,
  ShieldCheck,
  Heart,
  Calendar,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  Gem,
  ArrowRight,
} from 'lucide-react';
import { customerImages } from '@/lib/customer-images';

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function AboutClient() {
  const pillars = [
    {
      icon: Award,
      title: '10+ Years of Excellence',
      description:
        'Serving hundreds of satisfied brides and regular clients across Katargam and Surat with unmatched consistency and personalized care.',
    },
    {
      icon: Gem,
      title: '100% Authentic Luxury Brands',
      description:
        'We never cut corners with counterfeit cosmetics. We exclusively use MAC, Huda Beauty, NARS, PAC, Forever52, and L’Oréal Professional.',
    },
    {
      icon: ShieldCheck,
      title: 'Hospital-Grade Hygiene',
      description:
        'Sanitized brushes, sterilized metal tools, disposable capes, and fresh single-use linens for every client without exception.',
    },
    {
      icon: Heart,
      title: 'Personalized Consultation',
      description:
        'We listen closely to your facial anatomy, skin tone, hair texture, and outfit theme to craft a look that is uniquely and effortlessly you.',
    },
  ];

  const milestones = [
    { number: '10+', label: 'Years of Experience' },
    { number: '5,000+', label: 'Happy Clients Served' },
    { number: '500+', label: 'Brides Styled' },
    { number: '4.8 ★', label: 'Average Google Rating' },
  ];

  return (
    <div style={{ background: '#fcfbf9', minHeight: '100vh', paddingBottom: 80 }}>
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)',
          color: '#ffffff',
          padding: '80px 20px 70px',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${customerImages.hero.main})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.12,
          }}
        />
        <div style={{ position: 'relative', maxWidth: 840, margin: '0 auto' }}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(234, 186, 56, 0.15)',
              border: '1px solid rgba(234, 186, 56, 0.35)',
              padding: '6px 18px',
              borderRadius: 99,
              color: '#fef08a',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <Sparkles size={14} />
            <span>Our Heritage &amp; Commitment to Beauty</span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            style={{
              fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Crafting Timeless Elegance in Katargam, Surat
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'rgba(255, 255, 255, 0.88)',
              maxWidth: 680,
              margin: '0 auto 32px',
              lineHeight: 1.6,
            }}
          >
            Welcome to Shree Beauty Studio — where artistic passion meets certified mastery. For over a decade, we have been Surat&apos;s sanctuary for bespoke bridal makeovers, rejuvenating skincare, and precision haircare.
          </motion.p>
        </div>
      </section>

      {/* ─── STATS STRIP ────────────────────────────────────────── */}
      <section
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          padding: '36px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 24,
            textAlign: 'center',
          }}
        >
          {milestones.map((stat, i) => (
            <div key={i} style={{ padding: '8px 16px' }}>
              <div
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 2.5rem)',
                  fontWeight: 800,
                  color: '#05424A',
                  marginBottom: 4,
                  letterSpacing: '-0.02em',
                }}
              >
                {stat.number}
              </div>
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STORY & PHILOSOPHY ─────────────────────────────────── */}
      <section style={{ maxWidth: 1080, margin: '60px auto 0', padding: '0 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#d97706',
              }}
            >
              Our Story
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                fontWeight: 800,
                color: '#0f172a',
                marginTop: 8,
                marginBottom: 20,
                lineHeight: 1.25,
              }}
            >
              A Legacy Built on Trust, Artistry &amp; Perfection
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.8, fontSize: 15, marginBottom: 16 }}>
              Founded with the vision to bring international-standard salon treatments and couture bridal makeovers to women in Surat, <strong>Shree Beauty Studio</strong> has grown into one of Katargam&apos;s most cherished beauty parlours.
            </p>
            <p style={{ color: '#475569', lineHeight: 1.8, fontSize: 15, marginBottom: 16 }}>
              We believe genuine beauty care is deeply personal. Whether you are a bride preparing for the biggest day of your life, a professional seeking transformative hair restoration like Botox or Keratin, or a client enjoying a tranquil afternoon facial, our master beauticians ensure every minute in our studio leaves you feeling cherished, rejuvenated, and confident.
            </p>
            <p style={{ color: '#475569', lineHeight: 1.8, fontSize: 15, marginBottom: 24 }}>
              Located right opposite the Cancer Hospital in Radhika Society, our welcoming, hygiene-first boutique parlour offers a discreet, peaceful atmosphere dedicated exclusively to women.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/bridal"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#05424A',
                  color: '#ffffff',
                  padding: '12px 22px',
                  borderRadius: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                <span>View Bridal Packages</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/services"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '12px 22px',
                  borderRadius: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                <span>Explore Salon Services</span>
              </Link>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            }}
          >
            <img
              src={customerImages.bridal}
              alt="Shree Beauty Studio Katargam Surat Bridal Makeup"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 460,
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(5,66,74,0.92) 0%, transparent 100%)',
                padding: '30px 24px 20px',
                color: '#ffffff',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
                100% Client Satisfaction
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                Tailored bridal looks designed to withstand emotional moments and Surat weather.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY CHOOSE US / 4 PILLARS ─────────────────────────── */}
      <section style={{ maxWidth: 1080, margin: '80px auto 0', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#d97706',
            }}
          >
            Our Core Standards
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
              fontWeight: 800,
              color: '#0f172a',
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            Why Women in Surat Choose Shree Beauty Studio
          </h2>
          <p style={{ color: '#64748b', maxWidth: 580, margin: '0 auto', fontSize: 15 }}>
            Our values define every service we render, from quick brow shaping to grand bridal couture.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
          }}
        >
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: 18,
                  border: '1px solid #e2e8f0',
                  padding: '28px 24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'rgba(5, 66, 74, 0.08)',
                    color: '#05424A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                  }}
                >
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                  {item.title}
                </h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── LOCATION & CONTACT BLOCK ───────────────────────────── */}
      <section style={{ maxWidth: 1080, margin: '80px auto 0', padding: '0 20px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)',
            borderRadius: 24,
            overflow: 'hidden',
            color: '#ffffff',
            boxShadow: '0 16px 40px rgba(5,66,74,0.25)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          }}
        >
          <div style={{ padding: '40px 32px' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#fef08a',
              }}
            >
              Visit Our Studio
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 8, marginBottom: 18 }}>
              Experience the Shree Difference Today
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Drop by our boutique salon in Katargam, Surat or book an appointment online to reserve your stylist with zero waiting time.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: '#fef08a', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                  22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Clock size={18} style={{ color: '#fef08a', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                  Mon – Sun: 10:00 AM – 7:00 PM
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Phone size={18} style={{ color: '#fef08a', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                  +91 98241 83769
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/book"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fef08a',
                  color: '#053320',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                <Calendar size={16} />
                <span>Book Appointment Online</span>
              </Link>
              <a
                href="https://wa.me/919824183769?text=Hi%20Shree%20Beauty%20Studio!%20I%20would%20like%20to%20know%20more%20about%20your%20studio."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#25D366',
                  color: '#053320',
                  padding: '12px 20px',
                  borderRadius: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                <MessageCircle size={16} />
                <span>WhatsApp Us</span>
              </a>
            </div>
          </div>

          <div style={{ minHeight: 320, background: '#e2e8f0' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3719.9946!2d72.8258!3d21.2156!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04f0c3c55a6f3%3A0x6f9da3b1a41fbe06!2sKatargam%2C%20Surat%2C%20Gujarat!5e0!3m2!1sen!2sin!4v1680000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 320, width: '100%', display: 'block' }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Shree Beauty Studio Map Katargam Surat"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
