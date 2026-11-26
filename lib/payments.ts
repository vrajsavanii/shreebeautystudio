export const DEFAULT_PAYMENT_OPTIONS: string[] = [
  'Cash',
  'GPay UPI',
  'PhonePe UPI',
  'Bank Transfer',
  'Card',
  'HDFC Bank',
];

export const PRESET_PAYMENT_OPTIONS: string[] = [
  'Cash',
  'GPay UPI',
  'PhonePe UPI',
  'Paytm UPI',
  'Card',
  'Bank Transfer',
  'HDFC Bank',
  'ICICI Bank',
  'SBI Bank',
  'Axis Bank',
  'Cheque',
  'Wallet',
];

/**
 * Returns the deduplicated list of active payment options configured in Studio Settings,
 * falling back to DEFAULT_PAYMENT_OPTIONS only when none are configured.
 * Optionally appends extra values (such as custom bank accounts or a legacy record's mode)
 * if they are not already present.
 */
export function getPaymentOptions(
  settingsPayments?: string[] | null,
  extraInclude?: Array<string | undefined | null>
): string[] {
  const base =
    Array.isArray(settingsPayments) && settingsPayments.length > 0
      ? settingsPayments
      : DEFAULT_PAYMENT_OPTIONS;

  const result: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (raw?: string | null) => {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  };

  base.forEach(pushUnique);
  extraInclude?.forEach(pushUnique);

  return result.length > 0 ? result : [...DEFAULT_PAYMENT_OPTIONS];
}

/**
 * Returns the primary (default) payment option from Studio Settings.
 */
export function getDefaultPaymentOption(settingsPayments?: string[] | null): string {
  return getPaymentOptions(settingsPayments)[0] || 'Cash';
}

/**
 * Returns UPI / online payment options from Studio Settings for split-UPI selectors,
 * falling back to non-cash options or all configured payment options.
 */
export function getUpiOrOnlinePaymentOptions(
  settingsPayments?: string[] | null,
  extraInclude?: Array<string | undefined | null>
): string[] {
  const all = getPaymentOptions(settingsPayments, extraInclude);
  const upiMatches = all.filter((opt) => {
    const lower = opt.toLowerCase();
    return (
      lower.includes('upi') ||
      lower.includes('gpay') ||
      lower.includes('phonepe') ||
      lower.includes('paytm') ||
      lower.includes('bhim') ||
      lower.includes('qr') ||
      lower.includes('online')
    );
  });
  if (upiMatches.length > 0) return upiMatches;

  const nonCash = all.filter((opt) => !opt.toLowerCase().includes('cash'));
  return nonCash.length > 0 ? nonCash : all;
}

/**
 * Returns an intuitive icon badge for a payment option label.
 */
export function getPaymentOptionIcon(mode?: string | null): string {
  const lower = (mode || '').toLowerCase();
  if (lower.includes('cash') || lower.includes('રોકડ')) return '💵';
  if (
    lower.includes('upi') ||
    lower.includes('gpay') ||
    lower.includes('phonepe') ||
    lower.includes('paytm') ||
    lower.includes('qr')
  ) {
    return '📱';
  }
  if (lower.includes('card')) return '💳';
  if (lower.includes('cheque') || lower.includes('check')) return '📝';
  if (lower.includes('wallet')) return '👛';
  if (
    lower.includes('bank') ||
    lower.includes('hdfc') ||
    lower.includes('icici') ||
    lower.includes('sbi') ||
    lower.includes('axis') ||
    lower.includes('kotak') ||
    lower.includes('neft') ||
    lower.includes('rtgs') ||
    lower.includes('transfer')
  ) {
    return '🏦';
  }
  return '💰';
}
