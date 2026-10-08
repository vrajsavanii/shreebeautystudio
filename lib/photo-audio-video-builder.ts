// ── PHOTO + AUDIO TO VIDEO COMPOSER (In-Browser Web Audio & MediaRecorder Engine) ──
// Allows selecting royalty-free wedding/salon audio tracks or uploading custom MP3s directly inside the app,
// and automatically merges photos + audio into animated Instagram Story / Reel video MP4 clips!

export interface AudioTrackOption {
  id: string;
  name: string;
  nameGu: string;
  icon: string;
  category: 'wedding' | 'romantic' | 'lounge' | 'festive' | 'custom';
  description: string;
  bpm: number;
}

export const PRESET_AUDIO_TRACKS: AudioTrackOption[] = [
  {
    id: 'shehnai_royal',
    name: '👑 Royal Shehnai & Wedding Beats',
    nameGu: '👑 રોયલ શરણાઈ અને ઢોલક બીટ્સ (Gujarati Wedding)',
    icon: '👑',
    category: 'wedding',
    description: 'Traditional Gujarati bridal shehnai harmony with rhythmic wedding beats',
    bpm: 88,
  },
  {
    id: 'sitar_flute',
    name: '💍 Romantic Sitar & Melodic Flute',
    nameGu: '💍 રોમેન્ટિક સિતાર અને વાંસળી (Sagai & Glam)',
    icon: '💍',
    category: 'romantic',
    description: 'Soft dewy melody for engagement, Sagai & pre-bridal transformations',
    bpm: 76,
  },
  {
    id: 'luxury_lounge',
    name: '✨ Luxury Salon & Fashion Lounge',
    nameGu: '✨ લક્ઝરી સેલોન અને બ્યૂટી લાઉન્જ બીટ્સ',
    icon: '✨',
    category: 'lounge',
    description: 'Modern chic chillout beats for reception glam, hair styling & nail art',
    bpm: 104,
  },
  {
    id: 'festive_garba',
    name: '🪔 Mangal Phera & Festive Chimes',
    nameGu: '🪔 મંગળ ફેરા અને કંકુ પગલાં (Haldi & Traditional)',
    icon: '🪔',
    category: 'festive',
    description: 'Celebratory temple chimes, mandap bells & energetic traditional rhythms',
    bpm: 96,
  },
  {
    id: 'custom_audio',
    name: '📁 Upload Custom MP3 / Song',
    nameGu: '📁 તમારા ફોન/કમ્પ્યુટરમાંથી મનપસંદ ગીત (MP3)',
    icon: '📁',
    category: 'custom',
    description: 'Choose any MP3/M4A/WAV song from your phone or device gallery',
    bpm: 0,
  },
];

let sharedAudioContext: AudioContext | null = null;

export function getOrCreateAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioCtxClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

// ── SYNTHESIZE PROCEDURAL WEDDING & SALON AUDIO TRACKS (100% Offline & Royalty Free) ──
export async function synthesizeWeddingAudioBuffer(
  trackId: string,
  durationSeconds: number = 10,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);
  const now = 0;

  if (trackId === 'shehnai_royal') {
    // Shehnai: Bhairavi / Bilawal scale with rich vibrato + Dholak/Tabla beats
    const scale = [220, 247.5, 277.18, 330, 370, 440, 495, 554.37]; // A major / Bhairavi flavor
    const beatInterval = 60 / 88; // 88 BPM

    // 1. Tanpura Drone
    const drone1 = offlineCtx.createOscillator();
    const drone2 = offlineCtx.createOscillator();
    const droneGain = offlineCtx.createGain();
    drone1.type = 'sawtooth';
    drone2.type = 'triangle';
    drone1.frequency.setValueAtTime(110, now);
    drone2.frequency.setValueAtTime(165, now);
    droneGain.gain.setValueAtTime(0.08, now);

    const droneFilter = offlineCtx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(450, now);

    drone1.connect(droneFilter);
    drone2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(offlineCtx.destination);
    drone1.start(now);
    drone2.start(now);
    drone1.stop(durationSeconds);
    drone2.stop(durationSeconds);

    // 2. Shehnai Melody Notes
    let noteTime = 0.2;
    const notes = [0, 2, 3, 5, 4, 3, 2, 0, 3, 5, 7, 5, 4, 2, 0];
    let noteIdx = 0;

    while (noteTime < durationSeconds) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      const filter = offlineCtx.createBiquadFilter();

      osc.type = 'sawtooth';
      const freq = scale[notes[noteIdx % notes.length]];
      osc.frequency.setValueAtTime(freq, noteTime);

      // Shehnai Vibrato LFO
      const lfo = offlineCtx.createOscillator();
      const lfoGain = offlineCtx.createGain();
      lfo.frequency.setValueAtTime(5.5, noteTime);
      lfoGain.gain.setValueAtTime(4.5, noteTime);
      lfo.connect(osc.frequency);
      lfo.start(noteTime);
      lfo.stop(noteTime + beatInterval * 1.5);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 2, noteTime);
      filter.Q.setValueAtTime(3.5, noteTime);

      const noteDuration = beatInterval * 1.2;
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + noteDuration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + noteDuration);

      noteTime += beatInterval * 0.9;
      noteIdx++;
    }

    // 3. Dholak / Tabla Bass & Slap Beats
    let beatTime = 0;
    while (beatTime < durationSeconds) {
      // Bass Dhum
      const bassOsc = offlineCtx.createOscillator();
      const bassGain = offlineCtx.createGain();
      bassOsc.frequency.setValueAtTime(90, beatTime);
      bassOsc.frequency.exponentialRampToValueAtTime(35, beatTime + 0.18);
      bassGain.gain.setValueAtTime(0.35, beatTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.22);
      bassOsc.connect(bassGain);
      bassGain.connect(offlineCtx.destination);
      bassOsc.start(beatTime);
      bassOsc.stop(beatTime + 0.25);

      // Off-beat slap
      const slapTime = beatTime + beatInterval / 2;
      if (slapTime < durationSeconds) {
        const slapOsc = offlineCtx.createOscillator();
        const slapGain = offlineCtx.createGain();
        slapOsc.type = 'triangle';
        slapOsc.frequency.setValueAtTime(320, slapTime);
        slapOsc.frequency.exponentialRampToValueAtTime(120, slapTime + 0.08);
        slapGain.gain.setValueAtTime(0.18, slapTime);
        slapGain.gain.exponentialRampToValueAtTime(0.001, slapTime + 0.1);
        slapOsc.connect(slapGain);
        slapGain.connect(offlineCtx.destination);
        slapOsc.start(slapTime);
        slapOsc.stop(slapTime + 0.12);
      }

      beatTime += beatInterval;
    }
  } else if (trackId === 'sitar_flute') {
    // Sitar & Flute Melodic Glam
    const sitarScale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const beatInterval = 60 / 76;

    // Soft Pad
    const pad = offlineCtx.createOscillator();
    const padGain = offlineCtx.createGain();
    pad.type = 'sine';
    pad.frequency.setValueAtTime(130.81, now);
    padGain.gain.setValueAtTime(0.1, now);
    pad.connect(padGain);
    padGain.connect(offlineCtx.destination);
    pad.start(now);
    pad.stop(durationSeconds);

    let t = 0.2;
    let idx = 0;
    while (t < durationSeconds) {
      const freq = sitarScale[idx % sitarScale.length];

      // Sitar pluck
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + beatInterval * 1.8);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(t);
      osc.stop(t + beatInterval * 2);

      t += beatInterval * 0.75;
      idx++;
    }
  } else if (trackId === 'luxury_lounge') {
    // Fashion Lounge sub-bass + chords
    const beatInterval = 60 / 104;
    let t = 0;
    while (t < durationSeconds) {
      // Kick Pulse
      const kick = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kick.frequency.setValueAtTime(130, t);
      kick.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      kickGain.gain.setValueAtTime(0.38, t);
      kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      kick.connect(kickGain);
      kickGain.connect(offlineCtx.destination);
      kick.start(t);
      kick.stop(t + 0.25);

      // Snare / Rim
      const rimTime = t + beatInterval;
      if (rimTime < durationSeconds) {
        const rim = offlineCtx.createOscillator();
        const rimGain = offlineCtx.createGain();
        rim.type = 'triangle';
        rim.frequency.setValueAtTime(280, rimTime);
        rimGain.gain.setValueAtTime(0.18, rimTime);
        rimGain.gain.exponentialRampToValueAtTime(0.001, rimTime + 0.08);
        rim.connect(rimGain);
        rimGain.connect(offlineCtx.destination);
        rim.start(rimTime);
        rim.stop(rimTime + 0.1);
      }

      // Shimmer synth chord
      const chordNotes = [261.63, 329.63, 392.0, 523.25];
      chordNotes.forEach((f) => {
        const synth = offlineCtx.createOscillator();
        const synthGain = offlineCtx.createGain();
        synth.type = 'sine';
        synth.frequency.setValueAtTime(f, t);
        synthGain.gain.setValueAtTime(0.04, t);
        synthGain.gain.exponentialRampToValueAtTime(0.001, t + beatInterval * 1.5);
        synth.connect(synthGain);
        synthGain.connect(offlineCtx.destination);
        synth.start(t);
        synth.stop(t + beatInterval * 1.5);
      });

      t += beatInterval * 2;
    }
  } else {
    // Festive Mandap Chimes & Bells
    const bellScale = [329.63, 392.0, 440.0, 493.88, 587.33, 659.25];
    const beatInterval = 60 / 96;
    let t = 0.1;
    let bIdx = 0;
    while (t < durationSeconds) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(bellScale[bIdx % bellScale.length] * 2, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + beatInterval * 1.6);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(t);
      osc.stop(t + beatInterval * 1.8);

      t += beatInterval * 0.5;
      bIdx++;
    }
  }

  return await offlineCtx.startRendering();
}

// ── DECODE USER'S CUSTOM UPLOADED AUDIO FILE ──
export async function decodeCustomAudioFile(file: File): Promise<AudioBuffer> {
  const audioCtx = getOrCreateAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

// ── FETCH AND DECODE REMOTE AUDIO STREAM (e.g. from Auto Search / Trending Songs) ──
export async function fetchAndDecodeRemoteSongUrl(previewUrl: string): Promise<AudioBuffer> {
  const audioCtx = getOrCreateAudioContext();
  const proxyUrl = `/api/instagram/proxy-audio?url=${encodeURIComponent(previewUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`Failed to load song audio stream: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

// ── PLAY PREVIEW HELPER ──
let activePreviewSource: AudioBufferSourceNode | null = null;

export function stopAudioPreview() {
  if (activePreviewSource) {
    try {
      activePreviewSource.stop();
      activePreviewSource.disconnect();
    } catch {}
    activePreviewSource = null;
  }
}

export function playAudioPreview(
  audioBuffer: AudioBuffer,
  startOffsetOrOnEnded: number | (() => void) = 0,
  onEndedCallback?: () => void
) {
  stopAudioPreview();
  const audioCtx = getOrCreateAudioContext();
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);

  const startOffsetSeconds = typeof startOffsetOrOnEnded === 'number' ? startOffsetOrOnEnded : 0;
  const onEnded = typeof startOffsetOrOnEnded === 'function' ? startOffsetOrOnEnded : onEndedCallback;

  source.onended = () => {
    activePreviewSource = null;
    if (onEnded) onEnded();
  };
  const offset = Math.max(0, Math.min(startOffsetSeconds, Math.max(0, audioBuffer.duration - 0.5)));
  source.start(0, offset);
  activePreviewSource = source;
}

export type StickerTheme = 'gold_luxury' | 'instagram_gradient' | 'minimal_white' | 'neon_cyber' | 'rose_gold';
export type StickerLayout = 'top_split' | 'floating_pills' | 'diagonal_corners' | 'compact_hud';

export interface RenderStickerOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme?: StickerTheme;
  layout?: StickerLayout;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerPhone?: string;
  locationTag?: string;
  brideHandle?: string;
  photographerHandle?: string;
  whatsappCtaText?: string;
  showLocationTag?: boolean;
  showMentions?: boolean;
  showWhatsAppCta?: boolean;
  showBanner?: boolean;
}

// ── REUSABLE HIGH-RES CANVAS STICKER RENDERER ──
export function renderStoryStickersOnCanvas(options: RenderStickerOptions) {
  const {
    ctx,
    width,
    height,
    theme = 'gold_luxury',
    layout = 'top_split',
    bannerTitle = '👑 SHREE BEAUTY STUDIO • KATARGAM',
    bannerSubtitle = 'Royal Bridal Makeover in Katargam, Surat',
    bannerPhone = '9824183769',
    locationTag = '📍 Katargam, Surat',
    brideHandle = '',
    photographerHandle = '',
    whatsappCtaText = '',
    showLocationTag = true,
    showMentions = true,
    showWhatsAppCta = true,
    showBanner = true,
  } = options;

  if (!showBanner) return;

  const locText = locationTag ? locationTag.trim() : '';
  const brideText = brideHandle && brideHandle.trim() ? (brideHandle.startsWith('@') ? brideHandle : '@' + brideHandle) : '';
  const photoText = photographerHandle && photographerHandle.trim() ? (photographerHandle.startsWith('@') ? photographerHandle : '@' + photographerHandle) : '';
  const storySubtitle = (bannerSubtitle.trim() || 'Royal Bridal Makeover in Katargam, Surat').substring(0, 48);
  const waCta = (whatsappCtaText && whatsappCtaText.trim()) || `💬 WhatsApp: +91 ${bannerPhone} • Tap to Book`;

  // Pill drawing helper
  const drawPill = (
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fillStyle: string | CanvasGradient,
    strokeStyle?: string,
    lineWidth: number = 2,
    shadowColor: string = 'rgba(0,0,0,0.5)',
    shadowBlur: number = 8
  ) => {
    ctx.save();
    if (shadowColor && shadowBlur > 0) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
    }
    ctx.fillStyle = fillStyle;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
      if (strokeStyle && lineWidth > 0) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    } else {
      ctx.fillRect(x, y, w, h);
      if (strokeStyle && lineWidth > 0) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(x, y, w, h);
      }
    }
    ctx.restore();
  };

  // Build Theme Palette
  const getThemePalette = () => {
    switch (theme) {
      case 'instagram_gradient': {
        const locGrad = ctx.createLinearGradient(0, 0, width * 0.4, 0);
        locGrad.addColorStop(0, '#f09433');
        locGrad.addColorStop(0.5, '#dc2743');
        locGrad.addColorStop(1, '#bc1888');

        const brideGrad = ctx.createLinearGradient(0, 0, width * 0.4, 0);
        brideGrad.addColorStop(0, '#dc2743');
        brideGrad.addColorStop(1, '#bc1888');

        const bannerGrad = ctx.createLinearGradient(0, height - 300, width, height - 100);
        bannerGrad.addColorStop(0, 'rgba(240, 148, 51, 0.94)');
        bannerGrad.addColorStop(0.5, 'rgba(220, 39, 67, 0.94)');
        bannerGrad.addColorStop(1, 'rgba(188, 24, 136, 0.94)');

        return {
          locFill: locGrad,
          locStroke: '#ffffff',
          locText: '#ffffff',
          brideFill: brideGrad,
          brideStroke: '#ffffff',
          brideText: '#ffffff',
          photoFill: 'rgba(24, 24, 27, 0.92)',
          photoStroke: '#ffffff',
          photoText: '#ffffff',
          bannerFill: bannerGrad,
          bannerStroke: '#ffffff',
          bannerTitle: '#ffffff',
          bannerSubtitle: '#ffffff',
          waFill: '#ffffff',
          waStroke: 'rgba(255,255,255,0.95)',
          waText: '#dc2743',
        };
      }
      case 'minimal_white': {
        return {
          locFill: 'rgba(255, 255, 255, 0.96)',
          locStroke: 'rgba(15, 23, 42, 0.15)',
          locText: '#0f172a',
          brideFill: 'rgba(255, 255, 255, 0.96)',
          brideStroke: 'rgba(225, 48, 108, 0.5)',
          brideText: '#be185d',
          photoFill: 'rgba(255, 255, 255, 0.96)',
          photoStroke: 'rgba(15, 23, 42, 0.2)',
          photoText: '#0f172a',
          bannerFill: 'rgba(255, 255, 255, 0.96)',
          bannerStroke: 'rgba(15, 23, 42, 0.14)',
          bannerTitle: '#b45309',
          bannerSubtitle: '#0f172a',
          waFill: 'rgba(16, 185, 129, 0.96)',
          waStroke: 'rgba(255, 255, 255, 0.8)',
          waText: '#ffffff',
        };
      }
      case 'neon_cyber': {
        return {
          locFill: 'rgba(2, 44, 34, 0.94)',
          locStroke: '#10b981',
          locText: '#a7f3d0',
          brideFill: 'rgba(80, 7, 36, 0.94)',
          brideStroke: '#f43f5e',
          brideText: '#fecdd3',
          photoFill: 'rgba(6, 78, 59, 0.94)',
          photoStroke: '#34d399',
          photoText: '#6ee7b7',
          bannerFill: 'rgba(2, 44, 34, 0.94)',
          bannerStroke: '#10b981',
          bannerTitle: '#34d399',
          bannerSubtitle: '#ffffff',
          waFill: 'rgba(16, 185, 129, 0.96)',
          waStroke: '#a7f3d0',
          waText: '#ffffff',
        };
      }
      case 'rose_gold': {
        return {
          locFill: 'rgba(76, 17, 48, 0.92)',
          locStroke: '#f472b6',
          locText: '#fdf2f8',
          brideFill: 'rgba(157, 23, 77, 0.94)',
          brideStroke: '#fbcfe8',
          brideText: '#ffffff',
          photoFill: 'rgba(76, 17, 48, 0.94)',
          photoStroke: '#fde047',
          photoText: '#fde047',
          bannerFill: 'rgba(76, 17, 48, 0.94)',
          bannerStroke: '#f472b6',
          bannerTitle: '#fbcfe8',
          bannerSubtitle: '#ffffff',
          waFill: 'rgba(244, 114, 182, 0.96)',
          waStroke: '#ffffff',
          waText: '#4c1130',
        };
      }
      case 'gold_luxury':
      default: {
        return {
          locFill: 'rgba(15, 23, 42, 0.92)',
          locStroke: '#eaba38',
          locText: '#ffffff',
          brideFill: 'rgba(225, 48, 108, 0.92)',
          brideStroke: '#ffffff',
          brideText: '#ffffff',
          photoFill: 'rgba(3, 43, 48, 0.94)',
          photoStroke: '#eaba38',
          photoText: '#eaba38',
          bannerFill: 'rgba(3, 43, 48, 0.92)',
          bannerStroke: '#eaba38',
          bannerTitle: '#eaba38',
          bannerSubtitle: '#ffffff',
          waFill: 'rgba(16, 185, 129, 0.96)',
          waStroke: '#ffffff',
          waText: '#ffffff',
        };
      }
    }
  };

  const pal = getThemePalette();

  // ── 1. LAYOUT: TOP_SPLIT ──
  if (layout === 'top_split') {
    // Location Tag (Top-Left)
    if (showLocationTag && locText) {
      ctx.save();
      ctx.font = 'bold 24px sans-serif';
      const locWidth = ctx.measureText(locText).width + 50;
      const locHeight = 52;
      const locX = 40;
      const locY = 60;
      drawPill(locX, locY, locWidth, locHeight, 999, pal.locFill, pal.locStroke, 2.5);
      ctx.fillStyle = pal.locText;
      ctx.textAlign = 'left';
      ctx.fillText(locText, locX + 22, locY + 35);
      ctx.restore();
    }

    // @Mentions (Top-Right)
    if (showMentions && (brideText || photoText)) {
      ctx.save();
      let mY = 60;
      const mX = width - 40;

      if (brideText) {
        const brideLabel = `👰 Bride: ${brideText}`;
        ctx.font = 'bold 22px sans-serif';
        const bWidth = ctx.measureText(brideLabel).width + 40;
        const bHeight = 46;
        const bX = mX - bWidth;
        drawPill(bX, mY, bWidth, bHeight, 999, pal.brideFill, pal.brideStroke, 2);
        ctx.fillStyle = pal.brideText;
        ctx.textAlign = 'left';
        ctx.fillText(brideLabel, bX + 20, mY + 31);
        mY += 56;
      }

      if (photoText) {
        const photoLabel = `📸 Photo: ${photoText}`;
        ctx.font = 'bold 22px sans-serif';
        const pWidth = ctx.measureText(photoLabel).width + 40;
        const pHeight = 46;
        const pX = mX - pWidth;
        drawPill(pX, mY, pWidth, pHeight, 999, pal.photoFill, pal.photoStroke, 2);
        ctx.fillStyle = pal.photoText;
        ctx.textAlign = 'left';
        ctx.fillText(photoLabel, pX + 20, mY + 31);
      }
      ctx.restore();
    }

    // Bottom Luxury Banner + WhatsApp CTA
    const badgeW = width * 0.9;
    const badgeH = 200;
    const badgeX = (width - badgeW) / 2;
    const badgeY = height - badgeH - 130;

    drawPill(badgeX, badgeY, badgeW, badgeH, 24, pal.bannerFill, pal.bannerStroke, 3.5, 'rgba(0,0,0,0.6)', 16);

    ctx.save();
    ctx.fillStyle = pal.bannerTitle;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bannerTitle, width / 2, badgeY + 42);

    ctx.fillStyle = pal.bannerSubtitle;
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(storySubtitle, width / 2, badgeY + 92);
    ctx.restore();

    if (showWhatsAppCta) {
      const waBtnW = badgeW * 0.92;
      const waBtnH = 56;
      const waBtnX = (width - waBtnW) / 2;
      const waBtnY = badgeY + badgeH - 72;

      drawPill(waBtnX, waBtnY, waBtnW, waBtnH, 14, pal.waFill, pal.waStroke, 2, 'rgba(0,0,0,0.3)', 8);

      ctx.save();
      ctx.fillStyle = pal.waText;
      ctx.font = 'bold 25px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(waCta, width / 2, waBtnY + 37);
      ctx.restore();
    }
  }

  // ── 2. LAYOUT: FLOATING_PILLS ──
  else if (layout === 'floating_pills') {
    // Location Top-Left
    if (showLocationTag && locText) {
      ctx.save();
      ctx.font = 'bold 24px sans-serif';
      const locWidth = ctx.measureText(locText).width + 50;
      const locHeight = 52;
      const locX = 40;
      const locY = 60;
      drawPill(locX, locY, locWidth, locHeight, 999, pal.locFill, pal.locStroke, 2.5);
      ctx.fillStyle = pal.locText;
      ctx.textAlign = 'left';
      ctx.fillText(locText, locX + 22, locY + 35);
      ctx.restore();
    }

    // Bride Floating pill directly under location
    if (showMentions && brideText) {
      ctx.save();
      const brideLabel = `👰 ${brideText}`;
      ctx.font = 'bold 22px sans-serif';
      const bWidth = ctx.measureText(brideLabel).width + 40;
      const bHeight = 46;
      const bX = 40;
      const bY = 124;
      drawPill(bX, bY, bWidth, bHeight, 999, pal.brideFill, pal.brideStroke, 2);
      ctx.fillStyle = pal.brideText;
      ctx.textAlign = 'left';
      ctx.fillText(brideLabel, bX + 20, bY + 31);
      ctx.restore();
    }

    // Photo Floating pill top-right
    if (showMentions && photoText) {
      ctx.save();
      const photoLabel = `📸 ${photoText}`;
      ctx.font = 'bold 22px sans-serif';
      const pWidth = ctx.measureText(photoLabel).width + 40;
      const pHeight = 46;
      const pX = width - pWidth - 40;
      const pY = 60;
      drawPill(pX, pY, pWidth, pHeight, 999, pal.photoFill, pal.photoStroke, 2);
      ctx.fillStyle = pal.photoText;
      ctx.textAlign = 'left';
      ctx.fillText(photoLabel, pX + 20, pY + 31);
      ctx.restore();
    }

    // Sleek Floating Bottom Capsule (Title Pill + WhatsApp Action Button)
    const cardW = width * 0.88;
    const cardH = 150;
    const cardX = (width - cardW) / 2;
    const cardY = height - cardH - 120;

    drawPill(cardX, cardY, cardW, cardH, 30, pal.bannerFill, pal.bannerStroke, 3, 'rgba(0,0,0,0.5)', 14);

    ctx.save();
    ctx.fillStyle = pal.bannerTitle;
    ctx.font = 'bold 23px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bannerTitle, width / 2, cardY + 38);

    ctx.fillStyle = pal.bannerSubtitle;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(storySubtitle, width / 2, cardY + 76);
    ctx.restore();

    if (showWhatsAppCta) {
      const waBtnW = cardW * 0.9;
      const waBtnH = 50;
      const waBtnX = (width - waBtnW) / 2;
      const waBtnY = cardY + cardH - 60;

      drawPill(waBtnX, waBtnY, waBtnW, waBtnH, 999, pal.waFill, pal.waStroke, 2, 'rgba(0,0,0,0.3)', 6);

      ctx.save();
      ctx.fillStyle = pal.waText;
      ctx.font = 'bold 23px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(waCta, width / 2, waBtnY + 33);
      ctx.restore();
    }
  }

  // ── 3. LAYOUT: DIAGONAL_CORNERS ──
  else if (layout === 'diagonal_corners') {
    // Location Top-Left
    if (showLocationTag && locText) {
      ctx.save();
      ctx.font = 'bold 24px sans-serif';
      const locWidth = ctx.measureText(locText).width + 50;
      const locHeight = 52;
      const locX = 40;
      const locY = 60;
      drawPill(locX, locY, locWidth, locHeight, 999, pal.locFill, pal.locStroke, 2.5);
      ctx.fillStyle = pal.locText;
      ctx.textAlign = 'left';
      ctx.fillText(locText, locX + 22, locY + 35);
      ctx.restore();
    }

    // Title Capsule Top-Right
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    const titlePillTxt = bannerTitle;
    const tWidth = ctx.measureText(titlePillTxt).width + 44;
    const tHeight = 52;
    const tX = width - tWidth - 40;
    const tY = 60;
    drawPill(tX, tY, tWidth, tHeight, 999, pal.bannerFill, pal.bannerStroke, 2.5);
    ctx.fillStyle = pal.bannerTitle;
    ctx.textAlign = 'left';
    ctx.fillText(titlePillTxt, tX + 22, tY + 34);
    ctx.restore();

    // Mentions Bottom-Left
    if (showMentions && (brideText || photoText)) {
      ctx.save();
      let mY = height - 250;
      if (brideText) {
        const brideLabel = `👰 ${brideText}`;
        ctx.font = 'bold 22px sans-serif';
        const bWidth = ctx.measureText(brideLabel).width + 40;
        const bHeight = 46;
        drawPill(40, mY, bWidth, bHeight, 999, pal.brideFill, pal.brideStroke, 2);
        ctx.fillStyle = pal.brideText;
        ctx.textAlign = 'left';
        ctx.fillText(brideLabel, 60, mY + 31);
        mY += 54;
      }
      if (photoText) {
        const photoLabel = `📸 ${photoText}`;
        ctx.font = 'bold 22px sans-serif';
        const pWidth = ctx.measureText(photoLabel).width + 40;
        const pHeight = 46;
        drawPill(40, mY, pWidth, pHeight, 999, pal.photoFill, pal.photoStroke, 2);
        ctx.fillStyle = pal.photoText;
        ctx.textAlign = 'left';
        ctx.fillText(photoLabel, 60, mY + 31);
      }
      ctx.restore();
    }

    // Subtitle & WhatsApp CTA Floating Bottom-Right
    const rightCardW = width * 0.48;
    const rightCardH = 140;
    const rightCardX = width - rightCardW - 40;
    const rightCardY = height - rightCardH - 120;

    drawPill(rightCardX, rightCardY, rightCardW, rightCardH, 20, pal.bannerFill, pal.bannerStroke, 3, 'rgba(0,0,0,0.5)', 12);

    ctx.save();
    ctx.fillStyle = pal.bannerSubtitle;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(storySubtitle.substring(0, 24), rightCardX + rightCardW / 2, rightCardY + 44);
    ctx.restore();

    if (showWhatsAppCta) {
      const waBtnW = rightCardW * 0.9;
      const waBtnH = 50;
      const waBtnX = rightCardX + (rightCardW - waBtnW) / 2;
      const waBtnY = rightCardY + rightCardH - 62;

      drawPill(waBtnX, waBtnY, waBtnW, waBtnH, 12, pal.waFill, pal.waStroke, 2, 'rgba(0,0,0,0.3)', 6);

      ctx.save();
      ctx.fillStyle = pal.waText;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💬 WhatsApp Book', waBtnX + waBtnW / 2, waBtnY + 32);
      ctx.restore();
    }
  }

  // ── 4. LAYOUT: COMPACT_HUD ──
  else {
    // Single Unified Top HUD Capsule (Location + Bride)
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    let hudText = locText || '📍 Katargam, Surat';
    if (brideText) hudText += `  •  👰 ${brideText}`;
    if (photoText && !brideText) hudText += `  •  📸 ${photoText}`;

    const hudW = Math.min(width * 0.92, ctx.measureText(hudText).width + 50);
    const hudH = 54;
    const hudX = (width - hudW) / 2;
    const hudY = 60;

    drawPill(hudX, hudY, hudW, hudH, 999, pal.locFill, pal.locStroke, 2.5, 'rgba(0,0,0,0.5)', 10);

    ctx.fillStyle = pal.locText;
    ctx.textAlign = 'center';
    ctx.fillText(hudText, width / 2, hudY + 35);
    ctx.restore();

    // Bottom Sleek VIP Banner
    const badgeW = width * 0.92;
    const badgeH = 150;
    const badgeX = (width - badgeW) / 2;
    const badgeY = height - badgeH - 120;

    drawPill(badgeX, badgeY, badgeW, badgeH, 24, pal.bannerFill, pal.bannerStroke, 3, 'rgba(0,0,0,0.5)', 14);

    ctx.save();
    ctx.fillStyle = pal.bannerTitle;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bannerTitle, width / 2, badgeY + 40);

    ctx.fillStyle = pal.bannerSubtitle;
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(storySubtitle, width / 2, badgeY + 80);
    ctx.restore();

    if (showWhatsAppCta) {
      const waBtnW = badgeW * 0.92;
      const waBtnH = 48;
      const waBtnX = (width - waBtnW) / 2;
      const waBtnY = badgeY + badgeH - 58;

      drawPill(waBtnX, waBtnY, waBtnW, waBtnH, 999, pal.waFill, pal.waStroke, 2, 'rgba(0,0,0,0.3)', 6);

      ctx.save();
      ctx.fillStyle = pal.waText;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(waCta, width / 2, waBtnY + 32);
      ctx.restore();
    }
  }
}

// ── COMPOSER: MERGE PHOTO + GOLDEN BANNER + AUDIO INTO 1080×1920 MP4/WEBM VIDEO ──
export async function composePhotoAndAudioToVideo(options: {
  imageFile: File;
  audioBuffer: AudioBuffer;
  durationSeconds?: number;
  startOffsetSeconds?: number;
  width?: number;
  height?: number;
  stickerTheme?: StickerTheme;
  stickerLayout?: StickerLayout;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerPhone?: string;
  locationTag?: string;
  brideHandle?: string;
  photographerHandle?: string;
  whatsappCtaText?: string;
  showLocationTag?: boolean;
  showMentions?: boolean;
  showWhatsAppCta?: boolean;
  showBanner?: boolean;
  onProgress?: (step: string) => void;
}): Promise<File> {
  const {
    imageFile,
    audioBuffer,
    durationSeconds = 7,
    startOffsetSeconds = 0,
    width = 1080,
    height = 1920,
    stickerTheme = 'gold_luxury',
    stickerLayout = 'top_split',
    bannerTitle = '👑 SHREE BEAUTY STUDIO • KATARGAM',
    bannerSubtitle = 'Royal Bridal Makeover in Katargam, Surat',
    bannerPhone = '9824183769',
    locationTag = '📍 Katargam, Surat',
    brideHandle = '',
    photographerHandle = '',
    whatsappCtaText = '',
    showLocationTag = true,
    showMentions = true,
    showWhatsAppCta = true,
    showBanner = true,
    onProgress,
  } = options;

  if (onProgress) onProgress('1/3: Preparing high-definition 9:16 Canvas and Audio Engine...');

  // 1. Load image onto Image element
  const imgUrl = URL.createObjectURL(imageFile);
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to decode image file'));
    img.src = imgUrl;
  });

  // 2. Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(imgUrl);
    throw new Error('Canvas 2D context unavailable');
  }

  // 3. Audio Context & MediaStream setup
  const audioCtx = getOrCreateAudioContext();
  const audioDest = audioCtx.createMediaStreamDestination();
  const audioSource = audioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(audioDest);

  // Capture canvas video stream
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  // Determine optimal recording mimeType
  let chosenMime = 'video/mp4';
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
      chosenMime = 'video/mp4;codecs=avc1,mp4a.40.2';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      chosenMime = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      chosenMime = 'video/webm;codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      chosenMime = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      chosenMime = 'video/webm';
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 3500000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<File>((resolve, reject) => {
    recorder.onstop = () => {
      URL.revokeObjectURL(imgUrl);
      const isMp4 = chosenMime.includes('mp4');
      const blob = new Blob(chunks, { type: chosenMime });
      const fileName = `story_audio_${Date.now()}.${isMp4 ? 'mp4' : 'webm'}`;
      const videoFile = new File([blob], fileName, { type: chosenMime });
      resolve(videoFile);
    };
    recorder.onerror = (err) => {
      URL.revokeObjectURL(imgUrl);
      reject(err);
    };
  });

  recorder.start(100);
  const actualOffset = Math.max(0, Math.min(startOffsetSeconds, Math.max(0, audioBuffer.duration - 0.5)));
  audioSource.start(0, actualOffset, durationSeconds);

  if (onProgress) onProgress(`2/3: Rendering ${durationSeconds}s Story with smooth motion & music...`);

  // Animation render loop (Subtle Ken-Burns Zoom + Golden Particle Shimmer + Luxury Banner)
  const startTime = performance.now();
  const totalMs = durationSeconds * 1000;

  const renderFrame = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / totalMs, 1);

    // Background fill
    ctx.fillStyle = '#031b1e';
    ctx.fillRect(0, 0, width, height);

    // Subtle Ken Burns scale (1.0 to 1.08)
    const currentScale = 1.0 + progress * 0.08;
    const drawW = width * currentScale;
    const drawH = height * currentScale;
    const offsetX = (width - drawW) / 2;
    const offsetY = (height - drawH) / 2;

    // Draw blurred backdrop
    ctx.save();
    ctx.filter = 'blur(20px) brightness(0.4)';
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.restore();

    // Draw main photo aspect-fit cover
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = width / height;
    let baseW = width;
    let baseH = height;
    if (imgRatio > canvasRatio) {
      baseH = height;
      baseW = height * imgRatio;
    } else {
      baseW = width;
      baseH = width / imgRatio;
    }
    const scaledW = baseW * currentScale;
    const scaledH = baseH * currentScale;

    ctx.drawImage(img, (width - scaledW) / 2, (height - scaledH) / 2, scaledW, scaledH);

    // Golden Sparkle Shimmer Light Effect
    ctx.save();
    const shimmerX = width * progress * 1.5 - width * 0.25;
    const shimmerGrad = ctx.createLinearGradient(shimmerX - 120, 0, shimmerX + 120, height);
    shimmerGrad.addColorStop(0, 'rgba(234, 186, 56, 0)');
    shimmerGrad.addColorStop(0.5, 'rgba(234, 186, 56, 0.12)');
    shimmerGrad.addColorStop(1, 'rgba(234, 186, 56, 0)');
    ctx.fillStyle = shimmerGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Render Dynamic Stickers & Layouts
    renderStoryStickersOnCanvas({
      ctx,
      width,
      height,
      theme: stickerTheme,
      layout: stickerLayout,
      bannerTitle,
      bannerSubtitle,
      bannerPhone,
      locationTag,
      brideHandle,
      photographerHandle,
      whatsappCtaText,
      showLocationTag,
      showMentions,
      showWhatsAppCta,
      showBanner,
    });

    if (progress < 1) {
      requestAnimationFrame(renderFrame);
    } else {
      if (onProgress) onProgress('3/3: Finalizing video encoding & audio track...');
      try {
        audioSource.stop();
      } catch {}
      recorder.stop();
    }
  };

  requestAnimationFrame(renderFrame);

  return await recordingPromise;
}
