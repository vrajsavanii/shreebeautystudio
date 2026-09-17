// scratch/test-wa-pdf-invoice.mjs
import { jsPDF } from 'jspdf';

const TOKEN = 'EAAPI3xAR034BSeVdf1LvJTdzKWPjbWKwVCaeF9v5alFqA2TIHvoe5QqdsE2N0Ei1Esz6bq0rydUm2RUAZC9EfhgtKni7P0QXukl0XDxtIcjhgZBM5VTR8JMd6WwbujDwT0vD0YmpEvYjE5xLBFQDPxXBlkmeoZBZBqTirrZB3lRtFoRK9TyLk0fHKR3SwbgZDZD';
const PHONE_ID = '1321601881035337';
const TO = '919601014899';

async function testPdfSend() {
  console.log(`Generating test PDF Invoice...`);
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(201, 151, 74); // Gold
  doc.text('SHREE BEAUTY STUDIO', 20, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat - 395004', 20, 32);
  doc.text('Phone: +91 97732 40010 | Web: shree-beauty-studio.vercel.app', 20, 38);

  // Line
  doc.setDrawColor(201, 151, 74);
  doc.setLineWidth(0.5);
  doc.line(20, 43, 190, 43);

  // Invoice Details
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text('TAX INVOICE / RECEIPT', 20, 53);

  doc.setFontSize(10);
  doc.text('Invoice No: INV-2026-0089', 20, 62);
  doc.text('Date: 16-Sep-2026', 20, 68);
  doc.text('Customer: Valued Client', 130, 62);
  doc.text('Mobile: +91 96010 14899', 130, 68);

  // Table header
  doc.setFillColor(245, 243, 238);
  doc.rect(20, 75, 170, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Item / Service', 25, 80);
  doc.text('Qty', 120, 80);
  doc.text('Price (INR)', 150, 80);

  // Table items
  doc.setFont('helvetica', 'normal');
  doc.text('1. Signature Bridal HD Makeup & Hairstyle', 25, 92);
  doc.text('1', 123, 92);
  doc.text('Rs. 15,000', 150, 92);

  doc.text('2. 24K Gold Radiance Facial Treatment', 25, 102);
  doc.text('1', 123, 102);
  doc.text('Rs. 1,500', 150, 102);

  doc.text('3. Premium Hair Spa & Keratin Boost', 25, 112);
  doc.text('1', 123, 112);
  doc.text('Rs. 2,200', 150, 112);

  // Line
  doc.line(20, 120, 190, 120);

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Amount:', 110, 130);
  doc.text('Rs. 18,700', 150, 130);

  doc.setFontSize(10);
  doc.text('Paid via UPI / Card:', 110, 138);
  doc.text('Rs. 18,700', 150, 138);

  doc.setTextColor(34, 197, 94); // Green
  doc.text('Payment Status: FULLY PAID', 110, 146);

  // Footer
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text('Thank you for visiting Shree Beauty Studio! We look forward to seeing you again.', 20, 180);

  const pdfBase64 = doc.output('datauristring');
  const base64Data = pdfBase64.split('base64,')[1];
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: 'application/pdf' });

  console.log('Uploading PDF to Meta Media API...');
  const fd = new FormData();
  fd.append('file', blob, 'Invoice_INV-2026-0089.pdf');
  fd.append('type', 'application/pdf');
  fd.append('messaging_product', 'whatsapp');

  const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fd
  });

  const uploadData = await uploadRes.json();
  console.log('Upload Result:', uploadData);

  if (!uploadData.id) {
    console.error('Media upload failed');
    return;
  }

  console.log(`Sending Document message to +${TO}...`);
  const msgRes = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TO,
      type: 'document',
      document: {
        id: uploadData.id,
        caption: '✨ *SHREE BEAUTY STUDIO — Official PDF Invoice #INV-2026-0089* ✨\nThank you for choosing Shree Beauty Studio! 💖',
        filename: 'Invoice_INV-2026-0089.pdf'
      }
    })
  });

  const msgData = await msgRes.json();
  console.log('Message Dispatch Status:', msgRes.status);
  console.log('Message Dispatch Response:', JSON.stringify(msgData, null, 2));
}

testPdfSend().catch(console.error);
