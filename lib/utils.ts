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
 * Format customer name with running year code prefix for contact list
 * Example for year 2026: "Amita" -> "Z26 AMITA"
 */
export const formatCustomerContactName = (name: string, dateStr?: string): string => {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  // If already starts with Z prefix (e.g. Z26 AMITA or Z25 PUJA), format prefix + uppercase name
  if (/^Z\d{2}\s/i.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    const prefix = parts[0].toUpperCase();
    const rest = parts.slice(1).join(' ').toUpperCase();
    return `${prefix} ${rest}`;
  }

  const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const yy = String(year).slice(-2);
  return `Z${yy} ${trimmed.toUpperCase()}`;
};
