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
  TrendingUp,
  Tag,
  ChevronDown,
  ChevronUp,
  Flame,
  Star,
  Check
} from 'lucide-react';
import { Service, SalonSettings } from '@/types/salon';
import { SERVICES_SEO_DATA } from '@/lib/services-seo-data';
import { openWAApp, openWAWeb } from '@/lib/whatsapp';

interface HeaderServiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  settings?: SalonSettings;
}

const CATEGORY_CHIPS = [
  { id: 'all', label: '🌟 All Services' },
  { id: 'Bridal & Makeup', label: '👑 Bridal & Makeup' },
  { id: 'Skin Care & Facials', label: '💧 Skin & Facials' },
  { id: 'Hair Care & Styling', label: '💇 Hair & Botox' },
  { id: 'Hands, Feet & Nails', label: '💅 Hands & Nails' },
  { id: 'Body Spa & Bleach', label: '🌸 Body Spa & Polish' },
  { id: 'Waxing & Threading', label: '🌿 Waxing & Thread' },
];

const TRENDING_QUICK_SEARCHES = [
  'Hydra Facial',
  'Bridal Makeup',
  'Hair Botox',
  'Nanoplastia',
  'Body Spa',
  'Underarms Wax',
  'Keratin',
  'D-Tan Glow',
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
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
      setSelectedCategory('all');
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

      // 2. Query Filter
      if (!q) return true;

      const nameMatch = svc.name.toLowerCase().includes(q);
      const catMatch = (svc.category || '').toLowerCase().includes(q);
      const descMatch = (svc.description || '').toLowerCase().includes(q);

      // Smart synonyms
      let synonymMatch = false;
      if (q === 'facial' || q === 'glow' || q === 'face') {
        synonymMatch = svc.name.toLowerCase().includes('facial') || svc.name.toLowerCase().includes('d-tan') || svc.name.toLowerCase().includes('bleach');
      } else if (q === 'hair' || q === 'botox' || q === 'nanoplastia') {
        synonymMatch = (svc.category || '').toLowerCase().includes('hair') || svc.name.toLowerCase().includes('botox') || svc.name.toLowerCase().includes('keratin') || svc.name.toLowerCase().includes('nanoplastia') || svc.name.toLowerCase().includes('spa');
      } else if (q === 'wedding' || q === 'dulhan' || q === 'bride' || q === 'bridal') {
        synonymMatch = (svc.category || '').toLowerCase().includes('bridal') || svc.name.toLowerCase().includes('bridal') || svc.name.toLowerCase().includes('sagai') || svc.name.toLowerCase().includes('makeup');
      }

      return nameMatch || catMatch || descMatch || synonymMatch;
    });
  }, [services, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleWhatsAppInquire = (service: Service) => {
    const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
    const text = `Namaste Shree Beauty Studio, I am interested in *${service.name}* (Price: ₹${service.price}, Duration: ${service.duration} mins). Please share booking availability!`;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleBookService = (service: Service) => {
    onClose();
    router.push(`/book?serviceId=${encodeURIComponent(service.id)}&serviceName=${encodeURIComponent(service.name)}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'rgba(2, 26, 29, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
          maxWidth: 780,
          background: 'linear-gradient(180deg, #032b30 0%, #021a1d 100%)',
          borderRadius: 24,
          border: '1.5px solid rgba(234, 186, 56, 0.4)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(234, 186, 56, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginTop: '4vh',
          color: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(234, 186, 56, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Top Title & Close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#032B30',
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  Search Services &amp; Treatments
                </h3>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>
                  Browse prices, durations, and details for ladies salon &amp; bridal packages
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Input Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#EABA38',
              }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by treatment (e.g. Hydra Facial, Nanoplastia, Bridal Makeup, Waxing)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 40px 13px 44px',
                borderRadius: 14,
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1.5px solid rgba(234, 186, 56, 0.45)',
                color: '#ffffff',
                fontSize: 14,
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {CATEGORY_CHIPS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 99,
                    fontSize: 11.5,
                    fontWeight: isSelected ? 800 : 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: isSelected ? '1.5px solid #EABA38' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isSelected ? 'linear-gradient(135deg, #EABA38 0%, #ca8a04 100%)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#031b1e' : 'rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body: Results or Trending Suggestions */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Quick Trending Searches Pills (when query is empty) */}
          {!searchQuery && selectedCategory === 'all' && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#EABA38', marginBottom: 8 }}>
                <Flame size={14} color="#f97316" />
                <span>Popular &amp; Trending Treatments in Katargam, Surat:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TRENDING_QUICK_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setSearchQuery(term)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: 'rgba(234, 186, 56, 0.1)',
                      border: '1px solid rgba(234, 186, 56, 0.25)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✨ {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Count Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)' }}>
            <span>Showing <strong>{filteredServices.length}</strong> available treatments</span>
            {searchQuery && (
              <span>Filtered by: &ldquo;<strong style={{ color: '#EABA38' }}>{searchQuery}</strong>&rdquo;</span>
            )}
          </div>

          {/* Empty State */}
          {filteredServices.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 16,
                border: '1px dashed rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(234, 186, 56, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#EABA38' }}>
                <Search size={22} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>No matching treatments found</h4>
              <p style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 14px' }}>
                Try searching for &quot;Facial&quot;, &quot;Bridal&quot;, &quot;Hair Botox&quot;, or &quot;Waxing&quot;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'rgba(234, 186, 56, 0.2)',
                  border: '1px solid #EABA38',
                  color: '#EABA38',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                View All Services
              </button>
            </div>
          ) : (
            /* Service List Cards */
            filteredServices.map((svc) => {
              const isExpanded = expandedServiceId === svc.id;
              const formattedPrice = svc.pricingType === 'starting' ? `Starting at ₹${svc.price}` : `₹${svc.price}`;

              return (
                <div
                  key={svc.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: isExpanded ? '1.5px solid #EABA38' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 16,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    transition: 'all 0.2s ease',
                    boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
                  }}
                >
                  {/* Top Row: Title, Category & Price */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                          {svc.name}
                        </h4>
                        {svc.category && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: 'rgba(234, 186, 56, 0.15)',
                              color: '#EABA38',
                              border: '1px solid rgba(234, 186, 56, 0.3)',
                            }}
                          >
                            {svc.category}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color="#EABA38" />
                          <span>{svc.duration} mins</span>
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} color="#4ade80" />
                          <span>100% Genuine Luxury Brands</span>
                        </span>
                      </div>
                    </div>

                    {/* Price Badge */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#EABA38', letterSpacing: '-0.01em' }}>
                        {formattedPrice}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' }}>
                        {svc.pricingType === 'hair_length' ? 'By Hair Length' : svc.pricingType === 'skin_type' ? 'By Skin Type' : 'Inclusive of Taxes'}
                      </div>
                    </div>
                  </div>

                  {/* Description / Highlights */}
                  {svc.description && (
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.8)' }}>
                      {svc.description}
                    </p>
                  )}

                  {/* Expanded Treatment Details */}
                  {isExpanded && (
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        border: '1px solid rgba(234, 186, 56, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#EABA38', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Info size={14} />
                        <span>Service &amp; Consultation Details:</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
                        <li>Performed by certified female specialists in Katargam, Surat.</li>
                        <li>High-frequency sanitization &amp; disposable hygiene kits used.</li>
                        <li>Personalized skin &amp; hair strand patch consultation included.</li>
                        <li>Instant booking confirmation via SMS &amp; WhatsApp.</li>
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setExpandedServiceId(isExpanded ? null : svc.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: 0,
                      }}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={13} color="#EABA38" /> Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown size={13} color="#EABA38" /> View Details &amp; Benefits
                        </>
                      )}
                    </button>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* WhatsApp Inquiry Button */}
                      <button
                        type="button"
                        onClick={() => handleWhatsAppInquire(svc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#34d399',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Phone size={12} />
                        <span>WhatsApp</span>
                      </button>

                      {/* Direct Book Now Button */}
                      <button
                        type="button"
                        onClick={() => handleBookService(svc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                          border: 'none',
                          color: '#031b1e',
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(234, 186, 56, 0.3)',
                        }}
                      >
                        <Calendar size={13} />
                        <span>Book Online</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(0, 0, 0, 0.35)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.6)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍 Katargam, Surat · 100% Ladies Only Salon</span>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <Link
              href="/services"
              onClick={onClose}
              style={{ color: '#EABA38', textDecoration: 'none', fontWeight: 700 }}
            >
              Browse Full Rate Card →
            </Link>
            <Link
              href="/bridal"
              onClick={onClose}
              style={{ color: '#EABA38', textDecoration: 'none', fontWeight: 700 }}
            >
              Bridal Studio →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
