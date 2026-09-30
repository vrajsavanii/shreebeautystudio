// lib/invoice-pdf.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, SalonData } from '@/types/salon';
import { SHREE_INVOICE_BILL_LOGO_BASE64 } from './logo-base64';
import { format, parseISO } from 'date-fns';
import { sendWhatsAppTemplateMessage } from './whatsapp';

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

/**
 * Builds Ultra-High-Definition Receipt Card HTML container matching the exact studio layout.
 * Uses high-contrast typography, deep black text (#000000), crisp borders, and high DPI layout.
 */
function buildInvoiceReceiptHtml(inv: Invoice, salonData?: SalonData): HTMLElement {
  const container = document.createElement('div');
  container.id = 'temp-pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '450px';
  container.style.background = '#ffffff';
  container.style.fontFamily =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.color = '#000000';
  container.style.padding = '24px 20px';
  container.style.boxSizing = 'border-box';
  container.style.borderRadius = '14px';
  container.style.border = '1.5px solid #000000';
  container.style.letterSpacing = '-0.01em';

  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const salonEmail = 'shreebeauty.studio22@gmail.com';
  const salonPhone = salonData?.settings?.whatsapp
    ? `${salonData.settings.whatsapp}, 9825339924`
    : '919773240010, 9825339924';

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
          <td style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 13px; font-weight: 600; text-align: left; vertical-align: middle; color: #000000; line-height: 1.35;">
            <div>${displayName}</div>
            ${l.staff ? `<div style="font-size: 11px; color: #444444; font-weight: 500; margin-top: 2px;">Beautician: ${l.staff}</div>` : ''}
            ${discAmt > 0 ? `<div style="font-size: 11px; color: #000000; font-weight: 600; margin-top: 2px;">(Disc: -₹${discAmt.toLocaleString('en-IN')})</div>` : ''}
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 4px; font-size: 13px; font-weight: 600; text-align: center; vertical-align: middle; color: #000000;">
            ${qty}
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 6px; font-size: 13px; font-weight: 600; text-align: right; vertical-align: middle; color: #000000;">
            ${price.toLocaleString('en-IN')}
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 13.5px; font-weight: 700; text-align: right; vertical-align: middle; color: #000000;">
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
    <!-- Official High-Res Studio Logo -->
    <div style="width: 100%; text-align: center; margin-bottom: 10px;">
      <img src="${SHREE_INVOICE_BILL_LOGO_BASE64}" alt="Shree Beauty Studio" style="max-width: 215px; width: 62%; height: auto; object-fit: contain; margin: 0 auto 6px; display: block;" />
      
      <!-- Studio Header Details -->
      <div style="font-size: 12.5px; color: #000000; line-height: 1.4; margin-bottom: 2px; max-width: 360px; margin-left: auto; margin-right: auto; font-weight: 500;">
        ${salonAddress}
      </div>
      <div style="font-size: 12px; color: #000000; line-height: 1.4; font-weight: 500;">
        Email: <b>${salonEmail}</b>
      </div>
      <div style="font-size: 12.5px; color: #000000; line-height: 1.4; font-weight: 700; margin-top: 2px;">
        Phone / WhatsApp: +91 ${salonPhone}
      </div>
    </div>

    <!-- Key-Value Info Grid with subtle dividers -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 12px; font-size: 13px;">
      <tbody>
        <tr style="border-bottom: 1px solid #eef2f6;">
          <td style="width: 85px; padding: 4.5px 0; font-weight: 700; color: #000000;">Inv. No :</td>
          <td style="padding: 4.5px 0; font-weight: 600; color: #000000;">${invNo}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eef2f6;">
          <td style="padding: 4.5px 0; font-weight: 700; color: #000000;">Date :</td>
          <td style="padding: 4.5px 0; font-weight: 600; color: #000000;">${invDate}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eef2f6;">
          <td style="padding: 4.5px 0; font-weight: 700; color: #000000;">Name :</td>
          <td style="padding: 4.5px 0; font-weight: 700; color: #000000; text-transform: uppercase;">${inv.customer || 'Customer'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eef2f6;">
          <td style="padding: 4.5px 0; font-weight: 700; color: #000000;">Phone :</td>
          <td style="padding: 4.5px 0; font-weight: 600; color: #000000;">${inv.mobile || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 4.5px 0; font-weight: 700; color: #000000;">Payment :</td>
          <td style="padding: 4.5px 0; font-weight: 600; color: #000000;">${inv.mode || 'Cash'}</td>
        </tr>
      </tbody>
    </table>

    <!-- Services & Totals Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1.5px solid #000000; font-size: 13px;">
      <thead>
        <tr style="background: #ffffff;">
          <th style="border: 1.5px solid #000000; padding: 7px 6px; font-size: 12.5px; font-weight: 800; text-align: center; vertical-align: middle; text-transform: uppercase; letter-spacing: 0.02em; color: #000000;">
            SERVICE
          </th>
          <th style="border: 1.5px solid #000000; padding: 7px 4px; font-size: 12.5px; font-weight: 800; text-align: center; vertical-align: middle; text-transform: uppercase; width: 44px; color: #000000;">
            QTY
          </th>
          <th style="border: 1.5px solid #000000; padding: 7px 6px; font-size: 12.5px; font-weight: 800; text-align: center; vertical-align: middle; text-transform: uppercase; width: 75px; color: #000000;">
            PRICE
          </th>
          <th style="border: 1.5px solid #000000; padding: 7px 6px; font-size: 12.5px; font-weight: 800; text-align: center; vertical-align: middle; text-transform: uppercase; width: 85px; color: #000000;">
            TOTAL
          </th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}

        <!-- Total Rows -->
        <tr>
          <td colspan="3" style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 13.5px; font-weight: 800; text-align: left; vertical-align: middle; color: #000000;">
            Grand Total
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 14.5px; font-weight: 800; text-align: right; vertical-align: middle; color: #000000;">
            ₹${totalAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        ${
          advanceAmt > 0
            ? `
        <tr>
          <td colspan="3" style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13px; font-weight: 700; text-align: left; vertical-align: middle; color: #000000;">
            Advance Received
          </td>
          <td style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13.5px; font-weight: 700; text-align: right; vertical-align: middle; color: #000000;">
            ₹${advanceAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        ${
          paymentPaid > 0 && paymentPaid !== totalAmt
            ? `
        <tr>
          <td colspan="3" style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13px; font-weight: 700; text-align: left; vertical-align: middle; color: #000000;">
            Paid Amount
          </td>
          <td style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13.5px; font-weight: 700; text-align: right; vertical-align: middle; color: #000000;">
            ₹${paymentPaid.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        ${
          advanceAmt === 0 && paymentPaid >= totalAmt
            ? `
        <tr>
          <td colspan="3" style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13px; font-weight: 700; text-align: left; vertical-align: middle; color: #000000;">
            Received / Paid (${inv.mode || 'Cash'})
          </td>
          <td style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13.5px; font-weight: 700; text-align: right; vertical-align: middle; color: #000000;">
            ₹${paymentPaid.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        ${
          balanceDue > 0
            ? `
        <!-- Balance Due row -->
        <tr style="background: #fff1f2;">
          <td colspan="3" style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 13.5px; font-weight: 800; text-align: left; vertical-align: middle; color: #000000;">
            Balance Due
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 14.5px; font-weight: 900; text-align: right; vertical-align: middle; color: #b91c1c;">
            ₹${balanceDue.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
      </tbody>
    </table>

    <!-- Heartfelt Footer with 1-row space -->
    <div style="text-align: center; margin-top: 22px; padding-top: 4px;">
      <div style="font-size: 13px; font-weight: 700; color: #000000; margin-bottom: 5px; text-align: center;">
        Thank you for choosing us! 🙏
      </div>
      <div style="font-size: 11.5px; color: #222222; line-height: 1.5; max-width: 340px; margin: 0 auto; font-weight: 500;">
        We truly value your trust and hope your experience was wonderful !!
      </div>
    </div>
  `;

  return container;
}

/**
 * Generate Ultra-HD PDF instance for download or WhatsApp dispatch.
 * Uses high-scale rasterization (scale: 3.5) with lossless PNG compression for 100% razor-sharp clarity!
 */
export async function generateInvoicePDFBlob(
  inv: Invoice,
  salonData?: SalonData,
  formatType: 'thermal' | 'a4' = 'a4'
): Promise<{ pdf: jsPDF; filename: string }> {
  const container = buildInvoiceReceiptHtml(inv, salonData);
  document.body.appendChild(container);

  try {
    const scaleFactor = 3.5;
    const canvas = await html2canvas(container, {
      scale: scaleFactor,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
    });

    // Lossless PNG for razor-sharp text with zero JPEG compression blur
    const imgData = canvas.toDataURL('image/png');

    let pdf: jsPDF;
    if (formatType === 'a4') {
      // Standard A4 page with the beautiful card centered with elegant margins
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      const cardWidthOnA4 = 132;
      const cardHeightOnA4 = (canvas.height * cardWidthOnA4) / canvas.width;
      const posX = (pdfWidth - cardWidthOnA4) / 2;
      const posY = Math.max(14, (pdfHeight - cardHeightOnA4) / 2.6);

      pdf.addImage(imgData, 'PNG', posX, posY, cardWidthOnA4, cardHeightOnA4, undefined, 'FAST');
    } else {
      // Direct Receipt / Mobile PDF format (fits phone screen & WhatsApp perfectly without white bars!)
      const receiptWidthMm = 110;
      const margin = 2;
      const contentWidthMm = receiptWidthMm - margin * 2;
      const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;
      const receiptHeightMm = contentHeightMm + margin * 2;

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [receiptWidthMm, receiptHeightMm],
      });

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidthMm, contentHeightMm, undefined, 'FAST');
    }

    const safeCustomer = (inv.customer || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Invoice_${inv.no}_${safeCustomer}.pdf`;

    return { pdf, filename };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Download razor-sharp PDF invoice (Defaults to beautiful format).
 */
export async function downloadInvoicePDF(
  inv: Invoice,
  salonData?: SalonData,
  fileName?: string,
  formatType: 'thermal' | 'a4' = 'a4'
): Promise<void> {
  const { pdf, filename } = await generateInvoicePDFBlob(inv, salonData, formatType);
  pdf.save(fileName || filename);
}

/**
 * Download High-Definition A4 Full Page PDF.
 */
export async function downloadA4InvoicePDF(
  inv: Invoice,
  salonData?: SalonData,
  fileName?: string
): Promise<void> {
  return downloadInvoicePDF(inv, salonData, fileName, 'a4');
}

/**
 * Send official WhatsApp text receipt to customer using approved Meta utility template.
 * Works for 100% of phone numbers (new and old) outside the 24-hour window.
 */
export async function sendInvoiceTextViaWhatsApp(
  inv: Invoice,
  salonData?: SalonData
): Promise<{
  success: boolean;
  method: string;
  message: string;
  notConfigured?: boolean;
  isPaymentRequired?: boolean;
  paymentUrl?: string;
}> {
  const cleanMobile = (inv.mobile || '').replace(/\D/g, '').slice(-10);

  if (!cleanMobile) {
    return {
      success: false,
      method: 'none',
      message: 'This invoice has no valid mobile number for the customer.',
    };
  }

  const balanceNum = Math.round(Number(inv.balance) || 0);
  const paymentStatus = balanceNum > 0
    ? `Due: Rs. ${balanceNum.toLocaleString('en-IN')}`
    : 'Paid In Full';

  try {
    const res = await sendWhatsAppTemplateMessage({
      mobile: cleanMobile,
      templateName: 'shree_invoice_receipt',
      languageCode: 'en_US',
      bodyParameters: [
        (inv.customer || 'Customer').trim(),
        inv.no || 'INV-1001',
        Number(inv.total || 0).toLocaleString('en-IN'),
        paymentStatus,
      ],
      settings: salonData?.settings,
    });

    if (res.success) {
      return {
        ...res,
        message: `✅ WhatsApp text receipt for #${inv.no} sent successfully!`,
      };
    }
    return res;
  } catch (err: any) {
    return {
      success: false,
      method: 'network_error',
      message: err?.message || 'Error communicating with WhatsApp API',
    };
  }
}

/**
 * Send the official PDF Invoice document to a customer's WhatsApp via Meta Cloud API.
 */
export async function sendInvoicePDFViaWhatsApp(
  inv: Invoice,
  salonData?: SalonData,
  formatType: 'thermal' | 'a4' = 'a4'
): Promise<{
  success: boolean;
  method: string;
  message: string;
  notConfigured?: boolean;
  is24HourWindow?: boolean;
  isPendingTemplate?: boolean;
  isPaymentRequired?: boolean;
  paymentUrl?: string;
}> {
  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const cleanMobile = (inv.mobile || '').replace(/\D/g, '').slice(-10);

  if (!cleanMobile) {
    return {
      success: false,
      method: 'none',
      message: 'This invoice has no valid mobile number for the customer.',
    };
  }

  const balanceNum = Math.round(Number(inv.balance) || 0);
  const paymentStatus = balanceNum > 0
    ? `Due: Rs. ${balanceNum.toLocaleString('en-IN')}`
    : 'Paid In Full';

  try {
    const { pdf, filename } = await generateInvoicePDFBlob(inv, salonData, formatType);
    const pdfBase64 = pdf.output('datauristring');
    const caption = `✨ *${salon.toUpperCase()} — Official Invoice #${inv.no}* ✨\nDear ${inv.customer || 'Customer'}, thank you for visiting ${salon}! 💖\nYour official tax receipt is attached below.`;

    const res = await fetch('/api/whatsapp/send-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: cleanMobile,
        mobile: cleanMobile,
        caption,
        filename,
        pdfBase64,
        templateName: 'shree_invoice_pdf',
        templateParameters: [
          (inv.customer || 'Customer').trim(),
          inv.no || 'INV-1001',
          Number(inv.total || 0).toLocaleString('en-IN'),
          paymentStatus,
        ],
        whatsappPhoneId: salonData?.settings?.whatsappPhoneId,
        whatsappAccessToken: salonData?.settings?.whatsappAccessToken,
      }),
    });

    const json = await res.json();
    if (json.success) {
      if (json.method === 'meta_template_pdf') {
        return {
          success: true,
          method: 'meta_template_pdf',
          message: '✅ Official Invoice PDF sent directly to customer WhatsApp!',
        };
      }
      return {
        success: true,
        method: json.method || 'pdf',
        isPendingTemplate: json.isPendingTemplate,
        message: json.message || '✅ PDF Invoice dispatched to customer WhatsApp!',
      };
    }

    return {
      success: false,
      method: json.method || (json.isPaymentRequired ? 'payment_required' : 'api_error'),
      notConfigured: json.notConfigured,
      is24HourWindow: json.is24HourWindow,
      isPaymentRequired: json.isPaymentRequired,
      paymentUrl: json.paymentUrl,
      message: json.error || json.message || 'Failed to send PDF invoice via WhatsApp.',
    };
  } catch (pdfErr: any) {
    console.error('[Invoice PDF] PDF send error:', pdfErr);
    return {
      success: false,
      method: 'network_error',
      message: pdfErr?.message || 'Error generating or sending PDF to WhatsApp API.',
    };
  }
}

/**
 * Build rich WhatsApp text for an invoice, including a 1-click link to view/download the official PDF online.
 */
export function buildPublicInvoiceMessage(inv: Invoice, salonData?: SalonData): string {
  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';

  const totalAmt = Number(inv.total || 0);
  const advanceAmt = Number(inv.advance || 0);
  const paymentPaid = Number(inv.paid || 0);
  const balanceDue = Number(
    inv.balance !== undefined ? inv.balance : Math.max(0, totalAmt - advanceAmt - paymentPaid)
  );

  const linesList = (inv.lines || [])
    .map(
      (l: any) =>
        `• ${cleanServiceNameForBill(l.name)} (${l.qty || 1}x) : ₹${Number(
          l.price * (l.qty || 1)
        ).toLocaleString('en-IN')}`
    )
    .join('\n');

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://shreebeauty.studio';
  const publicPdfUrl = `${origin}/invoice/view?no=${encodeURIComponent(inv.no || 'INV-1001')}`;

  return `✨ *${salon.toUpperCase()} — INVOICE #${inv.no}* ✨
────────────────────────────
Dear ${inv.customer || 'Customer'},
Thank you for visiting ${salon}! 💖

📄 *Invoice No:* ${inv.no}
📅 *Date:* ${formatIndianDate(inv.date)}
💳 *Payment Mode:* ${inv.mode || 'Cash'}

*Services & Items:*
${linesList || '• Salon Service'}

────────────────────────────
*Total Bill:* ₹${totalAmt.toLocaleString('en-IN')}
*Amount Paid:* ₹${(paymentPaid + advanceAmt).toLocaleString('en-IN')}
*Balance Due:* ₹${balanceDue.toLocaleString('en-IN')}
────────────────────────────

📄 *Download / View Official PDF Bill:*
👉 ${publicPdfUrl}

📍 ${salonAddress}
📞 +91 97732 40010
Have a wonderful day! 🙏✨`;
}

/**
 * Direct WhatsApp PDF sharing via native app redirection:
 * 1. Mobile (Android/iOS): Uses Web Share API to directly attach and send the actual PDF document file in WhatsApp!
 * 2. Desktop: Downloads PDF to computer + opens WhatsApp Web with the full bill & direct PDF viewer link.
 */
export async function shareInvoicePDFViaDirectWhatsApp(
  inv: Invoice,
  salonData?: SalonData,
  formatType: 'thermal' | 'a4' = 'a4'
): Promise<{
  success: boolean;
  method: 'native_share' | 'download_and_redirect' | 'cancelled';
  message: string;
}> {
  const cleanMobile = (inv.mobile || '').replace(/\D/g, '').slice(-10);
  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const messageText = buildPublicInvoiceMessage(inv, salonData);

  try {
    const { pdf, filename } = await generateInvoicePDFBlob(inv, salonData, formatType);
    const pdfBlob = pdf.output('blob');

    // Attempt native file sharing on mobile / supporting browsers
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      typeof File !== 'undefined'
    ) {
      try {
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `${salon} Invoice #${inv.no}`,
            text: messageText,
          });
          return {
            success: true,
            method: 'native_share',
            message: '✅ Invoice PDF shared directly via WhatsApp!',
          };
        }
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return { success: false, method: 'cancelled', message: 'Share action cancelled.' };
        }
        console.warn('Native file share failed, falling back to download and redirect:', shareErr);
      }
    }

    // Desktop fallback: Download PDF and open WhatsApp Web with public bill link
    pdf.save(filename);

    if (cleanMobile.length === 10) {
      const waUrl = `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');
    }

    return {
      success: true,
      method: 'download_and_redirect',
      message: '📄 PDF downloaded! WhatsApp Web opened with bill & link. Tap 📎 to attach PDF.',
    };
  } catch (err: any) {
    console.error('Error in shareInvoicePDFViaDirectWhatsApp:', err);
    return {
      success: false,
      method: 'download_and_redirect',
      message: err?.message || 'Error generating PDF for WhatsApp sharing.',
    };
  }
}

