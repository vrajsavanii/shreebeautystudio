// lib/tv-slideshow-storage.ts
// 4K Ultra-HD (2160×1440) Canvas Image Processing & Local Offline Storage Engine
import { TvSlideItem, TvSlideshowSettings } from '@/types/salon';
import { studioPhotos } from './customer-images';

export const TV_CANVAS_WIDTH = 2160;
export const TV_CANVAS_HEIGHT = 1440;
export const DEFAULT_TV_FRAME_URL = 'http://192.168.1.81:9095';

export const DEFAULT_TV_SLIDESHOW_SETTINGS: TvSlideshowSettings = {
  enabled: true,
  slideDurationSeconds: 7,
  transitionEffect: 'kenburns',
  showStudioBranding: true,
  showServiceInfo: true,
  showRatingBadge: true,
  showClock: true,
  autoSyncNetwork: true,
  cacheOfflineMaxPhotos: 100,
  tvFrameUrl: 'http://192.168.1.81:9095',
  autoUploadTo4kFrame: true,
};

// Default high-resolution studio slides for instant TV display
export const DEFAULT_TV_SLIDES: TvSlideItem[] = [
  {
    id: 'tv-slide-bridal-suite',
    url: studioPhotos.bridalSuite,
    title: 'Royal HD Bridal Makeover & Styling',
    category: 'Bridal Couture',
    resolution: '4K (2160×1440)',
    createdAt: new Date().toISOString(),
    active: true,
    duration: 8,
    source: 'upload',
    offlineCached: true,
    caption: '100% Waterproof HD Airbrush Makeup • Katargam, Surat',
  },
  {
    id: 'tv-slide-styling-floor',
    url: studioPhotos.stylingFloor,
    title: 'Hair Botox & Nanoplastia Treatment',
    category: 'Hair Care & Spa',
    resolution: '4K (2160×1440)',
    createdAt: new Date().toISOString(),
    active: true,
    duration: 7,
    source: 'upload',
    offlineCached: true,
    caption: 'Silk Smooth, Frizz-Free Transformation',
  },
  {
    id: 'tv-slide-reception',
    url: studioPhotos.reception,
    title: 'Shree Beauty Studio & Bridal Parlour',
    category: '100% Ladies Sanctuary',
    resolution: '4K (2160×1440)',
    createdAt: new Date().toISOString(),
    active: true,
    duration: 6,
    source: 'upload',
    offlineCached: true,
    caption: 'Luxury Salon Experience in Katargam, Surat',
  },
  {
    id: 'tv-slide-pedicure',
    url: studioPhotos.pedicure,
    title: 'Hydra Facial & Glass Skin Glow',
    category: 'Skincare Clinic',
    resolution: '4K (2160×1440)',
    createdAt: new Date().toISOString(),
    active: true,
    duration: 7,
    source: 'upload',
    offlineCached: true,
    caption: 'Deep Hydration & Instant Luminous Radiance',
  },
  {
    id: 'tv-slide-products',
    url: studioPhotos.products,
    title: '100% Original Luxury Branded Cosmetics',
    category: 'Authentic Care',
    resolution: '4K (2160×1440)',
    createdAt: new Date().toISOString(),
    active: true,
    duration: 6,
    source: 'upload',
    offlineCached: true,
    caption: 'Huda Beauty, MAC, NARS, Charlotte Tilbury & Dior',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. 4K Ultra-HD (2160×1440) Canvas Image Converter
// ─────────────────────────────────────────────────────────────────────────────
export interface Convert4kOptions {
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  addWatermark?: boolean;
  blurBackdrop?: boolean;
  studioTitle?: string;
  studioSubtitle?: string;
}

/**
 * Converts any photo (vertical Instagram story 9:16, 4:5 portrait, 1:1 square, or landscape)
 * into a pristine 4K 2160×1440 landscape TV wallpaper with blur backdrop and high-DPI rendering.
 */
export async function convertImageTo4k(
  source: File | Blob | string,
  options: Convert4kOptions = {}
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number; sizeBytes: number }> {
  const targetWidth = options.targetWidth || TV_CANVAS_WIDTH;
  const targetHeight = options.targetHeight || TV_CANVAS_HEIGHT;
  const quality = options.quality ?? 0.92;
  const addWatermark = options.addWatermark ?? true;
  const blurBackdrop = options.blurBackdrop ?? true;
  const studioTitle = options.studioTitle || 'SHREE BEAUTY STUDIO';
  const studioSubtitle = options.studioSubtitle || 'KATARGAM, SURAT • @shreebeauty.studio';

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          reject(new Error('Could not get 2D canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Base dark luxury studio background
        ctx.fillStyle = '#031b1e';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // 2. Blurred background fill if needed
        if (blurBackdrop) {
          ctx.save();
          // Draw image covering entire canvas with heavy blur
          ctx.filter = 'blur(60px) brightness(0.35) saturate(1.4)';
          const scaleCover = Math.max(targetWidth / img.width, targetHeight / img.height) * 1.15;
          const coverW = img.width * scaleCover;
          const coverH = img.height * scaleCover;
          const coverX = (targetWidth - coverW) / 2;
          const coverY = (targetHeight - coverH) / 2;
          ctx.drawImage(img, coverX, coverY, coverW, coverH);
          ctx.restore();

          // Add dark vignette gradient overlay
          const vignette = ctx.createRadialGradient(
            targetWidth / 2,
            targetHeight / 2,
            targetWidth * 0.25,
            targetWidth / 2,
            targetHeight / 2,
            targetWidth * 0.75
          );
          vignette.addColorStop(0, 'rgba(0,0,0,0)');
          vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        // 3. Draw Main Sharp Photo centered with true aspect ratio & luxury shadow
        const scaleFit = Math.min((targetWidth * 0.94) / img.width, (targetHeight * 0.92) / img.height);
        const fitW = img.width * scaleFit;
        const fitH = img.height * scaleFit;
        const fitX = (targetWidth - fitW) / 2;
        const fitY = (targetHeight - fitH) / 2;

        // Draw soft drop shadow behind the main subject
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 45;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 18;
        ctx.fillStyle = '#000000';
        ctx.fillRect(fitX, fitY, fitW, fitH);
        ctx.restore();

        // Draw the sharp main image
        ctx.drawImage(img, fitX, fitY, fitW, fitH);

        // Subtle luxury gold framing border around the image
        ctx.strokeStyle = 'rgba(234, 186, 56, 0.4)';
        ctx.lineWidth = 4;
        ctx.strokeRect(fitX, fitY, fitW, fitH);

        // 4. Subtle Watermark Branding in Top Right or Bottom
        if (addWatermark) {
          ctx.save();
          // Studio Pill Badge in top right corner
          const badgeX = targetWidth - 440;
          const badgeY = 40;
          const badgeW = 400;
          const badgeH = 76;
          const radius = 16;

          ctx.fillStyle = 'rgba(3, 35, 39, 0.82)';
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
          ctx.fill();
          ctx.strokeStyle = 'rgba(234, 186, 56, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Text inside badge
          ctx.fillStyle = '#eaba38';
          ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
          ctx.fillText(studioTitle, badgeX + 24, badgeY + 34);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.font = '500 15px system-ui, -apple-system, sans-serif';
          ctx.fillText(studioSubtitle, badgeX + 24, badgeY + 58);
          ctx.restore();
        }

        // 5. Export as High-Quality WebP Blob & DataURL
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }
            const dataUrl = canvas.toDataURL('image/webp', quality);
            resolve({
              dataUrl,
              blob,
              width: targetWidth,
              height: targetHeight,
              sizeBytes: blob.size,
            });
          },
          'image/webp',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for 4K conversion'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. IndexedDB Local Drive Cache & Offline Storage Engine
// ─────────────────────────────────────────────────────────────────────────────
const DB_NAME = 'shree_tv_slideshow_db';
const DB_VERSION = 1;
const STORE_NAME = 'slides';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a 4K TV slide directly to local device IndexedDB storage
 */
export async function saveSlideToLocalDb(slide: TvSlideItem): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const slideToSave = {
        ...slide,
        offlineCached: true,
        cachedAt: new Date().toISOString(),
      };
      const request = store.put(slideToSave);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('saveSlideToLocalDb error, falling back to LocalStorage:', err);
    try {
      const existing = JSON.parse(localStorage.getItem('shree_tv_slides_fallback') || '[]');
      const filtered = existing.filter((s: TvSlideItem) => s.id !== slide.id);
      filtered.unshift({ ...slide, offlineCached: true });
      localStorage.setItem('shree_tv_slides_fallback', JSON.stringify(filtered.slice(0, 50)));
    } catch {}
  }
}

/**
 * Load all offline slides stored on local device drive
 */
export async function loadAllSlidesFromLocalDb(): Promise<TvSlideItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as TvSlideItem[];
        if (results && results.length > 0) {
          resolve(results);
        } else {
          // If empty in IndexedDB, return default studio slides
          resolve(DEFAULT_TV_SLIDES);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('loadAllSlidesFromLocalDb fallback:', err);
    try {
      const fallback = JSON.parse(localStorage.getItem('shree_tv_slides_fallback') || '[]');
      if (fallback.length > 0) return fallback;
    } catch {}
    return DEFAULT_TV_SLIDES;
  }
}

/**
 * Delete a slide from local device IndexedDB storage
 */
export async function deleteSlideFromLocalDb(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('deleteSlideFromLocalDb fallback:', err);
  }
}

/**
 * Check if the browser currently has network connectivity
 */
export function isNetworkOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Sync cloud slides with local IndexedDB storage:
 * Saves all cloud slides to local drive cache for offline playback.
 */
export async function syncTvSlidesWithCloud(
  cloudSlides?: TvSlideItem[]
): Promise<{ synced: TvSlideItem[]; isOffline: boolean }> {
  const online = isNetworkOnline();
  const slidesToUse = cloudSlides && cloudSlides.length > 0 ? cloudSlides : DEFAULT_TV_SLIDES;

  if (online) {
    // Save each slide to local IndexedDB
    try {
      for (const slide of slidesToUse) {
        await saveSlideToLocalDb(slide);
      }
    } catch (e) {
      console.warn('Background sync error:', e);
    }
  }

  // Load latest state from local DB
  const localSlides = await loadAllSlidesFromLocalDb();
  return {
    synced: localSlides.length > 0 ? localSlides : slidesToUse,
    isOffline: !online,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 4kFrame TV Server Bridge (192.168.1.81:9095) Integration & Downloads
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a dataURL or image URL into a File object
 */
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/webp' });
}

/**
 * Push 4K slides directly to 4kFrame TV server via API proxy
 */
export async function pushSlidesTo4kFrame(
  slides: TvSlideItem[],
  tvUrl: string = DEFAULT_TV_FRAME_URL
): Promise<{ success: boolean; message: string; offline?: boolean; filesUploaded?: number }> {
  try {
    const formData = new FormData();
    formData.append('tvUrl', tvUrl);

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const safeTitle = (slide.title || `slide_${i + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `shree_${safeTitle}_4k_${slide.id}.webp`;
      const file = await dataUrlToFile(slide.url, filename);
      formData.append('files', file);
    }

    const res = await fetch('/api/tv-frame/upload', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      offline: true,
      message: `Failed to push to 4kFrame (${tvUrl}): ${err.message}`,
    };
  }
}

/**
 * Downloads a single 4K slide as a file for direct drag & drop to 4kFrame Admin (192.168.1.81:9095)
 */
export async function downloadSingle4kSlide(slide: TvSlideItem): Promise<void> {
  try {
    const link = document.createElement('a');
    const safeTitle = (slide.title || 'shree-4k-slide').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `${safeTitle}-2160x1440-4K.webp`;
    link.href = slide.url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('Download slide error:', err);
  }
}

/**
 * Downloads all 4K slides as files for direct drag & drop to 4kFrame Admin
 */
export async function downloadAll4kSlides(slides: TvSlideItem[]): Promise<number> {
  let count = 0;
  for (let i = 0; i < slides.length; i++) {
    await downloadSingle4kSlide(slides[i]);
    count++;
    await new Promise((r) => setTimeout(r, 200));
  }
  return count;
}

