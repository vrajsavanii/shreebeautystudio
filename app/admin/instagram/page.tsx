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
  Tv,
  Monitor,
  Wifi,
  WifiOff,
  Clock,
  ArrowUp,
  ArrowDown,
  Radio,
  Upload,
  Music,
  Volume2,
  VolumeX,
  Disc,
  Scissors,
  Activity,
  ArrowLeftRight
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { useToast } from '@/components/ui/Toast';
import { openWAWeb, openWAApp } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { TvSlideItem, TvSlideshowSettings } from '@/types/salon';
import {
  convertImageTo4k,
  saveSlideToLocalDb,
  loadAllSlidesFromLocalDb,
  deleteSlideFromLocalDb,
  syncTvSlidesWithCloud,
  DEFAULT_TV_SLIDES,
  DEFAULT_TV_SLIDESHOW_SETTINGS,
  DEFAULT_TV_FRAME_URL,
  pushSlidesTo4kFrame,
  downloadSingle4kSlide,
  downloadAll4kSlides,
  isNetworkOnline,
  TV_CANVAS_WIDTH,
  TV_CANVAS_HEIGHT,
} from '@/lib/tv-slideshow-storage';
import { SongSearchResult } from '@/app/api/instagram/search-audio/route';
import {
  PRESET_AUDIO_TRACKS,
  AudioTrackOption,
  StickerTheme,
  StickerLayout,
  renderStoryStickersOnCanvas,
  synthesizeWeddingAudioBuffer,
  decodeCustomAudioFile,
  fetchAndDecodeRemoteSongUrl,
  playAudioPreview,
  stopAudioPreview,
  composePhotoAndAudioToVideo,
} from '@/lib/photo-audio-video-builder';

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

type TabType = 'upload' | 'tv_slideshow' | 'studio' | 'feed' | 'crosspost' | 'settings';
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

function formatAudioTime(sec: number): string {
  const s = Math.floor(sec || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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

  // ── TV SLIDESHOW & OFFLINE LOCAL DRIVE STATE ──
  const [shareTvSlideshow, setShareTvSlideshow] = useState(true);
  const [tvSlides, setTvSlides] = useState<TvSlideItem[]>(data.tvSlides && data.tvSlides.length > 0 ? data.tvSlides : DEFAULT_TV_SLIDES);
  const [tvSettings, setTvSettings] = useState<TvSlideshowSettings>(data.tvSlideshowSettings || DEFAULT_TV_SLIDESHOW_SETTINGS);
  const [isConvertingTv4k, setIsConvertingTv4k] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [manualSlideTitle, setManualSlideTitle] = useState('');
  const [manualSlideCategory, setManualSlideCategory] = useState('Bridal Couture');
  const [tvPreviewIndex, setTvPreviewIndex] = useState(0);
  const [isPlayingTvPreview, setIsPlayingTvPreview] = useState(true);
  const [tvDurationInput, setTvDurationInput] = useState<number>(tvSettings.slideDurationSeconds || 7);
  const [tvTransitionInput, setTvTransitionInput] = useState<'kenburns' | 'fade' | 'zoom' | 'slide'>(tvSettings.transitionEffect || 'kenburns');
  const tvManualFileInputRef = useRef<HTMLInputElement>(null);

  // ── 4kFrame (192.168.1.81:9095) LOCAL TV SERVER STATE ──
  const [tvFrameUrl, setTvFrameUrl] = useState<string>(tvSettings.tvFrameUrl || DEFAULT_TV_FRAME_URL);
  const [tvFrameOnline, setTvFrameOnline] = useState<boolean | null>(null);
  const [isPushingTo4kFrame, setIsPushingTo4kFrame] = useState(false);
  const [isDownloading4k, setIsDownloading4k] = useState(false);
  const [tvFrameActiveMode, setTvFrameActiveMode] = useState<'CAST' | 'VIEW' | 'DELETE'>('CAST');

  // ── MULTI-PHOTO & CROP / ZOOM STATE ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const wakeLockRef = useRef<any>(null);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isAutoSliding, setIsAutoSliding] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [globalAspectRatio, setGlobalAspectRatio] = useState<AspectRatio>('original');
  const [postFormat, setPostFormat] = useState<'feed' | 'story' | 'reel'>('story');
  const [previewPosition, setPreviewPosition] = useState<'left' | 'right'>('left');
  const [studioStep, setStudioStep] = useState<'photo' | 'audio' | 'stickers'>('photo');
  const [storyOverlayEnabled, setStoryOverlayEnabled] = useState(true);
  const [stickerTheme, setStickerTheme] = useState<StickerTheme>('gold_luxury');
  const [stickerLayout, setStickerLayout] = useState<StickerLayout>('top_split');
  const [storyCustomTitle, setStoryCustomTitle] = useState('');
  const [storyShowWhatsAppCta, setStoryShowWhatsAppCta] = useState(true);
  const [storyWhatsAppCtaText, setStoryWhatsAppCtaText] = useState('');
  const [storyShowLocationTag, setStoryShowLocationTag] = useState(true);
  const [storyLocationTag, setStoryLocationTag] = useState('📍 Katargam, Surat');
  const [storyShowMentions, setStoryShowMentions] = useState(true);
  const [storyBrideHandle, setStoryBrideHandle] = useState('');
  const [storyPhotographerHandle, setStoryPhotographerHandle] = useState('');

  // Audio state
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string>('searched_song');
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioBuffer, setCustomAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDurationSec, setAudioDurationSec] = useState<number>(7);
  const [audioStartOffsetSec, setAudioStartOffsetSec] = useState<number>(0);
  const [audioPlaybackCurrentTime, setAudioPlaybackCurrentTime] = useState<number>(0);
  const [audioPlaybackDuration, setAudioPlaybackDuration] = useState<number>(30);
  const [isPreviewingStoryVideo, setIsPreviewingStoryVideo] = useState(false);
  const [previewStoryVideoUrl, setPreviewStoryVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideoPreview, setIsGeneratingVideoPreview] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const [songSearchQuery, setSongSearchQuery] = useState<string>('');
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [songSearchResults, setSongSearchResults] = useState<SongSearchResult[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongSearchResult | null>(null);
  const [activeSongCategory, setActiveSongCategory] = useState<string>('all');
  const [currentPlayingSongId, setCurrentPlayingSongId] = useState<string | null>(null);
  const audioPreviewElementRef = useRef<HTMLAudioElement | null>(null);
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
  const [isAiLabel, setIsAiLabel] = useState(false);
  const [shareThreads, setShareThreads] = useState(true);
  const [shareFacebook, setShareFacebook] = useState(true);
  const [shareGoogleMaps, setShareGoogleMaps] = useState(true);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [lastHookUsed, setLastHookUsed] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Settings state
  const [handle, setHandle] = useState(settings?.instagramHandle || '@shreebeauty.studio');
  const [instaUrl, setInstaUrl] = useState(settings?.instagramUrl || 'https://www.instagram.com/shreebeauty.studio/');
  const [accountId, setAccountId] = useState(settings?.instagramAccountId || '17841408494357129');
  const [token, setToken] = useState(settings?.instagramAccessToken || '');

  // 1. Check URL parameters for tab navigation (e.g. ?tab=tv_slideshow)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'tv_slideshow' || tabParam === 'studio' || tabParam === 'feed' || tabParam === 'crosspost' || tabParam === 'settings') {
        setActiveTab(tabParam as TabType);
      }
    }
  }, []);

  // 2. Initialize TV storage from Local Drive (IndexedDB) & sync when online
  useEffect(() => {
    let isMounted = true;
    setIsOnline(isNetworkOnline());

    const initTvStorage = async () => {
      try {
        const { synced, isOffline } = await syncTvSlidesWithCloud(data.tvSlides);
        if (isMounted) {
          if (synced && synced.length > 0) {
            setTvSlides(synced);
          }
          setIsOnline(!isOffline);
        }
      } catch (err) {
        const local = await loadAllSlidesFromLocalDb();
        if (isMounted && local.length > 0) setTvSlides(local);
      }
    };

    initTvStorage();

    const handleOnline = () => {
      setIsOnline(true);
      syncTvSlidesWithCloud(data.tvSlides).then(({ synced }) => {
        if (synced && synced.length > 0) setTvSlides(synced);
      });
      toast('🟢 Local Network Connected: TV Slides Synced!', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast('🟡 TV Offline Mode: Playing from Local Drive Cache', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [data.tvSlides]);

  // 3. Mini TV Preview Animation Timer
  useEffect(() => {
    if (!isPlayingTvPreview || tvSlides.length <= 1) return;
    const interval = setInterval(() => {
      setTvPreviewIndex((prev) => (prev + 1) % tvSlides.length);
    }, (tvDurationInput || 7) * 1000);
    return () => clearInterval(interval);
  }, [isPlayingTvPreview, tvSlides.length, tvDurationInput]);

  // 4. Background Auto-Sync Worker for 4kFrame TV (http://192.168.1.81:9095)
  // Periodically tests if TV is online and automatically uploads all pending photos without any manual click!
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    const checkAndAutoSyncToTv = async () => {
      try {
        const res = await fetch(`/api/tv-frame/status?url=${encodeURIComponent(tvFrameUrl)}`);
        const json = await res.json();
        const isUp = !!json.online;
        setTvFrameOnline(isUp);

        if (isUp) {
          const pending = tvSlides.filter((s) => !s.uploadedToTv);
          if (pending.length > 0) {
            const pushRes = await pushSlidesTo4kFrame(pending, tvFrameUrl);
            if (pushRes.success) {
              const updated = tvSlides.map((s) => ({
                ...s,
                uploadedToTv: true,
                lastSyncedAt: new Date().toISOString(),
              }));
              setTvSlides(updated);
              setData({ ...data, tvSlides: updated });
              scheduleSave();
              for (const s of updated) {
                await saveSlideToLocalDb(s);
              }
              toast(`🎉 Auto-uploaded ${pending.length} pending photo(s) to 4kFrame TV (${tvFrameUrl})!`, 'success');
            }
          }
        }
      } catch {}
    };

    checkAndAutoSyncToTv();
    intervalId = setInterval(checkAndAutoSyncToTv, 20000);
    return () => clearInterval(intervalId);
  }, [tvFrameUrl, tvSlides]);

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

  // Auto-slide slideshow effect for Story / Post preview
  useEffect(() => {
    if (!isAutoSliding || mediaItems.length <= 1) {
      setSlideProgress(0);
      return;
    }
    const intervalMs = 100;
    const totalDurationMs = 5000;
    const step = (intervalMs / totalDurationMs) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setActiveMediaIndex((curr) => (curr + 1) % mediaItems.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoSliding, mediaItems.length, activeMediaIndex]);

  // ── MULTI-FILE SELECTION HANDLER (SUPPORTS IPHONE / ANDROID / CAMERA / GALLERY) ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newItems: MediaItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVid = file.type?.startsWith('video/') || /\.(mp4|mov|m4v|3gp|webm|avi|mkv)$/i.test(file.name || '');
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
          img.onerror = () => {
            // Mobile fallback if direct Image decode fails
            if (typeof createImageBitmap === 'function') {
              createImageBitmap(file)
                .then((bmp) => {
                  setMediaItems((prev) =>
                    prev.map((m) =>
                      m.id === id ? { ...m, naturalWidth: bmp.width, naturalHeight: bmp.height } : m
                    )
                  );
                })
                .catch(() => {});
            }
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
      
      // Reset input value so re-selecting same file works
      if (e.target) {
        e.target.value = '';
      }
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

  // ── SHUFFLE / RANDOMIZE UNIQUE STICKER THEME & LAYOUT (NEVER REPEATS) ──
  const handleShuffleStickers = () => {
    const themes: StickerTheme[] = ['gold_luxury', 'instagram_gradient', 'minimal_white', 'neon_cyber', 'rose_gold'];
    const layouts: StickerLayout[] = ['top_split', 'floating_pills', 'diagonal_corners', 'compact_hud'];

    const availableThemes = themes.filter((t) => t !== stickerTheme);
    const availableLayouts = layouts.filter((l) => l !== stickerLayout);

    const nextTheme = pickRandom(availableThemes);
    const nextLayout = pickRandom(availableLayouts);

    setStickerTheme(nextTheme);
    setStickerLayout(nextLayout);

    const themeNames: Record<StickerTheme, string> = {
      gold_luxury: '👑 Gold Luxury',
      instagram_gradient: '🌈 Insta Sunset Gradient',
      minimal_white: '🤍 Minimal Boutique White',
      neon_cyber: '💎 Cyber Neon Mint',
      rose_gold: '🌸 Rose Gold Couture',
    };
    const layoutNames: Record<StickerLayout, string> = {
      top_split: '📐 Top Split',
      floating_pills: '🎈 Floating Aesthetic Pills',
      diagonal_corners: '🔀 Diagonal Corners',
      compact_hud: '🎯 Compact VIP HUD',
    };

    toast(`🎲 New Look: ${themeNames[nextTheme]} • ${layoutNames[nextLayout]}!`, 'success');
  };

  // ── AUDIO HANDLERS: SEARCH, PREVIEW & CUSTOM UPLOAD ──
  const fetchTrendingOrSearchSongs = useCallback(async (query: string = '', cat: string = '') => {
    setIsSearchingSongs(true);
    try {
      const q = query.trim() || 'trending';
      const c = cat && cat !== 'all' ? cat : '';
      const res = await fetch(`/api/instagram/search-audio?q=${encodeURIComponent(q)}&category=${encodeURIComponent(c)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.songs) && json.songs.length > 0) {
        setSongSearchResults(json.songs);
        setSelectedSong((prev) => prev || json.songs[0]);
      }
    } catch {}
    setIsSearchingSongs(false);
  }, []);

  // Fetch initial trending songs on mount
  useEffect(() => {
    fetchTrendingOrSearchSongs('trending', 'all');
  }, [fetchTrendingOrSearchSongs]);

  const handleTogglePlaySong = (song: SongSearchResult, startAtSec?: number) => {
    stopAudioPreview();
    setIsPlayingAudio(false);

    if (currentPlayingSongId === song.id && startAtSec === undefined) {
      if (audioPreviewElementRef.current) {
        audioPreviewElementRef.current.pause();
        audioPreviewElementRef.current = null;
      }
      setCurrentPlayingSongId(null);
      setAudioPlaybackCurrentTime(0);
      return;
    }

    if (audioPreviewElementRef.current) {
      audioPreviewElementRef.current.pause();
      audioPreviewElementRef.current = null;
    }

    const audio = new Audio(`/api/instagram/proxy-audio?url=${encodeURIComponent(song.previewUrl)}`);
    const targetOffset = startAtSec !== undefined ? startAtSec : audioStartOffsetSec;
    audio.currentTime = targetOffset;
    audio.ontimeupdate = () => {
      setAudioPlaybackCurrentTime(audio.currentTime);
    };
    audio.onloadedmetadata = () => {
      setAudioPlaybackDuration(audio.duration || 30);
    };
    audio.onended = () => {
      setCurrentPlayingSongId(null);
      setAudioPlaybackCurrentTime(0);
    };
    audio.onerror = () => {
      setCurrentPlayingSongId(null);
      toast('Could not stream song preview', 'error');
    };
    audio.play().then(() => {
      audioPreviewElementRef.current = audio;
      setCurrentPlayingSongId(song.id);
    }).catch(() => {
      setCurrentPlayingSongId(null);
    });
  };

  const handleSeekAudio = (newTime: number) => {
    setAudioPlaybackCurrentTime(newTime);
    setAudioStartOffsetSec(Math.floor(newTime));
    if (audioPreviewElementRef.current) {
      audioPreviewElementRef.current.currentTime = newTime;
    } else if (selectedSong) {
      handleTogglePlaySong(selectedSong, newTime);
    }
  };

  const handleSelectSong = (song: SongSearchResult) => {
    setSelectedSong(song);
    setSelectedAudioTrackId('searched_song');
    toast(`🎵 Selected Song: ${song.title}`, 'success');
  };

  const handleGenerateLiveVideoPreview = async () => {
    if (mediaItems.length === 0) {
      toast('Please upload or select at least 1 photo first to preview the video', 'info');
      return;
    }
    setIsGeneratingVideoPreview(true);
    try {
      let audioBuf: AudioBuffer | null = null;
      if (selectedAudioTrackId === 'searched_song' && selectedSong?.previewUrl) {
        audioBuf = await fetchAndDecodeRemoteSongUrl(selectedSong.previewUrl);
      } else if (selectedAudioTrackId === 'custom_audio' && customAudioBuffer) {
        audioBuf = customAudioBuffer;
      } else if (selectedAudioTrackId !== 'none') {
        audioBuf = await synthesizeWeddingAudioBuffer(selectedAudioTrackId, audioDurationSec);
      }

      if (!audioBuf) {
        toast('No audio selected to preview', 'info');
        setIsGeneratingVideoPreview(false);
        return;
      }

      const bannerTitle = '👑 SHREE BEAUTY STUDIO • KATARGAM';
      const bannerSubtitle = (storyCustomTitle.trim() || generatedCaption.split('\n')[0] || 'Royal Bridal Makeover in Katargam, Surat').substring(0, 48);
      const bannerPhone = settings?.phone2 || settings?.whatsapp || '9824183769';

      const processedPhoto = await processPhotoCrop(mediaItems[activeMediaIndex] || mediaItems[0]);

      const videoFile = await composePhotoAndAudioToVideo({
        imageFile: processedPhoto,
        audioBuffer: audioBuf,
        durationSeconds: audioDurationSec,
        startOffsetSeconds: audioStartOffsetSec,
        width: 1080,
        height: 1920,
        stickerTheme,
        stickerLayout,
        bannerTitle,
        bannerSubtitle,
        bannerPhone,
        locationTag: storyShowLocationTag ? storyLocationTag : '',
        brideHandle: storyShowMentions ? storyBrideHandle : '',
        photographerHandle: storyShowMentions ? storyPhotographerHandle : '',
        whatsappCtaText: storyShowWhatsAppCta ? (storyWhatsAppCtaText || `💬 WhatsApp: +91 ${bannerPhone} • Tap to Book`) : '',
        showBanner: storyOverlayEnabled && postFormat === 'story',
      });

      const vUrl = URL.createObjectURL(videoFile);
      setPreviewStoryVideoUrl(vUrl);
      setIsPreviewingStoryVideo(true);
      toast('🎬 Generated Live Video + Music Preview!', 'success');
    } catch (err: any) {
      toast('Could not build video preview: ' + (err.message || 'Error'), 'error');
    }
    setIsGeneratingVideoPreview(false);
  };

  const handleTogglePlayAudio = async (trackId: string) => {
    if (audioPreviewElementRef.current) {
      audioPreviewElementRef.current.pause();
      audioPreviewElementRef.current = null;
      setCurrentPlayingSongId(null);
    }

    if (isPlayingAudio) {
      stopAudioPreview();
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);
      let buf: AudioBuffer | null = null;
      if (trackId === 'custom_audio' && customAudioBuffer) {
        buf = customAudioBuffer;
      } else if (trackId !== 'none' && trackId !== 'custom_audio') {
        buf = await synthesizeWeddingAudioBuffer(trackId, 6);
      }
      if (buf) {
        playAudioPreview(buf, () => setIsPlayingAudio(false));
      } else {
        setIsPlayingAudio(false);
      }
    } catch {
      setIsPlayingAudio(false);
      toast('Could not preview audio on device', 'error');
    }
  };

  const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const buf = await decodeCustomAudioFile(file);
        setCustomAudioFile(file);
        setCustomAudioBuffer(buf);
        setSelectedAudioTrackId('custom_audio');
        toast(`🎵 Loaded custom song: ${file.name}!`, 'success');
      } catch {
        toast('Failed to decode audio file. Please select a standard MP3/M4A/WAV file.', 'error');
      }
    }
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

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const renderCanvas = (imageSource: HTMLImageElement | ImageBitmap, naturalW: number, naturalH: number) => {
        let targetW = 1080;
        let targetH = 1080;

        switch (item.aspectRatio) {
          case 'original': {
            const rawW = naturalW || 1080;
            const rawH = naturalH || 1080;
            const maxDim = 1920;
            if (rawW > maxDim || rawH > maxDim) {
              if (rawW >= rawH) {
                targetW = maxDim;
                targetH = Math.round((rawH / rawW) * maxDim);
              } else {
                targetH = maxDim;
                targetW = Math.round((rawW / rawH) * maxDim);
              }
            } else {
              targetW = rawW;
              targetH = rawH;
            }
            break;
          }
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

        const imgRatio = naturalW / naturalH;
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

        ctx.drawImage(imageSource, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = (item.file.name || 'photo').replace(/\.[^/.]+$/, '');
              const safeName = `${baseName}_crop_${Date.now()}.jpg`;
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

      img.onload = () => {
        renderCanvas(img, img.naturalWidth || 1080, img.naturalHeight || 1080);
      };

      img.onerror = async () => {
        try {
          if (typeof createImageBitmap === 'function') {
            const bitmap = await createImageBitmap(item.file);
            renderCanvas(bitmap, bitmap.width || 1080, bitmap.height || 1080);
            return;
          }
        } catch (bitmapErr) {
          console.warn('ImageBitmap fallback failed:', bitmapErr);
        }
        resolve(item.file);
      };

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
        seoKeywords: 'Surat Bridal Makeup • Best Makeup Artist Surat • Katargam Salon • Gujarati Bride Makeover • HD Airbrush Bridal • Wedding Makeup Surat',
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
        seoKeywords: 'Engagement Makeup Surat • Sagai Look Surat • Ring Ceremony Makeover • Best Salon Katargam • Surat Bridal Artist',
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
        seoKeywords: 'Reception Makeup Surat • High Glam Look • Surat Reception Bride • Cocktail Makeup Surat • Best Bridal Studio Katargam',
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
        seoKeywords: 'Haldi Makeup Surat • Mehendi Look Surat • Floral Hairdo Surat • Katargam Beauty Studio • Pre Wedding Makeover Surat',
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
        seoKeywords: 'Pre Bridal Treatment Surat • HydraFacial Surat • Bridal Glass Skin Katargam • Hair Botox Surat • Best Salon Surat',
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
        seoKeywords: 'Top Rated Bridal Studio Surat • Best Salon Katargam • Real Bride Review Surat • 5 Star Bridal Makeup Surat',
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
    
    // Guarantee permanent brand hashtags + 23 viral category hashtags = 25 total (strictly under IG 30 limit)
    const permanentTags = ['#ShreeBeautyStudiobride', '#ShreeBeautyStudio'];
    const filteredCatTags = catData.hashtags.filter((t) => !permanentTags.includes(t));
    const finalTags = [...permanentTags, ...filteredCatTags.slice(0, 23)];
    const chosenHashtags = finalTags.join(' ');

    const ctas = [
      `🏠 Studio: ${address}\n💬 WhatsApp: ${phone}\n🔗 Book Online: https://shreebeauty.studio/book`,
      `🏠 Visit Us: ${address}\n💬 WhatsApp: ${phone}\n🌐 Reserve Slot Online: https://shreebeauty.studio/book`,
    ];
    const chosenCta = pickRandom(ctas);

    const viralMentions = `@wedmegood @weddingsutra @gujaratibrides @surat_weddings @shreebeauty.studio`;
    const seoLine = catData.seoKeywords || 'Surat Bridal Makeup • Katargam Salon • Gujarati Bride Makeover';

    return `${chosenHook}\n\n${chosenBody}${customStr}${offerStr}\n\n${chosenTrigger}\n\n${chosenCta}\n\n${viralMentions}\n\n${seoLine}\n\n${chosenHashtags}`;
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

    // 📱 Acquire Screen WakeLock on mobile to prevent phone from going to sleep while publishing
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Wake lock not supported or user denied — safe to continue
    }

    setIsPublishing(true);
    setPublishSuccess(null);
    setPublishMessage('');
    setPublishingStep(`1/4: Processing & optimizing ${mediaItems.length} media file(s) for mobile...`);

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

      setPublishingStep(`2/4: Uploading ${processedFiles.length} file(s) to cloud storage CDN...`);

      const hasPhotos = mediaItems.some((m) => m.type === 'photo');
      const uploadedPublicUrls: string[] = [];

      // Try direct signed URL upload to bypass any Vercel request body limits (with mobile retry)
      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];
        const isVid = file.type?.startsWith('video/') || /\.(mp4|mov|m4v|3gp|webm|avi|mkv)$/i.test(file.name || '');
        setPublishingStep(`2/4: Uploading media ${i + 1}/${processedFiles.length} to cloud storage CDN...`);

        let uploaded = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const urlRes = await fetch('/api/instagram/upload-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                contentType: file.type || (isVid ? 'video/mp4' : 'image/jpeg'),
              }),
            });
            const urlData = await urlRes.json();
            if (urlData.success && urlData.signedUrl && urlData.publicUrl) {
              const putRes = await fetch(urlData.signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type || (isVid ? 'video/mp4' : 'image/jpeg') },
                body: file,
              });
              if (putRes.ok) {
                uploadedPublicUrls.push(urlData.publicUrl);
                uploaded = true;
                break;
              }
            }
          } catch (uploadErr) {
            console.warn(`Direct upload attempt ${attempt} failed:`, uploadErr);
          }
        }
      }

      let res: Response;

      // AbortController with generous timeout — server may poll Instagram for up to 120s
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 150000); // 150s total

      try {
        // If all files successfully uploaded directly to storage CDN
        if (uploadedPublicUrls.length === processedFiles.length && uploadedPublicUrls.length > 0) {
          setPublishingStep(
            uploadedPublicUrls.length > 1
              ? `3/4: Publishing ${uploadedPublicUrls.length}-photo Carousel to Instagram (processing & verifying)...`
              : mediaItems[0].type === 'video'
              ? '3/4: Publishing Reel to Instagram (Meta API video encoding & verifying — may take up to 60s)...'
              : '3/4: Publishing photo to Instagram (processing & verifying)...'
          );

          res = await fetch('/api/instagram/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mediaUrls: uploadedPublicUrls,
              caption: generatedCaption,
              location: postLocation,
              collaborator: collaborator,
              mediaType: processedFiles.length > 1 ? 'carousel' : (mediaItems[0].type === 'video' ? 'reel' : 'photo'),
            }),
            signal: controller.signal,
          });
        } else {
          // Fallback to FormData multipart upload
          const formData = new FormData();
          formData.append('caption', generatedCaption);
          formData.append('location', postLocation);
          formData.append('collaborator', collaborator);
          formData.append('shareThreads', String(shareThreads));
          formData.append('shareFacebook', String(shareFacebook));
          formData.append('shareGoogleMaps', String(shareGoogleMaps && hasPhotos));

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
              ? `3/4: Uploading & publishing ${processedFiles.length}-photo Carousel to Instagram...`
              : mediaItems[0].type === 'video'
              ? '3/4: Uploading & publishing Reel to Instagram (encoding may take up to 60s)...'
              : '3/4: Uploading & publishing photo to Instagram...'
          );

          res = await fetch('/api/instagram/publish', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
        }
      } catch (fetchErr: any) {
        clearTimeout(fetchTimeout);
        if (fetchErr.name === 'AbortError') {
          throw new Error('Publishing timed out. Instagram may still be processing — please wait a minute and check your Instagram profile.');
        }
        throw fetchErr;
      }
      clearTimeout(fetchTimeout);

      setPublishingStep('4/4: Confirming live Instagram post verification...');

      let json: any = {};
      try {
        json = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        json = {
          success: false,
          error: text || `Server error (Status: ${res.status})`,
        };
      }

      if (json.success && json.published) {
        setPublishSuccess(true);
        setPublishMessage(json.message || `🎉 100% Published Live to Instagram @shreebeauty.studio! (Post ID: ${json.postId || ''})`);
        toast(`🎉 Successfully published live to Instagram @shreebeauty.studio!`, 'success');

        // 5. If "Share to TV Slideshow" is checked and we have photos, convert to 4K 2160×1440 & save to local drive (IndexedDB)
        if (shareTvSlideshow && hasPhotos) {
          try {
            const newTvSlides: TvSlideItem[] = [];
            for (let i = 0; i < mediaItems.length; i++) {
              const item = mediaItems[i];
              if (item.type === 'photo') {
                const fileToConvert = processedFiles[i] || item.file;
                const conv = await convertImageTo4k(fileToConvert, {
                  targetWidth: 2160,
                  targetHeight: 1440,
                  studioTitle: 'SHREE BEAUTY STUDIO',
                  studioSubtitle: postLocation || 'KATARGAM, SURAT • @shreebeauty.studio',
                  addWatermark: true,
                  blurBackdrop: true,
                });

                const catMap: Record<string, string> = {
                  bridal: 'Bridal Couture',
                  sagai: 'Engagement Glam',
                  reception: 'Reception Look',
                  haldi_mehndi: 'Haldi & Mehndi',
                  prebridal: 'Pre-Bridal Care',
                  review: 'Bride Reviews',
                };

                const newSlide: TvSlideItem = {
                  id: `tv_insta_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
                  url: conv.dataUrl,
                  title: clientName ? `${clientName} • ${catMap[captionCategory] || 'Salon Special'}` : `${catMap[captionCategory] || 'Salon Special'} Makeover`,
                  category: catMap[captionCategory] || 'Bridal & Beauty',
                  resolution: '4K (2160×1440)',
                  createdAt: new Date().toISOString(),
                  active: true,
                  duration: 7,
                  source: 'instagram',
                  offlineCached: true,
                  caption: generatedCaption ? generatedCaption.split('\n')[0].substring(0, 100) : 'Shree Beauty Studio, Katargam',
                  aspectRatio: '2160x1440',
                };

                await saveSlideToLocalDb(newSlide);
                newTvSlides.push(newSlide);
              }
            }

            if (newTvSlides.length > 0) {
              setTvSlides((prev) => {
                const updated = [...newTvSlides, ...prev];
                const updatedData = { ...data, tvSlides: updated };
                setData(updatedData);
                scheduleSave();
                return updated;
              });
              toast(`📺 Converted & queued ${newTvSlides.length} photo(s) to 4K (2160×1440) TV Slideshow & saved to local drive!`, 'success');

              // Also auto-push directly to 4kFrame TV server (192.168.1.81:9095) in background
              pushSlidesTo4kFrame(newTvSlides, tvFrameUrl)
                .then((res) => {
                  if (res.success) {
                    toast(`🎉 Photo(s) automatically uploaded to 4kFrame TV (${tvFrameUrl})!`, 'success');
                    setTvFrameOnline(true);
                  }
                })
                .catch(() => {});
            }
          } catch (tvErr) {
            console.warn('TV Slideshow 4K Conversion error:', tvErr);
          }
        }

        navigator.clipboard.writeText(generatedCaption);
        fetchFeed();
      } else {
        setPublishSuccess(false);
        setPublishMessage(json.error || 'Publishing error');
        toast(json.error || 'Failed to publish to Instagram', 'error');
      }
    } catch (err: any) {
      setPublishSuccess(false);
      setPublishMessage(`Upload Error: ${err.message || 'Network request failed'}`);
      toast(`Upload Error: ${err.message || 'Please check your connection and try again'}`, 'error');
    } finally {
      // Release mobile wake lock
      try {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      } catch {}
      setIsPublishing(false);
      setPublishingStep('');
    }
  };

  // ── TV SLIDESHOW MANAGEMENT & 4kFrame (192.168.1.81:9095) HANDLERS ──
  const handleTvManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsConvertingTv4k(true);
    toast('⚙️ Converting photo(s) to 4K (2160×1440) Ultra-HD with luxury blur backdrop...', 'info');

    try {
      const addedSlides: TvSlideItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const conv = await convertImageTo4k(file, {
          targetWidth: 2160,
          targetHeight: 1440,
          studioTitle: 'SHREE BEAUTY STUDIO',
          studioSubtitle: 'KATARGAM, SURAT • 100% LADIES SANCTUARY',
          addWatermark: true,
          blurBackdrop: true,
        });

        const slide: TvSlideItem = {
          id: `tv_upload_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          url: conv.dataUrl,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || `Salon 4K Photo ${i + 1}`,
          category: 'Salon Special',
          resolution: '4K (2160×1440)',
          createdAt: new Date().toISOString(),
          active: true,
          duration: tvDurationInput || 7,
          source: 'upload',
          offlineCached: true,
          uploadedToTv: false,
          caption: 'Ultra-HD 4K Native 2160×1440 Resolution • Local Drive Cached',
          aspectRatio: '2160x1440',
        };

        await saveSlideToLocalDb(slide);
        addedSlides.push(slide);
      }

      setTvSlides((prev) => {
        const updated = [...addedSlides, ...prev];
        const updatedData = { ...data, tvSlides: updated };
        setData(updatedData);
        scheduleSave();
        return updated;
      });

      if (tvManualFileInputRef.current) tvManualFileInputRef.current.value = '';

      // Immediately attempt push to 4kFrame TV server
      try {
        const pushRes = await pushSlidesTo4kFrame(addedSlides, tvFrameUrl);
        if (pushRes.success) {
          setTvFrameOnline(true);
          const markedUploaded = addedSlides.map((s) => ({ ...s, uploadedToTv: true }));
          for (const s of markedUploaded) {
            await saveSlideToLocalDb(s);
          }
          setTvSlides((prev) =>
            prev.map((s) => (addedSlides.some((a) => a.id === s.id) ? { ...s, uploadedToTv: true } : s))
          );
          toast(`🎉 ${addedSlides.length} Photo(s) converted to 4K & uploaded to TV (192.168.1.81:9095)!`, 'success');
        } else {
          setTvFrameOnline(false);
          toast(`💾 4K Photo(s) saved in Local Drive! When TV connects to Wi-Fi, it will auto-upload.`, 'info');
        }
      } catch {
        setTvFrameOnline(false);
        toast(`💾 4K Photo(s) saved in Local Drive! Auto-upload will trigger when TV is connected.`, 'info');
      }
    } catch (err: any) {
      toast(`Failed to convert 4K photo: ${err.message}`, 'error');
    } finally {
      setIsConvertingTv4k(false);
    }
  };

  const handlePushAllTo4kFrame = async () => {
    if (tvSlides.length === 0) {
      toast('No 4K slides available to push', 'error');
      return;
    }
    setIsPushingTo4kFrame(true);
    toast(`🚀 Uploading ${tvSlides.length} 4K photos to 4kFrame TV (${tvFrameUrl})...`, 'info');

    try {
      const result = await pushSlidesTo4kFrame(tvSlides, tvFrameUrl);
      if (result.success) {
        toast(`🎉 Successfully uploaded all ${tvSlides.length} photos to 4kFrame TV!`, 'success');
        setTvFrameOnline(true);
        const updated = tvSlides.map((s) => ({ ...s, uploadedToTv: true, lastSyncedAt: new Date().toISOString() }));
        setTvSlides(updated);
        setData({ ...data, tvSlides: updated });
        scheduleSave();
        for (const s of updated) {
          await saveSlideToLocalDb(s);
        }
      } else {
        toast(result.message || `⚠️ TV server at ${tvFrameUrl} not reachable. Photos remain saved in local storage.`, 'error');
        setTvFrameOnline(false);
      }
    } catch (err: any) {
      toast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsPushingTo4kFrame(false);
    }
  };

  const handlePushSingleTo4kFrame = async (slide: TvSlideItem) => {
    toast(`🚀 Uploading "${slide.title || 'Photo'}" to TV (${tvFrameUrl})...`, 'info');
    try {
      const result = await pushSlidesTo4kFrame([slide], tvFrameUrl);
      if (result.success) {
        toast(`🎉 Photo uploaded to TV (${tvFrameUrl})!`, 'success');
        setTvFrameOnline(true);
        const updated = tvSlides.map((s) => (s.id === slide.id ? { ...s, uploadedToTv: true } : s));
        setTvSlides(updated);
        setData({ ...data, tvSlides: updated });
        scheduleSave();
        await saveSlideToLocalDb({ ...slide, uploadedToTv: true });
      } else {
        toast(result.message || '⚠️ TV server unreachable on this Wi-Fi network.', 'error');
        setTvFrameOnline(false);
      }
    } catch (err: any) {
      toast(`Upload failed: ${err.message}`, 'error');
    }
  };

  const handleTvRemoteControl = async (action: 'next' | 'prev' | 'current') => {
    try {
      toast(`Sending ${action === 'next' ? 'Next Photo ⏭️' : action === 'prev' ? 'Previous Photo ⏮️' : 'Refresh'} command to TV...`, 'info');
      const res = await fetch(`/api/tv-frame/control?action=${action}&url=${encodeURIComponent(tvFrameUrl)}`);
      const json = await res.json();
      if (json.success) {
        setTvFrameOnline(true);
        toast(`✅ TV Remote: ${action === 'next' ? 'Switched to Next Photo ⏭️' : action === 'prev' ? 'Switched to Previous Photo ⏮️' : 'TV Connected 🟢'}`, 'success');
      } else {
        toast(`⚠️ Could not reach TV at ${tvFrameUrl}`, 'error');
      }
    } catch {
      toast('Failed to send command to TV', 'error');
    }
  };

  const handleDownloadAll4k = async () => {
    if (tvSlides.length === 0) return;
    setIsDownloading4k(true);
    toast(`📥 Downloading ${tvSlides.length} 4K (2160×1440) Ultra-HD photos...`, 'info');
    try {
      const count = await downloadAll4kSlides(tvSlides);
      toast(`🎉 Downloaded ${count} 4K photos! You can now drag & drop them directly into 4kFrame Admin.`, 'success');
    } catch {
      toast('Failed to download slides', 'error');
    } finally {
      setIsDownloading4k(false);
    }
  };

  const handleToggleTvSlideActive = async (slideId: string) => {
    const updated = tvSlides.map((s) => (s.id === slideId ? { ...s, active: s.active === false ? true : false } : s));
    setTvSlides(updated);
    const updatedData = { ...data, tvSlides: updated };
    setData(updatedData);
    scheduleSave();
    const target = updated.find((s) => s.id === slideId);
    if (target) await saveSlideToLocalDb(target);
    toast(target?.active !== false ? '✅ Slide activated in TV playlist' : '⏸️ Slide hidden from TV playlist', 'info');
  };

  const handleDeleteTvSlide = async (slideId: string) => {
    const updated = tvSlides.filter((s) => s.id !== slideId);
    setTvSlides(updated);
    const updatedData = { ...data, tvSlides: updated };
    setData(updatedData);
    scheduleSave();
    await deleteSlideFromLocalDb(slideId);
    toast('🗑️ Slide removed from TV Slideshow and local drive', 'info');
  };

  const handleMoveTvSlide = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= tvSlides.length) return;
    const reordered = [...tvSlides];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setTvSlides(reordered);
    const updatedData = { ...data, tvSlides: reordered };
    setData(updatedData);
    scheduleSave();
    toast('↕️ TV slide playlist order updated!', 'success');
  };

  const handleSaveTvSettings = (updates: Partial<TvSlideshowSettings>) => {
    const updatedSettings: TvSlideshowSettings = { ...tvSettings, ...updates };
    setTvSettings(updatedSettings);
    const updatedData = { ...data, tvSlideshowSettings: updatedSettings };
    setData(updatedData);
    scheduleSave();
    toast('⚙️ TV Slideshow settings saved!', 'success');
  };

  const handleForceSyncTvLocalDrive = async () => {
    toast('🔄 Syncing TV slides to Local Drive (IndexedDB)...', 'info');
    try {
      const { synced, isOffline } = await syncTvSlidesWithCloud(tvSlides);
      if (synced && synced.length > 0) setTvSlides(synced);
      setIsOnline(!isOffline);
      toast('✅ All 4K slides successfully cached in local drive for offline playback!', 'success');
    } catch {
      toast('Failed to sync local drive', 'error');
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

            <Link
              href="/tv-slideshow"
              target="_blank"
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #03363d 0%, #064e58 100%)',
                color: '#eaba38',
                fontWeight: 800,
                border: '1px solid rgba(234, 186, 56, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(3, 54, 61, 0.4)',
              }}
              title="Launch Reception 4K TV Fullscreen Slideshow Player"
            >
              <Tv size={15} color="#eaba38" />
              📺 Launch 4K TV Player ↗
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Main Navigation Tabs ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
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
          onClick={() => setActiveTab('tv_slideshow')}
          className={`btn ${activeTab === 'tv_slideshow' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            background: activeTab === 'tv_slideshow' ? 'linear-gradient(135deg, #03363d 0%, #064e58 100%)' : undefined,
            color: activeTab === 'tv_slideshow' ? '#eaba38' : undefined,
            border: activeTab === 'tv_slideshow' ? '1.5px solid #eaba38' : undefined,
            boxShadow: activeTab === 'tv_slideshow' ? '0 4px 14px rgba(3, 54, 61, 0.35)' : undefined,
          }}
        >
          <Tv size={16} color={activeTab === 'tv_slideshow' ? '#eaba38' : undefined} />
          📺 TV Slideshow (ટીવી સ્લાઇડશો 4K)
          <span
            style={{
              fontSize: 10,
              background: activeTab === 'tv_slideshow' ? '#eaba38' : 'rgba(234, 186, 56, 0.15)',
              color: activeTab === 'tv_slideshow' ? '#031b1e' : '#d97706',
              padding: '1px 6px',
              borderRadius: 999,
              fontWeight: 900,
            }}
          >
            {tvSlides.length} Slides • 4K
          </span>
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`btn ${activeTab === 'studio' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Sparkles size={15} color="#eab308" />
          AI Caption Studio
        </button>
        </div>

        {/* 1-Click Layout Flip Button */}
        {activeTab === 'upload' && (
          <button
            type="button"
            onClick={() => setPreviewPosition(p => p === 'left' ? 'right' : 'left')}
            className="btn btn-secondary btn-xs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 800,
              fontSize: 11,
              padding: '6px 12px',
              borderRadius: 10,
              border: '1.5px solid rgba(225, 48, 108, 0.35)',
              background: 'rgba(225, 48, 108, 0.08)',
              color: '#E1306C',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(225, 48, 108, 0.12)',
            }}
          >
            <ArrowLeftRight size={13} />
            <span>{previewPosition === 'left' ? '⇄ Flip Layout (Preview: Left)' : '⇄ Flip Layout (Preview: Right)'}</span>
          </button>
        )}
      </div>

      {/* ── PRIMARY VIEW: 3-STEP MODERN WORKSTATION + STICKER THEMES + IPHONE 16 PRO LIVE MOCKUP ── */}
      {activeTab === 'upload' && (() => {
        {/* ── WORKSTATION CONTROLS COLUMN ── */}
        const workstationControls = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* ── STEP PROGRESS BAR (3 SIMPLE STEPS) ── */}
            <div className="card" style={{ borderRadius: 16, padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  {
                    id: 'photo',
                    num: '1',
                    title: 'Photo & Crop',
                    sub: mediaItems.length > 0 ? `${mediaItems.length} selected` : 'Select photo',
                    icon: Crop,
                  },
                  {
                    id: 'audio',
                    num: '2',
                    title: 'Music & Audio',
                    sub: selectedSong ? (selectedSong.title.length > 12 ? selectedSong.title.slice(0, 10) + '..' : selectedSong.title) : 'Song ready',
                    icon: Music,
                  },
                  {
                    id: 'stickers',
                    num: '3',
                    title: 'WhatsApp & Tags',
                    sub: 'Stickers',
                    icon: Sparkles,
                  },
                ].map((s) => {
                  const IconComp = s.icon;
                  const isActive = studioStep === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStudioStep(s.id as any)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px 8px',
                        borderRadius: 14,
                        border: isActive ? '2px solid #E1306C' : '1px solid var(--border)',
                        background: isActive ? 'linear-gradient(135deg, rgba(225, 48, 108, 0.12), rgba(240, 148, 51, 0.12))' : 'var(--card)',
                        color: isActive ? '#E1306C' : 'var(--foreground)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 4px 12px rgba(225, 48, 108, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: isActive ? '#E1306C' : 'var(--muted)',
                            color: isActive ? '#fff' : 'var(--muted-foreground)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10.5,
                            fontWeight: 900,
                          }}
                        >
                          {s.num}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: isActive ? 800 : 700 }}>{s.title}</span>
                      </div>
                      <div style={{ fontSize: 9.5, color: isActive ? '#E1306C' : 'var(--muted-foreground)', fontWeight: 600 }}>
                        {s.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                STEP 1: 📸 PHOTO SELECTION & CROP / ZOOM WORKBENCH
               ═══════════════════════════════════════════════════════════════ */}
            {studioStep === 'photo' && (
              <div className="card" style={{ borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Format Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: 0 }}>1. Choose Story / Reel / Post Format</h3>
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0 }}>Select where you want to publish</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 4, background: 'var(--muted)', padding: 3, borderRadius: 10 }}>
                    {[
                      { id: 'story', label: '⚡ Story (9:16)', ratio: '9:16' },
                      { id: 'reel', label: '🎬 Reel (9:16)', ratio: '9:16' },
                      { id: 'feed', label: '📷 Feed (1:1 / 4:5)', ratio: '4:5' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          setPostFormat(fmt.id as any);
                          handleAspectRatioChange(fmt.ratio as any, true);
                        }}
                        className={`btn btn-xs ${postFormat === fmt.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          fontSize: 10.5,
                          fontWeight: postFormat === fmt.id ? 800 : 500,
                          padding: '4px 8px',
                          borderRadius: 7,
                        }}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Title & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>1. Select Photo(s) or Video</span>
                      <span style={{ background: 'rgba(225, 48, 108, 0.12)', color: '#E1306C', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
                        {mediaItems.length > 0 ? `${activeMediaIndex + 1} of ${mediaItems.length}` : '0 of 10'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>
                      Select 1 to 10 photos for Carousel or 1 Reel Video
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                      }}
                    >
                      <span>📷 Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-primary btn-sm"
                      style={{
                        background: 'linear-gradient(45deg, #f09433, #dc2743)',
                        border: 'none',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                      }}
                    >
                      <PlusCircle size={14} />
                      <span>🖼️ Gallery</span>
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.mov,.mp4"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  capture="environment"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {/* Empty Dropzone State */}
                {mediaItems.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(225, 48, 108, 0.35)',
                      borderRadius: 14,
                      padding: '28px 16px',
                      textAlign: 'center',
                      background: 'rgba(225, 48, 108, 0.02)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(225, 48, 108, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <ImageIcon size={22} color="#E1306C" />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--foreground)' }}>Tap to Add Bride or Salon Photo</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Supports iPhone / Android high-res gallery</div>
                  </div>
                ) : (
                  <div>
                    {/* Thumbnail Strip */}
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
                      {mediaItems.map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => setActiveMediaIndex(idx)}
                          style={{
                            position: 'relative',
                            width: 65,
                            height: 80,
                            borderRadius: 10,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: idx === activeMediaIndex ? '2.5px solid #E1306C' : '1px solid var(--border)',
                            flexShrink: 0,
                            boxShadow: idx === activeMediaIndex ? '0 4px 10px rgba(225, 48, 108, 0.25)' : 'none',
                          }}
                        >
                          {item.type === 'video' ? (
                            <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Film size={18} color="#fff" />
                            </div>
                          ) : (
                            <img src={item.previewUrl} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              left: 2,
                              background: 'rgba(0,0,0,0.75)',
                              color: '#fff',
                              fontSize: 8.5,
                              fontWeight: 900,
                              padding: '1px 5px',
                              borderRadius: 4,
                            }}
                          >
                            {idx + 1}
                          </div>
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
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background: '#dc2626',
                              color: '#fff',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}

                      {mediaItems.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            width: 65,
                            height: 80,
                            borderRadius: 10,
                            border: '1.5px dashed #f472b6',
                            background: 'rgba(244, 114, 182, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            color: '#db2777',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <PlusCircle size={18} color="#db2777" />
                          <span style={{ fontSize: 9.5, fontWeight: 800 }}>Add</span>
                        </button>
                      )}
                    </div>

                    {/* Aspect Ratio Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        📐 Crop Aspect Ratio:
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCurrentItem({ fitMode: currentItem?.fitMode === 'contain' ? 'cover' : 'contain' })}
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: 'var(--foreground)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Maximize2 size={12} />
                        <span>{currentItem?.fitMode === 'contain' ? 'Fit (Contain)' : '↗ Fill (Cover)'}</span>
                      </button>
                    </div>

                    {/* Aspect Ratio Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(65px, 1fr))', gap: 6, marginBottom: 12 }}>
                      {[
                        { id: '9:16', title: '9:16', sub: 'Story/Reel' },
                        { id: '4:5', title: '4:5', sub: 'Portrait' },
                        { id: '1:1', title: '1:1', sub: 'Square' },
                        { id: 'original', title: 'Original', sub: 'Full' },
                        { id: '16:9', title: '16:9', sub: 'Landscape' },
                      ].map((r) => {
                        const isSelected = (currentItem?.aspectRatio || globalAspectRatio) === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleAspectRatioChange(r.id as any, false)}
                            style={{
                              padding: '6px 4px',
                              borderRadius: 10,
                              border: isSelected ? 'none' : '1px solid var(--border)',
                              background: isSelected ? 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)' : 'var(--muted)',
                              color: isSelected ? '#ffffff' : 'var(--foreground)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 4px 10px rgba(220, 38, 38, 0.3)' : 'none',
                            }}
                          >
                            <span style={{ fontSize: 11, fontWeight: 900 }}>{r.title}</span>
                            <span style={{ fontSize: 8.5, opacity: isSelected ? 0.9 : 0.7, fontWeight: 600 }}>{r.sub}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Zoom & Rotate Container */}
                    <div style={{ background: 'var(--muted)', borderRadius: 12, padding: '10px 12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ZoomIn size={13} color="#E1306C" /> Zoom ({((currentItem?.zoom || 1)).toFixed(2)}x)
                        </span>

                        {/* Presets & Rotate */}
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {[1, 1.25, 1.5, 2].map((z) => {
                            const isCurrent = Math.abs((currentItem?.zoom || 1) - z) < 0.05;
                            return (
                              <button
                                key={z}
                                type="button"
                                onClick={() => updateCurrentItem({ zoom: z })}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: isCurrent ? '#0f172a' : 'transparent',
                                  color: isCurrent ? '#ffffff' : 'var(--muted-foreground)',
                                  cursor: 'pointer',
                                }}
                              >
                                {z}x
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => updateCurrentItem({ rotation: ((currentItem?.rotation || 0) + 90) % 360 })}
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--card)',
                              color: 'var(--foreground)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <RotateCw size={10} /> 90°
                          </button>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.02"
                        value={currentItem?.zoom || 1}
                        onChange={(e) => updateCurrentItem({ zoom: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: '#E1306C', height: 6, cursor: 'pointer' }}
                      />
                    </div>

                    {/* ── PHOTO POSITION & SIDE ALIGNMENT CONTROLS (ફોટો સાઇડ / પોઝિશન સેટિંગ) ── */}
                    <div style={{ background: 'var(--muted)', borderRadius: 12, padding: '12px', border: '1.5px solid rgba(225, 48, 108, 0.25)', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Move size={14} color="#E1306C" />
                          <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--foreground)' }}>
                            🎯 Photo Side & Position (કઈ સાઇડ સેટ કરવી છે):
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateCurrentItem({ panX: 0, panY: 0, zoom: 1 })}
                          className="btn btn-secondary btn-xs"
                          style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}
                        >
                          <RefreshCw size={10} /> Reset Center
                        </button>
                      </div>

                      {/* Quick 1-Click Side Align Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => updateCurrentItem({ panX: 120, fitMode: 'cover' })}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 10,
                            border: (currentItem?.panX || 0) > 40 ? '2px solid #E1306C' : '1px solid var(--border)',
                            background: (currentItem?.panX || 0) > 40 ? 'rgba(225, 48, 108, 0.15)' : 'var(--card)',
                            color: (currentItem?.panX || 0) > 40 ? '#E1306C' : 'var(--foreground)',
                            fontWeight: 800,
                            fontSize: 11,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: 14 }}>👈</span>
                          <span>Left Side</span>
                          <span style={{ fontSize: 8.5, opacity: 0.7 }}>ડાબી બાજુ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateCurrentItem({ panX: 0, fitMode: 'cover' })}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 10,
                            border: (currentItem?.panX || 0) === 0 && currentItem?.fitMode !== 'contain' ? '2px solid #E1306C' : '1px solid var(--border)',
                            background: (currentItem?.panX || 0) === 0 && currentItem?.fitMode !== 'contain' ? 'rgba(225, 48, 108, 0.15)' : 'var(--card)',
                            color: (currentItem?.panX || 0) === 0 && currentItem?.fitMode !== 'contain' ? '#E1306C' : 'var(--foreground)',
                            fontWeight: 800,
                            fontSize: 11,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: 14 }}>⏺</span>
                          <span>Center</span>
                          <span style={{ fontSize: 8.5, opacity: 0.7 }}>વચ્ચે</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateCurrentItem({ panX: -120, fitMode: 'cover' })}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 10,
                            border: (currentItem?.panX || 0) < -40 ? '2px solid #E1306C' : '1px solid var(--border)',
                            background: (currentItem?.panX || 0) < -40 ? 'rgba(225, 48, 108, 0.15)' : 'var(--card)',
                            color: (currentItem?.panX || 0) < -40 ? '#E1306C' : 'var(--foreground)',
                            fontWeight: 800,
                            fontSize: 11,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: 14 }}>👉</span>
                          <span>Right Side</span>
                          <span style={{ fontSize: 8.5, opacity: 0.7 }}>જમણી બાજુ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateCurrentItem({ fitMode: currentItem?.fitMode === 'contain' ? 'cover' : 'contain', panX: 0, panY: 0 })}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 10,
                            border: currentItem?.fitMode === 'contain' ? '2px solid #22c55e' : '1px solid var(--border)',
                            background: currentItem?.fitMode === 'contain' ? 'rgba(34, 197, 94, 0.15)' : 'var(--card)',
                            color: currentItem?.fitMode === 'contain' ? '#22c55e' : 'var(--foreground)',
                            fontWeight: 800,
                            fontSize: 11,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: 14 }}>🖼</span>
                          <span>{currentItem?.fitMode === 'contain' ? '↗ Fill' : 'Fit Full'}</span>
                          <span style={{ fontSize: 8.5, opacity: 0.7 }}>આખો ફોટો</span>
                        </button>
                      </div>

                      {/* Horizontal Pan Slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 3 }}>
                          <span>👈 Show Left Side</span>
                          <span style={{ color: 'var(--foreground)', fontWeight: 800 }}>Horizontal Side: {currentItem?.panX || 0}px</span>
                          <span>Show Right Side 👉</span>
                        </div>
                        <input
                          type="range"
                          min="-250"
                          max="250"
                          step="2"
                          value={currentItem?.panX || 0}
                          onChange={(e) => updateCurrentItem({ panX: parseInt(e.target.value, 10), fitMode: 'cover' })}
                          style={{ width: '100%', accentColor: '#E1306C', height: 6, cursor: 'pointer' }}
                        />
                      </div>

                      {/* Vertical Pan Slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 3 }}>
                          <span>👆 Show Top</span>
                          <span style={{ color: 'var(--foreground)', fontWeight: 800 }}>Vertical: {currentItem?.panY || 0}px</span>
                          <span>Show Bottom 👇</span>
                        </div>
                        <input
                          type="range"
                          min="-250"
                          max="250"
                          step="2"
                          value={currentItem?.panY || 0}
                          onChange={(e) => updateCurrentItem({ panY: parseInt(e.target.value, 10), fitMode: 'cover' })}
                          style={{ width: '100%', accentColor: '#E1306C', height: 6, cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Continue to Step 2 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setStudioStep('audio')}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(45deg, #f09433, #dc2743)',
                      border: 'none',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 18px',
                      borderRadius: 12,
                      fontSize: 13,
                    }}
                  >
                    <span>Next: Choose Music / Audio</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2: 🎵 MUSIC, TRENDING SONGS & AUDIO PREVIEW
               ═══════════════════════════════════════════════════════════════ */}
            {studioStep === 'audio' && (
              <div className="card" style={{ borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Music size={16} color="#E1306C" />
                      <span>2. Select Music / Song (Auto-Merged into Story Video)</span>
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0 }}>
                      Choose trending wedding &amp; salon songs or upload your custom MP3
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => audioFileInputRef.current?.click()}
                    className="btn btn-secondary btn-xs"
                    style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(225, 48, 108, 0.3)' }}
                  >
                    <Upload size={12} /> Custom MP3
                  </button>
                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.m4a,.wav,.aac"
                    onChange={handleCustomAudioUpload}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Search Bar + Category Pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                    <input
                      type="text"
                      placeholder="Search songs: Garba, Kesariya, Royal Shehnai, Bridal Beat..."
                      value={songSearchQuery}
                      onChange={(e) => {
                        setSongSearchQuery(e.target.value);
                        fetchTrendingOrSearchSongs(e.target.value, activeSongCategory);
                      }}
                      className="input input-sm"
                      style={{ paddingLeft: 32, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                    {[
                      { id: 'all', label: '🔥 All Trending' },
                      { id: 'wedding', label: '👑 Royal Wedding' },
                      { id: 'romantic', label: '💍 Sagai / Romantic' },
                      { id: 'festive', label: '🪔 Haldi / Garba' },
                      { id: 'lounge', label: '✨ Luxury Lounge' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveSongCategory(cat.id);
                          fetchTrendingOrSearchSongs(songSearchQuery, cat.id);
                        }}
                        className={`btn btn-xs ${activeSongCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 10, fontWeight: activeSongCategory === cat.id ? 800 : 500, whiteSpace: 'nowrap' }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Song Results List */}
                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                  {songSearchResults.map((song) => {
                    const isSelected = selectedSong?.id === song.id;
                    const isPlaying = currentPlayingSongId === song.id;
                    return (
                      <div
                        key={song.id}
                        onClick={() => handleSelectSong(song)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          borderRadius: 10,
                          border: isSelected ? '2px solid #E1306C' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(225, 48, 108, 0.08)' : 'var(--card)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePlaySong(song);
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: isPlaying ? '#E1306C' : 'var(--muted)',
                              color: isPlaying ? '#fff' : '#E1306C',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {isPlaying ? <VolumeX size={13} /> : <Play size={13} style={{ marginLeft: 1 }} />}
                          </button>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {song.title}
                            </div>
                            <div style={{ fontSize: 9.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {song.artist} • {song.category}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span style={{ fontSize: 9, background: '#E1306C', color: '#fff', padding: '2px 6px', borderRadius: 999, fontWeight: 800, flexShrink: 0 }}>
                            SELECTED
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Duration & Start Offset Picker */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--muted)', padding: '8px 12px', borderRadius: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                      Story Length: <strong style={{ color: '#E1306C' }}>{audioDurationSec}s</strong>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="15"
                      value={audioDurationSec}
                      onChange={(e) => setAudioDurationSec(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#E1306C', height: 4 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                      Start Time: <strong style={{ color: '#E1306C' }}>{formatAudioTime(audioStartOffsetSec)}</strong>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={audioStartOffsetSec}
                      onChange={(e) => handleSeekAudio(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#E1306C', height: 4 }}
                    />
                  </div>
                </div>

                {/* Live Video Generator Preview Button */}
                <button
                  type="button"
                  onClick={handleGenerateLiveVideoPreview}
                  disabled={isGeneratingVideoPreview}
                  className="btn btn-secondary btn-sm"
                  style={{
                    border: '1.5px solid rgba(225, 48, 108, 0.4)',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <RefreshCw size={13} className={isGeneratingVideoPreview ? 'animate-spin' : ''} />
                  <span>{isGeneratingVideoPreview ? 'Rendering Video...' : '🎬 Preview Animated Video with Music'}</span>
                </button>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setStudioStep('photo')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <ChevronLeft size={14} /> Back to Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioStep('stickers')}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(45deg, #f09433, #dc2743)', border: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>Next: Stickers &amp; Details</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 3: ✨ STICKERS, VIRAL BADGES, LOCATION & CAPTION
               ═══════════════════════════════════════════════════════════════ */}
            {studioStep === 'stickers' && (
              <div className="card" style={{ borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={16} color="#ca8a04" />
                      <span>{postFormat === 'story' ? '3. Story Stickers & WhatsApp CTA' : '3. AI Caption & Post Details'}</span>
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0 }}>
                      {postFormat === 'story' ? 'Customize booking button, Surat location tag & bride @mentions' : 'Viral hashtags, collaborator tag & cross-posting'}
                    </p>
                  </div>
                </div>

                {/* ── STORY-SPECIFIC VIRAL STICKER CONTROLS ── */}
                {postFormat === 'story' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* 🎲 1-CLICK SHUFFLE / RANDOMIZE BUTTON */}
                    <button
                      type="button"
                      onClick={handleShuffleStickers}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 800,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
                        padding: '10px 14px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        fontSize: 12.5,
                      }}
                    >
                      <Sparkles size={16} />
                      <span>🎲 1-Click Shuffle Unique Style (કંઈક નવું / Never Repeat)</span>
                    </button>

                    {/* 🎨 1. Sticker Theme Selector */}
                    <div style={{ background: 'var(--muted)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                      <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--foreground)', marginBottom: 6, display: 'block' }}>
                        🎨 Sticker Theme (ડિઝાઇન કલર થીમ):
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 5 }}>
                        {[
                          { id: 'gold_luxury', label: '👑 Gold Luxury', desc: 'Dark Glass + Gold' },
                          { id: 'instagram_gradient', label: '🌈 Insta Sunset', desc: 'Vibrant Sunset' },
                          { id: 'minimal_white', label: '🤍 Minimal White', desc: 'Pure Boutique' },
                          { id: 'neon_cyber', label: '💎 Cyber Neon', desc: 'Electric Mint' },
                          { id: 'rose_gold', label: '🌸 Rose Gold', desc: 'Blush Velvet' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setStickerTheme(t.id as any);
                              toast(`🎨 Theme changed to ${t.label}`, 'info');
                            }}
                            style={{
                              padding: '5px 6px',
                              borderRadius: 8,
                              border: stickerTheme === t.id ? '2px solid #E1306C' : '1px solid var(--border)',
                              background: stickerTheme === t.id ? 'rgba(225, 48, 108, 0.12)' : 'var(--card)',
                              color: stickerTheme === t.id ? '#E1306C' : 'var(--foreground)',
                              fontWeight: stickerTheme === t.id ? 800 : 600,
                              fontSize: 10,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span>{t.label}</span>
                            <span style={{ fontSize: 8, opacity: 0.7 }}>{t.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 📐 2. Layout Placements Selector */}
                    <div style={{ background: 'var(--muted)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                      <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--foreground)', marginBottom: 6, display: 'block' }}>
                        📐 Sticker Layout (સ્ટીકરનું સ્થાન / ગોઠવણી):
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                        {[
                          { id: 'top_split', label: '📐 Top Split', desc: 'Location Left • Mentions Right' },
                          { id: 'floating_pills', label: '🎈 Floating Aesthetic', desc: 'Staggered Story Pills' },
                          { id: 'diagonal_corners', label: '🔀 Diagonal Corners', desc: 'Corners Dynamic Balance' },
                          { id: 'compact_hud', label: '🎯 Compact VIP HUD', desc: 'Unified Top Capsule' },
                        ].map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              setStickerLayout(l.id as any);
                              toast(`📐 Layout changed to ${l.label}`, 'info');
                            }}
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: stickerLayout === l.id ? '2px solid #3b82f6' : '1px solid var(--border)',
                              background: stickerLayout === l.id ? 'rgba(59, 130, 246, 0.12)' : 'var(--card)',
                              color: stickerLayout === l.id ? '#2563eb' : 'var(--foreground)',
                              fontWeight: stickerLayout === l.id ? 800 : 600,
                              fontSize: 10,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>{l.label}</div>
                            <div style={{ fontSize: 8, opacity: 0.7 }}>{l.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 1. Main Story Title Banner */}
                    <div style={{ background: 'rgba(3, 43, 48, 0.04)', border: '1px solid rgba(234, 186, 56, 0.3)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
                          👑 Story Caption / Main Title:
                        </label>
                        <span style={{ fontSize: 9.5, color: '#E1306C', fontWeight: 600 }}>Max 48 chars</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Royal Gujarati Bridal Glow ✨"
                        value={storyCustomTitle}
                        onChange={(e) => setStoryCustomTitle(e.target.value)}
                        maxLength={48}
                        className="input input-xs"
                        style={{ fontWeight: 700, marginBottom: 5 }}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {[
                          '👑 Royal Gujarati Bridal Glow ✨',
                          '💍 Sagai Glam Makeover 💖',
                          '🪔 Haldi Sunshine Radiance 💛',
                          '✨ Reception Diamond Look 💎',
                        ].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setStoryCustomTitle(sug)}
                            style={{
                              fontSize: 9,
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--foreground)',
                              cursor: 'pointer',
                            }}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. WhatsApp Direct CTA Button */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 800, color: '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} /> 💬 Direct WhatsApp Booking Button:
                        </label>
                        <input
                          type="checkbox"
                          checked={storyShowWhatsAppCta}
                          onChange={(e) => setStoryShowWhatsAppCta(e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: '#10b981', cursor: 'pointer' }}
                        />
                      </div>
                      {storyShowWhatsAppCta && (
                        <input
                          type="text"
                          placeholder="💬 WhatsApp Booking: +91 9824183769"
                          value={storyWhatsAppCtaText}
                          onChange={(e) => setStoryWhatsAppCtaText(e.target.value)}
                          className="input input-xs"
                          style={{ fontWeight: 700 }}
                        />
                      )}
                    </div>

                    {/* 3. 📍 Local Surat Location Tag */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> 📍 Local Surat Location Tag:
                        </label>
                        <input
                          type="checkbox"
                          checked={storyShowLocationTag}
                          onChange={(e) => setStoryShowLocationTag(e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: '#ef4444', cursor: 'pointer' }}
                        />
                      </div>
                      {storyShowLocationTag && (
                        <div>
                          <input
                            type="text"
                            placeholder="📍 Katargam, Surat"
                            value={storyLocationTag}
                            onChange={(e) => setStoryLocationTag(e.target.value)}
                            className="input input-xs"
                            style={{ fontWeight: 600, marginBottom: 5 }}
                          />
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {[
                              '📍 Katargam, Surat',
                              '📍 Shree Beauty Studio • Surat',
                              '📍 Radhika Society, Katargam',
                              '📍 Varachha, Surat',
                              '📍 Adajan, Surat',
                            ].map((loc) => (
                              <button
                                key={loc}
                                type="button"
                                onClick={() => setStoryLocationTag(loc)}
                                style={{
                                  fontSize: 8.5,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  background: storyLocationTag === loc ? '#ef4444' : 'transparent',
                                  color: storyLocationTag === loc ? '#fff' : '#b91c1c',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {loc}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. 👥 @Mention Bride & Photographer */}
                    <div style={{ background: 'rgba(225, 48, 108, 0.06)', border: '1px solid rgba(225, 48, 108, 0.25)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 800, color: '#E1306C', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} /> 👥 @Mention Bride &amp; Photographer:
                        </label>
                        <input
                          type="checkbox"
                          checked={storyShowMentions}
                          onChange={(e) => setStoryShowMentions(e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: '#E1306C', cursor: 'pointer' }}
                        />
                      </div>
                      {storyShowMentions && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <div>
                            <input
                              type="text"
                              placeholder="👰 @bride_handle"
                              value={storyBrideHandle}
                              onChange={(e) => setStoryBrideHandle(e.target.value)}
                              className="input input-xs"
                              style={{ fontWeight: 600 }}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="📸 @photographer"
                              value={storyPhotographerHandle}
                              onChange={(e) => setStoryPhotographerHandle(e.target.value)}
                              className="input input-xs"
                              style={{ fontWeight: 600 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── FEED / REEL CAPTION & METADATA CONTROLS ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Category & Language Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {[
                        { id: 'bridal', label: '👑 Wedding' },
                        { id: 'sagai', label: '💍 Sagai' },
                        { id: 'reception', label: '✨ Reception' },
                        { id: 'haldi_mehndi', label: '🪔 Haldi' },
                        { id: 'prebridal', label: '💧 Glow' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCaptionCategory(cat.id as any)}
                          className={`btn btn-xs ${captionCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: 10, fontWeight: captionCategory === cat.id ? 800 : 500 }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Bride Name: Kinjal"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="input input-xs"
                      />
                      <input
                        type="text"
                        placeholder="Offer: 20% OFF"
                        value={specialOffer}
                        onChange={(e) => setSpecialOffer(e.target.value)}
                        className="input input-xs"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="📍 Katargam, Surat"
                        value={postLocation}
                        onChange={(e) => setPostLocation(e.target.value)}
                        className="input input-xs"
                      />
                      <input
                        type="text"
                        placeholder="🤝 Collab: @username"
                        value={collaborator}
                        onChange={(e) => setCollaborator(e.target.value)}
                        className="input input-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateFresh}
                      disabled={isGenerating}
                      className="btn btn-secondary btn-xs"
                      style={{ fontWeight: 800, color: '#E1306C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      <RefreshCw size={11} className={isGenerating ? 'animate-spin' : ''} />
                      ⚡ Generate New AI Viral Caption
                    </button>

                    {/* Collapsible Caption Box */}
                    <div>
                      <textarea
                        value={generatedCaption}
                        onChange={(e) => setGeneratedCaption(e.target.value)}
                        rows={5}
                        className="input"
                        placeholder="Caption & hashtags..."
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11.5,
                          lineHeight: 1.4,
                          padding: 8,
                          borderRadius: 8,
                          resize: 'vertical',
                          width: '100%',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedCaption, 'copy-caption-step3')}
                          className="btn btn-secondary btn-xs"
                          style={{ fontSize: 10, fontWeight: 700 }}
                        >
                          {copiedId === 'copy-caption-step3' ? <Check size={10} color="#16a34a" /> : <Copy size={10} />}
                          Copy Text
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Back to Music Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setStudioStep('audio')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <ChevronLeft size={14} /> Back to Music
                  </button>
                  <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✓ Ready to Publish 👉
                  </span>
                </div>
              </div>
            )}
          </div>
        );

        {/* ── REALISTIC IPHONE 16 PRO LIVE MOCKUP & MASTER PUBLISH HUB ── */}
        const mockupAndPublish = (
          <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Phone Container */}
            <div
              style={{
                background: '#0d1117',
                borderRadius: 36,
                padding: '12px 10px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), 0 0 0 2px #2d3748',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Dynamic Island / Notch */}
              <div
                style={{
                  width: 90,
                  height: 18,
                  borderRadius: 12,
                  background: '#000000',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1e293b' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7', opacity: 0.6 }} />
              </div>

              {/* Instagram Screen Shell */}
              <div
                style={{
                  width: '100%',
                  borderRadius: 24,
                  overflow: 'hidden',
                  background: '#000000',
                  border: '1px solid rgba(255,255,255,0.1)',
                  position: 'relative',
                }}
              >
                {/* Story Top Progress & Profile Bar */}
                {postFormat === 'story' ? (
                  <div style={{ padding: '8px 10px 4px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)', zIndex: 15, position: 'relative' }}>
                    {/* Multi-Story Progress Segments */}
                    <div style={{ display: 'flex', gap: 3, width: '100%', marginBottom: 6 }}>
                      {mediaItems.length > 1 ? (
                        mediaItems.map((_, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMediaIndex(idx);
                              setSlideProgress(0);
                            }}
                            style={{
                              flex: 1,
                              height: 2.5,
                              background: 'rgba(255,255,255,0.3)',
                              borderRadius: 2,
                              overflow: 'hidden',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                width: idx < activeMediaIndex ? '100%' : idx === activeMediaIndex ? (isAutoSliding ? `${slideProgress}%` : '100%') : '0%',
                                height: '100%',
                                background: '#ffffff',
                                borderRadius: 2,
                                transition: isAutoSliding && idx === activeMediaIndex ? 'width 0.1s linear' : 'none',
                              }}
                            />
                          </div>
                        ))
                      ) : (
                        <div style={{ width: '100%', height: 2.5, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: '100%', height: '100%', background: '#ffffff', borderRadius: 2 }} />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #dc2743)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 900 }}>
                          S
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                            shreebeauty.studio <span style={{ fontSize: 9, opacity: 0.7 }}>• 1h</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {mediaItems.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAutoSliding(!isAutoSliding);
                            }}
                            style={{
                              background: isAutoSliding ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                              border: isAutoSliding ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.35)',
                              color: isAutoSliding ? '#22c55e' : '#ffffff',
                              borderRadius: 999,
                              padding: '2px 8px',
                              fontSize: 8.5,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              cursor: 'pointer',
                            }}
                          >
                            {isAutoSliding ? <Pause size={9} /> : <Play size={9} />}
                            <span>{isAutoSliding ? 'Auto' : 'Play'}</span>
                          </button>
                        )}
                        <span style={{ fontSize: 8.5, fontWeight: 800, background: 'rgba(225, 48, 108, 0.4)', color: '#fff', padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(225, 48, 108, 0.6)' }}>
                          ⚡ STORY {mediaItems.length > 1 ? `(${activeMediaIndex + 1}/${mediaItems.length})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', background: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #dc2743)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 900 }}>
                        S
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>shreebeauty.studio</div>
                        <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)' }}>{postLocation || 'Katargam, Surat'}</div>
                      </div>
                    </div>
                    {mediaItems.length > 1 && (
                      <span style={{ fontSize: 9.5, background: 'rgba(225, 48, 108, 0.2)', color: '#E1306C', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                        {activeMediaIndex + 1}/{mediaItems.length}
                      </span>
                    )}
                  </div>
                )}

                {/* Media Canvas / Photo Render */}
                {mediaItems.length > 0 && currentItem ? (
                  <div
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      setDragStart({ x: e.clientX - (currentItem?.panX || 0), y: e.clientY - (currentItem?.panY || 0) });
                    }}
                    onMouseMove={(e) => {
                      if (isDragging) {
                        updateCurrentItem({
                          panX: Math.round(e.clientX - dragStart.x),
                          panY: Math.round(e.clientY - dragStart.y),
                          fitMode: 'cover',
                        });
                      }
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onTouchStart={(e) => {
                      if (e.touches.length === 1) {
                        setIsDragging(true);
                        setDragStart({ x: e.touches[0].clientX - (currentItem?.panX || 0), y: e.touches[0].clientY - (currentItem?.panY || 0) });
                      }
                    }}
                    onTouchMove={(e) => {
                      if (isDragging && e.touches.length === 1) {
                        updateCurrentItem({
                          panX: Math.round(e.touches[0].clientX - dragStart.x),
                          panY: Math.round(e.touches[0].clientY - dragStart.y),
                          fitMode: 'cover',
                        });
                      }
                    }}
                    onTouchEnd={() => setIsDragging(false)}
                    style={{
                      position: 'relative',
                      background: '#000',
                      overflow: 'hidden',
                      ...getAspectRatioStyle(currentItem.aspectRatio || globalAspectRatio, currentItem.naturalWidth, currentItem.naturalHeight),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                  >
                    {/* Quick Side & Position Alignment Floating Bar (કઈ સાઇડ સેટ કરવી છે) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: postFormat === 'story' ? 52 : 46,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        background: 'rgba(0, 0, 0, 0.8)',
                        padding: '3px 6px',
                        borderRadius: 999,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        zIndex: 16,
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCurrentItem({ panX: 120, fitMode: 'cover' });
                          toast('👈 Left side set', 'success');
                        }}
                        style={{
                          padding: '2px 6px',
                          borderRadius: 999,
                          fontSize: 9,
                          fontWeight: 800,
                          border: (currentItem?.panX || 0) > 40 ? '1px solid #E1306C' : 'none',
                          background: (currentItem?.panX || 0) > 40 ? '#E1306C' : 'transparent',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                        title="Show Left Side"
                      >
                        👈 Left
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCurrentItem({ panX: 0, panY: 0, fitMode: 'cover' });
                          toast('⏺ Center set', 'success');
                        }}
                        style={{
                          padding: '2px 6px',
                          borderRadius: 999,
                          fontSize: 9,
                          fontWeight: 800,
                          border: (currentItem?.panX || 0) === 0 && currentItem?.fitMode !== 'contain' ? '1px solid #E1306C' : 'none',
                          background: (currentItem?.panX || 0) === 0 && currentItem?.fitMode !== 'contain' ? '#E1306C' : 'transparent',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                        title="Center"
                      >
                        ⏺ Center
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCurrentItem({ panX: -120, fitMode: 'cover' });
                          toast('👉 Right side set (Bride visible)', 'success');
                        }}
                        style={{
                          padding: '2px 6px',
                          borderRadius: 999,
                          fontSize: 9,
                          fontWeight: 800,
                          border: (currentItem?.panX || 0) < -40 ? '1px solid #E1306C' : 'none',
                          background: (currentItem?.panX || 0) < -40 ? '#E1306C' : 'transparent',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                        title="Show Right Side (Bride)"
                      >
                        👉 Right
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCurrentItem({ fitMode: currentItem?.fitMode === 'contain' ? 'cover' : 'contain', panX: 0, panY: 0 });
                          toast(currentItem?.fitMode === 'contain' ? '↗ Filled screen' : '🖼 Full photo fitted (No crop)', 'success');
                        }}
                        style={{
                          padding: '2px 6px',
                          borderRadius: 999,
                          fontSize: 9,
                          fontWeight: 800,
                          border: currentItem?.fitMode === 'contain' ? '1px solid #22c55e' : 'none',
                          background: currentItem?.fitMode === 'contain' ? '#22c55e' : 'transparent',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                        title="Fit Full Photo"
                      >
                        {currentItem?.fitMode === 'contain' ? '↗ Fill' : '🖼 Fit Full'}
                      </button>
                    </div>
                    {/* Interactive Tap to Slide (Tap Left = Prev, Tap Right = Next) */}
                    {mediaItems.length > 1 && (
                      <>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
                            setSlideProgress(0);
                          }}
                          title="Tap left: Previous slide"
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            width: '35%',
                            zIndex: 8,
                            cursor: 'pointer',
                          }}
                        />
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
                            setSlideProgress(0);
                          }}
                          title="Tap right: Next slide"
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            right: 0,
                            width: '65%',
                            zIndex: 8,
                            cursor: 'pointer',
                          }}
                        />

                        {/* Floating Left/Right Chevron Buttons */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
                            setSlideProgress(0);
                          }}
                          style={{
                            position: 'absolute',
                            left: 6,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.65)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 14,
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                          }}
                          title="Previous Slide"
                        >
                          <ChevronLeft size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
                            setSlideProgress(0);
                          }}
                          style={{
                            position: 'absolute',
                            right: 6,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.65)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 14,
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                          }}
                          title="Next Slide"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </>
                    )}
                    {/* Blurred Backdrop */}
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

                    {/* Dynamic Theme & Layout Story Stickers */}
                    {postFormat === 'story' && storyOverlayEnabled && (() => {
                      const getStyles = () => {
                        switch (stickerTheme) {
                          case 'instagram_gradient':
                            return {
                              loc: { background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', border: '1px solid #ffffff', color: '#ffffff' },
                              bride: { background: 'linear-gradient(45deg, #dc2743, #bc1888)', border: '1px solid #ffffff', color: '#ffffff' },
                              photo: { background: 'rgba(24, 24, 27, 0.9)', border: '1px solid #ffffff', color: '#ffffff' },
                              banner: { background: 'linear-gradient(135deg, rgba(240, 148, 51, 0.94), rgba(220, 39, 67, 0.94), rgba(188, 24, 136, 0.94))', border: '1.5px solid #ffffff' },
                              title: { color: '#ffffff' },
                              subtitle: { color: '#ffffff' },
                              wa: { background: '#ffffff', color: '#dc2743', border: '1px solid rgba(255,255,255,0.9)' },
                            };
                          case 'minimal_white':
                            return {
                              loc: { background: 'rgba(255, 255, 255, 0.96)', border: '1px solid rgba(0,0,0,0.15)', color: '#0f172a' },
                              bride: { background: 'rgba(255, 255, 255, 0.96)', border: '1px solid rgba(225, 48, 108, 0.5)', color: '#be185d' },
                              photo: { background: 'rgba(255, 255, 255, 0.96)', border: '1px solid rgba(15, 23, 42, 0.2)', color: '#0f172a' },
                              banner: { background: 'rgba(255, 255, 255, 0.96)', border: '1.5px solid rgba(0,0,0,0.12)' },
                              title: { color: '#b45309' },
                              subtitle: { color: '#0f172a' },
                              wa: { background: 'rgba(16, 185, 129, 0.96)', color: '#ffffff', border: '1px solid rgba(0,0,0,0.1)' },
                            };
                          case 'neon_cyber':
                            return {
                              loc: { background: 'rgba(2, 44, 34, 0.94)', border: '1.5px solid #10b981', color: '#a7f3d0' },
                              bride: { background: 'rgba(80, 7, 36, 0.94)', border: '1.5px solid #f43f5e', color: '#fecdd3' },
                              photo: { background: 'rgba(6, 78, 59, 0.94)', border: '1.5px solid #34d399', color: '#6ee7b7' },
                              banner: { background: 'rgba(2, 44, 34, 0.94)', border: '1.5px solid #10b981' },
                              title: { color: '#34d399' },
                              subtitle: { color: '#ffffff' },
                              wa: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: '1px solid #a7f3d0' },
                            };
                          case 'rose_gold':
                            return {
                              loc: { background: 'rgba(76, 17, 48, 0.92)', border: '1.5px solid #f472b6', color: '#fdf2f8' },
                              bride: { background: 'rgba(157, 23, 77, 0.94)', border: '1px solid #fbcfe8', color: '#ffffff' },
                              photo: { background: 'rgba(76, 17, 48, 0.94)', border: '1px solid #fde047', color: '#fde047' },
                              banner: { background: 'rgba(76, 17, 48, 0.94)', border: '1.5px solid #f472b6' },
                              title: { color: '#fbcfe8' },
                              subtitle: { color: '#ffffff' },
                              wa: { background: 'rgba(244, 114, 182, 0.96)', color: '#4c1130', border: '1px solid #ffffff' },
                            };
                          case 'gold_luxury':
                          default:
                            return {
                              loc: { background: 'rgba(15, 23, 42, 0.92)', border: '1.5px solid #eaba38', color: '#ffffff' },
                              bride: { background: 'rgba(225, 48, 108, 0.92)', border: '1px solid #ffffff', color: '#ffffff' },
                              photo: { background: 'rgba(3, 43, 48, 0.94)', border: '1px solid #eaba38', color: '#eaba38' },
                              banner: { background: 'rgba(3, 43, 48, 0.92)', border: '1.5px solid #eaba38' },
                              title: { color: '#eaba38' },
                              subtitle: { color: '#ffffff' },
                              wa: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)' },
                            };
                        }
                      };
                      const st = getStyles();

                      return (
                        <>
                          {/* Layout: TOP_SPLIT */}
                          {stickerLayout === 'top_split' && (
                            <>
                              {storyShowLocationTag && storyLocationTag && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 12,
                                    left: 10,
                                    borderRadius: 999,
                                    padding: '2px 8px',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    backdropFilter: 'blur(6px)',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                    zIndex: 6,
                                    ...st.loc,
                                  }}
                                >
                                  {storyLocationTag}
                                </div>
                              )}

                              {storyShowMentions && (storyBrideHandle || storyPhotographerHandle) && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 12,
                                    right: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3,
                                    alignItems: 'flex-end',
                                    zIndex: 6,
                                  }}
                                >
                                  {storyBrideHandle && (
                                    <div
                                      style={{
                                        padding: '2px 7px',
                                        borderRadius: 999,
                                        fontSize: 8,
                                        fontWeight: 800,
                                        ...st.bride,
                                      }}
                                    >
                                      👰 Bride: {storyBrideHandle}
                                    </div>
                                  )}
                                  {storyPhotographerHandle && (
                                    <div
                                      style={{
                                        padding: '2px 7px',
                                        borderRadius: 999,
                                        fontSize: 8,
                                        fontWeight: 800,
                                        ...st.photo,
                                      }}
                                    >
                                      📸 Photo: {storyPhotographerHandle}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 48,
                                  left: 14,
                                  right: 14,
                                  borderRadius: 16,
                                  padding: '7px 10px',
                                  textAlign: 'center',
                                  backdropFilter: 'blur(6px)',
                                  boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                                  zIndex: 5,
                                  ...st.banner,
                                }}
                              >
                                <div style={{ fontSize: 8, fontWeight: 800, marginBottom: 1, ...st.title }}>
                                  👑 SHREE BEAUTY STUDIO
                                </div>
                                <div style={{ fontSize: 9.5, fontWeight: 800, marginBottom: 3, ...st.subtitle }}>
                                  {storyCustomTitle.trim() || 'Royal Bridal Makeover in Katargam, Surat'}
                                </div>
                                {storyShowWhatsAppCta && (
                                  <div
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 999,
                                      fontSize: 8.5,
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      ...st.wa,
                                    }}
                                  >
                                    <span>{storyWhatsAppCtaText || `💬 WhatsApp: +91 ${settings?.phone2 || settings?.whatsapp || '9824183769'}`}</span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* Layout: FLOATING_PILLS */}
                          {stickerLayout === 'floating_pills' && (
                            <>
                              {storyShowLocationTag && storyLocationTag && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 14,
                                    left: 10,
                                    borderRadius: 999,
                                    padding: '3px 9px',
                                    fontSize: 8.5,
                                    fontWeight: 800,
                                    zIndex: 6,
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                                    ...st.loc,
                                  }}
                                >
                                  {storyLocationTag}
                                </div>
                              )}

                              <div
                                style={{
                                  position: 'absolute',
                                  top: 38,
                                  left: 10,
                                  borderRadius: 999,
                                  padding: '3px 9px',
                                  fontSize: 8.5,
                                  fontWeight: 800,
                                  zIndex: 6,
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                                  ...st.banner,
                                }}
                              >
                                <span style={{ ...st.title }}>👑 {storyCustomTitle.trim() || 'Royal Bridal Glow'}</span>
                              </div>

                              {storyShowMentions && (storyBrideHandle || storyPhotographerHandle) && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 14,
                                    right: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3,
                                    zIndex: 6,
                                  }}
                                >
                                  {storyBrideHandle && (
                                    <div style={{ padding: '2px 7px', borderRadius: 999, fontSize: 8, fontWeight: 800, ...st.bride }}>
                                      👰 {storyBrideHandle}
                                    </div>
                                  )}
                                  {storyPhotographerHandle && (
                                    <div style={{ padding: '2px 7px', borderRadius: 999, fontSize: 8, fontWeight: 800, ...st.photo }}>
                                      📸 {storyPhotographerHandle}
                                    </div>
                                  )}
                                </div>
                              )}

                              {storyShowWhatsAppCta && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: 48,
                                    left: 14,
                                    right: 14,
                                    borderRadius: 999,
                                    padding: '5px 12px',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    textAlign: 'center',
                                    zIndex: 6,
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
                                    ...st.wa,
                                  }}
                                >
                                  <span>{storyWhatsAppCtaText || `💬 WhatsApp: +91 ${settings?.phone2 || settings?.whatsapp || '9824183769'}`}</span>
                                </div>
                              )}
                            </>
                          )}

                          {/* Layout: DIAGONAL_CORNERS */}
                          {stickerLayout === 'diagonal_corners' && (
                            <>
                              {storyShowLocationTag && storyLocationTag && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 12,
                                    left: 10,
                                    borderRadius: 999,
                                    padding: '2px 8px',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    zIndex: 6,
                                    ...st.loc,
                                  }}
                                >
                                  {storyLocationTag}
                                </div>
                              )}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 12,
                                  right: 10,
                                  borderRadius: 999,
                                  padding: '2px 8px',
                                  fontSize: 8,
                                  fontWeight: 800,
                                  zIndex: 6,
                                  ...st.banner,
                                }}
                              >
                                <span style={{ ...st.title }}>👑 SHREE STUDIO</span>
                              </div>

                              {storyShowMentions && (storyBrideHandle || storyPhotographerHandle) && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: 50,
                                    left: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3,
                                    zIndex: 6,
                                  }}
                                >
                                  {storyBrideHandle && (
                                    <div style={{ padding: '2px 7px', borderRadius: 999, fontSize: 8, fontWeight: 800, ...st.bride }}>
                                      👰 {storyBrideHandle}
                                    </div>
                                  )}
                                  {storyPhotographerHandle && (
                                    <div style={{ padding: '2px 7px', borderRadius: 999, fontSize: 8, fontWeight: 800, ...st.photo }}>
                                      📸 {storyPhotographerHandle}
                                    </div>
                                  )}
                                </div>
                              )}

                              {storyShowWhatsAppCta && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: 50,
                                    right: 10,
                                    borderRadius: 8,
                                    padding: '4px 8px',
                                    fontSize: 8.5,
                                    fontWeight: 800,
                                    zIndex: 6,
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                                    ...st.wa,
                                  }}
                                >
                                  💬 WhatsApp Book
                                </div>
                              )}
                            </>
                          )}

                          {/* Layout: COMPACT_HUD */}
                          {stickerLayout === 'compact_hud' && (
                            <>
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 12,
                                  left: 10,
                                  right: 10,
                                  borderRadius: 999,
                                  padding: '3px 10px',
                                  fontSize: 8.5,
                                  fontWeight: 800,
                                  textAlign: 'center',
                                  zIndex: 6,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                  ...st.loc,
                                }}
                              >
                                {storyLocationTag || '📍 Katargam, Surat'} {storyBrideHandle ? ` • 👰 ${storyBrideHandle}` : ''}
                              </div>

                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 48,
                                  left: 10,
                                  right: 10,
                                  borderRadius: 12,
                                  padding: '6px 8px',
                                  textAlign: 'center',
                                  backdropFilter: 'blur(6px)',
                                  boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                                  zIndex: 5,
                                  ...st.banner,
                                }}
                              >
                                <div style={{ fontSize: 8, fontWeight: 800, marginBottom: 1, ...st.title }}>
                                  👑 SHREE BEAUTY STUDIO • KATARGAM
                                </div>
                                <div style={{ fontSize: 9.5, fontWeight: 800, marginBottom: 3, ...st.subtitle }}>
                                  {storyCustomTitle.trim() || 'Royal Bridal Makeover in Katargam, Surat'}
                                </div>
                                {storyShowWhatsAppCta && (
                                  <div
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 999,
                                      fontSize: 8,
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      ...st.wa,
                                    }}
                                  >
                                    <span>{storyWhatsAppCtaText || `💬 WhatsApp: +91 ${settings?.phone2 || settings?.whatsapp || '9824183769'}`}</span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}

                    {/* Story Bottom Reply Bar */}
                    {postFormat === 'story' && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 10,
                          right: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          zIndex: 10,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            borderRadius: 999,
                            border: '1px solid rgba(255,255,255,0.4)',
                            padding: '4px 10px',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 9,
                            backdropFilter: 'blur(4px)',
                            background: 'rgba(0,0,0,0.3)',
                          }}
                        >
                          Send message...
                        </div>
                        <Heart size={14} color="#ffffff" />
                        <Send size={14} color="#ffffff" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ height: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', gap: 8 }}>
                    <ImageIcon size={36} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>No media selected</span>
                  </div>
                )}
              </div>
            </div>

            {/* MASTER PUBLISH & ACTIONS BAR */}
            <div className="card" style={{ borderRadius: 16, padding: 14, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Multi-Photo Slide Controller Bar */}
                {mediaItems.length > 1 && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
                          setSlideProgress(0);
                        }}
                        className="btn btn-secondary btn-xs"
                        style={{ padding: '4px 8px', borderRadius: 8, fontWeight: 700, fontSize: 11 }}
                        title="Previous slide"
                      >
                        <ChevronLeft size={13} /> Prev
                      </button>

                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--foreground)' }}>
                        Slide {activeMediaIndex + 1} / {mediaItems.length}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
                          setSlideProgress(0);
                        }}
                        className="btn btn-secondary btn-xs"
                        style={{ padding: '4px 8px', borderRadius: 8, fontWeight: 700, fontSize: 11 }}
                        title="Next slide"
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAutoSliding(!isAutoSliding)}
                      className="btn btn-xs"
                      style={{
                        background: isAutoSliding ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        border: isAutoSliding ? '1px solid #22c55e' : '1px solid var(--border)',
                        color: isAutoSliding ? '#22c55e' : 'var(--foreground)',
                        fontWeight: 700,
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      {isAutoSliding ? <Pause size={12} /> : <Play size={12} />}
                      <span>{isAutoSliding ? 'Auto Playing' : 'Auto Play'}</span>
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handlePublishToInstagram}
                  disabled={isPublishing || mediaItems.length === 0}
                  className="btn btn-primary btn-lg"
                  style={{
                    background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: 14,
                    padding: '12px 18px',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 6px 20px rgba(220, 39, 67, 0.4)',
                    cursor: 'pointer',
                  }}
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{publishingStep || 'Publishing to Instagram...'}</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>🚀 Publish Story / Post Instantly</span>
                    </>
                  )}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleDownloadCrop}
                    disabled={!currentItem}
                    className="btn btn-secondary btn-xs"
                    style={{ fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <Download size={12} /> Save 9:16 Photo
                  </button>

                  <button
                    type="button"
                    onClick={handleShuffleStickers}
                    className="btn btn-secondary btn-xs"
                    style={{ fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#ec4899' }}
                  >
                    <Sparkles size={12} /> 🎲 Shuffle Style
                  </button>
                </div>

                {publishSuccess && (
                  <div style={{ background: 'rgba(22, 163, 74, 0.1)', border: '1px solid #16a34a', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#16a34a', fontWeight: 700, textAlign: 'center' }}>
                    {publishMessage || '🎉 Successfully published to Instagram!'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

        return (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {previewPosition === 'left' ? (
              <>
                {mockupAndPublish}
                {workstationControls}
              </>
            ) : (
              <>
                {workstationControls}
                {mockupAndPublish}
              </>
            )}
          </motion.div>
        );
      })()}

      {/* ── TAB: 📺 TV 4K AUTO-UPLOADER & SYNC (192.168.1.81:9095) ── */}
      {activeTab === 'tv_slideshow' && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Top Status & 4kFrame Server Bridge Card */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #021a1d 0%, #03363d 50%, #054852 100%)',
              border: '2px solid rgba(234, 186, 56, 0.45)',
              borderRadius: 16,
              padding: '20px 24px',
              color: '#fff',
              boxShadow: '0 10px 30px rgba(2, 26, 29, 0.45)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #eaba38 0%, #ca8a04 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 18px rgba(234, 186, 56, 0.35)',
                    color: '#031b1e',
                  }}
                >
                  <Tv size={26} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                      TV 4K Photo Auto-Uploader
                    </h2>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: tvFrameOnline ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: tvFrameOnline ? '#4ade80' : '#facc15',
                        border: tvFrameOnline ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(234, 179, 8, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {tvFrameOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {tvFrameOnline ? '🟢 TV Connected (192.168.1.81:9095) • Auto-Syncing' : '🟡 TV Offline (Saved in Local Drive • Auto-Uploads on Connect)'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.85)' }}>
                    ફોટો આપમેળે <strong>4K (2160×1440)</strong> માં કન્વર્ટ થઈને તમારા ટીવી <strong style={{ color: '#eaba38' }}>{tvFrameUrl}/admin/</strong> પર અપલોડ થઈ જશે. નેટ ન હોય તો લોકલ ડ્રાઇવમાં સેવ રહેશે.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <a
                  href={`${tvFrameUrl}/admin/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 800,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                    padding: '8px 14px',
                  }}
                  title="Open 4kFrame Admin in new tab"
                >
                  <ExternalLink size={14} />
                  Open TV Admin ({tvFrameUrl}) ↗
                </a>

                <button
                  type="button"
                  onClick={handlePushAllTo4kFrame}
                  disabled={isPushingTo4kFrame}
                  className="btn btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #eaba38 0%, #d97706 100%)',
                    color: '#031b1e',
                    fontWeight: 800,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(234, 186, 56, 0.4)',
                    padding: '8px 16px',
                  }}
                >
                  <Upload size={14} className={isPushingTo4kFrame ? 'animate-spin' : ''} />
                  {isPushingTo4kFrame ? 'Uploading to TV...' : `🚀 Sync All to TV Now`}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAll4k}
                  disabled={isDownloading4k}
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                  }}
                  title="Download all 4K photos"
                >
                  <Download size={14} />
                  {isDownloading4k ? 'Downloading...' : `📥 Download 4K (${tvSlides.length})`}
                </button>
              </div>
            </div>
          </div>

          {/* Simple 1-Click Upload & Convert Area */}
          <div
            className="card"
            style={{
              borderRadius: 16,
              padding: 24,
              border: '2px dashed rgba(234, 186, 56, 0.5)',
              background: 'linear-gradient(135deg, rgba(3, 54, 61, 0.04) 0%, rgba(234, 186, 56, 0.04) 100%)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => tvManualFileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={tvManualFileInputRef}
              onChange={handleTvManualUpload}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #eaba38 0%, #ca8a04 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#031b1e',
                  boxShadow: '0 6px 20px rgba(234, 186, 56, 0.35)',
                }}
              >
                <UploadCloud size={30} />
              </div>

              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                  {isConvertingTv4k ? '⚙️ Converting & Uploading to 4K TV (192.168.1.81:9095)...' : '📸 Click to Select Photo(s) or Drag & Drop Here'}
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--muted-foreground)', margin: '6px 0 0' }}>
                  Auto-converts to <strong>4K Ultra-HD (2160×1440)</strong> landscape format & uploads directly to TV <strong style={{ color: '#d97706' }}>({tvFrameUrl})</strong>.
                </p>
                <p style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, margin: '4px 0 0' }}>
                  ✓ 100% Offline Support: TV નેટવર્કમાં ન હોય તો પણ ફોટો લોકલ ડ્રાઇવમાં સેવ રહેશે અને નેટવર્કમાં આવતા જ ઓટો-અપલોડ થઈ જશે!
                </p>
              </div>

              <button
                type="button"
                disabled={isConvertingTv4k}
                className="btn btn-primary btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #03363d 0%, #064e58 100%)',
                  color: '#eaba38',
                  border: '1.5px solid #eaba38',
                  fontWeight: 800,
                  marginTop: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 20px',
                }}
              >
                <Sparkles size={14} color="#eaba38" />
                {isConvertingTv4k ? 'Converting to 4K...' : '+ Add Photo to TV (2160×1440)'}
              </button>
            </div>
          </div>

          {/* Photo Gallery Grid */}
          <div className="card" style={{ borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(234, 186, 56, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                    🖼️ Your 4K TV Photos ({tvSlides.length} Photos)
                  </h3>
                  <p style={{ fontSize: 11.5, color: 'var(--muted-foreground)', margin: 0 }}>
                    All photos converted to 4K 2160×1440 resolution
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>
                  Total {tvSlides.length} Photos • {tvSlides.filter((s) => s.uploadedToTv).length} Uploaded to TV
                </span>
              </div>
            </div>

            {tvSlides.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted-foreground)' }}>
                No photos in TV slideshow yet. Click above to add your first photo!
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 16,
                }}
              >
                {tvSlides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    style={{
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      background: 'var(--card-bg, #fff)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 2', background: '#000' }}>
                      <img
                        src={slide.url}
                        alt={slide.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          fontSize: 9,
                          fontWeight: 900,
                          background: '#eaba38',
                          color: '#031b1e',
                          padding: '2px 6px',
                          borderRadius: 4,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      >
                        4K 2160×1440
                      </span>

                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          fontSize: 9,
                          fontWeight: 800,
                          background: slide.uploadedToTv ? '#16a34a' : '#d97706',
                          color: '#fff',
                          padding: '2px 7px',
                          borderRadius: 4,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      >
                        {slide.uploadedToTv ? '✓ TV Uploaded' : '⏳ In Local Queue'}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        #{idx + 1} {slide.title || `Photo ${idx + 1}`}
                      </div>

                      <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>📐 2160×1440</span>
                        <span>{slide.source === 'instagram' ? '📸 Instagram' : '📁 Upload'}</span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: 6, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          onClick={() => handlePushSingleTo4kFrame(slide)}
                          className="btn btn-primary btn-xs"
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #03363d 0%, #064e58 100%)',
                            color: '#eaba38',
                            border: '1px solid #eaba38',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                          title="Send directly to TV (192.168.1.81:9095)"
                        >
                          <Upload size={11} />
                          Send to TV
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadSingle4kSlide(slide)}
                          className="btn btn-secondary btn-xs"
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                          title="Download 4K photo file"
                        >
                          <Download size={11} />
                          Download
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTvSlide(slide.id)}
                          className="btn btn-ghost btn-xs"
                          style={{ color: '#ef4444', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Delete photo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    </div>
  );
}
