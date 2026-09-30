// app/api/auth/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/customer-session-server';
import {
  upsertCustomerAccount,
  toSafeCustomerProfile,
  normalizeEmail,
} from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
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
    const { name, email, gender, birthday, anniversary, sagaiDate, notes, profileImage } = body;

    // Validate name
    let updatedName = customer.name;
    if (typeof name === 'string') {
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Name must be at least 2 characters.' },
          { status: 400 }
        );
      }
      updatedName = trimmed;
    }

    // Validate email
    let updatedEmail = customer.email;
    let emailVerified = customer.emailVerified;
    if (typeof email === 'string' && email.trim()) {
      const normalized = normalizeEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }
      if (normalized !== customer.email) {
        updatedEmail = normalized;
        emailVerified = false; // Requires new verification if changed
      }
    }

    const updated = await upsertCustomerAccount({
      ...customer,
      name: updatedName,
      email: updatedEmail,
      emailVerified,
      gender: gender !== undefined ? gender : customer.gender,
      birthday: birthday !== undefined ? birthday : customer.birthday,
      anniversary: anniversary !== undefined ? anniversary : customer.anniversary,
      sagaiDate: sagaiDate !== undefined ? sagaiDate : customer.sagaiDate,
      notes: notes !== undefined ? String(notes).slice(0, 500) : customer.notes,
      profileImage: profileImage !== undefined ? profileImage : customer.profileImage,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      profile: toSafeCustomerProfile(updated),
    });
  } catch (err: any) {
    console.error('Error in PATCH /api/auth/profile route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while updating profile.' },
      { status: 500 }
    );
  }
}
