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
  container.style.width = printer === '58' ? '320px' : printer === '80' ? '380px' : '420px';
  container.style.background = '#ffffff';
  container.style.fontFamily = "'Segoe UI', Arial, Helvetica, sans-serif";
  container.style.color = '#000000';
  container.style.fontWeight = '400';
  container.style.padding = printer === '58' ? '14px 10px' : printer === '80' ? '18px 14px' : '22px 18px';
  container.style.boxSizing = 'border-box';

  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Near Cancer Hospital, Katargam, Surat - 395004';
  const salonEmail = 'shreebeauty.studio22@gmail.com';
  const salonPhone = salonData?.settings?.whatsapp
    ? `${salonData.settings.whatsapp}, 9825339924`
    : '9824183769, 9825339924';

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
          <td style="border: 1px solid #000; padding: 6px 6px; font-size: 11.5px; font-weight: 400; text-align: left; color: #000;">
            <div>${displayName}</div>
            ${discAmt > 0 ? `<div style="font-size: 10px; color: #16a34a;">(Disc: -₹${discAmt})</div>` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 6px 4px; font-size: 11.5px; font-weight: 400; text-align: center; color: #000;">
            ${qty}
          </td>
          <td style="border: 1px solid #000; padding: 6px 6px; font-size: 11.5px; font-weight: 400; text-align: right; color: #000;">
            ${price.toLocaleString('en-IN')}
          </td>
          <td style="border: 1px solid #000; padding: 6px 6px; font-size: 12px; font-weight: 500; text-align: right; color: #000;">
            ${lineTotal.toLocaleString('en-IN')}
          </td>
        </tr>
      `;
    })
    .join('');

  const totalAmt = Number(inv.total || 0);
  const advanceAmt = Number(inv.advance || 0);
  const paymentPaid = Number(inv.paid || 0);
  const balanceDue = Number(inv.balance || 0);

  container.innerHTML = `
    <div style="width: 100%; text-align: center; margin-bottom: 12px;">
      <!-- Official Logo -->
      <img src="${SHREE_LOGO_BASE64}" alt="Shree Beauty Studio" style="max-width: ${printer === '58' ? '180px' : printer === '80' ? '230px' : '260px'}; width: 100%; height: auto; object-fit: contain; margin: 0 auto 6px; display: block;" />
      
      <!-- Studio Header Details -->
      <div style="font-size: 11px; color: #000; line-height: 1.45; margin-bottom: 3px; max-width: 340px; margin-left: auto; margin-right: auto; font-weight: 400;">
        ${salonAddress}
      </div>
      <div style="font-size: 11px; color: #000; line-height: 1.4; font-weight: 400;">
        Email: ${salonEmail}
      </div>
      <div style="font-size: 11px; color: #000; line-height: 1.4; font-weight: 400;">
        Phone / WhatsApp: ${salonPhone}
      </div>
    </div>

    <!-- Dashed Line Divider -->
    <div style="border-top: 1px dashed #000; margin: 12px 0 16px;"></div>

    <!-- Key-Value Info Grid -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
      <tbody>
        <tr>
          <td style="width: 90px; padding: 4px 0; font-weight: 500; color: #000;">Inv. No :</td>
          <td style="padding: 4px 0; font-weight: 400; color: #000;">${invNo}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 500; color: #000;">Date :</td>
          <td style="padding: 4px 0; font-weight: 400; color: #000;">${invDate}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 500; color: #000;">Name :</td>
          <td style="padding: 4px 0; font-weight: 400; color: #000; text-transform: capitalize;">${inv.customer || 'Customer'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 500; color: #000;">Phone :</td>
          <td style="padding: 4px 0; font-weight: 400; color: #000;">${inv.mobile || '—'}</td>
        </tr>
      </tbody>
    </table>

    <!-- Single Unified Services & Totals Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #000;">
      <thead>
        <tr style="background: #fdfefe;">
          <th style="border: 1px solid #000; padding: 6px 6px; font-size: 11.5px; font-weight: 500; text-align: center; text-transform: uppercase; letter-spacing: 0.04em; color: #000;">
            SERVICE
          </th>
          <th style="border: 1px solid #000; padding: 6px 4px; font-size: 11.5px; font-weight: 500; text-align: center; text-transform: uppercase; width: 45px; color: #000;">
            QTY
          </th>
          <th style="border: 1px solid #000; padding: 6px 6px; font-size: 11.5px; font-weight: 500; text-align: center; text-transform: uppercase; width: 65px; color: #000;">
            PRICE
          </th>
          <th style="border: 1px solid #000; padding: 6px 6px; font-size: 11.5px; font-weight: 500; text-align: center; text-transform: uppercase; width: 75px; color: #000;">
            TOTAL
          </th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}

        <!-- Total Rows aligned seamlessly with table columns -->
        <tr>
          <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; font-size: 12px; font-weight: 500; text-align: left; color: #000;">
            Total
          </td>
          <td style="border: 1px solid #000; padding: 5px 6px; font-size: 12.5px; font-weight: 500; text-align: right; color: #000;">
            ₹${totalAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        ${
          advanceAmt > 0
            ? `
        <tr>
          <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; font-size: 12px; font-weight: 500; text-align: left; color: #000;">
            Advance
          </td>
          <td style="border: 1px solid #000; padding: 5px 6px; font-size: 12.5px; font-weight: 500; text-align: right; color: #000;">
            ₹${advanceAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        <tr>
          <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; font-size: 12px; font-weight: 500; text-align: left; color: #000;">
            ${balanceDue > 0 ? 'Received / Paid' : 'Payment'}
          </td>
          <td style="border: 1px solid #000; padding: 5px 6px; font-size: 12.5px; font-weight: 500; text-align: right; color: #000;">
            ₹${(paymentPaid > 0 ? paymentPaid : totalAmt - advanceAmt).toLocaleString('en-IN')}
          </td>
        </tr>
        ${
          balanceDue > 0
            ? `
        <tr style="background: #fff1f2;">
          <td colspan="3" style="border: 1px solid #000; padding: 5px 6px; font-size: 12px; font-weight: 500; text-align: left; color: #dc2626;">
            Balance Due
          </td>
          <td style="border: 1px solid #000; padding: 5px 6px; font-size: 12.5px; font-weight: 500; text-align: right; color: #dc2626;">
            ₹${balanceDue.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
      </tbody>
    </table>

    <!-- Heartfelt Footer -->
    <div style="text-align: center; margin-top: 14px;">
      <div style="font-size: 12px; font-weight: 500; color: #000; margin-bottom: 3px;">
        Thank you for choosing us! 🙏
      </div>
      <div style="font-size: 10.5px; color: #000; line-height: 1.4; max-width: 320px; margin: 0 auto; font-weight: 400;">
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

