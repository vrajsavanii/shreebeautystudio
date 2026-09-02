// lib/auto-wish.ts
import { Customer, SalonData, SalonSettings } from '@/types/salon';
import { todayISO, fmtDate } from './utils';
import {
  birthdayMessage,
  sagaiAnniversaryMessage,
  anniversaryMessage,
  sendWhatsAppDirectMessage,
} from './whatsapp';
import { scheduleSave } from './sync';

export interface TodaysCelebrant {
  customer: Customer;
  type: 'birthday' | 'sagai' | 'anniversary';
  title: string;
  yearsCount?: number;
  date: string;
  alreadyWished: boolean;
  message: string;
  key: string;
}

/**
 * Checks whether two ISO date strings share the same Month and Day (MM-DD)
 */
export function isSameDayAndMonth(isoDateStr?: string, targetDate: string = todayISO()): boolean {
  if (!isoDateStr || isoDateStr.length < 10) return false;
  try {
    const sourceMD = isoDateStr.slice(5, 10); // MM-DD
    const targetMD = targetDate.slice(5, 10); // MM-DD
    return sourceMD === targetMD;
  } catch {
    return false;
  }
}

/**
 * Calculates years passed (e.g. 5th Anniversary)
 */
export function getYearsPassed(isoDateStr?: string, targetDate: string = todayISO()): number {
  if (!isoDateStr || isoDateStr.length < 4) return 0;
  try {
    const sourceYear = parseInt(isoDateStr.slice(0, 4), 10);
    const targetYear = parseInt(targetDate.slice(0, 4), 10);
    return Math.max(1, targetYear - sourceYear);
  } catch {
    return 1;
  }
}

/**
 * Scan all customers and retrieve all birthdays, sagai, and wedding anniversaries occurring today
 */
export function getTodaysCelebrants(
  customers: Customer[] = [],
  settings?: SalonSettings,
  targetDate: string = todayISO()
): TodaysCelebrant[] {
  const celebrants: TodaysCelebrant[] = [];
  const salonName = settings?.salon || 'Shree Beauty Studio';
  const bdayDisc = settings?.birthdayWishDiscount || 15;
  const currentYear = targetDate.slice(0, 4);

  for (const c of customers) {
    if (!c.mobile) continue;

    const wishedMap = c.lastWishedDates || {};

    // 1. Birthday
    if (c.birthday && isSameDayAndMonth(c.birthday, targetDate)) {
      const bdayKey = `birthday_${currentYear}`;
      const alreadyWished = wishedMap[bdayKey] === targetDate;
      const msg =
        settings?.birthdayWishTemplate?.replace('{name}', c.name)?.replace('{salon}', salonName) ||
        birthdayMessage(c.name, salonName, bdayDisc);

      celebrants.push({
        customer: c,
        type: 'birthday',
        title: `🎂 Birthday — ${c.name}`,
        date: c.birthday,
        alreadyWished,
        message: msg,
        key: bdayKey,
      });
    }

    // 2. Sagai / Engagement Anniversary
    const sagai = c.sagaiDate || c.engagementDate;
    if (sagai && isSameDayAndMonth(sagai, targetDate)) {
      const sagaiKey = `sagai_${currentYear}`;
      const alreadyWished = wishedMap[sagaiKey] === targetDate;
      const years = getYearsPassed(sagai, targetDate);
      const msg =
        settings?.sagaiWishTemplate?.replace('{name}', c.name)?.replace('{salon}', salonName) ||
        sagaiAnniversaryMessage(c.name, salonName);

      celebrants.push({
        customer: c,
        type: 'sagai',
        title: `💍 Sagai Anniversary (${years} Year${years > 1 ? 's' : ''}) — ${c.name}`,
        yearsCount: years,
        date: sagai,
        alreadyWished,
        message: msg,
        key: sagaiKey,
      });
    }

    // 3. Wedding Anniversary
    if (c.anniversary && isSameDayAndMonth(c.anniversary, targetDate)) {
      const annivKey = `anniversary_${currentYear}`;
      const alreadyWished = wishedMap[annivKey] === targetDate;
      const years = getYearsPassed(c.anniversary, targetDate);
      const msg =
        settings?.anniversaryWishTemplate?.replace('{name}', c.name)?.replace('{salon}', salonName) ||
        anniversaryMessage(c.name, salonName);

      celebrants.push({
        customer: c,
        type: 'anniversary',
        title: `👰 Wedding Anniversary (${years} Year${years > 1 ? 's' : ''}) — ${c.name}`,
        yearsCount: years,
        date: c.anniversary,
        alreadyWished,
        message: msg,
        key: annivKey,
      });
    }
  }

  return celebrants;
}

/**
 * Send WhatsApp wish to a single celebrant and mark them as wished for today
 */
export async function sendCelebrantWish(
  celebrant: TodaysCelebrant,
  settings?: SalonSettings,
  updateData?: (fn: (d: SalonData) => SalonData) => void
): Promise<{ success: boolean; method: string; message: string }> {
  const result = await sendWhatsAppDirectMessage(
    celebrant.customer.mobile,
    celebrant.message,
    settings
  );

  if (updateData) {
    const today = todayISO();
    updateData((d) => ({
      ...d,
      customers: (d.customers || []).map((c) => {
        if (c.id === celebrant.customer.id || c.mobile === celebrant.customer.mobile) {
          return {
            ...c,
            lastWishedDates: {
              ...(c.lastWishedDates || {}),
              [celebrant.key]: today,
            },
          };
        }
        return c;
      }),
    }));
    scheduleSave();
  }

  return result;
}

/**
 * Send WhatsApp wishes to all unwished celebrants today
 */
export async function sendAllTodaysWishes(
  celebrants: TodaysCelebrant[],
  settings?: SalonSettings,
  updateData?: (fn: (d: SalonData) => SalonData) => void
): Promise<{ sentCount: number; method: string }> {
  let count = 0;
  const unwished = celebrants.filter((c) => !c.alreadyWished);

  for (const cel of unwished) {
    await sendCelebrantWish(cel, settings, updateData);
    count++;
    // Small pause between multiple sends
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return {
    sentCount: count,
    method: settings?.whatsappPhoneId && settings?.whatsappAccessToken ? 'cloud_api' : 'whatsapp_web',
  };
}
