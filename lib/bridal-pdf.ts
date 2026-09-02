// lib/bridal-pdf.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BridalPackage, SalonData } from '@/types/salon';
import { DEFAULT_BRIDAL_PACKAGES } from './store';
import { SHREE_ONLY_LOGO_BASE64 } from './logo-base64';

/**
 * Check if the user has updated or customized any package prices/names
 */
export function isBridalPackagesCustomized(packagesList?: BridalPackage[]): boolean {
  if (!packagesList || packagesList.length !== DEFAULT_BRIDAL_PACKAGES.length) {
    return true;
  }
  for (const pkg of packagesList) {
    const defaultPkg = DEFAULT_BRIDAL_PACKAGES.find((d) => d.name === pkg.name || d.id === pkg.id);
    if (!defaultPkg) return true;
    if (Number(defaultPkg.price) !== Number(pkg.price)) return true;
    if (defaultPkg.name !== pkg.name) return true;
  }
  return false;
}

/**
 * Build Page 1: Siders Packages HTML Container for Dynamic PDF Generation
 */
function buildSidersPageHtml(sidersList: BridalPackage[], salonName: string): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '600px';
  container.style.height = '850px';
  container.style.background = 'linear-gradient(180deg, #053C43 0%, #032A30 100%)';
  container.style.color = '#ffffff';
  container.style.fontFamily = "'Montserrat', 'Segoe UI', Arial, sans-serif";
  container.style.padding = '40px 36px';
  container.style.boxSizing = 'border-box';

  const rowsHtml = sidersList
    .map(
      (s) => `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; font-size: 19px;">
        <span style="font-weight: 500; letter-spacing: 0.2px; white-space: nowrap; font-size: 19px;">${s.name}</span>
        <span style="flex: 1; border-bottom: 2px dashed rgba(255,255,255,0.4); margin: 0 12px; height: 12px;"></span>
        <span style="font-weight: 800; font-size: 20px; white-space: nowrap; font-family: monospace;">${s.price}/-</span>
      </div>
    `
    )
    .join('');

  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <!-- Logo Circle -->
      <img src="${SHREE_ONLY_LOGO_BASE64}" alt="${salonName}" style="width: 84px; height: 84px; border-radius: 50%; border: 3px solid #EABA38; margin: 0 auto 10px; display: block; box-shadow: 0 6px 18px rgba(0,0,0,0.3);" />
      
      <!-- Cursive Studio Title -->
      <div style="font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 32px; color: #ffffff; letter-spacing: 1px; margin-bottom: 8px;">
        Shree Beauty Studio
      </div>
      
      <!-- Section Title -->
      <div style="font-size: 22px; font-weight: 800; color: #80EEEE; letter-spacing: 0.5px; margin-bottom: 4px;">
        The Glamour Lounge
      </div>
      <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
        Siders Packages
      </div>
      <div style="width: 220px; height: 2px; background: rgba(255,255,255,0.3); margin: 16px auto;"></div>
    </div>

    <!-- Tagline -->
    <div style="text-align: center; font-size: 15px; color: #e0f2fe; margin-bottom: 36px; font-weight: 400; line-height: 1.4;">
      1-Time package with makeup, hairstyle and draping.
    </div>

    <!-- Package Dotted Price List -->
    <div style="max-width: 520px; margin: 0 auto;">
      ${rowsHtml}
    </div>

    <!-- Footer Note -->
    <div style="position: absolute; bottom: 24px; left: 0; right: 0; text-align: center; font-size: 11px; color: rgba(255,255,255,0.6);">
      ✨ Shree Beauty Studio · Premium Bridal & Event Lounge
    </div>
  `;

  return container;
}

/**
 * Build Page 2: Bridal Packages HTML Container for Dynamic PDF Generation
 */
function buildBridalPageHtml(bridalList: BridalPackage[], salonName: string): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '600px';
  container.style.height = '850px';
  container.style.background = 'linear-gradient(180deg, #053C43 0%, #032A30 100%)';
  container.style.color = '#ffffff';
  container.style.fontFamily = "'Montserrat', 'Segoe UI', Arial, sans-serif";
  container.style.padding = '40px 36px';
  container.style.boxSizing = 'border-box';

  const rowsHtml = bridalList
    .map(
      (s) => `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; font-size: 19px;">
        <span style="font-weight: 500; letter-spacing: 0.2px; white-space: nowrap; font-size: 19px;">${s.name}</span>
        <span style="flex: 1; border-bottom: 2px dashed rgba(255,255,255,0.4); margin: 0 12px; height: 12px;"></span>
        <span style="font-weight: 800; font-size: 20px; white-space: nowrap; font-family: monospace;">${s.price}/-</span>
      </div>
    `
    )
    .join('');

  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <!-- Logo Circle -->
      <img src="${SHREE_ONLY_LOGO_BASE64}" alt="${salonName}" style="width: 84px; height: 84px; border-radius: 50%; border: 3px solid #EABA38; margin: 0 auto 10px; display: block; box-shadow: 0 6px 18px rgba(0,0,0,0.3);" />
      
      <!-- Cursive Studio Title -->
      <div style="font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 32px; color: #ffffff; letter-spacing: 1px; margin-bottom: 8px;">
        Shree Beauty Studio
      </div>
      
      <!-- Section Title -->
      <div style="font-size: 22px; font-weight: 800; color: #80EEEE; letter-spacing: 0.5px; margin-bottom: 4px;">
        The Glamour Lounge
      </div>
      <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
        Bridal Packages
      </div>
      <div style="width: 220px; height: 2px; background: rgba(255,255,255,0.3); margin: 16px auto;"></div>
    </div>

    <!-- Tagline -->
    <div style="text-align: center; font-size: 14.5px; color: #e0f2fe; margin-bottom: 30px; font-weight: 400; line-height: 1.5; padding: 0 10px;">
      3-session package with makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping.
    </div>

    <!-- Package Dotted Price List -->
    <div style="max-width: 520px; margin: 0 auto;">
      ${rowsHtml}
    </div>

    <!-- Footer Note -->
    <div style="position: absolute; bottom: 24px; left: 0; right: 0; text-align: center; font-size: 11px; color: rgba(255,255,255,0.6);">
      ✨ Shree Beauty Studio · Premium Bridal & Event Lounge
    </div>
  `;

  return container;
}

/**
 * Dynamically Generate 2-Page High-Res PDF Blob for Updated Prices
 */
export async function generateBridalRateCardPDFBlob(
  packagesList: BridalPackage[],
  salonData?: SalonData
): Promise<{ pdf: jsPDF; filename: string }> {
  const salonName = salonData?.settings?.salon || 'Shree Beauty Studio';
  const filename = `${salonName.replace(/\s+/g, '_')}_Bridal_Rate_Card.pdf`;

  const sidersList = packagesList.filter((p) => p.type === 'Siders Package');
  const bridalList = packagesList.filter((p) => p.type === 'Bridal Package');

  const sidersContainer = buildSidersPageHtml(sidersList, salonName);
  const bridalContainer = buildBridalPageHtml(bridalList, salonName);

  document.body.appendChild(sidersContainer);
  document.body.appendChild(bridalContainer);

  try {
    const canvas1 = await html2canvas(sidersContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#053C43',
    });

    const canvas2 = await html2canvas(bridalContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#053C43',
    });

    const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
    const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Add Page 1 (Siders)
    pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Add Page 2 (Bridal)
    pdf.addPage();
    pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    return { pdf, filename };
  } finally {
    document.body.removeChild(sidersContainer);
    document.body.removeChild(bridalContainer);
  }
}

/**
 * Download Bridal & Siders Rate Card PDF:
 * - If prices are unchanged: Downloads the 100% exact original uploaded PDF file.
 * - If prices are updated: Dynamically generates the PDF with updated prices.
 */
export async function downloadBridalRateCardPDF(
  packagesList?: BridalPackage[],
  salonData?: SalonData
): Promise<void> {
  const isCustom = isBridalPackagesCustomized(packagesList);

  if (!isCustom) {
    // Exact 100% original uploaded PDF file
    const link = document.createElement('a');
    link.href = '/shree-bridal-rate-card.pdf';
    link.download = 'Shree_Beauty_Studio_Bridal_Rate_Card.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Prices modified by user: Dynamically generate PDF with new prices
    const { pdf, filename } = await generateBridalRateCardPDFBlob(packagesList || [], salonData);
    pdf.save(filename);
  }
}

/**
 * Send the Bridal Rate Card PDF to a customer's WhatsApp via Meta Cloud API:
 * - If prices are unchanged: Sends the 100% exact original uploaded PDF file.
 * - If prices are updated: Dynamically generates the PDF with new prices and sends that.
 */
export async function sendBridalRateCardPDFViaWhatsApp(
  packagesList: BridalPackage[],
  targetMobile: string,
  targetName?: string,
  salonData?: SalonData
): Promise<{ success: boolean; method: string; message: string; notConfigured?: boolean }> {
  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const cleanMobile = (targetMobile || '').replace(/\D/g, '');

  if (!cleanMobile) {
    return {
      success: false,
      method: 'none',
      message: 'Customer mobile number is missing or invalid.',
    };
  }

  try {
    let pdfBase64 = '';
    const isCustom = isBridalPackagesCustomized(packagesList);

    if (!isCustom) {
      // Fetch exact 100% original uploaded PDF file
      const resPdf = await fetch('/shree-bridal-rate-card.pdf');
      if (!resPdf.ok) {
        throw new Error(`Failed to load original PDF file (${resPdf.status})`);
      }
      const blob = await resPdf.blob();
      pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Dynamic PDF generation with updated prices
      const { pdf } = await generateBridalRateCardPDFBlob(packagesList, salonData);
      pdfBase64 = pdf.output('datauristring').split(',')[1];
    }

    const recipientName = targetName || 'Valued Client';
    const messageCaption = `👑 *SHREE BEAUTY STUDIO — BRIDAL & SIDERS PACKAGES* 👑\n\nDear ${recipientName},\nAttached is our official Bridal & Siders Package Price List.\n\n✨ *Bridal Packages* include Makeup, Hairstyle, Jewellery, Lenses, Extensions, Eyelashes & Draping.\n✨ *Siders Packages* include Makeup, Hairstyle & Draping.\n\n📞 Booking WhatsApp: +${salonData?.settings?.whatsapp || '919824183769'}\n💖 *Thank you for choosing ${salon}!*`;

    const res = await fetch('/api/whatsapp/send-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: cleanMobile,
        pdfBase64,
        filename: 'Shree_Beauty_Studio_Bridal_Rate_Card.pdf',
        caption: messageCaption,
      }),
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      method: 'none',
      message: err?.message || 'Error fetching or sending Bridal PDF',
    };
  }
}
