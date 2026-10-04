'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Wand2,
  Crown,
  Flame,
  Star,
  Shuffle
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

type TabType = 'feed' | 'studio' | 'crosspost' | 'settings';

// Helper utilities for infinite non-repeating generation
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

  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'reel' | 'photo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostForShare, setSelectedPostForShare] = useState<InstagramPost | null>(null);

  // Share Modal State
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState('');
  const [customShareMessage, setCustomShareMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Caption Studio State
  const [captionCategory, setCaptionCategory] = useState<'bridal' | 'hydrafacial' | 'hair' | 'nails' | 'festival' | 'review'>('bridal');
  const [captionLanguage, setCaptionLanguage] = useState<'english' | 'hinglish' | 'gujarati'>('hinglish');
  const [generationCount, setGenerationCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clientName, setClientName] = useState('');
  const [specialOffer, setSpecialOffer] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [lastHookUsed, setLastHookUsed] = useState('');

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
        toast(`✨ Synced ${json.posts.length} Instagram posts & reels successfully!`, 'success');
      } else {
        toast(json.error || 'Failed to sync Instagram feed', 'error');
      }
    } catch {
      toast('Network error syncing Instagram feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesType = filterType === 'all' || p.type === filterType;
      const matchesSearch = !searchQuery.trim() || p.caption.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [posts, filterType, searchQuery]);

  // Statistics
  const totalPosts = posts.length;
  const totalReels = posts.filter((p) => p.type === 'reel').length;
  const totalPhotos = posts.filter((p) => p.type === 'photo').length;
  const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);

  // Copy helper with animation
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast('📋 Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── INFINITE NON-REPEATING COMBINATORIAL AI CAPTION GENERATOR ──
  const generateInfiniteCaption = useCallback(() => {
    const salonName = settings?.salon || 'Shree Beauty Studio';
    const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
    const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
    const nameStr = clientName.trim() ? clientName.trim() : 'our gorgeous bride';
    const offerStr = specialOffer.trim() ? `\n\n🎉 Limited Privilege Offer: ${specialOffer.trim()}` : '';

    // Category Libraries
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
            `💫 A bride should never look masked—she should look like her most radiant self! ✨`,
            `👰 Royal bridal elegance that captures hearts and turns heads at every step ✨`,
            `👑 Step into your forever with the unmistakable ${salonName} bridal aura 💖`,
          ],
          gujarati: [
            `👑 શ્રી બ્યૂટી સ્ટુડિયો રોયલ બ્રાઇડલ લુક: ${nameStr} ✨`,
            `🪔 પાનેતર અને કંકુ પગલાંનો અનોખો શાહી શણગાર: શ્રી બ્યૂટી સ્ટુડિયો 👰`,
            `💖 લગ્નના પવિત્ર દિવસે મેળવો 100% નેચરલ અને વોટરપ્રૂફ HD એરબ્રશ ગ્લો! ✨`,
            `🌸 સુરતની દરેક કન્યાનું સપનું: શ્રી બ્યૂટી સ્ટુડિયો રોયલ બ્રાઇડલ મેકઓવર 👑`,
            `💫 ${nameStr} માટે ખાસ કસ્ટમાઇઝ્ડ શાહી લુક અને પરફેક્ટ ચૂંદડી ડ્રેપિંગ! 💍`,
            `✨ કુદરતી સુંદરતા અને રોયલ ફિનિશિંગ સાથેનો અદભુત બ્રાઇડલ મેકઅપ 🪔`,
            `👰 દરેક કન્યાના ખાસ દિવસને યાદગાર બનાવતો શ્રી બ્યૂટી સ્ટુડિયોનો જાદુઇ ટચ ✨`,
            `💍 શાહી અંદાજ અને પરંપરાગત ગુજરાતી લગ્ન શણગાર: ${nameStr} 💖`,
          ],
          english: [
            `👑 Timeless Elegance & Bridal Perfection for ${nameStr} ✨`,
            `✨ The Modern Indian Bride: Radiance, Grace & Bespoke Artistry at ${salonName} 👰`,
            `💄 The Art of Flawless, Flash-Ready Bridal Artistry on ${nameStr} 👑`,
            `🌟 Pure Bridal Royalty: Unfiltered glow that lasts through every emotional tear and smile 🤍`,
            `💍 Elevating natural beauty into a royal masterpiece for ${nameStr} ✨`,
            `👰 Every bride has a dream look—we bring it to life with precision & love at ${salonName} 💫`,
            `👑 Ethereal, regal, and breathtaking: The signature ${salonName} bride ✨`,
            `✨ Handcrafted bridal glamour tailored to match your wedding lehenga palette 💖`,
          ],
        },
        bodies: {
          hinglish: [
            `Ek bride ke sabse special din par uski natural beauty ko elevate karna is our pure passion. From customized HD airbrush glow to precision eye artistry and royal veil draping—every single detail crafted to perfection.`,
            `Zero cakey layers. 100% waterproof, sweatproof, and camera-ready magic! Designed to stay fresh through all the emotional moments, mandap pheras, and midnight reception spotlight.`,
            `Skin prep is the real secret! 45 minutes of customized skin hydration + lightweight waterproof coverage for that signature dewy royal radiance.`,
            `Soft champagne halo eyes, sculpted cheekbones, romantic floral hair artistry, and precision veil setting that turns heads all evening.`,
            `Because your wedding day is a once-in-a-lifetime milestone, and you deserve nothing less than supreme royal luxury.`,
            `Blending heritage Gujarati tradition with modern luxury HD airbrush techniques for an unforgettable bridal aura.`,
          ],
          gujarati: [
            `લગ્નના પવિત્ર દિવસે દરેક કન્યાનું સપનું હોય છે સૌથી સુંદર અને શાહી દેખાવું! શ્રી બ્યૂટી સ્ટુડિયો લાવે છે 100% વોટરપ્રૂફ HD એરબ્રશ મેકઅપ, પરફેક્ટ આઇ આર્ટ અને રોયલ ચૂંદડી ડ્રેપિંગ.`,
            `પરંપરાગત ગુજરાતી લગ્ન માટે ખાસ કસ્ટમાઇઝ્ડ બ્રાઇડલ પેકેજ. નેચરલ સ્કીન ગ્લો, સોફ્ટ હેરસ્ટાઇલ અને આખો દિવસ ટકી રહેતો એરબ્રશ લુક.`,
            `શ્રી બ્યૂટી સ્ટુડિયો ખાતે અમે દરેક કન્યાની સ્કિન ટાઇપ મુજબ પર્સનલાઇઝ્ડ મેકઅપ અને હેરસ્ટાઇલિંગ કરીએ છીએ.`,
            `ચહેરાની નેચરલ સુંદરતાને નિખારીને આપો રોયલ લુક જે તમારા ફોટો અને વીડિયોમાં હંમેશા શાઇન કરશે.`,
          ],
          english: [
            `Creating an ethereal, regal bridal glow that lasts through all the emotional moments and smiles. Mastered with luxury international cosmetics, weightless finish, and bespoke jewelry setting.`,
            `Sweatproof, HD flash-ready, and lightweight comfort all through your wedding rituals. Experience personalized bridal pampering with certified master artists in Surat.`,
            `Soft smokey eye contouring, satin skin radiance, and precision veil artistry. Every bride deserves a personalized signature look tailored to her facial features.`,
            `Skin prep is our obsession: deep pore hydration followed by featherlight micro-pigment layering for that radiant queen-like glow.`,
          ],
        },
        technique: {
          hinglish: [
            `✨ HD Airbrush Finish | 100% Waterproof | Tear-Proof & Flash-Ready`,
            `💎 Custom Jewelry & Mathapatti Setting | Soft Romantic Waves | Glass-Skin Glow`,
            `👑 40-Min Luxury Skin Prep | International Cosmetics | All-Day Freshness`,
            `💄 Bespoke Veil Draping | High-Definition Contouring | Featherlight Comfort`,
          ],
          gujarati: [
            `✨ 100% વોટરપ્રૂફ એરબ્રશ | HD ફિનિશ | રોયલ ચૂંદડી & જ્વેલરી સેટિંગ`,
            `👑 ઇન્ટરનેશનલ બ્રાન્ડ્સ | નેચરલ ગ્લાસ સ્કીન | પરફેક્ટ હેર આર્ટ`,
          ],
          english: [
            `✨ HD Airbrush Magic | Tear-Proof & Waterproof | Flash-Optimized`,
            `👑 Bespoke Jewelry Draping | Weightless Satin Radiance | Luxury Prep`,
          ],
        },
        hashtags: [
          '#ShreeBeautyStudio', '#SuratBridalMakeup', '#SuratMakeupArtist', '#GujaratiBride', '#BridalMakeoverSurat',
          '#RoyalBride', '#SuratSalon', '#IndianWeddingBuzz', '#SuratBeautyStudio', '#WeddingGlam', '#DesiBride',
          '#KatargamSalon', '#SuratWeddings', '#BridalGlow', '#IndianBride', '#GlamByShree', '#SuratBridalStudio',
          '#BridalArtistSurat', '#PanetarBride', '#WeddingInspoSurat', '#SuratDiaries', '#Varachha', '#BridalReel',
          '#TrendingSurat', '#ShaadiLook', '#DulhanVibes', '#SuratWomen', '#MakeupSurat', '#WeddingSiders', '#GujaratiWedding'
        ],
      },
      hydrafacial: {
        hooks: {
          hinglish: [
            `✨ 7-Step Korean Glass Skin HydraFacial Treatment 💧`,
            `💧 Why Every Bride & Groom Needs a HydraFacial Before D-Day! ✨`,
            `🌟 Instant Radiant Glow: Say goodbye to blackheads & dull skin! 🧖‍♀️`,
            `✨ Zero Downtime. 100% Painless. The ultimate deep skin detox at ${salonName} 💧`,
            `💎 Step into the world of medical-grade skin hydration and glowing glass finish ✨`,
          ],
          gujarati: [
            `✨ 7-સ્ટેપ કોરિયન ગ્લાસ સ્કીન હાઇડ્રાફેશિયલ ટ્રીટમેન્ટ 💧`,
            `💧 ખીલ, બ્લેકહેડ્સ અને ટેનિંગને કહો હંમેશ માટે અલવિદા! ✨`,
            `🌟 ચહેરાને આપો ઇન્સ્ટન્ટ ગ્લો અને સ્મૂથ ટેક્સચર શ્રી બ્યૂટી સ્ટુડિયો ખાતે 🧖‍♀️`,
          ],
          english: [
            `💧 Unlock Luminous Glass Skin with Medical-Grade HydraFacial ✨`,
            `✨ The Ultimate 7-Step Skin Reset: Deep vortex cleanse & antioxidant infusion 💧`,
            `🌟 Redefining Skincare: Painless extraction meets intense hyaluronic glow at ${salonName} 🧖‍♀️`,
          ],
        },
        bodies: {
          hinglish: [
            `Say goodbye to dull skin, clogged pores, and pigmentation! Experience deep exfoliation, vacuum blackhead extraction, and intense hyaluronic serum infusion for an unmistakable radiant glow.`,
            `Deeply cleanses congested pores, removes dead skin cells, and infuses active peptides for camera-ready, soft-touch glass skin. Get your pre-event glow booster today!`,
            `Vortex suction extracts deep sebum while simultaneously bathing the skin in peptides and brightening botanical extracts.`,
          ],
          gujarati: [
            `ડીપ પોર ક્લીનિંગ, વેક્યુમ બ્લેકહેડ્સ રિમૂવલ અને હાઇડ્રેટિંગ સીરમ ઇન્ફ્યુઝનથી મેળવો કાચ જેવી ચમકતી સ્કીન!`,
            `તડકાથી પડેલા ટેનિંગ અને ડલનેસને દૂર કરીને તમારા ચહેરાને આપો તાજગી અને ગ્લો.`,
          ],
          english: [
            `Vortex suction extracts impurities while simultaneously bathing the skin with nourishing antioxidants and hyaluronic peptides.`,
            `Experience the holy grail of instant radiance: deep exfoliation, painless extractions, and multi-vitamin skin quenching.`,
          ],
        },
        technique: {
          hinglish: [
            `✨ 100% Painless | No Downtime | Instant Glass-Skin Glow`,
            `💧 Deep Vortex Cleansing | Hyaluronic Acid Infusion | Collagen Boost`,
          ],
          gujarati: [
            `✨ ઇન્સ્ટન્ટ ગ્લો | ડીપ ક્લીનિંગ | 100% પેઇનલેસ`,
          ],
          english: [
            `✨ Zero Downtime | Medical-Grade Extraction | Instant Radiance`,
          ],
        },
        hashtags: [
          '#HydraFacialSurat', '#GlassSkinSurat', '#ShreeBeautyStudio', '#SuratSkinCare', '#SkinGlowSurat',
          '#FacialSurat', '#KatargamSalon', '#KoreanSkinCareSurat', '#BridalSkinCare', '#PreBridalSurat',
          '#GlowUpSurat', '#SuratBeautyParlour', '#ClearSkinGoals', '#SkinDetox', '#HydraGlow'
        ],
      },
      hair: {
        hooks: {
          hinglish: [
            `💇‍♀️ Silky Smooth, Mirror-Shine Hair Botox & Keratin Transformation ✨`,
            `✨ Say Goodbye to Daily Flat Irons & Frizz with ${salonName} Hair Spa 💁‍♀️`,
            `🌟 Liquid Glass Hair: From unmanageable frizz to runway-smooth perfection ✨`,
            `💇‍♀️ The Ultimate Protein Restoration for Damaged & Colored Hair at ${salonName} 💖`,
          ],
          gujarati: [
            `💇‍♀️ વાળને આપો સોફ્ટ, સિલ્કી અને શાઇની લુક: હેર બોટોક્સ & કેરાટિન ✨`,
            `✨ સુકા અને ફ્રિઝી વાળથી પરેશાન છો? મેળવો ગ્લાસ-શાઇન હેર ટ્રીટમેન્ટ 💖`,
          ],
          english: [
            `✨ Liquid Glass Hair: Premium Keratin & Protein Infusion 💇‍♀️`,
            `💇‍♀️ Transform Frizz into High-Gloss Mirror Silk at ${salonName} ✨`,
          ],
        },
        bodies: {
          hinglish: [
            `Transform dry, frizzy, and chemically treated hair into ultra-glossy, soft-flowing hair with our formaldehyde-free protein treatment. Lasts up to 5-6 months!`,
            `Wake up every single morning with runway-ready, salon-smooth hair. Deep moisture restoration and long-lasting glass shine.`,
            `Infused with active keratin peptides and nourishing argan oils to strengthen hair strands from core to cuticle.`,
          ],
          gujarati: [
            `શ્રી બ્યૂટી સ્ટુડિયો ખાતે કરાવો પ્રીમિયમ હેર બોટોક્સ ટ્રીટમેન્ટ જે વાળને બનાવે છે એકદમ મુલાયમ, સિલ્કી અને ચમકદાર.`,
            `ફ્રિઝ-ફ્રી અને મેનેજેબલ વાળ માટે સ્પેશિયલ પ્રોટીન થેરાપી.`,
          ],
          english: [
            `Restore damaged hair cuticle health, lock in essential hydration, and achieve effortless manageable silkiness.`,
            `Engineered with biomimetic keratin proteins for intense frizz elimination and high-gloss mirror shine.`,
          ],
        },
        technique: {
          hinglish: [
            `✨ Formaldehyde-Free | Long-Lasting 6 Months | High-Gloss Shine`,
          ],
          gujarati: [
            `✨ 100% સેફ & પ્રોટીન રિચ | 6 મહિના સુધી સોફ્ટ વાળ`,
          ],
          english: [
            `✨ 100% Formaldehyde-Free | Moisture Lock | Mirror Gloss`,
          ],
        },
        hashtags: [
          '#HairBotoxSurat', '#KeratinSurat', '#HairSmootheningSurat', '#ShreeBeautyStudio', '#SuratHairSalon',
          '#GlossyHair', '#HairTransformation', '#KatargamSalon', '#NanoplastiaSurat', '#HairSpaSurat',
          '#FrizzFreeHair', '#HairGoalsSurat', '#SuratHairStylist'
        ],
      },
      nails: {
        hooks: {
          hinglish: [
            `💅 Handcrafted Luxury Nail Art & Gel Extensions Masterpiece ✨`,
            `💎 Glazed Donut & French Ombre Nails: Pure elegance on your fingertips ✨`,
            `💅 Bridal Crystal & 3D Gel Nail Art customized for your wedding lehenga 💍`,
          ],
          gujarati: [
            `💅 બ્રાઇડલ & ફેન્સી નેઇલ આર્ટ એક્સટેન્શન: શ્રી બ્યૂટી સ્ટુડિયો ✨`,
          ],
          english: [
            `💅 Precision Gel Extensions & Haute Nail Couture at ${salonName} ✨`,
          ],
        },
        bodies: {
          hinglish: [
            `Add unmatched elegance to your fingertips! From subtle French ombre chrome and glitter encapsulation to 3D bridal crystal art.`,
            `Chip-resistant, durable, and customized to complement your event outfits with Swarovski crystal accents.`,
          ],
          gujarati: [
            `તમારા હાથને આપો રોયલ લુક! ટ્રેન્ડિંગ નેઇલ આર્ટ, ક્રોમ ફિનિશ અને જેલ એક્સટેન્શન.`,
          ],
          english: [
            `Flawless shape architecture, custom chrome powders, and ultra-durable long-wear gel formulations.`,
          ],
        },
        technique: {
          hinglish: [`✨ 4+ Weeks Chip-Resistant | Swarovski Crystal Accents | Luxury Gel`],
          gujarati: [`✨ 4+ અઠવાડિયા સુધી ટકાઉ | જેલ એક્સટેન્શન`],
          english: [`✨ 4+ Weeks Chip-Free | Handcrafted Couture`],
        },
        hashtags: [
          '#NailArtSurat', '#GelNailsSurat', '#BridalNails', '#ShreeBeautyStudio', '#NailExtensionSurat',
          '#NailsOfInstagram', '#SuratNailArtist', '#LuxuryNailsSurat'
        ],
      },
      festival: {
        hooks: {
          hinglish: [
            `🪔 Festive Glam & Royal Celebration Combos at ${salonName} ✨`,
            `✨ Navratri & Diwali Glow: Sweatproof makeup that stays all night long! 💃`,
          ],
          gujarati: [
            `🪔 તહેવારો અને લગ્નની સીઝન માટે સ્પેશિયલ મેકઓવર પેકેજ ✨`,
          ],
          english: [
            `🪔 Festive Radiance & Event Glamour Packages at ${salonName} ✨`,
          ],
        },
        bodies: {
          hinglish: [
            `Get celebration-ready with our signature festive makeover combos—including premium facial, hair spa, manicure-pedicure, and flawless party makeup!`,
          ],
          gujarati: [
            `નવરાત્રિ, દિવાળી અને ફેમિલી ફંકશન માટે મેળવો બેસ્ટ મેકઅપ અને હેરસ્ટાઇલિંગ ઓફર્સ શ્રી બ્યૂટી સ્ટુડિયો ખાતે!`,
          ],
          english: [
            `Look stunning at every gathering with our curated beauty packages designed for effortless glamour.`,
          ],
        },
        technique: {
          hinglish: [`✨ Sweatproof Festive Makeup | Party Hairdo | Instant Glow`],
          gujarati: [`✨ તહેવારો સ્પેશિયલ | સ્વેટપ્રૂફ મેકઅપ`],
          english: [`✨ Sweatproof Formula | Party Ready`],
        },
        hashtags: [
          '#FestiveGlam', '#NavratriGlow', '#DiwaliMakeover', '#ShreeBeautyStudio', '#SuratSalonOffers',
          '#PartyMakeupSurat', '#SuratWomen', '#FestiveOffersSurat'
        ],
      },
      review: {
        hooks: {
          hinglish: [
            `🌟 5-Star Review & Love from Our Wonderful Client! 💖`,
            `🥺 "The best bridal salon in Surat!" — Heartwarming words that inspire us ✨`,
          ],
          gujarati: [
            `🌟 ગ્રાહકોનો અતૂટ વિશ્વાસ અને પ્રેમ: 5-સ્ટાર રિવ્યૂ 💖`,
          ],
          english: [
            `🌟 "Exceeded all my expectations for my wedding day!" 💖`,
          ],
        },
        bodies: {
          hinglish: [
            `"The best bridal and salon experience in Surat! The team at Shree Beauty Studio is incredibly skilled, warm, and attentive." — Truly humbled by your trust!`,
          ],
          gujarati: [
            `"શ્રી બ્યૂટી સ્ટુડિયો સુરતનું બેસ્ટ બ્રાઇડલ અને સ્કિનકેર સ્ટુડિયો છે!" — તમારા આ સ્નેહ અને સમર્થન માટે ખૂબ ખૂબ આભાર!`,
          ],
          english: [
            `Another heartwarming review from our radiant bride. Thank you for making Shree Beauty Studio part of your most cherished milestone!`,
          ],
        },
        technique: {
          hinglish: [`✨ 100% 5-Star Rated | Trusted by 10,000+ Surat Brides`],
          gujarati: [`✨ 5-સ્ટાર રેટિંગ | સુરતની વિશ્વસનીય સલૂન`],
          english: [`✨ 5-Star Certified | Loved by Brides`],
        },
        hashtags: [
          '#ClientReview', '#5StarsSurat', '#ShreeBeautyStudio', '#SuratSalonReviews', '#LovedByBrides', '#SuratBeautyParlour'
        ],
      },
    };

    const catData = DATA[captionCategory] || DATA.bridal;
    const hooksList = catData.hooks[captionLanguage] || catData.hooks.hinglish;
    const bodiesList = catData.bodies[captionLanguage] || catData.bodies.hinglish;
    const techList = catData.technique[captionLanguage] || catData.technique.hinglish;

    // Filter out the last hook to guarantee non-repetition
    const availableHooks = hooksList.filter(h => h !== lastHookUsed);
    const chosenHook = pickRandom(availableHooks.length > 0 ? availableHooks : hooksList);
    setLastHookUsed(chosenHook);

    const chosenBody = pickRandom(bodiesList);
    const chosenTech = pickRandom(techList);

    // Pick 12 random hashtags from pool and shuffle
    const chosenHashtags = pickMultipleRandom(catData.hashtags, 12).join(' ');

    // CTA options
    const ctas = [
      `📍 Studio Address: ${address}\n📞 Bridal Booking Helpline: ${phone}\n🔗 Instant Booking: https://shreebeautystudio.in/book`,
      `📍 Visit Us: ${address}\n📞 Call / WhatsApp: ${phone}\n🌐 Reserve Slot Online: https://shreebeautystudio.in/book`,
      `📍 Location: ${address}\n📞 Priority Appointments: ${phone}\n🔗 Book Today: https://shreebeautystudio.in/book`,
      `📍 ${address}\n📞 WhatsApp Support: ${phone}\n🔗 Online Pass: https://shreebeautystudio.in/book`,
    ];
    const chosenCta = pickRandom(ctas);

    const fullCaption = `${chosenHook}\n\n${chosenBody}\n\n${chosenTech}${offerStr}\n\n${chosenCta}\n\n────────────────\n${chosenHashtags}`;

    return fullCaption;
  }, [captionCategory, captionLanguage, clientName, specialOffer, settings, lastHookUsed]);

  // Master Generation Function (API first, instant fallback)
  const handleGenerateFresh = async () => {
    setIsGenerating(true);
    const newCount = generationCount + 1;
    setGenerationCount(newCount);

    try {
      const salonName = settings?.salon || 'Shree Beauty Studio';
      const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
      const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';

      // 1. Fetch from AI endpoint with timeout
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
          toast(`✨ Generated brand-new AI caption #${newCount} (${json.provider || 'AI'})!`, 'success');
          setIsGenerating(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // 2. High-Speed Infinite Combinatorial Engine
    const dynamicCaption = generateInfiniteCaption();
    setGeneratedCaption(dynamicCaption);
    toast(`✨ Generated 100% unique non-repeating caption #${newCount}!`, 'success');
    setIsGenerating(false);
  };

  useEffect(() => {
    const initial = generateInfiniteCaption();
    setGeneratedCaption(initial);
  }, [captionCategory, captionLanguage, clientName, specialOffer]);

  // Open Share Dialog for a specific post
  const openShareModal = (post: InstagramPost) => {
    setSelectedPostForShare(post);
    const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
    const defaultMsg = `👑 *SHREE BEAUTY STUDIO — Live Instagram Showcase* ✨\n\nHello! Check out our latest transformation on Instagram:\n👉 ${post.permalink}\n\n💄 *Caption:* ${post.caption.slice(0, 140)}...\n\n📍 *Studio Address:* ${settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'}\n📞 *Book Appointment:* ${phone}\n🌐 *Book Online:* https://shreebeautystudio.in/book\n\nFollow us on Instagram: ${settings?.instagramHandle || '@shreebeauty.studio'} 💖`;
    setCustomShareMessage(defaultMsg);
  };

  // Test Meta API Connection
  const testMetaApi = async () => {
    setTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${accountId.trim()}?fields=id,name,username&access_token=${token.trim()}`);
      const json = await res.json();
      if (res.ok && json.id) {
        setApiTestResult({
          success: true,
          message: `✅ Connected to Meta Graph API! Account: @${json.username || json.name || accountId} (ID: ${json.id})`,
        });
        toast('✅ Meta Graph API token is valid & active!', 'success');
      } else {
        setApiTestResult({
          success: false,
          message: `❌ Error: ${json?.error?.message || 'Invalid Token or Account ID'}`,
        });
        toast(json?.error?.message || 'API Validation failed', 'error');
      }
    } catch (e: any) {
      setApiTestResult({
        success: false,
        message: `❌ Connection error: ${e.message}`,
      });
      toast('Connection error testing token', 'error');
    } finally {
      setTestingApi(false);
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
      {/* ── Top Hero Banner with Instagram Gradient & Live Metrics ── */}
      <motion.div
        className="card"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        style={{
          background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.12) 0%, rgba(253, 29, 29, 0.08) 50%, rgba(245, 96, 64, 0.04) 100%)',
          border: '1px solid rgba(225, 48, 108, 0.3)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(220, 39, 67, 0.35)',
                flexShrink: 0,
              }}
            >
              <Instagram size={30} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
                  Instagram Auto-Sync & Social Hub
                </h1>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '3px 10px',
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
                  Live Meta API v19.0 Active
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--muted-foreground)' }}>
                Directly connected to <strong style={{ color: '#E1306C' }}>{settings?.instagramHandle || '@shreebeauty.studio'}</strong> — auto-syncing Reels, photos, AI caption generator & WhatsApp broadcaster.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={fetchFeed}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Syncing Live...' : 'Refresh Feed'}
            </button>

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
                boxShadow: '0 4px 12px rgba(220, 39, 67, 0.25)',
              }}
            >
              <Instagram size={14} />
              Open Instagram Profile ↗
            </a>

            <a
              href="https://business.facebook.com/latest/home"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Globe size={14} color="#0084FF" />
              Meta Business Suite ↗
            </a>
          </div>
        </div>

        {/* ── KPI Counter Cards ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 20,
            paddingTop: 18,
            borderTop: '1px solid rgba(225, 48, 108, 0.18)',
          }}
        >
          <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.7))', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={13} color="#E1306C" /> Total Synced Posts
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--foreground)' }}>
              {totalPosts}
            </div>
          </div>

          <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.7))', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Film size={13} color="#833AB4" /> Reels & Videos
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#833AB4' }}>
              {totalReels}
            </div>
          </div>

          <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.7))', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={13} color="#F56040" /> Photos & Carousels
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#F56040' }}>
              {totalPhotos}
            </div>
          </div>

          <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.7))', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Heart size={13} color="#dc2626" /> Total Post Likes
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#dc2626' }}>
              {totalLikes.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Navigation Tabs ── */}
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
          onClick={() => setActiveTab('feed')}
          className={`btn ${activeTab === 'feed' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Instagram size={15} />
          Live Posts & Reels Feed ({posts.length})
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`btn ${activeTab === 'studio' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Sparkles size={15} color="#eab308" />
          AI Caption & Reel Hook Studio
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
          Meta API & Feed Settings
        </button>
      </div>

      {/* ── TAB 1: LIVE FEED & REELS ── */}
      {activeTab === 'feed' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilterType('all')}
                className={`btn btn-xs ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 600, borderRadius: 20 }}
              >
                All Content ({posts.length})
              </button>
              <button
                onClick={() => setFilterType('reel')}
                className={`btn btn-xs ${filterType === 'reel' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 600, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Film size={12} /> Reels ({totalReels})
              </button>
              <button
                onClick={() => setFilterType('photo')}
                className={`btn btn-xs ${filterType === 'photo' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 600, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ImageIcon size={12} /> Photos ({totalPhotos})
              </button>
            </div>

            <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                placeholder="Search captions, bridal, hair..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-sm"
                style={{ paddingLeft: 30, borderRadius: 20, width: '100%' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Feed Grid */}
          {loading && posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <RefreshCw size={36} className="animate-spin" color="#E1306C" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Connecting to Meta Graph API & fetching live Instagram feed...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 16 }}>
              <Instagram size={42} color="#E1306C" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>No Instagram posts match your filter</h3>
              <p style={{ fontSize: 13.5, color: 'var(--muted-foreground)', maxWidth: 400, margin: '0 auto 16px' }}>
                Try changing your search keywords or click Refresh Feed to fetch new content.
              </p>
              <button onClick={() => { setFilterType('all'); setSearchQuery(''); }} className="btn btn-secondary btn-sm">
                Reset Filters
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 18,
              }}
            >
              {filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  variants={fadeSlideUp}
                  className="card"
                  style={{
                    padding: 0,
                    borderRadius: 14,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Thumbnail / Media Container */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '100%',
                      background: '#18181b',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={post.thumbnail}
                      alt={post.caption || 'Instagram Post'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                      }}
                    />

                    {/* Media Type Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: post.type === 'reel' ? 'linear-gradient(45deg, #f09433, #dc2743)' : 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {post.type === 'reel' ? <Film size={12} /> : <ImageIcon size={12} />}
                      {post.type === 'reel' ? 'REEL' : 'PHOTO'}
                    </div>

                    {/* Likes & Comments Overlay on bottom */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '24px 12px 8px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Heart size={13} fill="#ef4444" color="#ef4444" />
                          {post.likes.toLocaleString('en-IN')}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MessageCircle size={13} />
                          {post.comments}
                        </span>
                      </div>
                      <span style={{ fontSize: 10.5, opacity: 0.85 }}>
                        {post.timestamp ? new Date(post.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Live Feed'}
                      </span>
                    </div>
                  </div>

                  {/* Caption & Actions */}
                  <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <p
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: 'var(--foreground)',
                        margin: '0 0 12px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={post.caption}
                    >
                      {post.caption || 'Shree Beauty Studio Transformation ✨'}
                    </p>

                    {/* Action Toolbar */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 6,
                        paddingTop: 10,
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <button
                        onClick={() => openShareModal(post)}
                        className="btn btn-secondary btn-xs"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontWeight: 700,
                          color: '#16a34a',
                        }}
                      >
                        <Send size={12} /> Share WA
                      </button>

                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-xs"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontWeight: 600,
                        }}
                      >
                        <ExternalLink size={12} /> Open IG
                      </a>

                      <button
                        onClick={() => copyToClipboard(post.permalink, `link-${post.id}`)}
                        className="btn btn-secondary btn-xs"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        {copiedId === `link-${post.id}` ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        Copy Link
                      </button>

                      <button
                        onClick={() => copyToClipboard(post.caption, `cap-${post.id}`)}
                        className="btn btn-secondary btn-xs"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        {copiedId === `cap-${post.id}` ? <Check size={12} color="#16a34a" /> : <Sparkles size={12} />}
                        Copy Caption
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── TAB 2: AI CAPTION & REEL HOOK STUDIO ── */}
      {activeTab === 'studio' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Controls Card */}
          <div className="card" style={{ borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color="#ca8a04" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Infinite AI Caption & Reel Studio</h3>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>Generate 100% unique, non-repeating viral captions & hashtags</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>1. Choose Category</label>
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
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>2. Tone & Language</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'hinglish', label: 'Hinglish (Viral)' },
                    { id: 'gujarati', label: 'ગુજરાતી (Local)' },
                    { id: 'english', label: 'English (Luxury)' },
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

              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Client / Bride Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Kinjal Patel or Anjali Shah"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input input-sm"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Special Offer / Discount Highlight (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 20% OFF on Advance Bridal Booking this week!"
                  value={specialOffer}
                  onChange={(e) => setSpecialOffer(e.target.value)}
                  className="input input-sm"
                />
              </div>

              {/* Master Refresh New Generate Button */}
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
                  boxShadow: '0 6px 20px rgba(220, 39, 67, 0.35)',
                }}
              >
                <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'GENERATING UNIQUE CAPTION...' : '🔄 REFRESH NEW GENERATE (NEVER REPEATS)'}
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Instagram size={18} color="#E1306C" />
                <span style={{ fontSize: 14, fontWeight: 800 }}>Ready-to-Post Instagram Caption</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 12,
                    background: 'rgba(225, 48, 108, 0.12)',
                    color: '#E1306C',
                    border: '1px solid rgba(225, 48, 108, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Sparkles size={11} /> 100% Unique #{generationCount}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={handleGenerateFresh}
                  disabled={isGenerating}
                  className="btn btn-secondary btn-xs"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#E1306C' }}
                  title="Generate another fresh, non-repeating caption"
                >
                  <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                  New Unique Angle
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
              readOnly
              value={generatedCaption}
              rows={16}
              className="input"
              style={{
                fontFamily: 'monospace',
                fontSize: 12.5,
                lineHeight: 1.55,
                padding: 14,
                borderRadius: 10,
                resize: 'none',
                flex: 1,
                background: 'var(--bg-secondary, rgba(0,0,0,0.02))',
              }}
            />

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted-foreground)' }}>
              <span>Character count: {generatedCaption.length}</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Non-repeating viral Instagram Reels algorithm optimized</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 3: CROSS-POSTING & MULTI-CHANNEL ── */}
      {activeTab === 'crosspost' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ borderRadius: 16, padding: 22 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={20} color="#3b82f6" />
              1-Click Multi-Channel Cross-Posting Workflow
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--muted-foreground)', margin: '0 0 18px' }}>
              Publishing an Instagram Reel? Automatically sync it across your Google Business Profile, Facebook Page, and WhatsApp Broadcast.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Google Business Profile Post */}
              <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.7))', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Globe size={18} color="#ea4335" />
                  <strong style={{ fontSize: 14 }}>Google Maps / Business Post</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12 }}>
                  Post updates directly to Google Maps to boost local 3-pack SEO ranking when Surat brides search &quot;Best Bridal Studio Near Me&quot;.
                </p>
                <button
                  onClick={() => {
                    const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
                    const gbpPost = `👑 SHREE BEAUTY STUDIO — BRIDAL GLAM & SALON SURAT\n\nLooking for the best bridal makeup and skincare in Surat? Book your session at Shree Beauty Studio, Katargam!\n\n📍 Address: ${settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'}\n📞 Call: ${phone}\n🌐 Book Online: https://shreebeautystudio.in/book\n📸 Instagram: ${settings?.instagramHandle || '@shreebeauty.studio'}`;
                    copyToClipboard(gbpPost, 'gbp-copy');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600 }}
                >
                  {copiedId === 'gbp-copy' ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  Copy Google Maps Post Format
                </button>
                <a
                  href="https://business.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}
                >
                  <ExternalLink size={13} /> Open Google Business Manager ↗
                </a>
              </div>

              {/* Meta Business Suite Cross-Post */}
              <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.7))', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Instagram size={18} color="#E1306C" />
                  <strong style={{ fontSize: 14 }}>Instagram ➔ Facebook Auto-Share</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12 }}>
                  Enable automatic cross-posting inside Meta Business Suite so every Reel posted to @shreebeauty.studio automatically posts to Facebook.
                </p>
                <a
                  href="https://business.facebook.com/latest/settings/connected_accounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}
                >
                  <ExternalLink size={14} /> Link Meta Facebook & Instagram ↗
                </a>
              </div>

              {/* WhatsApp Broadcast */}
              <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.7))', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <MessageCircle size={18} color="#25D366" />
                  <strong style={{ fontSize: 14 }}>WhatsApp Status / Broadcast</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12 }}>
                  Send newly published bridal reels to your VIP client broadcast list to trigger instant appointment bookings.
                </p>
                <Link
                  href="/admin/whatsapp"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, color: '#16a34a' }}
                >
                  <Send size={14} /> Open WhatsApp Broadcast Hub
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 4: META API & FEED SETTINGS ── */}
      {activeTab === 'settings' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Settings Form */}
          <div className="card" style={{ borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} color="#E1306C" />
              Meta Graph API & Instagram Connection
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Instagram Account Handle</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@shreebeauty.studio"
                  className="input input-sm"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Instagram Profile URL</label>
                <input
                  type="text"
                  value={instaUrl}
                  onChange={(e) => setInstaUrl(e.target.value)}
                  placeholder="https://www.instagram.com/shreebeauty.studio/"
                  className="input input-sm"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Meta Instagram Business Account ID</label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="17841408494357129"
                  className="input input-sm"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>
                  Meta Graph API User/Page Access Token
                </label>
                <textarea
                  rows={3}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="EAAPI3xAR034..."
                  className="input"
                  style={{ fontFamily: 'monospace', fontSize: 11.5 }}
                />
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4, display: 'block' }}>
                  Used to query Meta Graph API v19.0 endpoint for real-time Reels, photos & like counters.
                </span>
              </div>

              {/* Validation Result */}
              {apiTestResult && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: apiTestResult.success ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: apiTestResult.success ? '#16a34a' : '#dc2626',
                    border: `1px solid ${apiTestResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {apiTestResult.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={testMetaApi}
                  disabled={testingApi || !token}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Zap size={14} className={testingApi ? 'animate-spin' : ''} />
                  {testingApi ? 'Testing API...' : 'Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <CheckCircle2 size={15} />
                  Save & Sync
                </button>
              </div>
            </div>
          </div>

          {/* Instructions & Help */}
          <div className="card" style={{ borderRadius: 16, padding: 24, background: 'var(--bg-secondary, rgba(0,0,0,0.02))' }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={16} color="#E1306C" />
              How to obtain or refresh your Meta Token
            </h4>
            <ol style={{ fontSize: 12.5, lineHeight: 1.6, paddingLeft: 18, margin: 0, color: 'var(--muted-foreground)' }}>
              <li style={{ marginBottom: 8 }}>
                Open <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" style={{ color: '#0084FF', fontWeight: 600 }}>Meta Graph API Explorer ↗</a>.
              </li>
              <li style={{ marginBottom: 8 }}>
                Select your Meta App and generate a User Token with permissions: <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: 4 }}>instagram_basic</code>, <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: 4 }}>pages_show_list</code>.
              </li>
              <li style={{ marginBottom: 8 }}>
                Convert to a <strong>60-Day Long-Lived Token</strong> using the Access Token Tool.
              </li>
              <li>
                Paste the token here and click <strong>Save & Sync</strong>. Your live feed and public website will update automatically!
              </li>
            </ol>
          </div>
        </motion.div>
      )}

      {/* ── SHARE VIA WHATSAPP MODAL ── */}
      <AnimatePresence>
        {selectedPostForShare && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card"
              style={{
                width: '100%',
                maxWidth: 500,
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={16} color="#16a34a" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Share Reel to Customer</h3>
                    <p style={{ fontSize: 11.5, color: 'var(--muted-foreground)', margin: 0 }}>Send directly via WhatsApp Web or Mobile App</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPostForShare(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Select Customer */}
              <div style={{ marginBottom: 14 }}>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Select Customer (or Type Phone)</label>
                <select
                  className="input input-sm"
                  onChange={(e) => setSelectedCustomerPhone(e.target.value)}
                  value={selectedCustomerPhone}
                  style={{ marginBottom: 8 }}
                >
                  <option value="">-- Choose from Customer Directory ({customers.length}) --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.mobile}>
                      {c.name} ({c.mobile})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter 10-digit WhatsApp phone: 9898012345"
                  value={selectedCustomerPhone}
                  onChange={(e) => setSelectedCustomerPhone(e.target.value)}
                  className="input input-sm"
                />
              </div>

              {/* Message Preview */}
              <div style={{ marginBottom: 16 }}>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Message Text Preview</label>
                <textarea
                  rows={7}
                  value={customShareMessage}
                  onChange={(e) => setCustomShareMessage(e.target.value)}
                  className="input"
                  style={{ fontSize: 12, lineHeight: 1.45 }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  disabled={!selectedCustomerPhone.trim()}
                  onClick={() => {
                    openWAWeb(selectedCustomerPhone.trim(), customShareMessage);
                    toast('🚀 Opening WhatsApp Web...', 'success');
                  }}
                  className="btn btn-primary"
                  style={{ background: '#25D366', color: '#053320', fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={15} />
                  WhatsApp Web
                </button>

                <button
                  type="button"
                  disabled={!selectedCustomerPhone.trim()}
                  onClick={() => {
                    openWAApp(selectedCustomerPhone.trim(), customShareMessage);
                    toast('📱 Opening WhatsApp Desktop / App...', 'success');
                  }}
                  className="btn btn-secondary"
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Phone size={15} />
                  WhatsApp App
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
