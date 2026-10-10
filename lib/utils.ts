// lib/utils.ts
import { format, parseISO } from 'date-fns';

export const money = (n: number | string | undefined | null): string =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const fmtDate = (d?: string | null): string => {
  if (!d) return '';
  try {
    return format(parseISO(d), 'dd MMM yyyy');
  } catch {
    return d;
  }
};

export const fmtDateTime = (d?: string | null, t?: string): string => {
  if (!d) return '';
  try {
    return format(parseISO(d), 'dd MMM') + (t ? ` ${t}` : '');
  } catch {
    return `${d}${t ? ` ${t}` : ''}`;
  }
};

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string)
  );

export const clsx = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');

export const indianPhone = (mobile: string): string => {
  const digits = mobile.replace(/\D/g, '').slice(-10);
  return digits;
};

export const formatPhone = (mobile: string): string => {
  const d = indianPhone(mobile);
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return mobile;
};

/**
 * Format customer name (stripping any legacy Z26 running year prefixes)
 */
export const formatCustomerContactName = (name: string): string => {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  // Strip any existing Zyy prefix if present (e.g. "Z26 NAME" -> "NAME")
  return trimmed.replace(/^Z\d{2}\s+/i, '');
};

/**
 * Capitalizes the first character of each word (Title Case) as user types a name.
 * e.g. "priya" -> "Priya"
 *      "priya patel" -> "Priya Patel"
 * Preserves trailing spaces during typing.
 */
export const autoCapitalizeName = (input: string): string => {
  if (!input) return '';
  return input.replace(/(^|[\s\.\-])([a-z])/g, (_, boundary, char) => `${boundary}${char.toUpperCase()}`);
};

/**
 * Converts a 12-hour (e.g. "10:30 AM", "02:00 PM") or 24-hour ("14:30") time string to minutes from midnight (0-1439).
 */
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!ampmMatch) return 0;

  let hours = parseInt(ampmMatch[1], 10);
  const minutes = parseInt(ampmMatch[2], 10) || 0;
  const ampm = ampmMatch[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

/**
 * Checks if a given time on a given date is in the past compared to live local time.
 * If date is before today -> true (past).
 * If date is after today -> false (future).
 * If date is today -> true if time is before current time (+ optional buffer).
 */
export const isPastTimeForDate = (
  dateStr: string,
  timeStr: string,
  bufferMinutes: number = 0
): boolean => {
  if (!dateStr || !timeStr) return false;
  const today = todayISO();
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = timeToMinutes(timeStr);

  return slotMinutes < currentMinutes + bufferMinutes;
};

/**
 * Returns current time in 24-hour "HH:mm" format rounded up to the nearest interval (e.g. 15 or 30 min).
 */
export const getCurrentRoundedTimeHHMM = (intervalMinutes: number = 15): string => {
  const now = new Date();
  let totalMinutes = now.getHours() * 60 + now.getMinutes();

  // Round up to next interval
  const remainder = totalMinutes % intervalMinutes;
  if (remainder !== 0) {
    totalMinutes += intervalMinutes - remainder;
  }

  // If rounded time exceeds day end (23:59), fallback to studio standard opening time
  if (totalMinutes >= 24 * 60) {
    return '10:00';
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Given a list of slots and a date, returns the first future available slot.
 */
export const getFirstFutureSlot = (dateStr: string, slots: string[]): string => {
  if (!slots.length) return '';
  const firstValid = slots.find((s) => !isPastTimeForDate(dateStr, s));
  return firstValid || '';
};

/**
 * 15-minute time slots covering 24 hours (:00, :15, :30, :45 from 06:00 to 23:45 / full day)
 */
export const FIFTEEN_MIN_TIME_SLOTS: { value: string; label: string }[] = Array.from({ length: 96 }, (_, i) => {
  const totalMinutes = i * 15;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const label = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  return { value: val, label };
});

import { ServicePricingType } from '@/types/salon';

/**
 * Categorizes service pricing basis:
 * - Fixed: exact fixed price (e.g. Eyebrow, Threading, Waxing)
 * - Hair services: priced according to Hair Length & Density
 * - Skin services: priced according to Skin Type & Condition
 * - Starting rate: general starting price
 */
export interface ServicePricingBasis {
  type: 'hair' | 'skin' | 'general' | 'fixed';
  basis: 'hair' | 'skin' | 'general' | 'fixed';
  pricingType: ServicePricingType;
  isFixed: boolean;
  label: string;
  badge: string;
  shortBadge: string;
  badgeShort: string;
  pricePrefix: string;
  priceSuffix: string;
  gujaratiNote: string;
  noteGuj: string;
}

export function getServicePricingBasis(
  category?: string,
  name?: string,
  explicitPricingType?: ServicePricingType
): ServicePricingBasis {
  // If explicitly selected in service editor
  if (explicitPricingType === 'fixed') {
    return {
      type: 'fixed',
      basis: 'fixed',
      pricingType: 'fixed',
      isFixed: true,
      label: 'Fixed Price',
      badge: '🏷️ Fixed Price',
      shortBadge: 'Fixed Price',
      badgeShort: 'Fixed Price',
      pricePrefix: 'Fixed',
      priceSuffix: '',
      gujaratiNote: 'Fixed Price',
      noteGuj: 'Fixed Price',
    };
  }

  if (explicitPricingType === 'hair_length') {
    return {
      type: 'hair',
      basis: 'hair',
      pricingType: 'hair_length',
      isFixed: false,
      label: 'According to Hair Length & Density',
      badge: '💇‍♀️ According to Hair Length',
      shortBadge: 'According to Hair Length',
      badgeShort: 'According to Hair Length',
      pricePrefix: 'Starts From',
      priceSuffix: '+',
      gujaratiNote: 'According to Hair Length & Density',
      noteGuj: 'According to Hair Length & Density',
    };
  }

  if (explicitPricingType === 'skin_type') {
    return {
      type: 'skin',
      basis: 'skin',
      pricingType: 'skin_type',
      isFixed: false,
      label: 'According to Skin Type & Condition',
      badge: '✨ According to Skin Type',
      shortBadge: 'According to Skin Type',
      badgeShort: 'According to Skin Type',
      pricePrefix: 'Starts From',
      priceSuffix: '+',
      gujaratiNote: 'According to Skin Type & Condition',
      noteGuj: 'According to Skin Type & Condition',
    };
  }

  if (explicitPricingType === 'starting') {
    return {
      type: 'general',
      basis: 'general',
      pricingType: 'starting',
      isFixed: false,
      label: 'Starting Price',
      badge: '🌸 Starting Rate',
      shortBadge: 'Starting Price',
      badgeShort: 'Starting Price',
      pricePrefix: 'Starts From',
      priceSuffix: '+',
      gujaratiNote: 'According to Service Selection',
      noteGuj: 'According to Service Selection',
    };
  }

  // Automatic deduction from category / name when pricingType is not yet explicitly set
  const lowerCat = (category || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();

  // Threading / Waxing / Eyebrow / Lip / Chin are explicitly Fixed by default
  const isFixedDefault =
    lowerCat.includes('threading') ||
    lowerCat.includes('wax') ||
    lowerName.includes('threading') ||
    lowerName.includes('eyebrow') ||
    lowerName.includes('upper lip') ||
    lowerName.includes('forehead') ||
    lowerName.includes('chin') ||
    lowerName.includes('draping') ||
    lowerName.includes('saree');

  if (isFixedDefault) {
    return {
      type: 'fixed',
      basis: 'fixed',
      pricingType: 'fixed',
      isFixed: true,
      label: 'Fixed Price',
      badge: '🏷️ Fixed Price',
      shortBadge: 'Fixed Price',
      badgeShort: 'Fixed Price',
      pricePrefix: 'Fixed',
      priceSuffix: '',
      gujaratiNote: 'Fixed Price',
      noteGuj: 'Fixed Price',
    };
  }

  const isHair =
    lowerCat.includes('hair') ||
    lowerName.includes('hair') ||
    lowerName.includes('keratin') ||
    lowerName.includes('botox') ||
    lowerName.includes('smoothening') ||
    lowerName.includes('rebonding') ||
    lowerName.includes('color') ||
    lowerName.includes('spa') ||
    lowerName.includes('nanoplastia') ||
    lowerName.includes('straightening');

  if (isHair) {
    return {
      type: 'hair',
      basis: 'hair',
      pricingType: 'hair_length',
      isFixed: false,
      label: 'According to Hair Length & Density',
      badge: '💇‍♀️ According to Hair Length',
      shortBadge: 'According to Hair Length',
      badgeShort: 'According to Hair Length',
      pricePrefix: 'Starts From',
      priceSuffix: '+',
      gujaratiNote: 'According to Hair Length & Density',
      noteGuj: 'According to Hair Length & Density',
    };
  }

  const isSkin =
    lowerCat.includes('skin') ||
    lowerCat.includes('facial') ||
    lowerName.includes('facial') ||
    lowerName.includes('cleanup') ||
    lowerName.includes('glow') ||
    lowerName.includes('d-tan') ||
    lowerName.includes('o3+') ||
    lowerName.includes('hydra') ||
    lowerName.includes('acne') ||
    lowerName.includes('peel');

  if (isSkin) {
    return {
      type: 'skin',
      basis: 'skin',
      pricingType: 'skin_type',
      isFixed: false,
      label: 'According to Skin Type & Condition',
      badge: '✨ According to Skin Type',
      shortBadge: 'According to Skin Type',
      badgeShort: 'According to Skin Type',
      pricePrefix: 'Starts From',
      priceSuffix: '+',
      gujaratiNote: 'According to Skin Type & Condition',
      noteGuj: 'According to Skin Type & Condition',
    };
  }

  return {
    type: 'general',
    basis: 'general',
    pricingType: 'starting',
    isFixed: false,
    label: 'Starting Price',
    badge: '🌸 Starting Rate',
    shortBadge: 'Starting Price',
    badgeShort: 'Starting Price',
    pricePrefix: 'Starts From',
    priceSuffix: '+',
    gujaratiNote: 'According to Service Selection',
    noteGuj: 'According to Service Selection',
  };
}

