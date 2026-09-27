// lib/otp-auth.ts
import crypto from 'crypto';

interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

// Global in-memory cache with fallback across requests (works serverless/edge/node)
declare global {
  // eslint-disable-next-line no-var
  var __SHREE_OTP_STORE__: Map<string, StoredOtp> | undefined;
}

const otpStore: Map<string, StoredOtp> =
  globalThis.__SHREE_OTP_STORE__ || (globalThis.__SHREE_OTP_STORE__ = new Map());

const SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXTAUTH_SECRET ||
  'shree-beauty-studio-secure-auth-secret-key-2026';

// Clean up expired OTPs periodically
function cleanupExpired() {
  const now = Date.now();
  otpStore.forEach((val, key) => {
    if (val.expiresAt < now) {
      otpStore.delete(key);
    }
  });
}

/**
 * Generate a 4-digit numeric OTP and save with 5-minute TTL
 */
export function generateAndStoreOtp(mobile: string): { otp: string; expiresAt: number } {
  cleanupExpired();
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

  // Secure 4-digit code (between 1000 and 9999)
  const otp = Math.floor(1000 + crypto.randomInt(0, 9000)).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(cleanMobile, {
    code: otp,
    expiresAt,
    attempts: 0,
    createdAt: Date.now(),
  });

  return { otp, expiresAt };
}

/**
 * Verify customer-provided OTP
 */
export function verifyOtp(mobile: string, code: string): { valid: boolean; error?: string; token?: string } {
  cleanupExpired();
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const record = otpStore.get(cleanMobile);

  if (!record) {
    return {
      valid: false,
      error: 'OTP expired or not requested. Please click "Resend OTP".',
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanMobile);
    return {
      valid: false,
      error: 'OTP has expired. Please request a new code.',
    };
  }

  if (record.attempts >= 5) {
    otpStore.delete(cleanMobile);
    return {
      valid: false,
      error: 'Too many incorrect attempts. Please request a fresh OTP.',
    };
  }

  record.attempts += 1;

  if (record.code !== code.trim()) {
    return {
      valid: false,
      error: 'Invalid OTP code. Please check and enter the 4-digit code again.',
    };
  }

  // Verification successful - consume OTP
  otpStore.delete(cleanMobile);

  // Generate 1-hour session token
  const token = createSessionToken(cleanMobile);

  return {
    valid: true,
    token,
  };
}

/**
 * Create a secure HMAC signed token for verified session
 */
export function createSessionToken(mobile: string, ttlHours = 1): string {
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const exp = Date.now() + ttlHours * 60 * 60 * 1000;
  const payload = `${cleanMobile}:${exp}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return token;
}

/**
 * Validate session token against mobile number
 */
export function verifySessionToken(mobile: string, token: string): boolean {
  if (!token) return false;
  try {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [tokenMobile, tokenExpStr, tokenSig] = parts;
    const exp = parseInt(tokenExpStr, 10);

    if (tokenMobile !== cleanMobile) return false;
    if (Date.now() > exp) return false;

    const payload = `${tokenMobile}:${tokenExpStr}`;
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(tokenSig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}
