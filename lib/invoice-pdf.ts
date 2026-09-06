// lib/invoice-pdf.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, SalonData } from '@/types/salon';
import { SHREE_LOGO_BASE64 } from './logo-base64';
import { format, parseISO } from 'date-fns';

export function formatIndianDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, 'dd-MM-yyyy');
  } catch {
    return dateStr;
  }
}

export function cleanServiceNameForBill(name: string): string {
  if (!name) return '';
  return name
    .replace(/^\[.*?\]\s*/g, '')
    .replace(/\s*\(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s*@\s*\d{1,2}:\d{2}\)/gi, '')
    .replace(/\s*\(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\)/gi, '')
    .replace(/\s*\(\d{2}[-/\.]\d{2}[-/\.]\d{4}.*?\)/g, '')
    .replace(/\s*\(\d{1,2}:\d{2}\s*(AM|PM)?\)/gi, '')
    .trim();
}

function buildInvoiceHtml(inv: Invoice, salonData?: SalonData): HTMLElement {
  const printer = salonData?.settings?.printer || '58';
  const container = document.createElement('div');
  container.id = 'temp-pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = printer === '58' ? '300px' : printer === '80' ? '360px' : '400px';
  container.style.background = '#ffffff';
  container.style.fontFamily = "'Segoe UI', Arial, Helvetica, sans-serif";
  container.style.color = '#000000';
  container.style.padding = printer === '58' ? '12px 8px' : printer === '80' ? '16px 12px' : '20px 16px';
  container.style.boxSizing = 'border-box';

  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const salonEmail = 'shreebeauty.studio22@gmail.com';
  const salonPhone = salonData?.settings?.whatsapp
    ? `${salonData.settings.whatsapp}, 9825339924`
    : '919824183769, 9825339924';

  const invNo = inv.no.replace(/^INV-/, '');
  const invDate = formatIndianDate(inv.date);

  const linesHtml = (inv.lines || [])
    .map((l) => {
      const qty = Number(l.qty) || 1;
      const price = Number(l.price) || 0;
      const gross = qty * price;
      const disc = Number(l.discount || 0);
      const discAmt = disc > 0 ? (l.discountType === '%' ? (gross * disc) / 100 : disc) : 0;
      const lineTotal = Math.max(0, gross - discAmt);
      const displayName = cleanServiceNameForBill(l.name);

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 4px 5px; font-size: 10px; font-weight: 400; text-align: left; color: #000;">
            <div>${displayName}</div>
            ${discAmt > 0 ? `<div style="font-size: 10px; color: #000; font-weight: 400;">(Disc: -₹${discAmt})</div>` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 4px 2px; font-size: 10px; font-weight: 400; text-align: center; color: #000;">
            ${qty}
          </td>
          <td style="border: 1px solid #000; padding: 4px 3px; font-size: 10px; font-weight: 400; text-align: right; color: #000;">
            ${price.toLocaleString('en-IN')}
          </td>
          <td style="border: 1px solid #000; padding: 4px 4px; font-size: 10px; font-weight: 500; text-align: right; color: #000;">
            ${lineTotal.toLocaleString('en-IN')}
          </td>
        </tr>
      `;
    })
    .join('');

  const totalAmt = Number(inv.total || 0);
  const advanceAmt = Number(inv.advance || 0);
  const paymentPaid = Number(inv.paid || 0);
  const balanceDue = Number(
    inv.balance !== undefined
      ? inv.balance
      : Math.max(0, totalAmt - advanceAmt - paymentPaid)
  );

  container.innerHTML = `
    <div style="width: 100%; text-align: center; margin-bottom: 8px;">
      <!-- Official Logo -->
      <img src="${SHREE_LOGO_BASE64}" alt="Shree Beauty Studio" style="max-width: ${printer === '58' ? '175px' : printer === '80' ? '200px' : '220px'}; width: 100%; height: auto; object-fit: contain; margin: 0 auto 4px; display: block;" />
      
      <!-- Studio Header Details -->
      <div style="font-size: 10px; color: #000; line-height: 1.35; margin-bottom: 2px; max-width: 290px; margin-left: auto; margin-right: auto; font-weight: 400;">
        ${salonAddress}
      </div>
      <div style="font-size: 10px; color: #000; line-height: 1.35; font-weight: 400;">
        Email: ${salonEmail}
      </div>
      <div style="font-size: 10px; color: #000; line-height: 1.35; font-weight: 500;">
        Phone / WhatsApp: ${salonPhone}
      </div>
    </div>

    <!-- Dashed Line Divider -->
    <div style="border-top: 1px dashed #000; margin: 6px 0 8px;"></div>

    <!-- Key-Value Info Grid -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px;">
      <tbody>
        <tr>
          <td style="width: 80px; padding: 2px 0; font-weight: 600; color: #000; font-size: 10px;">Inv. No :</td>
          <td style="padding: 2px 0; font-weight: 400; color: #000; font-size: 10px;">${invNo}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; font-weight: 600; color: #000; font-size: 10px;">Date :</td>
          <td style="padding: 2px 0; font-weight: 400; color: #000; font-size: 10px;">${invDate}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; font-weight: 600; color: #000; font-size: 10px;">Name :</td>
          <td style="padding: 2px 0; font-weight: 400; color: #000; text-transform: uppercase; font-size: 10px;">${inv.customer || 'Customer'}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; font-weight: 600; color: #000; font-size: 10px;">Phone :</td>
          <td style="padding: 2px 0; font-weight: 400; color: #000; font-size: 10px;">${inv.mobile || '—'}</td>
        </tr>
      </tbody>
    </table>

    <!-- Single Unified Services & Totals Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000; font-size: 10px;">
      <thead>
        <tr style="background: #fdfefe;">
          <th style="border: 1px solid #000; padding: 4px 3px; font-size: 10px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.02em; color: #000;">
            SERVICE
          </th>
          <th style="border: 1px solid #000; padding: 4px 2px; font-size: 10px; font-weight: 600; text-align: center; text-transform: uppercase; width: 35px; color: #000;">
            QTY
          </th>
          <th style="border: 1px solid #000; padding: 4px 3px; font-size: 10px; font-weight: 600; text-align: center; text-transform: uppercase; width: 55px; color: #000;">
            PRICE
          </th>
          <th style="border: 1px solid #000; padding: 4px 3px; font-size: 10px; font-weight: 600; text-align: center; text-transform: uppercase; width: 65px; color: #000;">
            TOTAL
          </th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}

        <!-- Total Rows aligned seamlessly with table columns -->
        <tr>
          <td colspan="3" style="border: 1px solid #000; padding: 4px 5px; font-size: 10px; font-weight: 600; text-align: left; color: #000;">
            Total
          </td>
          <td style="border: 1px solid #000; padding: 4px 4px; font-size: 10px; font-weight: 600; text-align: right; color: #000;">
            ₹${totalAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        ${
          advanceAmt > 0
            ? `
        <tr>
          <td colspan="3" style="border: 1px solid #000; padding: 4px 5px; font-size: 10px; font-weight: 600; text-align: left; color: #000;">
            Advance
          </td>
          <td style="border: 1px solid #000; padding: 4px 4px; font-size: 10px; font-weight: 600; text-align: right; color: #000;">
            ₹${advanceAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        ${
          advanceAmt === 0
            ? `
        <tr>
          <td colspan="3" style="border: 1px solid #000; padding: 4px 5px; font-size: 10px; font-weight: 600; text-align: left; color: #000;">
            Received / Paid
          </td>
          <td style="border: 1px solid #000; padding: 4px 4px; font-size: 10px; font-weight: 600; text-align: right; color: #000;">
            ₹${paymentPaid.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        ${
          advanceAmt > 0 && Math.max(0, paymentPaid - advanceAmt) > 0
            ? `
        <tr>
          <td colspan="3" style="border: 1px solid #000; padding: 4px 5px; font-size: 10px; font-weight: 600; text-align: left; color: #000;">
            Paid Today
          </td>
          <td style="border: 1px solid #000; padding: 4px 4px; font-size: 10px; font-weight: 600; text-align: right; color: #000;">
            ₹${Math.max(0, paymentPaid - advanceAmt).toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        <!-- Balance Due row - Always displayed on POS receipts -->
        <tr style="${balanceDue > 0 ? 'background: #fff1f2;' : ''}">
          <td colspan="3" style="border: 1px solid #000; padding: 4px 5px; font-size: 10px; font-weight: 600; text-align: left; color: #000;">
            Balance Due
          </td>
          <td style="border: 1px solid #000; padding: 4px 4px; font-size: 10px; font-weight: 600; text-align: right; color: #000;">
            ₹${balanceDue.toLocaleString('en-IN')}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Heartfelt Footer -->
    <div style="text-align: center; margin-top: 8px;">
      <div style="font-size: 10px; font-weight: 400; color: #000000; margin-bottom: 2px;">
        Thank you for choosing us! 🙏
      </div>
      <div style="font-size: 10px; color: #000000; line-height: 1.45; max-width: 320px; margin: 0 auto; font-weight: 400;">
        We truly value your trust and hope your experience was everything you imagined !!
      </div>
    </div>
  `;

  return container;
}

/**
 * Generate PDF instance for download or dataUrl. Auto-cropped to bill height.
 */
export async function generateInvoicePDFBlob(
  inv: Invoice,
  salonData?: SalonData
): Promise<{ pdf: jsPDF; filename: string }> {
  const container = buildInvoiceHtml(inv, salonData);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const printer = salonData?.settings?.printer || '58';
    const pdfWidth = printer === '58' ? 58 : printer === '80' ? 80 : 100;
    const margin = printer === '58' ? 2 : printer === '80' ? 3 : 5;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    const pdfHeight = contentHeight + margin * 2;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
    });

    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);

    const safeCustomer = (inv.customer || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Invoice_${inv.no}_${safeCustomer}.pdf`;

    return { pdf, filename };
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Generate and download high-res PDF invoice.
 */
export async function downloadInvoicePDF(
  inv: Invoice,
  salonData?: SalonData,
  fileName?: string
): Promise<void> {
  const { pdf, filename } = await generateInvoicePDFBlob(inv, salonData);
  pdf.save(fileName || filename);
}

/**
 * Send the PDF Invoice to a customer's WhatsApp via Meta Cloud API.
 *
 * ✅ Calls backend endpoint which reads credentials from server env vars.
 * ✅ NO WhatsApp Web redirect, NO wa.me, NO openWA() fallback.
 * ✅ Returns a structured result: { success, method, message }.
 *
 * If the API is not configured → returns { success: false, notConfigured: true }.
 * Caller is responsible for showing the appropriate UI message.
 */
export async function sendInvoicePDFViaWhatsApp(
  inv: Invoice,
  salonData?: SalonData
): Promise<{ success: boolean; method: string; message: string; notConfigured?: boolean }> {
  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const cleanMobile = (inv.mobile || '').replace(/\D/g, '');

  if (!cleanMobile) {
    return {
      success: false,
      method: 'none',
      message: 'This invoice has no mobile number for the customer.',
    };
  }

  // ── Generate the PDF ──────────────────────────────────────────────────────
  let pdfBase64 = '';
  let pdfFilename = `Invoice_${inv.no}_${(inv.customer || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  try {
    const { pdf, filename } = await generateInvoicePDFBlob(inv, salonData);
    pdfBase64 = pdf.output('datauristring');
    pdfFilename = filename;
  } catch (genErr) {
    console.error('[Invoice PDF] Error generating PDF:', genErr);
    return {
      success: false,
      method: 'none',
      message: 'Could not generate the PDF invoice. Please try again.',
    };
  }

  // ── Call backend — backend reads Meta credentials from env vars ───────────
  // Do NOT send whatsappPhoneId or whatsappAccessToken in the body.
  // The server reads those from META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_ACCESS_TOKEN.
  try {
    const caption = `✨ *${salon.toUpperCase()} — Invoice Receipt #${inv.no}* ✨\nDear ${inv.customer || 'Customer'}, thank you for choosing us! 💖\nYour official PDF bill receipt is attached below.`;

    const res = await fetch('/api/whatsapp/send-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: cleanMobile,
        caption,
        filename: pdfFilename,
        pdfBase64,
      }),
    });

    const json = await res.json();

    if (json.notConfigured || json.invalidToken) {
      return {
        success: false,
        notConfigured: true,
        method: 'not_configured',
        message:
          json.error || 'WhatsApp API not configured. Please add your Phone Number ID and Access Token in Settings → WhatsApp.',
      };
    }

    if (json.success && json.method === 'meta_cloud_api') {
      return {
        success: true,
        method: 'cloud_api',
        message: '✅ PDF Bill sent directly to customer via WhatsApp Business API! 🚀',
      };
    }

    // API returned a failure with a user-friendly error message
    return {
      success: false,
      method: 'api_error',
      message: json.error || 'Unable to send WhatsApp message. Please try again.',
    };
  } catch (fetchErr: any) {
    console.error('[Invoice PDF] Network error calling send-pdf API:', fetchErr?.message || fetchErr);
    return {
      success: false,
      method: 'network_error',
      message: 'Network error while sending WhatsApp message. Please check your connection.',
    };
  }
}

