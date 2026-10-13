// components/billing/InvoiceReceiptModal.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Printer,
  Download,
  MessageCircle,
  MessageSquare,
  CheckCircle2,
  Share2,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  Mail,
  Send,
  Copy,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import { Invoice, SalonData } from '@/types/salon';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';
import {
  downloadInvoicePDF,
  formatIndianDate,
  sendInvoicePDFViaWhatsApp,
  sendInvoiceTextViaWhatsApp,
  cleanServiceNameForBill,
  shareInvoicePDFViaDirectWhatsApp,
  buildPublicInvoiceMessage,
} from '@/lib/invoice-pdf';
import { isCustomerIn24HourWindow } from '@/lib/whatsapp';
import ReceptionDeskQRModal from '@/components/whatsapp/ReceptionDeskQRModal';
import { money, fmtExpiry } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';


type WAStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'not_configured';
type WAResult = {
  status: WAStatus;
  message: string;
  isPaymentRequired?: boolean;
  paymentUrl?: string;
};
type EmailResult = { status: 'idle' | 'sending' | 'sent' | 'failed'; message: string };

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  salonData?: SalonData;
}

export default function InvoiceReceiptModal({
  isOpen,
  onClose,
  invoice,
  salonData,
}: InvoiceReceiptModalProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<'thermal' | 'a4' | null>(null);
  const [waResult, setWaResult] = useState<WAResult>({ status: 'idle', message: '' });
  const [waPdfResult, setWaPdfResult] = useState<WAResult>({ status: 'idle', message: '' });
  const [waTextResult, setWaTextResult] = useState<WAResult>({ status: 'idle', message: '' });
  const [emailResult, setEmailResult] = useState<EmailResult>({ status: 'idle', message: '' });
  const [emailFallback, setEmailFallback] = useState<{
    targetEmail: string;
    gmailUrl: string;
    mailtoUrl: string;
    subject: string;
    body: string;
    isDomainRestriction?: boolean;
  } | null>(null);
  const [receptionQRModalOpen, setReceptionQRModalOpen] = useState(false);

  if (!isOpen || !invoice) return null;

  const cust24h = isCustomerIn24HourWindow(invoice.mobile, salonData);

  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Near Cancer Hospital, Katargam, Surat - 395004';
  const salonPhone =
    salonData?.settings?.phone && salonData?.settings?.whatsapp
      ? `${salonData.settings.whatsapp}, ${salonData.settings.phone}`
      : '9824183769, 9825339924';
  const salonEmail = salonData?.settings?.email || 'shreebeauty.studio22@gmail.com';

  const invNo = invoice.no.replace(/^INV-/, '');
  const invDate = formatIndianDate(invoice.date);
  const eventDate = invoice.eventDate ? formatIndianDate(invoice.eventDate) : (invoice.appointmentDate ? formatIndianDate(invoice.appointmentDate) : '');

  const totalAmt = Number(invoice.total || 0);
  const advanceAmt = Number(invoice.advance || 0);
  const discountAmt = Number(invoice.discount || 0);
  const paymentPaid = Number(invoice.paid || 0);
  const balanceDue = Number(
    invoice.balance !== undefined
      ? invoice.balance
      : Math.max(0, totalAmt - advanceAmt)
  );

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const res = await fetch(`/api/billing/${invoice.id || '105'}/pdf`);
      if (!res.ok) throw new Error('PDF generation failed on server');
      const blob = await res.blob();
      const rawCustomerName = (invoice.customer || 'invoice').trim();
      const cleanCustomerName = rawCustomerName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
      const filename = `${cleanCustomerName || 'invoice'}.pdf`;

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast(`✅ Bill PDF (${filename}) downloaded successfully!`);
    } catch (e: any) {
      toast(`PDF download error: ${e.message}`, 'error');
    } finally {
      setDownloading(false);
      setDownloadingFormat(null);
    }
  };

  const buildRichInvoiceMessage = () => {
    if (!invoice) return '';
    const linesList = (invoice.lines || [])
      .map((l: any) => `• ${cleanServiceNameForBill(l.name)} (${l.qty || 1}x) : ${money(l.price * (l.qty || 1))}`)
      .join('\n');
    return `✨ *${salon.toUpperCase()} — INVOICE #${invoice.no}* ✨
────────────────────────────
Dear ${invoice.customer || 'Valued Customer'},
Thank you for visiting ${salon}! 💖

📄 *Invoice No:* ${invoice.no}
📅 *Date:* ${invDate}
💳 *Payment Mode:* ${invoice.mode || 'GPay UPI'}

*Services & Items:*
${linesList || '• Salon Service'}

────────────────────────────
*Total Bill:* ${money(totalAmt)}
*Amount Paid:* ${money(paymentPaid + advanceAmt)}
*Balance Due:* ${money(balanceDue)}
────────────────────────────

📍 ${salonAddress}
📞 +91 98241 83769
Have a wonderful day! 🙏✨`;
  };

  const handleDirectWhatsApp = () => {
    if (!invoice.mobile) {
      toast('No mobile number on this invoice.', 'error');
      return;
    }
    const cleanDigits = (invoice.mobile || '').replace(/\D/g, '').slice(-10);
    const invoiceText = buildPublicInvoiceMessage(invoice, salonData);
    if (cleanDigits.length === 10) {
      window.open(`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(invoiceText)}`, '_blank');
      setWaResult({ status: 'sent', message: '📱 Opening WhatsApp with bill & PDF link...' });
      toast('📱 Opening WhatsApp with bill & PDF link...', 'info');
      setTimeout(() => setWaResult({ status: 'idle', message: '' }), 5000);
    } else {
      toast('Invalid 10-digit mobile number on invoice.', 'error');
    }
  };

  const handleSendWhatsAppPDF = async () => {
    if (!invoice.mobile) {
      setWaPdfResult({ status: 'failed', message: 'No mobile number on this invoice.' });
      setWaResult({ status: 'failed', message: 'No mobile number on this invoice.' });
      toast('No mobile number on this invoice.', 'error');
      setTimeout(() => {
        setWaPdfResult({ status: 'idle', message: '' });
        setWaResult({ status: 'idle', message: '' });
      }, 4000);
      return;
    }

    setWaPdfResult({ status: 'sending', message: 'Sending bill PDF via WhatsApp…' });
    setWaResult({ status: 'sending', message: 'Sending bill PDF via WhatsApp…' });

    try {
      const res = await fetch(`/api/billing/${invoice.id || invoice.no || '105'}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice, salonData }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaPdfResult({ status: 'sent', message: data.message || 'Bill PDF sent on WhatsApp!' });
        setWaResult({ status: 'sent', message: data.message || 'Bill PDF sent on WhatsApp!' });
        toast(data.message || 'Bill PDF sent on WhatsApp!');
        setTimeout(() => {
          setWaPdfResult({ status: 'idle', message: '' });
          setWaResult({ status: 'idle', message: '' });
        }, 5000);
      } else {
        if (data.directWaUrl) {
          window.open(data.directWaUrl, '_blank');
          setWaPdfResult({ status: 'sent', message: 'Opened WhatsApp with bill message.' });
          setWaResult({ status: 'sent', message: 'Opened WhatsApp with bill message.' });
          toast(data.message || 'Opening WhatsApp with bill message…', 'info');
          setTimeout(() => {
            setWaPdfResult({ status: 'idle', message: '' });
            setWaResult({ status: 'idle', message: '' });
          }, 5000);
        } else {
          const errMsg = data.error || data.message || 'WhatsApp PDF send failed.';
          setWaPdfResult({ status: 'failed', message: errMsg });
          setWaResult({ status: 'failed', message: errMsg });
          toast(errMsg, 'error');
        }
      }
    } catch (e: any) {
      const errMsg = e?.message || 'Unexpected error while sending WhatsApp PDF.';
      setWaPdfResult({ status: 'failed', message: errMsg });
      setWaResult({ status: 'failed', message: errMsg });
      toast(errMsg, 'error');
    }
  };

  const handleSendWhatsAppText = async () => {
    if (!invoice.mobile) {
      setWaTextResult({ status: 'failed', message: 'No mobile number on this invoice.' });
      setWaResult({ status: 'failed', message: 'No mobile number on this invoice.' });
      setTimeout(() => {
        setWaTextResult({ status: 'idle', message: '' });
        setWaResult({ status: 'idle', message: '' });
      }, 4000);
      return;
    }

    setWaTextResult({ status: 'sending', message: 'Sending official text receipt via Meta API…' });
    setWaResult({ status: 'sending', message: 'Sending official text receipt via Meta API…' });

    try {
      const res = await sendInvoiceTextViaWhatsApp(invoice, salonData);
      if (res.success) {
        setWaTextResult({ status: 'sent', message: res.message });
        setWaResult({ status: 'sent', message: res.message });
        toast(res.message);
        setTimeout(() => {
          setWaTextResult({ status: 'idle', message: '' });
          setWaResult({ status: 'idle', message: '' });
        }, 5000);
      } else {
        const isPayment = res.isPaymentRequired;
        const msg = isPayment
          ? 'Meta requires a payment method on your WhatsApp account before automated delivery. Use Direct WA below.'
          : res.message || 'WhatsApp text delivery failed.';
        setWaTextResult({
          status: 'failed',
          message: msg,
          isPaymentRequired: isPayment,
          paymentUrl: res.paymentUrl,
        });
        setWaResult({
          status: 'failed',
          message: msg,
          isPaymentRequired: isPayment,
          paymentUrl: res.paymentUrl,
        });
        toast(msg, 'error');
      }
    } catch (e: any) {
      const errMsg = e?.message || 'Unexpected error while sending WhatsApp text receipt.';
      setWaTextResult({ status: 'failed', message: errMsg });
      setWaResult({ status: 'failed', message: errMsg });
      toast(errMsg, 'error');
    }
  };

  const handleSendEmail = async () => {
    const cust = (salonData?.customers || []).find((c: any) => c.mobile === invoice.mobile);
    let targetEmail = cust?.email;

    if (!targetEmail) {
      const inputEmail = window.prompt(`Enter customer email address for ${invoice.customer}:`, '');
      if (!inputEmail || !inputEmail.includes('@')) {
        if (inputEmail) toast('Invalid email address entered.', 'error');
        return;
      }
      targetEmail = inputEmail.trim();
    }

    setEmailResult({ status: 'sending', message: `Sending invoice email to ${targetEmail}…` });
    const invoiceEmailSubject = `📄 Official Invoice #${invoice.no} from ${salon}`;
    const invoiceSummaryText = buildRichInvoiceMessage();
    const defaultGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${encodeURIComponent(invoiceEmailSubject)}&body=${encodeURIComponent(invoiceSummaryText)}`;
    const defaultMailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(invoiceEmailSubject)}&body=${encodeURIComponent(invoiceSummaryText)}`;

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          to: targetEmail,
          subject: invoiceEmailSubject,
          data: {
            customerName: invoice.customer,
            invoiceNo: invoice.no,
            date: invoice.date,
            total: invoice.total,
            mode: invoice.mode,
            lines: invoice.lines,
            salonName: salon,
          },
          apiKey: salonData?.settings?.resendApiKey,
          fromEmail: salonData?.settings?.resendFromEmail,
          replyTo: 'shreebeauty.studio22@gmail.com',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailResult({ status: 'sent', message: `✅ Invoice successfully emailed to ${targetEmail}!` });
        toast(`✅ Invoice successfully emailed to ${targetEmail}!`);
        setEmailFallback(null);
        setTimeout(() => setEmailResult({ status: 'idle', message: '' }), 5000);
      } else {
        const finalGmailUrl = data.fallback?.gmailUrl || defaultGmailUrl;
        const finalMailtoUrl = data.fallback?.mailtoUrl || defaultMailtoUrl;

        setEmailFallback({
          targetEmail,
          gmailUrl: finalGmailUrl,
          mailtoUrl: finalMailtoUrl,
          subject: invoiceEmailSubject,
          body: invoiceSummaryText,
          isDomainRestriction: false,
        });

        setEmailResult({ status: 'idle', message: '' });
        toast('Click below to dispatch invoice via Gmail or Mail app.', 'info');
      }
    } catch {
      setEmailFallback({
        targetEmail,
        gmailUrl: defaultGmailUrl,
        mailtoUrl: defaultMailtoUrl,
        subject: invoiceEmailSubject,
        body: invoiceSummaryText,
        isDomainRestriction: false,
      });
      setEmailResult({ status: 'idle', message: '' });
      toast('Click below to open Gmail or your default email app to dispatch.', 'info');
    }
  };

  const handlePrint = async () => {
    // Direct print via hidden iframe with exact server template
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    try {
      const res = await fetch(`/api/billing/${invoice.id || invoice.no || '105'}/preview`);
      if (res.ok) {
        const html = await res.text();
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
              if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 2500);
          }, 350);
          return;
        }
      }
    } catch (e) {
      console.warn('Preview print fetch error:', e);
    }

    const printContent = document.getElementById('shree-invoice-sample-template');
    if (!printContent) {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      window.print();
      return;
    }

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${invoice.no} - ${invoice.customer}</title>
            <style>
              @page { size: auto; margin: 0mm !important; }
              * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              body { margin: 0; padding: 0; background: #fff; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; }
              .print-container { width: 400px; margin: 0 auto; padding: 24px 24px 28px 24px; box-sizing: border-box; }
            </style>
          </head>
          <body>
            <div class="print-container">${printContent.innerHTML}</div>
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 2500);
      }, 300);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: 580,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #023d38 0%, #0d544c 100%)',
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                Bill Generated &amp; Sent!
              </div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>
                Invoice #{invoice.no} • {invoice.customer}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Receipt Body with EXACT User Sample Layout */}
        {/* Scrollable Receipt Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            background: '#f8fafc',
          }}
        >
          <div
            id="shree-invoice-sample-template"
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '24px 24px 28px 24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid #111111',
              fontFamily:
                "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
              color: '#111111',
              width: 400,
              maxWidth: 400,
              margin: '0 auto',
            }}
          >
            {/* 1. Top Centered Logo (Clean icon without text) */}
            <img
              src={SHREE_ONLY_LOGO_BASE64}
              alt="Shree Beauty Studio Logo"
              style={{
                width: 200,
                maxWidth: 200,
                height: 'auto',
                display: 'block',
                margin: '0 auto 4px auto',
              }}
            />

            {/* 2. Studio Name in script font */}
            <div
              style={{
                fontFamily: "'Great Vibes', 'Allura', cursive",
                fontSize: 46,
                fontWeight: 'bold',
                color: '#012a2a',
                WebkitTextStroke: '0.8px #012a2a',
                textAlign: 'center',
                lineHeight: 1.05,
                marginTop: 2,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              Shree Beauty Studio
            </div>

            {/* 3. Address block */}
            <div
              style={{
                textAlign: 'center',
                fontSize: 11.5,
                lineHeight: 1.45,
                color: '#666666',
                marginBottom: 14,
              }}
            >
              <p style={{ margin: '1.5px 0' }}>{salonAddress}</p>
              <p style={{ margin: '1.5px 0' }}>Email: {salonEmail}</p>
              <p style={{ margin: '1.5px 0' }}>Phone / WhatsApp: {salonPhone}</p>
            </div>

            {/* 4. Dashed line */}
            <div style={{ borderTop: '1px dashed #777777', margin: '14px 0 16px 0', width: '100%' }} />

            {/* 5. Info rows */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: 16,
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ width: 90, padding: '3.5px 0', fontWeight: 700, color: '#111111' }}>
                    Inv. No :
                  </td>
                  <td style={{ padding: '3.5px 0', fontWeight: 500, color: '#111111' }}>
                    {invNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 90, padding: '3.5px 0', fontWeight: 700, color: '#111111' }}>
                    Date :
                  </td>
                  <td style={{ padding: '3.5px 0', fontWeight: 500, color: '#111111' }}>
                    {invDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 90, padding: '3.5px 0', fontWeight: 700, color: '#111111' }}>
                    Name :
                  </td>
                  <td style={{ padding: '3.5px 0', fontWeight: 500, color: '#111111' }}>
                    {invoice.customer || ''}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 90, padding: '3.5px 0', fontWeight: 700, color: '#111111' }}>
                    Phone :
                  </td>
                  <td style={{ padding: '3.5px 0', fontWeight: 500, color: '#111111' }}>
                    {invoice.mobile || ''}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 90, padding: '3.5px 0', fontWeight: 700, color: '#111111' }}>
                    Event :
                  </td>
                  <td style={{ padding: '3.5px 0', fontWeight: 500, color: '#111111' }}>
                    {eventDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 90, padding: '3.5px 0', fontWeight: 700, color: '#111111' }}>
                    Venue :
                  </td>
                  <td style={{ padding: '3.5px 0', fontWeight: 500, color: '#111111' }}>
                    {invoice.venue || ''}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 6. Services Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #111111',
                marginBottom: 12,
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr style={{ background: '#eeeeee' }}>
                  <th
                    style={{
                      border: '1px solid #111111',
                      padding: '6px 4px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#111111',
                      letterSpacing: 0.5,
                    }}
                  >
                    SERVICE
                  </th>
                  <th
                    style={{
                      border: '1px solid #111111',
                      padding: '6px 4px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      textAlign: 'center',
                      width: 44,
                      color: '#111111',
                      letterSpacing: 0.5,
                    }}
                  >
                    QTY
                  </th>
                  <th
                    style={{
                      border: '1px solid #111111',
                      padding: '6px 4px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      textAlign: 'center',
                      width: 68,
                      color: '#111111',
                      letterSpacing: 0.5,
                    }}
                  >
                    PRICE
                  </th>
                  <th
                    style={{
                      border: '1px solid #111111',
                      padding: '6px 4px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      textAlign: 'center',
                      width: 78,
                      color: '#111111',
                      letterSpacing: 0.5,
                    }}
                  >
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lines || []).map((l, idx) => {
                  const qty = Number(l.qty) || 1;
                  const price = Number(l.price) || 0;
                  const gross = qty * price;
                  const disc = Number(l.discount || 0);
                  const discAmt =
                    disc > 0
                      ? l.discountType === '%'
                        ? (gross * disc) / 100
                        : disc
                      : 0;
                  const lineTotal = Math.max(0, gross - discAmt);

                  return (
                    <tr key={idx}>
                      <td
                        style={{
                          border: '1px solid #111111',
                          padding: '6.5px 6px',
                          textAlign: 'left',
                          color: '#111111',
                        }}
                      >
                        {cleanServiceNameForBill(l.name)}
                      </td>
                      <td
                        style={{
                          border: '1px solid #111111',
                          padding: '6.5px 6px',
                          textAlign: 'center',
                          color: '#111111',
                        }}
                      >
                        {qty}
                      </td>
                      <td
                        style={{
                          border: '1px solid #111111',
                          padding: '6.5px 6px',
                          textAlign: 'center',
                          color: '#111111',
                        }}
                      >
                        {price.toLocaleString('en-IN')}
                      </td>
                      <td
                        style={{
                          border: '1px solid #111111',
                          padding: '6.5px 6px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#111111',
                        }}
                      >
                        {lineTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 7. Summary Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #111111',
                marginBottom: 22,
                fontSize: 13,
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      border: '1px solid #111111',
                      padding: '6.5px 10px',
                      background: '#fafafa',
                      fontWeight: 700,
                      width: '50%',
                      color: '#111111',
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      border: '1px solid #111111',
                      padding: '6.5px 10px',
                      textAlign: 'right',
                      fontWeight: 700,
                      width: '50%',
                      color: '#111111',
                    }}
                  >
                    ₹{totalAmt.toLocaleString('en-IN')}
                  </td>
                </tr>
                {discountAmt > 0 && (
                  <tr>
                    <td
                      style={{
                        border: '1px solid #111111',
                        padding: '6.5px 10px',
                        background: '#fafafa',
                        width: '50%',
                        color: '#111111',
                      }}
                    >
                      Discount
                    </td>
                    <td
                      style={{
                        border: '1px solid #111111',
                        padding: '6.5px 10px',
                        textAlign: 'right',
                        fontWeight: 700,
                        width: '50%',
                        color: '#111111',
                      }}
                    >
                      -₹{discountAmt.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
                {advanceAmt > 0 && (
                  <tr>
                    <td
                      style={{
                        border: '1px solid #111111',
                        padding: '6.5px 10px',
                        background: '#fafafa',
                        width: '50%',
                        color: '#111111',
                      }}
                    >
                      Advance
                    </td>
                    <td
                      style={{
                        border: '1px solid #111111',
                        padding: '6.5px 10px',
                        textAlign: 'right',
                        width: '50%',
                        color: '#111111',
                      }}
                    >
                      ₹{advanceAmt.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    style={{
                      border: '1px solid #111111',
                      padding: '6.5px 10px',
                      background: '#fafafa',
                      fontWeight: 700,
                      width: '50%',
                      color: '#111111',
                    }}
                  >
                    Payment
                  </td>
                  <td
                    style={{
                      border: '1px solid #111111',
                      padding: '6.5px 10px',
                      textAlign: 'right',
                      fontWeight: 700,
                      width: '50%',
                      color: '#111111',
                    }}
                  >
                    ₹{balanceDue.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 8. Footer */}
            <div style={{ textAlign: 'center', paddingTop: 4 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#111111',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                Thank you for choosing us! <span>🙏</span>
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: '#666666',
                  lineHeight: 1.4,
                  maxWidth: 320,
                  margin: '0 auto',
                }}
              >
                We truly value your trust and hope your experience was everything you imagined !!
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div
          style={{
            padding: '14px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Status feedback bar if any */}
          {((waResult.message && waResult.status !== 'idle') || (emailResult.message && emailResult.status !== 'idle')) && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '7px 12px',
                borderRadius: 8,
                background:
                  waResult.status === 'sent' || emailResult.status === 'sent'
                    ? '#dcfce7'
                    : waResult.status === 'sending' || emailResult.status === 'sending'
                    ? '#e0f2fe'
                    : '#fee2e2',
                color:
                  waResult.status === 'sent' || emailResult.status === 'sent'
                    ? '#15803d'
                    : waResult.status === 'sending' || emailResult.status === 'sending'
                    ? '#0369a1'
                    : '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {waResult.message || emailResult.message}
            </div>
          )}

          {/* Email Fallback Card for Seamless Dispatch */}
          {emailFallback && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1.5px solid #FECACA',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#991B1B' }}>
                  <AlertCircle size={15} color="#DC2626" />
                  <span>Dispatch Invoice via Email</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailFallback(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#991B1B',
                    padding: 2,
                  }}
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ fontSize: 11.5, color: '#7F1D1D', lineHeight: 1.45 }}>
                Send official pre-formatted invoice receipt directly to <b>{emailFallback.targetEmail}</b>:
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <a
                  href={emailFallback.gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: '#EA4335',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 11.5,
                    padding: '7px 12px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Mail size={13} /> Open in Gmail Compose
                </a>

                <a
                  href={emailFallback.mailtoUrl}
                  className="btn btn-sm"
                  style={{
                    background: '#05424A',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 11.5,
                    padding: '7px 12px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Send size={13} /> Open Mail App
                </a>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(emailFallback.body);
                    toast('📋 Invoice email body copied to clipboard!');
                  }}
                  className="btn btn-sm"
                  style={{
                    background: '#ffffff',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    fontWeight: 600,
                    fontSize: 11.5,
                    padding: '7px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Copy size={13} /> Copy Email Body
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp Payment Requirement Alert */}
          {(waResult.isPaymentRequired || (waResult.status === 'failed' && salonData?.settings?.whatsappPaymentIssue)) && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fca5a5',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 12,
                fontSize: 12,
                color: '#991b1b',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={16} color="#dc2626" />
                <span>Meta WhatsApp Action Required: Add Payment Method</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#7f1d1d', lineHeight: 1.45, marginBottom: 10 }}>
                Meta Cloud API has temporarily paused automated messages because no payment method is linked to your WhatsApp Business Account (ID: 3350176545369989). Add a payment method on Meta, or use Direct WA below.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={
                    waResult.paymentUrl ||
                    salonData?.settings?.whatsappPaymentIssue?.href ||
                    'https://business.facebook.com/billing_hub/accounts/details/?business_id=2541939702957992&asset_id=3350176545369989&wizard_name=ADD_PM&account_type=whatsapp-business-account'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 11.5,
                    padding: '7px 12px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 2px 6px rgba(220,38,38,0.3)',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>💳 Add Payment Method on Meta</span>
                </a>
                {invoice.mobile && (
                  <a
                    href={`https://wa.me/91${invoice.mobile.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(buildRichInvoiceMessage())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#25D366',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 11.5,
                      padding: '7px 12px',
                      borderRadius: 6,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      boxShadow: '0 2px 6px rgba(37,211,102,0.3)',
                    }}
                  >
                    <MessageCircle size={13} />
                    <span>💬 Deliver via Direct WA</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* WhatsApp Direct Fallback Alert if Meta 24h window closed or general failure */}
          {waResult.status === 'failed' && !waResult.isPaymentRequired && !salonData?.settings?.whatsappPaymentIssue && (
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 12,
                fontSize: 12,
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <span style={{ fontWeight: 800 }}>⚠️ {waResult.message}</span>
                <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
                  Meta Cloud API requires customer interaction first. Click below to deliver via WhatsApp Web/App:
                </div>
              </div>
              {invoice.mobile && (
                <a
                  href={`https://wa.me/91${invoice.mobile.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(buildRichInvoiceMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#25D366',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 12,
                    padding: '7px 12px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 2px 6px rgba(37,211,102,0.3)',
                  }}
                >
                  <MessageCircle size={13} />
                  <span>Open WhatsApp Web/App</span>
                </a>
              )}
            </div>
          )}

          {/* 24-Hour Free Service Window Status Banner */}
          {invoice.mobile && (
            <div
              style={{
                background: cust24h.active ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${cust24h.active ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: 10,
                padding: '8px 12px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: cust24h.active ? '#16a34a' : '#94a3b8',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: cust24h.active ? '#15803d' : '#475569',
                  }}
                >
                  {cust24h.active
                    ? `🟢 24h Free Window Active (${cust24h.formattedRemaining})`
                    : '⚪ Outside 24h Window'}
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {cust24h.active ? '• Meta Cloud API ₹0' : '• Scan QR to activate ₹0 session'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReceptionQRModalOpen(true)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#05424A',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Show Reception Desk QR Code to customer"
              >
                <QrCode size={12} />
                <span>{cust24h.active ? 'Desk QR' : '📱 Scan Desk QR'}</span>
              </button>
            </div>
          )}

          {/* Row 1: Share & PDF Export Actions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
              gap: 8,
            }}
          >
            {/* 1. Send on WhatsApp Button */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSendWhatsAppPDF}
              disabled={waPdfResult.status === 'sending'}
              title="Send invoice PDF directly to customer WhatsApp using WhatsApp Connect integration"
              style={{
                background:
                  waPdfResult.status === 'sent'
                    ? '#16a34a'
                    : waPdfResult.status === 'failed'
                    ? '#dc2626'
                    : '#15803d',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                padding: '9px 13px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 12.5,
                cursor: waPdfResult.status === 'sending' ? 'wait' : 'pointer',
                opacity: waPdfResult.status === 'sending' ? 0.8 : 1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {waPdfResult.status === 'sending' ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Sending on WA…</span>
                </>
              ) : waPdfResult.status === 'sent' ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>WA Sent!</span>
                </>
              ) : (
                <>
                  <MessageCircle size={15} />
                  <span>Send on WhatsApp</span>
                </>
              )}
            </button>

            {/* 2. Download PDF Button */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleDownloadPDF}
              disabled={downloading}
              style={{
                background: '#012a2a',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                padding: '9px 13px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 12.5,
                cursor: downloading ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Download official receipt PDF"
            >
              {downloading ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Direct WhatsApp (wa.me) — Works for 100% of New Numbers */}
            {invoice.mobile && (
              <a
                href={`https://wa.me/91${invoice.mobile.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(buildRichInvoiceMessage())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                title="Send bill directly via WhatsApp Web link"
                style={{
                  background: '#f0fdf4',
                  color: '#15803d',
                  fontWeight: 700,
                  border: '1px solid #86efac',
                  padding: '9px 10px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  fontSize: 12,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <MessageCircle size={14} color="#16a34a" />
                <span>Direct WA</span>
              </a>
            )}

            {/* Email Invoice Button */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSendEmail}
              disabled={emailResult.status === 'sending'}
              style={{
                background: '#FDF2F8',
                color: '#9D174D',
                fontWeight: 700,
                border: '1px solid #FBCFE8',
                padding: '9px 10px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Send Official Tax Invoice Receipt to Customer Email"
            >
              {emailResult.status === 'sending' ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Sending…</span>
                </>
              ) : emailResult.status === 'sent' ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Sent!</span>
                </>
              ) : (
                <>
                  <Mail size={15} />
                  <span>Email Invoice</span>
                </>
              )}
            </button>
          </div>

          {/* Row 2: Print Bill & Done Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 8,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontWeight: 700,
                fontSize: 12.5,
                border: '1.5px solid #cbd5e1',
                borderRadius: 8,
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <Printer size={14} /> Print Bill
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onClose}
              style={{
                padding: '8px 24px',
                fontWeight: 800,
                fontSize: 12.5,
                borderRadius: 8,
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>

      <ReceptionDeskQRModal
        isOpen={receptionQRModalOpen}
        onClose={() => setReceptionQRModalOpen(false)}
        studioName={salon}
        studioMobile={salonPhone}
        customerMobile={invoice.mobile}
        customerName={invoice.customer}
      />
    </div>
  );
}
