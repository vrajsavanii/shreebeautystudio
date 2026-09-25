// app/api/email/send/route.ts
// Handles transactional email sending - Globally Disabled
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Email sending is completely disabled
  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'Email functionality has been completely disabled.',
  });
}
