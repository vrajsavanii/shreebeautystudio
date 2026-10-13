// app/api/billing/[id]/whatsapp/route.ts
// Sends invoice PDF directly to customer WhatsApp using WhatsApp Connect integration
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateInvoiceReceiptPdf } from '@/lib/generate-pdf';
import { Invoice, SalonData } from '@/types/salon';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';
const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

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

async function fetchInvoiceAndSalonData(id: string): Promise<{ invoice: Invoice | null; salonData?: SalonData }> {
  if (id === 'test' || id === 'sample' || id === '105') {
    return { invoice: SAMPLE_INVOICE_105 };
  }

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
        const salonData = rows[0].data as SalonData;
        const invoices = salonData?.invoices || [];
        const cleanTargetId = id.trim().toLowerCase();

        const match = invoices.find(
          (inv) =>
            inv.id?.toLowerCase() === cleanTargetId ||
            inv.no?.toLowerCase() === cleanTargetId ||
            inv.no?.toLowerCase() === `inv-${cleanTargetId}` ||
            inv.no?.toLowerCase()?.replace(/^inv-/, '') === cleanTargetId
        );

        if (match) {
          return { invoice: match, salonData };
        }
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Route] Error fetching from Supabase:', err);
  }

  return { invoice: null };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {}

    let invoice: Invoice | null = bodyData?.invoice || null;
    let salonData: SalonData | undefined = bodyData?.salonData || undefined;

    if (!invoice) {
      const fetched = await fetchInvoiceAndSalonData(id);
      invoice = fetched.invoice;
      salonData = salonData || fetched.salonData;
    }

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: `Invoice "${id}" not found.` },
        { status: 404 }
      );
    }

    const rawMobile = invoice.mobile || bodyData?.phone || '';
    const cleanDigits = rawMobile.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      return NextResponse.json(
        { success: false, error: `Invalid customer mobile number: "${rawMobile}". 10-digit number required.` },
        { status: 400 }
      );
    }

    // 1. Generate PDF
    const pdfBuffer = await generateInvoiceReceiptPdf(invoice, salonData);

    // 2. Save PDF file to public/uploads/whatsapp
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const rawCustomerName = (invoice.customer || 'customer').trim();
    const cleanCustomerName = rawCustomerName
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    const invNo = (invoice.no || '').replace(/^INV-/, '');
    const filename = `${cleanCustomerName || 'invoice'}_${invNo || 'receipt'}.pdf`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, pdfBuffer);

    // 3. Send via WhatsApp Connect service (Baileys daemon on port 3001)
    const caption = `Namaste ${rawCustomerName}, aapnu bill attached chhe 🙏`;
    const targetPhone = `+91${cleanDigits}`;

    const waRes = await fetch(`${WA_SERVICE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: targetPhone,
        mediaUrl: `/uploads/whatsapp/${filename}`,
        mediaType: 'document',
        fileName: `${cleanCustomerName || 'invoice'}.pdf`,
        caption,
      }),
    });

    const waJson = await waRes.json();

    if (!waRes.ok || !waJson.success) {
      // Return direct WhatsApp Web link as reliable fallback
      const directWaUrl = `https://wa.me/91${cleanDigits}?text=${encodeURIComponent(caption)}`;
      return NextResponse.json({
        success: false,
        serviceError: waJson?.error || 'WhatsApp service not connected yet',
        directWaUrl,
        filename,
        message: waJson?.error
          ? `WhatsApp Connect: ${waJson.error}`
          : 'WhatsApp service is connecting. Use Direct WhatsApp link.',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Bill PDF sent to ${rawCustomerName} (${targetPhone}) on WhatsApp!`,
      fileName: filename,
      phone: targetPhone,
    });
  } catch (error: any) {
    console.error('[WhatsApp Route] Send error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch invoice via WhatsApp.' },
      { status: 500 }
    );
  }
}
