// lib/notification-sound.ts
// Studio-Grade Web Audio Notification Synthesizer (Zero External Dependencies, 100% Reliable)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Auto-warmup AudioContext on first user interaction so sounds play instantly
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

export function isAudioNotificationMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('shree_admin_sound_muted') === 'true';
}

export function setAudioNotificationMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('shree_admin_sound_muted', muted ? 'true' : 'false');
}

/**
 * Plays a luxury ascending 4-tone concierge chime for new incoming appointments & booking requests.
 * Tones: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz) with smooth bell harmonics & exponential decay.
 */
export function playNewBookingChime(force = false): void {
  if (typeof window === 'undefined') return;
  if (!force && isAudioNotificationMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0.0, duration: 0.35, gain: 0.35 }, // C5
    { freq: 659.25, time: 0.12, duration: 0.4, gain: 0.4 },  // E5
    { freq: 783.99, time: 0.24, duration: 0.45, gain: 0.45 }, // G5
    { freq: 1046.50, time: 0.36, duration: 0.85, gain: 0.55 }, // C6 (Sustained bell)
  ];

  notes.forEach(({ freq, time, duration, gain }) => {
    const startTime = now + time;
    const stopTime = startTime + duration;

    // Primary Fundamental Tone
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(stopTime);

    // Harmonic Overtone (shimmer warmth)
    const overtone = ctx.createOscillator();
    const overGain = ctx.createGain();

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, startTime);

    overGain.gain.setValueAtTime(0.001, startTime);
    overGain.gain.linearRampToValueAtTime(gain * 0.2, startTime + 0.015);
    overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6);

    overtone.connect(overGain);
    overGain.connect(ctx.destination);

    overtone.start(startTime);
    overtone.stop(startTime + duration * 0.6);
  });
}

/**
 * Short crisp positive confirmation chime
 */
export function playSuccessChime(force = false): void {
  if (typeof window === 'undefined') return;
  if (!force && isAudioNotificationMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 659.25, time: 0.0, duration: 0.25, gain: 0.3 },
    { freq: 880.00, time: 0.1, duration: 0.5, gain: 0.4 },
  ];

  notes.forEach(({ freq, time, duration, gain }) => {
    const startTime = now + time;
    const stopTime = startTime + duration;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(stopTime);
  });
}
