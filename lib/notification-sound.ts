// lib/notification-sound.ts
// Studio-Grade Web Audio Notification Synthesizer (Zero External Dependencies, 100% Reliable Offline)

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

// Auto-warmup AudioContext on first user interaction so sounds play instantly on all devices
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
 * 1. LUXURY NEW BOOKING CHIME (Admin / Studio Staff)
 * Plays a signature ascending 4-tone concierge chime for incoming online bookings.
 * Tones: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz) with smooth bell harmonics.
 */
export function playNewBookingChime(force = false): void {
  if (typeof window === 'undefined') return;
  if (!force && isAudioNotificationMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0.00, duration: 0.35, gain: 0.35 }, // C5
    { freq: 659.25, time: 0.12, duration: 0.40, gain: 0.40 }, // E5
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
 * 2. HIGH-PRIORITY APPOINTMENT REMINDER SOUND (Admin / Staff)
 * Crisp, attention-grabbing 4-tone reception chime: F#5 -> A5 -> C#6 -> F#6.
 * Engineered to cut cleanly through salon ambient sounds (dryers, water, conversations).
 */
export function playAdminAppointmentReminderSound(force = false): void {
  if (typeof window === 'undefined') return;
  if (!force && isAudioNotificationMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 739.99, time: 0.00, duration: 0.35, gain: 0.42 }, // F#5
    { freq: 880.00, time: 0.11, duration: 0.38, gain: 0.48 }, // A5
    { freq: 1108.73, time: 0.22, duration: 0.45, gain: 0.52 }, // C#6
    { freq: 1479.98, time: 0.33, duration: 0.85, gain: 0.60 }, // F#6 (Sustained chime)
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

    // Resonant bell strike harmonic
    const bellHarmonic = ctx.createOscillator();
    const bellGain = ctx.createGain();

    bellHarmonic.type = 'triangle';
    bellHarmonic.frequency.setValueAtTime(freq * 2.76, startTime);

    bellGain.gain.setValueAtTime(0.001, startTime);
    bellGain.gain.linearRampToValueAtTime(gain * 0.25, startTime + 0.008);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.4);

    bellHarmonic.connect(bellGain);
    bellGain.connect(ctx.destination);

    bellHarmonic.start(startTime);
    bellHarmonic.stop(startTime + duration * 0.4);
  });
}

/**
 * 3. METALLIC GOLD PENDING BILL / BALANCE ALERT SOUND (Admin / Staff)
 * Distinctive double coin/register ding (B5 -> E6) for unpaid bills, pending balances, and bridal dues.
 */
export function playAdminPendingBillSound(force = false): void {
  if (typeof window === 'undefined') return;
  if (!force && isAudioNotificationMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 987.77, time: 0.00, duration: 0.45, gain: 0.45 },  // B5 metallic ring
    { freq: 1318.51, time: 0.12, duration: 0.75, gain: 0.55 }, // E6 gold bell ring
  ];

  notes.forEach(({ freq, time, duration, gain }) => {
    const startTime = now + time;
    const stopTime = startTime + duration;

    // Primary bell tone
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(stopTime);

    // Metallic overtone (cash clang shimmer)
    const clang = ctx.createOscillator();
    const clangGain = ctx.createGain();

    clang.type = 'triangle';
    clang.frequency.setValueAtTime(freq * 2.05, startTime);

    clangGain.gain.setValueAtTime(0.001, startTime);
    clangGain.gain.linearRampToValueAtTime(gain * 0.35, startTime + 0.005);
    clangGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

    clang.connect(clangGain);
    clangGain.connect(ctx.destination);

    clang.start(startTime);
    clang.stop(startTime + 0.18);
  });
}

/**
 * 4. SIGNATURE LUXURY SPARKLE CHIME (Customer App)
 * Delicate 5-note crystal harp arpeggio: C6 -> E6 -> G6 -> C7 -> E7 with soft sparkle shimmer.
 * Evokes beauty, indulgence, and pampering whenever client receives an app notification.
 */
export function playCustomerNotificationSound(force = false): void {
  if (typeof window === 'undefined') return;
  if (!force && isAudioNotificationMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 1046.50, time: 0.00, duration: 0.35, gain: 0.28 }, // C6
    { freq: 1318.51, time: 0.07, duration: 0.38, gain: 0.32 }, // E6
    { freq: 1567.98, time: 0.14, duration: 0.42, gain: 0.36 }, // G6
    { freq: 2093.00, time: 0.21, duration: 0.50, gain: 0.40 }, // C7
    { freq: 2637.02, time: 0.28, duration: 0.75, gain: 0.45 }, // E7 (Crystal high shimmer)
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

    // Warm sparkle overtone
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();

    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(freq * 1.5, startTime);

    shimmerGain.gain.setValueAtTime(0.001, startTime);
    shimmerGain.gain.linearRampToValueAtTime(gain * 0.18, startTime + 0.01);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.5);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);

    shimmer.start(startTime);
    shimmer.stop(startTime + duration * 0.5);
  });
}

/**
 * 5. SHORT CRISP CONFIRMATION CHIME
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

export type SalonSoundType =
  | 'new_booking'
  | 'appointment_reminder'
  | 'pending_bill'
  | 'customer_sparkle'
  | 'success';

/**
 * Unified audio player for all salon sound types
 */
export function playSalonSound(type: SalonSoundType, force = false): void {
  switch (type) {
    case 'new_booking':
      playNewBookingChime(force);
      break;
    case 'appointment_reminder':
      playAdminAppointmentReminderSound(force);
      break;
    case 'pending_bill':
      playAdminPendingBillSound(force);
      break;
    case 'customer_sparkle':
      playCustomerNotificationSound(force);
      break;
    case 'success':
      playSuccessChime(force);
      break;
  }
}
