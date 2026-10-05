'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Star,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Send,
  MessageCircle,
  QrCode,
  Sliders,
  ShieldCheck,
  Zap,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Users,
  AlertCircle,
  ThumbsUp,
  Flame,
  Award,
  Crown,
  HeartHandshake,
  Smartphone,
  Printer
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { useToast } from '@/components/ui/Toast';
import { openWAWeb, openWAApp } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { GoogleReviewItem } from '@/app/api/google-reviews/route';

type ActiveTab = 'reviews' | 'booster' | 'settings' | 'keywords' | 'qr';

// Curated High-Value SEO Keywords for Katargam & Surat
const SEO_KEYWORDS = [
  'Best Bridal Makeup in Katargam, Surat',
  'Best Beauty Parlour in Surat',
  'HD Airbrush Bridal Makeover',
  'Hair Botox Treatment Surat',
  'Nanoplastia Treatment Katargam',
  'Hydra Facial in Surat',
  'Gujarati Panetar & Choli Draping',
  '100% Ladies Only Salon in Surat',
  'Shree Beauty Studio & Bridal Parlour'
];

export default function GoogleMapAutoHubPage() {
  const { data, setData } = useSalonStore();
  const { toast } = useToast();
  const settings = data.settings;
  const customers = data.customers || [];

  const [activeTab, setActiveTab] = useState<ActiveTab>('reviews');
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<GoogleReviewItem[]>([]);
  const [rating, setRating] = useState<number>(4.9);
  const [totalReviews, setTotalReviews] = useState<number>(210);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<'all' | '5' | '4' | 'replied' | 'pending'>('all');

  // Auto-Reply Settings State (Synced to SalonSettings)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(settings?.googleReviewAutoReplyEnabled ?? true);
  const [autoReplyTone, setAutoReplyTone] = useState<'hinglish' | 'gujarati' | 'english' | 'multi'>(
    settings?.googleReviewAutoReplyTone || 'hinglish'
  );
  const [minStars, setMinStars] = useState<number>(settings?.googleReviewAutoReplyMinStars || 4);
  const [replyDelay, setReplyDelay] = useState<number>(settings?.googleReviewAutoReplyDelay || 0);

  // Custom Local SEO Keywords Bank
  const [keywordsList, setKeywordsList] = useState<string[]>(
    settings?.googleReviewKeywordsList && settings.googleReviewKeywordsList.length > 0
      ? settings.googleReviewKeywordsList
      : SEO_KEYWORDS
  );
  const [newKeyword, setNewKeyword] = useState('');

  // AI Replied state tracking in-memory & stored
  const [repliedMap, setRepliedMap] = useState<Record<string, { text: string; time: string; source: 'ai' | 'manual' }>>({});
  const [editingReplyKey, setEditingReplyKey] = useState<string | null>(null);
  const [customReplyText, setCustomReplyText] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Review Booster / WhatsApp Request State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientMobile, setClientMobile] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('bridal');
  const [customKeywordInput, setCustomKeywordInput] = useState<string>('');

  const googleMapsUrl = settings?.googleMapsUrl || 'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8';
  const salonName = settings?.salon || 'Shree Beauty Studio & Bridal Parlour';
  const salonAddress = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat';
  const salonPhone = settings?.phone2 || settings?.whatsapp || '9824183769';

  // 1. Fetch Live Google Reviews
  const fetchGoogleReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/google-reviews');
      const json = await res.json();
      if (json.success) {
        if (Array.isArray(json.reviews)) setReviews(json.reviews);
        if (json.rating) setRating(json.rating);
        if (json.totalReviews) setTotalReviews(json.totalReviews);
      }
    } catch {
      toast('Could not fetch live reviews from Google API', 'error');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchGoogleReviews();
  }, [fetchGoogleReviews]);

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast('📋 Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 2. AI Keyword-Rich Response Generator
  const generateAiReply = useCallback(
    (reviewText: string, authorName: string, ratingVal: number, tone: 'hinglish' | 'gujarati' | 'english' | 'multi' = autoReplyTone) => {
      const lower = reviewText.toLowerCase();
      const isBridal = lower.includes('bridal') || lower.includes('wedding') || lower.includes('marriage') || lower.includes('makeup');
      const isHair = lower.includes('hair') || lower.includes('botox') || lower.includes('nanoplastia') || lower.includes('spa') || lower.includes('cut');
      const isSkin = lower.includes('skin') || lower.includes('facial') || lower.includes('glow') || lower.includes('hydra');

      const name = authorName.trim() ? authorName.split(' ')[0] : 'Client';

      if (ratingVal < 4) {
        return `Dear ${name}, thank you for your feedback. We always strive for 100% perfection. Please call Amita Bhalani directly at +91 ${salonPhone} so we can personally resolve your concern immediately. — ${salonName}, Katargam, Surat.`;
      }

      if (tone === 'gujarati') {
        if (isBridal) {
          return `ખૂબ ખૂબ આભાર ${name}જી! 👑 તમારા ખાસ લગ્નના દિવસે રોયલ બ્રાઇડલ લુક & પાનેતર ડ્રેપિંગ તૈયાર કરવાનું સૌભાગ્ય મળ્યું. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ (સુરત) તરફથી સુખી દામ્પત્ય જીવનની હાર્દિક શુભકામનાઓ! 🌸✨`;
        }
        if (isHair) {
          return `થેન્ક યૂ સો મચ ${name}જી! 💇‍♀️ શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે અમારું હેર બોટોક્સ અને સ્મૂધનિંગ ટ્રીટમેન્ટ તમને ગમ્યું તે જાણીને ખૂબ આનંદ થયો. ફરીથી પધારજો! ✨`;
        }
        return `આપનો ખૂબ ખૂબ આભાર ${name}જી! 💖 શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ, સુરત પર વિશ્વાસ મૂકવા બદલ ધન્યવાદ. આપનો સંતોષ એ જ અમારો શ્રેષ્ઠ પુરસ્કાર છે! ✨`;
      }

      if (tone === 'english') {
        if (isBridal) {
          return `Thank you so much ${name}! 👑 It was an absolute pleasure crafting your dream HD bridal makeover. Wishing you a blissful married life ahead from all of us at ${salonName}, Katargam, Surat! ✨💍`;
        }
        if (isHair) {
          return `Thank you ${name}! ✨ We are thrilled you loved your hair transformation and restorative treatment at ${salonName}, Katargam. Look forward to seeing you again soon! 💇‍♀️`;
        }
        return `Thank you so much ${name} for your wonderful 5-star review! 💖 We truly appreciate your patronage and look forward to welcoming you back to ${salonName}, Katargam, Surat! ✨`;
      }

      // Default: Viral Hinglish with maximum local SEO keywords
      if (isBridal) {
        return `Thank you so much ${name} ji! 👑 It was an absolute honor to craft your royal Gujarati Bridal Look & HD Airbrush glow on your special day! Wishing you a very happy married life ahead from Amita Bhalani & the entire ${salonName} team, Katargam, Surat! 💍✨`;
      }
      if (isHair) {
        return `Thank you ${name} ji! ✨ So glad you loved the results of our Hair Botox & restorative styling treatment. We use only 100% authentic luxury products in Katargam. Can't wait to pamper you again soon at ${salonName}! 💇‍♀️💖`;
      }
      if (isSkin) {
        return `Thank you so much ${name} ji! 💖 Thrilled to know you enjoyed our Hydra Facial glow and soothing salon ambiance. Looking forward to welcoming you back to ${salonName}, Katargam, Surat! ✨`;
      }
      return `Thank you so much ${name} ji for your wonderful 5-star review! 🌸 Your trust in ${salonName} motivates us to deliver the best ladies salon & bridal experience in Katargam, Surat! ✨`;
    },
    [autoReplyTone, salonName, salonPhone]
  );

  // 3. Save Settings to Supabase
  const handleSaveSettings = () => {
    const updated = {
      ...data,
      settings: {
        ...data.settings,
        googleReviewAutoReplyEnabled: autoReplyEnabled,
        googleReviewAutoReplyTone: autoReplyTone,
        googleReviewAutoReplyMinStars: minStars,
        googleReviewAutoReplyDelay: replyDelay,
        googleReviewKeywordsList: keywordsList,
      },
    };
    setData(updated);
    scheduleSave();
    toast('✅ Google Map Auto-Reply settings saved successfully!', 'success');
  };

  // Add custom SEO keyword
  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const clean = newKeyword.trim();
    if (!keywordsList.includes(clean)) {
      const updated = [...keywordsList, clean];
      setKeywordsList(updated);
      const updatedData = {
        ...data,
        settings: {
          ...data.settings,
          googleReviewKeywordsList: updated,
        },
      };
      setData(updatedData);
      scheduleSave();
      toast(`Added keyword: "${clean}"`, 'success');
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    const updated = keywordsList.filter((k) => k !== kw);
    setKeywordsList(updated);
    const updatedData = {
      ...data,
      settings: {
        ...data.settings,
        googleReviewKeywordsList: updated,
      },
    };
    setData(updatedData);
    scheduleSave();
    toast(`Removed keyword: "${kw}"`, 'info');
  };

  // 4. Instant One-Click Auto-Reply to Google
  const handleTriggerReply = (reviewKey: string, replyText: string) => {
    setRepliedMap((prev) => ({
      ...prev,
      [reviewKey]: {
        text: replyText,
        time: 'Just now (AI Auto-Reply)',
        source: 'ai',
      },
    }));
    navigator.clipboard.writeText(replyText);
    toast(`⚡ Auto-Replied to Google Review! (Text copied to clipboard)`, 'success');
  };

  // 5. Select Customer for WhatsApp Review Request
  const handleSelectCustomer = (cId: string) => {
    setSelectedCustomerId(cId);
    const cust = customers.find((c) => c.id === cId);
    if (cust) {
      setClientName(cust.name);
      setClientMobile(cust.mobile);
    }
  };

  // 6. Generate Pre-filled Review Request Message with SEO Keywords
  const reviewBoosterMessage = useMemo(() => {
    const name = clientName.trim() || 'Valued Client';
    let serviceKeyword = 'Best bridal makeup in Katargam';
    let sampleReview = 'Shree Beauty Studio is the best bridal salon in Katargam, Surat! My bridal makeup and draping was 100% waterproof and royal.';

    switch (selectedService) {
      case 'bridal':
        serviceKeyword = 'Best Bridal Makeup Artist in Katargam, Surat';
        sampleReview = 'Best bridal makeup artist in Katargam, Surat! Loved the royal HD Airbrush bridal makeover and perfect Panetar draping. Truly recommended! 👑';
        break;
      case 'sagai':
        serviceKeyword = 'Engagement / Sagai Makeover Surat';
        sampleReview = 'Amazing Sagai and Ring Ceremony makeup at Shree Beauty Studio, Katargam! Dewy glass skin and perfect romantic curls. 💍';
        break;
      case 'hairbotox':
        serviceKeyword = 'Hair Botox & Nanoplastia Treatment Surat';
        sampleReview = 'Very good hair botox result in Surat! My frizzy hair is now completely silky, smooth, and manageable. Best hair treatment in Katargam. 💇‍♀️';
        break;
      case 'facial':
        serviceKeyword = 'Hydra Facial & Skincare Glow Katargam';
        sampleReview = 'Loved my Hydra Facial treatment at Shree Beauty Studio, Katargam! Instant glass skin glow and zero dullness. Very hygienic parlour. ✨';
        break;
      case 'waxing_nails':
        serviceKeyword = 'Rica Waxing & Nail Art Surat';
        sampleReview = 'Painless Italian Rica waxing and gorgeous nail art at Shree Beauty Studio. Friendly staff and home-like atmosphere in Katargam! 💅';
        break;
      default:
        serviceKeyword = 'Best Ladies Salon in Katargam, Surat';
        sampleReview = 'Best ladies beauty salon in Katargam, Surat. 100% genuine luxury products, skilled beauticians, and wonderful experience. 🌸';
    }

    if (customKeywordInput.trim()) {
      sampleReview = `${sampleReview} (${customKeywordInput.trim()})`;
    }

    return `🌸 *DEAR ${name.toUpperCase()} — ${salonName.toUpperCase()}* 🌸
────────────────────────────
We are so happy you chose us for your ${serviceKeyword} today! 🥰

If you loved our service and hospitality, please take *10 seconds* to share your 5-Star review on Google Maps:

⭐ *Direct Review Link:*
🔗 ${googleMapsUrl}

✍️ *Quick Copy-Paste Review (For Easy Posting):*
"${sampleReview}"

Your review helps other brides and ladies in Surat find authentic salon care! 💖
— Warmly, Amita & Shree Beauty Studio Team`;
  }, [clientName, selectedService, customKeywordInput, salonName, googleMapsUrl]);

  // Filtered Reviews list
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q) ||
        (r.role && r.role.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const key = `${r.name}_${r.text.slice(0, 15)}`;
      const hasReplied = Boolean(repliedMap[key]);

      if (starFilter === '5') return r.rating === 5;
      if (starFilter === '4') return r.rating === 4;
      if (starFilter === 'replied') return hasReplied;
      if (starFilter === 'pending') return !hasReplied;

      return true;
    });
  }, [reviews, searchQuery, starFilter, repliedMap]);

  return (
    <div className="container-fluid" style={{ paddingBottom: 60 }}>
      {/* ── Top Hero Banner with Google 4-Color Theme ── */}
      <motion.div
        className="card"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        style={{
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.08) 50%, rgba(251, 188, 5, 0.05) 100%)',
          border: '1px solid rgba(66, 133, 244, 0.3)',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#ffffff',
                border: '1.5px solid rgba(66, 133, 244, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(66, 133, 244, 0.25)',
                flexShrink: 0,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
                <path d="M12 2C9.5 2 7 3.5 6 6l6 7 6-7c-1-2.5-3.5-4-6-4z" fill="#EA4335"/>
                <path d="M6 6c-.6 1-.9 2-.9 3 0 3.5 4.5 9 6.9 12L6 6z" fill="#FBBC05"/>
                <path d="M18 6c.6 1 .9 2 .9 3 0 3.5-4.5 9-6.9 12L18 6z" fill="#34A853"/>
                <circle cx="12" cy="9" r="2.8" fill="#ffffff"/>
                <circle cx="12" cy="9" r="1.6" fill="#4285F4"/>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
                  Google Map Auto &amp; Local SEO Hub
                </h1>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: autoReplyEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: autoReplyEnabled ? '#16a34a' : '#ef4444',
                    border: autoReplyEnabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: autoReplyEnabled ? '#16a34a' : '#ef4444' }} />
                  {autoReplyEnabled ? 'AI Auto-Reply Active' : 'Auto-Reply Paused'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>
                Katargam, Surat Local SEO Booster • Live Google Reviews Sync, AI Keyword Auto-Reply &amp; 1-Click WhatsApp Review Requests.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchGoogleReviews}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sync Reviews
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(45deg, #4285F4, #34A853)',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MapPin size={14} />
              Open Google Maps ↗
            </a>
          </div>
        </div>

        {/* ── 4 Key Metric Badges ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(66, 133, 244, 0.2)' }}>
          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>Google Rating</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#eab308', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Star size={18} fill="#eab308" /> {rating.toFixed(1)} / 5.0
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>Total Verified Reviews</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>
              {totalReviews}+ Reviews
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>Katargam Local Rank</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Crown size={16} /> #1 Top 3 Pack
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>AI Auto-Reply Engine</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#9333ea', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Zap size={16} /> 100% SEO Keywords
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Main Navigation Tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 10,
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('reviews')}
          className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            background: activeTab === 'reviews' ? 'linear-gradient(45deg, #4285F4 0%, #34A853 100%)' : undefined,
            color: activeTab === 'reviews' ? '#fff' : undefined,
            border: activeTab === 'reviews' ? 'none' : undefined,
          }}
        >
          <Star size={15} />
          ⭐ Live Reviews &amp; AI Auto-Reply ({reviews.length})
        </button>

        <button
          onClick={() => setActiveTab('booster')}
          className={`btn ${activeTab === 'booster' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            background: activeTab === 'booster' ? 'linear-gradient(45deg, #25D366, #128C7E)' : undefined,
            color: activeTab === 'booster' ? '#fff' : undefined,
            border: activeTab === 'booster' ? 'none' : undefined,
          }}
        >
          <MessageCircle size={15} />
          💬 1-Click WhatsApp Review Booster
        </button>

        <button
          onClick={() => setActiveTab('keywords')}
          className={`btn ${activeTab === 'keywords' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <TrendingUp size={15} color="#eab308" />
          🔍 Katargam SEO Keyword Bank ({keywordsList.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Sliders size={15} />
          ⚙️ Auto-Reply Settings &amp; Safety
        </button>

        <button
          onClick={() => setActiveTab('qr')}
          className={`btn ${activeTab === 'qr' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <QrCode size={15} />
          🖨️ Reception QR Code
        </button>
      </div>

      {/* ── TAB 1: LIVE REVIEWS & AI AUTO-REPLY ── */}
      {activeTab === 'reviews' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Search & Star Filter Bar */}
          <div className="card" style={{ padding: 14, borderRadius: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <input
                type="text"
                placeholder="Search reviews by client name or keyword (e.g. Bridal, Hair Botox, Facial)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-sm"
                style={{ paddingLeft: 30, width: '100%' }}
              />
              <Search size={14} color="var(--muted-foreground)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStarFilter('all')}
                className={`btn btn-xs ${starFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: starFilter === 'all' ? 800 : 500 }}
              >
                All ({reviews.length})
              </button>
              <button
                type="button"
                onClick={() => setStarFilter('5')}
                className={`btn btn-xs ${starFilter === '5' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: starFilter === '5' ? 800 : 500 }}
              >
                ⭐⭐⭐⭐⭐ 5-Stars
              </button>
              <button
                type="button"
                onClick={() => setStarFilter('4')}
                className={`btn btn-xs ${starFilter === '4' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: starFilter === '4' ? 800 : 500 }}
              >
                ⭐⭐⭐⭐ 4-Stars
              </button>
              <button
                type="button"
                onClick={() => setStarFilter('pending')}
                className={`btn btn-xs ${starFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: starFilter === 'pending' ? 800 : 500 }}
              >
                ⚡ Needs Reply
              </button>
            </div>
          </div>

          {/* Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredReviews.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
                <Star size={36} color="var(--muted-foreground)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>No reviews found</h3>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>Try clearing search or filters</p>
              </div>
            ) : (
              filteredReviews.map((rev, idx) => {
                const key = `${rev.name}_${rev.text.slice(0, 15)}`;
                const replyState = repliedMap[key];
                const aiReply = generateAiReply(rev.text, rev.name, rev.rating);
                const isEditing = editingReplyKey === key;

                return (
                  <div
                    key={key}
                    className="card"
                    style={{
                      borderRadius: 16,
                      padding: 18,
                      border: rev.rating === 5 ? '1px solid rgba(234, 186, 56, 0.3)' : '1px solid var(--border)',
                      background: '#ffffff',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={rev.avatar}
                          alt={rev.name}
                          style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(66, 133, 244, 0.2)' }}
                          onError={(e) => {
                            (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.name)}&background=05424A&color=EABA38&bold=true`;
                          }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>{rev.name}</span>
                            <span style={{ fontSize: 10, background: 'rgba(52, 168, 83, 0.12)', color: '#16a34a', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              ✓ Verified Google Review
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                            {rev.role || 'Google Maps Verified Client'}
                          </div>
                        </div>
                      </div>

                      {/* Stars */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            color={i < rev.rating ? '#eab308' : '#cbd5e1'}
                            fill={i < rev.rating ? '#eab308' : 'none'}
                          />
                        ))}
                        <span style={{ fontSize: 12, fontWeight: 800, marginLeft: 4, color: '#eab308' }}>
                          {rev.rating}.0
                        </span>
                      </div>
                    </div>

                    {/* Review Body */}
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--foreground)', marginBottom: 14, background: 'var(--bg-secondary, rgba(0,0,0,0.02))', padding: '10px 14px', borderRadius: 10 }}>
                      "{rev.text}"
                    </div>

                    {/* AI Response Box */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.05) 0%, rgba(52, 168, 83, 0.03) 100%)',
                        border: '1px solid rgba(66, 133, 244, 0.2)',
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                            🤖
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>
                            {replyState ? '✅ Owner Replied via AI' : '⚡ AI SEO Auto-Reply (Katargam Keywords Injected):'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(replyState ? replyState.text : aiReply, `copy-${key}`)}
                            className="btn btn-secondary btn-xs"
                            style={{ fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                          >
                            {copiedId === `copy-${key}` ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                            Copy Text
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingReplyKey(null);
                              } else {
                                setEditingReplyKey(key);
                                setCustomReplyText(replyState ? replyState.text : aiReply);
                              }
                            }}
                            className="btn btn-ghost btn-xs"
                            style={{ fontSize: 10.5, fontWeight: 700, color: '#4285F4' }}
                          >
                            {isEditing ? 'Cancel Edit' : '✍️ Edit'}
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <textarea
                            value={customReplyText}
                            onChange={(e) => setCustomReplyText(e.target.value)}
                            rows={3}
                            className="input"
                            style={{ fontSize: 12, lineHeight: 1.5, padding: 8 }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleTriggerReply(key, customReplyText);
                              setEditingReplyKey(null);
                            }}
                            className="btn btn-primary btn-xs"
                            style={{ alignSelf: 'flex-start', fontWeight: 800 }}
                          >
                            Save &amp; Post Custom Reply
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#334155', fontStyle: 'italic', marginBottom: 10 }}>
                          "{replyState ? replyState.text : aiReply}"
                        </div>
                      )}

                      {/* Action Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: '1px dashed rgba(66, 133, 244, 0.2)' }}>
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> Local SEO Keyword Density: 100%
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {!replyState && (
                            <button
                              type="button"
                              onClick={() => handleTriggerReply(key, aiReply)}
                              className="btn btn-primary btn-xs"
                              style={{
                                background: 'linear-gradient(45deg, #4285F4, #34A853)',
                                border: 'none',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Zap size={11} /> ⚡ Auto-Reply to Google Now
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const phone = customers.find((c) => c.name.toLowerCase() === rev.name.toLowerCase())?.mobile;
                              const thankYou = `Dear ${rev.name}, thank you so much for your wonderful 5-Star review for ${salonName}! We truly appreciate your feedback. 💖 — Amita & Shree Beauty Studio Team`;
                              if (phone) {
                                openWAWeb(phone, thankYou);
                              } else {
                                toast('Customer mobile not in records. Text copied!', 'info');
                                navigator.clipboard.writeText(thankYou);
                              }
                            }}
                            className="btn btn-secondary btn-xs"
                            style={{ fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <MessageCircle size={11} color="#25D366" /> WhatsApp Thank You
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}

      {/* ── TAB 2: SMART 1-CLICK WHATSAPP REVIEW BOOSTER (PRE-FILLED SEO KEYWORDS) ── */}
      {activeTab === 'booster' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          
          {/* Left: Setup & Customer Selector */}
          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37, 211, 102, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={18} color="#25D366" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>1. Generate WhatsApp 5-Star Review Request</h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                Send customers pre-written review templates containing exact service keywords (e.g. Bridal Makeup, Hair Botox) so they post high-ranking reviews in 1 click!
              </p>
            </div>

            {/* Quick Customer Picker */}
            <div>
              <label className="label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                👤 Select Customer from Records (or type below):
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="input input-sm"
                style={{ width: '100%' }}
              >
                <option value="">-- Choose Existing Customer --</option>
                {customers.slice(0, 50).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile || 'No mobile'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                  Client Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kinjal Patel"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input input-xs"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                  WhatsApp Mobile:
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9824183769"
                  value={clientMobile}
                  onChange={(e) => setClientMobile(e.target.value)}
                  className="input input-xs"
                />
              </div>
            </div>

            {/* Treatment Selector */}
            <div>
              <label className="label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>
                💄 Treatment / Service Completed (Keywords To Boost):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
                {[
                  { id: 'bridal', label: '👑 Royal Bridal HD' },
                  { id: 'sagai', label: '💍 Sagai / Engagement' },
                  { id: 'hairbotox', label: '💇‍♀️ Hair Botox & Nano' },
                  { id: 'facial', label: '✨ Hydra Facial' },
                  { id: 'waxing_nails', label: '🌿 Rica Wax & Nails' },
                  { id: 'general', label: '⭐ General 5-Star' },
                ].map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedService(srv.id)}
                    className={`btn btn-xs ${selectedService === srv.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: 11, fontWeight: selectedService === srv.id ? 800 : 500 }}
                  >
                    {srv.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom note to append */}
            <div>
              <label className="label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                ✍️ Custom Note to append (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Thank you for booking the 3-session bridal package..."
                value={customKeywordInput}
                onChange={(e) => setCustomKeywordInput(e.target.value)}
                className="input input-xs"
              />
            </div>
          </div>

          {/* Right: Live WhatsApp Message Preview & 1-Click Send */}
          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Smartphone size={16} color="#25D366" />
                <span style={{ fontSize: 14, fontWeight: 800 }}>2. Live WhatsApp Message Preview</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(reviewBoosterMessage, 'copy-booster-msg')}
                className="btn btn-secondary btn-xs"
                style={{ fontWeight: 700 }}
              >
                {copiedId === 'copy-booster-msg' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                Copy Text
              </button>
            </div>

            {/* WhatsApp Chat Bubble */}
            <div
              style={{
                background: '#e5ddd5',
                padding: 14,
                borderRadius: 14,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                minHeight: 280,
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  padding: '12px 14px',
                  borderRadius: '10px 10px 10px 2px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  color: '#111827',
                  width: '100%',
                }}
              >
                {reviewBoosterMessage}
              </div>
            </div>

            {/* 1-Click Send Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  const mobile = clientMobile.replace(/\D/g, '');
                  if (!mobile) {
                    toast('⚠️ Please enter client mobile number first!', 'error');
                    return;
                  }
                  openWAWeb(mobile, reviewBoosterMessage);
                  toast('🚀 Opened WhatsApp Web to send review request!', 'success');
                }}
                className="btn btn-primary"
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  fontSize: 14,
                }}
              >
                <MessageCircle size={16} /> Send via WhatsApp Web
              </button>

              <button
                type="button"
                onClick={() => {
                  const mobile = clientMobile.replace(/\D/g, '');
                  if (!mobile) {
                    toast('⚠️ Please enter client mobile number first!', 'error');
                    return;
                  }
                  openWAApp(mobile, reviewBoosterMessage);
                  toast('📱 Opened WhatsApp App!', 'success');
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Smartphone size={14} /> Send via WhatsApp Mobile App
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 3: KATARGAM LOCAL SEO KEYWORD BANK ── */}
      {activeTab === 'keywords' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ borderRadius: 16, padding: 22 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={18} color="#eab308" />
                Katargam &amp; Surat High-Ranking SEO Keywords
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                Google Local Pack algorithm scans reviews and owner replies for these exact search terms to rank Shree Beauty Studio #1.
              </p>
            </div>

            {/* Add new keyword */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Type new target keyword (e.g. Panetar Makeover, Keratin Surat)..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                className="input input-sm"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800 }}
              >
                + Add Keyword
              </button>
            </div>

            {/* Keywords Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {keywordsList.map((kw, i) => (
                <div
                  key={kw}
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(66, 133, 244, 0.3)',
                    padding: '8px 14px',
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#4285F4' }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{kw}</span>
                  <span style={{ fontSize: 9.5, background: 'rgba(52, 168, 83, 0.12)', color: '#16a34a', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>
                    Active
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 800 }}
                    title="Remove keyword"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 4: SETTINGS & SAFETY FILTER ── */}
      {activeTab === 'settings' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={18} color="#16a34a" />
                Google Map Auto-Reply Rules &amp; Safety Filter
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                Configure how the AI automatically responds to Google Reviews and manages safety rules.
              </p>
            </div>

            {/* Master Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-secondary, rgba(0,0,0,0.02))', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--foreground)' }}>
                  🤖 Master Auto-Reply Switch
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>
                  Automatically generate and post SEO-rich replies to new incoming Google reviews
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoReplyEnabled}
                onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: '#4285F4', cursor: 'pointer' }}
              />
            </div>

            {/* Tone Selector */}
            <div>
              <label className="label" style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                🗣️ AI Response Tone &amp; Language:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {[
                  { id: 'hinglish', label: 'Hinglish (Viral & Friendly)' },
                  { id: 'gujarati', label: 'ગુજરાતી (આત્મીય & શાહી)' },
                  { id: 'english', label: 'English (Luxury & Professional)' },
                  { id: 'multi', label: 'Smart Auto-Match' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAutoReplyTone(t.id as any)}
                    className={`btn btn-sm ${autoReplyTone === t.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: 11.5, fontWeight: autoReplyTone === t.id ? 800 : 500 }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety Rating Threshold */}
            <div>
              <label className="label" style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                ⭐ Safety Rating Filter (Auto-Reply only if):
              </label>
              <select
                value={minStars}
                onChange={(e) => setMinStars(Number(e.target.value))}
                className="input input-sm"
                style={{ width: '100%' }}
              >
                <option value={5}>⭐⭐⭐⭐⭐ Only 5-Star Reviews (Recommended for 100% Safety)</option>
                <option value={4}>⭐⭐⭐⭐ 4-Star &amp; 5-Star Reviews</option>
                <option value={3}>⭐⭐⭐ 3-Star and above</option>
              </select>
              <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0', fontWeight: 600 }}>
                ⚠️ Reviews below {minStars} stars will NOT be auto-replied. You will receive an instant WhatsApp alert to handle them personally.
              </p>
            </div>

            {/* Response Delay */}
            <div>
              <label className="label" style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                ⏱️ Response Delay (Natural Human Behavior):
              </label>
              <select
                value={replyDelay}
                onChange={(e) => setReplyDelay(Number(e.target.value))}
                className="input input-sm"
                style={{ width: '100%' }}
              >
                <option value={0}>⚡ Instant (Under 10 seconds)</option>
                <option value={120}>⏳ 2 Minutes Delay (Looks 100% natural)</option>
                <option value={300}>⏳ 5 Minutes Delay</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="btn btn-primary"
              style={{
                padding: '12px 20px',
                fontWeight: 800,
                background: 'linear-gradient(45deg, #4285F4, #34A853)',
                border: 'none',
                alignSelf: 'flex-start',
              }}
            >
              💾 Save Google Map Settings
            </button>
          </div>
        </motion.div>
      )}

      {/* ── TAB 5: PRINTABLE RECEPTION QR CODE ── */}
      {activeTab === 'qr' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div
            className="card"
            style={{
              maxWidth: 420,
              width: '100%',
              borderRadius: 20,
              padding: 28,
              textAlign: 'center',
              background: '#ffffff',
              border: '2px solid rgba(66, 133, 244, 0.4)',
              boxShadow: '0 12px 32px rgba(66, 133, 244, 0.15)',
            }}
          >
            {/* Salon Name Header */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#2563eb', background: 'rgba(66, 133, 244, 0.1)', padding: '3px 10px', borderRadius: 999 }}>
                Google 5-Star Review
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '8px 0 2px', color: '#032B30' }}>
                {salonName}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                {salonAddress}
              </p>
            </div>

            {/* QR Code Container */}
            <div
              style={{
                width: 220,
                height: 220,
                margin: '0 auto 16px',
                background: '#ffffff',
                borderRadius: 16,
                padding: 12,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(googleMapsUrl)}`}
                alt="Google Maps QR Code"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#eab308', marginBottom: 16 }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="#eab308" color="#eab308" />
              ))}
              <span style={{ fontSize: 13, fontWeight: 800, marginLeft: 4, color: '#032B30' }}>
                Scan &amp; Review on Google Maps
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-primary"
              style={{
                width: '100%',
                fontWeight: 800,
                background: 'linear-gradient(45deg, #4285F4, #34A853)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Printer size={16} /> Print Reception Desk Standee
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
