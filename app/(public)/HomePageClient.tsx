'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, MapPin, Phone, Star, ChevronRight, Award,
  ShieldCheck, Heart, Sparkles, MessageCircle, Gem, ArrowRight
} from 'lucide-react';
import { customerImages, getServiceImage, getCategoryIcon } from '@/lib/customer-images';
import { useSalonStore, DEFAULT_BRIDAL_PACKAGES } from '@/lib/store';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// Real Google Reviews from Shree Beauty Studio
const GOOGLE_REVIEWS = [
  {
    text: "I had a wonderful experience at this shree parlour. The staff was welcoming, the parlour was clean and well-maintained, and my stylist took the time to understand exactly what I wanted. The makeup and hairstyling turned out even better than I expected. Excellent customer service and attention to detail. I'll definitely be coming back!",
    name: "Dhruti Nakrani",
    role: "Bridal Services · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIMVcUut1-F4xtAwopH1z6FUHCDR1KHF4eYtMQkvZ6ymmprPQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Had a really nice experience here! I got my makeup done for a special occasion, and I absolutely loved how it turned out. The artist understood exactly the kind of look I wanted and made me feel comfortable throughout the session. The makeup looked beautiful, stayed on for the entire event, and I got so many compliments. Definitely recommend!",
    name: "Patel Radhi",
    role: "Special Occasion Makeup",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJvQ1NIm-6hijsJYXNN3VE6ULW8nvLkkt3dJbUll2iVmFS9Zg=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "The bridal makeup was excellent! They highlighted my features perfectly and made me look so beautiful on my special day.",
    name: "Hemansi Vaghasiya",
    role: "Bride · Bridal Services",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJ4y2i3cnBzLWfvSaJqI_mW6De-EdU8rRyubcBLH0g5wkVnZg=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "I visited Shree Beauty Studio and had a fantastic experience. The staff were incredibly friendly and professional. I loved the branded products they used. My stylist was amazing at consulting and gave me the best service ever. The salon was clean, relaxing, and felt very hygienic. Highly recommend!",
    name: "Yugma Mangukiya",
    role: "Bridal Services · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjWUbrafNXdLtla2jm3KFn21cxGSBhC1RefqOUCLcX3yvXN-KwEn=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Thank you so much for making me look and feel beautiful on my special day. I absolutely loved my bridal makeup and hairstyle. Your entire team is so precious, kind, and professional. I truly appreciate your attention to detail, patience, and dedication. I would happily recommend you to anyone looking for a talented bridal makeup artist!",
    name: "Ekta Koladiya",
    role: "Bride · Bridal Services",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLcauLyD318u17rbgN2MkzikbTdao19SE1ORqTiQ5KBiKKjmw=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Even though I moved to USA recently I still get my haircut here during my yearly visit to India. They are wonderful at this. The makeup looks very natural and not like a painted face. They are THE BEST!!!! Highly recommend. Once you experience them you will not go anywhere else!!",
    name: "Harsha Kothiya",
    role: "Long-time Client · USA",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjVwCA4so6iQ5bQZtnuByyzgALvK9ZSPtexfeplBU9GmGQ-e_Kbvxg=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Shree beauty studio have very friendly atmosphere. The senior stylists and staff are so comfortable and polite for all customers and the important thing, they use all original product which is important for us. The feeling in this studio is like home saloon.",
    name: "Parul Savani",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLIJbMxQ_-zezajrclqidPSKTigQELlG6e6zoBHyy6YGF45ZQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Best place for makeup and beauty services in Surat. 5/5",
    name: "Dipak Chavada",
    role: "Local Guide · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjXGxEGnPftOQxiRER49daXV2E6pmj932NYKJJsOw65BacoDBVV9Qw=s120-c-rp-mo-ba12-br100",
    rating: 5,
  },
  {
    text: "Very good and professional service. The senior stylist was very friendly and did a great job. She gave me an amazing haircut and hair colour streaks. I'll definitely visit again.",
    name: "Dharvi Dobariya",
    role: "Hair Colour & Cut · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjUzResOCcsqSoz_9nJlPwJo0xLc8XqaBBvD-50U6i-5XiGeahRbyQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "You made me feel like the most beautiful version of myself on my special day. Absolutely magical! My bridal look was everything I dreamed of and more. Professional, kind, and incredibly talented—highly recommend to any bride-to-be!",
    name: "Mansi Boda",
    role: "Bride · Bridal Makeup",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIyuorrSEom969RIcSM25TEQJb-LvQUZJ5xg_roVilggzrBuQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Had a wonderful experience! The staff was friendly and made me feel comfortable. I'm very happy with the results.",
    name: "Jalpa Chetan",
    role: "Shampoo & Conditioning",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKFQoosQv3m8kbKzR06M_FOiW9T8MSNJXQQFkM_H26d081eCQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Loved the service! The staff was very polite and professional. Highly recommend this salon.",
    name: "Varsha Bhalani",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocI6cBMqgLwqUGWAa4hNa-MLh_FVKiTe8e2fDtb1PdbYdGUzmg=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Excellent service, friendly staff, and a very clean and relaxing atmosphere. I'm extremely happy with the results.",
    name: "Prushti Bhalani",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLXP5G2hRrcgPF3Lt54fU-9cOX3z6X7_pWtzKIjVBMGdSS8NQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Amazing service and results. Years of experience truly show in their work. Super clean, friendly staff and perfect results every single time. The stylists' nature is very good — extremely sweet, polite and caring.",
    name: "Krupali Pavasia",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIVao1NL3VuOgOx-xQlY1md8ANeCvJSmZGMpCZDrSnewy2FjQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "I truly appreciate the care, dedication, and professionalism of this studio. My wife always feels comfortable and valued whenever she visits. The owner and staff are kind, talented, and pay attention to every small detail. Seeing her return home happy and confident after every appointment means a lot to me. Highly recommended!",
    name: "Raahulkumar Savani",
    role: "Local Guide · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjUlFzbfpCxffgpjwGL3QEwBhVZr_ZGwDB5q4TW3YhVPx2JzCo8Oeg=s120-c-rp-mo-ba12-br100",
    rating: 5,
  },
  {
    text: "Got a fantastic matte finish here! The service was professional and quick. A perfect look for my event. Highly satisfied!",
    name: "Fusion Tech HD",
    role: "Special Event Makeup",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjX5nM1sYM1sNEWKiR3eSyhOgZqasYbJ4kfmZO9ofmQlzFqOGS4=s120-c-rp-mo-ba12-br100",
    rating: 5,
  },
  {
    text: "The makeup is fabulous & flawless. Such an amazing experience, must visit.",
    name: "Niral Gabani",
    role: "Makeup · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIJOE4TlfWWF--c9uclLYW3Dt-U0NtORrVUuohOjaGpmtej-FM=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Fabulous service, great results, very friendly staff, will definitely be coming again.",
    name: "Shraddha Bhikadiya",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLz74xeHef_agT472bWmvBHu7cnP4GFpQTzBwIFZwtDLaEJhA=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Excellent Beauty Saloon. Very Professional staff keeping personal touch with individual customer requirements. Wide range of services available. Particularly Bridal makeup and Hair treatments — 5 stars ✨ Highly recommended to try at least once.",
    name: "Kuldip Bhalani",
    role: "Local Guide · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjU8s_NjY9X-0PfN-WmPlJMBtflAL8-f2ysrdHYrFz2dQnu6hMBY=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "This place is very good and service are very good and staff is also very friendly and knowledgeable and they are very kind.",
    name: "Geeta Patel",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJ5CSlmoCskerSlsgLMNxLun50RhXAeUPdxDbY9uBi55NNiFQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Nice place for getting ready for special occasions. I had a superb experience. Such nice makeup, hairstyle and the behavior of staff is very fine. Highly satisfied!",
    name: "Dimpal Nakrani",
    role: "Special Occasion · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKjc6fqnhM2MxZiFgAQNavuXjkezc_tjWS5xPocAMlQIIj6rw=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Hairstyle is too good.",
    name: "Nidhi Gadhiya",
    role: "Haircut & Makeup · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJEY6ahsOEBv_FXZyK7xXvf7LhPtAD7R1xI10g4z44taiXDceLx=s120-c-rp-mo-br100",
    rating: 4,
  },
  {
    text: "Amazing beauty parlour with skilled staff and great customer service. Highly recommended!",
    name: "Vraj",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjXaeK8vhZJOteLQa_HwQB21cCnn4cFA_jvWxoaGUCJ9qWkRrYhu=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "This beauty parlor is very nice. Their service is good and they use all the products very well according to the skin. I love this beauty parlor.",
    name: "Honey Patel",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLlEQbTsNuY4WPYsWP4-XHLXsU6QvqKkDSReZEJ87mam6yP2hDA=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "it's amazing experience ❤️",
    name: "Rutika Gadhiya",
    role: "Haircut · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIr8kwzadm60Nt7O-malP2XPJNVmnAGK3HaXQZ5BaRSd7eBug=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Excellent skill, very hardworking lady. I'm always thankful.",
    name: "Sandhya Pala",
    role: "Bridal Services · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjWNgS0TH7tgtxairwT41PPr_CIIOPvDmb7Nz0vY1JgZx3lfVhV-HQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "amazing experience. must try.",
    name: "Gabani Drashti",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJI2UlPrOWMMpckdK36h-bv4QKRY6AHeQAb2BwyajXdebH-_Q=s120-c-rp-mo-br100",
    rating: 5,
  },
];

export default function PublicHomePage() {
  const { data } = useSalonStore();
  const settings = data?.settings;
  const services = data?.services || [];
  const bridalPackages = data?.bridalPackages || DEFAULT_BRIDAL_PACKAGES;

  const salonName = settings?.salon || 'Shree Beauty Studio';
  const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const whatsapp = settings?.whatsapp || '919824183769';
  const openTime = settings?.open || '10:00';
  const closeTime = settings?.close || '19:00';

  // Group services by category
  const categories = Array.from(new Set(services.map((s) => s.category || 'Special Treatments'))).slice(0, 6);

  return (
    <div>
      {/* ─── HERO SECTION ────────────────────────────────────────── */}
      <section
        className="cust-hero"
        style={{
          backgroundImage: `url(${customerImages.hero.main})`,
        }}
      >
        <div className="cust-hero-overlay" />
        <div className="cust-hero-content">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(234, 186, 56, 0.2)', border: '1px solid rgba(234, 186, 56, 0.4)', padding: '6px 16px', borderRadius: 99, color: '#fef08a', fontSize: 13, fontWeight: 700, marginBottom: 12 }}
          >
            <Sparkles size={14} />
            <span>Katargam, Surat · Luxury Salon &amp; Bridal Studio</span>
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp}>
            Where Elegance Meets Excellence
            <span style={{ display: 'block', fontSize: 'clamp(1rem, 2.2vw, 1.35rem)', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginTop: 8, letterSpacing: '0.01em', textTransform: 'none' }}>
              Premier Beauty Salon &amp; Bridal Makeup Studio in Katargam, Surat
            </span>
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp}>
            Indulge in couture bridal makeovers, rejuvenating skin treatments, and signature hair styling
            crafted with 100% authentic luxury brands by master beauticians.
          </motion.p>

          <motion.div className="cust-hero-actions" initial="hidden" animate="visible" variants={fadeUp}>
            <Link href="/book" className="cust-btn-primary">
              <Calendar size={16} />
              <span>Book Appointment Online</span>
            </Link>
            <Link href="/services" className="cust-btn-secondary">
              <span>Explore Services &amp; Prices</span>
              <ArrowRight size={16} />
            </Link>
            <a
              href={`https://wa.me/${whatsapp}?text=Hi%20Shree%20Beauty%20Studio!%20I%20would%20like%20to%20book%20an%20appointment.`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#25D366',
                color: '#053320',
                fontWeight: 700,
                fontSize: 14.5,
                padding: '13px 22px',
                borderRadius: 99,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(37, 211, 102, 0.35)',
              }}
            >
              <MessageCircle size={16} />
              <span>WhatsApp Booking</span>
            </a>
          </motion.div>

          {/* Social Proof Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{
              marginTop: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              flexWrap: 'wrap',
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', color: '#EABA38' }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="#EABA38" />
                ))}
              </div>
              <span style={{ fontWeight: 700 }}>4.9/5 Rating</span>
              <span style={{ opacity: 0.7 }}>(850+ Google Reviews)</span>
            </div>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={15} color="#EABA38" />
              <span>10+ Years Experience</span>
            </div>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} color="#EABA38" />
              <span>100% Genuine Luxury Products</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS & TRUST STRIP ─────────────────────────────────── */}
      <div style={{ background: '#021e22', color: '#ffffff', borderBottom: '1px solid rgba(234, 186, 56, 0.2)' }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '24px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#EABA38' }}>5,000+</div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>Happy Brides &amp; Clients</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#EABA38' }}>10+</div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>Years of Aesthetic Mastery</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#EABA38' }}>50+</div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>Signature Salon Treatments</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#EABA38' }}>100%</div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>Hygienic &amp; Sterilized Equipment</div>
          </div>
        </div>
      </div>

      {/* ─── FEATURED SERVICES BENTO GRID ───────────────────────── */}
      <section className="cust-section">
        <div className="cust-section-header">
          <span className="cust-section-badge">Signature Menu</span>
          <h2>Luxury Beauty &amp; Wellness Services</h2>
          <p>
            From advanced skin rejuvenation to couture hair aesthetics, every treatment is tailored to
            your individual beauty goals.
          </p>
        </div>

        <motion.div
          className="cust-bento-grid"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {categories.map((cat) => {
            const catServices = services.filter((s) => (s.category || 'Special Treatments') === cat);
            const sample = catServices[0];
            const icon = getCategoryIcon(cat);
            const img = getServiceImage(sample?.name || cat, cat);

            return (
              <motion.div key={cat} className="cust-bento-card" variants={fadeUp}>
                <div style={{ position: 'relative' }}>
                  <img src={img} alt={cat} className="cust-bento-img" loading="lazy" />
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      background: 'rgba(3, 43, 48, 0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 99,
                      border: '1px solid rgba(234, 186, 56, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>{icon}</span>
                    <span>{cat}</span>
                  </div>
                </div>

                <div className="cust-bento-body">
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                    {cat}
                  </h3>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5, flex: 1 }}>
                    {sample?.description || `Professional ${cat.toLowerCase()} personalized for your skin & hair type.`}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                        Starts from
                      </span>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#05424A' }}>
                        ₹{sample?.price ? sample.price.toLocaleString('en-IN') : '299'}
                      </span>
                    </div>

                    <Link
                      href={`/book?service=${encodeURIComponent(sample?.name || cat)}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#05424A',
                        color: '#ffffff',
                        fontSize: 12.5,
                        fontWeight: 700,
                        padding: '7px 14px',
                        borderRadius: 99,
                        textDecoration: 'none',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span>Book</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <Link href="/services" className="cust-btn-primary">
            <span>View Complete Price &amp; Service List</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ─── BRIDAL SHOWCASE ────────────────────────────────────── */}
      <section className="cust-section-dark">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="cust-section-header">
            <span className="cust-section-badge cust-section-badge-light">Bridal Sanctuary</span>
            <h2 className="light">Couture Bridal &amp; Siders Makeovers</h2>
            <p className="light">
              Your wedding day deserves nothing less than perfection. Choose from our curated bridal and
              siders packages with international luxury cosmetics.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {bridalPackages.slice(0, 4).map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(234, 186, 56, 0.3)',
                  borderRadius: 20,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#EABA38',
                      background: 'rgba(234, 186, 56, 0.15)',
                      padding: '3px 10px',
                      borderRadius: 99,
                    }}
                  >
                    {pkg.type}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    {pkg.sessions} {pkg.sessions === 1 ? 'Session' : 'Sessions'}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                  {pkg.name}
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, flex: 1 }}>
                  {pkg.includes}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#EABA38' }}>
                    ₹{pkg.price.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>/ package</span>
                </div>

                <Link
                  href={`/book?bridal=${encodeURIComponent(pkg.name)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, #EABA38 0%, #D49B1F 100%)',
                    color: '#032B30',
                    fontWeight: 700,
                    fontSize: 13.5,
                    padding: '10px 18px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  <Heart size={14} />
                  <span>Book This Package</span>
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link
              href="/bridal"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 14,
                padding: '12px 24px',
                borderRadius: 99,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <span>View All 13 Bridal &amp; Siders Packages</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── WHY CHOOSE US ───────────────────────────────────────── */}
      <section className="cust-section">
        <div className="cust-section-header">
          <span className="cust-section-badge">The Shree Difference</span>
          <h2>Why Surat Chooses Shree Beauty Studio</h2>
          <p>Uncompromising standards of quality, certified hygiene, and customized beauty therapies.</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 24,
          }}
        >
          <div
            style={{
              padding: 28,
              borderRadius: 20,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
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
              <Award size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Certified Master Artists
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>
              Our team of beauticians and hair specialists undergo continuous masterclass training in modern bridal techniques.
            </p>
          </div>

          <div
            style={{
              padding: 28,
              borderRadius: 20,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(234,186,56,0.15)',
                color: '#c49821',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Gem size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              100% Genuine Luxury Brands
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>
              We exclusively use authentic international formulations from Jeannot Professional, L'Oréal, Huda Beauty, MAC, and Charlotte Tilbury.
            </p>
          </div>

          <div
            style={{
              padding: 28,
              borderRadius: 20,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(22,163,74,0.08)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Rigorous Medical-Grade Hygiene
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>
              Disinfected instruments, disposable towels, sanitized stations, and pristine salon private rooms.
            </p>
          </div>

          <div
            style={{
              padding: 28,
              borderRadius: 20,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(219,39,119,0.08)',
                color: '#db2777',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Heart size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Personalized Consultations
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>
              Every bridal and hair session begins with an in-depth skin and hair analysis to select the exact shade and care regimen.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CLIENT TESTIMONIALS ─────────────────────────────────── */}
      <section className="cust-section-alt" style={{ overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="cust-section-header">
            <span className="cust-section-badge">Google Reviews</span>
            <h2>Loved by Hundreds of Surat Brides</h2>
            <p>Real reviews from our clients on Google. 4.9★ average from 150+ happy customers at Shree Beauty Studio.</p>
          </div>
        </div>

        {/* Auto-rotating infinite carousel — Row 1 (left to right) */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            marginBottom: 20,
          }}
          className="reviews-carousel-track-outer"
        >
          <div className="reviews-marquee reviews-marquee-fwd">
            {[...GOOGLE_REVIEWS, ...GOOGLE_REVIEWS].map((t, idx) => (
              <div key={idx} className="reviews-card">
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={13} fill="#EABA38" color="#EABA38" />
                    ))}
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>Google</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.65, fontStyle: 'italic' }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <img
                    src={t.avatar}
                    alt={t.name}
                    width={38}
                    height={38}
                    style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 (right to left) — offset reviews for visual variety */}
        <div
          style={{ position: 'relative', overflow: 'hidden' }}
          className="reviews-carousel-track-outer"
        >
          <div className="reviews-marquee reviews-marquee-rev">
            {[...GOOGLE_REVIEWS.slice(Math.floor(GOOGLE_REVIEWS.length / 2)), ...GOOGLE_REVIEWS, ...GOOGLE_REVIEWS.slice(0, Math.floor(GOOGLE_REVIEWS.length / 2))].map((t, idx) => (
              <div key={idx} className="reviews-card">
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={13} fill="#EABA38" color="#EABA38" />
                    ))}
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>Google</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.65, fontStyle: 'italic' }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <img
                    src={t.avatar}
                    alt={t.name}
                    width={38}
                    height={38}
                    style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Google rating summary badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <a
            href="https://www.google.com/maps/place/Shree+Beauty+Studio/@21.2156,72.8258,17z"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 99,
              padding: '10px 20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              textDecoration: 'none',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_28dp.png" alt="Google" width={20} height={20} />
            <span>4.9★ on Google Maps · 150+ Reviews</span>
            <ChevronRight size={14} color="#94a3b8" />
          </a>
        </div>
      </section>

      {/* ─── LOCATION & STUDIO VISIT ─────────────────────────────── */}
      <section className="cust-section">
        <div className="cust-section-header">
          <span className="cust-section-badge">Studio Location</span>
          <h2>Visit Our Katargam Sanctuary</h2>
          <p>Conveniently located opposite Cancer Hospital in Katargam, Surat with dedicated customer parking.</p>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          }}
        >
          {/* Info Side */}
          <div style={{ padding: 'clamp(28px, 5vw, 48px)', display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(5,66,74,0.08)',
                  color: '#05424A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Studio Address
                </strong>
                <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                  {address}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(234,186,56,0.15)',
                  color: '#c49821',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Operating Hours
                </strong>
                <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>
                  {openTime} – {closeTime} · Open All 7 Days
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(37,211,102,0.12)',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Phone size={20} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Direct Inquiries &amp; WhatsApp
                </strong>
                <p style={{ margin: 0, fontSize: 14 }}>
                  <a href="tel:+919824183769" style={{ color: '#05424A', fontWeight: 700, textDecoration: 'none' }}>
                    +91 98241 83769
                  </a>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 8 }}>
              <Link href="/book" className="cust-btn-primary">
                <Calendar size={16} />
                <span>Book Your Slot</span>
              </Link>
              <a
                href="https://maps.google.com/?q=Radhika+Society+Katargam+Surat"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f1f5f9',
                  color: '#0f172a',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '12px 20px',
                  borderRadius: 99,
                  textDecoration: 'none',
                }}
              >
                <span>Get Directions</span>
                <ChevronRight size={15} />
              </a>
            </div>
          </div>

          {/* Interactive Google Map Embed */}
          <div style={{ minHeight: 340, background: '#e2e8f0', position: 'relative' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3719.9946!2d72.8258!3d21.2156!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04f0c3c55a6f3%3A0x6f9da3b1a41fbe06!2sKatargam%2C%20Surat%2C%20Gujarat!5e0!3m2!1sen!2sin!4v1680000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 340, width: '100%', display: 'block' }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Shree Beauty Studio Katargam Surat Location"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
