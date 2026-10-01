// lib/customer-auth.ts
// Production-Ready Customer Authentication & Identity Management for Shree Beauty Studio
import crypto from 'crypto';
// @ts-ignore
import bcrypt from 'bcryptjs';
// @ts-ignore
import jwt from 'jsonwebtoken';
import { getSupabaseAdmin } from './supabase-server';
import { SalonData, Customer, CustomerAddress } from '@/types/salon';
import { DEFAULT_DATA } from './store';
import { uid } from './utils';

const JWT_SECRET =
  process.env.CUSTOMER_JWT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXTAUTH_SECRET ||
  'shree-customer-auth-production-jwt-key-2026-katargam-surat';

export const CUSTOMER_COOKIE_NAME = 'shree_customer_token';

// ── In-Memory OTP Store with Serverless Fallback ──────────────────────────────
interface StoredAuthOtp {
  code: string;
  target: string; // phone or email
  type: 'mobile' | 'email';
  purpose: 'signup' | 'login' | 'reset';
  expiresAt: number;
  attempts: number;
  createdAt: number;
  verified?: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __SHREE_CUSTOMER_OTP_STORE__: Map<string, StoredAuthOtp> | undefined;
}

const otpStore: Map<string, StoredAuthOtp> =
  globalThis.__SHREE_CUSTOMER_OTP_STORE__ || (globalThis.__SHREE_CUSTOMER_OTP_STORE__ = new Map());

function cleanupExpiredOtps() {
  const now = Date.now();
  otpStore.forEach((v, k) => {
    if (v.expiresAt < now) {
      otpStore.delete(k);
    }
  });
}

// ── Normalization Helpers ───────────────────────────────────────────────────
export function normalizeMobile(phone: string): { clean: string; e164: string } {
  const digits = (phone || '').replace(/\D/g, '');
  const clean = digits.slice(-10); // Standard 10-digit Indian mobile
  const e164 = clean.length === 10 ? `+91${clean}` : `+${digits}`;
  return { clean, e164 };
}

export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

// ── Password Hashing ────────────────────────────────────────────────────────
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
}

// ── OTP Management ──────────────────────────────────────────────────────────
export function generateAuthOtp(
  target: string,
  type: 'mobile' | 'email',
  purpose: 'signup' | 'login' | 'reset' = 'signup'
): { otp: string; expiresAt: number; cooldownSeconds: number } {
  cleanupExpiredOtps();
  const normalizedTarget = type === 'mobile' ? normalizeMobile(target).clean : normalizeEmail(target);
  const key = `${type}:${purpose}:${normalizedTarget}`;

  // Cooldown check: prevent re-requesting within 30 seconds
  const existing = otpStore.get(key);
  const now = Date.now();
  if (existing && now - existing.createdAt < 30 * 1000) {
    const remaining = Math.ceil((30 * 1000 - (now - existing.createdAt)) / 1000);
    throw new Error(`Please wait ${remaining} seconds before requesting a new verification code.`);
  }

  // Generate 6-digit secure numeric code (100000 - 999999)
  const otp = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes validity

  otpStore.set(key, {
    code: otp,
    target: normalizedTarget,
    type,
    purpose,
    expiresAt,
    attempts: 0,
    createdAt: now,
  });

  return { otp, expiresAt, cooldownSeconds: 30 };
}

export function verifyAuthOtp(
  target: string,
  type: 'mobile' | 'email',
  purpose: 'signup' | 'login' | 'reset',
  code: string
): { valid: boolean; error?: string } {
  cleanupExpiredOtps();
  const normalizedTarget = type === 'mobile' ? normalizeMobile(target).clean : normalizeEmail(target);
  const key = `${type}:${purpose}:${normalizedTarget}`;
  const record = otpStore.get(key);

  if (!record) {
    return { valid: false, error: 'Verification code expired or not requested. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return { valid: false, error: 'Verification code has expired. Please request a fresh code.' };
  }

  if (record.attempts >= 5) {
    otpStore.delete(key);
    return { valid: false, error: 'Too many incorrect attempts. Please request a fresh code.' };
  }

  record.attempts += 1;

  if (record.code !== (code || '').trim()) {
    return { valid: false, error: 'Invalid verification code. Please check and enter the 6-digit code again.' };
  }

  // Mark verified and delete OTP
  otpStore.delete(key);
  return { valid: true };
}

// ── JWT Session Management ──────────────────────────────────────────────────
export interface CustomerJwtPayload {
  customerId: string;
  name: string;
  mobile: string;
  email?: string;
  status: string;
  iat?: number;
  exp?: number;
}

export function signCustomerToken(customer: Customer): string {
  const payload: CustomerJwtPayload = {
    customerId: customer.id,
    name: customer.name,
    mobile: normalizeMobile(customer.mobile).clean,
    email: customer.email ? normalizeEmail(customer.email) : undefined,
    status: customer.status || 'active',
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyCustomerToken(token: string): CustomerJwtPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CustomerJwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

// ── Database Access & Salon State Sync ──────────────────────────────────────
interface CachedCloudState {
  id?: string;
  owner_id?: string;
  data: SalonData;
  timestamp: number;
}

let cachedCloudState: CachedCloudState | null = null;
const CLOUD_CACHE_TTL = 3000; // 3 seconds in-memory TTL

export async function getSalonDataFromCloud(options?: { forceRefresh?: boolean }): Promise<{ id?: string; owner_id?: string; data: SalonData }> {
  const now = Date.now();
  if (!options?.forceRefresh && cachedCloudState && now - cachedCloudState.timestamp < CLOUD_CACHE_TTL) {
    return {
      id: cachedCloudState.id,
      owner_id: cachedCloudState.owner_id,
      data: cachedCloudState.data,
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from('salon_state')
      .select('id, owner_id, data')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[CustomerAuth] Supabase select error, using DEFAULT_DATA:', error.message);
      return { data: { ...DEFAULT_DATA } };
    }

    if (!rows || rows.length === 0 || !rows[0].data) {
      return { data: { ...DEFAULT_DATA } };
    }

    const result = {
      id: rows[0].id,
      owner_id: rows[0].owner_id,
      data: rows[0].data as SalonData,
    };
    cachedCloudState = { ...result, timestamp: Date.now() };
    return result;
  } catch (err: any) {
    console.error('[CustomerAuth] Exception fetching salon state:', err);
    return { data: { ...DEFAULT_DATA } };
  }
}

export async function saveSalonDataToCloud(data: SalonData, existingId?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    cachedCloudState = {
      id: existingId || cachedCloudState?.id,
      owner_id: cachedCloudState?.owner_id,
      data,
      timestamp: Date.now(),
    };

    if (existingId) {
      const { error } = await supabase
        .from('salon_state')
        .update({ data, updated_at: now })
        .eq('id', existingId);

      if (!error) return true;
    }

    // Upsert fallback
    const { error: upsertErr } = await supabase
      .from('salon_state')
      .upsert({ data, updated_at: now });

    if (upsertErr) {
      console.error('[CustomerAuth] Error saving updated salon_state:', upsertErr);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[CustomerAuth] Exception saving salon state:', err);
    return false;
  }
}

// ── Customer Lookup & Mutation ──────────────────────────────────────────────
export async function findCustomerByIdentifier(identifier: string): Promise<{ customer: Customer | null; salonData: SalonData; recordId?: string }> {
  const { id: recordId, data: salonData } = await getSalonDataFromCloud();
  const trimmed = (identifier || '').trim();
  const cleanMobile = normalizeMobile(trimmed).clean;
  const cleanEmail = normalizeEmail(trimmed);

  const customers = salonData.customers || [];
  const found = customers.find((c) => {
    const cMob = normalizeMobile(c.mobile || '').clean;
    const cEmail = c.email ? normalizeEmail(c.email) : '';

    if (cleanMobile && cleanMobile.length === 10 && cMob === cleanMobile) return true;
    if (cleanEmail && cleanEmail.includes('@') && cEmail === cleanEmail) return true;
    return false;
  });

  return { customer: found || null, salonData, recordId };
}

export async function findCustomerById(id: string): Promise<{ customer: Customer | null; salonData: SalonData; recordId?: string }> {
  const { id: recordId, data: salonData } = await getSalonDataFromCloud();
  const customers = salonData.customers || [];
  const found = customers.find((c) => c.id === id);
  return { customer: found || null, salonData, recordId };
}

export async function upsertCustomerAccount(customerData: Partial<Customer> & { name: string; mobile: string }): Promise<Customer> {
  const { id: recordId, data: salonData } = await getSalonDataFromCloud();
  const customers = [...(salonData.customers || [])];
  const cleanMobile = normalizeMobile(customerData.mobile).clean;
  const cleanEmail = customerData.email ? normalizeEmail(customerData.email) : undefined;

  const existingIdx = customers.findIndex((c) => {
    if (customerData.id && c.id === customerData.id) return true;
    const cMob = normalizeMobile(c.mobile || '').clean;
    if (cleanMobile && cleanMobile.length === 10 && cMob === cleanMobile) return true;
    if (cleanEmail && c.email && normalizeEmail(c.email) === cleanEmail) return true;
    return false;
  });

  const now = new Date().toISOString();
  let savedCustomer: Customer;

  if (existingIdx >= 0) {
    // Update existing customer profile safely
    savedCustomer = {
      ...customers[existingIdx],
      ...customerData,
      id: customers[existingIdx].id || customerData.id || `cust_${uid()}`,
      mobile: cleanMobile,
      email: cleanEmail || customers[existingIdx].email,
      name: customerData.name || customers[existingIdx].name,
      updatedAt: now,
    };
    customers[existingIdx] = savedCustomer;
  } else {
    // New customer registration
    savedCustomer = {
      id: customerData.id || `cust_${uid()}`,
      name: customerData.name.trim(),
      mobile: cleanMobile,
      email: cleanEmail,
      status: customerData.status || 'active',
      phoneVerified: customerData.phoneVerified ?? false,
      emailVerified: customerData.emailVerified ?? false,
      passwordHash: customerData.passwordHash,
      profileImage: customerData.profileImage,
      gender: customerData.gender,
      birthday: customerData.birthday,
      anniversary: customerData.anniversary,
      sagaiDate: customerData.sagaiDate,
      addresses: customerData.addresses || [],
      loyaltyPoints: customerData.loyaltyPoints || 0,
      walletBalance: customerData.walletBalance || 0,
      totalVisits: 0,
      totalSpend: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };
    customers.unshift(savedCustomer);
  }

  // Persist updated customers array to cloud state
  const updatedSalonData: SalonData = {
    ...salonData,
    customers,
  };

  await saveSalonDataToCloud(updatedSalonData, recordId);
  return savedCustomer;
}

export interface SafeCustomerProfile {
  id: string;
  name: string;
  mobile: string;
  phone: string;
  formattedMobile: string;
  email?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  status: 'active' | 'pending' | 'suspended';
  profileImage?: string;
  gender?: string;
  birthday?: string;
  anniversary?: string;
  sagaiDate?: string;
  addresses: CustomerAddress[];
  loyaltyPoints: number;
  walletBalance: number;
  totalVisits: number;
  totalSpend: number;
  lastVisit?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export function toSafeCustomerProfile(c: Customer): SafeCustomerProfile {
  const cleanMob = normalizeMobile(c.mobile || '').clean;
  const formatted = cleanMob.length === 10
    ? `+91 ${cleanMob.slice(0, 5)} ${cleanMob.slice(5)}`
    : c.mobile || '';

  return {
    id: c.id,
    name: c.name,
    mobile: cleanMob,
    phone: cleanMob,
    formattedMobile: formatted,
    email: c.email ? normalizeEmail(c.email) : undefined,
    phoneVerified: !!c.phoneVerified,
    emailVerified: !!c.emailVerified,
    status: c.status || 'active',
    profileImage: c.profileImage,
    gender: c.gender,
    birthday: c.birthday,
    anniversary: c.anniversary,
    sagaiDate: c.sagaiDate || c.engagementDate,
    addresses: Array.isArray(c.addresses) ? c.addresses : [],
    loyaltyPoints: c.loyaltyPoints || 0,
    walletBalance: c.walletBalance || 0,
    totalVisits: c.totalVisits || 0,
    totalSpend: c.totalSpend || 0,
    lastVisit: c.lastVisit,
    createdAt: c.createdAt,
    lastLoginAt: c.lastLoginAt,
  };
}
