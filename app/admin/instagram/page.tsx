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
  const [captionCategory, setCaptionCategory] = useState<'bridal' | 'sagai' | 'reception' | 'haldi_mehndi' | 'prebridal' | 'review'>('bridal');
  const [captionLanguage, setCaptionLanguage] = useState<'english' | 'hinglish' | 'gujarati'>('hinglish');
  const [generationCount, setGenerationCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clientName, setClientName] = useState('');
  const [specialOffer, setSpecialOffer] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [postLocation, setPostLocation] = useState('Katargam, Surat');
  const [collaborator, setCollaborator] = useState('');
  const [showFullCaption, setShowFullCaption] = useState(true);
  const [isLocationOpen, setIsLocationOpen] = useState(true);
  const [isCollabOpen, setIsCollabOpen] = useState(true);
  const [isAiLabel, setIsAiLabel] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [shareThreads, setShareThreads] = useState(true);
  const [shareFacebook, setShareFacebook] = useState(true);
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
    const customStr = customNotes.trim() ? `\n\n📝 Note: ${customNotes.trim()}` : '';

    const DATA: Record<string, {
      hooks: { hinglish: string[]; gujarati: string[]; english: string[] };
      bodies: { hinglish: string[]; gujarati: string[]; english: string[] };
      viralTriggers: { hinglish: string[]; gujarati: string[]; english: string[] };
      viralMentions: string;
      seoKeywords: string;
      hashtags: string[];
    }> = {
      bridal: {
        hooks: {
          hinglish: [
            `👑 Best Bridal Makeup in Surat | Royal Wedding Day Transformation for ${nameStr} ✨`,
            `🔥 POV: You chose Surat's top bridal studio for your Dream Wedding Glam 👰💖`,
            `✨ Clean-luxury Gujarati bridal aesthetic & HD Airbrush Radiance for ${nameStr} 💍`,
            `🥺 The moment she looked into the mirror and saw her dream bridal look come alive... ✨`,
            `💎 Pure luxury. Zero filter. 100% Tear-proof & Waterproof Bridal Perfection on ${nameStr}! 💍`,
            `💄 Behind The Scenes: Crafting the signature royal glow for ${nameStr} at ${salonName} 👑`,
            `🪔 Traditional Gujarati Panetar & Royal Airbrush Radiance for ${nameStr} ✨`,
            `🌟 Less is more: Flawless HD Airbrush Bridal Glow crafted with love in Surat 👰`,
          ],
          gujarati: [
            `👑 સુરતનું શ્રેષ્ઠ બ્રાઇડલ મેકઅપ સ્ટુડિયો: ${nameStr} નો રોયલ ડી-ડે વેડિંગ લુક ✨`,
            `🪔 પાનેતર અને કંકુ પગલાંનો અનોખો શાહી શણગાર: શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ 👰`,
            `💖 લગ્નના પવિત્ર દિવસે મેળવો 100% નેચરલ અને વોટરપ્રૂફ HD એરબ્રશ ગ્લો! ✨`,
            `🌸 સુરતની દરેક કન્યાનું સપનું: શ્રી બ્યૂટી સ્ટુડિયો રોયલ બ્રાઇડલ મેકઓવર 👑`,
          ],
          english: [
            `👑 Best Bridal Makeup Artist in Surat | Timeless Royal Perfection for ${nameStr} ✨`,
            `✨ The Modern Indian Bride: Radiance, Grace & Bespoke Artistry at ${salonName} 👰`,
            `💄 The Art of Flawless, Flash-Ready Bridal Artistry on ${nameStr} in Surat 👑`,
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
        viralTriggers: {
          hinglish: [
            `📌 SAVE this reel for your upcoming Wedding / Reception moodboard!\n👭 TAG a bride-to-be bestie who needs this royal bridal glow!\n💬 Rate this bridal look (1 to 10) in the comments below! 👇✨`,
            `📌 SAVE this look for your D-Day inspiration!\n👭 Share with your sister or best friend who is getting married soon! 👰💖\n💬 Drop a '❤️' if you love this clean royal aesthetic! 👇`,
          ],
          gujarati: [
            `📌 તમારા લગ્ન માટે આ લુક સેવ (SAVE) કરી લો!\n👭 તમારી બ્રાઇડ-ટુ-બી બહેનપણી સાથે શેર (SHARE) કરો! 👰✨\n💬 તમને આ લુક કેવો લાગ્યો? કમેન્ટમાં જણાવો! 👇`,
          ],
          english: [
            `📌 SAVE this look for your bridal moodboard!\n👭 TAG a future bride who needs this timeless glow!\n💬 Rate this transformation from 1-10 in the comments below! 👇✨`,
          ],
        },
        viralMentions: `🏷️ Featured In & Tagged: @wedmegood @weddingsutra @shaadisaga @theweddingbrigade @zo_wed @dulhaniyaa @gujaratibrides @indianweddingbuzz @witty_wedding @weddingwireindia @shaadiwish @surat_weddings @thebridesofindia @popxo.wedding @shreebeauty.studio`,
        seoKeywords: `🔍 Instagram SEO: Best Bridal Makeup Artist in Surat | Katargam Bridal Studio | Gujarati Bride Look | HD Airbrush Makeover Surat | Wedding Makeup Artist Gujarat | Shree Beauty Studio`,
        hashtags: [
          '#SuratBridalMakeup', '#SuratMakeupArtist', '#KatargamSalon', '#GujaratiBride', '#BridalMakeoverSurat',
          '#RoyalBride', '#SuratSalon', '#IndianWeddingBuzz', '#DesiBride', '#BridalGlow',
          '#WeddingGlam', '#BridalTransformation', '#SuratWeddings', '#GujaratWeddings', '#PanetarBride',
          '#HDAirbrushMakeup', '#AirbrushBridalSurat', '#IndianBride', '#WeddingInspiration', '#BridalLook',
          '#DulhanMakeover', '#TrendingBride', '#ViralReels', '#ReelsInstagram', '#ExplorePage',
          '#ExploreSurat', '#TrendingMakeup', '#WeddingSutra', '#WedMeGood', '#BridalFashion',
          '#BrideOfIndia', '#WeddingStory', '#WeddingPhotographySurat', '#RealBride', '#BridalPortrait',
          '#MandapLook', '#GharcholaBride', '#KankuPagla', '#GujaratiWeddingTradition', '#BridalDrapingSurat',
          '#BestMakeupArtistSurat', '#KatargamBridal', '#SuratBeautyStudio', '#SuratBrides', '#IndianBridalLook',
          '#WeddingDayVibes', '#BridalDiaries', '#InstaBride', '#ShreeBeautyStudiobride', '#ShreeBeautyStudio'
        ],
      },
      sagai: {
        hooks: {
          hinglish: [
            `💍 Dreamy Engagement / Sagai Makeover in Surat for ${nameStr} ✨💖`,
            `✨ Soft Pastel Glam & Dewy Glass Skin for ${nameStr}'s Ring Ceremony at ${salonName} 💍`,
            `🔥 POV: Getting ready for your Ring Ceremony with Surat's top bridal studio 👰💖`,
            `💍 She said YES! Minimalist modern engagement makeup with soft romantic curls ✨`,
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
            `💍 Timeless Elegance & Dreamy Engagement Glam for ${nameStr} in Surat ✨`,
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
        viralTriggers: {
          hinglish: [
            `📌 SAVE this look for your upcoming Sagai / Engagement moodboard!\n👭 TAG your newly engaged sister or bestie! 💍💖\n💬 Tell us in the comments: Soft Dewy Glam or Bold Lip Look for Sagai? 👇✨`,
          ],
          gujarati: [
            `📌 તમારી સગાઈ માટે આ લુક સેવ (SAVE) કરી લો!\n👭 તમારી ફિયાન્સી કે બહેનપણી સાથે શેર (SHARE) કરો! 💍✨\n💬 કમેન્ટમાં જણાવો: તમને સોફ્ટ લુક ગમે કે બોલ્ડ લુક? 👇`,
          ],
          english: [
            `📌 SAVE this look for your engagement inspo!\n👭 TAG a bride-to-be who would rock this look! 💍\n💬 Drop your favorite emoji in the comments! 👇`,
          ],
        },
        viralMentions: `🏷️ Featured In & Tagged: @wedmegood @weddingsutra @shaadisaga @theweddingbrigade @zo_wed @dulhaniyaa @gujaratibrides @indianweddingbuzz @witty_wedding @weddingwireindia @shaadiwish @surat_weddings @thebridesofindia @weddingz.in @shreebeauty.studio`,
        seoKeywords: `🔍 Instagram SEO: Engagement Makeup Surat | Sagai Makeover Katargam | Ring Ceremony Look Surat | Soft Glam Makeup Artist Surat | Shree Beauty Studio`,
        hashtags: [
          '#SagaiMakeupSurat', '#EngagementMakeupSurat', '#SuratEngagementBride', '#SagaiLook', '#RingCeremonyMakeup',
          '#SuratBridalStudio', '#SuratSalon', '#EngagementGlam', '#KatargamSalon', '#SuratMakeupArtist',
          '#SoftGlamLook', '#DewyMakeup', '#PastelBride', '#EngagementInspo', '#IndianEngagement',
          '#PreWeddingSurat', '#SuratWeddings', '#GujaratBrides', '#DesiEngagement', '#TrendingReels',
          '#ExplorePage', '#ExploreSurat', '#ViralReels', '#ReelsInstagram', '#BridalTransformation',
          '#WedMeGood', '#WeddingSutra', '#BridalGlow', '#RingCeremony', '#EngagementLookSurat',
          '#PastelLehengaSurat', '#ModernBride', '#GlowySkinSurat', '#SagaiMakeover', '#RomanticHairstyle',
          '#EngagementHairstyle', '#KatargamBridal', '#SuratBeautyStudio', '#SuratBrides', '#IndianBridalLook',
          '#SheSaidYes', '#EngagementDiaries', '#BridalGoals', '#WeddingGlamSurat', '#LoveStorySurat',
          '#EngagementPhotography', '#TrendyBride', '#InstaEngagement', '#ShreeBeautyStudiobride', '#ShreeBeautyStudio'
        ],
      },
      reception: {
        hooks: {
          hinglish: [
            `✨ High-Glam Reception Makeover in Surat for ${nameStr} | Red Carpet Ready ✨`,
            `🔥 Royal Reception Look: Dramatic Shimmer Eyes & Hollywood Waves for ${nameStr} at ${salonName} 💎`,
            `✨ Velvet Lehenga & Diamond Glow: The Ultimate Surat Reception Bride Aesthetic 👰👑`,
            `🥺 Watch her turn heads as she steps into the spotlight for her Reception Night ✨`,
            `💎 Pure luxury. Zero filter. High-definition spotlight glam on ${nameStr} in Surat! ✨`,
          ],
          gujarati: [
            `✨ રિસેપ્શન સ્પેશિયલ હાઇ-ગ્લેમ મેકઓવર: ${nameStr} નો આકર્ષક રોયલ લુક 💎`,
            `👑 રિસેપ્શન પાર્ટી માટે મેળવો રેડ-કાર્પેટ શિમર આઇઝ અને વોટરપ્રૂફ લ્યુમિનસ ગ્લો! ✨`,
            `🌸 શ્રી બ્યૂટી સ્ટુડિયો રોયલ રિસેપ્શન લુક: સુરતની મોર્ડન બ્રાઇડ માટે સ્પેશિયલ 👰`,
            `💖 લગ્નની રિસેપ્શન નાઇટ પર મેળવો બોલીવૂડ સ્ટાઇલ ગ્લેમરસ મેકઓવર! ✨`,
          ],
          english: [
            `✨ Red Carpet Glamour & Modern Reception Radiance for ${nameStr} in Surat 💎`,
            `👑 Hollywood Waves & Luminous Spotlight Glow for ${nameStr}'s Grand Reception ✨`,
            `💎 The Art of High-Glam Reception Perfection on ${nameStr} at ${salonName} 👰`,
          ],
        },
        bodies: {
          hinglish: [
            `Reception is the grand finale where the bride shines like a diamond! Featuring spotlight shimmer eye artistry, sculpted contour, glass-like highlighter, and voluminous Hollywood waves.`,
            `Bold, confident, and breathtakingly glamorous! Engineered for high-flash photography and all-night dancing under stage spotlights.`,
          ],
          gujarati: [
            `રિસેપ્શન પાર્ટીમાં મેળવો શાહી અને આધુનિક ગ્લેમરસ લુક! શિમરી સ્મોકી આઇઝ, પરફેક્ટ હાઇલાઇટિંગ અને ટ્રેન્ડી ઓપન હેર વેવ્ઝ જે બનાવે છે તમને સેન્ટર ઓફ એટ્રેક્શન.`,
          ],
          english: [
            `Designed for the grand reception evening—dramatic eye definition, luminous glass skin, and couture hairstyling tailored to complement western gowns and royal lehengas.`,
          ],
        },
        viralTriggers: {
          hinglish: [
            `📌 SAVE this high-glam look for your Wedding Reception or Cocktail Night!\n👭 TAG a bride-to-be who loves bold glam! 💎✨\n💬 Rate this Reception Look from 1 to 10 in the comments! 👇`,
          ],
          gujarati: [
            `📌 તમારા રિસેપ્શન માટે આ લુક સેવ (SAVE) કરી લો!\n👭 તમારી બહેનપણી સાથે શેર (SHARE) કરો! 💎✨\n💬 કમેન્ટમાં જણાવો આ લુક કેવો લાગ્યો! 👇`,
          ],
          english: [
            `📌 SAVE this reception inspo for your moodboard!\n👭 TAG a bride who loves statement glam! 💎\n💬 Drop a ❤️ in the comments if you love this look! 👇`,
          ],
        },
        viralMentions: `🏷️ Featured In & Tagged: @wedmegood @weddingsutra @shaadisaga @theweddingbrigade @zo_wed @dulhaniyaa @gujaratibrides @indianweddingbuzz @witty_wedding @weddingwireindia @shaadiwish @surat_weddings @thebridesofindia @popxo.wedding @shreebeauty.studio`,
        seoKeywords: `🔍 Instagram SEO: Reception Makeup Surat | Cocktail Bride Look Katargam | Glam Bridal Makeover Surat | Evening Wedding Makeup Surat | Shree Beauty Studio`,
        hashtags: [
          '#ReceptionMakeupSurat', '#ReceptionBride', '#CocktailMakeupSurat', '#SuratBridalStudio', '#GlamBrideSurat',
          '#SuratMakeupArtist', '#KatargamSalon', '#EveningWeddingGlam', '#RedCarpetBride', '#SuratWeddings',
          '#IndianReceptionBride', '#SmokeyEyesSurat', '#HollywoodWaves', '#LuxuryBrideSurat', '#BridalGlowSurat',
          '#GownMakeupSurat', '#SuratSalon', '#DesiBride', '#TrendingBride', '#ViralReels',
          '#ReelsInstagram', '#ExplorePage', '#ExploreSurat', '#TrendingMakeup', '#WeddingSutra',
          '#WedMeGood', '#BridalTransformation', '#RoyalBride', '#GujaratWeddings', '#ReceptionLookSurat',
          '#CocktailBride', '#GownLookSurat', '#ShimmerEyes', '#SpotlightGlam', '#NightWeddingLook',
          '#ReceptionGownSurat', '#RedCarpetGlam', '#BoldLipsSurat', '#KatargamBridal', '#SuratBeautyStudio',
          '#SuratBrides', '#IndianBridalLook', '#StageGlam', '#WeddingEveningSurat', '#BridalDiariesSurat',
          '#ReceptionHairstyle', '#HighGlamour', '#InstaReception', '#ShreeBeautyStudiobride', '#ShreeBeautyStudio'
        ],
      },
      haldi_mehndi: {
        hooks: {
          hinglish: [
            `🪔 Vibrant Haldi & Mehendi Look in Surat for ${nameStr} | Fresh Floral Glow ✨`,
            `💛 Sunshine Dewy Glow & Bohemian Braids for ${nameStr}'s Haldi Ceremony at ${salonName} 🌻`,
            `💚 Mehendi Magic: Sweatproof Fresh Glam & Floral Hairdo for ${nameStr} 🌿✨`,
            `🥺 Bright, joyous, and glowing: The perfect Gujarati Haldi & Mehendi Bride ✨💛`,
            `🌻 POV: Experiencing joyful Haldi vibes with Surat's top bridal artist at ${salonName} 💛`,
          ],
          gujarati: [
            `🪔 હળદર & મહેંદી રસમનો તાજગીભર્યો શણગાર: ${nameStr} માટે ફ્રેશ ફ્લોરલ ગ્લો ✨`,
            `💛 પીળી હળદર અને લીલી મહેંદીના રંગમાં ખીલો: 100% સ્વેટપ્રૂફ & ડ્યૂઇ લુક 🌻`,
            `🌸 શ્રી બ્યૂટી સ્ટુડિયો સ્પેશિયલ હળદર-મહેંદી બ્રાઇડલ મેકઓવર, કતારગામ 🌿`,
            `✨ હળદરની રસમ માટે નેચરલ, તાજો અને ફોટોજેનિક ગ્લો: શ્રી બ્યૂટી સ્ટુડિયો 💛`,
          ],
          english: [
            `🪔 Fresh Floral Radiance & Sweatproof Haldi-Mehendi Glam for ${nameStr} in Surat ✨`,
            `💛 Sunshine Glow & Bohemian Floral Hairstyling at ${salonName} Katargam 🌻`,
            `🌿 Vibrant Mehendi & Haldi Bridal Aesthetics on ${nameStr} in Surat ✨`,
          ],
        },
        bodies: {
          hinglish: [
            `Haldi and Mehendi functions call for playful, fresh, and sweatproof makeup that stays immaculate throughout all the laughter, dances, and color splashes! Paired with stunning floral accessories and textured boho braids.`,
            `Sun-kissed, natural, and vibrant! Featuring dewy peach blush, waterproof mascara, glossy tint lips, and customized real flower hairdo.`,
          ],
          gujarati: [
            `હળદર અને મહેંદીની મસ્તીભરી રસમ માટે મેળવો હળવો, કુદરતી અને 100% સ્વેટપ્રૂફ મેકઅપ! ફ્લોરલ જ્વેલરી સાથે મેચિંગ બોહો બ્રેઇડ્સ અને ફ્રેશ લુક.`,
          ],
          english: [
            `Effortless, fresh-faced radiance crafted for daytime festivities. Formulated to withstand warm outdoor weather, dancing, and celebratory colors.`,
          ],
        },
        viralTriggers: {
          hinglish: [
            `📌 SAVE this vibrant Haldi / Mehendi look for your pre-wedding rituals!\n👭 TAG your bride bestie or bridesmaid gang! 🌻💛\n💬 Tell us: Floral Bun or Bohemian Open Braids for Haldi? 👇✨`,
          ],
          gujarati: [
            `📌 તમારી હળદર કે મહેંદી માટે આ લુક સેવ (SAVE) કરી લો!\n👭 તમારી ફ્રેન્ડ સાથે શેર (SHARE) કરો! 🌻✨\n💬 કમેન્ટમાં જણાવો: ફ્લોરલ બ્રેઇડ ગમે કે ઓપન હેર? 👇`,
          ],
          english: [
            `📌 SAVE this look for your Haldi & Mehendi moodboard!\n👭 TAG a bride-to-be who would love this fresh vibe! 💛\n💬 Drop a 🌻 in the comments! 👇`,
          ],
        },
        viralMentions: `🏷️ Featured In & Tagged: @wedmegood @weddingsutra @shaadisaga @theweddingbrigade @zo_wed @dulhaniyaa @gujaratibrides @indianweddingbuzz @witty_wedding @weddingwireindia @shaadiwish @surat_weddings @thebridesofindia @popxo.wedding @shreebeauty.studio`,
        seoKeywords: `🔍 Instagram SEO: Haldi Makeup Surat | Mehendi Bride Look Katargam | Floral Bridal Makeover Surat | Sweatproof Wedding Makeup | Shree Beauty Studio`,
        hashtags: [
          '#HaldiMakeupSurat', '#MehendiMakeupSurat', '#HaldiBride', '#MehendiLookSurat', '#FloralJewelryBride',
          '#SuratBridalStudio', '#KatargamSalon', '#SuratMakeupArtist', '#SweatproofMakeupSurat', '#BohoBride',
          '#YellowHaldiLook', '#GreenMehendiGlam', '#SuratWeddings', '#GujaratWeddings', '#IndianBride',
          '#BridalMehendi', '#HaldiCeremony', '#DesiBride', '#PreWeddingGlow', '#TrendingReels',
          '#ExplorePage', '#ExploreSurat', '#ViralReels', '#ReelsInstagram', '#BridalTransformation',
          '#WedMeGood', '#WeddingSutra', '#BridalGlow', '#SuratSalon', '#HaldiCeremonySurat',
          '#MehendiArtistSurat', '#FloralHairdo', '#BohemianBraids', '#SunshineGlowSurat', '#HaldiOutfitSurat',
          '#MehendiDesignSurat', '#PreWeddingFestivities', '#ColorSplashSurat', '#KatargamBridal', '#SuratBeautyStudio',
          '#SuratBrides', '#IndianBridalLook', '#FloralBride', '#HaldiVibes', '#MehendiNightSurat',
          '#JoyfulBride', '#HaldiMakeover', '#InstaHaldi', '#ShreeBeautyStudiobride', '#ShreeBeautyStudio'
        ],
      },
      prebridal: {
        hooks: {
          hinglish: [
            `💧 7-Step Korean Pre-Bridal Glass Skin & Glow Ritual in Surat for ${nameStr} ✨`,
            `✨ Get Wedding-Ready Radiance & Deep Pore Detox with Pre-Bridal HydraFacial at ${salonName} 👰`,
            `👰 Real Bride Skin Prep: From Dull Skin to Luminous Bridal Radiance in Katargam, Surat 💧`,
            `🥺 Watch her skin transform into pure glass before her big wedding day ✨💧`,
            `💎 Secret to Cake-Free Bridal Makeup: Expert Pre-Bridal Skin Infusion at ${salonName} 💧`,
          ],
          gujarati: [
            `💧 પ્રિ-બ્રાઇડલ સ્પેશિયલ સ્કિનકેર & હાઇડ્રાફેશિયલ: લગ્ન પહેલાં મેળવો કાચ જેવી ચમકતી ત્વચા ✨`,
            `👰 શ્રી બ્યૂટી સ્ટુડિયો પ્રિ-બ્રાઇડલ પેકેજ: 7-સ્ટેપ ડીપ ક્લીનિંગ અને ઇન્સ્ટન્ટ ગ્લો 💧`,
            `🌸 લગ્નના 15 દિવસ પહેલાં કરાવો આ પ્રિ-બ્રાઇડલ ટ્રીટમેન્ટ: કતારગામ, સુરત ✨`,
            `✨ ખીલ, ડાઘ અને ટેનિંગમાંથી મુક્તિ સાથે મેળવો લ્યુમિનસ બ્રાઇડલ સ્કિન! 💧`,
          ],
          english: [
            `💧 The Ultimate Pre-Bridal Skin Preparation & Glass Skin Therapy in Surat ✨`,
            `✨ 7-Step Medical-Grade Pre-Bridal HydraFacial at ${salonName} Katargam 👰`,
            `💧 Deep Hydration & Radiant Skin Prep for ${nameStr}'s Wedding Journey ✨`,
          ],
        },
        bodies: {
          hinglish: [
            `Flawless bridal makeup starts with deeply hydrated, healthy skin! Our customized pre-bridal sessions eliminate dead skin, blackheads, and tanning while infusing potent hyaluronic peptides for that irresistible bridal glow.`,
            `Complete bridal beauty reset! Includes medical-grade deep pore vortex extraction, skin brightening serums, relaxing neck & shoulder therapy, and hair botox nourishment.`,
          ],
          gujarati: [
            `શ્રેષ્ઠ બ્રાઇડલ મેકઅપ માટે જોઈએ હેલ્ધી અને ગ્લોઇંગ સ્કિન! પ્રિ-બ્રાઇડલ હાઇડ્રાફેશિયલ અને હેર ટ્રીટમેન્ટ તમારા લગ્નના લુકને આપે છે 10 ગણો વધુ નિખાર.`,
          ],
          english: [
            `The secret to cake-free, glowing bridal makeup is expert skin prep. Vortex extraction purifies pores while antioxidant serums lock in deep moisture.`,
          ],
        },
        viralTriggers: {
          hinglish: [
            `📌 SAVE this reel for your Pre-Bridal skincare planning!\n👭 TAG a bride-to-be who needs to prep her skin before wedding season! 💧✨\n💬 Comment 'PREBRIDAL' to get our customized bridal packages! 👇`,
          ],
          gujarati: [
            `📌 તમારા લગ્નની સ્કિનકેર માટે આ રીલ સેવ (SAVE) કરી લો!\n👭 ભાવિ કન્યા સાથે શેર (SHARE) કરો! 💧✨\n💬 કમેન્ટમાં 'PREBRIDAL' લખો પેકેજ વિગતો માટે! 👇`,
          ],
          english: [
            `📌 SAVE this for your pre-wedding beauty checklist!\n👭 TAG a future bride who needs glowing skin! 👰\n💬 Comment 'PREBRIDAL' for consultation & booking! 👇`,
          ],
        },
        viralMentions: `🏷️ Featured In & Tagged: @wedmegood @weddingsutra @shaadisaga @theweddingbrigade @zo_wed @dulhaniyaa @gujaratibrides @indianweddingbuzz @witty_wedding @weddingwireindia @shaadiwish @surat_weddings @thebridesofindia @popxo.wedding @shreebeauty.studio`,
        seoKeywords: `🔍 Instagram SEO: Pre Bridal Skin Care Surat | Bridal HydraFacial Katargam | Bridal Glass Skin Treatment | Pre Wedding Glow Package Surat | Shree Beauty Studio`,
        hashtags: [
          '#PreBridalSurat', '#BridalSkinCareSurat', '#BridalGlowSurat', '#HydraFacialSurat', '#GlassSkinBride',
          '#SuratBridalStudio', '#KatargamSalon', '#PreWeddingSkinCare', '#BridalHairBotox', '#BridalMakeoverSurat',
          '#SuratSkinClinic', '#WeddingPrepSurat', '#GlowFromWithin', '#SuratSalon', '#BridalFacialSurat',
          '#BridalPackageSurat', '#SuratMakeupArtist', '#IndianBride', '#TrendingReels', '#ExplorePage',
          '#ExploreSurat', '#ViralReels', '#ReelsInstagram', '#SkinTransformation', '#BeautyRoutine',
          '#WedMeGood', '#WeddingSutra', '#BridalGlow', '#GujaratWeddings', '#KoreanGlassSkinSurat',
          '#MedicalHydraFacial', '#BridalSkinPrep', '#DeepPoreCleansing', '#BridalHairCareSurat', '#HairBotoxSurat',
          '#PreBridalPackage', '#SkinRejuvenationSurat', '#ClearSkinBride', '#KatargamBridal', '#SuratBeautyStudio',
          '#SuratBrides', '#HealthyGlowSurat', '#BridalWellness', '#PreWeddingSelfCare', '#GlowingBrideSurat',
          '#SkinGlowClinic', '#BrideToBeSurat', '#InstaSkinCare', '#ShreeBeautyStudiobride', '#ShreeBeautyStudio'
        ],
      },
      review: {
        hooks: {
          hinglish: [
            `🌟 5-Star Real Bride Review | Surat's Most Trusted Bridal Studio 💖👰`,
            `🥺 "Exceeded all my expectations for my wedding day!" — Real Surat Bride Review ✨`,
            `👰 "My makeup stayed 100% fresh for 14 hours!" — Real Surat Bride ${nameStr} at ${salonName} 👑`,
            `💖 Surat brides choose trust, perfection, and pure royal artistry at ${salonName} ✨`,
            `👑 "I felt like a royal queen on my wedding day!" — 5-Star Bride Review from Surat 💖`,
          ],
          gujarati: [
            `🌟 સુરતની કન્યાઓનો અતૂટ વિશ્વાસ: 5-સ્ટાર રિયલ બ્રાઇડલ રિવ્યૂ | શ્રી બ્યૂટી સ્ટુડિયો 💖`,
            `👰 "લગ્નના દિવસે દરેક વ્યક્તિએ મારા મેકઅપની પ્રશંસા કરી!" — 5-સ્ટાર બ્રાઇડ રિવ્યૂ ✨`,
            `🌸 10,000+ ખુશ કન્યાઓની પહેલી પસંદ શ્રી બ્યૂટી સ્ટુડિયો, કતારગામ, સુરત 👑`,
            `💖 "શ્રી બ્યૂટી સ્ટુડિયો સુરતનું શ્રેષ્ઠ બ્રાઇડલ સ્ટુડિયો છે!" — રિયલ બ્રાઇડ રિવ્યૂ ✨`,
          ],
          english: [
            `🌟 "Exceeded all my expectations for my wedding day!" 💖 | 5-Star Bride Review`,
            `👑 Surat's Most Loved Bridal Makeup Studio | Real Bride Words of Love ✨`,
            `👰 5-Star Wedding Makeover Experience in Katargam, Surat 💖`,
          ],
        },
        bodies: {
          hinglish: [
            `"The best bridal experience in Surat! From the first consultation to the final veil drape on my wedding day, the team at Shree Beauty Studio made me feel like royalty. The makeup was 100% waterproof and stayed flawless all night!"`,
            `Nothing brings us more joy than the happy tears and radiant smiles of our brides! Thank you for trusting Shree Beauty Studio on the most important day of your life.`,
          ],
          gujarati: [
            `"શ્રી બ્યૂટી સ્ટુડિયો સુરતનું બેસ્ટ બ્રાઇડલ સ્ટુડિયો છે! મેકઅપ એકદમ નેચરલ અને વોટરપ્રૂફ હતો, અને છેક સુધી ફ્રેશ રહ્યો." — તમારા આ સ્નેહ અને વિશ્વાસ માટે ખૂબ ખૂબ આભાર!`,
          ],
          english: [
            `Another heartwarming review from our radiant bride. Thank you for making Shree Beauty Studio part of your most cherished milestone!`,
          ],
        },
        viralTriggers: {
          hinglish: [
            `📌 SAVE & Book early to secure your wedding or engagement dates!\n👭 SHARE with future brides looking for trusted artists in Surat! 👰💖\n💬 Tell us your dream wedding look in the comments below! 👇`,
          ],
          gujarati: [
            `📌 તમારા લગ્નની તારીખો માટે અગાઉથી બુકિંગ કરાવો!\n👭 સુરતની ભાવિ કન્યાઓ સાથે શેર (SHARE) કરો! 👰💖\n💬 કમેન્ટમાં જણાવો તમારા લગ્નની તારીખ! 👇`,
          ],
          english: [
            `📌 SAVE & Book early to lock your wedding dates!\n👭 SHARE with future brides in Surat! 👰\n💬 Drop a ❤️ to show some love! 👇`,
          ],
        },
        viralMentions: `🏷️ Featured In & Tagged: @wedmegood @weddingsutra @shaadisaga @theweddingbrigade @zo_wed @dulhaniyaa @gujaratibrides @indianweddingbuzz @witty_wedding @weddingwireindia @shaadiwish @surat_weddings @thebridesofindia @popxo.wedding @shreebeauty.studio`,
        seoKeywords: `🔍 Instagram SEO: Best Bridal Studio Reviews Surat | Trusted Wedding Artist Katargam | 5 Star Bride Review Surat | Shree Beauty Studio Reviews`,
        hashtags: [
          '#RealBrideReview', '#5StarsSurat', '#SuratBridalReviews', '#TrustedBridalArtist', '#KatargamSalon',
          '#SuratBridalStudio', '#HappyBrideSurat', '#SuratSalon', '#BridalReview', '#BestBridalSurat',
          '#BrideFeedback', '#SuratMakeover', '#5StarRated', '#GujaratiBrideReview', '#SuratWeddings',
          '#KatargamBridal', '#SuratBeautyStudio', '#SatisfiedBride', '#BridalMakeupSurat', '#ReviewOfInstagram',
          '#ExplorePage', '#ExploreSurat', '#ViralReels', '#ReelsInstagram', '#TrendingReels',
          '#BridalTransformation', '#DesiBride', '#WedMeGood', '#WeddingSutra', '#SuratBridesLove',
          '#ClientLoveSurat', '#BestSalonKatargam', '#CustomerTestimonial', '#TrustedByBrides', '#BrideStorySurat',
          '#WeddingReviewSurat', '#AuthenticFeedback', '#HappyClientSurat', '#SuratBrides', '#IndianBridalLook',
          '#5StarSalonSurat', '#BridalExcellence', '#SuratBeautySalon', '#TopBridalArtistSurat', '#WeddingRecommendation',
          '#VerifiedReview', '#BrideApproved', '#InstaReview', '#ShreeBeautyStudiobride', '#ShreeBeautyStudio'
        ],
      },
    };

    const catData = DATA[captionCategory] || DATA.bridal;
    const hooksList = catData.hooks[captionLanguage] || catData.hooks.hinglish;
    const bodiesList = catData.bodies[captionLanguage] || catData.bodies.hinglish;
    const triggersList = catData.viralTriggers[captionLanguage] || catData.viralTriggers.hinglish;

    const availableHooks = hooksList.filter((h) => h !== lastHookUsed);
    const chosenHook = pickRandom(availableHooks.length > 0 ? availableHooks : hooksList);
    setLastHookUsed(chosenHook);

    const chosenBody = pickRandom(bodiesList);
    const chosenTrigger = pickRandom(triggersList);
    
    // Always guarantee permanent brand hashtags: #ShreeBeautyStudiobride #ShreeBeautyStudio + 48 viral tags = 50 total
    const permanentTags = ['#ShreeBeautyStudiobride', '#ShreeBeautyStudio'];
    const filteredCatTags = catData.hashtags.filter((t) => !permanentTags.includes(t));
    const finalTags = [...filteredCatTags.slice(0, 48), ...permanentTags];
    const chosenHashtags = finalTags.join(' ');

    const ctas = [
      `🏠 Studio: ${address}\n💬 WhatsApp: ${phone}\n🔗 Book Online: https://shreebeautystudio.in/book`,
      `🏠 Visit Us: ${address}\n💬 WhatsApp: ${phone}\n🌐 Reserve Slot Online: https://shreebeautystudio.in/book`,
    ];
    const chosenCta = pickRandom(ctas);

    return `${chosenHook}\n\n${chosenBody}${customStr}${offerStr}\n\n${chosenTrigger}\n\n${chosenCta}\n\n────────────────\n${catData.viralMentions}\n\n${catData.seoKeywords}\n\n${chosenHashtags}`;
  }, [captionCategory, captionLanguage, clientName, specialOffer, customNotes, settings, lastHookUsed]);

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
  }, [captionCategory, captionLanguage, clientName, specialOffer, customNotes]);

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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
                  {[
                    { id: 'bridal', label: '👑 D-Day Wedding' },
                    { id: 'sagai', label: '💍 Sagai / Engagement' },
                    { id: 'reception', label: '✨ Reception Glam' },
                    { id: 'haldi_mehndi', label: '🪔 Haldi & Mehendi' },
                    { id: 'prebridal', label: '💧 Pre-Bridal Glow' },
                    { id: 'review', label: '⭐ Bride Reviews' },
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

                {/* Custom Post Details / Custom Writing Field */}
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      ✍️ Custom Post Details / Notes (પોતાનું ખાસ લખાણ લખવું હોય તો):
                    </span>
                    <span style={{ fontSize: 9.5, color: '#E1306C', fontWeight: 600 }}>Optional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Traditional Gujarati Panetar drape with royal jewelry or special reception party look..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="input input-xs"
                  />
                </div>

                {/* ── 📍 ADD LOCATION SECTION ── */}
                <div style={{ background: 'var(--bg-secondary, rgba(0,0,0,0.02))', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label" style={{ fontSize: 11.5, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--foreground)' }}>
                      <MapPin size={13} color="#E1306C" />
                      <span>📍 Add Instagram Location:</span>
                    </label>
                    <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>📍 Instagram Post Geotag (Post Header)</span>
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

                    {/* Native Instagram "Click photo to tag people" pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 999,
                        backdropFilter: 'blur(6px)',
                        zIndex: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      }}
                    >
                      <Tag size={11} color="#E1306C" />
                      <span>{collaborator ? `Tagged: ${collaborator}` : 'Click photo to tag people'}</span>
                    </div>

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
                              zIndex: 4,
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
                              zIndex: 4,
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
                            zIndex: 4,
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

                {/* ── NATIVE INSTAGRAM RIGHT-PANEL POST SETTINGS & CAPTION ── */}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  
                  {/* Caption Textarea Header with SHOW FULL Toggle */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label className="label" style={{ fontSize: 12, fontWeight: 800, margin: 0 }}>
                          ✏️ Caption & Viral Hooks:
                        </label>
                        <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)', background: 'var(--bg-secondary, rgba(0,0,0,0.05))', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {generatedCaption.length}/2,200
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
                      rows={showFullCaption ? 18 : 6}
                      className="input"
                      placeholder="Add a caption..."
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        padding: 12,
                        borderRadius: 10,
                        resize: 'vertical',
                        width: '100%',
                        minHeight: showFullCaption ? 380 : 130,
                        border: '1.5px solid rgba(225, 48, 108, 0.3)',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                        background: 'var(--card-bg, #ffffff)',
                      }}
                    />

                    {/* Instagram SEO & Viral Algorithm Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 8, fontSize: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 10.5 }}>
                          <CheckCircle size={11} /> 🔍 Instagram Search SEO
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(225, 48, 108, 0.1)', color: '#E1306C', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 10.5 }}>
                          <Flame size={11} /> 🔥 Viral Saves & Shares Hook
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateFresh}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 10.5, fontWeight: 700, color: '#E1306C', padding: '2px 6px' }}
                      >
                        🎲 Shuffle Viral Hook
                      </button>
                    </div>

                    {/* Quick Inserts for Custom Writing */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                      <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                        ✍️ Quick Inserts:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const mentions = `🏷️ Featured In & Tagged: @wedmegood @weddingsutra @shaadisaga @theweddingbrigade @zo_wed @dulhaniyaa @gujaratibrides @indianweddingbuzz @witty_wedding @weddingwireindia @shaadiwish @surat_weddings @thebridesofindia @popxo.wedding @shreebeauty.studio`;
                          setGeneratedCaption((prev) => (prev.trim() ? `${prev.trim()}\n\n${mentions}` : mentions));
                          toast('Added 15 Viral @Mentions!', 'success');
                        }}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 10, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700, color: '#3b82f6' }}
                      >
                        + 🏷️ 15 Viral @Tags
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tags50 = `#SuratBridalMakeup #SuratMakeupArtist #KatargamSalon #GujaratiBride #BridalMakeoverSurat #RoyalBride #SuratSalon #IndianWeddingBuzz #DesiBride #BridalGlow #WeddingGlam #BridalTransformation #SuratWeddings #GujaratWeddings #PanetarBride #HDAirbrushMakeup #AirbrushBridalSurat #IndianBride #WeddingInspiration #BridalLook #DulhanMakeover #TrendingBride #ViralReels #ReelsInstagram #ExplorePage #ExploreSurat #TrendingMakeup #WeddingSutra #WedMeGood #BridalFashion #BrideOfIndia #WeddingStory #WeddingPhotographySurat #RealBride #BridalPortrait #MandapLook #GharcholaBride #KankuPagla #GujaratiWeddingTradition #BridalDrapingSurat #BestMakeupArtistSurat #KatargamBridal #SuratBeautyStudio #SuratBrides #IndianBridalLook #WeddingDayVibes #BridalDiaries #InstaBride #ShreeBeautyStudiobride #ShreeBeautyStudio`;
                          setGeneratedCaption((prev) => (prev.trim() ? `${prev.trim()}\n\n${tags50}` : tags50));
                          toast('Added 50 Viral Hashtags!', 'success');
                        }}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 10, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700, color: '#E1306C' }}
                      >
                        + #️⃣ 50 Viral Hashtags
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const phone = settings?.phone2 || settings?.whatsapp || '9824183769';
                          const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat';
                          setGeneratedCaption((prev) => (prev.trim() ? `${prev.trim()}\n\n🏠 Studio: ${address}\n💬 WhatsApp: ${phone}\n🔗 Book: https://shreebeautystudio.in/book` : `🏠 Studio: ${address}\n💬 WhatsApp: ${phone}\n🔗 Book: https://shreebeautystudio.in/book`));
                          toast('Added Studio contact & WhatsApp info!', 'success');
                        }}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 10, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700, color: '#16a34a' }}
                      >
                        + 💬 WhatsApp & Booking
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedCaption((prev) => (prev.trim() ? `${prev.trim()}\n\n📌 SAVE this reel for your wedding / reception moodboard!\n👭 TAG a bride-to-be bestie! 👰💖\n💬 Rate this look 1 to 10 in the comments below! 👇` : `📌 SAVE this reel for your wedding / reception moodboard!\n👭 TAG a bride-to-be bestie! 👰💖\n💬 Rate this look 1 to 10 in the comments below! 👇`));
                          toast('Added Viral Save & Share Hook!', 'success');
                        }}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 10, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 6 }}
                      >
                        + 📌 Viral Save Hook
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedCaption('');
                          toast('Cleared caption box! You can now write freely.', 'info');
                        }}
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 10, padding: '2px 7px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, fontWeight: 700 }}
                        title="Clear caption box to write custom text from scratch"
                      >
                        🗑️ Clear & Write Custom
                      </button>
                    </div>
                  </div>

                  {/* ── 📍 NATIVE INSTAGRAM ROW 1: ADD LOCATION ── */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: 10,
                    }}
                  >
                    <div
                      onClick={() => setIsLocationOpen(!isLocationOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={17} color="#E1306C" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                          Add location
                        </span>
                        {postLocation && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#E1306C', background: 'rgba(225, 48, 108, 0.1)', padding: '2px 8px', borderRadius: 999 }}>
                            {postLocation}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted-foreground)' }}>
                        {postLocation && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPostLocation('');
                              toast('Cleared location tag', 'info');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 6px', fontSize: 11, fontWeight: 700 }}
                          >
                            Clear
                          </button>
                        )}
                        {isLocationOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {isLocationOpen && (
                      <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--bg-secondary, rgba(0,0,0,0.02))', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div style={{ position: 'relative', marginBottom: 8 }}>
                          <input
                            type="text"
                            placeholder="Search or enter location (e.g. Katargam, Surat)..."
                            value={postLocation}
                            onChange={(e) => setPostLocation(e.target.value)}
                            className="input input-xs"
                            style={{ paddingLeft: 26, fontSize: 12 }}
                          />
                          <MapPin size={12} color="#E1306C" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        </div>

                        {/* Surat Preset Suggestions */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {[
                            'Katargam, Surat',
                            'Shree Beauty Studio, Katargam',
                            'Surat, Gujarat',
                            'Mota Varachha, Surat',
                            'Adajan, Surat',
                            'Vesu, Surat',
                            'VIP Road, Surat',
                            'Ghod Dod Road, Surat',
                          ].map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                setPostLocation(loc);
                                toast(`📍 Attached location: ${loc}!`, 'success');
                              }}
                              className={`btn btn-xs ${postLocation === loc ? 'btn-primary' : 'btn-ghost'}`}
                              style={{
                                fontSize: 10,
                                padding: '3px 9px',
                                height: 'auto',
                                borderRadius: 999,
                                border: postLocation === loc ? 'none' : '1px solid var(--border)',
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
                    )}
                  </div>

                  {/* ── 🤝 NATIVE INSTAGRAM ROW 2: ADD COLLABORATORS ── */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: 10,
                    }}
                  >
                    <div
                      onClick={() => setIsCollabOpen(!isCollabOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={17} color="#E1306C" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                          Add collaborators
                        </span>
                        {collaborator && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: 999 }}>
                            {collaborator}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted-foreground)' }}>
                        {collaborator && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollaborator('');
                              toast('Cleared collaborator', 'info');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 6px', fontSize: 11, fontWeight: 700 }}
                          >
                            Clear
                          </button>
                        )}
                        {isCollabOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {isCollabOpen && (
                      <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--bg-secondary, rgba(0,0,0,0.02))', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div style={{ position: 'relative', marginBottom: 8 }}>
                          <input
                            type="text"
                            placeholder="Add collaborator username (e.g. @kinjal_patel, @wedding_clicks)..."
                            value={collaborator}
                            onChange={(e) => setCollaborator(e.target.value)}
                            className="input input-xs"
                            style={{ paddingLeft: 26, fontSize: 12 }}
                          />
                          <AtSign size={12} color="#E1306C" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        </div>

                        {/* Collaborator Preset Suggestions */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {[
                            '@kinjal_patel',
                            '@bride_look_surat',
                            '@gujaratibrides',
                            '@surat_weddings',
                            '@wedding_clicks_surat',
                          ].map((collab) => (
                            <button
                              key={collab}
                              type="button"
                              onClick={() => {
                                setCollaborator(collab);
                                toast(`🤝 Attached collaborator: ${collab}!`, 'success');
                              }}
                              className={`btn btn-xs ${collaborator === collab ? 'btn-primary' : 'btn-ghost'}`}
                              style={{
                                fontSize: 10,
                                padding: '3px 9px',
                                height: 'auto',
                                borderRadius: 999,
                                border: collaborator === collab ? 'none' : '1px solid var(--border)',
                                background: collaborator === collab ? 'linear-gradient(45deg, #f09433, #dc2743)' : '#ffffff',
                                color: collaborator === collab ? '#ffffff' : 'var(--foreground)',
                                fontWeight: collaborator === collab ? 800 : 600,
                              }}
                            >
                              🤝 {collab}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── 🤖 NATIVE INSTAGRAM ROW 3: ADD AI LABEL ── */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                        Add AI label
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)', maxWidth: 280 }}>
                        This label is required for realistic photos and videos made with AI.
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isAiLabel}
                      onChange={(e) => setIsAiLabel(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#E1306C', cursor: 'pointer' }}
                    />
                  </div>

                  {/* ── 🌐 NATIVE INSTAGRAM ROW 4: SHARE TO THREADS & FACEBOOK ── */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)' }}>
                      Share to
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                          @
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>shreebeauty.studio</div>
                          <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Threads • Public</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareThreads}
                        onChange={(e) => setShareThreads(e.target.checked)}
                        style={{ width: 17, height: 17, accentColor: '#E1306C', cursor: 'pointer' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1877F2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                          f
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>Amita Bhalani / Shree Beauty Studio</div>
                          <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Facebook • Page</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareFacebook}
                        onChange={(e) => setShareFacebook(e.target.checked)}
                        style={{ width: 17, height: 17, accentColor: '#E1306C', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
              {[
                { id: 'bridal', label: '👑 D-Day Wedding' },
                { id: 'sagai', label: '💍 Sagai / Engagement' },
                { id: 'reception', label: '✨ Reception Glam' },
                { id: 'haldi_mehndi', label: '🪔 Haldi & Mehendi' },
                { id: 'prebridal', label: '💧 Pre-Bridal Glow' },
                { id: 'review', label: '⭐ Bride Reviews' },
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
