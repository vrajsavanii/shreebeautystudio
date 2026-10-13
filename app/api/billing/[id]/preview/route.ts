// app/api/billing/[id]/preview/route.ts
// Returns HTML of the invoice receipt for instant browser preview / printing
import { NextRequest, NextResponse } from 'next/server';
import { buildReceiptHtml } from '@/lib/invoice-receipt-html';
import { Invoice, SalonData } from '@/types/salon';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';

const SAMPLE_INVOICE_105: Invoice = {
  id: '105',
  no: '105',
  date: '2026-09-11',
  customer: 'niti',
  mobile: '9316531885',
  eventDate: '2026-12-14',
  venue: '',
  lines: [
    {
      type: 'S',
      name: 'Make Up',
      qty: 1,
      price: 35000,
      discount: 0,
      discountType: '%',
    },
  ],
  subtotal: 35000,
  discount: 0,
  total: 35000,
  advance: 500,
  paid: 34500,
  balance: 34500,
  mode: 'Cash',
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  let invoice: Invoice = SAMPLE_INVOICE_105;
  let salonData: SalonData | undefined;

  if (id !== '105' && id !== 'test' && id !== 'sample') {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/salon_sync?select=*&limit=1`, {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          salonData = rows[0].data as SalonData;
          const invoices = salonData?.invoices || [];
          const cleanTargetId = id.trim().toLowerCase();
          const match = invoices.find(
            (inv) =>
              inv.id?.toLowerCase() === cleanTargetId ||
              inv.no?.toLowerCase() === cleanTargetId ||
              inv.no?.toLowerCase() === `inv-${cleanTargetId}` ||
              inv.no?.toLowerCase()?.replace(/^inv-/, '') === cleanTargetId
          );
          if (match) invoice = match;
        }
      }
    } catch {}
  }

  const html = buildReceiptHtml(invoice, salonData);
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
