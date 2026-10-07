'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  Printer,
  EyeOff,
  Eye,
  Trash2,
  Calendar,
  Clock,
  RotateCcw,
  Share2,
  Image as ImageIcon,
  Camera,
  UploadCloud,
  ChevronRight,
  Instagram,
  PhoneCall,
  Globe,
  Plus,
  X,
  Info,
  Edit3
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { useToast } from '@/components/ui/Toast';
import { openWAWeb, openWAApp } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { GoogleReviewItem } from '@/app/api/google-reviews/route';

type ActiveTab = 'reviews' | 'post' | 'booster' | 'keywords' | 'settings' | 'qr';

// Curated High-Value SEO Keywords for Katargam & Surat
const SEO_KEYWORDS = [
  'Best Bridal Makeup in Katargam, Surat',
  'Best Beauty Parlour in Surat',
  'HD Airbrush Bridal Makeover',
  'Hair Botox Treatment Surat',
  'Nanoplastia Treatment Katargam',
  'Hydra Facial in Surat',
  'Panetar & Saree Draping',
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
  const [repliedMap, setRepliedMap] = useState<Record<string, { text: string; time: string; source: 'ai' | 'manual' }>>(
    settings?.googleReviewsRepliedMap || {}
  );
  // Hidden / Dismissed Old Reviews List
  const [hiddenKeys, setHiddenKeys] = useState<string[]>(
    settings?.googleReviewsHiddenList || []
  );
  // Hide Replied Toggle (hide old reviews that already got replies)
  const [hideReplied, setHideReplied] = useState<boolean>(
    settings?.googleReviewsHideReplied ?? false
  );
  // Hide Old Reviews (> 30 Days) - Defaults to true so old reviews do not show there
  const [hideOldReviews, setHideOldReviews] = useState<boolean>(
    settings?.googleReviewsHideOld ?? true
  );
  // Date filter (all | 7d | 30d | 90d | recent)
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | '90d' | 'recent'>(
    settings?.googleReviewsDateFilter || '30d'
  );
  // Sort order (recent | rating | oldest) - Defaults to 'recent' (Most Recent Reviews First)
  const [sortOrder, setSortOrder] = useState<'recent' | 'rating' | 'oldest'>('recent');
  const [editingReplyKey, setEditingReplyKey] = useState<string | null>(null);
  const [customReplyText, setCustomReplyText] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom & Live Review Management State
  const [googleApiError, setGoogleApiError] = useState<string | null>(null);
  const [addReviewModalOpen, setAddReviewModalOpen] = useState<boolean>(false);
  const [reviewForm, setReviewForm] = useState({
    name: '',
    rating: 5,
    role: 'Bridal Services · Surat',
    text: '',
    timeAgo: 'now', // 'now' | 'today' | 'yesterday' | '2d' | '1w' | '1m'
    avatar: '',
  });

  // Review Booster / WhatsApp Request State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientMobile, setClientMobile] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('bridal');
  const [customKeywordInput, setCustomKeywordInput] = useState<string>('');

  // ── GOOGLE MAPS LOCAL SEO UPDATE / POST CREATOR STATE ──
  const [postCategory, setPostCategory] = useState<'bridal' | 'sagai' | 'hairbotox' | 'facial' | 'offer' | 'general'>('bridal');
  const [postTitle, setPostTitle] = useState('👑 Royal HD Bridal Makeover in Katargam, Surat');
  const [postDetails, setPostDetails] = useState('');
  const [postCta, setPostCta] = useState<'book' | 'call' | 'whatsapp' | 'offer'>('book');
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const postCameraInputRef = useRef<HTMLInputElement>(null);

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
        if (json.googleApiError) setGoogleApiError(json.googleApiError);
        else setGoogleApiError(null);
      }
    } catch {
      toast('Could not fetch live reviews from Google API', 'error');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchGoogleReviews();
  }, [fetchGoogleReviews]);

  // Robust Mobile Clipboard Copy (Supports iOS Safari, Android Chrome & WebViews)
  const safeCopy = useCallback(
    async (text: string, id: string) => {
      let copied = false;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch (err) {
        console.warn('Navigator clipboard error, trying textarea fallback:', err);
      }

      if (!copied && typeof document !== 'undefined') {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.top = '-9999px';
          textarea.setAttribute('readonly', '');
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          copied = true;
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr);
        }
      }

      setCopiedId(id);
      toast('📋 Copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2200);
    },
    [toast]
  );

  // Native Web Share API for iPhone & Android
  const nativeShare = useCallback(
    async (title: string, text: string, url?: string) => {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({
            title,
            text,
            url: url || googleMapsUrl,
          });
          toast('🚀 Shared successfully!', 'success');
          return true;
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            console.warn('Share error:', e);
          }
        }
      }
      // If Web Share not supported or cancelled, fallback to safeCopy
      safeCopy(text, 'share-fallback');
      return false;
    },
    [googleMapsUrl, safeCopy, toast]
  );

  // 2. AI Service-Only Response Generator (Strictly mentions ONLY services written in review)
  const generateAiReply = useCallback(
    (reviewText: string, authorName: string, ratingVal: number, tone: 'hinglish' | 'gujarati' | 'english' | 'multi' = autoReplyTone) => {
      const lower = reviewText.toLowerCase();
      const name = authorName.trim() ? authorName.split(' ')[0] : 'Client';

      if (ratingVal < 4) {
        return `Dear ${name}, thank you for your feedback. We always strive for 100% perfection. Please call us directly at +91 ${salonPhone} so we can personally resolve your concern immediately. — ${salonName}, Katargam, Surat.`;
      }

      // Check exact services present in review
      const isBridal =
        lower.includes('bridal') ||
        lower.includes('bride') ||
        lower.includes('wedding') ||
        lower.includes('lagan') ||
        lower.includes('marriage') ||
        lower.includes('panetar') ||
        lower.includes('sagai') ||
        lower.includes('engagement');

      const hasHaircut =
        lower.includes('haircut') ||
        lower.includes('hair cut') ||
        lower.includes('cutting') ||
        lower.includes('trimming');

      const hasHairTreatment =
        lower.includes('botox') ||
        lower.includes('nanoplastia') ||
        lower.includes('keratin') ||
        lower.includes('smoothening') ||
        lower.includes('straightening') ||
        lower.includes('hair spa') ||
        lower.includes('hair colour') ||
        lower.includes('hair color') ||
        lower.includes('hair treatment');

      const hasGeneralHair = !hasHaircut && !hasHairTreatment && lower.includes('hair');

      const hasMakeup =
        !isBridal &&
        (lower.includes('makeup') ||
          lower.includes('make up') ||
          lower.includes('makeover') ||
          lower.includes('party look') ||
          lower.includes('natural look'));

      const hasFacialSkin =
        lower.includes('facial') ||
        lower.includes('hydra') ||
        lower.includes('skin') ||
        lower.includes('cleanup') ||
        lower.includes('clean up') ||
        lower.includes('glow');

      const hasWaxThreading =
        lower.includes('wax') ||
        lower.includes('waxing') ||
        lower.includes('threading') ||
        lower.includes('eyebrow');

      const hasNails =
        lower.includes('nail') ||
        lower.includes('manicure') ||
        lower.includes('pedicure');

      // ── GUJARATI TONE ──
      if (tone === 'gujarati') {
        if (isBridal) {
          return `ખૂબ ખૂબ આભાર ${name}! તમને અમારો બ્રાઇડલ મેકઅપ પસંદ આવ્યો તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        if (hasHaircut && hasMakeup) {
          return `ખૂબ ખૂબ આભાર ${name}! તમને અમારું હેરકટ અને મેકઅપ ગમ્યું તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        if (hasHaircut) {
          return `ખૂબ ખૂબ આભાર ${name}! તમને અમારો હેરકટ પસંદ આવ્યો તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        if (hasHairTreatment) {
          return `ખૂબ ખૂબ આભાર ${name}! હેર ટ્રીટમેન્ટનું સુંદર પરિણામ તમને મળ્યું તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        if (hasGeneralHair) {
          return `ખૂબ ખૂબ આભાર ${name}! તમને અમારી હેર સર્વિસ પસંદ આવી તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        if (hasMakeup) {
          return `ખૂબ ખૂબ આભાર ${name}! તમને અમારો મેકઅપ ગમ્યો તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        if (hasFacialSkin) {
          return `ખૂબ ખૂબ આભાર ${name}! તમને અમારી ફેસિયલ અને સ્કિન સર્વિસ ગમી તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        if (hasWaxThreading) {
          return `ખૂબ ખૂબ આભાર ${name}! તમને અમારી વેક્સિંગ અને થ્રેડિંગ સર્વિસ ગમી તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        if (hasNails) {
          return `ખૂબ ખૂબ આભાર ${name}! તમને અમારી નેઇલ કેર સર્વિસ ગમી તે બદલ ધન્યવાદ. શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ ખાતે ફરી પધારજો! ✨`;
        }
        return `આપનો ખૂબ ખૂબ આભાર ${name}! શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ, સુરત ખાતે ફરી પધારજો! ✨`;
      }

      // ── ENGLISH & HINGLISH (Direct, Crisp & Service-Specific) ──
      if (isBridal) {
        return `Thank you so much ${name}! Glad you loved your bridal makeup. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
      }
      if (hasHaircut && hasMakeup) {
        return `Thank you so much ${name}! Glad you loved your haircut and makeup. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
      }
      if (hasHaircut) {
        return `Thank you so much ${name}! Glad you loved your haircut. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
      }
      if (hasHairTreatment) {
        return `Thank you so much ${name}! Glad you loved your hair treatment. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
      }
      if (hasGeneralHair) {
        return `Thank you so much ${name}! Glad you loved our hair service. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
      }
      if (hasMakeup) {
        return `Thank you so much ${name}! Glad you loved your makeup look. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
      }
      if (hasFacialSkin) {
        return `Thank you so much ${name}! Glad you loved your facial treatment. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
      }
      if (hasWaxThreading) {
        return `Thank you so much ${name}! Glad you had a great experience with our salon services at ${salonName}, Katargam, Surat! ✨`;
      }
      if (hasNails) {
        return `Thank you so much ${name}! Glad you loved your nail service. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
      }

      return `Thank you so much ${name}! Glad you loved our service. Looking forward to welcoming you again at ${salonName}, Katargam, Surat! ✨`;
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

  // 4. Instant One-Click Auto-Reply to Google & Persist
  const handleTriggerReply = (reviewKey: string, replyText: string, openMaps: boolean = true) => {
    const updatedReplied = {
      ...repliedMap,
      [reviewKey]: {
        text: replyText,
        time: new Date().toLocaleDateString('en-GB') + ' (Copied for Google)',
        source: 'ai' as const,
      },
    };
    setRepliedMap(updatedReplied);
    setData({
      ...data,
      settings: {
        ...data.settings,
        googleReviewsRepliedMap: updatedReplied,
      },
    });
    scheduleSave();
    safeCopy(replyText, `reply-${reviewKey}`);

    if (openMaps) {
      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
      toast(`📋 Reply Copied! Opening Google Maps... Just tap "Reply" and Paste!`, 'success');
    } else {
      toast(`📋 Reply copied to clipboard!`, 'success');
    }
  };

  // Hide / Dismiss an Old Review
  const handleHideReview = (reviewKey: string) => {
    const updated = [...hiddenKeys, reviewKey];
    setHiddenKeys(updated);
    setData({
      ...data,
      settings: {
        ...data.settings,
        googleReviewsHiddenList: updated,
      },
    });
    scheduleSave();
    toast('🗑️ Old review dismissed & hidden from list!', 'info');
  };

  // Restore All Hidden Reviews
  const handleUnhideAll = () => {
    setHiddenKeys([]);
    setData({
      ...data,
      settings: {
        ...data.settings,
        googleReviewsHiddenList: [],
      },
    });
    scheduleSave();
    toast('🔄 All hidden reviews restored!', 'success');
  };

  // Toggle Hide Replied
  const handleToggleHideReplied = (val: boolean) => {
    setHideReplied(val);
    setData({
      ...data,
      settings: {
        ...data.settings,
        googleReviewsHideReplied: val,
      },
    });
    scheduleSave();
  };

  // Toggle Hide Old Reviews (>30 Days)
  const handleToggleHideOldReviews = (val: boolean) => {
    setHideOldReviews(val);
    setData({
      ...data,
      settings: {
        ...data.settings,
        googleReviewsHideOld: val,
      },
    });
    scheduleSave();
    toast(val ? '🚫 Old reviews hidden (Showing only recent reviews)' : '👀 Showing all reviews history', 'info');
  };

  // One-click dismiss all old reviews (> 30 days)
  const handleDismissAllOldReviews = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const oldKeys: string[] = [];
    reviews.forEach((r) => {
      const key = `${r.name}_${r.text.slice(0, 15)}`;
      const reviewSec = r.time
        ? r.time > 10000000000
          ? Math.floor(r.time / 1000)
          : r.time
        : nowSec - 60 * 86400;
      const diffDays = Math.max(0, (nowSec - reviewSec) / 86400);
      if (diffDays > 30 && !hiddenKeys.includes(key)) {
        oldKeys.push(key);
      }
    });

    if (oldKeys.length === 0) {
      toast('No old reviews found to hide', 'info');
      return;
    }

    const updated = [...hiddenKeys, ...oldKeys];
    setHiddenKeys(updated);
    setData({
      ...data,
      settings: {
        ...data.settings,
        googleReviewsHiddenList: updated,
      },
    });
    scheduleSave();
    toast(`🗑️ Dismissed ${oldKeys.length} old reviews!`, 'success');
  };

  // Change Date Filter
  const handleChangeDateFilter = (val: 'all' | '7d' | '30d' | '90d' | 'recent') => {
    setDateFilter(val);
    setData({
      ...data,
      settings: {
        ...data.settings,
        googleReviewsDateFilter: val,
      },
    });
    scheduleSave();
  };

  // Add / Import New Custom Google Review (Shows First)
  const handleAddReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name.trim()) {
      toast('Please enter the client / reviewer name', 'error');
      return;
    }
    if (!reviewForm.text.trim()) {
      toast('Please enter the review text', 'error');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    let timeSec = now;
    let relTime = 'Just now';
    if (reviewForm.timeAgo === 'today') {
      timeSec = now - 3600 * 2;
      relTime = 'Today';
    } else if (reviewForm.timeAgo === 'yesterday') {
      timeSec = now - 86400;
      relTime = 'Yesterday';
    } else if (reviewForm.timeAgo === '2d') {
      timeSec = now - 86400 * 2;
      relTime = '2 days ago';
    } else if (reviewForm.timeAgo === '1w') {
      timeSec = now - 86400 * 7;
      relTime = '1 week ago';
    } else if (reviewForm.timeAgo === '1m') {
      timeSec = now - 86400 * 30;
      relTime = '1 month ago';
    }

    const newRev: GoogleReviewItem = {
      name: reviewForm.name.trim(),
      rating: Number(reviewForm.rating) || 5,
      role: reviewForm.role.trim() || 'Verified Client · Surat',
      text: reviewForm.text.trim(),
      avatar: reviewForm.avatar.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewForm.name.trim())}&background=05424A&color=EABA38&bold=true`,
      time: timeSec,
      relativeTime: relTime,
    };

    // Update settings in store & Supabase
    const existingCustom = settings?.customGoogleReviews || [];
    const updatedCustom = [newRev, ...existingCustom.filter((r) => !(r.name === newRev.name && r.text === newRev.text))];

    const updatedSettings = {
      ...data.settings,
      customGoogleReviews: updatedCustom,
    };
    const updatedData = {
      ...data,
      settings: updatedSettings,
    };
    setData(updatedData);
    scheduleSave();

    // Update active reviews list and prepend at the very top
    setReviews((prev) => [newRev, ...prev.filter((r) => !(r.name === newRev.name && r.text === newRev.text))]);

    setAddReviewModalOpen(false);
    setReviewForm({
      name: '',
      rating: 5,
      role: 'Bridal Services · Surat',
      text: '',
      timeAgo: 'now',
      avatar: '',
    });
    toast('🎉 New Google Review added and showing first!', 'success');
  };

  // Delete or Dismiss Review
  const handleDeleteReview = (rev: GoogleReviewItem) => {
    const existingCustom = settings?.customGoogleReviews || [];
    const isCustom = existingCustom.some((r) => r.name === rev.name && r.text === rev.text);

    if (isCustom) {
      const updatedCustom = existingCustom.filter((r) => !(r.name === rev.name && r.text === rev.text));
      const updatedSettings = { ...data.settings, customGoogleReviews: updatedCustom };
      const updatedData = { ...data, settings: updatedSettings };
      setData(updatedData);
      scheduleSave();
      setReviews((prev) => prev.filter((r) => !(r.name === rev.name && r.text === rev.text)));
      toast('🗑️ Custom review deleted', 'success');
    } else {
      const key = `${rev.name}_${rev.text.slice(0, 15)}`;
      handleHideReview(key);
      toast('🗑️ Review hidden from list', 'info');
    }
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
— Warmly, ${salonName} Team`;
  }, [clientName, selectedService, customKeywordInput, salonName, googleMapsUrl]);

  // 7. Format 5-Star Testimonial for Instagram Story / WhatsApp Status
  const getReviewStoryQuote = (r: GoogleReviewItem) => {
    return `⭐⭐⭐⭐⭐ 5-STAR VERIFIED GOOGLE REVIEW\n\n"${r.text}"\n\n— ${r.name} (${r.role || 'Surat Client'})\n\n👑 ${salonName}\n📍 ${salonAddress}\n🔗 Book: https://shreebeauty.studio/book\n💬 WhatsApp: +91 ${salonPhone}`;
  };

  // 8. Handle Image Upload for Google Maps Local Update Post
  const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImageFile(file);
      const url = URL.createObjectURL(file);
      setPostImagePreview(url);
      toast('📸 Photo attached for Google Maps update!', 'success');
    }
  };

  // 9. Generate Google Maps Local SEO Post Content
  const generatedGooglePostContent = useMemo(() => {
    let headline = '👑 Royal Bridal & Salon Artistry at Shree Beauty Studio, Katargam, Surat!';
    let body = 'Experience 100% waterproof HD Airbrush bridal makeup, royal Panetar saree draping, and customized bridal glow crafted with international luxury cosmetics.';
    let offer = 'Book your wedding or engagement makeover dates early to secure your exclusive bridal package slot.';

    switch (postCategory) {
      case 'bridal':
        headline = '👑 Best Bridal Makeup Studio in Katargam, Surat — HD Airbrush Perfection';
        body = 'Every bride deserves a flawless, royal transformation on her special day! Our signature bridal makeover features weightless 100% waterproof airbrush base, precision eye artistry, and royal jewelry & dupatta setting.';
        offer = 'Special Bridal Packages available for upcoming wedding season. Call or WhatsApp +91 98241 83769 for dates.';
        break;
      case 'sagai':
        headline = '💍 Engagement & Sagai Makeover in Surat — Dewy Glass Skin Glamour';
        body = 'Get ready for your Ring Ceremony with our soft pastel glam, dewy glass skin finish, and romantic hairstyles tailored for modern Gujarati brides.';
        offer = 'Consult our senior beauty artists for custom engagement & siders packages.';
        break;
      case 'hairbotox':
        headline = '💇‍♀️ Silky Smooth Hair Botox & Nanoplastia Treatment in Katargam, Surat';
        body = 'Transform frizzy, dull hair into mirror-shine, silky, and deeply nourished locks! 100% formaldehyde-free premium hair treatment that lasts for months.';
        offer = 'Limited-time offer on Hair Botox & Nanoplastia treatments. Book your session today!';
        break;
      case 'facial':
        headline = '✨ Hydra Facial & Deep Glass Skin Glow Treatment in Surat';
        body = 'Say goodbye to dull skin, dark spots, and tanning! Experience our multi-step Hydra Facial for deep cleansing, blackhead extraction, and instant radiant glass-skin glow.';
        offer = '100% Ladies Only hygienic parlour environment with imported luxury skincare serums.';
        break;
      case 'offer':
        headline = '🎉 Exclusive Festive & Wedding Package Offers at Shree Beauty Studio!';
        body = 'Get luxury salon pampering at special combo rates! Pre-bridal treatments, hair spa, organic waxing, and bridal packages with exciting festival benefits.';
        offer = 'Special limited-time vouchers available for Surat residents.';
        break;
      default:
        headline = '🌸 100% Ladies Only Luxury Salon in Katargam, Surat';
        body = 'Visit Shree Beauty Studio & Bridal Parlour for top-rated beauty care, haircuts, hair treatments, waxing, manicures, and bridal services in Surat.';
        offer = 'Over 210+ verified 5-Star reviews on Google Maps!';
    }

    let ctaText = '🔗 Book Online: https://shreebeauty.studio/book';
    if (postCta === 'call') ctaText = `📞 Call Studio: +91 ${salonPhone}`;
    if (postCta === 'whatsapp') ctaText = `💬 WhatsApp Direct: https://wa.me/91${salonPhone.replace(/\D/g, '').slice(-10)}`;
    if (postCta === 'offer') ctaText = `🎁 View Packages & Book: https://shreebeauty.studio/book`;

    const customText = postDetails.trim() ? `\n\n📌 Note: ${postDetails.trim()}` : '';

    return `${headline}\n\n${body}${customText}\n\n${offer}\n\n${ctaText}\n\n📍 Visit Us: ${salonAddress}\n📍 Google Maps: ${googleMapsUrl}\n📸 Instagram: @shreebeauty.studio`;
  }, [postCategory, postDetails, postCta, salonAddress, salonPhone, googleMapsUrl]);

  // Filtered & Sorted Reviews list (Most Recent Reviews First by default)
  const filteredReviews = useMemo(() => {
    return reviews
      .filter((r) => {
        const key = `${r.name}_${r.text.slice(0, 15)}`;

        // 1. Manually dismissed / hidden reviews
        if (hiddenKeys.includes(key)) return false;

        // 2. Hide already replied reviews if toggle ON
        const hasReplied = Boolean(repliedMap[key]);
        if (hideReplied && hasReplied) return false;

        // 3. Search query
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q) ||
          (r.role && r.role.toLowerCase().includes(q));

        if (!matchSearch) return false;

        // 4. Star & Status filter
        if (starFilter === '5' && r.rating !== 5) return false;
        if (starFilter === '4' && r.rating !== 4) return false;
        if (starFilter === 'replied' && !hasReplied) return false;
        if (starFilter === 'pending' && hasReplied) return false;

        // 5. Calculate age of review in days
        const nowSec = Math.floor(Date.now() / 1000);
        const reviewSec = r.time
          ? r.time > 10000000000
            ? Math.floor(r.time / 1000)
            : r.time
          : nowSec - 60 * 86400; // If no time stamp, treat as old
        const diffDays = Math.max(0, (nowSec - reviewSec) / 86400);

        // 6. Hide Old Reviews (> 30 days) if toggle ON
        if (hideOldReviews && diffDays > 30) {
          return false;
        }

        // 7. Date range filter
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
        if (dateFilter === '90d' && diffDays > 90) return false;
        if (dateFilter === 'recent' && diffDays > 14) return false;

        return true;
      })
      .sort((a, b) => {
        const nowSec = Math.floor(Date.now() / 1000);
        const timeA = a.time ? (a.time > 10000000000 ? Math.floor(a.time / 1000) : a.time) : (nowSec - 60 * 86400);
        const timeB = b.time ? (b.time > 10000000000 ? Math.floor(b.time / 1000) : b.time) : (nowSec - 60 * 86400);

        if (sortOrder === 'oldest') {
          return timeA - timeB;
        }
        if (sortOrder === 'rating') {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return timeB - timeA;
        }
        // Default: 'recent' — most recent reviews first
        return timeB - timeA;
      });
  }, [reviews, searchQuery, starFilter, hideReplied, hideOldReviews, dateFilter, sortOrder, hiddenKeys, repliedMap]);

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
                Katargam, Surat Local SEO Booster • Live Google Reviews Sync, AI Keyword Auto-Reply, Google Local Posts &amp; 1-Click WhatsApp Review Requests.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setAddReviewModalOpen(true)}
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(45deg, #16a34a, #059669)',
                color: '#fff',
                fontWeight: 800,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 40,
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
              }}
            >
              <Plus size={15} />
              ➕ Add New Review
            </button>

            <button
              type="button"
              onClick={fetchGoogleReviews}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, minHeight: 40 }}
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
                minHeight: 40,
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

      {/* ── Main Navigation Tabs (Touch-friendly Horizontal Scrolling on Mobile) ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 10,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
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
            whiteSpace: 'nowrap',
            flexShrink: 0,
            minHeight: 38,
            background: activeTab === 'reviews' ? 'linear-gradient(45deg, #4285F4 0%, #34A853 100%)' : undefined,
            color: activeTab === 'reviews' ? '#fff' : undefined,
            border: activeTab === 'reviews' ? 'none' : undefined,
          }}
        >
          <Star size={15} />
          ⭐ Live Reviews &amp; AI Replies ({reviews.length})
        </button>

        <button
          onClick={() => setActiveTab('post')}
          className={`btn ${activeTab === 'post' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            minHeight: 38,
            background: activeTab === 'post' ? 'linear-gradient(45deg, #EA4335, #FBBC05)' : undefined,
            color: activeTab === 'post' ? '#fff' : undefined,
            border: activeTab === 'post' ? 'none' : undefined,
          }}
        >
          <Flame size={15} />
          📢 Google Maps Local Update &amp; Cross-Post
        </button>

        <button
          onClick={() => setActiveTab('booster')}
          className={`btn ${activeTab === 'booster' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            minHeight: 38,
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
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, minHeight: 38 }}
        >
          <TrendingUp size={15} color="#eab308" />
          🔍 Katargam SEO Keyword Bank ({keywordsList.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, minHeight: 38 }}
        >
          <Sliders size={15} />
          ⚙️ Auto-Reply Settings
        </button>

        <button
          onClick={() => setActiveTab('qr')}
          className={`btn ${activeTab === 'qr' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, minHeight: 38 }}
        >
          <QrCode size={15} />
          🖨️ Reception QR Code
        </button>
      </div>

      {/* ── TAB 1: LIVE REVIEWS & AI AUTO-REPLY ── */}
      {activeTab === 'reviews' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Search & Filter Toolbar */}
          <div className="card" style={{ padding: 14, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <input
                  type="text"
                  placeholder="Search reviews by client name or service (e.g. Haircut, Botox, Facial)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-sm"
                  style={{ paddingLeft: 30, width: '100%' }}
                />
                <Search size={14} color="var(--muted-foreground)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              {/* Star & Status Filters + Add Button */}
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
                  onClick={() => setStarFilter('pending')}
                  className={`btn btn-xs ${starFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontWeight: starFilter === 'pending' ? 800 : 500, background: starFilter === 'pending' ? '#f59e0b' : undefined, color: starFilter === 'pending' ? '#fff' : undefined }}
                >
                  ⚡ Needs Reply
                </button>
                <button
                  type="button"
                  onClick={() => setStarFilter('replied')}
                  className={`btn btn-xs ${starFilter === 'replied' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontWeight: starFilter === 'replied' ? 800 : 500 }}
                >
                  ✅ Replied
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
                  onClick={() => setAddReviewModalOpen(true)}
                  className="btn btn-xs"
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    fontWeight: 800,
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                  }}
                >
                  <Plus size={13} /> Add Review
                </button>
              </div>
            </div>

            {/* Date Range & Hide Old / Replied Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={13} /> Date Filter:
                </span>
                {(['30d', '7d', '90d', 'all'] as const).map((d) => {
                  const labelMap = { '30d': '📅 Past 30 Days (Active)', '7d': '⚡ Past 7 Days', '90d': 'Past 90 Days', all: '📂 All History (Archive)' };
                  const isActive = dateFilter === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleChangeDateFilter(d)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: 6,
                        border: isActive ? '1px solid #4285F4' : '1px solid var(--border)',
                        background: isActive ? 'rgba(66, 133, 244, 0.12)' : '#ffffff',
                        color: isActive ? '#2563eb' : 'var(--foreground)',
                        fontSize: 11,
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {labelMap[d]}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Hide Old Reviews (> 30 Days) Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleHideOldReviews(!hideOldReviews)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: hideOldReviews ? '1px solid #16a34a' : '1px solid var(--border)',
                    background: hideOldReviews ? 'rgba(22, 163, 74, 0.1)' : '#ffffff',
                    color: hideOldReviews ? '#16a34a' : 'var(--muted-foreground)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Toggle hiding reviews older than 30 days"
                >
                  <EyeOff size={13} />
                  <span>{hideOldReviews ? '✓ Hiding Old Reviews' : 'Show Old Reviews'}</span>
                </button>

                {/* Hide Replied Reviews Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleHideReplied(!hideReplied)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: hideReplied ? '1px solid #16a34a' : '1px solid var(--border)',
                    background: hideReplied ? 'rgba(22, 163, 74, 0.1)' : '#ffffff',
                    color: hideReplied ? '#16a34a' : 'var(--muted-foreground)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Automatically hide reviews that already have replies"
                >
                  <CheckCircle2 size={13} />
                  <span>{hideReplied ? '✓ Hiding Replied' : 'Hide Replied'}</span>
                </button>

                {/* Dismiss All Old Reviews Button */}
                <button
                  type="button"
                  onClick={handleDismissAllOldReviews}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.06)',
                    color: '#ef4444',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Dismiss all reviews older than 30 days with 1 click"
                >
                  <Trash2 size={12} />
                  <span>Dismiss All Old</span>
                </button>

                {/* Restore Hidden Reviews Button */}
                {hiddenKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUnhideAll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      background: 'rgba(59, 130, 246, 0.08)',
                      color: '#2563eb',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Unhide and restore all dismissed reviews"
                  >
                    <RotateCcw size={12} />
                    <span>Restore ({hiddenKeys.length}) Hidden</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sort Order Selector (Recent First / Rating / Oldest) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} /> Sort Reviews:
                </span>
                {[
                  { id: 'recent', label: '⚡ Recent First (Newest)', icon: '🕒' },
                  { id: 'rating', label: '⭐ Highest Rating (5-Star)', icon: '⭐' },
                  { id: 'oldest', label: '⏳ Oldest First (Past)', icon: '⏳' },
                ].map((s) => {
                  const isActive = sortOrder === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortOrder(s.id as any)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 6,
                        border: isActive ? '1.5px solid #4285F4' : '1px solid var(--border)',
                        background: isActive ? 'rgba(66, 133, 244, 0.15)' : '#ffffff',
                        color: isActive ? '#1d4ed8' : 'var(--foreground)',
                        fontSize: 11,
                        fontWeight: isActive ? 800 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} />
                Showing {filteredReviews.length} reviews ({sortOrder === 'recent' ? '⚡ Recent First' : sortOrder === 'rating' ? '⭐ Highest Rating' : '⏳ Oldest First'})
              </div>
            </div>
          </div>

          {/* How Google Maps Reply Works Infobox */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, rgba(52, 168, 83, 0.06) 100%)',
              border: '1px solid rgba(66, 133, 244, 0.25)',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#4285F4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0, marginTop: 2 }}>
              💡
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)', marginBottom: 2 }}>
                How to Post Your AI Reply to Google Maps:
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                Click <b>"📋 Copy &amp; Open Google Maps to Paste ↗"</b> on any review. The AI reply is automatically copied to your clipboard and your Google Maps review page opens — simply click <b>"Reply"</b> and tap Paste!
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredReviews.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
                <Star size={36} color="var(--muted-foreground)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>No reviews found in this filter</h3>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: '0 0 12px' }}>
                  Old reviews are hidden. Try switching date filter to "All History" or turning off "Hiding Old Reviews".
                </p>
                {hiddenKeys.length > 0 && (
                  <button type="button" onClick={handleUnhideAll} className="btn btn-secondary btn-sm" style={{ margin: '0 auto' }}>
                    <RotateCcw size={13} /> Restore {hiddenKeys.length} Dismissed Reviews
                  </button>
                )}
              </div>
            ) : (
              filteredReviews.map((rev) => {
                const key = `${rev.name}_${rev.text.slice(0, 15)}`;
                const replyState = repliedMap[key];
                const aiReply = generateAiReply(rev.text, rev.name, rev.rating);
                const isEditing = editingReplyKey === key;

                const nowSec = Math.floor(Date.now() / 1000);
                const reviewSec = rev.time
                  ? rev.time > 10000000000
                    ? Math.floor(rev.time / 1000)
                    : rev.time
                  : nowSec - 60 * 86400;
                const diffDays = Math.max(0, (nowSec - reviewSec) / 86400);
                const isOldReview = diffDays > 30;

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>{rev.name}</span>
                            <span style={{ fontSize: 10, background: 'rgba(52, 168, 83, 0.12)', color: '#16a34a', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              ✓ Verified Google Review
                            </span>
                            {rev.relativeTime && (
                              <span style={{ fontSize: 10.5, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                                <Clock size={11} /> {rev.relativeTime}
                              </span>
                            )}
                            {isOldReview && (
                              <span style={{ fontSize: 9.5, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                Past Archive Review
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                            {rev.role || 'Google Maps Verified Client'}
                          </div>
                        </div>
                      </div>

                      {/* Stars, Story Quote & Dismiss Action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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

                        {/* Turn Review into Story / Status Quote */}
                        {rev.rating === 5 && (
                          <button
                            type="button"
                            onClick={() => safeCopy(getReviewStoryQuote(rev), `story-${key}`)}
                            className="btn btn-secondary btn-xs"
                            style={{ fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                            title="Copy 5-Star Testimonial Quote for Instagram Story / WhatsApp Status"
                          >
                            <Sparkles size={11} color="#E1306C" />
                            {copiedId === `story-${key}` ? <Check size={11} color="#16a34a" /> : 'Story Quote'}
                          </button>
                        )}

                        {/* Delete / Dismiss Review */}
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10.5,
                            fontWeight: 600,
                          }}
                          title="Delete or hide review from list"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
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
                            {replyState ? '✅ Reply Copied & Ready for Google Maps' : '⚡ AI Suggested Reply (Exact Service Mentioned):'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => safeCopy(replyState ? replyState.text : aiReply, `copy-${key}`)}
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
                              handleTriggerReply(key, customReplyText, true);
                              setEditingReplyKey(null);
                            }}
                            className="btn btn-primary btn-xs"
                            style={{ alignSelf: 'flex-start', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <ExternalLink size={12} /> Save, Copy &amp; Open Google Maps ↗
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
                          <CheckCircle2 size={12} /> Exact Service-Only Reply
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {replyState ? (
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(replyState.text, `reply-${key}`);
                                window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                                toast('📋 Copied! Opening Google Maps...', 'success');
                              }}
                              className="btn btn-xs"
                              style={{
                                background: 'rgba(66, 133, 244, 0.1)',
                                border: '1px solid #4285F4',
                                color: '#2563eb',
                                fontWeight: 800,
                                fontSize: 11,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 10px',
                                minHeight: 32,
                              }}
                            >
                              <ExternalLink size={11} /> ↗ Open Google Maps to Paste
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTriggerReply(key, aiReply, true)}
                              className="btn btn-primary btn-xs"
                              style={{
                                background: 'linear-gradient(45deg, #4285F4, #34A853)',
                                border: 'none',
                                fontWeight: 800,
                                fontSize: 11,
                                padding: '6px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                minHeight: 32,
                              }}
                            >
                              <ExternalLink size={12} /> 📋 Copy &amp; Open Google Maps ↗
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const phone = customers.find((c) => c.name.toLowerCase() === rev.name.toLowerCase())?.mobile;
                              const thankYou = `Dear ${rev.name}, thank you so much for your wonderful 5-Star review for ${salonName}! We truly appreciate your feedback. 💖 — ${salonName} Team`;
                              if (phone) {
                                openWAApp(phone, thankYou);
                              } else {
                                safeCopy(thankYou, `thankyou-${key}`);
                                toast('Customer mobile not in records. Thank you message copied!', 'info');
                              }
                            }}
                            className="btn btn-secondary btn-xs"
                            style={{ fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, minHeight: 32 }}
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

      {/* ── TAB 2: GOOGLE MAPS LOCAL SEO POST & CROSS-POST STUDIO ── */}
      {activeTab === 'post' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          
          {/* Left: Setup Local Update / Offer Post */}
          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(234, 67, 53, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={18} color="#EA4335" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>1. Compose Google Maps Local Update</h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                Publish local SEO updates &amp; offers to Google Maps profile so local Katargam &amp; Surat searchers discover Shree Beauty Studio first!
              </p>
            </div>

            {/* Attach Photo (Camera / Gallery for iPhone & Android) */}
            <div>
              <label className="label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                📸 Attach Photo or Offer Banner:
              </label>

              {/* Hidden File Inputs */}
              <input
                ref={postFileInputRef}
                type="file"
                accept="image/*,image/heic,image/heif"
                onChange={handlePostImageSelect}
                style={{ display: 'none' }}
              />
              <input
                ref={postCameraInputRef}
                type="file"
                capture="environment"
                accept="image/*"
                onChange={handlePostImageSelect}
                style={{ display: 'none' }}
              />

              {postImagePreview ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', maxHeight: 220 }}>
                  <img src={postImagePreview} alt="Attached Preview" style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => {
                      setPostImagePreview(null);
                      setPostImageFile(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => postFileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, flex: 1, minHeight: 40 }}
                  >
                    <ImageIcon size={14} color="#4285F4" /> 🖼️ Gallery / Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => postCameraInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, flex: 1, minHeight: 40 }}
                  >
                    <Camera size={14} color="#EA4335" /> 📸 Take Camera Photo
                  </button>
                </div>
              )}
            </div>

            {/* Post Category */}
            <div>
              <label className="label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>
                💄 Target Service / Local Offer Category:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                {[
                  { id: 'bridal', label: '👑 Royal Bridal HD' },
                  { id: 'sagai', label: '💍 Sagai & Ring Ceremony' },
                  { id: 'hairbotox', label: '💇‍♀️ Hair Botox & Nano' },
                  { id: 'facial', label: '✨ Hydra Facial Glass Skin' },
                  { id: 'offer', label: '🎉 Festival / Promo Offer' },
                  { id: 'general', label: '🌸 100% Ladies Salon' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPostCategory(cat.id as any)}
                    className={`btn btn-xs ${postCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      fontSize: 11,
                      fontWeight: postCategory === cat.id ? 800 : 600,
                      background: postCategory === cat.id ? 'linear-gradient(45deg, #4285F4, #34A853)' : undefined,
                      color: postCategory === cat.id ? '#fff' : undefined,
                      border: postCategory === cat.id ? 'none' : undefined,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Button Type */}
            <div>
              <label className="label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                🔘 Call-to-Action (CTA) Button on Google Maps:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
                {[
                  { id: 'book', label: '📅 Book Online' },
                  { id: 'call', label: '📞 Call Studio' },
                  { id: 'whatsapp', label: '💬 WhatsApp Us' },
                  { id: 'offer', label: '🎁 View Offer' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPostCta(c.id as any)}
                    className={`btn btn-xs ${postCta === c.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: 10.5, fontWeight: postCta === c.id ? 800 : 500 }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes / Offer terms */}
            <div>
              <label className="label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                ✍️ Custom details or discount rate (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. 20% off on Pre-Bridal package this month, free haircut..."
                value={postDetails}
                onChange={(e) => setPostDetails(e.target.value)}
                className="input input-xs"
              />
            </div>
          </div>

          {/* Right: Live Google Local Post Preview & Actions */}
          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} color="#4285F4" />
                <span style={{ fontSize: 14, fontWeight: 800 }}>2. Google Business Profile Post Preview</span>
              </div>
              <button
                type="button"
                onClick={() => safeCopy(generatedGooglePostContent, 'copy-gpost-msg')}
                className="btn btn-secondary btn-xs"
                style={{ fontWeight: 700 }}
              >
                {copiedId === 'copy-gpost-msg' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                Copy Post Text
              </button>
            </div>

            {/* Google Post Card Mockup */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid rgba(66, 133, 244, 0.3)',
                boxShadow: '0 4px 16px rgba(66, 133, 244, 0.08)',
                overflow: 'hidden',
              }}
            >
              {postImagePreview && (
                <img src={postImagePreview} alt="Post Banner" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              )}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34A853' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4285F4' }}>Google Local Pack Update</span>
                  <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>• Katargam, Surat</span>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#1f2937' }}>
                  {generatedGooglePostContent}
                </div>
              </div>
            </div>

            {/* 1-Click Publishing / Cross-Posting Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  safeCopy(generatedGooglePostContent, 'copy-gpost-and-open');
                  window.open('https://business.google.com/locations', '_blank', 'noopener,noreferrer');
                  toast('📋 Post text copied! Opening Google Business Profile...', 'success');
                }}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(45deg, #4285F4, #34A853)',
                  border: 'none',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  fontSize: 14,
                  minHeight: 44,
                }}
              >
                <ExternalLink size={16} /> 📋 Copy &amp; Open Google Business Profile ↗
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Link
                  href="/admin/instagram"
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 }}
                  title="Open Instagram Studio to auto-post this update"
                >
                  <Instagram size={14} color="#E1306C" />
                  Cross-Post to Instagram
                </Link>

                <button
                  type="button"
                  onClick={() => nativeShare('Shree Beauty Studio Offer', generatedGooglePostContent)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 }}
                >
                  <Share2 size={14} color="#25D366" />
                  Share via Mobile
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 3: SMART 1-CLICK WHATSAPP REVIEW BOOSTER (PRE-FILLED SEO KEYWORDS) ── */}
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
                style={{ width: '100%', minHeight: 38 }}
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
                onClick={() => safeCopy(reviewBoosterMessage, 'copy-booster-msg')}
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

            {/* 1-Click Send Buttons for iPhone & Android */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  const mobile = clientMobile.replace(/\D/g, '');
                  if (!mobile) {
                    toast('⚠️ Please enter client mobile number first!', 'error');
                    return;
                  }
                  openWAApp(mobile, reviewBoosterMessage);
                  toast('📱 Opened WhatsApp!', 'success');
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
                  minHeight: 44,
                }}
              >
                <MessageCircle size={16} /> Send via WhatsApp (Instant 1-Click)
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const mobile = clientMobile.replace(/\D/g, '');
                    if (!mobile) {
                      toast('⚠️ Please enter client mobile number first!', 'error');
                      return;
                    }
                    openWAWeb(mobile, reviewBoosterMessage);
                    toast('🚀 Opened WhatsApp Web!', 'success');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 38 }}
                >
                  <Globe size={14} /> WhatsApp Web
                </button>

                <button
                  type="button"
                  onClick={() => nativeShare(`Review Request for ${salonName}`, reviewBoosterMessage)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 38 }}
                >
                  <Share2 size={14} color="#4285F4" /> Share via Mobile
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 4: KATARGAM LOCAL SEO KEYWORD BANK ── */}
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Type new target keyword (e.g. Panetar Makeover, Keratin Surat)..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                className="input input-sm"
                style={{ flex: 1, minWidth: 220 }}
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800, minHeight: 38 }}
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

      {/* ── TAB 5: SETTINGS & SAFETY FILTER ── */}
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
                    style={{ fontSize: 11.5, fontWeight: autoReplyTone === t.id ? 800 : 500, minHeight: 38 }}
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
                style={{ width: '100%', minHeight: 38 }}
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
                style={{ width: '100%', minHeight: 38 }}
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
                minHeight: 44,
              }}
            >
              💾 Save Google Map Settings
            </button>
          </div>
        </motion.div>
      )}

      {/* ── TAB 6: PRINTABLE RECEPTION QR CODE ── */}
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
                minHeight: 44,
              }}
            >
              <Printer size={16} /> Print Reception Desk Standee
            </button>
          </div>
        </motion.div>
      )}

      {/* ── ADD / PASTE NEW GOOGLE REVIEW MODAL ── */}
      <AnimatePresence>
        {addReviewModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setAddReviewModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{
                width: '100%',
                maxWidth: 520,
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: 18,
                padding: 24,
                background: '#ffffff',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--foreground)' }}>
                    <Star size={18} fill="#eab308" color="#eab308" />
                    Add / Paste New Google Review
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>
                    Add your newest Google review so it appears at the top (Recent First)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddReviewModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted-foreground)' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Reviewer Name */}
                <div>
                  <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Client / Reviewer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja Patel, Kinjal Shah..."
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                    className="input input-sm"
                    style={{ width: '100%', minHeight: 38 }}
                  />
                </div>

                {/* Rating & Recency Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      Star Rating
                    </label>
                    <select
                      value={reviewForm.rating}
                      onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                      className="input input-sm"
                      style={{ width: '100%', minHeight: 38, fontWeight: 700 }}
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ 5.0 (Recommended)</option>
                      <option value={4}>⭐⭐⭐⭐ 4.0</option>
                      <option value={3}>⭐⭐⭐ 3.0</option>
                    </select>
                  </div>

                  <div>
                    <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      Recency / Date
                    </label>
                    <select
                      value={reviewForm.timeAgo}
                      onChange={(e) => setReviewForm({ ...reviewForm, timeAgo: e.target.value })}
                      className="input input-sm"
                      style={{ width: '100%', minHeight: 38 }}
                    >
                      <option value="now">⚡ Just now (Top of list)</option>
                      <option value="today">📅 Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="2d">2 days ago</option>
                      <option value="1w">1 week ago</option>
                      <option value="1m">1 month ago</option>
                    </select>
                  </div>
                </div>

                {/* Service Tag */}
                <div>
                  <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Service / Category Tag
                  </label>
                  <select
                    value={reviewForm.role}
                    onChange={(e) => setReviewForm({ ...reviewForm, role: e.target.value })}
                    className="input input-sm"
                    style={{ width: '100%', minHeight: 38 }}
                  >
                    <option value="Bridal Services · Surat">👑 Bridal Services · Surat</option>
                    <option value="HD Bridal Makeup & Hair">💄 HD Bridal Makeup &amp; Hair</option>
                    <option value="Hair Botox & Keratin · Surat">💆 Hair Botox &amp; Keratin · Surat</option>
                    <option value="Hydra Facial Glow · Katargam">✨ Hydra Facial Glow · Katargam</option>
                    <option value="Hair Colour & Cut · Surat">💇 Hair Colour &amp; Cut · Surat</option>
                    <option value="Regular Client · Surat">⭐ Regular Client · Surat</option>
                    <option value="Google Verified Review">✓ Google Verified Review</option>
                  </select>
                </div>

                {/* Review Text */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label className="label" style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
                      Review Text *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewForm({
                          ...reviewForm,
                          text: 'I had an amazing experience at Shree Beauty Studio! The bridal makeup and hairstyling was flawless, and the staff was extremely friendly and professional. Best salon in Katargam!',
                        })
                      }
                      style={{ background: 'none', border: 'none', fontSize: 11, color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Use Sample Text
                    </button>
                  </div>
                  <textarea
                    required
                    rows={4}
                    placeholder="Paste review from Google Maps (e.g. Loved the service! My bridal makeup and hair were perfect...)"
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                    className="input input-sm"
                    style={{ width: '100%', padding: '10px 12px', lineHeight: 1.5 }}
                  />
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setAddReviewModalOpen(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: 38 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{
                      background: 'linear-gradient(45deg, #16a34a, #059669)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 800,
                      minHeight: 38,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Check size={15} />
                    Save &amp; Show at Top (Recent)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
