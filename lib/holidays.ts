// lib/holidays.ts
// Utility helpers for checking Studio Holidays, Closed days, and Fully Booked dates

import { StudioHoliday } from '@/types/salon';
import { fmtDate } from './utils';

export interface HolidayCheckResult {
  isBlocked: boolean;
  holiday?: StudioHoliday;
  badgeText: string;
  userMessage: string;
}

/**
 * Checks whether a given date (YYYY-MM-DD) is marked as a Holiday, Studio Closed, or Fully Booked.
 */
export function checkDateHolidayOrBlocked(
  dateStr: string,
  holidays: StudioHoliday[] = []
): HolidayCheckResult {
  if (!dateStr || !Array.isArray(holidays) || holidays.length === 0) {
    return { isBlocked: false, badgeText: '', userMessage: '' };
  }

  const found = holidays.find((h) => {
    if (h.date === dateStr) return true;
    if (h.endDate && dateStr >= h.date && dateStr <= h.endDate) return true;
    return false;
  });

  if (!found) {
    return { isBlocked: false, badgeText: '', userMessage: '' };
  }

  const formattedDate = fmtDate(dateStr);
  let badgeText = '';
  let userMessage = '';

  switch (found.type) {
    case 'Holiday':
      badgeText = `🏖️ Studio Holiday: ${found.reason}`;
      userMessage = `🏖️ Shree Beauty Studio is closed for Holiday on ${formattedDate} (${found.reason}). New bookings cannot be accepted.`;
      break;
    case 'Full Booking':
      badgeText = `⛔ Fully Booked (Housefull): ${found.reason}`;
      userMessage = `⛔ All booking slots for ${formattedDate} are Fully Booked (${found.reason}). Please select another date.`;
      break;
    case 'Closed':
      badgeText = `🔒 Studio Closed: ${found.reason}`;
      userMessage = `🔒 Studio is closed on ${formattedDate} (${found.reason}).`;
      break;
    case 'Maintenance':
      badgeText = `🛠️ Maintenance: ${found.reason}`;
      userMessage = `🛠️ Studio is undergoing maintenance / private session on ${formattedDate} (${found.reason}).`;
      break;
    default:
      badgeText = `⚠️ Blocked Date: ${found.reason}`;
      userMessage = `⚠️ This date is blocked: ${found.reason}`;
  }

  return {
    isBlocked: true,
    holiday: found,
    badgeText,
    userMessage,
  };
}
