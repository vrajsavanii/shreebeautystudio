'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Calendar,
  Sparkles,
  Clock,
  Phone,
  ArrowRight,
  CheckCircle2,
  Info,
  Flame,
  Star,
  Tag,
  ChevronDown,
  ChevronUp,
  MapPin,
  Percent
} from 'lucide-react';
import { Service, SalonSettings } from '@/types/salon';
import { openWAApp, openWAWeb } from '@/lib/whatsapp';

interface HeaderServiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  settings?: SalonSettings;
}

const CATEGORY_TABS = [
  { id: 'all', label: '🌟 All Services', icon: '🌟' },
  { id: 'Bridal & Makeup', label: 'Bridal & Makeup', icon: '👑' },
  { id: 'Skin Care & Facials', label: 'Skin & Facials', icon: '💧' },
  { id: 'Hair Care & Styling', label: 'Hair & Botox', icon: '💇' },
  { id: 'Hands, Feet & Nails', label: 'Hands & Nails', icon: '💅' },
  { id: 'Body Spa & Bleach', label: 'Body Spa & Polish', icon: '🌸' },
  { id: 'Waxing & Threading', label: 'Waxing & Thread', icon: '🌿' },
];

const TRENDING_TAGS = [
  'Bridal Makeup',
  'Hydra Facial',
  'Hair Botox',
  'Nanoplastia',
  'Rica Waxing',
  'D-Tan Glow',
  'Body Spa',
  'Gel Nails',
];

const PRICE_FILTERS = [
  { id: 'all', label: 'All Prices' },
  { id: 'budget', label: 'Under ₹500' },
  { id: 'mid', label: '₹500 - ₹2,000' },
  { id: 'premium', label: 'Luxury (₹2,000+)' },
];

export default function HeaderServiceSearchModal({
  isOpen,
  onClose,
  services = [],
  settings,
}: HeaderServiceSearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState('all');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
      setSelectedCategory('all');
      setSelectedPriceFilter('all');
      setExpandedServiceId(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return services.filter((svc) => {
      // 1. Category Filter
      if (selectedCategory !== 'all') {
        const svcCat = (svc.category || '').toLowerCase();
        const selCat = selectedCategory.toLowerCase();
        if (!svcCat.includes(selCat) && !selCat.includes(svcCat)) {
          return false;
        }
      }

      // 2. Price Filter
      if (selectedPriceFilter === 'budget' && svc.price >= 500) return false;
      if (selectedPriceFilter === 'mid' && (svc.price < 500 || svc.price > 2000)) return false;
      if (selectedPriceFilter === 'premium' && svc.price <= 2000) return false;

      // 3. Query Filter
      if (!q) return true;

      const nameMatch = svc.name.toLowerCase().includes(q);
      const catMatch = (svc.category || '').toLowerCase().includes(q);
      const descMatch = (svc.description || '').toLowerCase().includes(q);

      // Smart synonyms mapping
      let synMatch = false;
      if (q.includes('makeup') || q.includes('make up') || q.includes('bridal') || q.includes('dulhan')) {
        synMatch = (svc.category || '').toLowerCase().includes('bridal') || svc.name.toLowerCase().includes('makeup');
      } else if (q.includes('hair') || q.includes('botox') || q.includes('keratin') || q.includes('nanoplastia') || q.includes('smooth')) {
        synMatch = (svc.category || '').toLowerCase().includes('hair') || svc.name.toLowerCase().includes('botox') || svc.name.toLowerCase().includes('keratin');
      } else if (q.includes('skin') || q.includes('facial') || q.includes('glow') || q.includes('d-tan') || q.includes('cleanup')) {
        synMatch = (svc.category || '').toLowerCase().includes('skin') || svc.name.toLowerCase().includes('facial') || svc.name.toLowerCase().includes('d-tan');
      } else if (q.includes('wax') || q.includes('waxing') || q.includes('threading') || q.includes('eyebrow')) {
        synMatch = (svc.category || '').toLowerCase().includes('wax') || svc.name.toLowerCase().includes('wax');
      }

      return nameMatch || catMatch || descMatch || synMatch;
    });
  }, [services, searchQuery, selectedCategory, selectedPriceFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: services.length };
    services.forEach((s) => {
      const cat = s.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [services]);

  // Quick WhatsApp Booking Handler
  const handleWhatsAppInquire = (svc: Service) => {
    const waPhone = settings?.whatsapp || '919824183769';
    const text = `Hello Shree Beauty Studio! 👋 I would like to inquire about *${svc.name}* (Price: ₹${svc.price}, Duration: ${svc.duration} mins). Please share available slots.`;
    const encoded = encodeURIComponent(text);
    const webUrl = `https://web.whatsapp.com/send?phone=${waPhone}&text=${encoded}`;
    const appUrl = `whatsapp://send?phone=${waPhone}&text=${encoded}`;
    const fallbackUrl = `https://wa.me/${waPhone}?text=${encoded}`;

    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      openWAApp(appUrl, fallbackUrl);
    } else {
      openWAWeb(webUrl, fallbackUrl);
    }
    onClose();
  };

  // Direct Book Service
  const handleBookService = (svc: Service) => {
    onClose();
    router.push(`/book?service=${encodeURIComponent(svc.id)}`);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(2, 20, 22, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: 'fadeIn 0.2s ease-out',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Search Modal Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 920,
          background: 'linear-gradient(180deg, #04363d 0%, #021e21 100%)',
          borderRadius: 24,
          border: '1.5px solid rgba(234, 186, 56, 0.45)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75), 0 0 40px rgba(5, 66, 74, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginTop: '2vh',
          marginBottom: '2vh',
          color: '#ffffff',
          animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Search Bar Area */}
        <div
          style={{
            padding: '20px 24px 16px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid rgba(234, 186, 56, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Header Title Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#032B30',
                  boxShadow: '0 2px 10px rgba(234, 186, 56, 0.3)',
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Quick Treatment &amp; Service Finder</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(234, 186, 56, 0.2)', color: '#EABA38', border: '1px solid rgba(234, 186, 56, 0.4)' }}>
                    Instant Search
                  </span>
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Browse prices, durations &amp; packages with 1-click booking at Shree Beauty Studio Katargam
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              }}
              aria-label="Close search modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Input Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={20}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#EABA38',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search treatments (e.g. Bridal Makeup, Hydra Facial, Hair Botox, Nanoplastia, Waxing)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 44px 14px 48px',
                borderRadius: 16,
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1.5px solid rgba(234, 186, 56, 0.55)',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 500,
                outline: 'none',
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 16px rgba(234, 186, 56, 0.15)',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#EABA38')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(234, 186, 56, 0.55)')}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              >
                <X size={13} />
              </button>
            ) : (
              <span
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.45)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                ESC to close
              </span>
            )}
          </div>

          {/* Quick Category Tabs Bar */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {CATEGORY_TABS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'all' ? services.length : categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: isSelected ? 800 : 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: isSelected ? '1.5px solid #EABA38' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isSelected ? 'linear-gradient(135deg, #EABA38 0%, #ca8a04 100%)' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#031b1e' : 'rgba(255, 255, 255, 0.85)',
                    boxShadow: isSelected ? '0 2px 10px rgba(234, 186, 56, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 99,
                        background: isSelected ? 'rgba(3, 27, 30, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                        color: isSelected ? '#031b1e' : '#EABA38',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Price Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>
              <Tag size={12} color="#EABA38" />
              <span>Filter by Budget:</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {PRICE_FILTERS.map((pf) => {
                  const isSel = selectedPriceFilter === pf.id;
                  return (
                    <button
                      key={pf.id}
                      type="button"
                      onClick={() => setSelectedPriceFilter(pf.id)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: 6,
                        fontSize: 10.5,
                        fontWeight: isSel ? 800 : 500,
                        background: isSel ? 'rgba(234, 186, 56, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: isSel ? '1px solid #EABA38' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isSel ? '#EABA38' : 'rgba(255, 255, 255, 0.75)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {pf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)' }}>
              <span>Found <strong style={{ color: '#EABA38' }}>{filteredServices.length}</strong> treatments</span>
            </div>
          </div>
        </div>

        {/* Modal Body: Results Grid */}
        <div
          style={{
            maxHeight: '58vh',
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Trending Suggestions When Search is Blank */}
          {!searchQuery && selectedCategory === 'all' && selectedPriceFilter === 'all' && (
            <div
              style={{
                background: 'rgba(234, 186, 56, 0.08)',
                border: '1px solid rgba(234, 186, 56, 0.25)',
                borderRadius: 16,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#EABA38' }}>
                <Flame size={15} color="#f97316" />
                <span>Trending &amp; Most Booked Treatments in Surat:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(tag)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(234, 186, 56, 0.3)',
                      color: '#ffffff',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(234, 186, 56, 0.25)';
                      e.currentTarget.style.borderColor = '#EABA38';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.35)';
                      e.currentTarget.style.borderColor = 'rgba(234, 186, 56, 0.3)';
                    }}
                  >
                    <span>✨</span>
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredServices.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 20,
                border: '1px dashed rgba(255, 255, 255, 0.2)',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'rgba(234, 186, 56, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: '#EABA38',
                }}
              >
                <Search size={26} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
                No treatments found matching &quot;{searchQuery}&quot;
              </h4>
              <p style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.65)', margin: '0 0 16px', maxWidth: 420, marginInline: 'auto' }}>
                Try searching for broader terms like &quot;Bridal&quot;, &quot;Facial&quot;, &quot;Hair&quot;, &quot;Waxing&quot;, or browse all services below.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedPriceFilter('all');
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                  border: 'none',
                  color: '#031b1e',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(234, 186, 56, 0.3)',
                }}
              >
                Reset &amp; View All Services
              </button>
            </div>
          ) : (
            /* 2-Column Responsive Service Cards Grid */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: 14,
              }}
            >
              {filteredServices.map((svc) => {
                const isExpanded = expandedServiceId === svc.id;
                const formattedPrice = svc.pricingType === 'starting' ? `Starting at ₹${svc.price}` : `₹${svc.price}`;

                return (
                  <div
                    key={svc.id}
                    style={{
                      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      border: isExpanded ? '1.5px solid #EABA38' : '1px solid rgba(234, 186, 56, 0.2)',
                      borderRadius: 18,
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                      transition: 'all 0.2s ease',
                      boxShadow: isExpanded
                        ? '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(234, 186, 56, 0.2)'
                        : '0 4px 14px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    {/* Top Row: Service Title & Price Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: 'rgba(234, 186, 56, 0.18)',
                              color: '#EABA38',
                              border: '1px solid rgba(234, 186, 56, 0.35)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {svc.category || 'Special'}
                          </span>
                        </div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: 15.5,
                            fontWeight: 800,
                            color: '#ffffff',
                            lineHeight: 1.35,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {svc.name}
                        </h4>
                      </div>

                      {/* Golden Price Badge */}
                      <div
                        style={{
                          textAlign: 'right',
                          background: 'rgba(0, 0, 0, 0.35)',
                          padding: '6px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(234, 186, 56, 0.3)',
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ fontSize: 17, fontWeight: 900, color: '#EABA38', letterSpacing: '-0.02em' }}>
                          {formattedPrice}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'rgba(255, 255, 255, 0.55)', fontWeight: 600 }}>
                          {svc.pricingType === 'hair_length'
                            ? 'By Length'
                            : svc.pricingType === 'skin_type'
                            ? 'By Skin'
                            : 'All Taxes Incl.'}
                        </div>
                      </div>
                    </div>

                    {/* Meta Row: Duration & Verified Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: 'rgba(255, 255, 255, 0.75)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <Clock size={13} color="#EABA38" />
                        <span>{svc.duration} mins</span>
                      </span>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <CheckCircle2 size={13} color="#4ade80" />
                        <span>Female Specialist</span>
                      </span>
                    </div>

                    {/* Description Snippet */}
                    {svc.description && (
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.8)' }}>
                        {svc.description}
                      </p>
                    )}

                    {/* Accordion Details */}
                    {isExpanded && (
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          borderRadius: 12,
                          padding: '12px 14px',
                          border: '1px solid rgba(234, 186, 56, 0.25)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#EABA38', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Info size={13} />
                          <span>Treatment Inclusions &amp; Guarantee:</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.55 }}>
                          <li>100% Genuine luxury beauty products &amp; disposable hygiene kits.</li>
                          <li>Personalized consultation before treatment in private ladies cabin.</li>
                          <li>Instant booking confirmation with WhatsApp appointment pass.</li>
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedServiceId(isExpanded ? null : svc.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.65)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '4px 0',
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={13} color="#EABA38" /> Less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={13} color="#EABA38" /> Details
                          </>
                        )}
                      </button>

                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* WhatsApp Inquire */}
                        <button
                          type="button"
                          onClick={() => handleWhatsAppInquire(svc)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '7px 12px',
                            borderRadius: 10,
                            background: 'rgba(16, 185, 129, 0.18)',
                            border: '1px solid rgba(16, 185, 129, 0.45)',
                            color: '#34d399',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)')}
                        >
                          <Phone size={12} />
                          <span>WhatsApp</span>
                        </button>

                        {/* Direct Book */}
                        <button
                          type="button"
                          onClick={() => handleBookService(svc)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                            border: 'none',
                            color: '#031b1e',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(234, 186, 56, 0.35)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                        >
                          <Calendar size={13} />
                          <span>Book Now</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div
          style={{
            padding: '14px 24px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11.5,
            color: 'rgba(255, 255, 255, 0.7)',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} color="#EABA38" />
            <span>Katargam, Surat · 25+ Years Excellence · 100% Ladies Only</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link
              href="/services"
              onClick={onClose}
              style={{ color: '#EABA38', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Full Rate Card</span>
              <span>→</span>
            </Link>
            <Link
              href="/bridal"
              onClick={onClose}
              style={{ color: '#EABA38', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Bridal Studio</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
