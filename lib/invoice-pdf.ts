// lib/invoice-pdf.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, SalonData } from '@/types/salon';
import { SHREE_LOGO_BASE64 } from './logo-base64';
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
 * Builds Ultra-High-Definition Thermal Receipt HTML container (58mm / 80mm).
 * Uses high-contrast typography, deep black text (#000000), crisp borders and high DPI layout.
 */
function buildThermalInvoiceHtml(inv: Invoice, salonData?: SalonData): HTMLElement {
  const printer = salonData?.settings?.printer || '58';
  const container = document.createElement('div');
  container.id = 'temp-pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = printer === '80' ? '560px' : '460px';
  container.style.background = '#ffffff';
  container.style.fontFamily =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.color = '#000000';
  container.style.padding = '22px 18px';
  container.style.boxSizing = 'border-box';
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
          <td style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 13.5px; font-weight: 600; text-align: left; color: #000000; line-height: 1.35;">
            <div>${displayName}</div>
            ${l.staff ? `<div style="font-size: 11.5px; color: #333333; font-weight: 500; margin-top: 2px;">Beautician: ${l.staff}</div>` : ''}
            ${discAmt > 0 ? `<div style="font-size: 11.5px; color: #000000; font-weight: 600; margin-top: 2px;">(Disc: -₹${discAmt.toLocaleString('en-IN')})</div>` : ''}
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 4px; font-size: 13.5px; font-weight: 600; text-align: center; color: #000000;">
            ${qty}
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 6px; font-size: 13.5px; font-weight: 600; text-align: right; color: #000000;">
            ${price.toLocaleString('en-IN')}
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 14px; font-weight: 700; text-align: right; color: #000000;">
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
    <div style="width: 100%; text-align: center; margin-bottom: 12px;">
      <!-- Official High-Res Logo -->
      <img src="${SHREE_LOGO_BASE64}" alt="Shree Beauty Studio" style="max-width: 230px; width: 65%; height: auto; object-fit: contain; margin: 0 auto 6px; display: block;" />
      
      <!-- Studio Header Details -->
      <div style="font-size: 13px; color: #000000; line-height: 1.4; margin-bottom: 3px; max-width: 380px; margin-left: auto; margin-right: auto; font-weight: 500;">
        ${salonAddress}
      </div>
      <div style="font-size: 12.5px; color: #000000; line-height: 1.4; font-weight: 500;">
        Email: <b>${salonEmail}</b>
      </div>
      <div style="font-size: 13px; color: #000000; line-height: 1.4; font-weight: 700; margin-top: 2px;">
        Phone / WhatsApp: +91 ${salonPhone}
      </div>
    </div>

    <!-- Solid Clear Divider -->
    <div style="border-top: 2px dashed #000000; margin: 10px 0 12px;"></div>

    <!-- Key-Value Info Grid -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13.5px;">
      <tbody>
        <tr>
          <td style="width: 90px; padding: 3px 0; font-weight: 700; color: #000000;">Inv. No :</td>
          <td style="padding: 3px 0; font-weight: 600; color: #000000;">${invNo}</td>
        </tr>
        <tr>
          <td style="padding: 3px 0; font-weight: 700; color: #000000;">Date :</td>
          <td style="padding: 3px 0; font-weight: 600; color: #000000;">${invDate}</td>
        </tr>
        <tr>
          <td style="padding: 3px 0; font-weight: 700; color: #000000;">Name :</td>
          <td style="padding: 3px 0; font-weight: 700; color: #000000; text-transform: uppercase;">${inv.customer || 'Customer'}</td>
        </tr>
        <tr>
          <td style="padding: 3px 0; font-weight: 700; color: #000000;">Phone :</td>
          <td style="padding: 3px 0; font-weight: 600; color: #000000;">${inv.mobile || '—'}</td>
        </tr>
        ${inv.mode ? `
        <tr>
          <td style="padding: 3px 0; font-weight: 700; color: #000000;">Payment :</td>
          <td style="padding: 3px 0; font-weight: 600; color: #000000;">${inv.mode}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <!-- Services & Totals Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1.5px solid #000000; font-size: 13.5px;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="border: 1.5px solid #000000; padding: 7px 6px; font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 0.03em; color: #000000;">
            SERVICE
          </th>
          <th style="border: 1.5px solid #000000; padding: 7px 4px; font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; width: 44px; color: #000000;">
            QTY
          </th>
          <th style="border: 1.5px solid #000000; padding: 7px 6px; font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; width: 75px; color: #000000;">
            PRICE
          </th>
          <th style="border: 1.5px solid #000000; padding: 7px 6px; font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; width: 90px; color: #000000;">
            TOTAL
          </th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}

        <!-- Total Rows -->
        <tr>
          <td colspan="3" style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 14px; font-weight: 800; text-align: left; color: #000000;">
            Grand Total
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 15px; font-weight: 800; text-align: right; color: #000000;">
            ₹${totalAmt.toLocaleString('en-IN')}
          </td>
        </tr>
        ${
          advanceAmt > 0
            ? `
        <tr>
          <td colspan="3" style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13.5px; font-weight: 700; text-align: left; color: #000000;">
            Advance Received
          </td>
          <td style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 14px; font-weight: 700; text-align: right; color: #000000;">
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
          <td colspan="3" style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13.5px; font-weight: 700; text-align: left; color: #000000;">
            Paid Amount
          </td>
          <td style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 14px; font-weight: 700; text-align: right; color: #000000;">
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
          <td colspan="3" style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 13.5px; font-weight: 700; text-align: left; color: #000000;">
            Received / Paid (${inv.mode || 'Cash'})
          </td>
          <td style="border: 1.5px solid #000000; padding: 6px 8px; font-size: 14px; font-weight: 700; text-align: right; color: #000000;">
            ₹${paymentPaid.toLocaleString('en-IN')}
          </td>
        </tr>
        `
            : ''
        }
        <!-- Balance Due row -->
        <tr style="${balanceDue > 0 ? 'background: #fff1f2;' : 'background: #f0fdf4;'}">
          <td colspan="3" style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 14px; font-weight: 800; text-align: left; color: #000000;">
            Balance Due
          </td>
          <td style="border: 1.5px solid #000000; padding: 7px 8px; font-size: 15px; font-weight: 900; text-align: right; color: ${balanceDue > 0 ? '#b91c1c' : '#15803d'};">
            ₹${balanceDue.toLocaleString('en-IN')}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Heartfelt Footer -->
    <div style="text-align: center; margin-top: 14px; border-top: 1.5px dashed #000000; padding-top: 10px;">
      <div style="font-size: 13.5px; font-weight: 700; color: #000000; margin-bottom: 4px; text-align: center;">
        Thank you for choosing Shree Beauty Studio! 🙏
      </div>
      <div style="font-size: 12px; color: #222222; line-height: 1.45; max-width: 380px; margin: 0 auto; font-weight: 500;">
        We truly value your trust and hope your salon experience was wonderful. Visit again! ✨
      </div>
    </div>
  `;

  return container;
}

/**
 * Builds Ultra-High-Definition Standard A4 Full Page Luxury Invoice HTML container.
 */
function buildA4InvoiceHtml(inv: Invoice, salonData?: SalonData): HTMLElement {
  const container = document.createElement('div');
  container.id = 'temp-pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.fontFamily =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.color = '#0f172a';
  container.style.padding = '36px 42px';
  container.style.boxSizing = 'border-box';

  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const salonEmail = 'shreebeauty.studio22@gmail.com';
  const salonPhone = salonData?.settings?.whatsapp
    ? `${salonData.settings.whatsapp}, 9825339924`
    : '919773240010, 9825339924';

  const invNo = inv.no.replace(/^INV-/, '');
  const invDate = formatIndianDate(inv.date);

  const totalAmt = Number(inv.total || 0);
  const advanceAmt = Number(inv.advance || 0);
  const paymentPaid = Number(inv.paid || 0);
  const balanceDue = Number(
    inv.balance !== undefined
      ? inv.balance
      : Math.max(0, totalAmt - advanceAmt - paymentPaid)
  );

  const linesHtml = (inv.lines || [])
    .map((l, idx) => {
      const qty = Number(l.qty) || 1;
      const price = Number(l.price) || 0;
      const gross = qty * price;
      const disc = Number(l.discount || 0);
      const discAmt = disc > 0 ? (l.discountType === '%' ? (gross * disc) / 100 : disc) : 0;
      const lineTotal = Math.max(0, gross - discAmt);
      const displayName = cleanServiceNameForBill(l.name);

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background: #f8fafc;' : 'background: #ffffff;'}">
          <td style="padding: 11px 12px; font-size: 13px; font-weight: 600; color: #64748b; text-align: center;">${idx + 1}</td>
          <td style="padding: 11px 14px; font-size: 13.5px; font-weight: 700; color: #0f172a;">
            <div>${displayName}</div>
            ${l.staff ? `<div style="font-size: 11.5px; color: #05424A; font-weight: 600; margin-top: 3px;">Beautician: ${l.staff}</div>` : ''}
          </td>
          <td style="padding: 11px 12px; font-size: 13.5px; font-weight: 600; color: #0f172a; text-align: center;">${qty}</td>
          <td style="padding: 11px 14px; font-size: 13.5px; font-weight: 600; color: #0f172a; text-align: right;">₹${price.toLocaleString('en-IN')}</td>
          <td style="padding: 11px 12px; font-size: 13px; font-weight: 600; color: #b91c1c; text-align: right;">${discAmt > 0 ? `-₹${discAmt.toLocaleString('en-IN')}` : '—'}</td>
          <td style="padding: 11px 14px; font-size: 14px; font-weight: 800; color: #05424A; text-align: right;">₹${lineTotal.toLocaleString('en-IN')}</td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <!-- Top Header & Luxury Branding -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #05424A; padding-bottom: 20px;">
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <img src="${SHREE_LOGO_BASE64}" alt="${salon}" style="max-width: 220px; height: auto; object-fit: contain; margin-bottom: 6px; display: block;" />
        <div style="font-size: 12.5px; color: #475569; max-width: 400px; line-height: 1.4; font-weight: 500;">
          ${salonAddress}
        </div>
        <div style="font-size: 12.5px; color: #475569; font-weight: 500; margin-top: 2px;">
          Email: <b style="color: #05424A;">${salonEmail}</b> | Phone: <b style="color: #05424A;">+91 ${salonPhone}</b>
        </div>
      </div>
      <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
        <div style="background: linear-gradient(135deg, #05424A 0%, #032A30 100%); color: #ffffff; font-size: 15px; font-weight: 800; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 6px; display: inline-block; border-bottom: 2px solid #EABA38;">
          TAX INVOICE
        </div>
        <div style="font-size: 14.5px; font-weight: 800; color: #0f172a; margin-top: 6px;">Invoice No: <span style="color: #05424A;">#${invNo}</span></div>
        <div style="font-size: 13px; color: #64748b; font-weight: 600;">Date: <b>${invDate}</b></div>
        <div style="font-size: 12px; color: #047857; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 6px; display: inline-block; margin-top: 2px;">
          Payment: ${inv.mode || 'Cash / UPI'}
        </div>
      </div>
    </div>

    <!-- Billed To Customer Card -->
    <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 11px; font-weight: 800; color: #05424A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">BILLED TO (CUSTOMER):</div>
        <div style="font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase;">${inv.customer || 'Customer'}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">CONTACT NUMBER:</div>
        <div style="font-size: 14.5px; font-weight: 700; color: #0f172a;">+91 ${inv.mobile || '—'}</div>
      </div>
    </div>

    <!-- Services & Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #05424A; color: #ffffff; border-bottom: 2px solid #EABA38;">
          <th style="padding: 10px 12px; font-size: 12px; font-weight: 800; text-align: center; text-transform: uppercase; width: 40px;">#</th>
          <th style="padding: 10px 14px; font-size: 12px; font-weight: 800; text-align: left; text-transform: uppercase;">Service / Item Description</th>
          <th style="padding: 10px 12px; font-size: 12px; font-weight: 800; text-align: center; text-transform: uppercase; width: 50px;">Qty</th>
          <th style="padding: 10px 14px; font-size: 12px; font-weight: 800; text-align: right; text-transform: uppercase; width: 105px;">Rate</th>
          <th style="padding: 10px 12px; font-size: 12px; font-weight: 800; text-align: right; text-transform: uppercase; width: 90px;">Discount</th>
          <th style="padding: 10px 14px; font-size: 12px; font-weight: 800; text-align: right; text-transform: uppercase; width: 115px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <!-- Financial Summary Box -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
      <div style="width: 320px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 14px 18px;">
        <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: #475569; margin-bottom: 7px;">
          <span>Subtotal:</span>
          <span>₹${totalAmt.toLocaleString('en-IN')}</span>
        </div>
        ${advanceAmt > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 700; color: #05424A; margin-bottom: 7px;">
          <span>Advance Paid:</span>
          <span>-₹${advanceAmt.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        ${paymentPaid > 0 && paymentPaid !== totalAmt ? `
        <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 700; color: #047857; margin-bottom: 7px;">
          <span>Paid Today:</span>
          <span>-₹${paymentPaid.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        <div style="border-top: 2px solid #cbd5e1; margin: 8px 0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; color: #05424A;">
          <span>Total Amount:</span>
          <span>₹${totalAmt.toLocaleString('en-IN')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14.5px; font-weight: 800; color: ${balanceDue > 0 ? '#b91c1c' : '#047857'}; background: ${balanceDue > 0 ? '#fee2e2' : '#dcfce7'}; border: 1px solid ${balanceDue > 0 ? '#fca5a5' : '#86efac'}; padding: 7px 12px; border-radius: 6px; margin-top: 6px;">
          <span>${balanceDue > 0 ? 'Balance Due:' : 'Status:'}</span>
          <span>${balanceDue > 0 ? `₹${balanceDue.toLocaleString('en-IN')}` : 'Fully Paid ✓'}</span>
        </div>
      </div>
    </div>

    <!-- Heartfelt Footer & Terms -->
    <div style="border-top: 1.5px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="font-size: 13px; font-weight: 800; color: #05424A; margin-bottom: 3px;">Thank you for visiting ${salon}! 🙏</div>
        <div style="font-size: 11.5px; color: #64748b; line-height: 1.45; max-width: 440px;">
          We value your trust and hope your experience was wonderful.<br />
          • Services rendered are non-refundable. Please preserve this invoice for reward points.<br />
          • Google Review &amp; Appointments: <b>+91 ${salonPhone.split(',')[0]}</b>
        </div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 12.5px; font-weight: 800; color: #05424A;">${salon}</div>
        <div style="font-size: 10.5px; color: #64748b; margin-top: 22px; border-top: 1px dashed #94a3b8; padding-top: 4px;">Authorized Signature</div>
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
  const isA4 = formatType === 'a4' || salonData?.settings?.printer === 'a4';
  const container = isA4 ? buildA4InvoiceHtml(inv, salonData) : buildThermalInvoiceHtml(inv, salonData);
  document.body.appendChild(container);

  try {
    const scaleFactor = isA4 ? 3.0 : 3.5;
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
    if (isA4) {
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8; // 8mm margin around A4 page
      const availWidth = pdfWidth - margin * 2;
      const availHeight = pdfHeight - margin * 2;
      const contentHeight = (canvas.height * availWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', margin, margin, availWidth, Math.min(availHeight, contentHeight), undefined, 'FAST');
    } else {
      const printer = salonData?.settings?.printer || '58';
      const pdfWidth = printer === '80' ? 80 : 58;
      const margin = printer === '80' ? 2 : 1.5;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      const pdfHeight = contentHeight + margin * 2;

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
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
 * Download razor-sharp PDF invoice (Defaults to beautiful A4 format).
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
): Promise<{ success: boolean; method: string; message: string; notConfigured?: boolean }> {
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
      method: json.method || 'api_error',
      notConfigured: json.notConfigured,
      is24HourWindow: json.is24HourWindow,
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
