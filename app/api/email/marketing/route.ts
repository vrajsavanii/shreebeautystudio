// app/api/email/marketing/route.ts
// Marketing emails - Globally Disabled
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: false,
    disabled: true,
    sentCount: 0,
    failedCount: 0,
    message: 'Email marketing functionality has been completely disabled.',
  });
}
