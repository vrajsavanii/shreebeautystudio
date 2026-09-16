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
    { number: '4.9 ★', label: 'Average Google Rating (150+ Reviews)' },
  ];

  return (
    <div style={{ background: '#fcfbf9', minHeight: '100vh', paddingBottom: 80 }}>
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          background: 'radial-gradient(ellipse at top, #064d57 0%, #03252a 70%, #011619 100%)',
          color: '#ffffff',
          padding: '100px 20px 80px',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Ambient floating orbs */}
        <div
          className="floating-orb"
          style={{
            top: '-10%',
            left: '15%',
            width: 380,
            height: 380,
            background: 'radial-gradient(circle, rgba(234, 186, 56, 0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="floating-orb floating-orb-2"
          style={{
            bottom: '-20%',
            right: '10%',
            width: 440,
            height: 440,
            background: 'radial-gradient(circle, rgba(5, 66, 74, 0.45) 0%, transparent 70%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${customerImages.hero.main})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.1,
          }}
        />
        <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', zIndex: 2 }}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(234, 186, 56, 0.12)',
              border: '1px solid rgba(234, 186, 56, 0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '8px 22px',
              borderRadius: 99,
              color: '#fef08a',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 20,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            <Sparkles size={15} style={{ color: '#eaba38' }} />
            <span>Our Heritage &amp; Commitment to Luxury Beauty</span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="display-font"
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              marginBottom: 20,
              lineHeight: 1.15,
            }}
          >
            Crafting Timeless <span className="gold-text-shimmer">Elegance</span> in Katargam, Surat
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.22rem)',
              color: 'rgba(255, 255, 255, 0.88)',
              maxWidth: 720,
              margin: '0 auto 16px',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Welcome to Shree Beauty Studio — where artistic passion meets certified mastery. For over a decade, we have been Surat&apos;s premier sanctuary for bespoke bridal makeovers, rejuvenating clinical skincare, and precision haircare.
          </motion.p>
        </div>
      </section>

      {/* ─── STATS STRIP ────────────────────────────────────────── */}
      <section
        style={{
          background: '#ffffff',
          borderBottom: '1px solid rgba(234, 186, 56, 0.2)',
          padding: '44px 20px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 28,
            textAlign: 'center',
          }}
        >
          {milestones.map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                background: 'linear-gradient(180deg, #fafaf9 0%, #ffffff 100%)',
                border: '1px solid rgba(234, 186, 56, 0.15)',
              }}
            >
              <div
                className="gold-text-shimmer"
                style={{
                  fontSize: 'clamp(2.2rem, 3.8vw, 2.8rem)',
                  fontWeight: 800,
                  marginBottom: 6,
                  letterSpacing: '-0.02em',
                }}
              >
                {stat.number}
              </div>
              <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── STORY & PHILOSOPHY ─────────────────────────────────── */}
      <section style={{ maxWidth: 1120, margin: '80px auto 0', padding: '0 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 52,
            alignItems: 'center',
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#b45309',
                background: 'rgba(234, 186, 56, 0.15)',
                padding: '5px 14px',
                borderRadius: 99,
                marginBottom: 14,
              }}
            >
              Our Story &amp; Philosophy
            </span>
            <h2
              className="display-font"
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                fontWeight: 700,
                color: '#05424A',
                marginBottom: 20,
                lineHeight: 1.2,
              }}
            >
              A Decade Built on <span className="gold-text-shimmer">Trust, Artistry</span> &amp; Perfection
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.8, fontSize: 15, marginBottom: 16 }}>
              Founded with the vision to bring international-standard salon treatments and couture bridal makeovers to women in Surat, <strong>Shree Beauty Studio</strong> has grown into one of Katargam&apos;s most cherished beauty parlours.
            </p>
            <p style={{ color: '#475569', lineHeight: 1.8, fontSize: 15, marginBottom: 16 }}>
              We believe genuine beauty care is deeply personal. Whether you are a bride preparing for the biggest day of your life, a professional seeking transformative hair restoration like Botox or Keratin, or a client enjoying a tranquil afternoon facial, our master beauticians ensure every minute in our studio leaves you feeling cherished, rejuvenated, and confident.
            </p>
            <p style={{ color: '#475569', lineHeight: 1.8, fontSize: 15, marginBottom: 28 }}>
              Located right opposite the Cancer Hospital in Radhika Society, our welcoming, hygiene-first boutique parlour offers a discreet, peaceful atmosphere dedicated exclusively to women.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link
                href="/bridal"
                className="btn-glow"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)',
                  color: '#ffffff',
                  padding: '14px 26px',
                  borderRadius: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 14,
                  boxShadow: '0 8px 20px rgba(5,66,74,0.3)',
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
                  border: '1.5px solid rgba(5,66,74,0.2)',
                  color: '#05424A',
                  padding: '14px 24px',
                  borderRadius: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <span>Explore Salon Services</span>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'relative',
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow: '0 24px 50px rgba(5,66,74,0.18)',
              border: '2px solid rgba(234, 186, 56, 0.25)',
            }}
          >
            <img
              src={customerImages.bridal}
              alt="Shree Beauty Studio Katargam Surat Bridal Makeup"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 480,
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.5s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(3,43,48,0.95) 0%, rgba(3,43,48,0.7) 60%, transparent 100%)',
                padding: '36px 28px 24px',
                color: '#ffffff',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, color: '#fef08a' }}>
                ✨ 100% Client Satisfaction
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                Tailored bridal looks designed to withstand emotional moments, photo flashes, and Surat weather.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── WHY CHOOSE US / 4 PILLARS ─────────────────────────── */}
      <section style={{ maxWidth: 1120, margin: '100px auto 0', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#b45309',
              background: 'rgba(234, 186, 56, 0.15)',
              padding: '5px 14px',
              borderRadius: 99,
              marginBottom: 14,
            }}
          >
            Our Core Standards
          </span>
          <h2
            className="display-font"
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              fontWeight: 700,
              color: '#05424A',
              marginBottom: 14,
            }}
          >
            Why Women in Surat Choose <span className="gold-text-shimmer">Shree Beauty Studio</span>
          </h2>
          <p style={{ color: '#64748b', maxWidth: 620, margin: '0 auto', fontSize: 15, lineHeight: 1.6 }}>
            Our values define every service we render, from quick brow shaping to grand bridal couture.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 28,
          }}
        >
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -8, boxShadow: '0 20px 35px rgba(5,66,74,0.12)' }}
                style={{
                  background: '#ffffff',
                  borderRadius: 22,
                  border: '1px solid rgba(234, 186, 56, 0.18)',
                  padding: '32px 26px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(5, 66, 74, 0.1) 0%, rgba(234, 186, 56, 0.2) 100%)',
                    color: '#05424A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Icon size={26} style={{ color: '#05424A' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                  {item.title}
                </h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── LOCATION & CONTACT BLOCK ───────────────────────────── */}
      <section style={{ maxWidth: 1120, margin: '100px auto 0', padding: '0 20px' }}>
        <div
          style={{
            position: 'relative',
            background: 'radial-gradient(ellipse at top left, #064d57 0%, #03252a 60%, #011619 100%)',
            borderRadius: 28,
            overflow: 'hidden',
            color: '#ffffff',
            boxShadow: '0 24px 60px rgba(5,66,74,0.3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            border: '1px solid rgba(234, 186, 56, 0.25)',
          }}
        >
          <div style={{ padding: '48px 36px', zIndex: 2 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#fef08a',
                background: 'rgba(234, 186, 56, 0.15)',
                padding: '4px 14px',
                borderRadius: 99,
                marginBottom: 16,
              }}
            >
              Visit Our Boutique Salon
            </span>
            <h2
              className="display-font"
              style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 700, marginTop: 4, marginBottom: 18 }}
            >
              Experience the <span className="gold-text-shimmer">Shree Difference</span> Today
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14.5, lineHeight: 1.65, marginBottom: 28 }}>
              Drop by our boutique salon in Katargam, Surat or book an appointment online to reserve your stylist with zero waiting time.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: '#eaba38', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.92)' }}>
                  22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Clock size={18} style={{ color: '#eaba38', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.92)' }}>
                  Mon – Sun: 10:00 AM – 7:00 PM
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Phone size={18} style={{ color: '#eaba38', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.92)' }}>
                  +91 97732 40010
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link
                href="/book"
                className="btn-gold"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #eaba38 0%, #f59e0b 100%)',
                  color: '#053320',
                  padding: '14px 26px',
                  borderRadius: 14,
                  fontWeight: 800,
                  textDecoration: 'none',
                  fontSize: 14,
                  boxShadow: '0 8px 24px rgba(234, 186, 56, 0.4)',
                }}
              >
                <Calendar size={16} />
                <span>Book Appointment Online</span>
              </Link>
              <a
                href="https://wa.me/919773240010?text=Hi%20Shree%20Beauty%20Studio!%20I%20would%20like%20to%20know%20more%20about%20your%20studio."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#25D366',
                  color: '#ffffff',
                  padding: '14px 22px',
                  borderRadius: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 14,
                  boxShadow: '0 8px 20px rgba(37, 211, 102, 0.3)',
                }}
              >
                <MessageCircle size={16} />
                <span>WhatsApp Us</span>
              </a>
            </div>
          </div>

          <div style={{ minHeight: 340, background: '#e2e8f0' }}>
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
