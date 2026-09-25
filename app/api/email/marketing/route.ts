// app/api/email/marketing/route.ts
// EMAIL FUNCTIONALITY COMPLETELY DISABLED — No marketing emails will be sent to anyone.
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'Email marketing functionality is disabled. No emails will be sent.',
  }, { status: 200 });
}
