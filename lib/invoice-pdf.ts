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
 * Builds Ultra-High-Definition Standard A4 Full Page Invoice HTML container.
 */
function buildA4InvoiceHtml(inv: Invoice, salonData?: SalonData): HTMLElement {
  const container = document.createElement('div');
  container.id = 'temp-pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '820px';
  container.style.background = '#ffffff';
  container.style.fontFamily =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.color = '#0f172a';
  container.style.padding = '40px 45px';
  container.style.boxSizing = 'border-box';

  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const salonEmail = 'shreebeauty.studio22@gmail.com';
  const salonPhone = salonData?.settings?.whatsapp
    ? `${salonData.settings.whatsapp}, 9825339924`
    : '919824183769, 9825339924';

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
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background: #f8fafc;' : ''}">
          <td style="padding: 12px 14px; font-size: 13.5px; font-weight: 600; color: #64748b; text-align: center;">${idx + 1}</td>
          <td style="padding: 12px 14px; font-size: 14px; font-weight: 700; color: #0f172a;">
            <div>${displayName}</div>
            ${l.staff ? `<div style="font-size: 12px; color: #0284c7; font-weight: 600; margin-top: 3px;">Staff: ${l.staff}</div>` : ''}
          </td>
          <td style="padding: 12px 14px; font-size: 14px; font-weight: 600; color: #0f172a; text-align: center;">${qty}</td>
          <td style="padding: 12px 14px; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">₹${price.toLocaleString('en-IN')}</td>
          <td style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #b91c1c; text-align: right;">${discAmt > 0 ? `-₹${discAmt.toLocaleString('en-IN')}` : '—'}</td>
          <td style="padding: 12px 14px; font-size: 14.5px; font-weight: 800; color: #0f172a; text-align: right;">₹${lineTotal.toLocaleString('en-IN')}</td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <!-- Top Header & Branding -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #0284c7; padding-bottom: 24px;">
      <div>
        <img src="${SHREE_LOGO_BASE64}" alt="Shree Beauty Studio" style="max-width: 240px; height: auto; object-fit: contain; margin-bottom: 8px; display: block;" />
        <div style="font-size: 13px; color: #475569; max-width: 380px; line-height: 1.45; font-weight: 500;">
          ${salonAddress}
        </div>
        <div style="font-size: 13px; color: #475569; margin-top: 4px; font-weight: 500;">
          Email: <b>${salonEmail}</b> | Phone: <b>+91 ${salonPhone}</b>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 26px; font-weight: 900; color: #0284c7; letter-spacing: -0.02em; text-transform: uppercase;">TAX INVOICE</div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 6px;">Invoice No: <span style="color: #0284c7;">#${invNo}</span></div>
        <div style="font-size: 13.5px; color: #64748b; font-weight: 600; margin-top: 3px;">Date: ${invDate}</div>
        <div style="font-size: 13px; color: #15803d; font-weight: 700; margin-top: 4px; background: #dcfce7; padding: 3px 10px; border-radius: 6px; display: inline-block;">Payment: ${inv.mode || 'Cash / UPI'}</div>
      </div>
    </div>

    <!-- Bill To Card -->
    <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 11.5px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">BILLED TO (CUSTOMER):</div>
        <div style="font-size: 17px; font-weight: 800; color: #0f172a; text-transform: uppercase;">${inv.customer || 'Customer'}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">CONTACT NUMBER:</div>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">+91 ${inv.mobile || '—'}</div>
      </div>
    </div>

    <!-- Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #0f172a; color: #ffffff;">
          <th style="padding: 12px 14px; font-size: 12.5px; font-weight: 800; text-align: center; text-transform: uppercase; width: 45px;">#</th>
          <th style="padding: 12px 14px; font-size: 12.5px; font-weight: 800; text-align: left; text-transform: uppercase;">Service / Item Description</th>
          <th style="padding: 12px 14px; font-size: 12.5px; font-weight: 800; text-align: center; text-transform: uppercase; width: 60px;">Qty</th>
          <th style="padding: 12px 14px; font-size: 12.5px; font-weight: 800; text-align: right; text-transform: uppercase; width: 110px;">Rate</th>
          <th style="padding: 12px 14px; font-size: 12.5px; font-weight: 800; text-align: right; text-transform: uppercase; width: 95px;">Discount</th>
          <th style="padding: 12px 14px; font-size: 12.5px; font-weight: 800; text-align: right; text-transform: uppercase; width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <!-- Financial Summary Box -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
      <div style="width: 320px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 16px 20px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #475569; margin-bottom: 8px;">
          <span>Subtotal:</span>
          <span>₹${totalAmt.toLocaleString('en-IN')}</span>
        </div>
        ${advanceAmt > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #0284c7; margin-bottom: 8px;">
          <span>Advance Paid:</span>
          <span>-₹${advanceAmt.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        ${paymentPaid > 0 && paymentPaid !== totalAmt ? `
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #15803d; margin-bottom: 8px;">
          <span>Paid Today:</span>
          <span>-₹${paymentPaid.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        <div style="border-top: 2px solid #cbd5e1; margin: 10px 0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 17px; font-weight: 900; color: #0f172a;">
          <span>Total Amount:</span>
          <span>₹${totalAmt.toLocaleString('en-IN')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: ${balanceDue > 0 ? '#b91c1c' : '#15803d'}; background: ${balanceDue > 0 ? '#fee2e2' : '#dcfce7'}; padding: 8px 12px; border-radius: 6px; margin-top: 6px;">
          <span>${balanceDue > 0 ? 'Balance Due:' : 'Status: Fully Paid'}</span>
          <span>₹${balanceDue.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <!-- Footer & Terms -->
    <div style="border-top: 1.5px solid #e2e8f0; padding-top: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Terms & Conditions:</div>
        <div style="font-size: 11.5px; color: #64748b; line-height: 1.45;">
          1. Goods / Services once rendered are non-refundable.<br />
          2. Please preserve this invoice for bridal advance receipts & reward points.<br />
          3. Thank you for your business!
        </div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${salon}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px dashed #94a3b8; padding-top: 4px;">Authorized Signature</div>
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
  formatType: 'thermal' | 'a4' = 'thermal'
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
      const contentHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, contentHeight), undefined, 'FAST');
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
 * Download razor-sharp PDF invoice (Thermal or A4 format).
 */
export async function downloadInvoicePDF(
  inv: Invoice,
  salonData?: SalonData,
  fileName?: string,
  formatType: 'thermal' | 'a4' = 'thermal'
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
 * Send the crystal-clear PDF Invoice to a customer's WhatsApp via Meta Cloud API.
 */
export async function sendInvoicePDFViaWhatsApp(
  inv: Invoice,
  salonData?: SalonData,
  formatType: 'thermal' | 'a4' = 'thermal'
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

  // ── Generate the High-Res PDF ──────────────────────────────────────────────
  let pdfBase64 = '';
  let pdfFilename = `Invoice_${inv.no}_${(inv.customer || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  try {
    const { pdf, filename } = await generateInvoicePDFBlob(inv, salonData, formatType);
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

  // ── Call backend Meta Cloud API endpoint ──────────────────────────────────
  try {
    const caption = `✨ *${salon.toUpperCase()} — Official Invoice #${inv.no}* ✨\nDear ${inv.customer || 'Customer'}, thank you for visiting ${salon}! 💖\nYour official receipt is attached below.`;

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
        message: '✅ High-Res PDF Bill sent directly to customer via WhatsApp Business API! 🚀',
      };
    }

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
