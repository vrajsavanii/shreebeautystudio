// lib/generate-pdf.ts
// Headless browser PDF generator using puppeteer-core + system Edge/Chrome
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { Invoice, SalonData } from '@/types/salon';
import { buildReceiptHtml } from './invoice-receipt-html';

const BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

export function findBrowserExecutable(): string {
  for (const p of BROWSER_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No compatible Chrome/Edge browser executable found on system.');
}

export async function generateInvoiceReceiptPdf(inv: Invoice, salonData?: SalonData): Promise<Buffer> {
  const executablePath = findBrowserExecutable();

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=medium',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800, deviceScaleFactor: 2 });

    const html = buildReceiptHtml(inv, salonData);
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');

    const contentHeight = await page.evaluate(() => {
      const el = document.getElementById('receipt-container') || document.body;
      return Math.ceil(el.getBoundingClientRect().height);
    });

    const pdfBuffer = await page.pdf({
      width: '400px',
      height: `${contentHeight}px`,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      pageRanges: '1',
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
