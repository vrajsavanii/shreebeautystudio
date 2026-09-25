// app/api/email/test/route.ts
// EMAIL FUNCTIONALITY COMPLETELY DISABLED — No test emails will be sent.
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'Email functionality is disabled. No emails will be sent.',
  }, { status: 200 });
}
