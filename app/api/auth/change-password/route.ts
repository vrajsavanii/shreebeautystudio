// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer, setCustomerSessionCookie } from '@/lib/customer-session-server';
import {
  verifyPassword,
  hashPassword,
  upsertCustomerAccount,
} from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { customer } = auth;
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // If account already has a password set, verify current password
    if (customer.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required.' },
          { status: 400 }
        );
      }

      const isValid = await verifyPassword(currentPassword, customer.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Incorrect current password. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Hash new password and update customer
    const passwordHash = await hashPassword(newPassword);
    const updated = await upsertCustomerAccount({
      ...customer,
      passwordHash,
      updatedAt: new Date().toISOString(),
    });

    const res = NextResponse.json({
      success: true,
      message: 'Password changed successfully!',
    });

    setCustomerSessionCookie(res, updated);
    return res;
  } catch (err: any) {
    console.error('Error in change-password route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while updating password.' },
      { status: 500 }
    );
  }
}
