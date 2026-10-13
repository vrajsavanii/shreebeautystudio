// lib/invoice-receipt-html.ts
// Ultra-High-Definition Receipt HTML Template for Shree Beauty Studio
// Exact layout matching reference invoice (niti.pdf, Inv. No 105)

import fs from 'fs';
import path from 'path';
import { Invoice, SalonData } from '@/types/salon';
import { format, parseISO } from 'date-fns';

export function formatIndianDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) {
      // Try dd-MM-yyyy or raw date
      return dateStr;
    }
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

let cachedLogoBase64: string | null = null;
let cachedFontBase64: string | null = null;

function getAssetsBase64() {
  if (!cachedLogoBase64) {
    try {
      const logoPath = path.join(process.cwd(), 'public', 'shree-logo-icon-transparent.png');
      if (fs.existsSync(logoPath)) {
        cachedLogoBase64 = fs.readFileSync(logoPath).toString('base64');
      } else {
        const altLogoPath = path.join(process.cwd(), 'public', 'shree-logo-icon-dark-hd.png');
        if (fs.existsSync(altLogoPath)) {
          cachedLogoBase64 = fs.readFileSync(altLogoPath).toString('base64');
        }
      }
    } catch (e) {
      console.error('Error loading logo base64:', e);
    }
  }

  if (!cachedFontBase64) {
    try {
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'GreatVibes.ttf');
      if (fs.existsSync(fontPath)) {
        cachedFontBase64 = fs.readFileSync(fontPath).toString('base64');
      } else {
        const altFontPath = path.join(process.cwd(), 'public', 'fonts', 'Allura.ttf');
        if (fs.existsSync(altFontPath)) {
          cachedFontBase64 = fs.readFileSync(altFontPath).toString('base64');
        }
      }
    } catch (e) {
      console.error('Error loading font base64:', e);
    }
  }

  return {
    logoBase64: cachedLogoBase64 || '',
    fontBase64: cachedFontBase64 || '',
  };
}

export function buildReceiptHtml(inv: Invoice, salonData?: SalonData): string {
  const { logoBase64, fontBase64 } = getAssetsBase64();

  // Salon defaults matching reference exactly
  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Near Cancer Hospital, Katargam, Surat - 395004';
  const salonEmail = salonData?.settings?.email || 'shreebeauty.studio22@gmail.com';
  const salonPhone =
    salonData?.settings?.phone && salonData?.settings?.whatsapp
      ? `${salonData.settings.whatsapp}, ${salonData.settings.phone}`
      : '9824183769, 9825339924';

  const invNo = (inv.no || '').replace(/^INV-/, '');
  const invDate = formatIndianDate(inv.date);
  const customerName = inv.customer || '';
  const customerPhone = inv.mobile || '';
  const eventDate = inv.eventDate ? formatIndianDate(inv.eventDate) : (inv.appointmentDate ? formatIndianDate(inv.appointmentDate) : '');
  const venue = inv.venue || '';

  // Lines
  const lines = inv.lines || [];
  const linesHtml = lines.map((l) => {
    const qty = Number(l.qty) || 1;
    const price = Number(l.price) || 0;
    const gross = qty * price;
    const disc = Number(l.discount) || 0;
    const discAmt = disc > 0 ? (l.discountType === '%' ? (gross * disc) / 100 : disc) : 0;
    const lineTotal = Math.max(0, gross - discAmt);
    const serviceName = cleanServiceNameForBill(l.name) || 'Service';

    return `
      <tr>
        <td class="col-service">${serviceName}</td>
        <td class="col-qty">${qty}</td>
        <td class="col-price">${price.toLocaleString('en-IN')}</td>
        <td class="col-total">${lineTotal.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  // Totals
  const totalAmt = Number(inv.total || 0);
  const advanceAmt = Number(inv.advance || 0);
  const discountAmt = Number(inv.discount || 0);
  const paymentPaid = Number(inv.paid || 0);
  const balanceDue = Number(
    inv.balance !== undefined
      ? inv.balance
      : Math.max(0, totalAmt - advanceAmt)
  );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Great Vibes';
    font-style: normal;
    font-weight: 400;
    src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background: #ffffff;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #111111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    width: 400px;
    margin: 0 auto;
  }

  #receipt-container {
    width: 400px;
    background: #ffffff;
    padding: 24px 24px 28px 24px;
    margin: 0 auto;
  }

  /* Logo: Eyelash + floating hearts, clean icon without text */
  .logo-img {
    width: 200px;
    max-width: 200px;
    height: auto;
    display: block;
    margin: 0 auto 4px auto;
  }

  /* Studio Name: Script font ~46px, dark teal #012a2a, bold, with text stroke */
  .studio-name {
    font-family: 'Great Vibes', 'Allura', cursive;
    font-size: 46px;
    font-weight: bold;
    color: #012a2a;
    -webkit-text-stroke: 0.8px #012a2a;
    text-align: center;
    line-height: 1.05;
    margin-top: 2px;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }

  /* Address: Centered, small grey text */
  .address-block {
    text-align: center;
    font-size: 11.5px;
    line-height: 1.45;
    color: #666666;
    margin-bottom: 14px;
  }

  .address-block p {
    margin: 1.5px 0;
  }

  /* Dashed horizontal line */
  .divider-dashed {
    border-top: 1px dashed #777777;
    margin: 14px 0 16px 0;
    width: 100%;
  }

  /* Info rows: 2-column, label bold ~90px, values right */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 13px;
    line-height: 1.4;
  }

  .info-table td {
    padding: 3.5px 0;
    vertical-align: top;
  }

  .info-table .label {
    width: 90px;
    font-weight: bold;
    color: #111111;
  }

  .info-table .value {
    color: #111111;
    font-weight: 500;
  }

  /* Services table: 1px dark borders, header light grey (#eee), bold, centered */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #111111;
    margin-bottom: 12px;
    font-size: 12.5px;
  }

  .items-table th {
    background: #eeeeee;
    border: 1px solid #111111;
    padding: 6px 4px;
    font-weight: bold;
    text-align: center;
    color: #111111;
    font-size: 11.5px;
    letter-spacing: 0.5px;
  }

  .items-table td {
    border: 1px solid #111111;
    padding: 6.5px 6px;
    color: #111111;
    vertical-align: middle;
  }

  .col-service { text-align: left; }
  .col-qty { text-align: center; width: 44px; }
  .col-price { text-align: center; width: 68px; }
  .col-total { text-align: center; width: 78px; font-weight: bold; }

  /* Summary table: full width, 2 columns, dark borders */
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #111111;
    margin-bottom: 22px;
    font-size: 13px;
  }

  .summary-table td {
    border: 1px solid #111111;
    padding: 6.5px 10px;
    color: #111111;
  }

  .summary-table .sum-label {
    background: #fafafa;
    text-align: left;
    width: 50%;
  }

  .summary-table .sum-value {
    text-align: right;
    font-weight: bold;
    width: 50%;
  }

  /* Footer centered */
  .footer-block {
    text-align: center;
    padding-top: 4px;
  }

  .footer-title {
    font-size: 18px;
    font-weight: bold;
    color: #111111;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .emoji {
    font-family: 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
    font-size: 18px;
  }

  .footer-subtitle {
    font-size: 10.5px;
    color: #666666;
    line-height: 1.4;
    max-width: 320px;
    margin: 0 auto;
  }
</style>
</head>
<body>
  <div id="receipt-container">
    <!-- 1. Centered Logo -->
    <img class="logo-img" src="data:image/png;base64,${logoBase64}" alt="Shree Beauty Studio" />

    <!-- 2. Studio name in elegant script font -->
    <div class="studio-name">Shree Beauty Studio</div>

    <!-- 3. Address block -->
    <div class="address-block">
      <p>${salonAddress}</p>
      <p>Email: ${salonEmail}</p>
      <p>Phone / WhatsApp: ${salonPhone}</p>
    </div>

    <!-- 4. Dashed line -->
    <div class="divider-dashed"></div>

    <!-- 5. Info rows -->
    <table class="info-table">
      <tr>
        <td class="label">Inv. No :</td>
        <td class="value">${invNo}</td>
      </tr>
      <tr>
        <td class="label">Date :</td>
        <td class="value">${invDate}</td>
      </tr>
      <tr>
        <td class="label">Name :</td>
        <td class="value">${customerName}</td>
      </tr>
      <tr>
        <td class="label">Phone :</td>
        <td class="value">${customerPhone}</td>
      </tr>
      <tr>
        <td class="label">Event :</td>
        <td class="value">${eventDate}</td>
      </tr>
      <tr>
        <td class="label">Venue :</td>
        <td class="value">${venue}</td>
      </tr>
    </table>

    <!-- 6. Services table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-service">SERVICE</th>
          <th class="col-qty">QTY</th>
          <th class="col-price">PRICE</th>
          <th class="col-total">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml || `
          <tr>
            <td class="col-service">Make Up</td>
            <td class="col-qty">1</td>
            <td class="col-price">35000</td>
            <td class="col-total">35,000</td>
          </tr>
        `}
      </tbody>
    </table>

    <!-- 7. Summary table -->
    <table class="summary-table">
      <tr>
        <td class="sum-label" style="font-weight: bold;">Total</td>
        <td class="sum-value">₹${totalAmt.toLocaleString('en-IN')}</td>
      </tr>
      ${discountAmt > 0 ? `
      <tr>
        <td class="sum-label">Discount</td>
        <td class="sum-value">-₹${discountAmt.toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      ${advanceAmt > 0 ? `
      <tr>
        <td class="sum-label">Advance</td>
        <td class="sum-value">₹${advanceAmt.toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      <tr>
        <td class="sum-label" style="font-weight: bold;">Payment</td>
        <td class="sum-value">₹${balanceDue.toLocaleString('en-IN')}</td>
      </tr>
    </table>

    <!-- 8. Footer -->
    <div class="footer-block">
      <div class="footer-title">
        Thank you for choosing us! <span class="emoji">🙏</span>
      </div>
      <div class="footer-subtitle">
        We truly value your trust and hope your experience was everything you imagined !!
      </div>
    </div>
  </div>
</body>
</html>`;
}
