'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  Clock,
  CheckCircle2,
  Calendar,
  MessageCircle,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  MapPin,
  Star,
  Award,
} from 'lucide-react';
import { money } from '@/lib/utils';
import { ALL_LOCATION_SLUGS, LOCATIONS_DATA } from '@/lib/locations-data';

interface PriceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  basis: string;
  description: string;
  popular?: boolean;
}

const PRICE_LIST_ITEMS: PriceItem[] = [
  // Bridal & Makeup
  {
    id: 'bridal-hd',
    name: 'HD Bridal Makeover (Signature 3-Session)',
    category: 'Bridal & Occasion',
    price: 15000,
    duration: 180,
    basis: 'Complete Package',
    description: '16-hour sweat-proof HD makeup with MAC, Huda Beauty & Dior. Includes jewelry setting, eyelash enhancement, and authentic Panetar/Gharchola saree draping.',
    popular: true,
  },
  {
    id: 'bridal-airbrush',
    name: 'Airbrush 4K Couture Bridal Makeover',
    category: 'Bridal & Occasion',
    price: 25000,
    duration: 180,
    basis: 'Complete Package',
    description: 'Silicon-based ultra HD micro-droplet airbrush application. Transfer-proof and humidity-resistant with Charlotte Tilbury, Dior & NARS.',
    popular: true,
  },
  {
    id: 'sider-makeup',
    name: 'Sider, Reception & Sangeet Glam Makeup',
    category: 'Bridal & Occasion',
    price: 3500,
    duration: 60,
    basis: 'Per Person',
    description: 'Red-carpet party makeup for bridesmaids, sisters, and wedding guests. Includes luxury hairstyling and dupatta pinning.',
  },
  {
    id: 'engagement-makeup',
    name: 'Sagai & Engagement Ceremony Makeup',
    category: 'Bridal & Occasion',
    price: 6500,
    duration: 90,
    basis: 'Per Session',
    description: 'Radiant modern glam for ring ceremonies. Soft glam eye makeup, glass skin finish, and sophisticated open hair styling.',
  },
  {
    id: 'haldi-mehendi-makeup',
    name: 'Haldi & Mehendi Ceremony Look',
    category: 'Bridal & Occasion',
    price: 2500,
    duration: 60,
    basis: 'Per Session',
    description: 'Turmeric-stain resistant lightweight glowing finish, fresh floral jewelry adjustment, and playful festive hair styling.',
  },

  // Hair Reconstruction
  {
    id: 'hair-botox',
    name: 'Hair Botox Deep Fiber Reconstruction',
    category: 'Hair Treatments',
    price: 3500,
    duration: 120,
    basis: 'Starts From (Length & Density)',
    description: 'Formaldehyde-free collagen & keratin bond infuser that repairs split ends and damage from Surat borewell hard water.',
    popular: true,
  },
  {
    id: 'nanoplastia',
    name: 'Nanoplastia Organic Glass-Hair Smoothing',
    category: 'Hair Treatments',
    price: 5000,
    duration: 240,
    basis: 'Starts From (Length & Density)',
    description: '100% organic amino-acid nanotechnology that straightens curls while providing mirror-like gloss for 5 to 6 months.',
    popular: true,
  },
  {
    id: 'keratin-treatment',
    name: 'Global Keratin Anti-Frizz Therapy',
    category: 'Hair Treatments',
    price: 4500,
    duration: 120,
    basis: 'Starts From (Length & Density)',
    description: 'Intense anti-frizz smoothing treatment that seals strands against coastal humidity and thermal heat styling.',
  },
  {
    id: 'cysteine-treatment',
    name: 'Cysteine Protein Smoothing',
    category: 'Hair Treatments',
    price: 4500,
    duration: 150,
    basis: 'Starts From (Length & Density)',
    description: 'Gentle, zero-harsh-chemical protein treatment ideal for pregnant or sensitive clients seeking soft, manageable waves.',
  },
  {
    id: 'mythic-oil-spa',
    name: 'L’Oréal Professionnel Mythic Oil Spa',
    category: 'Hair Treatments',
    price: 1200,
    duration: 45,
    basis: 'Per Session',
    description: 'Nourishing botanical oil infusion with steam therapy and 20-minute relaxing scalp acupressure massage.',
  },
  {
    id: 'japanese-head-spa',
    name: 'Japanese Waterfall Head Spa & Scalp Detox',
    category: 'Hair Treatments',
    price: 2000,
    duration: 90,
    basis: 'Per Session',
    description: 'Micro-circulatory waterfall ring scalp cleanse, ultrasonic scaling, and deep trichological mask therapy.',
  },

  // Medi-Facials & Skin
  {
    id: 'hydra-facial',
    name: 'Hydra Glow 7-Step Vortex Medical Facial',
    category: 'Facials & Skincare',
    price: 2500,
    duration: 60,
    basis: 'Per Session',
    description: 'Vortex vacuum extraction, dead cell peeling, hyaluronic acid dermal infusion, ultrasound tightening, and photodynamic LED.',
    popular: true,
  },
  {
    id: 'o3-bridal-facial',
    name: 'O3+ Bridal Oxygen Radiance Medi-Facial',
    category: 'Facials & Skincare',
    price: 2000,
    duration: 60,
    basis: 'Per Session',
    description: 'Dermatologically formulated oxygenating facial that combats hyperpigmentation, uneven skin tone, and stubborn bridal tanning.',
  },
  {
    id: 'gold-diamond-facial',
    name: '24K Gold Foil & Diamond Rejuvenation Facial',
    category: 'Facials & Skincare',
    price: 1500,
    duration: 60,
    basis: 'Per Session',
    description: 'Pure 24k micronized gold flakes combined with herbal extracts to boost collagen elasticity for pre-event radiance.',
  },
  {
    id: 'fruit-detox-cleanup',
    name: 'Organic Fruit & Aloe Vera Express Cleanup',
    category: 'Facials & Skincare',
    price: 700,
    duration: 30,
    basis: 'Per Session',
    description: 'Quick 30-minute refreshing blackhead removal, organic scrubbing, and soothing herbal calming mask.',
  },
  {
    id: 'melasma-peel',
    name: 'Botanical D-Tan & Melasma Lightening Treatment',
    category: 'Facials & Skincare',
    price: 1200,
    duration: 45,
    basis: 'Per Session',
    description: 'Safe lactic and glycolic resurfacing peel targeted at neck darkness, sun tan, and post-breakout marks.',
  },

  // Waxing & Threading
  {
    id: 'rica-full-body',
    name: 'Italian Rica Liposoluble Full Body Waxing',
    category: 'Waxing & Threading',
    price: 1500,
    duration: 45,
    basis: 'Complete Package',
    description: 'Original Italian colophony-free liposoluble wax. 80% less painful than regular honey wax with zero skin peeling.',
    popular: true,
  },
  {
    id: 'rica-arms-legs',
    name: 'Rica Liposoluble Arms & Full Legs Wax',
    category: 'Waxing & Threading',
    price: 650,
    duration: 30,
    basis: 'Fixed Rate',
    description: 'Painless hair removal that removes ingrown hair roots and leaves skin silky smooth for up to 4 weeks.',
  },
  {
    id: 'eyebrow-upperlip',
    name: 'Eyebrow Shaping & Upper Lip Threading',
    category: 'Waxing & Threading',
    price: 50,
    duration: 10,
    basis: 'Fixed Rate',
    description: 'Antibacterial cotton thread precision shaping designed to harmonize with your facial bone architecture.',
  },
  {
    id: 'full-face-threading',
    name: 'Full Face Threading & Soothing Aloe Massage',
    category: 'Waxing & Threading',
    price: 350,
    duration: 30,
    basis: 'Fixed Rate',
    description: 'Gentle facial peach fuzz removal followed by cooling aloe vera mist and ice compression.',
  },

  // Hands, Feet & Body
  {
    id: 'gel-nail-extensions',
    name: 'Gel Nail Extensions with Custom Bridal Art',
    category: 'Hands & Feet',
    price: 1800,
    duration: 90,
    basis: 'Full Set',
    description: 'Chip-resistant sculpted gel extensions with ombré, French tips, chrome powder, and 3D crystal embellishments.',
  },
  {
    id: 'medical-pedicure',
    name: 'Medical Callus-Peel Pedicure & Foot Spa',
    category: 'Hands & Feet',
    price: 700,
    duration: 45,
    basis: 'Per Session',
    description: 'Intense cracked heel restoration, dead skin shaving, sugar exfoliation, and relaxing pressure-point foot massage.',
  },
  {
    id: 'full-body-polishing',
    name: 'Full Body Botanical Scrub & Steam Polishing',
    category: 'Hands & Feet',
    price: 2500,
    duration: 75,
    basis: 'Complete Session',
    description: 'Walnut and almond micro-scrub exfoliation, steam detox pod, and hydrating body butter massage for brides.',
  },
];

const CATEGORIES = [
  'All Services',
  'Bridal & Occasion',
  'Hair Treatments',
  'Facials & Skincare',
  'Waxing & Threading',
  'Hands & Feet',
];

export default function PriceListClient() {
  const [activeCategory, setActiveCategory] = useState('All Services');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return PRICE_LIST_ITEMS.filter((item) => {
      const matchesCategory =
        activeCategory === 'All Services' || item.category === activeCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#031d21] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-16 border-b border-emerald-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Official 2026 Transparent Rate Chart · Surat, Gujarat
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight mb-5">
            Surat’s Most Transparent{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-amber-200 to-emerald-400">
              Salon & Bridal Price List
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-gray-300 leading-relaxed mb-8">
            Zero hidden taxes. Zero unexpected add-on charges. At Shree Beauty Studio in Katargam, 
            every price is verified, 100% transparent, and backed by genuine sealed luxury cosmetics 
            and over 25 years of master craftsmanship.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto mb-8 text-left">
            <div className="bg-[#052c32]/80 border border-emerald-800/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" /> 100% Fixed Rates
              </div>
              <p className="text-xs text-gray-300">No surprise charges at billing counter</p>
            </div>
            <div className="bg-[#052c32]/80 border border-emerald-800/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold mb-1">
                <Star className="w-4 h-4 fill-amber-300" /> 4.9★ Rating
              </div>
              <p className="text-xs text-gray-300">210+ verified Google client reviews</p>
            </div>
            <div className="bg-[#052c32]/80 border border-emerald-800/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                <Award className="w-4 h-4" /> Genuine Luxury
              </div>
              <p className="text-xs text-gray-300">Dior, MAC, Huda Beauty & L’Oréal</p>
            </div>
            <div className="bg-[#052c32]/80 border border-emerald-800/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" /> Ladies Only
              </div>
              <p className="text-xs text-gray-300">Complete privacy in Radhika Society</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search services (e.g. Bridal, Hair Botox, Hydra Facial, Waxing)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-[#052c32] border border-emerald-700/50 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="sticky top-16 z-20 bg-[#031d21]/95 backdrop-blur-md border-b border-emerald-900/40 py-3">
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto scrollbar-none flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                  : 'bg-[#052c32] text-gray-300 hover:text-white hover:bg-emerald-900/30 border border-emerald-800/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Price Catalog Cards */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
              {activeCategory === 'All Services' ? 'All Salon Services' : activeCategory}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Showing {filteredItems.length} verified salon rates
            </p>
          </div>
          <Link
            href="/book"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
          >
            <Calendar className="w-4 h-4" /> Book Appointment
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`relative bg-[#052c32]/70 border rounded-2xl p-5 sm:p-6 transition hover:border-emerald-500/60 hover:shadow-xl ${
                item.popular
                  ? 'border-emerald-500/50 bg-gradient-to-b from-[#052c32] to-[#04363e]'
                  : 'border-emerald-900/40'
              }`}
            >
              {item.popular && (
                <span className="absolute -top-3 right-6 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow">
                  Most Popular in Surat
                </span>
              )}

              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="inline-block text-[11px] font-medium text-emerald-400 uppercase tracking-wider mb-1">
                    {item.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                    {item.name}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-emerald-300">
                    {money(item.price)}
                  </div>
                  <span className="text-[10px] text-gray-400 block">{item.basis}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
                {item.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-emerald-900/40 text-xs">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Approx. {item.duration} mins
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/919824183769?text=Hello%20Shree%20Beauty%20Studio,%20I%20am%20inquiring%20about%20${encodeURIComponent(
                      item.name
                    )}%20(${encodeURIComponent(money(item.price))}).`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 transition"
                    title="Inquire on WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <Link
                    href={`/book?service=${encodeURIComponent(item.name)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Book Now <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 bg-[#052c32]/40 rounded-2xl border border-emerald-900/40">
            <p className="text-gray-300 text-base mb-3">No services found matching "{searchQuery}"</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All Services');
              }}
              className="text-xs text-emerald-400 underline font-medium"
            >
              Reset filters to see all services
            </button>
          </div>
        )}
      </main>

      {/* Surat Neighborhood Coverage */}
      <section className="bg-[#02171a] border-t border-emerald-900/40 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
              Serving Women Across Surat & Neighborhoods
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Visit our flagship sanctuary in Katargam or explore dedicated neighborhood details:
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5">
            {ALL_LOCATION_SLUGS.map((slug) => {
              const loc = LOCATIONS_DATA[slug];
              if (!loc) return null;
              return (
                <Link
                  key={slug}
                  href={`/locations/${slug}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#052c32] hover:bg-emerald-800/40 border border-emerald-800/40 text-xs text-gray-200 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {loc.cityName}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Transparent Pricing FAQs */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white text-center mb-8">
          Frequently Asked Questions About Salon Rates
        </h2>

        <div className="space-y-4">
          <div className="bg-[#052c32]/60 border border-emerald-900/40 rounded-xl p-5">
            <h3 className="font-semibold text-white text-base mb-2">
              Are these prices fixed or do they change at the salon?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Services like threading, waxing, cleanups, and facials have 100% fixed rates as published. 
              For intensive hair transformations (Botox, Nanoplastia, Keratin), rates start as indicated 
              and depend on hair length and volume. Our specialists inspect your hair and confirm the exact 
              final price before applying any treatment so there are zero surprises.
            </p>
          </div>

          <div className="bg-[#052c32]/60 border border-emerald-900/40 rounded-xl p-5">
            <h3 className="font-semibold text-white text-base mb-2">
              Do you offer pre-bridal discount packages?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Yes! We offer 1-month, 2-month, and 3-month comprehensive pre-bridal packages combining 
              multiple sessions of Hydra facials, full-body polishing, Rica waxing, and hair spas with up 
              to 25% bundled savings. Inquire via WhatsApp at +91 98241 83769 for custom bridal schedules.
            </p>
          </div>

          <div className="bg-[#052c32]/60 border border-emerald-900/40 rounded-xl p-5">
            <h3 className="font-semibold text-white text-base mb-2">
              Are international cosmetic brands genuine and sealed?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Yes, 100%. We strictly use authentic sealed products from MAC, Huda Beauty, Dior, 
              Charlotte Tilbury, L’Oréal Professionnel, and Italian Rica. Every product bottle and 
              disposable hygiene kit is opened directly in front of the client.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center bg-gradient-to-r from-emerald-900/40 via-teal-900/40 to-emerald-900/40 border border-emerald-600/40 rounded-2xl p-8">
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mb-2">
            Ready to Experience Luxury Salon Care?
          </h3>
          <p className="text-sm text-gray-300 max-w-lg mx-auto mb-6">
            Book your appointment online in 30 seconds or chat with our senior stylists directly on WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/book"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Book Online Now
            </Link>
            <a
              href="https://wa.me/919824183769?text=Hello%20Shree%20Beauty%20Studio,%20I%20would%20like%20to%20book%20an%20appointment."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm transition shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
