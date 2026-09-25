// app/api/email/test/route.ts
// Test emails - Globally Disabled
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'Email functionality has been completely disabled.',
  });
}
