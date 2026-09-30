// lib/customer-session-server.ts
// Server-side session verification and cookie management for Next.js App Router
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  CUSTOMER_COOKIE_NAME,
  verifyCustomerToken,
  findCustomerById,
  toSafeCustomerProfile,
  SafeCustomerProfile,
  signCustomerToken,
} from './customer-auth';
import { Customer } from '@/types/salon';

export async function getAuthenticatedCustomer(
  req?: NextRequest | Request
): Promise<{ customer: Customer; profile: SafeCustomerProfile } | null> {
  let token: string | undefined;

  // 1. Check HTTP-only cookie
  try {
    const cookieStore = cookies();
    token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
  } catch {
    // cookies() might not be available in standard Request contexts
  }

  // 2. Check Authorization header
  if (!token && req) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) return null;

  const payload = verifyCustomerToken(token);
  if (!payload || !payload.customerId) return null;

  const { customer } = await findCustomerById(payload.customerId);
  if (!customer) return null;

  // Ensure customer is not disabled or suspended
  if (customer.status === 'suspended') {
    return null;
  }

  return {
    customer,
    profile: toSafeCustomerProfile(customer),
  };
}

export function setCustomerSessionCookie(res: NextResponse, customer: Customer): void {
  const token = signCustomerToken(customer);
  const isProd = process.env.NODE_ENV === 'production';

  res.cookies.set({
    name: CUSTOMER_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export function clearCustomerSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: CUSTOMER_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
