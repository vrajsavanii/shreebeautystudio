// lib/whatsapp-parser.ts
import { Service, SalonData } from '@/types/salon';
import { format, addDays, nextDay, Day } from 'date-fns';

export interface ParsedBooking {
  service: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm
  customerName?: string;
  notes?: string;
}

const DAY_MAP: Record<string, Day> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function parseWhatsAppBookingMessage(
  text: string,
  services: Service[] = [],
  senderName?: string
): ParsedBooking {
  const lower = text.toLowerCase();
  const now = new Date();
  let targetDate = format(now, 'yyyy-MM-dd');
  let targetTime = '11:00';
  let matchedService = services[0]?.name || 'General Consultation';
  const notes: string[] = [];

  // 1. Service Matching
  // First look for exact or substring matches in salon services
  for (const s of services) {
    const sNameLower = s.name.toLowerCase();
    if (lower.includes(sNameLower)) {
      matchedService = s.name;
      break;
    }
  }

  // Keywords fallback if no exact service name matched
  if (matchedService === services[0]?.name) {
    if (lower.includes('facial') || lower.includes('skin')) {
      matchedService = services.find((s) => s.name.toLowerCase().includes('facial'))?.name || 'Facial / Skin Treatment';
    } else if (lower.includes('haircut') || lower.includes('hair cut') || lower.includes('trim')) {
      matchedService = services.find((s) => s.name.toLowerCase().includes('haircut'))?.name || 'Haircut';
    } else if (lower.includes('bridal') || lower.includes('wedding makeup') || lower.includes('dulhan')) {
      matchedService = services.find((s) => s.name.toLowerCase().includes('bridal'))?.name || 'Bridal Makeup';
    } else if (lower.includes('spa') || lower.includes('hair wash') || lower.includes('blow dry')) {
      matchedService = services.find((s) => s.name.toLowerCase().includes('spa') || s.name.toLowerCase().includes('wash'))?.name || 'Hair Spa';
    } else if (lower.includes('wax') || lower.includes('waxing')) {
      matchedService = services.find((s) => s.name.toLowerCase().includes('wax'))?.name || 'Waxing';
    } else if (lower.includes('makeup') || lower.includes('party makeup')) {
      matchedService = 'Makeup';
    }
  }

  // 2. Date Extraction
  if (lower.includes('today') || lower.includes('aaj')) {
    targetDate = format(now, 'yyyy-MM-dd');
  } else if (lower.includes('tomorrow') || lower.includes('kal') || lower.includes('tom')) {
    targetDate = format(addDays(now, 1), 'yyyy-MM-dd');
  } else if (lower.includes('day after tomorrow') || lower.includes('parso')) {
    targetDate = format(addDays(now, 2), 'yyyy-MM-dd');
  } else {
    // Check for day of the week
    for (const [dayName, dayIndex] of Object.entries(DAY_MAP)) {
      if (lower.includes(dayName)) {
        targetDate = format(nextDay(now, dayIndex), 'yyyy-MM-dd');
        break;
      }
    }

    // Check for explicit YYYY-MM-DD or DD/MM or DD-MM-YYYY
    const dateRegex = /\b(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?\b/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : now.getFullYear();
      targetDate = `${year}-${month}-${day}`;
    }
  }

  // 3. Time Extraction
  // Examples: 4pm, 4:30 pm, 11am, 16:00, 5:00
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i;
  const timeMatches = text.match(new RegExp(timeRegex, 'gi'));

  if (timeMatches && timeMatches.length > 0) {
    // Find the match that is most likely a time (has am/pm or contains colon)
    const validMatch = timeMatches.find((m) => /am|pm|:/i.test(m)) || timeMatches[0];
    const match = validMatch.match(timeRegex);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? match[2].padStart(2, '0') : '00';
      const meridian = match[3]?.toLowerCase();

      if (meridian?.includes('pm') && hours < 12) hours += 12;
      if (meridian?.includes('am') && hours === 12) hours = 0;

      // Reasonable salon hours check (if hour is 1..7 without am/pm, default to PM)
      if (!meridian && hours >= 1 && hours <= 7) hours += 12;

      if (hours >= 0 && hours <= 23) {
        targetTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
  } else if (lower.includes('morning') || lower.includes('subah')) {
    targetTime = '10:30';
  } else if (lower.includes('afternoon') || lower.includes('dophar')) {
    targetTime = '14:00';
  } else if (lower.includes('evening') || lower.includes('shaam') || lower.includes('night')) {
    targetTime = '17:30';
  }

  // 4. Notes
  notes.push(`WhatsApp Booking: "${text.trim()}"`);

  return {
    service: matchedService,
    date: targetDate,
    time: targetTime,
    customerName: senderName || 'WhatsApp Customer',
    notes: notes.join(' · '),
  };
}
