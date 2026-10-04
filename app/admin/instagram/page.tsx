'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Instagram,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Share2,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Settings,
  Search,
  Zap,
  Globe,
  Send,
  CheckCircle2,
  TrendingUp,
  X,
  Phone,
  Layers,
  UploadCloud,
  Play,
  Pause,
  Eye,
  PlusCircle,
  Video,
  FileText,
  Smartphone,
  Flame,
  Star,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { useToast } from '@/components/ui/Toast';
import { openWAWeb, openWAApp } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';

interface InstagramPost {
  id: string;
  shortcode: string;
  type: 'reel' | 'photo';
  thumbnail: string;
  mediaUrl: string;
  embedUrl: string | null;
  caption: string;
  likes: number;
  comments: number;
  permalink: string;
  timestamp: string;
}

type TabType = 'upload' | 'studio' | 'feed' | 'crosspost' | 'settings';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultipleRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default function InstagramHubPage() {
  const { data, setData } = useSalonStore();
  const { toast } = useToast();
  const settings = data.settings;
  const customers = data.customers || [];

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'reel' | 'photo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostForShare, setSelectedPostForShare] = useState<InstagramPost | null>(null);

  // ── DIRECT UPLOADER & PUBLISHER STATE ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMediaType, setUploadMediaType] = useState<'reel' | 'photo'>('reel');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<boolean | null>(null);
  const [publishMessage, setPublishMessage] = useState<string>('');

  // AI Caption Studio State
  const [captionCategory, setCaptionCategory] = useState<'bridal' | 'hydrafacial' | 'hair' | 'nails' | 'festival' | 'review'>('bridal');
  const [captionLanguage, setCaptionLanguage] = useState<'english' | 'hinglish' | 'gujarati'>('hinglish');
  const [generationCount, setGenerationCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clientName, setClientName] = useState('');
  const [specialOffer, setSpecialOffer] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [lastHookUsed, setLastHookUsed] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Share Modal State
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState('');
  const [customShareMessage, setCustomShareMessage] = useState('');

  // Settings state
  const [handle, setHandle] = useState(settings?.instagramHandle || '@shreebeauty.studio');
  const [instaUrl, setInstaUrl] = useState(settings?.instagramUrl || 'https://www.instagram.com/shreebeauty.studio/');
  const [accountId, setAccountId] = useState(settings?.instagramAccountId || '17841408494357129');
  const [token, setToken] = useState(settings?.instagramAccessToken || '');
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch Instagram Feed
  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/instagram/feed');
      const json = await res.json();
      if (json.success && Array.isArray(json.posts)) {
        setPosts(json.posts);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Copy helper with animation
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast('📋 Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── INFINITE NON-REPEATING CAPTION GENERATOR ──
  const generateInfiniteCaption = useCallback(() => {
    const salonName = settings?.salon || 'Shree Beauty Studio';
    const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
    const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
    const nameStr = clientName.trim() ? clientName.trim() : 'our gorgeous bride';
    const offerStr = specialOffer.trim() ? `\n\n🎉 Limited Privilege Offer: ${specialOffer.trim()}` : '';

    const DATA: Record<string, {
      hooks: { hinglish: string[]; gujarati: string[]; english: string[] };
      bodies: { hinglish: string[]; gujarati: string[]; english: string[] };
      technique: { hinglish: string[]; gujarati: string[]; english: string[] };
      hashtags: string[];
    }> = {
      bridal: {
        hooks: {
          hinglish: [
            `👑 Royal D-Day Transformation for ${nameStr} ✨`,
            `🔥 POV: You chose ${salonName} for your Dream Wedding Glam 👰💖`,
            `🥺 The moment she looked into the mirror and saw her dream bridal look come alive... ✨`,
            `✨ Pure luxury. Zero filter. Just 100% timeless bridal perfection on ${nameStr}! 💍`,
            `💄 Behind The Scenes: Crafting the signature royal glow for ${nameStr} 👑`,
            `🌟 Less is more: The modern clean-luxury Gujarati bridal aesthetic ✨`,
            `💎 D-Day Magic: When every brushstroke is crafted with love and passion at ${salonName} 👰`,
            `🪔 Traditional Gujarati Panetar & Royal Airbrush Radiance for ${nameStr} ✨`,
            `✨ Stop scrolling, Surat brides! Save this bridal transformation for your wedding moodboard 📌💫`,
            `💍 From Miss to Mrs: Celebrating our stunning bride ${nameStr} with royal bridal glam 🥂`,
            `🌸 Soft romantic curls, ethereal glass-skin glow, and regal veil setting on ${nameStr} 💖`,
          ],
          gujarati: [
            `👑 શ્રી બ્યૂટી સ્ટુડિયો રોયલ બ્રાઇડલ લુક: ${nameStr} ✨`,
            `🪔 પાનેતર અને કંકુ પગલાંનો અનોખો શાહી શણગાર: શ્રી બ્યૂટી સ્ટુડિયો 👰`,
            `💖 લગ્નના પવિત્ર દિવસે મેળવો 100% નેચરલ અને વોટરપ્રૂફ HD એરબ્રશ ગ્લો! ✨`,
            `🌸 સુરતની દરેક કન્યાનું સપનું: શ્રી બ્યૂટી સ્ટુડિયો રોયલ બ્રાઇડલ મેકઓવર 👑`,
            `💫 ${nameStr} માટે ખાસ કસ્ટમાઇઝ્ડ શાહી લુક અને પરફેક્ટ ચૂંદડી ડ્રેપિંગ! 💍`,
            `✨ કુદરતી સુંદરતા અને રોયલ ફિનિશિંગ સાથેનો અદભુત બ્રાઇડલ મેકઅપ 🪔`,
          ],
          english: [
            `👑 Timeless Elegance & Bridal Perfection for ${nameStr} ✨`,
            `✨ The Modern Indian Bride: Radiance, Grace & Bespoke Artistry at ${salonName} 👰`,
            `💄 The Art of Flawless, Flash-Ready Bridal Artistry on ${nameStr} 👑`,
            `🌟 Pure Bridal Royalty: Unfiltered glow that lasts through every emotional tear and smile 🤍`,
            `💍 Elevating natural beauty into a royal masterpiece for ${nameStr} ✨`,
            `👰 Every bride has a dream look—we bring it to life with precision & love at ${salonName} 💫`,
          ],
        },
        bodies: {
          hinglish: [
            `Ek bride ke sabse special din par uski natural beauty ko elevate karna is our pure passion. From customized HD airbrush glow to precision eye artistry and royal veil draping—every single detail crafted to perfection.`,
            `Zero cakey layers. 100% waterproof, sweatproof, and camera-ready magic! Designed to stay fresh through all the emotional moments, mandap pheras, and midnight reception spotlight.`,
            `Skin prep is the real secret! 45 minutes of customized skin hydration + lightweight waterproof coverage for that signature dewy royal radiance.`,
            `Soft champagne halo eyes, sculpted cheekbones, romantic floral hair artistry, and precision veil setting that turns heads all evening.`,
          ],
          gujarati: [
            `લગ્નના પવિત્ર દિવસે દરેક કન્યાનું સપનું હોય છે સૌથી સુંદર અને શાહી દેખાવું! શ્રી બ્યૂટી સ્ટુડિયો લાવે છે 100% વોટરપ્રૂફ HD એરબ્રશ મેકઅપ, પરફેક્ટ આઇ આર્ટ અને રોયલ ચૂંદડી ડ્રેપિંગ.`,
            `પરંપરાગત ગુજરાતી લગ્ન માટે ખાસ કસ્ટમાઇઝ્ડ બ્રાઇડલ પેકેજ. નેચરલ સ્કીન ગ્લો, સોફ્ટ હેરસ્ટાઇલ અને આખો દિવસ ટકી રહેતો એરબ્રશ લુક.`,
          ],
          english: [
            `Creating an ethereal, regal bridal glow that lasts through all the emotional moments and smiles. Mastered with luxury international cosmetics, weightless finish, and bespoke jewelry setting.`,
            `Sweatproof, HD flash-ready, and lightweight comfort all through your wedding rituals. Experience personalized bridal pampering with certified master artists in Surat.`,
          ],
        },
        technique: {
          hinglish: [`✨ HD Airbrush Finish | 100% Waterproof | Tear-Proof & Flash-Ready`],
          gujarati: [`✨ 100% વોટરપ્રૂફ એરબ્રશ | HD ફિનિશ | રોયલ ચૂંદડી & જ્વેલરી સેટિંગ`],
          english: [`✨ HD Airbrush Magic | Tear-Proof & Waterproof | Flash-Optimized`],
        },
        hashtags: [
          '#ShreeBeautyStudio', '#SuratBridalMakeup', '#SuratMakeupArtist', '#GujaratiBride', '#BridalMakeoverSurat',
          '#RoyalBride', '#SuratSalon', '#IndianWeddingBuzz', '#SuratBeautyStudio', '#WeddingGlam', '#KatargamSalon',
          '#BridalGlow', '#IndianBride', '#GlamByShree', '#SuratBridalStudio', '#BridalArtistSurat', '#TrendingSurat'
        ],
      },
      hydrafacial: {
        hooks: {
          hinglish: [
            `✨ 7-Step Korean Glass Skin HydraFacial Treatment 💧`,
            `💧 Why Every Bride & Groom Needs a HydraFacial Before D-Day! ✨`,
            `🌟 Instant Radiant Glow: Say goodbye to blackheads & dull skin! 🧖‍♀️`,
          ],
          gujarati: [
            `✨ 7-સ્ટેપ કોરિયન ગ્લાસ સ્કીન હાઇડ્રાફેશિયલ ટ્રીટમેન્ટ 💧`,
            `💧 ખીલ, બ્લેકહેડ્સ અને ટેનિંગને કહો હંમેશ માટે અલવિદા! ✨`,
          ],
          english: [
            `💧 Unlock Luminous Glass Skin with Medical-Grade HydraFacial ✨`,
            `✨ The Ultimate 7-Step Skin Reset: Deep vortex cleanse & antioxidant infusion 💧`,
          ],
        },
        bodies: {
          hinglish: [
            `Say goodbye to dull skin, clogged pores, and pigmentation! Experience deep exfoliation, vacuum blackhead extraction, and intense hyaluronic serum infusion for an unmistakable radiant glow.`,
          ],
          gujarati: [
            `ડીપ પોર ક્લીનિંગ, વેક્યુમ બ્લેકહેડ્સ રિમૂવલ અને હાઇડ્રેટિંગ સીરમ ઇન્ફ્યુઝનથી મેળવો કાચ જેવી ચમકતી સ્કીન!`,
          ],
          english: [
            `Vortex suction extracts impurities while simultaneously bathing the skin with nourishing antioxidants and hyaluronic peptides.`,
          ],
        },
        technique: {
          hinglish: [`✨ 100% Painless | No Downtime | Instant Glass-Skin Glow`],
          gujarati: [`✨ ઇન્સ્ટન્ટ ગ્લો | ડીપ ક્લીનિંગ | 100% પેઇનલેસ`],
          english: [`✨ Zero Downtime | Medical-Grade Extraction | Instant Radiance`],
        },
        hashtags: [
          '#HydraFacialSurat', '#GlassSkinSurat', '#ShreeBeautyStudio', '#SuratSkinCare', '#SkinGlowSurat',
          '#FacialSurat', '#KatargamSalon', '#KoreanSkinCareSurat', '#GlowUpSurat'
        ],
      },
      hair: {
        hooks: {
          hinglish: [
            `💇‍♀️ Silky Smooth, Mirror-Shine Hair Botox & Keratin Transformation ✨`,
            `✨ Say Goodbye to Daily Flat Irons & Frizz with ${salonName} Hair Spa 💁‍♀️`,
          ],
          gujarati: [
            `💇‍♀️ વાળને આપો સોફ્ટ, સિલ્કી અને શાઇની લુક: હેર બોટોક્સ & કેરાટિન ✨`,
          ],
          english: [
            `✨ Liquid Glass Hair: Premium Keratin & Protein Infusion 💇‍♀️`,
          ],
        },
        bodies: {
          hinglish: [
            `Transform dry, frizzy, and chemically treated hair into ultra-glossy, soft-flowing hair with our formaldehyde-free protein treatment. Lasts up to 5-6 months!`,
          ],
          gujarati: [
            `શ્રી બ્યૂટી સ્ટુડિયો ખાતે કરાવો પ્રીમિયમ હેર બોટોક્સ ટ્રીટમેન્ટ જે વાળને બનાવે છે એકદમ મુલાયમ, સિલ્કી અને ચમકદાર.`,
          ],
          english: [
            `Restore damaged hair cuticle health, lock in essential hydration, and achieve effortless manageable silkiness.`,
          ],
        },
        technique: {
          hinglish: [`✨ Formaldehyde-Free | Long-Lasting 6 Months | High-Gloss Shine`],
          gujarati: [`✨ 100% સેફ & પ્રોટીન રિચ | 6 મહિના સુધી સોફ્ટ વાળ`],
          english: [`✨ 100% Formaldehyde-Free | Moisture Lock | Mirror Gloss`],
        },
        hashtags: [
          '#HairBotoxSurat', '#KeratinSurat', '#HairSmootheningSurat', '#ShreeBeautyStudio', '#SuratHairSalon', '#GlossyHair'
        ],
      },
      nails: {
        hooks: {
          hinglish: [`💅 Handcrafted Luxury Nail Art & Gel Extensions Masterpiece ✨`],
          gujarati: [`💅 બ્રાઇડલ & ફેન્સી નેઇલ આર્ટ એક્સટેન્શન: શ્રી બ્યૂટી સ્ટુડિયો ✨`],
          english: [`💅 Precision Gel Extensions & Haute Nail Couture at ${salonName} ✨`],
        },
        bodies: {
          hinglish: [`Add unmatched elegance to your fingertips! From subtle French ombre chrome to 3D bridal crystal art.`],
          gujarati: [`તમારા હાથને આપો રોયલ લુક! ટ્રેન્ડિંગ નેઇલ આર્ટ, ક્રોમ ફિનિશ અને જેલ એક્સટેન્શન.`],
          english: [`Flawless shape architecture, custom chrome powders, and ultra-durable long-wear gel formulations.`],
        },
        technique: {
          hinglish: [`✨ 4+ Weeks Chip-Resistant | Swarovski Crystal Accents`],
          gujarati: [`✨ 4+ અઠવાડિયા સુધી ટકાઉ | જેલ એક્સટેન્શન`],
          english: [`✨ 4+ Weeks Chip-Free | Handcrafted Couture`],
        },
        hashtags: ['#NailArtSurat', '#GelNailsSurat', '#BridalNails', '#ShreeBeautyStudio', '#NailExtensionSurat'],
      },
      festival: {
        hooks: {
          hinglish: [`🪔 Festive Glam & Royal Celebration Combos at ${salonName} ✨`],
          gujarati: [`🪔 તહેવારો અને લગ્નની સીઝન માટે સ્પેશિયલ મેકઓવર પેકેજ ✨`],
          english: [`🪔 Festive Radiance & Event Glamour Packages at ${salonName} ✨`],
        },
        bodies: {
          hinglish: [`Get celebration-ready with our signature festive makeover combos—including premium facial, hair spa, and flawless party makeup!`],
          gujarati: [`નવરાત્રિ, દિવાળી અને ફેમિલી ફંકશન માટે મેળવો બેસ્ટ મેકઅપ અને હેરસ્ટાઇલિંગ ઓફર્સ શ્રી બ્યૂટી સ્ટુડિયો ખાતે!`],
          english: [`Look stunning at every gathering with our curated beauty packages designed for effortless glamour.`],
        },
        technique: {
          hinglish: [`✨ Sweatproof Festive Makeup | Party Hairdo | Instant Glow`],
          gujarati: [`✨ તહેવારો સ્પેશિયલ | સ્વેટપ્રૂફ મેકઅપ`],
          english: [`✨ Sweatproof Formula | Party Ready`],
        },
        hashtags: ['#FestiveGlam', '#NavratriGlow', '#DiwaliMakeover', '#ShreeBeautyStudio', '#SuratSalonOffers'],
      },
      review: {
        hooks: {
          hinglish: [`🌟 5-Star Review & Love from Our Wonderful Client! 💖`],
          gujarati: [`🌟 ગ્રાહકોનો અતૂટ વિશ્વાસ અને પ્રેમ: 5-સ્ટાર રિવ્યૂ 💖`],
          english: [`🌟 "Exceeded all my expectations for my wedding day!" 💖`],
        },
        bodies: {
          hinglish: [`"The best bridal and salon experience in Surat! The team at Shree Beauty Studio is incredibly skilled, warm, and attentive." — Truly humbled by your trust!`],
          gujarati: [`"શ્રી બ્યૂટી સ્ટુડિયો સુરતનું બેસ્ટ બ્રાઇડલ અને સ્કિનકેર સ્ટુડિયો છે!" — તમારા આ સ્નેહ માટે ખૂબ ખૂબ આભાર!`],
          english: [`Another heartwarming review from our radiant bride. Thank you for making Shree Beauty Studio part of your most cherished milestone!`],
        },
        technique: {
          hinglish: [`✨ 100% 5-Star Rated | Trusted by 10,000+ Surat Brides`],
          gujarati: [`✨ 5-સ્ટાર રેટિંગ | સુરતની વિશ્વસનીય સલૂન`],
          english: [`✨ 5-Star Certified | Loved by Brides`],
        },
        hashtags: ['#ClientReview', '#5StarsSurat', '#ShreeBeautyStudio', '#SuratSalonReviews', '#LovedByBrides'],
      },
    };

    const catData = DATA[captionCategory] || DATA.bridal;
    const hooksList = catData.hooks[captionLanguage] || catData.hooks.hinglish;
    const bodiesList = catData.bodies[captionLanguage] || catData.bodies.hinglish;
    const techList = catData.technique[captionLanguage] || catData.technique.hinglish;

    const availableHooks = hooksList.filter((h) => h !== lastHookUsed);
    const chosenHook = pickRandom(availableHooks.length > 0 ? availableHooks : hooksList);
    setLastHookUsed(chosenHook);

    const chosenBody = pickRandom(bodiesList);
    const chosenTech = pickRandom(techList);
    const chosenHashtags = pickMultipleRandom(catData.hashtags, Math.min(12, catData.hashtags.length)).join(' ');

    const ctas = [
      `📍 Studio Address: ${address}\n📞 Bridal Booking Helpline: ${phone}\n🔗 Instant Booking: https://shreebeautystudio.in/book`,
      `📍 Visit Us: ${address}\n📞 Call / WhatsApp: ${phone}\n🌐 Reserve Slot Online: https://shreebeautystudio.in/book`,
      `📍 Location: ${address}\n📞 Priority Appointments: ${phone}\n🔗 Book Today: https://shreebeautystudio.in/book`,
    ];
    const chosenCta = pickRandom(ctas);

    return `${chosenHook}\n\n${chosenBody}\n\n${chosenTech}${offerStr}\n\n${chosenCta}\n\n────────────────\n${chosenHashtags}`;
  }, [captionCategory, captionLanguage, clientName, specialOffer, settings, lastHookUsed]);

  // Master Generation
  const handleGenerateFresh = async () => {
    setIsGenerating(true);
    const newCount = generationCount + 1;
    setGenerationCount(newCount);

    try {
      const salonName = settings?.salon || 'Shree Beauty Studio';
      const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
      const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('/api/instagram/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: captionCategory,
          language: captionLanguage,
          clientName,
          specialOffer,
          salonName,
          phone,
          address,
          randomSeed: Date.now() + Math.random(),
        }),
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const json = await res.json();
        if (json.success && json.caption) {
          setGeneratedCaption(json.caption);
          toast(`✨ Generated brand-new AI caption #${newCount}!`, 'success');
          setIsGenerating(false);
          return;
        }
      }
    } catch {}

    const dynamicCaption = generateInfiniteCaption();
    setGeneratedCaption(dynamicCaption);
    toast(`✨ Generated unique caption #${newCount}!`, 'success');
    setIsGenerating(false);
  };

  useEffect(() => {
    const initial = generateInfiniteCaption();
    setGeneratedCaption(initial);
  }, [captionCategory, captionLanguage, clientName, specialOffer]);

  // ── MEDIA FILE SELECTION & PREVIEW ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);

      // Auto detect type
      if (file.type.startsWith('video/')) {
        setUploadMediaType('reel');
      } else {
        setUploadMediaType('photo');
      }

      // Create preview URL
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
      setPublishSuccess(null);
      setPublishMessage('');
      toast(`📁 Selected ${file.type.startsWith('video/') ? 'Reel Video' : 'Photo'}: ${file.name}`, 'success');
    }
  };

  const handleRemoveMedia = () => {
    setSelectedFile(null);
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── 1-CLICK DIRECT PUBLISH TO INSTAGRAM ──
  const handlePublishToInstagram = async () => {
    if (!generatedCaption.trim() && !selectedFile) {
      toast('Please select a photo/reel or generate a caption to publish!', 'error');
      return;
    }

    setIsPublishing(true);
    setPublishSuccess(null);
    setPublishMessage('');

    try {
      const formData = new FormData();
      formData.append('caption', generatedCaption);
      formData.append('mediaType', uploadMediaType);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        setPublishSuccess(true);
        setPublishMessage(json.message || '🎉 Ready to Publish!');
        toast(json.message || 'Post prepared successfully!', 'success');

        // Copy caption to clipboard automatically
        navigator.clipboard.writeText(generatedCaption);

        // If direct publishing was completed
        if (json.published) {
          fetchFeed();
        } else {
          // Open Meta Business Suite Composer
          window.open(json.creatorStudioUrl || 'https://business.facebook.com/latest/composer', '_blank');
        }
      } else {
        setPublishSuccess(false);
        setPublishMessage(json.error || 'Publishing error');
        toast(json.error || 'Failed to publish to Instagram', 'error');
      }
    } catch (err: any) {
      setPublishSuccess(false);
      setPublishMessage('Network error during Instagram upload');
      toast('Network error during upload', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    const updatedData = {
      ...data,
      settings: {
        ...data.settings,
        instagramHandle: handle.trim(),
        instagramUrl: instaUrl.trim(),
        instagramAccountId: accountId.trim(),
        instagramAccessToken: token.trim(),
      },
    };
    setData(updatedData);
    scheduleSave();
    toast('💾 Instagram auto settings saved & synced to cloud!', 'success');
    fetchFeed();
  };

  return (
    <div className="container-fluid" style={{ paddingBottom: 60 }}>
      {/* ── Top Hero Banner ── */}
      <motion.div
        className="card"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        style={{
          background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.12) 0%, rgba(253, 29, 29, 0.08) 50%, rgba(245, 96, 64, 0.04) 100%)',
          border: '1px solid rgba(225, 48, 108, 0.3)',
          borderRadius: 16,
          padding: '22px 26px',
          marginBottom: 20,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(220, 39, 67, 0.35)',
                flexShrink: 0,
              }}
            >
              <Instagram size={28} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
                  Instagram Auto-Post & AI Reel Studio
                </h1>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#16a34a',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
                  Direct Auto-Post Active
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>
                Upload Photos & Reels directly with auto-generated AI Captions, Hooks & Hashtags to <strong style={{ color: '#E1306C' }}>{settings?.instagramHandle || '@shreebeauty.studio'}</strong>.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={settings?.instagramUrl || 'https://www.instagram.com/shreebeauty.studio/'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Instagram size={14} />
              Open Instagram Profile ↗
            </a>

            <a
              href="https://business.facebook.com/latest/composer"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Globe size={14} color="#0084FF" />
              Meta Creator Studio ↗
            </a>
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
          onClick={() => setActiveTab('upload')}
          className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            background: activeTab === 'upload' ? 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)' : undefined,
            color: activeTab === 'upload' ? '#fff' : undefined,
            border: activeTab === 'upload' ? 'none' : undefined,
          }}
        >
          <UploadCloud size={16} />
          🚀 Upload & Auto-Post (Reels & Photos)
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`btn ${activeTab === 'studio' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Sparkles size={15} color="#eab308" />
          AI Caption & Reel Hook Generator
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`btn ${activeTab === 'feed' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Instagram size={15} />
          Synced Feed ({posts.length})
        </button>

        <button
          onClick={() => setActiveTab('crosspost')}
          className={`btn ${activeTab === 'crosspost' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Share2 size={15} color="#3b82f6" />
          Cross-Posting & Multi-Channel
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Settings size={15} />
          Settings
        </button>
      </div>

      {/* ── TAB 1: DIRECT UPLOAD & AUTO-POST INTERFACE (PRIMARY) ── */}
      {activeTab === 'upload' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          
          {/* Left Column: Media Uploader & AI Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Media Upload Card */}
            <div className="card" style={{ borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(225, 48, 108, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadCloud size={18} color="#E1306C" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>1. Select Photo or Reel Video</h3>
                    <p style={{ fontSize: 11.5, color: 'var(--muted-foreground)', margin: 0 }}>Upload transformation video / picture from device</p>
                  </div>
                </div>

                {/* Media Type Toggle */}
                <div style={{ display: 'flex', background: 'var(--bg-secondary, rgba(0,0,0,0.05))', padding: 3, borderRadius: 10 }}>
                  <button
                    type="button"
                    onClick={() => setUploadMediaType('reel')}
                    className={`btn btn-xs ${uploadMediaType === 'reel' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 11, fontWeight: 700, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Film size={12} /> Reel (9:16)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMediaType('photo')}
                    className={`btn btn-xs ${uploadMediaType === 'photo' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 11, fontWeight: 700, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <ImageIcon size={12} /> Photo (1:1)
                  </button>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadMediaType === 'reel' ? 'video/mp4,video/quicktime,video/mov' : 'image/jpeg,image/png,image/webp'}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Upload Drop Zone / Preview */}
              {!mediaPreviewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(225, 48, 108, 0.4)',
                    borderRadius: 14,
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(225, 48, 108, 0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(225, 48, 108, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    {uploadMediaType === 'reel' ? <Video size={24} color="#E1306C" /> : <ImageIcon size={24} color="#E1306C" />}
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 4px', color: 'var(--foreground)' }}>
                    Tap to Choose {uploadMediaType === 'reel' ? 'Reel Video (MP4 / MOV)' : 'Photo (JPG / PNG)'}
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                    Directly from your phone, laptop, or camera roll
                  </p>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  {uploadMediaType === 'reel' ? (
                    <video
                      src={mediaPreviewUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      style={{ width: '100%', maxHeight: 340, objectFit: 'contain', display: 'block' }}
                    />
                  ) : (
                    <img
                      src={mediaPreviewUrl}
                      alt="Upload Preview"
                      style={{ width: '100%', maxHeight: 340, objectFit: 'contain', display: 'block' }}
                    />
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={handleRemoveMedia}
                    className="btn btn-xs"
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 700,
                    }}
                  >
                    <Trash2 size={12} color="#ef4444" /> Change Media
                  </button>
                </div>
              )}
            </div>

            {/* AI Caption & Hook Controls */}
            <div className="card" style={{ borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color="#ca8a04" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>2. AI Caption & Reel Hook Setup</h3>
                    <p style={{ fontSize: 11.5, color: 'var(--muted-foreground)', margin: 0 }}>Customize topic, tone & bride name</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateFresh}
                  disabled={isGenerating}
                  className="btn btn-secondary btn-xs"
                  style={{ fontWeight: 800, color: '#E1306C', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                  New AI Angle
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Category Chips */}
                <div>
                  <label className="label" style={{ fontSize: 11.5, fontWeight: 700 }}>Makeover / Service Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {[
                      { id: 'bridal', label: '👑 Bridal' },
                      { id: 'hydrafacial', label: '✨ HydraFacial' },
                      { id: 'hair', label: '💇‍♀️ Hair Botox' },
                      { id: 'nails', label: '💅 Nails' },
                      { id: 'festival', label: '🪔 Festive' },
                      { id: 'review', label: '⭐ Review' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCaptionCategory(cat.id as any)}
                        className={`btn btn-xs ${captionCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 11, fontWeight: captionCategory === cat.id ? 800 : 500 }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Chips */}
                <div>
                  <label className="label" style={{ fontSize: 11.5, fontWeight: 700 }}>Caption Language</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {[
                      { id: 'hinglish', label: 'Hinglish (Viral)' },
                      { id: 'gujarati', label: 'ગુજરાતી' },
                      { id: 'english', label: 'English' },
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setCaptionLanguage(lang.id as any)}
                        className={`btn btn-xs ${captionLanguage === lang.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 11, fontWeight: captionLanguage === lang.id ? 800 : 500 }}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client / Bride Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="label" style={{ fontSize: 11, fontWeight: 700 }}>Client / Bride Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Kinjal Patel"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="input input-xs"
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: 11, fontWeight: 700 }}>Special Offer (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 20% OFF this week"
                      value={specialOffer}
                      onChange={(e) => setSpecialOffer(e.target.value)}
                      className="input input-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Instagram Mockup & Master 1-Click Publish */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Live Instagram Post Mockup Card */}
            <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Instagram size={18} color="#E1306C" />
                  <span style={{ fontSize: 14, fontWeight: 800 }}>3. Live Instagram Post Preview & Edit</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => copyToClipboard(generatedCaption, 'copy-mockup')}
                    className="btn btn-secondary btn-xs"
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {copiedId === 'copy-mockup' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    Copy Text
                  </button>
                </div>
              </div>

              {/* Instagram Mobile Card Shell */}
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: 'var(--card-bg, #fff)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  marginBottom: 16,
                }}
              >
                {/* IG Post Header */}
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(45deg, #f09433, #dc2743)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      S
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--foreground)' }}>shreebeauty.studio</span>
                        <CheckCircle size={12} color="#3b82f6" fill="#3b82f6" />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Katargam, Surat • Original Audio</span>
                    </div>
                  </div>
                </div>

                {/* Media Box in Mockup */}
                {mediaPreviewUrl ? (
                  <div style={{ background: '#000', maxHeight: 240, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {uploadMediaType === 'reel' ? (
                      <video src={mediaPreviewUrl} autoPlay muted loop style={{ width: '100%', maxHeight: 240, objectFit: 'contain' }} />
                    ) : (
                      <img src={mediaPreviewUrl} alt="Mockup" style={{ width: '100%', maxHeight: 240, objectFit: 'contain' }} />
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-secondary, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                      📸 Media selected on the left will appear here
                    </p>
                  </div>
                )}

                {/* Editable Caption Textarea inside Mockup */}
                <div style={{ padding: 12 }}>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, margin: '0 0 4px' }}>
                    Attached AI Caption & Hashtags (You can edit directly):
                  </label>
                  <textarea
                    value={generatedCaption}
                    onChange={(e) => setGeneratedCaption(e.target.value)}
                    rows={8}
                    className="input"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      lineHeight: 1.5,
                      padding: 10,
                      borderRadius: 8,
                      resize: 'vertical',
                      width: '100%',
                    }}
                  />
                </div>
              </div>

              {/* Status or Alert message if published */}
              {publishMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 700,
                    marginBottom: 14,
                    background: publishSuccess ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: publishSuccess ? '#16a34a' : '#dc2626',
                    border: `1px solid ${publishSuccess ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Sparkles size={16} />
                  {publishMessage}
                </div>
              )}

              {/* Master 1-Click Publishing Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={handlePublishToInstagram}
                  disabled={isPublishing}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    fontSize: 15,
                    fontWeight: 800,
                    background: 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(220, 39, 67, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Instagram size={18} className={isPublishing ? 'animate-spin' : ''} />
                  {isPublishing ? 'PUBLISHING TO INSTAGRAM...' : '🚀 DIRECT PUBLISH TO INSTAGRAM / REELS'}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <a
                    href="https://business.facebook.com/latest/composer"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCaption);
                      toast('📋 Caption copied! Opening Meta Business Suite...', 'success');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Globe size={14} color="#0084FF" />
                    Meta Creator Studio ↗
                  </a>

                  <a
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCaption);
                      toast('📋 Caption copied! Opening Instagram Web...', 'success');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <ExternalLink size={14} />
                    Open Instagram Web ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 2: AI CAPTION & REEL HOOK GENERATOR STUDIO ── */}
      {activeTab === 'studio' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card" style={{ borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color="#ca8a04" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>AI Reel Hook & Caption Generator</h3>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>Infinite non-repeating viral hooks & captions</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'bridal', label: '👑 Bridal Makeover' },
                    { id: 'hydrafacial', label: '✨ HydraFacial Glow' },
                    { id: 'hair', label: '💇‍♀️ Hair Botox/Keratin' },
                    { id: 'nails', label: '💅 Nail Art & Ext.' },
                    { id: 'festival', label: '🪔 Festive Combos' },
                    { id: 'review', label: '⭐ Client Review' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCaptionCategory(cat.id as any)}
                      className={`btn btn-sm ${captionCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: 12, justifyContent: 'flex-start', fontWeight: captionCategory === cat.id ? 700 : 500 }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Tone & Language</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'hinglish', label: 'Hinglish' },
                    { id: 'gujarati', label: 'ગુજરાતી' },
                    { id: 'english', label: 'English' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setCaptionLanguage(lang.id as any)}
                      className={`btn btn-sm ${captionLanguage === lang.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: 12, fontWeight: captionLanguage === lang.id ? 700 : 500 }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateFresh}
                disabled={isGenerating}
                className="btn btn-primary"
                style={{
                  marginTop: 6,
                  fontWeight: 800,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 18px',
                  background: 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)',
                  border: 'none',
                }}
              >
                <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                🔄 REFRESH NEW GENERATE (NEVER REPEATS)
              </button>
            </div>
          </div>

          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Instagram size={18} color="#E1306C" />
                <span style={{ fontSize: 14, fontWeight: 800 }}>Ready-to-Post Instagram Caption</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 10,
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: '#16a34a',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  ✏️ Edit Mode (Type Freely)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleGenerateFresh}
                  disabled={isGenerating}
                  className="btn btn-secondary btn-xs"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#E1306C' }}
                >
                  <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                  New AI Angle
                </button>

                <button
                  onClick={() => copyToClipboard(generatedCaption, 'generated-cap')}
                  className="btn btn-secondary btn-xs"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                >
                  {copiedId === 'generated-cap' ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                  Copy All
                </button>

                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-xs"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                >
                  <ExternalLink size={13} /> Open IG App
                </a>
              </div>
            </div>

            <textarea
              value={generatedCaption}
              onChange={(e) => setGeneratedCaption(e.target.value)}
              rows={16}
              placeholder="Type or customize your Instagram caption here..."
              className="input"
              style={{
                fontFamily: 'monospace',
                fontSize: 12.5,
                lineHeight: 1.55,
                padding: 14,
                borderRadius: 10,
                resize: 'vertical',
                flex: 1,
                background: 'var(--bg-secondary, rgba(0,0,0,0.02))',
              }}
            />

            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted-foreground)', gap: 8 }}>
              <span>Character count: {generatedCaption.length}</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Non-repeating viral Instagram Reels algorithm optimized • Fully Editable</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 3: SYNCED FEED ── */}
      {activeTab === 'feed' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Synced Instagram Feed ({posts.length})</h3>
            <button onClick={fetchFeed} className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {posts.map((post) => (
              <div key={post.id} className="card" style={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}>
                <img src={post.thumbnail} alt="IG" style={{ width: '100%', height: 240, objectFit: 'cover' }} />
                <div style={{ padding: 12 }}>
                  <p style={{ fontSize: 12, margin: '0 0 8px', lineClamp: 2, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.caption}
                  </p>
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-xs" style={{ width: '100%' }}>
                    <ExternalLink size={12} /> View on Instagram
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── TAB 4: CROSS-POSTING ── */}
      {activeTab === 'crosspost' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <div className="card" style={{ borderRadius: 16, padding: 22 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px' }}>Multi-Channel Cross-Posting</h3>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
              Sync Instagram Reels to Facebook Page and Google Business Profile for local SEO.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <Globe size={16} /> Meta Business Suite
              </a>
              <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <ExternalLink size={16} /> Google Business Profile
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 5: SETTINGS ── */}
      {activeTab === 'settings' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ maxWidth: 600 }}>
          <div className="card" style={{ borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Meta Graph API & Instagram Connection</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Instagram Account Handle</label>
                <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)} className="input input-sm" />
              </div>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Instagram Profile URL</label>
                <input type="text" value={instaUrl} onChange={(e) => setInstaUrl(e.target.value)} className="input input-sm" />
              </div>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Meta Account ID</label>
                <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input input-sm" />
              </div>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Meta User Token</label>
                <textarea rows={3} value={token} onChange={(e) => setToken(e.target.value)} className="input" style={{ fontSize: 11, fontFamily: 'monospace' }} />
              </div>
              <button type="button" onClick={handleSaveSettings} className="btn btn-primary" style={{ fontWeight: 800 }}>
                Save Settings
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
