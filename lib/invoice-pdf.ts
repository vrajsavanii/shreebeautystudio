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

function buildInvoiceHtml(inv: Invoice, salonData?: SalonData): HTMLElement {
  const container = document.createElement('div');
  container.id = 'temp-pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '420px';
  container.style.background = '#ffffff';
  container.style.fontFamily = "'Montserrat', 'Segoe UI', Arial, sans-serif";
  container.style.color = '#1f2937';
  container.style.padding = '24px 20px';
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

      return `
        <tr>
          <td style="border: 1.5px solid #222; padding: 8px 10px; font-size: 13px; font-weight: 600; text-align: left;">
            <div>${l.name}</div>
            ${discAmt > 0 ? `<div style="font-size: 10.5px; color: #16a34a;">(Disc: -₹${discAmt})</div>` : ''}
          </td>
          <td style="border: 1.5px solid #222; padding: 8px 6px; font-size: 13px; font-weight: 600; text-align: center;">
            ${qty}
          </td>
          <td style="border: 1.5px solid #222; padding: 8px 8px; font-size: 13px; font-weight: 600; text-align: right;">
            ${price.toLocaleString('en-IN')}
          </td>
          <td style="border: 1.5px solid #222; padding: 8px 10px; font-size: 14px; font-weight: 800; text-align: right;">
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
      <img src="${SHREE_LOGO_BASE64}" alt="Shree Beauty Studio" style="max-width: 260px; height: auto; margin: 0 auto 8px; display: block;" />
      
      <!-- Studio Header Details -->
      <div style="font-size: 11.5px; color: #374151; line-height: 1.45; margin-bottom: 3px; max-width: 320px; margin-left: auto; margin-right: auto;">
        ${salonAddress}
      </div>
      <div style="font-size: 11.5px; color: #374151; line-height: 1.4;">
        Email: ${salonEmail}
      </div>
      <div style="font-size: 11.5px; color: #374151; line-height: 1.4;">
        Phone / WhatsApp: ${salonPhone}
      </div>
    </div>

    <!-- Dashed Line Divider -->
    <div style="border-top: 1.5px dashed #9ca3af; margin: 12px 0 16px;"></div>

    <!-- Key-Value Info Grid -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
      <tbody>
        <tr>
          <td style="width: 90px; padding: 4px 0; font-weight: 800; color: #111;">Inv. No :</td>
          <td style="padding: 4px 0; font-weight: 600; color: #111;">${invNo}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 800; color: #111;">Date :</td>
          <td style="padding: 4px 0; font-weight: 600; color: #111;">${invDate}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 800; color: #111;">Name :</td>
          <td style="padding: 4px 0; font-weight: 600; color: #111; text-transform: capitalize;">${inv.customer || 'Customer'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 800; color: #111;">Phone :</td>
          <td style="padding: 4px 0; font-weight: 600; color: #111;">${inv.mobile || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 800; color: #111;">Event :</td>
          <td style="padding: 4px 0; font-weight: 600; color: #111;">${invDate}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 800; color: #111;">Venue :</td>
          <td style="padding: 4px 0; font-weight: 600; color: #111;">Katargam Studio</td>
        </tr>
      </tbody>
    </table>

    <!-- Services Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 0; border: 1.5px solid #222;">
      <thead>
        <tr style="background: #fdfefe;">
          <th style="border: 1.5px solid #222; padding: 7px 10px; font-size: 12.5px; font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">
            SERVICE
          </th>
          <th style="border: 1.5px solid #222; padding: 7px 6px; font-size: 12.5px; font-weight: 800; text-align: center; text-transform: uppercase; width: 45px;">
            QTY
          </th>
          <th style="border: 1.5px solid #222; padding: 7px 8px; font-size: 12.5px; font-weight: 800; text-align: center; text-transform: uppercase; width: 65px;">
            PRICE
          </th>
          <th style="border: 1.5px solid #222; padding: 7px 10px; font-size: 12.5px; font-weight: 800; text-align: center; text-transform: uppercase; width: 75px;">
            TOTAL
          </th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <!-- Summary / Totals Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1.5px solid #222; border-top: none;">
      <tbody>
        <tr>
          <td style="border: 1.5px solid #222; border-top: none; padding: 7px 12px; font-size: 13.5px; font-weight: 800; text-align: left;">
            Total
          </td>
          <td style="border: 1.5px solid #222; border-top: none; padding: 7px 12px; font-size: 14.5px; font-weight: 800; text-align: right; width: 140px;">
            ₹${totalAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        ${
          advanceAmt > 0
            ? `
        <tr>
          <td style="border: 1.5px solid #222; padding: 7px 12px; font-size: 13.5px; font-weight: 800; text-align: left;">
            Advance
          </td>
          <td style="border: 1.5px solid #222; padding: 7px 12px; font-size: 14.5px; font-weight: 800; text-align: right;">
            ₹${advanceAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="border: 1.5px solid #222; padding: 7px 12px; font-size: 13.5px; font-weight: 800; text-align: left;">
            ${balanceDue > 0 ? 'Received / Paid' : 'Payment'}
          </td>
          <td style="border: 1.5px solid #222; padding: 7px 12px; font-size: 14.5px; font-weight: 800; text-align: right;">
            ₹${(paymentPaid > 0 ? paymentPaid : totalAmt - advanceAmt).toLocaleString('en-IN')}
          </td>
        </tr>
        ${
          balanceDue > 0
            ? `
        <tr style="background: #fff1f2;">
          <td style="border: 1.5px solid #222; padding: 7px 12px; font-size: 13.5px; font-weight: 800; text-align: left; color: #dc2626;">
            Balance Due
          </td>
          <td style="border: 1.5px solid #222; padding: 7px 12px; font-size: 14.5px; font-weight: 800; text-align: right; color: #dc2626;">
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
      <div style="font-size: 13px; font-weight: 700; color: #111; margin-bottom: 4px;">
        Thank you for choosing us! 🙏
      </div>
      <div style="font-size: 10.5px; color: #4b5563; line-height: 1.4; max-width: 320px; margin: 0 auto;">
        We truly value your trust and hope your experience was everything you imagined !!
      </div>
    </div>
  `;

  return container;
}

/**
 * Generate PDF instance for download or dataUrl.
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
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

    pdf.addImage(imgData, 'JPEG', margin, 15, contentWidth, contentHeight);

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

    if (json.notConfigured) {
      return {
        success: false,
        notConfigured: true,
        method: 'not_configured',
        message:
          'WhatsApp API not configured. Please add your Phone Number ID and Access Token in Settings → WhatsApp.',
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

