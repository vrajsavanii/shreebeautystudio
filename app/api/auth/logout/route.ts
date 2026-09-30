// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { clearCustomerSessionCookie } from '@/lib/customer-session-server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });
  clearCustomerSessionCookie(res);
  return res;
}
