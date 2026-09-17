import { NextRequest } from 'next/server';
import { GET as handler } from '@/app/api/calendar/add/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handler(req);
}
