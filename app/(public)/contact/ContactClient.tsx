'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  Mail,
  Instagram,
  Calendar,
  Send,
  Sparkles,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import StudioMap3D from '@/components/customer/StudioMap3D';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function ContactClient() {
  const { data } = useSalonStore();
  const settings = data?.settings;

  const salonName = settings?.salon || 'Shree Beauty Studio';
  const address =
    settings?.address ||
    '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const whatsapp = settings?.whatsapp || '919824183769';
  const phone2 = settings?.phone2 || '9824183769';
  const openTime = settings?.open || '10:00';
  const closeTime = settings?.close || '19:00';
  const openDays = settings?.openDays || 'Open All 7 Days';
  const instagramHandle = settings?.instagramHandle || '@shreebeauty.studio';
  const instagramUrl =
    settings?.instagramUrl ||
    `https://www.instagram.com/${instagramHandle.replace('@', '')}/`;
  const googleMapsUrl =
    settings?.googleMapsUrl ||
    'https://www.google.com/maps/place/Shree+beauty+studio/@21.2369639,72.8160001,283m/data=!3m1!1e3!4m8!3m7!1s0x3be04f0b9062c70f:0xa017a32a652d8ad2!8m2!3d21.2369033!4d72.8158985!9m1!1b1!16s%2Fg%2F11kqdqq61p?entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D';
  const email = 'shreebeauty.studio22@gmail.com';

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [service, setService] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Hi Shree !\nWhatsApp Message\n\n*Name:* ${name}\n*Mobile:* ${mobile}\n*Service Interested:* ${service || 'General Inquiry'}\n*Message:* ${message}`;
    const url = `https://wa.me/919824183769?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setSent(true);
  };

  return (
    <div style={{ backgroundColor: '#FAF9F6', color: '#0F172A', minHeight: '100vh' }}>
      {/* ─── 1. HERO SECTION ────────────────────────────────────────── */}
      <section
        style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(5,66,74,0.95) 0%, rgba(3,43,48,0.98) 70%, rgba(2,30,34,1) 100%)',
          color: '#ffffff',
          padding: '80px 24px 60px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div
              variants={fadeUp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(234, 186, 56, 0.15)',
                border: '1px solid rgba(234, 186, 56, 0.35)',
                padding: '6px 16px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 700,
                color: '#EABA38',
                marginBottom: 20,
              }}
            >
              <Sparkles size={14} color="#EABA38" />
              <span>Katargam, Surat · 100% Ladies Only Sanctuary</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: '0 0 16px',
                color: '#ffffff',
                lineHeight: 1.2,
              }}
            >
              Contact Us &amp; Studio Visit
            </motion.h1>

            <motion.p
              variants={fadeUp}
              style={{
                fontSize: 16,
                color: '#cbd5e1',
                maxWidth: 620,
                margin: '0 auto 28px',
                lineHeight: 1.7,
              }}
            >
              We'd love to hear from you. Reach out for appointments, bespoke bridal consultations, or GPS studio directions.
            </motion.p>

            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/919824183769?text=Hi%20Shree%20!%0AWhatsApp%20Message"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #25D366 0%, #1fbe5a 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '12px 24px',
                  borderRadius: 99,
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(37,211,102,0.35)',
                }}
              >
                <MessageCircle size={17} />
                <span>WhatsApp: +91 98241 83769</span>
              </a>
              <a
                href="tel:+919824183769"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 14,
                  padding: '12px 22px',
                  borderRadius: 99,
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <Phone size={16} />
                <span>Call Studio</span>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── 2. CONTACT CARDS GRID ───────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '-30px auto 60px', padding: '0 20px', position: 'relative', zIndex: 3 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          {/* Card 1: Studio Location */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 26,
              boxShadow: '0 10px 30px rgba(5,66,74,0.06)',
              border: '1px solid rgba(5,66,74,0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(5,66,74,0.08)',
                  color: '#05424A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <MapPin size={24} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#05424A', margin: '0 0 8px' }}>
                Studio Address
              </h3>
              <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>
                {address}
              </p>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#05424A',
                textDecoration: 'none',
              }}
            >
              <span>Get GPS Directions</span>
              <Navigation size={13} />
            </a>
          </div>

          {/* Card 2: Operating Hours */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 26,
              boxShadow: '0 10px 30px rgba(5,66,74,0.06)',
              border: '1px solid rgba(5,66,74,0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(234,186,56,0.12)',
                  color: '#D49B1F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Clock size={24} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#05424A', margin: '0 0 8px' }}>
                Operating Hours
              </h3>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                {openTime} – {closeTime}
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
                {openDays} · Ladies Only
              </p>
            </div>
            <Link
              href="/book"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#D49B1F',
                textDecoration: 'none',
              }}
            >
              <span>Book An Appointment</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Card 3: Direct Phone & WhatsApp */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 26,
              boxShadow: '0 10px 30px rgba(5,66,74,0.06)',
              border: '1px solid rgba(5,66,74,0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(37,211,102,0.12)',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Phone size={24} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#05424A', margin: '0 0 8px' }}>
                Phone &amp; WhatsApp
              </h3>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                +91 98241 83769
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
                Instant booking &amp; inquiries
              </p>
            </div>
            <a
              href="https://wa.me/919824183769?text=Hi%20Shree%20!%0AWhatsApp%20Message"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#16a34a',
                textDecoration: 'none',
              }}
            >
              <span>Chat on WhatsApp</span>
              <ArrowRight size={13} />
            </a>
          </div>

          {/* Card 4: Email & Social */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 26,
              boxShadow: '0 10px 30px rgba(5,66,74,0.06)',
              border: '1px solid rgba(5,66,74,0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(220,39,67,0.1)',
                  color: '#dc2743',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Instagram size={24} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#05424A', margin: '0 0 8px' }}>
                Instagram &amp; Email
              </h3>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                {instagramHandle}
              </p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px', wordBreak: 'break-all' }}>
                {email}
              </p>
            </div>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#dc2743',
                textDecoration: 'none',
              }}
            >
              <span>Follow on Instagram</span>
              <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* ─── 3. INTERACTIVE 3D MAP & INQUIRY FORM ─────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 32,
            alignItems: 'stretch',
          }}
        >
          {/* Left: 3D Map */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(5,66,74,0.06)',
              border: '1px solid rgba(5,66,74,0.08)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 460,
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#05424A', fontWeight: 700, fontSize: 16 }}>
                <MapPin size={18} />
                <span>Katargam Studio Location Map</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Opposite Cancer Hospital, Katargam, Surat
              </p>
            </div>
            <div style={{ flex: 1, minHeight: 380 }}>
              <StudioMap3D height="100%" showCardOverlay={false} />
            </div>
          </div>

          {/* Right: Quick Inquiry Form */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: 32,
              boxShadow: '0 10px 30px rgba(5,66,74,0.06)',
              border: '1px solid rgba(5,66,74,0.08)',
            }}
          >
            <div style={{ marginBottom: 22 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#D49B1F',
                }}
              >
                Direct Inquiry
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#05424A', margin: '4px 0 8px' }}>
                Send Us a Message
              </h2>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
                Fill in your details and send your inquiry directly to our studio team on WhatsApp.
              </p>
            </div>

            {sent ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 16,
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  textAlign: 'center',
                }}
              >
                <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#166534', margin: '0 0 6px' }}>
                  Inquiry Dispatched!
                </h3>
                <p style={{ fontSize: 13.5, color: '#15803d', margin: '0 0 16px' }}>
                  Your message has been opened in WhatsApp. Our team will respond shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '8px 18px',
                    borderRadius: 99,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Patel"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="9824183769"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Service Interested
                    </label>
                    <input
                      type="text"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      placeholder="e.g. Bridal / Hair Spa"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Your Message
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you'd like to inquire about..."
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #05424A 0%, #08606c 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '13px 24px',
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(5,66,74,0.3)',
                    marginTop: 4,
                  }}
                >
                  <Send size={15} />
                  <span>Send via WhatsApp Support</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── 4. BOTTOM ACTION BANNER ─────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #021e22 0%, #011619 100%)',
          color: '#ffffff',
          padding: '48px 24px',
          textAlign: 'center',
          borderTop: '1px solid rgba(234,186,56,0.3)',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px', color: '#EABA38' }}>
            Ready to Experience Shree Beauty Studio?
          </h2>
          <p style={{ fontSize: 14, color: '#cbd5e1', margin: '0 0 24px' }}>
            Book your appointment online in seconds or visit our studio in Katargam, Surat.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/book"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #EABA38 0%, #D49B1F 100%)',
                color: '#021e22',
                fontWeight: 800,
                fontSize: 14,
                padding: '12px 26px',
                borderRadius: 99,
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(234,186,56,0.35)',
              }}
            >
              <Calendar size={16} />
              <span>Book Appointment Online</span>
            </Link>
            <Link
              href="/services"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 14,
                padding: '12px 22px',
                borderRadius: 99,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <span>View Services &amp; Prices</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
