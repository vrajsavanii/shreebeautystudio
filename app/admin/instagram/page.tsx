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
  CheckCircle,
  ZoomIn,
  ZoomOut,
  Crop,
  RotateCw,
  Move,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Maximize,
  Download,
  Grid,
  Sliders,
  EyeOff,
  MapPin,
  Users,
  AtSign,
  Tag,
  ChevronDown,
  ChevronUp
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
type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | 'original';

interface MediaItem {
  id: string;
  file: File;
  previewUrl: string;
  type: 'photo' | 'video';
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  aspectRatio: AspectRatio;
  fitMode?: 'cover' | 'contain';
  naturalWidth?: number;
  naturalHeight?: number;
}

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

  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<InstagramPost[]>([]);

  // ── MULTI-PHOTO & CROP / ZOOM STATE ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [globalAspectRatio, setGlobalAspectRatio] = useState<AspectRatio>('original');
  const [showGrid, setShowGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingStep, setPublishingStep] = useState('');
  const [publishSuccess, setPublishSuccess] = useState<boolean | null>(null);
  const [publishMessage, setPublishMessage] = useState<string>('');

  // AI Caption Studio & Post Metadata State
  const [captionCategory, setCaptionCategory] = useState<'bridal' | 'sagai' | 'hydrafacial' | 'hair' | 'nails' | 'festival' | 'review'>('bridal');
  const [captionLanguage, setCaptionLanguage] = useState<'english' | 'hinglish' | 'gujarati'>('hinglish');
  const [generationCount, setGenerationCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clientName, setClientName] = useState('');
  const [specialOffer, setSpecialOffer] = useState('');
  const [postLocation, setPostLocation] = useState('Katargam, Surat');
  const [collaborator, setCollaborator] = useState('');
  const [showFullCaption, setShowFullCaption] = useState(true);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [lastHookUsed, setLastHookUsed] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Settings state
  const [handle, setHandle] = useState(settings?.instagramHandle || '@shreebeauty.studio');
  const [instaUrl, setInstaUrl] = useState(settings?.instagramUrl || 'https://www.instagram.com/shreebeauty.studio/');
  const [accountId, setAccountId] = useState(settings?.instagramAccountId || '17841408494357129');
  const [token, setToken] = useState(settings?.instagramAccessToken || '');

  // Fetch Instagram Feed
  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/instagram/feed');
      const json = await res.json();
      if (json.success && Array.isArray(json.posts)) {
        setPosts(json.posts);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast('📋 Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Active Media Item
  const currentItem = mediaItems[activeMediaIndex] || null;

  // ── MULTI-FILE SELECTION HANDLER ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newItems: MediaItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVid = file.type.startsWith('video/');
        const previewUrl = URL.createObjectURL(file);
        const id = `media_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

        const item: MediaItem = {
          id,
          file,
          previewUrl,
          type: isVid ? 'video' : 'photo',
          zoom: 1,
          panX: 0,
          panY: 0,
          rotation: 0,
          aspectRatio: globalAspectRatio,
          fitMode: 'cover',
        };

        if (!isVid) {
          const img = new Image();
          img.onload = () => {
            setMediaItems((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight } : m
              )
            );
          };
          img.src = previewUrl;
        }

        newItems.push(item);
      }

      setMediaItems((prev) => {
        const combined = [...prev, ...newItems].slice(0, 10); // max 10 photos on Instagram
        return combined;
      });

      setPublishSuccess(null);
      setPublishMessage('');
      toast(`📁 Added ${files.length} item(s)! Total: ${mediaItems.length + files.length}`, 'success');
    }
  };

  // Remove individual photo
  const handleRemoveItem = (index: number) => {
    setMediaItems((prev) => {
      const itemToRemove = prev[index];
      if (itemToRemove?.previewUrl) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }
      const updated = prev.filter((_, i) => i !== index);
      if (activeMediaIndex >= updated.length) {
        setActiveMediaIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  // Update properties of active item (Zoom / Pan / Rotation / Fit)
  const updateCurrentItem = (updates: Partial<MediaItem>) => {
    if (!currentItem) return;
    setMediaItems((prev) => {
      return prev.map((item, idx) => (idx === activeMediaIndex ? { ...item, ...updates } : item));
    });
  };

  // Change Aspect Ratio
  const handleAspectRatioChange = (ratio: AspectRatio, applyToAll = true) => {
    setGlobalAspectRatio(ratio);
    if (applyToAll) {
      setMediaItems((prev) => prev.map((item) => ({ ...item, aspectRatio: ratio })));
      toast(`📐 Set Crop Aspect Ratio to ${ratio === 'original' ? 'Original (Full)' : ratio} (All Photos)`, 'success');
    } else {
      updateCurrentItem({ aspectRatio: ratio });
      toast(`📐 Set Photo #${activeMediaIndex + 1} Crop to ${ratio === 'original' ? 'Original (Full)' : ratio}`, 'success');
    }
  };

  // ── CLIENT-SIDE HIGH-RES CANVAS CROPPER & EXPORTER ──
  const processPhotoCrop = async (item: MediaItem): Promise<File> => {
    if (item.type === 'video') return item.file;

    // If original ratio with standard framing, return raw file
    if (
      item.aspectRatio === 'original' &&
      (!item.zoom || item.zoom === 1) &&
      !item.panX &&
      !item.panY &&
      !item.rotation &&
      item.fitMode !== 'contain'
    ) {
      return item.file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let targetW = 1080;
        let targetH = 1080;

        switch (item.aspectRatio) {
          case 'original':
            targetW = img.naturalWidth || 1080;
            targetH = img.naturalHeight || 1080;
            break;
          case '4:5':
            targetW = 1080;
            targetH = 1350;
            break;
          case '9:16':
            targetW = 1080;
            targetH = 1920;
            break;
          case '16:9':
            targetW = 1920;
            targetH = 1080;
            break;
          case '1:1':
          default:
            targetW = 1080;
            targetH = 1080;
            break;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(item.file);
          return;
        }

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetW, targetH);

        // Center transformation
        ctx.save();
        ctx.translate(targetW / 2, targetH / 2);

        if (item.rotation) {
          ctx.rotate((item.rotation * Math.PI) / 180);
        }

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = targetW / targetH;
        let baseW = targetW;
        let baseH = targetH;

        if (item.fitMode === 'contain') {
          // Fit whole image inside container
          if (imgRatio > targetRatio) {
            baseW = targetW;
            baseH = targetW / imgRatio;
          } else {
            baseH = targetH;
            baseW = targetH * imgRatio;
          }
        } else {
          // Cover container
          if (imgRatio > targetRatio) {
            baseH = targetH;
            baseW = targetH * imgRatio;
          } else {
            baseW = targetW;
            baseH = targetW / imgRatio;
          }
        }

        const scale = Math.max(1, item.zoom || 1);
        const drawW = baseW * scale;
        const drawH = baseH * scale;

        // Preview box is ~360px wide, calculate pan proportion
        const panScale = targetW / 360;
        const offsetX = (item.panX || 0) * panScale;
        const offsetY = (item.panY || 0) * panScale;

        ctx.drawImage(img, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const safeName = item.file.name.replace(/\.[^/.]+$/, '') + '_instagram_crop.jpg';
              const processedFile = new File([blob], safeName, { type: 'image/jpeg' });
              resolve(processedFile);
            } else {
              resolve(item.file);
            }
          },
          'image/jpeg',
          0.95
        );
      };

      img.onerror = () => resolve(item.file);
      img.src = item.previewUrl;
    });
  };

  const handleDownloadCrop = async () => {
    if (!currentItem) return;
    try {
      const croppedFile = await processPhotoCrop(currentItem);
      const url = URL.createObjectURL(croppedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shree_${currentItem.aspectRatio || 'original'}_${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast('💾 Cropped photo saved to your device!', 'success');
    } catch {
      toast('Failed to download cropped image', 'error');
    }
  };

  // ── INFINITE NON-REPEATING CAPTION GENERATOR ──
  const generateInfiniteCaption = useCallback(() => {
    const salonName = settings?.salon || 'Shree Beauty Studio';
    const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
    const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
    const nameStr = clientName.trim() ? clientName.trim() : 'our gorgeous bride';
    const offerStr = specialOffer.trim() ? `\n\n🎉 Special Limited Offer: ${specialOffer.trim()}` : '';

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
          ],
          gujarati: [
            `👑 શ્રી બ્યૂટી સ્ટુડિયો રોયલ બ્રાઇડલ લુક: ${nameStr} ✨`,
            `🪔 પાનેતર અને કંકુ પગલાંનો અનોખો શાહી શણગાર: શ્રી બ્યૂટી સ્ટુડિયો 👰`,
            `💖 લગ્નના પવિત્ર દિવસે મેળવો 100% નેચરલ અને વોટરપ્રૂફ HD એરબ્રશ ગ્લો! ✨`,
            `🌸 સુરતની દરેક કન્યાનું સપનું: શ્રી બ્યૂટી સ્ટુડિયો રોયલ બ્રાઇડલ મેકઓવર 👑`,
          ],
          english: [
            `👑 Timeless Elegance & Bridal Perfection for ${nameStr} ✨`,
            `✨ The Modern Indian Bride: Radiance, Grace & Bespoke Artistry at ${salonName} 👰`,
            `💄 The Art of Flawless, Flash-Ready Bridal Artistry on ${nameStr} 👑`,
          ],
        },
        bodies: {
          hinglish: [
            `Ek bride ke sabse special din par uski natural beauty ko elevate karna is our pure passion. From customized HD airbrush glow to precision eye artistry and royal veil draping—every single detail crafted to perfection.`,
            `Zero cakey layers. 100% waterproof, sweatproof, and camera-ready magic! Designed to stay fresh through all the emotional moments, mandap pheras, and midnight reception spotlight.`,
          ],
          gujarati: [
            `લગ્નના પવિત્ર દિવસે દરેક કન્યાનું સપનું હોય છે સૌથી સુંદર અને શાહી દેખાવું! શ્રી બ્યૂટી સ્ટુડિયો લાવે છે 100% વોટરપ્રૂફ HD એરબ્રશ મેકઅપ, પરફેક્ટ આઇ આર્ટ અને રોયલ ચૂંદડી ડ્રેપિંગ.`,
          ],
          english: [
            `Creating an ethereal, regal bridal glow that lasts through all the emotional moments and smiles. Mastered with luxury international cosmetics, weightless finish, and bespoke jewelry setting.`,
          ],
        },
        technique: {
          hinglish: [`✨ HD Airbrush Finish | 100% Waterproof | Tear-Proof & Flash-Ready`],
          gujarati: [`✨ 100% વોટરપ્રૂફ એરબ્રશ | HD ફિનિશ | રોયલ ચૂંદડી સેટિંગ`],
          english: [`✨ HD Airbrush Magic | Tear-Proof & Waterproof`],
        },
        hashtags: [
          '#ShreeBeautyStudio', '#SuratBridalMakeup', '#SuratMakeupArtist', '#GujaratiBride', '#BridalMakeoverSurat',
          '#RoyalBride', '#SuratSalon', '#IndianWeddingBuzz', '#SuratBeautyStudio', '#WeddingGlam', '#KatargamSalon'
        ],
      },
      sagai: {
        hooks: {
          hinglish: [
            `💍 She said YES! ✨ Dreamy Sagai / Engagement Glam for ${nameStr} 💖`,
            `✨ The Ring Ceremony Glow: When all eyes are on our gorgeous bride-to-be ${nameStr} 💍👑`,
            `💍 Soft, Radiant & Modern Engagement Makeover for ${nameStr} at ${salonName} ✨`,
            `🔥 POV: You chose ${salonName} for your Dream Sagai / Ring Ceremony Makeover 💍💖`,
            `🥺 That special moment she looked in the mirror before her Ring Ceremony... ✨💍`,
            `💖 Pastel Elegance, Luminous Skin & Soft Romantic Curls on ${nameStr} 💍`,
            `✨ Pure sophistication: The modern clean-glam Gujarati Sagai aesthetic ✨`,
          ],
          gujarati: [
            `💍 સગાઈનો શાહી શણગાર: ${nameStr} માટે સ્પેશિયલ સોફ્ટ એન્ડ ગ્લોઇંગ મેકઓવર ✨`,
            `💖 સગાઈના પવિત્ર દિવસે મેળવો 100% નેચરલ, ફ્રેશ અને વોટરપ્રૂફ HD એરબ્રશ ગ્લો! 💍`,
            `💍 શ્રી બ્યૂટી સ્ટુડિયો રોયલ સગાઈ / એન્ગેજમેન્ટ લુક: ${nameStr} ✨`,
            `🌸 રીંગ સેરેમની સ્પેશિયલ: સુરતની દરેક કન્યાની પહેલી પસંદ શ્રી બ્યૂટી સ્ટુડિયો 💍`,
          ],
          english: [
            `💍 Timeless Elegance & Dreamy Engagement Glam for ${nameStr} ✨`,
            `✨ She's Ready for the Ring Ceremony! Radiant, Dewy & Bespoke Artistry at ${salonName} 💍`,
            `💖 Soft Pastel Glam & HD Airbrush Radiance for ${nameStr}'s Engagement Day 💍`,
          ],
        },
        bodies: {
          hinglish: [
            `Sagai is all about fresh, radiant, and dreamy aesthetics! From customized soft-glam eye artistry to lightweight HD airbrush base and romantic hairstyle—every detail crafted to perfection.`,
            `Minimal yet breathtakingly regal! Enhancing her natural features with luminous dewy skin finish, glossy lips, and flawless jewelry setting for the ring ceremony.`,
          ],
          gujarati: [
            `સગાઈના શુભ પ્રસંગે મેળવો મનમોહક અને આકર્ષક લુક! સોફ્ટ સ્મોકી આઇઝ, નેચરલ ગ્લોઇંગ બેઝ અને ટ્રેન્ડી હેરસ્ટાઇલિંગ જે તમારા ખાસ દિવસને બનાવે છે વધુ યાદગાર.`,
          ],
          english: [
            `Crafting a fresh, youthful, and luminous engagement makeover with weightless HD cosmetics, soft romantic waves, and custom drape.`,
          ],
        },
        technique: {
          hinglish: [`✨ Soft HD Glam | 100% Waterproof | Dewy Glass Finish`],
          gujarati: [`✨ સોફ્ટ HD ગ્લો | 100% વોટરપ્રૂફ | ટ્રેન્ડી હેરસ્ટાઇલ`],
          english: [`✨ Soft HD Glam | Dewy Radiant Finish | Long-Wear Formulation`],
        },
        hashtags: [
          '#SagaiMakeupSurat', '#EngagementMakeupSurat', '#SuratEngagementBride', '#SagaiLook', '#RingCeremonyMakeup',
          '#ShreeBeautyStudio', '#SuratBridalStudio', '#SuratSalon', '#EngagementGlam', '#KatargamSalon'
        ],
      },
      hydrafacial: {
        hooks: {
          hinglish: [`✨ 7-Step Korean Glass Skin HydraFacial Treatment 💧`],
          gujarati: [`✨ 7-સ્ટેપ કોરિયન ગ્લાસ સ્કીન હાઇડ્રાફેશિયલ ટ્રીટમેન્ટ 💧`],
          english: [`💧 Unlock Luminous Glass Skin with Medical-Grade HydraFacial ✨`],
        },
        bodies: {
          hinglish: [`Say goodbye to dull skin, clogged pores, and pigmentation! Experience deep exfoliation, vacuum blackhead extraction, and intense hyaluronic serum infusion for an unmistakable radiant glow.`],
          gujarati: [`ડીપ પોર ક્લીનિંગ, વેક્યુમ બ્લેકહેડ્સ રિમૂવલ અને હાઇડ્રેટિંગ સીરમ ઇન્ફ્યુઝનથી મેળવો કાચ જેવી ચમકતી સ્કીન!`],
          english: [`Vortex suction extracts impurities while simultaneously bathing the skin with nourishing antioxidants and hyaluronic peptides.`],
        },
        technique: {
          hinglish: [`✨ 100% Painless | No Downtime | Instant Glass-Skin Glow`],
          gujarati: [`✨ ઇન્સ્ટન્ટ ગ્લો | ડીપ ક્લીનિંગ | 100% પેઇનલેસ`],
          english: [`✨ Zero Downtime | Medical-Grade Extraction`],
        },
        hashtags: ['#HydraFacialSurat', '#GlassSkinSurat', '#ShreeBeautyStudio', '#SuratSkinCare', '#SkinGlowSurat'],
      },
      hair: {
        hooks: {
          hinglish: [`💇‍♀️ Silky Smooth, Mirror-Shine Hair Botox & Keratin Transformation ✨`],
          gujarati: [`💇‍♀️ વાળને આપો સોફ્ટ, સિલ્કી અને શાઇની લુક: હેર બોટોક્સ & કેરાટિન ✨`],
          english: [`✨ Liquid Glass Hair: Premium Keratin & Protein Infusion 💇‍♀️`],
        },
        bodies: {
          hinglish: [`Transform dry, frizzy, and chemically treated hair into ultra-glossy, soft-flowing hair with our formaldehyde-free protein treatment.`],
          gujarati: [`શ્રી બ્યૂટી સ્ટુડિયો ખાતે કરાવો પ્રીમિયમ હેર બોટોક્સ ટ્રીટમેન્ટ જે વાળને બનાવે છે એકદમ મુલાયમ, સિલ્કી અને ચમકદાર.`],
          english: [`Restore damaged hair cuticle health, lock in essential hydration, and achieve effortless manageable silkiness.`],
        },
        technique: {
          hinglish: [`✨ Formaldehyde-Free | Long-Lasting 6 Months | High-Gloss Shine`],
          gujarati: [`✨ 100% સેફ & પ્રોટીન રિચ | 6 મહિના સુધી સોફ્ટ વાળ`],
          english: [`✨ 100% Formaldehyde-Free | Mirror Gloss`],
        },
        hashtags: ['#HairBotoxSurat', '#KeratinSurat', '#HairSmootheningSurat', '#ShreeBeautyStudio', '#SuratHairSalon'],
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
          english: [`✨ 4+ Weeks Chip-Free`],
        },
        hashtags: ['#NailArtSurat', '#GelNailsSurat', '#BridalNails', '#ShreeBeautyStudio'],
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
          english: [`✨ Sweatproof Formula`],
        },
        hashtags: ['#FestiveGlam', '#NavratriGlow', '#DiwaliMakeover', '#ShreeBeautyStudio'],
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
          english: [`✨ 5-Star Certified`],
        },
        hashtags: ['#ClientReview', '#5StarsSurat', '#ShreeBeautyStudio', '#SuratSalonReviews'],
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

    const locStr = postLocation.trim() || 'Katargam, Surat';
    const cleanCollab = collaborator.trim()
      ? (collaborator.trim().startsWith('@') ? collaborator.trim() : `@${collaborator.trim()}`)
      : '';
    const collabStr = cleanCollab ? `\n\n🤝 In Collaboration With: ${cleanCollab}` : '';

    const ctas = [
      `📍 Location: ${locStr}\n🏠 Studio: ${address}\n📞 Bridal Booking Helpline: ${phone}\n🔗 Instant Booking: https://shreebeautystudio.in/book`,
      `📍 Location: ${locStr}\n🏠 Visit Us: ${address}\n📞 Call / WhatsApp: ${phone}\n🌐 Reserve Slot Online: https://shreebeautystudio.in/book`,
    ];
    const chosenCta = pickRandom(ctas);

    return `${chosenHook}\n\n${chosenBody}\n\n${chosenTech}${offerStr}${collabStr}\n\n${chosenCta}\n\n────────────────\n${chosenHashtags}`;
  }, [captionCategory, captionLanguage, clientName, specialOffer, postLocation, collaborator, settings, lastHookUsed]);

  // Master Generation
  const handleGenerateFresh = async () => {
    setIsGenerating(true);
    const newCount = generationCount + 1;
    setGenerationCount(newCount);

    const dynamicCaption = generateInfiniteCaption();
    setGeneratedCaption(dynamicCaption);
    toast(`✨ Generated unique caption #${newCount}!`, 'success');
    setIsGenerating(false);
  };

  useEffect(() => {
    const initial = generateInfiniteCaption();
    setGeneratedCaption(initial);
  }, [captionCategory, captionLanguage, clientName, specialOffer, postLocation, collaborator]);

  // ── 1-CLICK DIRECT PUBLISH TO INSTAGRAM (WITH EXACT HIGH-RES CROP & MULTI-PHOTO CAROUSEL) ──
  const handlePublishToInstagram = async () => {
    if (mediaItems.length === 0) {
      toast('⚠️ કૃપા કરીને પહેલા તમારા ફોન/લેપટોપમાંથી ફોટો કે વીડિયો સિલેક્ટ કરો (Please select photo(s) or video to post)!', 'error');
      fileInputRef.current?.click();
      return;
    }

    if (!generatedCaption.trim()) {
      toast('⚠️ Please generate or type a caption before publishing!', 'error');
      return;
    }

    setIsPublishing(true);
    setPublishSuccess(null);
    setPublishMessage('');
    setPublishingStep(`1/4: Processing & cropping ${mediaItems.length} media file(s) with exact framing...`);

    try {
      // 1. Process all photos through canvas for exact crop / zoom / pan / rotation
      const processedFiles: File[] = [];
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (item.type === 'photo') {
          const cropped = await processPhotoCrop(item);
          processedFiles.push(cropped);
        } else {
          processedFiles.push(item.file);
        }
      }

      setPublishingStep(`2/4: Uploading ${processedFiles.length} file(s) to cloud storage...`);

      const formData = new FormData();
      formData.append('caption', generatedCaption);
      formData.append('location', postLocation);
      formData.append('collaborator', collaborator);

      if (processedFiles.length === 1) {
        formData.append('mediaType', mediaItems[0].type === 'video' ? 'reel' : 'photo');
        formData.append('file', processedFiles[0]);
      } else {
        formData.append('mediaType', 'carousel');
        processedFiles.forEach((f) => {
          formData.append('files', f);
        });
      }

      setPublishingStep(
        processedFiles.length > 1
          ? `3/4: Creating Instagram Carousel container with ${processedFiles.length} cropped photos...`
          : mediaItems[0].type === 'video'
          ? '3/4: Instagram Meta API encoding Reel video...'
          : '3/4: Creating Instagram media container...'
      );

      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (json.success && json.published) {
        setPublishSuccess(true);
        setPublishMessage(json.message || `🎉 100% Published Live to Instagram @shreebeauty.studio! (Post ID: ${json.postId || ''})`);
        toast(`🎉 Successfully published live to Instagram @shreebeauty.studio!`, 'success');

        navigator.clipboard.writeText(generatedCaption);
        fetchFeed();
      } else {
        setPublishSuccess(false);
        setPublishMessage(json.error || 'Publishing error');
        toast(json.error || 'Failed to publish to Instagram', 'error');
      }
    } catch (err: any) {
      setPublishSuccess(false);
      setPublishMessage(`Network error: ${err.message}`);
      toast('Network error during Instagram upload', 'error');
    } finally {
      setIsPublishing(false);
      setPublishingStep('');
    }
  };

  // Aspect ratio css map
  const getAspectRatioStyle = (ratio: AspectRatio, naturalWidth?: number, naturalHeight?: number): React.CSSProperties => {
    switch (ratio) {
      case 'original':
        if (naturalWidth && naturalHeight) {
          return { aspectRatio: `${naturalWidth} / ${naturalHeight}` };
        }
        return { aspectRatio: 'auto', minHeight: 320 };
      case '1:1':
        return { aspectRatio: '1 / 1' };
      case '4:5':
        return { aspectRatio: '4 / 5' };
      case '9:16':
        return { aspectRatio: '9 / 16' };
      case '16:9':
        return { aspectRatio: '16 / 9' };
      default:
        return { aspectRatio: '1 / 1' };
    }
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
                  Instagram Multi-Photo Auto-Post & Crop Studio
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
                  Carousel & Reel Direct Publish
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>
                Select multiple photos / carousel or reels, crop size (1:1 / 4:5 / 9:16), zoom & pan, attach AI captions & auto-post directly to <strong style={{ color: '#E1306C' }}>{settings?.instagramHandle || '@shreebeauty.studio'}</strong>.
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
              Open Instagram ↗
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
          🚀 Multi-Photo & Reel Auto-Post
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`btn ${activeTab === 'studio' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Sparkles size={15} color="#eab308" />
          AI Caption Studio
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`btn ${activeTab === 'feed' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Instagram size={15} />
          Synced Feed ({posts.length})
        </button>
      </div>

      {/* ── PRIMARY VIEW: MULTI-PHOTO UPLOAD + CROP + ZOOM + AUTO-POST ── */}
      {activeTab === 'upload' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          
          {/* Left Column: Multi-File Uploader, Crop Size & Zoom Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Card 1: Multi-File Selector & Thumbnail Strip */}
            <div className="card" style={{ borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(225, 48, 108, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadCloud size={18} color="#E1306C" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>1. Select Multiple Photos or Reel Video</h3>
                    <p style={{ fontSize: 11.5, color: 'var(--muted-foreground)', margin: 0 }}>Select up to 10 photos for Instagram Carousel / Album</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary btn-xs"
                  style={{
                    background: 'linear-gradient(45deg, #f09433, #dc2743)',
                    border: 'none',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <PlusCircle size={13} /> Add Photos / Reel
                </button>
              </div>

              {/* Hidden Multi-file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/mov"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {/* Empty state dropzone */}
              {mediaItems.length === 0 ? (
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
                    <ImageIcon size={24} color="#E1306C" />
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 4px', color: 'var(--foreground)' }}>
                    Tap to Choose Multiple Photos or Video Reel
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                    Select 1 to 10 bridal / makeover photos for an Instagram Carousel Album
                  </p>
                </div>
              ) : (
                <div>
                  {/* Thumbnail Strip */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      overflowX: 'auto',
                      paddingBottom: 8,
                      marginBottom: 12,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {mediaItems.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => setActiveMediaIndex(idx)}
                        style={{
                          position: 'relative',
                          width: 64,
                          height: 64,
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: activeMediaIndex === idx ? '2.5px solid #E1306C' : '1px solid var(--border)',
                          cursor: 'pointer',
                          flexShrink: 0,
                          boxShadow: activeMediaIndex === idx ? '0 0 10px rgba(225, 48, 108, 0.4)' : 'none',
                        }}
                      >
                        {item.type === 'video' ? (
                          <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Film size={18} color="#fff" />
                          </div>
                        ) : (
                          <img src={item.previewUrl} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}

                        {/* Number badge */}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            left: 2,
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: 4,
                          }}
                        >
                          {idx + 1}
                        </span>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(idx);
                          }}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#fff',
                            padding: 0,
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}

                    {/* Add More Button */}
                    {mediaItems.length < 10 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 10,
                          border: '2px dashed rgba(225, 48, 108, 0.4)',
                          background: 'rgba(225, 48, 108, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#E1306C',
                          flexShrink: 0,
                          fontSize: 10,
                          fontWeight: 700,
                          gap: 2,
                        }}
                      >
                        <PlusCircle size={16} /> Add More
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted-foreground)' }}>
                    <span>Selected: <strong>{mediaItems.length} media item(s)</strong> {mediaItems.length > 1 ? '(Carousel Post)' : ''}</span>
                    <button
                      type="button"
                      onClick={() => {
                        mediaItems.forEach((m) => URL.revokeObjectURL(m.previewUrl));
                        setMediaItems([]);
                      }}
                      className="btn btn-ghost btn-xs"
                      style={{ color: '#ef4444', fontSize: 11 }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Interactive Crop Size & Zoom / Pan Controls */}
            {currentItem && (
              <div className="card" style={{ borderRadius: 16, padding: 20, border: '1.5px solid rgba(225, 48, 108, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
                      <Crop size={18} color="#ffffff" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        2. Crop Size & Zoom In / Out
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(225, 48, 108, 0.1)', color: '#E1306C' }}>
                          Photo #{activeMediaIndex + 1} of {mediaItems.length}
                        </span>
                      </h3>
                      <p style={{ fontSize: 11.5, color: 'var(--muted-foreground)', margin: 0 }}>
                        Choose Original Full Photo, 1:1, 4:5, 9:16, or 16:9 + Zoom & Pan framing
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Fit vs Cover Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => updateCurrentItem({ fitMode: currentItem.fitMode === 'contain' ? 'cover' : 'contain' })}
                      className={`btn btn-xs ${currentItem.fitMode === 'contain' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                      title="Toggle Fit Whole Photo vs Fill Frame"
                    >
                      <Maximize2 size={12} />
                      {currentItem.fitMode === 'contain' ? 'Fit (100% Whole)' : 'Fill (Cover)'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowGrid(!showGrid)}
                      className={`btn btn-xs ${showGrid ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                      title="Toggle 3x3 Rule-of-Thirds Grid"
                    >
                      <Grid size={12} />
                      {showGrid ? 'Grid On' : 'Grid Off'}
                    </button>

                    {currentItem.type === 'photo' && (
                      <button
                        type="button"
                        onClick={handleDownloadCrop}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Download cropped high-res photo"
                      >
                        <Download size={12} />
                        Save
                      </button>
                    )}
                  </div>
                </div>

                {/* Aspect Ratio Toggles */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label" style={{ fontSize: 11.5, fontWeight: 700, margin: 0 }}>
                      📐 Choose Instagram Crop Aspect Ratio:
                    </label>
                    {mediaItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleAspectRatioChange(globalAspectRatio, true)}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 10, color: '#E1306C', fontWeight: 700, padding: '2px 6px' }}
                      >
                        Apply {globalAspectRatio === 'original' ? 'Original' : globalAspectRatio} to All ({mediaItems.length})
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                    {[
                      { id: 'original', label: '📸 Original', desc: '100% Full Photo' },
                      { id: '1:1', label: '1:1 Square', desc: '1080x1080 Feed' },
                      { id: '4:5', label: '4:5 Portrait', desc: '1080x1350 Best Reach' },
                      { id: '9:16', label: '9:16 Story', desc: '1080x1920 Reel/Story' },
                      { id: '16:9', label: '16:9 Wide', desc: '1920x1080 Landscape' },
                    ].map((ratio) => {
                      const isSelected = (currentItem.aspectRatio || globalAspectRatio) === ratio.id;
                      return (
                        <button
                          key={ratio.id}
                          type="button"
                          onClick={() => handleAspectRatioChange(ratio.id as AspectRatio, false)}
                          className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            fontSize: 10.5,
                            fontWeight: isSelected ? 800 : 600,
                            flexDirection: 'column',
                            padding: '8px 3px',
                            height: 'auto',
                            background: isSelected ? 'linear-gradient(45deg, #f09433, #dc2743)' : undefined,
                            color: isSelected ? '#fff' : undefined,
                            border: isSelected ? 'none' : undefined,
                            boxShadow: isSelected ? '0 4px 12px rgba(220, 39, 67, 0.3)' : 'none',
                          }}
                        >
                          <span style={{ fontWeight: 800 }}>{ratio.label}</span>
                          <span style={{ fontSize: 8.5, opacity: 0.85 }}>{ratio.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Drag-to-Pan Canvas / Crop Preview Area */}
                <div
                  onMouseDown={(e) => {
                    setIsDragging(true);
                    setDragStart({ x: e.clientX - (currentItem.panX || 0), y: e.clientY - (currentItem.panY || 0) });
                  }}
                  onMouseMove={(e) => {
                    if (!isDragging) return;
                    const newPanX = e.clientX - dragStart.x;
                    const newPanY = e.clientY - dragStart.y;
                    updateCurrentItem({ panX: newPanX, panY: newPanY });
                  }}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      setIsDragging(true);
                      setDragStart({
                        x: e.touches[0].clientX - (currentItem.panX || 0),
                        y: e.touches[0].clientY - (currentItem.panY || 0),
                      });
                    }
                  }}
                  onTouchMove={(e) => {
                    if (!isDragging || e.touches.length !== 1) return;
                    const newPanX = e.touches[0].clientX - dragStart.x;
                    const newPanY = e.touches[0].clientY - dragStart.y;
                    updateCurrentItem({ panX: newPanX, panY: newPanY });
                  }}
                  onTouchEnd={() => setIsDragging(false)}
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    const newZoom = Math.min(3, Math.max(1, currentItem.zoom + delta));
                    updateCurrentItem({ zoom: parseFloat(newZoom.toFixed(2)) });
                  }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 380,
                    margin: '0 auto 14px',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: '#09090b',
                    border: '2px solid rgba(225, 48, 108, 0.6)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                    ...getAspectRatioStyle(currentItem.aspectRatio || globalAspectRatio, currentItem.naturalWidth, currentItem.naturalHeight),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Blurred Backdrop when fitMode is contain */}
                  {currentItem.fitMode === 'contain' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${currentItem.previewUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(16px) brightness(0.35)',
                        transform: 'scale(1.15)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Main Image or Video with Transform (Zoom + Pan + Rotation) */}
                  {currentItem.type === 'video' ? (
                    <video
                      src={currentItem.previewUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: currentItem.fitMode === 'contain' ? 'contain' : 'cover',
                        transform: `translate(${currentItem.panX}px, ${currentItem.panY}px) scale(${currentItem.zoom}) rotate(${currentItem.rotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        pointerEvents: isDragging ? 'none' : 'auto',
                      }}
                    />
                  ) : (
                    <img
                      src={currentItem.previewUrl}
                      alt="Crop Preview"
                      draggable={false}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: currentItem.fitMode === 'contain' ? 'contain' : 'cover',
                        transform: `translate(${currentItem.panX}px, ${currentItem.panY}px) scale(${currentItem.zoom}) rotate(${currentItem.rotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* 3x3 Rule-of-Thirds Grid Overlay */}
                  {showGrid && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gridTemplateRows: 'repeat(3, 1fr)',
                        zIndex: 2,
                      }}
                    >
                      {[...Array(9)].map((_, i) => (
                        <div key={i} style={{ border: '1px solid rgba(255,255,255,0.22)' }} />
                      ))}
                    </div>
                  )}

                  {/* Top-Right Drag Hint */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      backdropFilter: 'blur(4px)',
                      zIndex: 3,
                    }}
                  >
                    <Move size={10} /> Drag to Pan / Scroll Wheel Zoom
                  </div>

                  {/* Current Aspect Ratio Tag */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      backdropFilter: 'blur(4px)',
                      zIndex: 3,
                    }}
                  >
                    {currentItem.aspectRatio === 'original' ? 'Original (Full)' : currentItem.aspectRatio || globalAspectRatio} • {currentItem.zoom.toFixed(1)}x Zoom {currentItem.rotation ? `• ${currentItem.rotation}°` : ''} {currentItem.fitMode === 'contain' ? '• Fit' : '• Fill'}
                  </div>
                </div>

                {/* Zoom Slider & Adjustment Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ZoomIn size={14} color="#E1306C" /> Zoom Size ({currentItem.zoom.toFixed(2)}x)
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ zoom: Math.max(1, parseFloat((currentItem.zoom - 0.2).toFixed(2))) })}
                        className="btn btn-secondary btn-xs"
                        title="Zoom Out"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ zoom: 1, panX: 0, panY: 0, rotation: 0 })}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: 10, fontWeight: 700 }}
                        title="Reset Zoom & Pan to Original"
                      >
                        Reset (1x)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ zoom: Math.min(3, parseFloat((currentItem.zoom + 0.2).toFixed(2))) })}
                        className="btn btn-secondary btn-xs"
                        title="Zoom In"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ rotation: (currentItem.rotation + 90) % 360 })}
                        className="btn btn-secondary btn-xs"
                        title="Rotate 90 degrees clockwise"
                        style={{ fontSize: 11, fontWeight: 700 }}
                      >
                        <RotateCw size={12} /> 90°
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.02"
                    value={currentItem.zoom}
                    onChange={(e) => updateCurrentItem({ zoom: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#E1306C' }}
                  />

                  {/* 4-way Directional Pan Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                      Pan Framing:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ panX: currentItem.panX + 20 })}
                        className="btn btn-secondary btn-xs"
                        style={{ padding: '3px 8px' }}
                        title="Pan Left"
                      >
                        ◀ Left
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ panY: currentItem.panY + 20 })}
                        className="btn btn-secondary btn-xs"
                        style={{ padding: '3px 8px' }}
                        title="Pan Up"
                      >
                        ▲ Up
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ panY: currentItem.panY - 20 })}
                        className="btn btn-secondary btn-xs"
                        style={{ padding: '3px 8px' }}
                        title="Pan Down"
                      >
                        ▼ Down
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ panX: currentItem.panX - 20 })}
                        className="btn btn-secondary btn-xs"
                        style={{ padding: '3px 8px' }}
                        title="Pan Right"
                      >
                        ▶ Right
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card 3: AI Caption Topic, Location & Collaborate Setup */}
            <div className="card" style={{ borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color="#ca8a04" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>3. AI Caption, Location & Collab Setup</h3>
                    <p style={{ fontSize: 11.5, color: 'var(--muted-foreground)', margin: 0 }}>Customize topic, bride name, location tag & Instagram collaborator</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6 }}>
                  {[
                    { id: 'bridal', label: '👑 Bridal' },
                    { id: 'sagai', label: '💍 Sagai' },
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

                {/* Language Chips */}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                      👰 Bride / Client Name:
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
                      🎉 Special Offer / Discount:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 20% OFF Bridal"
                      value={specialOffer}
                      onChange={(e) => setSpecialOffer(e.target.value)}
                      className="input input-xs"
                    />
                  </div>
                </div>

                {/* ── 📍 ADD LOCATION SECTION ── */}
                <div style={{ background: 'var(--bg-secondary, rgba(0,0,0,0.02))', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label" style={{ fontSize: 11.5, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--foreground)' }}>
                      <MapPin size={13} color="#E1306C" />
                      <span>📍 Add Instagram Location:</span>
                    </label>
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Shown in post header & caption</span>
                  </div>

                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="Location: Katargam, Surat"
                      value={postLocation}
                      onChange={(e) => setPostLocation(e.target.value)}
                      className="input input-xs"
                      style={{ paddingLeft: 26 }}
                    />
                    <MapPin size={12} color="#E1306C" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    {postLocation && (
                      <button
                        type="button"
                        onClick={() => setPostLocation('')}
                        style={{
                          position: 'absolute',
                          right: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted-foreground)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Location Preset Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {[
                      'Katargam, Surat',
                      'Shree Beauty Studio',
                      'Surat, Gujarat',
                      'Mota Varachha, Surat',
                      'Adajan, Surat',
                      'Vesu, Surat',
                    ].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setPostLocation(loc)}
                        className={`btn btn-xs ${postLocation === loc ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          fontSize: 9.5,
                          padding: '2px 7px',
                          height: 'auto',
                          borderRadius: 999,
                          border: postLocation === loc ? 'none' : '1px solid var(--border)',
                          background: postLocation === loc ? 'linear-gradient(45deg, #f09433, #dc2743)' : undefined,
                          color: postLocation === loc ? '#fff' : undefined,
                          fontWeight: postLocation === loc ? 800 : 500,
                        }}
                      >
                        📍 {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── 🤝 ADD COLLABORATE SECTION ── */}
                <div style={{ background: 'var(--bg-secondary, rgba(0,0,0,0.02))', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label" style={{ fontSize: 11.5, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--foreground)' }}>
                      <Users size={13} color="#E1306C" />
                      <span>🤝 Add Instagram Collaborator (@username):</span>
                    </label>
                    <span style={{ fontSize: 10, color: '#E1306C', fontWeight: 700 }}>Co-Author Collab</span>
                  </div>

                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="e.g. @kinjal_patel or @wedding_clicks"
                      value={collaborator}
                      onChange={(e) => setCollaborator(e.target.value)}
                      className="input input-xs"
                      style={{ paddingLeft: 26 }}
                    />
                    <AtSign size={12} color="#E1306C" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    {collaborator && (
                      <button
                        type="button"
                        onClick={() => setCollaborator('')}
                        style={{
                          position: 'absolute',
                          right: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted-foreground)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Collaborator Preset Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {[
                      '@kinjal_patel',
                      '@bride_look_surat',
                      '@gujaratibrides',
                      '@surat_weddings',
                      '@shreebeautystudio',
                    ].map((collab) => (
                      <button
                        key={collab}
                        type="button"
                        onClick={() => setCollaborator(collab)}
                        className={`btn btn-xs ${collaborator === collab ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          fontSize: 9.5,
                          padding: '2px 7px',
                          height: 'auto',
                          borderRadius: 999,
                          border: collaborator === collab ? 'none' : '1px solid var(--border)',
                          background: collaborator === collab ? 'linear-gradient(45deg, #f09433, #dc2743)' : undefined,
                          color: collaborator === collab ? '#fff' : undefined,
                          fontWeight: collaborator === collab ? 800 : 500,
                        }}
                      >
                        🤝 {collab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Instagram Carousel / Post Mockup & 1-Click Master Publish */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Live Instagram Post Mockup Card */}
            <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Instagram size={18} color="#E1306C" />
                  <span style={{ fontSize: 14, fontWeight: 800 }}>4. Live Instagram Post Preview & Edit</span>
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

              {/* Instagram Mobile Card Mockup Shell */}
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
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: 'linear-gradient(45deg, #f09433, #dc2743)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 13,
                        boxShadow: '0 2px 8px rgba(220, 39, 67, 0.3)',
                        flexShrink: 0,
                      }}
                    >
                      S
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--foreground)' }}>shreebeauty.studio</span>
                        <CheckCircle size={12} color="#3b82f6" fill="#3b82f6" />
                        {collaborator.trim() && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: '#E1306C',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              background: 'rgba(225, 48, 108, 0.1)',
                              padding: '1px 6px',
                              borderRadius: 6,
                              border: '1px solid rgba(225, 48, 108, 0.2)',
                            }}
                          >
                            <Users size={11} /> and {collaborator.trim().startsWith('@') ? collaborator.trim() : `@${collaborator.trim()}`}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--muted-foreground)' }}>
                        <MapPin size={10} color="#E1306C" />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{postLocation.trim() || 'Katargam, Surat'}</span>
                        <span>•</span>
                        <span>Original Audio</span>
                      </div>
                    </div>
                  </div>

                  {mediaItems.length > 1 && (
                    <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(225, 48, 108, 0.1)', color: '#E1306C', padding: '2px 8px', borderRadius: 8 }}>
                      Carousel ({activeMediaIndex + 1}/{mediaItems.length})
                    </span>
                  )}
                </div>

                {/* Media Mockup Viewer */}
                {mediaItems.length > 0 && currentItem ? (
                  <div style={{ position: 'relative', background: '#000', overflow: 'hidden', ...getAspectRatioStyle(currentItem.aspectRatio || globalAspectRatio, currentItem.naturalWidth, currentItem.naturalHeight), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Blurred Backdrop when fitMode is contain */}
                    {currentItem.fitMode === 'contain' && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage: `url(${currentItem.previewUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: 'blur(16px) brightness(0.35)',
                          transform: 'scale(1.15)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {currentItem.type === 'video' ? (
                      <video
                        src={currentItem.previewUrl}
                        autoPlay
                        muted
                        loop
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: currentItem.fitMode === 'contain' ? 'contain' : 'cover',
                          transform: `translate(${currentItem.panX}px, ${currentItem.panY}px) scale(${currentItem.zoom}) rotate(${currentItem.rotation}deg)`,
                        }}
                      />
                    ) : (
                      <img
                        src={currentItem.previewUrl}
                        alt="Mockup"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: currentItem.fitMode === 'contain' ? 'contain' : 'cover',
                          transform: `translate(${currentItem.panX}px, ${currentItem.panY}px) scale(${currentItem.zoom}) rotate(${currentItem.rotation}deg)`,
                        }}
                      />
                    )}

                    {/* Carousel Navigation Arrows if multiple photos */}
                    {mediaItems.length > 1 && (
                      <>
                        {activeMediaIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveMediaIndex(activeMediaIndex - 1)}
                            style={{
                              position: 'absolute',
                              left: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <ChevronLeft size={16} />
                          </button>
                        )}
                        {activeMediaIndex < mediaItems.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setActiveMediaIndex(activeMediaIndex + 1)}
                            style={{
                              position: 'absolute',
                              right: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <ChevronRight size={16} />
                          </button>
                        )}

                        {/* Carousel Dots */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: 4,
                          }}
                        >
                          {mediaItems.map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: activeMediaIndex === i ? 7 : 5,
                                height: activeMediaIndex === i ? 7 : 5,
                                borderRadius: '50%',
                                background: activeMediaIndex === i ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--bg-secondary, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>
                      📸 Selected photos and zoom framing will preview here live
                    </p>
                  </div>
                )}

                {/* Editable Caption Textarea inside Mockup with SHOW FULL Toggle */}
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label className="label" style={{ fontSize: 12, fontWeight: 800, margin: 0 }}>
                        ✏️ Edit Attached Caption & Hashtags Freely:
                      </label>
                      <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)', background: 'var(--bg-secondary, rgba(0,0,0,0.05))', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        {generatedCaption.length} chars
                      </span>
                    </div>

                    {/* SHOW FULL TOGGLE BUTTON */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setShowFullCaption(!showFullCaption)}
                        className={`btn btn-xs ${showFullCaption ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: showFullCaption ? 'linear-gradient(45deg, #f09433, #dc2743)' : undefined,
                          color: showFullCaption ? '#fff' : undefined,
                          border: showFullCaption ? 'none' : undefined,
                          boxShadow: showFullCaption ? '0 2px 8px rgba(220, 39, 67, 0.3)' : 'none',
                        }}
                        title="Expand or collapse caption height to see all hashtags and contact CTA"
                      >
                        {showFullCaption ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        {showFullCaption ? '📜 SHOWING FULL (100%)' : '📜 SHOW FULL CAPTION'}
                      </button>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedCaption, 'copy-caption-btn')}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        {copiedId === 'copy-caption-btn' ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                        Copy All
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={generatedCaption}
                    onChange={(e) => setGeneratedCaption(e.target.value)}
                    rows={showFullCaption ? 20 : 8}
                    className="input"
                    placeholder="Enter or customize Instagram caption..."
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      padding: 12,
                      borderRadius: 10,
                      resize: 'vertical',
                      width: '100%',
                      minHeight: showFullCaption ? 400 : 160,
                      border: '1.5px solid rgba(225, 48, 108, 0.3)',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                      background: 'var(--card-bg, #ffffff)',
                    }}
                  />

                  {/* Quick Tag Injection & Action Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!generatedCaption.includes(postLocation)) {
                            setGeneratedCaption((prev) => `📍 Location: ${postLocation}\n\n` + prev);
                            toast('📍 Injected location tag into caption!', 'success');
                          } else {
                            toast('Location is already in the caption', 'info');
                          }
                        }}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#E1306C', fontWeight: 700 }}
                      >
                        <MapPin size={11} /> + Tag Location ({postLocation})
                      </button>

                      {collaborator && (
                        <button
                          type="button"
                          onClick={() => {
                            const collabTag = collaborator.startsWith('@') ? collaborator : `@${collaborator}`;
                            if (!generatedCaption.includes(collabTag)) {
                              setGeneratedCaption((prev) => prev + `\n\n🤝 In Collab With: ${collabTag}`);
                              toast('🤝 Injected collaborator tag into caption!', 'success');
                            } else {
                              toast('Collaborator is already in the caption', 'info');
                            }
                          }}
                          className="btn btn-ghost btn-xs"
                          style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#E1306C', fontWeight: 700 }}
                        >
                          <Users size={11} /> + Tag Collab ({collaborator})
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateFresh}
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--muted-foreground)' }}
                    >
                      <RefreshCw size={10} /> Regenerate Angle
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Step Progress Indicator */}
              {isPublishing && publishingStep && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 14,
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#2563eb',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <RefreshCw size={16} className="animate-spin" />
                  <span>{publishingStep}</span>
                </div>
              )}

              {/* Status or Alert message if published */}
              {publishMessage && !isPublishing && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 14,
                    background: publishSuccess ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: publishSuccess ? '#16a34a' : '#dc2626',
                    border: `1px solid ${publishSuccess ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={16} />
                    <span>{publishMessage}</span>
                  </div>
                  {publishSuccess && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <a
                        href="https://www.instagram.com/shreebeauty.studio/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm"
                        style={{
                          background: '#16a34a',
                          color: '#fff',
                          fontWeight: 700,
                          border: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                        }}
                      >
                        <ExternalLink size={13} /> View Live on Instagram ↗
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* 📍 Active Post Location & Tag Bar */}
              <div
                style={{
                  background: 'rgba(225, 48, 108, 0.06)',
                  border: '1px solid rgba(225, 48, 108, 0.25)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  marginBottom: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} color="#E1306C" />
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--foreground)' }}>
                      📍 Attached Post Location:
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#E1306C', background: 'rgba(225, 48, 108, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                      {postLocation || 'Katargam, Surat'}
                    </span>
                  </div>

                  {collaborator && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Users size={12} /> Collab: {collaborator}
                    </span>
                  )}
                </div>

                {/* Quick 1-Click Location Selector */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600 }}>Quick Select:</span>
                  {[
                    'Katargam, Surat',
                    'Shree Beauty Studio',
                    'Surat, Gujarat',
                    'Mota Varachha, Surat',
                    'Adajan, Surat',
                    'Vesu, Surat',
                  ].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setPostLocation(loc);
                        toast(`📍 Location set to ${loc}!`, 'success');
                      }}
                      className={`btn btn-xs ${postLocation === loc ? 'btn-primary' : 'btn-ghost'}`}
                      style={{
                        fontSize: 9.5,
                        padding: '2px 8px',
                        height: 'auto',
                        borderRadius: 999,
                        border: postLocation === loc ? 'none' : '1px solid rgba(225, 48, 108, 0.2)',
                        background: postLocation === loc ? 'linear-gradient(45deg, #f09433, #dc2743)' : '#ffffff',
                        color: postLocation === loc ? '#ffffff' : 'var(--foreground)',
                        fontWeight: postLocation === loc ? 800 : 600,
                      }}
                    >
                      📍 {loc}
                    </button>
                  ))}
                </div>
              </div>

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
                  {isPublishing
                    ? 'PUBLISHING TO INSTAGRAM...'
                    : mediaItems.length > 1
                    ? `🚀 DIRECT PUBLISH ${mediaItems.length} PHOTOS (CAROUSEL)`
                    : '🚀 DIRECT PUBLISH TO INSTAGRAM / REELS'}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <a
                    href="https://business.facebook.com/latest/composer"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCaption);
                      toast('📋 Caption copied! Opening Meta Creator Studio...', 'success');
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

      {/* ── TAB 2: AI CAPTION STUDIO ── */}
      {activeTab === 'studio' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} color="#ca8a04" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>AI Reel Hook & Caption Generator</h3>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>Infinite non-repeating viral hooks, location & collab tags</p>
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
                Refresh Angle
              </button>
            </div>

            {/* Category Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6 }}>
              {[
                { id: 'bridal', label: '👑 Bridal' },
                { id: 'sagai', label: '💍 Sagai' },
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
                  className={`btn btn-sm ${captionCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11.5, fontWeight: captionCategory === cat.id ? 800 : 500 }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Language Chips */}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="text"
                placeholder="Bride Name: Kinjal Patel"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="input input-xs"
              />
              <input
                type="text"
                placeholder="Special Offer: 20% OFF"
                value={specialOffer}
                onChange={(e) => setSpecialOffer(e.target.value)}
                className="input input-xs"
              />
            </div>

            {/* Location & Collab */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Location: Katargam, Surat"
                  value={postLocation}
                  onChange={(e) => setPostLocation(e.target.value)}
                  className="input input-xs"
                  style={{ paddingLeft: 24 }}
                />
                <MapPin size={11} color="#E1306C" style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Collaborator: @kinjal_patel"
                  value={collaborator}
                  onChange={(e) => setCollaborator(e.target.value)}
                  className="input input-xs"
                  style={{ paddingLeft: 24 }}
                />
                <Users size={11} color="#E1306C" style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateFresh}
              className="btn btn-primary"
              style={{
                fontWeight: 800,
                background: 'linear-gradient(45deg, #f09433, #dc2743)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(220, 39, 67, 0.3)',
              }}
            >
              <RefreshCw size={16} /> REFRESH NEW VIRAL CAPTION
            </button>
          </div>

          <div className="card" style={{ borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>📜 Generated Caption & Hashtags ({generatedCaption.length} chars)</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedCaption, 'copy-studio')}
                  className="btn btn-primary btn-xs"
                  style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {copiedId === 'copy-studio' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                  Copy Full Caption
                </button>
              </div>
            </div>

            <textarea
              value={generatedCaption}
              onChange={(e) => setGeneratedCaption(e.target.value)}
              rows={20}
              className="input"
              style={{
                fontFamily: 'monospace',
                fontSize: 12.5,
                lineHeight: 1.55,
                resize: 'vertical',
                minHeight: 420,
                padding: 12,
                borderRadius: 10,
              }}
            />
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
    </div>
  );
}
