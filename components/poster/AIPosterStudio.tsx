'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Download,
  Share2,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Instagram,
  MapPin,
  Star,
  Flame,
  Zap,
  RotateCcw,
  Sliders,
  ZoomIn,
  Tag,
  Palette,
  Layers,
  Phone,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Send,
  Wand2,
  Bot,
  Mic,
  MicOff,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { openWAWeb, openWAApp } from '@/lib/whatsapp';

export type PosterCategory =
  | 'bridal'
  | 'hair'
  | 'skin'
  | 'nails'
  | 'festive'
  | 'review'
  | 'package';

export type PosterAspectRatio = '9:16' | '1:1' | '4:5' | '16:9';

export type PosterTheme =
  | 'emerald_gold'
  | 'royal_velvet'
  | 'champagne_black'
  | 'rose_blush'
  | 'modern_teal';

interface PresetData {
  title: string;
  gujaratiTitle: string;
  subtitle: string;
  tagline: string;
  badge: string;
  features: string[];
  priceTag: string;
}

const CATEGORY_PRESETS: Record<PosterCategory, PresetData> = {
  bridal: {
    title: '👑 Royal HD Bridal Makeover',
    gujaratiTitle: 'સુરતની શ્રેષ્ઠ રોયલ દુલ્હન મેકઓવર',
    subtitle: 'Luxury Bridal, Engagement & Reception Look in Katargam',
    tagline: 'Your Dream Wedding Look With Perfection & Royalty',
    badge: '👑 BOOKING OPEN 2026',
    features: [
      '✨ HD Waterproof & Airbrush Finish',
      '✨ Designer Hair Styling & Saree Draping',
      '✨ International Cosmetics & Lashes Included',
    ],
    priceTag: 'Packages from ₹15,000 /-',
  },
  hair: {
    title: '💇 Silk Hair Botox & Nanoplastia',
    gujaratiTitle: 'વાળ માટે સ્મૂથ, સિલ્કી અને શાઈની ટ્રીટમેન્ટ',
    subtitle: 'Zero Frizz, Mirror Shine & 100% Formaldehyde-Free',
    tagline: 'Transform Dull Damaged Hair to Silky Smooth Perfection',
    badge: '⚡ FLAT 25% OFF',
    features: [
      '✨ 6 to 8 Months Lasting Frizz Control',
      '✨ Deep Keratin Protein Nourishment',
      '✨ Safe for Colored & Chemically Treated Hair',
    ],
    priceTag: 'Starting @ ₹3,499 /-',
  },
  skin: {
    title: '✨ Hydra Facial & Glass Skin Glow',
    gujaratiTitle: 'ગ્લાસ સ્કિન ગોલ્ડ ફેશિયલ & ઈન્સ્ટન્ટ ગ્લો',
    subtitle: 'Medical-Grade 7-Step Deep Cleanse & Skin Hydration',
    tagline: 'Instant Radiant Glow For Parties, Weddings & Daily Care',
    badge: '🌟 INSTANT GLOW',
    features: [
      '✨ Blackhead & Dead Skin Removal',
      '✨ Deep Hyaluronic Serum Infusion',
      '✨ Ultrasonic Skin Tightening & Cryo Therapy',
    ],
    priceTag: 'Special Combo @ ₹1,999 /-',
  },
  nails: {
    title: '💅 Russian Nail Art & Extensions',
    gujaratiTitle: 'લેટેસ્ટ નેઇલ આર્ટ & એક્રેલિક એક્સટેન્શન',
    subtitle: 'Bridal Chrome, French Ombre & 3D Crystal Nail Designs',
    tagline: 'Long-Lasting Luxury Nails Crafted By Certified Nail Artists',
    badge: '💎 TRENDING NOW',
    features: [
      '✨ 4+ Weeks Chip-Free Gel Polish',
      '✨ Custom Bridal Crystal & Chrome Art',
      '✨ Quick, Safe & Painless Extension Removal',
    ],
    priceTag: 'Full Set From ₹1,499 /-',
  },
  festive: {
    title: '🎉 Festive Glam Makeover Dhamaka',
    gujaratiTitle: 'નવરાત્રિ & દિવાળી સ્પેશિયલ બ્યૂટી ઓફર',
    subtitle: 'Complete Head-To-Toe Festive Transformation Package',
    tagline: 'Shine Bright This Festive Season With Katargam’s #1 Studio',
    badge: '🔥 LIMITED 10 SLOTS',
    features: [
      '✨ Festive Glow Facial + Hair Spa Combo',
      '✨ Full Arms & Legs Waxing + D-Tan Care',
      '✨ Express Cleanup & Luxury Threading Free',
    ],
    priceTag: 'Mega Combo Only ₹2,499 /-',
  },
  review: {
    title: '⭐ 1,200+ 5-Star Reviews in Katargam',
    gujaratiTitle: 'કાતારગામનું સૌથી વિશ્વસનીય અને પસંદીદા સેલોન',
    subtitle: '“Best Bridal Makeup & Friendly Staff in Surat!”',
    tagline: 'Thank You Surat For Trusting Shree Beauty Studio',
    badge: '⭐ 4.9 ★ ON GOOGLE',
    features: [
      '✨ 10+ Years of Bridal & Hair Expertise',
      '✨ 100% Hygienic AC Studio & VIP Bridal Room',
      '✨ 99.4% Highly Satisfied Happy Clients',
    ],
    priceTag: 'Experience Luxury Today',
  },
  package: {
    title: '💍 Pre-Bridal & Groom Complete Care',
    gujaratiTitle: 'લગ્ન પહેલાં પ્રિ-બ્રાઇડલ સંપૂર્ણ કેર પેકેજ',
    subtitle: '1 Month Full Body Glow, Hair Spa, Pedicure & Polishing',
    tagline: 'Everything You Need Before Your Big Day Under One Roof',
    badge: '👑 PRE-BRIDAL VIP',
    features: [
      '✨ 4 Deep Sessions of Hydra Glow & D-Tan',
      '✨ Luxury Body Polishing & Brightening Bleach',
      '✨ Collagen Eye Therapy & Organic Waxing',
    ],
    priceTag: 'Complete VIP @ ₹8,999 /-',
  },
};

const THEME_STYLES: Record<
  PosterTheme,
  {
    name: string;
    bgGradient: string[];
    accentGold: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
  }
> = {
  emerald_gold: {
    name: 'Emerald & Gold (રોયલ એમરાલ્ડ)',
    bgGradient: ['#03262B', '#05424A', '#085C66'],
    accentGold: '#EABA38',
    cardBg: 'rgba(5, 66, 74, 0.75)',
    textPrimary: '#FFFFFF',
    textSecondary: '#F3E8FF',
    border: '#EABA38',
  },
  royal_velvet: {
    name: 'Crimson Velvet (બ્રાઇડલ વેલ્વેટ)',
    bgGradient: ['#3A0015', '#600727', '#881337'],
    accentGold: '#F59E0B',
    cardBg: 'rgba(96, 7, 39, 0.75)',
    textPrimary: '#FFFFFF',
    textSecondary: '#FFE4E6',
    border: '#FBBF24',
  },
  champagne_black: {
    name: 'Midnight Onyx & Gold (શેમ્પેઈન)',
    bgGradient: ['#0A0A0A', '#171717', '#262626'],
    accentGold: '#F3D279',
    cardBg: 'rgba(23, 23, 23, 0.85)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E5E5E5',
    border: '#DFBA67',
  },
  rose_blush: {
    name: 'Rose Gold Glam (રોઝ ગોલ્ડ)',
    bgGradient: ['#4C0519', '#701A75', '#4A044E'],
    accentGold: '#FDE047',
    cardBg: 'rgba(112, 26, 117, 0.75)',
    textPrimary: '#FFFFFF',
    textSecondary: '#FCE7F3',
    border: '#F472B6',
  },
  modern_teal: {
    name: 'Peacock Luxe (મોડર્ન ટીલ)',
    bgGradient: ['#042F2E', '#115E59', '#0F766E'],
    accentGold: '#FCD34D',
    cardBg: 'rgba(17, 94, 89, 0.75)',
    textPrimary: '#FFFFFF',
    textSecondary: '#CCFBF1',
    border: '#5EEAD4',
  },
};

const ARCHITECT_PROMPT_CHIPS = [
  { label: '👑 Royal Bridal 2026', prompt: 'Royal Bridal Makeover with HD waterproof finish and designer draping' },
  { label: '💇 Silk Hair Botox 25% OFF', prompt: 'Silk Hair Botox and Nanoplastia treatment with flat 25% discount and mirror shine' },
  { label: '✨ Glass Skin Hydra Facial @ ₹1,999', prompt: 'Hydra facial deep cleansing with instant Korean glass skin glow special combo @ 1999' },
  { label: '💅 Russian Nail Art Trending', prompt: 'Russian nail art and acrylic extensions with bridal chrome and crystal art from 1499' },
  { label: '🎉 Festive Special 30% OFF', prompt: 'Festive beauty makeover dhamaka with flat 30 percent discount and head-to-toe combo' },
  { label: '⭐ Google 1,200+ 5-Star Reviews', prompt: 'Google Maps 1200+ 5-Star reviews customer satisfaction spotlight poster' },
  { label: '💍 Pre-Bridal VIP Package', prompt: 'Pre-bridal 1 month complete full body glow and grooming package' },
];

export default function AIPosterStudio() {
  const { data } = useSalonStore();
  const { toast } = useToast();
  const settings = data?.settings;

  const salonName = settings?.salon || 'Shree Beauty Studio & Bridal Parlour';
  const salonAddress = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat';
  const salonPhone = settings?.phone2 || settings?.whatsapp || '9824183769';
  const salonPhoneSecondary = settings?.whatsapp || '9773240010';
  const instagramHandle = settings?.instagramHandle || '@shreebeauty.studio';
  const googleMapsUrl = settings?.googleMapsUrl || 'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8';

  // ── BRAND VISUAL ARCHITECT STATE (CHATGPT MODE) ──
  const [architectPrompt, setArchitectPrompt] = useState('');
  const [isArchitectGenerating, setIsArchitectGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [architectStrategy, setArchitectStrategy] = useState(
    'Visual Architect initialized. Enter any service, offer or campaign above to generate an optimized luxury salon poster.'
  );
  const [activeProvider, setActiveProvider] = useState('Brand Visual Architect AI');

  const handleArchitectGenerate = async (queryToUse?: string) => {
    const p = (queryToUse || architectPrompt).trim();
    if (!p) {
      toast('કૃપા કરીને તમે શું ઑફર કે પોસ્ટર બનાવવા માંગો છો તે લખો.', 'info');
      return;
    }

    setIsArchitectGenerating(true);
    try {
      const res = await fetch('/api/ai-poster/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.headline) setHeadline(d.headline);
        if (d.gujaratiHeadline) setGujaratiSubtitle(d.gujaratiHeadline);
        if (d.details) setDetails(d.details);
        if (d.tagline) setTagline(d.tagline);
        if (d.badge) setBadgeText(d.badge);
        if (d.priceTag) setPriceTag(d.priceTag);
        if (Array.isArray(d.features) && d.features.length > 0) setFeatureList(d.features);
        if (d.theme) setTheme(d.theme);
        if (d.aspectRatio) setAspectRatio(d.aspectRatio);
        if (d.category) setCategory(d.category);
        if (d.architectNotes) setArchitectStrategy(d.architectNotes);
        if (json.provider) setActiveProvider(json.provider);

        toast('✨ Brand Visual Architect: New luxury poster generated!', 'success');
      } else {
        toast('Could not generate visual architecture. Please try again.', 'error');
      }
    } catch {
      toast('Failed to reach Visual Architect. Check connection.', 'error');
    } finally {
      setIsArchitectGenerating(false);
    }
  };

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast('Voice recognition not supported in this browser. Please type your prompt.', 'info');
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = 'gu-IN';
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setArchitectPrompt(transcript);
          handleArchitectGenerate(transcript);
        }
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // State
  const [category, setCategory] = useState<PosterCategory>('bridal');
  const [aspectRatio, setAspectRatio] = useState<PosterAspectRatio>('9:16');
  const [theme, setTheme] = useState<PosterTheme>('emerald_gold');

  // Form Fields
  const [headline, setHeadline] = useState(CATEGORY_PRESETS.bridal.title);
  const [gujaratiSubtitle, setGujaratiSubtitle] = useState(CATEGORY_PRESETS.bridal.gujaratiTitle);
  const [details, setDetails] = useState(CATEGORY_PRESETS.bridal.subtitle);
  const [tagline, setTagline] = useState(CATEGORY_PRESETS.bridal.tagline);
  const [badgeText, setBadgeText] = useState(CATEGORY_PRESETS.bridal.badge);
  const [priceTag, setPriceTag] = useState(CATEGORY_PRESETS.bridal.priceTag);
  const [featureList, setFeatureList] = useState<string[]>(CATEGORY_PRESETS.bridal.features);

  // Toggles
  const [showBadge, setShowBadge] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showFeatures, setShowFeatures] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showRating, setShowRating] = useState(true);
  const [showOrnateBorder, setShowOrnateBorder] = useState(true);

  // Image Upload State
  const [userImage, setUserImage] = useState<HTMLImageElement | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePanY, setImagePanY] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Apply Category Preset
  const handleSelectCategory = (cat: PosterCategory) => {
    setCategory(cat);
    const p = CATEGORY_PRESETS[cat];
    setHeadline(p.title);
    setGujaratiSubtitle(p.gujaratiTitle);
    setDetails(p.subtitle);
    setTagline(p.tagline);
    setBadgeText(p.badge);
    setPriceTag(p.priceTag);
    setFeatureList([...p.features]);
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setUserImage(img);
      setImageZoom(1);
      setImagePanY(0);
      toast('✅ Photo loaded! Adjust zoom/pan or export your poster.', 'success');
    };
    img.src = url;
  };

  // Clear Photo
  const handleClearPhoto = () => {
    setUserImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast('Removed uploaded image. Switched to luxury procedural gradient backdrop.', 'info');
  };

  // Dimensions Map
  const getCanvasDimensions = useCallback((ratio: PosterAspectRatio) => {
    switch (ratio) {
      case '9:16':
        return { w: 1080, h: 1920, label: 'Story (9:16)' };
      case '1:1':
        return { w: 1080, h: 1080, label: 'Square (1:1)' };
      case '4:5':
        return { w: 1080, h: 1350, label: 'Portrait (4:5)' };
      case '16:9':
        return { w: 1920, h: 1080, label: 'Banner (16:9)' };
    }
  }, []);

  // ── RENDER CANVAS ENGINE ──
  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { w, h } = getCanvasDimensions(aspectRatio);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const curTheme = THEME_STYLES[theme];

    // 1. Draw Background
    if (userImage) {
      // Draw uploaded user photo with zoom & pan
      ctx.save();
      const imgAspect = userImage.width / userImage.height;
      const targetAspect = w / h;
      let drawW = w * imageZoom;
      let drawH = h * imageZoom;
      let drawX = (w - drawW) / 2;
      let drawY = (h - drawH) / 2 + imagePanY * 200;

      if (imgAspect > targetAspect) {
        drawW = drawH * imgAspect;
        drawX = (w - drawW) / 2;
      } else {
        drawH = drawW / imgAspect;
        drawY = (h - drawH) / 2 + imagePanY * 200;
      }

      ctx.drawImage(userImage, drawX, drawY, drawW, drawH);

      // Dark gradient overlay for extreme readability
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, h);
      overlayGrad.addColorStop(0, 'rgba(0, 0, 0, 0.70)');
      overlayGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.40)');
      overlayGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.65)');
      overlayGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } else {
      // Luxury Procedural Gradient Backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, w * 0.8, h);
      bgGrad.addColorStop(0, curTheme.bgGradient[0]);
      bgGrad.addColorStop(0.5, curTheme.bgGradient[1]);
      bgGrad.addColorStop(1, curTheme.bgGradient[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Radial Gold Glow in Center
      const radialGlow = ctx.createRadialGradient(w / 2, h * 0.45, 50, w / 2, h * 0.45, w * 0.7);
      radialGlow.addColorStop(0, 'rgba(234, 186, 56, 0.16)');
      radialGlow.addColorStop(0.5, 'rgba(234, 186, 56, 0.05)');
      radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, w, h);

      // Subtle Geometric Luxury Grid Accent
      ctx.save();
      ctx.strokeStyle = 'rgba(234, 186, 56, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      for (let j = 0; j < h; j += 80) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(w, j);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Ornate Border & Corner Filigree
    if (showOrnateBorder) {
      const inset = Math.round(w * 0.035);
      const innerW = w - inset * 2;
      const innerH = h - inset * 2;

      ctx.save();
      // Outer thin gold border
      ctx.strokeStyle = curTheme.accentGold;
      ctx.lineWidth = 3;
      ctx.strokeRect(inset, inset, innerW, innerH);

      // Inner hairline border
      ctx.strokeStyle = 'rgba(234, 186, 56, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(inset + 8, inset + 8, innerW - 16, innerH - 16);

      // 4 Corner Ornate Diamonds
      const cornerSize = 14;
      const corners = [
        [inset, inset],
        [inset + innerW, inset],
        [inset, inset + innerH],
        [inset + innerW, inset + innerH],
      ];
      ctx.fillStyle = curTheme.accentGold;
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - cornerSize);
        ctx.lineTo(cx + cornerSize, cy);
        ctx.lineTo(cx, cy + cornerSize);
        ctx.lineTo(cx - cornerSize, cy);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    // Dynamic Scale Factor based on width
    const scale = w / 1080;
    const padX = Math.round(w * 0.08);

    // ── 3. TOP BRANDING HEADER ──
    let curY = Math.round(h * 0.07);

    // Salon Crown & Name
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = curTheme.accentGold;
    ctx.font = `bold ${Math.round(26 * scale)}px sans-serif`;
    ctx.fillText('✨ ROYAL BRIDAL & BEAUTY STUDIO ✨', w / 2, curY);

    curY += Math.round(36 * scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(42 * scale)}px sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(salonName.toUpperCase(), w / 2, curY);

    curY += Math.round(28 * scale);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.font = `500 ${Math.round(22 * scale)}px sans-serif`;
    ctx.fillText('📍 KATARGAM, SURAT • GUJARAT', w / 2, curY);
    ctx.restore();

    // ── 4. OFFER BADGE ──
    if (showBadge && badgeText.trim()) {
      curY += Math.round(50 * scale);
      ctx.save();
      ctx.font = `bold ${Math.round(26 * scale)}px sans-serif`;
      const badgeW = ctx.measureText(badgeText).width + 60 * scale;
      const badgeH = 46 * scale;
      const badgeX = (w - badgeW) / 2;

      // Badge Glow & Fill
      ctx.shadowColor = curTheme.accentGold;
      ctx.shadowBlur = 18;
      ctx.fillStyle = curTheme.accentGold;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(badgeX, curY - 32 * scale, badgeW, badgeH, 24 * scale);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, curY - 32 * scale, badgeW, badgeH);
      }

      ctx.fillStyle = '#052A2F';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, w / 2, curY);
      ctx.restore();
    }

    // ── 5. MAIN HEADLINE & GUJARATI SUBTITLE ──
    curY += Math.round(75 * scale);
    ctx.save();
    ctx.textAlign = 'center';

    // Gujarati Subtitle Pill
    if (gujaratiSubtitle.trim()) {
      ctx.fillStyle = 'rgba(234, 186, 56, 0.95)';
      ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
      ctx.fillText(gujaratiSubtitle, w / 2, curY);
      curY += Math.round(44 * scale);
    }

    // Main Big Bold Headline
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(52 * scale)}px sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 20;

    // Word Wrap Headline
    const words = headline.split(' ');
    let line = '';
    const maxHeadlineWidth = w - padX * 2;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxHeadlineWidth && n > 0) {
        ctx.fillText(line.trim(), w / 2, curY);
        line = words[n] + ' ';
        curY += Math.round(62 * scale);
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), w / 2, curY);

    // English Details / Subtitle
    if (details.trim()) {
      curY += Math.round(36 * scale);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.font = `600 ${Math.round(24 * scale)}px sans-serif`;
      ctx.fillText(details, w / 2, curY);
    }
    ctx.restore();

    // ── 6. FEATURES GLASS CARD ──
    if (showFeatures && featureList.length > 0) {
      curY += Math.round(55 * scale);
      const cardW = w - padX * 2;
      const cardH = (featureList.length * 44 + 40) * scale;
      const cardX = padX;

      ctx.save();
      // Glass card fill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.strokeStyle = 'rgba(234, 186, 56, 0.45)';
      ctx.lineWidth = 1.5;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(cardX, curY, cardW, cardH, 16 * scale);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(cardX, curY, cardW, cardH);
        ctx.strokeRect(cardX, curY, cardW, cardH);
      }

      // Feature items
      let featY = curY + 36 * scale;
      ctx.textAlign = 'left';
      ctx.font = `bold ${Math.round(24 * scale)}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';

      featureList.forEach((feat) => {
        ctx.fillText(feat, cardX + 30 * scale, featY);
        featY += 44 * scale;
      });

      curY += cardH;
      ctx.restore();
    }

    // ── 7. PRICE TAG ──
    if (showPrice && priceTag.trim()) {
      curY += Math.round(50 * scale);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.round(38 * scale)}px sans-serif`;
      ctx.fillStyle = curTheme.accentGold;
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 15;
      ctx.fillText(priceTag, w / 2, curY);
      ctx.restore();
    }

    // ── 8. BOTTOM BRANDING & CONTACT FOOTER ──
    const footerY = h - Math.round(150 * scale);

    ctx.save();
    // Dark bottom gradient backing
    const footerGrad = ctx.createLinearGradient(0, footerY - 50 * scale, 0, h);
    footerGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    footerGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
    footerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = footerGrad;
    ctx.fillRect(0, footerY - 50 * scale, w, h - (footerY - 50 * scale));

    ctx.textAlign = 'center';

    // Google Maps 5-Star Rating Pill
    if (showRating) {
      ctx.font = `bold ${Math.round(22 * scale)}px sans-serif`;
      ctx.fillStyle = '#FBBF24';
      ctx.fillText('⭐⭐⭐⭐⭐ 4.9 / 5.0 Rating • 1,200+ Happy Katargam Clients', w / 2, footerY);
    }

    // Phone / WhatsApp CTA
    if (showContact) {
      ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`💬 Call & WhatsApp: +91 ${salonPhone} / ${salonPhoneSecondary}`, w / 2, footerY + 38 * scale);
    }

    // Address & Instagram
    if (showAddress) {
      ctx.font = `500 ${Math.round(20 * scale)}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(`📍 ${salonAddress}`, w / 2, footerY + 70 * scale);
      ctx.fillText(`Instagram: ${instagramHandle} • Book Online: shreebeauty.studio`, w / 2, footerY + 98 * scale);
    }

    ctx.restore();
  }, [
    aspectRatio,
    theme,
    headline,
    gujaratiSubtitle,
    details,
    tagline,
    badgeText,
    priceTag,
    featureList,
    showBadge,
    showPrice,
    showFeatures,
    showAddress,
    showContact,
    showRating,
    showOrnateBorder,
    userImage,
    imageZoom,
    imagePanY,
    salonName,
    salonAddress,
    salonPhone,
    salonPhoneSecondary,
    instagramHandle,
    getCanvasDimensions,
  ]);

  // Redraw when dependencies change
  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  // ── EXPORT HD IMAGE ──
  const handleDownload = (format: 'png' | 'jpeg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    try {
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, 0.95);
      const link = document.createElement('a');
      link.download = `shree-beauty-poster-${category}-${aspectRatio.replace(':', 'x')}.${format}`;
      link.href = dataUrl;
      link.click();
      toast(`✅ High-Res ${format.toUpperCase()} Poster downloaded successfully!`, 'success');
    } catch (err) {
      toast('Failed to download image. Try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // ── COPY AI CAPTION & HASHTAGS ──
  const getFullCaption = () => {
    return `👑 ${headline} — ${salonName}
${gujaratiSubtitle}

✨ ${details}
${tagline}

${featureList.map((f) => `✔ ${f}`).join('\n')}

${priceTag ? `💰 ${priceTag}` : ''}
${badgeText ? `🔥 ${badgeText}` : ''}

📍 Studio Address:
${salonAddress}
Google Maps: ${googleMapsUrl}

📲 Appointments & Inquiries:
Call / WhatsApp: +91 ${salonPhone} / ${salonPhoneSecondary}
Instagram: ${instagramHandle}

#ShreeBeautyStudio #KatargamSalon #SuratBeautyParlour #SuratBridalMakeup #BridalMakeoverSurat #HairBotoxKatargam #SuratMakeupArtist #Katargam #SuratSalonOffers`;
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(getFullCaption());
    setCopiedCaption(true);
    toast('📋 AI Social & WhatsApp Caption copied to clipboard!', 'success');
    setTimeout(() => setCopiedCaption(false), 3000);
  };

  // ── SHARE VIA WHATSAPP ──
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(getFullCaption());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── HEADER BANNER ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #05424A 0%, #085C66 50%, #03262B 100%)',
          borderRadius: 20,
          padding: '24px 28px',
          color: '#fff',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(5, 66, 74, 0.25)',
          border: '1px solid rgba(234, 186, 56, 0.35)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'linear-gradient(45deg, #EABA38, #F3D279)',
                color: '#05424A',
                fontWeight: 900,
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 20,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Sparkles size={12} />
              AI LUXURY POSTER STUDIO
            </span>
            <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.75)' }}>
              1-Click Luxury Salon Flyers, Instagram Stories & Offer Banners
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
            🎨 AI Poster Studio (એઆઈ પોસ્ટર મેકર)
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(255, 255, 255, 0.85)', maxWidth: 800 }}>
            તમારા સેલોનની બ્રાઇડલ સર્વિસ, હેર બોટોક્સ, ગ્લાસ સ્કિન ફેશિયલ કે તહેવારોની સ્પેશિયલ ઓફર માટે પ્રોફેશનલ HD પોસ્ટર બનાવો. 1-ક્લિકમાં ડાઉનલોડ કરો અને Instagram, WhatsApp તથા Google Maps પર શેર કરો!
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleDownload('png')}
              disabled={isExporting}
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(45deg, #EABA38 0%, #D49B20 100%)',
                color: '#05424A',
                fontWeight: 800,
                border: 'none',
                boxShadow: '0 4px 12px rgba(234, 186, 56, 0.35)',
              }}
            >
              <Download size={15} />
              Download Ultra HD (PNG)
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="btn btn-secondary btn-sm"
              style={{
                background: '#25D366',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
              }}
            >
              <MessageCircle size={15} />
              Share to WhatsApp
            </button>
            <button
              onClick={handleCopyCaption}
              className="btn btn-secondary btn-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 600,
              }}
            >
              {copiedCaption ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              {copiedCaption ? 'Caption Copied!' : 'Copy AI Caption'}
            </button>
            <Link
              href="/admin/instagram"
              className="btn btn-secondary btn-sm"
              style={{
                background: 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
              }}
            >
              <Instagram size={14} />
              Open Instagram Auto Hub
            </Link>
          </div>
        </div>
      </div>

      {/* ── BRAND VISUAL ARCHITECT AI PROMPT BAR (CHATGPT MODE) ── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0d1e23 0%, #05262c 50%, #02161a 100%)',
          borderRadius: 20,
          padding: '24px 28px',
          border: '1.5px solid rgba(234, 186, 56, 0.45)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #EABA38 0%, #D49B20 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(234, 186, 56, 0.4)',
                flexShrink: 0,
              }}
            >
              <Bot size={24} color="#05262c" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: '#fff', letterSpacing: -0.3 }}>
                  Brand Visual Architect
                </h2>
                <span
                  style={{
                    background: 'rgba(234, 186, 56, 0.15)',
                    border: '1px solid rgba(234, 186, 56, 0.4)',
                    color: '#EABA38',
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 20,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  ⚡ CHATGPT ARCHITECT ENGINE
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                ChatGPT Brand Visual Architect ની જેમ માત્ર તમારી ઑફર કે વિચાર લખો — AI આપોઆપ ટાઇટલ, ગુજરાતી લાઇન, લક્ઝરી કલર્સ &amp; બેજ બનાવી આપશે!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 11.5,
                color: '#34d399',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 700,
                background: 'rgba(52, 211, 153, 0.1)',
                padding: '4px 10px',
                borderRadius: 12,
                border: '1px solid rgba(52, 211, 153, 0.25)',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
              {activeProvider}
            </span>
          </div>
        </div>

        {/* Architect Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleArchitectGenerate();
          }}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1.5px solid rgba(234, 186, 56, 0.4)',
            borderRadius: 14,
            padding: '8px 10px',
            marginBottom: 14,
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ paddingLeft: 8, display: 'flex', alignItems: 'center', color: '#EABA38' }}>
            <Wand2 size={20} />
          </div>
          <input
            type="text"
            value={architectPrompt}
            onChange={(e) => setArchitectPrompt(e.target.value)}
            placeholder="તમારે જે પોસ્ટર બનાવવું હોય તે અહીં લખો... (દા.ત. 'નવરાત્રિ 25% ડિસ્કાઉન્ટ વાળું પોસ્ટર' અથવા 'Hair Botox @ ₹2,999')"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: 14.5,
              fontWeight: 600,
            }}
          />

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            title={isListening ? 'સાંભળે છે...' : 'બોલીને લખાવો (Voice Input)'}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
              border: isListening ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isListening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isArchitectGenerating}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(45deg, #EABA38 0%, #D49B20 100%)',
              color: '#05262c',
              fontWeight: 900,
              border: 'none',
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              cursor: isArchitectGenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(234, 186, 56, 0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={16} />
            {isArchitectGenerating ? 'આર્કિટેક્ટ વિચારે છે...' : 'Architect My Poster'}
          </button>
        </form>

        {/* Quick Inspiration Chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#EABA38', marginRight: 4, textTransform: 'uppercase' }}>
            Quick Prompts:
          </span>
          {ARCHITECT_PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setArchitectPrompt(chip.prompt);
                handleArchitectGenerate(chip.prompt);
              }}
              disabled={isArchitectGenerating}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: 'rgba(255, 255, 255, 0.92)',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Architect Strategy Note */}
        {architectStrategy && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(234, 186, 56, 0.08)',
              border: '1px solid rgba(234, 186, 56, 0.25)',
              color: '#FDE047',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.4,
            }}
          >
            <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: '#EABA38' }}>Architect Strategy: </strong>
              <span>{architectStrategy}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN WORKSTATION: CONTROLS & PREVIEW ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 460px) 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* ── LEFT COLUMN: CONTROLS & PRESETS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Category Presets Selector */}
          <div className="card" style={{ padding: 18, borderRadius: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#EABA38" />
              1. Choose Category (પોસ્ટર કેટેગરી પસંદ કરો)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(Object.keys(CATEGORY_PRESETS) as PosterCategory[]).map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    type="button"
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #05424A' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(5, 66, 74, 0.08)' : 'var(--card-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13, color: isSelected ? '#05424A' : 'inherit' }}>
                      {CATEGORY_PRESETS[cat].title.split(' ')[0]} {cat.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {CATEGORY_PRESETS[cat].gujaratiTitle.substring(0, 26)}...
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Aspect Ratio & Dimensions */}
          <div className="card" style={{ padding: 18, borderRadius: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={16} color="#0284c7" />
              2. Canvas Size & Format (માપ પસંદ કરો)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['9:16', '1:1', '4:5', '16:9'] as PosterAspectRatio[]).map((ratio) => {
                const isSelected = aspectRatio === ratio;
                const dim = getCanvasDimensions(ratio);
                return (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    type="button"
                    style={{
                      padding: '8px 4px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid #05424A' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(5, 66, 74, 0.1)' : 'var(--card-bg)',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13, color: isSelected ? '#05424A' : 'inherit' }}>
                      {ratio}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {dim.label.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Luxury Color Theme */}
          <div className="card" style={{ padding: 18, borderRadius: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Palette size={16} color="#e11d48" />
              3. Luxury Color Theme (કલર થીમ)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.keys(THEME_STYLES) as PosterTheme[]).map((tKey) => {
                const t = THEME_STYLES[tKey];
                const isSelected = theme === tKey;
                return (
                  <button
                    key={tKey}
                    onClick={() => setTheme(tKey)}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid #05424A' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(5, 66, 74, 0.08)' : 'var(--card-bg)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: `linear-gradient(45deg, ${t.bgGradient[1]}, ${t.accentGold})`,
                        border: '1px solid rgba(0,0,0,0.2)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600 }}>{t.name}</span>
                    {isSelected && <Check size={16} color="#05424A" style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Photo Upload / Backdrop */}
          <div className="card" style={{ padding: 18, borderRadius: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Camera size={16} color="#059669" />
              4. Upload Salon Client Photo (તમારો ફોટો)
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />

            {!userImage ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '24px 16px',
                  borderRadius: 12,
                  border: '2px dashed var(--border)',
                  background: 'rgba(5, 66, 74, 0.03)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <UploadCloudIcon />
                <div style={{ fontWeight: 800, fontSize: 14, marginTop: 8 }}>
                  Click to Upload Client / Makeover Photo
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  PNG, JPG up to 25MB • Background is automatically filtered
                </div>
              </button>
            ) : (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 8,
                    borderRadius: 10,
                    background: 'rgba(5, 66, 74, 0.05)',
                    marginBottom: 10,
                  }}
                >
                  <img
                    src={imagePreviewUrl || ''}
                    alt="Uploaded client"
                    style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#05424A' }}>Photo Loaded</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Ready on canvas</div>
                  </div>
                  <button
                    onClick={handleClearPhoto}
                    className="btn btn-secondary btn-xs"
                    style={{ color: '#ef4444' }}
                  >
                    Remove
                  </button>
                </div>

                {/* Zoom & Pan Sliders */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                      Zoom ({Math.round(imageZoom * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.8"
                      max="2.5"
                      step="0.05"
                      value={imageZoom}
                      onChange={(e) => setImageZoom(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                      Position Up/Down
                    </label>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={imagePanY}
                      onChange={(e) => setImagePanY(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Poster Text & Offer Customization */}
          <div className="card" style={{ padding: 18, borderRadius: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag size={16} color="#7c3aed" />
              5. Edit Poster Text & Offer (લખાણ બદલો)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Poster Main Title (મુખ્ય ટાઇટલ)
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="input input-sm"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Gujarati Subtitle (ગુજરાતી સબટાઇટલ)
                </label>
                <input
                  type="text"
                  value={gujaratiSubtitle}
                  onChange={(e) => setGujaratiSubtitle(e.target.value)}
                  className="input input-sm"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Details / English Subtitle
                </label>
                <input
                  type="text"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="input input-sm"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Offer Badge Text
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="input input-sm"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Price / Deal Text
                  </label>
                  <input
                    type="text"
                    value={priceTag}
                    onChange={(e) => setPriceTag(e.target.value)}
                    className="input input-sm"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Bullet Features */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Feature Bullet Points (૧-૨-૩ મુદ્દા)
                </label>
                {featureList.map((f, i) => (
                  <input
                    key={i}
                    type="text"
                    value={f}
                    onChange={(e) => {
                      const updated = [...featureList];
                      updated[i] = e.target.value;
                      setFeatureList(updated);
                    }}
                    className="input input-sm"
                    style={{ width: '100%', marginBottom: 6 }}
                  />
                ))}
              </div>

              {/* Display Toggles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.03)',
                }}
              >
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showBadge}
                    onChange={(e) => setShowBadge(e.target.checked)}
                  />
                  Offer Badge
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                  />
                  Price Tag
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showFeatures}
                    onChange={(e) => setShowFeatures(e.target.checked)}
                  />
                  Features Box
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showOrnateBorder}
                    onChange={(e) => setShowOrnateBorder(e.target.checked)}
                  />
                  Gold Filigree Border
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showRating}
                    onChange={(e) => setShowRating(e.target.checked)}
                  />
                  5-Star Google Badge
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showContact}
                    onChange={(e) => setShowContact(e.target.checked)}
                  />
                  Phone & Address
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: INTERACTIVE PREVIEW & ACTIONS ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div
            className="card"
            style={{
              padding: 20,
              borderRadius: 20,
              background: '#0d151c',
              border: '1px solid rgba(234, 186, 56, 0.3)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                color: '#fff',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={16} color="#EABA38" />
                  Live HD Canvas Preview
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  {getCanvasDimensions(aspectRatio).label} • Crisp Retina Export
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleDownload('png')}
                  className="btn btn-primary btn-xs"
                  style={{
                    background: 'linear-gradient(45deg, #EABA38 0%, #D49B20 100%)',
                    color: '#05424A',
                    fontWeight: 800,
                  }}
                >
                  <Download size={13} />
                  PNG (Ultra HD)
                </button>
                <button
                  onClick={() => handleDownload('jpeg')}
                  className="btn btn-secondary btn-xs"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                  }}
                >
                  JPG
                </button>
              </div>
            </div>

            {/* Canvas Box */}
            <div
              style={{
                maxHeight: '68vh',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#050a0e',
                borderRadius: 14,
                padding: 12,
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxHeight: '64vh',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: 10,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              />
            </div>

            {/* Quick Export Action Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                onClick={() => handleDownload('png')}
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  background: 'linear-gradient(45deg, #EABA38 0%, #D49B20 100%)',
                  color: '#05424A',
                  fontWeight: 900,
                  border: 'none',
                  padding: '10px 12px',
                }}
              >
                <Download size={15} />
                Download HD
              </button>

              <button
                onClick={handleWhatsAppShare}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  padding: '10px 12px',
                }}
              >
                <MessageCircle size={15} />
                WhatsApp Share
              </button>

              <button
                onClick={handleCopyCaption}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  fontWeight: 700,
                  padding: '10px 12px',
                }}
              >
                {copiedCaption ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                {copiedCaption ? 'Copied!' : 'Copy Caption'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadCloudIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#05424A" strokeWidth="1.75" style={{ margin: '0 auto' }}>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}
