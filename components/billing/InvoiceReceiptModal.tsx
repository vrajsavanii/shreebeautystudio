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
} from 'lucide-react';
import { Invoice, SalonData } from '@/types/salon';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';
import {
  downloadInvoicePDF,
  formatIndianDate,
  sendInvoicePDFViaWhatsApp,
  sendInvoiceTextViaWhatsApp,
  cleanServiceNameForBill,
  shareInvoicePDFViaDirectWhatsApp,
  buildPublicInvoiceMessage,
} from '@/lib/invoice-pdf';
import { money } from '@/lib/utils';
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

  if (!isOpen || !invoice) return null;

  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const salonPhone = salonData?.settings?.whatsapp
    ? `${salonData.settings.whatsapp}, 9825339924`
    : '919773240010, 9825339924';
  const salonEmail = 'shreebeauty.studio22@gmail.com';

  const invNo = invoice.no.replace(/^INV-/, '');
  const invDate = formatIndianDate(invoice.date);

  const totalAmt = Number(invoice.total || 0);
  const advanceAmt = Number(invoice.advance || 0);
  const paymentPaid = Number(invoice.paid || 0);
  const balanceDue = Number(
    invoice.balance !== undefined
      ? invoice.balance
      : Math.max(0, totalAmt - advanceAmt - paymentPaid)
  );

  const handleDownloadPDF = async (formatType: 'thermal' | 'a4' = 'thermal') => {
    try {
      setDownloading(true);
      setDownloadingFormat(formatType);
      await downloadInvoicePDF(invoice, salonData, undefined, formatType);
      toast(`✅ ${formatType === 'a4' ? 'A4 Full Page' : 'Thermal'} PDF Bill downloaded successfully!`);
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
📞 +91 97732 40010
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
      setTimeout(() => {
        setWaPdfResult({ status: 'idle', message: '' });
        setWaResult({ status: 'idle', message: '' });
      }, 4000);
      return;
    }

    // If Meta has an active payment issue, immediately use Direct WhatsApp PDF sharing (100% free)
    if (salonData?.settings?.whatsappPaymentIssue) {
      setWaPdfResult({ status: 'sending', message: 'Opening WhatsApp PDF share…' });
      try {
        const shareRes = await shareInvoicePDFViaDirectWhatsApp(invoice, salonData);
        setWaPdfResult({ status: shareRes.success ? 'sent' : 'idle', message: shareRes.message });
        toast(shareRes.message);
        setTimeout(() => setWaPdfResult({ status: 'idle', message: '' }), 5000);
      } catch (err: any) {
        toast(err?.message || 'Error sharing PDF', 'error');
        setWaPdfResult({ status: 'failed', message: err?.message || 'Error sharing PDF' });
      }
      return;
    }

    setWaPdfResult({ status: 'sending', message: 'Sending PDF via WhatsApp Business API…' });
    setWaResult({ status: 'sending', message: 'Sending PDF via WhatsApp Business API…' });

    try {
      const res = await sendInvoicePDFViaWhatsApp(invoice, salonData);
      if (res.success) {
        setWaPdfResult({ status: 'sent', message: res.message });
        setWaResult({ status: 'sent', message: res.message });
        toast(res.message);
        setTimeout(() => {
          setWaPdfResult({ status: 'idle', message: '' });
          setWaResult({ status: 'idle', message: '' });
        }, 5000);
      } else {
        const isPayment = res.isPaymentRequired;
        if (isPayment) {
          // Meta requires payment: immediately launch direct WhatsApp PDF sharing
          toast('Meta payment required. Opening Direct WhatsApp PDF share (Free)…', 'info');
          const shareRes = await shareInvoicePDFViaDirectWhatsApp(invoice, salonData);
          setWaPdfResult({ status: shareRes.success ? 'sent' : 'idle', message: shareRes.message });
          toast(shareRes.message);
          setTimeout(() => setWaPdfResult({ status: 'idle', message: '' }), 5000);
          return;
        }

        const is24h = res.is24HourWindow || res.isPendingTemplate || res.message?.toLowerCase().includes('pending');
        const fallbackMsg = is24h
          ? 'PDF template pending review. Click "WhatsApp Text" for instant delivery or "Direct WA" to send via WhatsApp Web.'
          : res.message || 'Meta WhatsApp delivery failed.';
        setWaPdfResult({
          status: 'failed',
          message: fallbackMsg,
          isPaymentRequired: isPayment,
          paymentUrl: res.paymentUrl,
        });
        setWaResult({
          status: 'failed',
          message: fallbackMsg,
          isPaymentRequired: isPayment,
          paymentUrl: res.paymentUrl,
        });
        toast(fallbackMsg, is24h ? 'info' : 'error');
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

    setEmailResult({ status: 'sending', message: 'Sending invoice email…' });
    const invoiceEmailSubject = `📄 Invoice #${invoice.no} from ${salon}`;
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
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailResult({ status: 'sent', message: `Sent via Resend to ${targetEmail}!` });
        setEmailFallback(null);
        toast(`✅ Invoice emailed to ${targetEmail} via Resend!`);
        setTimeout(() => setEmailResult({ status: 'idle', message: '' }), 5000);
      } else {
        const isDomainRestr = data.isDomainRestriction || data.error?.toLowerCase()?.includes('testing email') || data.error?.toLowerCase()?.includes('verify a domain');
        const finalGmailUrl = data.fallback?.gmailUrl || defaultGmailUrl;
        const finalMailtoUrl = data.fallback?.mailtoUrl || defaultMailtoUrl;

        setEmailFallback({
          targetEmail,
          gmailUrl: finalGmailUrl,
          mailtoUrl: finalMailtoUrl,
          subject: invoiceEmailSubject,
          body: invoiceSummaryText,
          isDomainRestriction: isDomainRestr,
        });

        // Attempt direct open in case browser popup blocker permits it
        try {
          window.open(finalGmailUrl, '_blank');
        } catch {}

        setEmailResult({ status: 'idle', message: '' });
        if (isDomainRestr) {
          toast('⚠️ Resend Sandbox Mode: Click the red "Open in Gmail" button below to dispatch.', 'info');
        } else {
          toast('Click below to dispatch invoice via Gmail or Mail app.', 'info');
        }
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

  const handlePrint = () => {
    const printContent = document.getElementById('shree-invoice-sample-template');
    if (!printContent) return;

    // Direct print via hidden iframe (instant without popup)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${invoice.no} - ${invoice.customer}</title>
          <style>
            @page {
              size: auto;
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              font-size: 12px !important;
              font-weight: 500 !important;
              -webkit-font-smoothing: antialiased !important;
            }
            .thermal-container {
              width: 100% !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
              padding: 4mm 4mm 2mm 4mm !important;
              box-sizing: border-box !important;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              font-size: 12px !important;
              font-weight: 500 !important;
            }
            .thermal-container * {
              box-sizing: border-box !important;
              color: #000000 !important;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            }
            .thermal-container table {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
              font-size: 12px !important;
            }
            .thermal-container th,
            .thermal-container td {
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              border-color: #000000 !important;
              border-width: 1.5px !important;
              color: #000000 !important;
              font-size: 12px !important;
            }
            .thermal-container img {
              max-width: 200px !important;
              width: 75% !important;
              height: auto !important;
              object-fit: contain !important;
              margin: 0 auto 6px !important;
              display: block !important;
            }
            .cut-feed-space {
              height: 20mm;
              min-height: 20mm;
              clear: both;
              display: block;
              page-break-after: always;
            }
            @media print {
              @page {
                size: auto;
                margin: 0mm !important;
              }
              body {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                font-size: 12px !important;
                font-weight: 500 !important;
              }
              .thermal-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                font-size: 12px !important;
                font-weight: 500 !important;
              }
              .thermal-container * {
                color: #000000 !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="thermal-container">
            ${printContent.innerHTML}
            <div class="cut-feed-space"></div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger direct print immediately
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 250);
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
              borderRadius: 12,
              padding: '24px 20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1.5px solid #000000',
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              color: '#000000',
              maxWidth: 440,
              margin: '0 auto',
            }}
          >
            {/* Top Logo */}
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <img
                src={SHREE_LOGO_BASE64}
                alt="Shree Beauty Studio"
                style={{
                  maxWidth: 200,
                  width: '70%',
                  height: 'auto',
                  objectFit: 'contain',
                  margin: '0 auto 6px',
                  display: 'block',
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: '#000000',
                  lineHeight: 1.4,
                  maxWidth: 340,
                  margin: '0 auto 2px',
                  fontWeight: 500,
                }}
              >
                {salonAddress}
              </div>
              <div style={{ fontSize: 11.5, color: '#000000', lineHeight: 1.4, fontWeight: 500 }}>
                Email: <b>{salonEmail}</b>
              </div>
              <div style={{ fontSize: 12, color: '#000000', lineHeight: 1.4, fontWeight: 700, marginTop: 2 }}>
                Phone / WhatsApp: +91 {salonPhone}
              </div>
            </div>

            {/* Dashed Line Divider */}
            <div
              style={{
                borderTop: '2px dashed #000000',
                margin: '8px 0 10px',
              }}
            />

            {/* Header Info Left Column */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: 10,
                fontSize: 12.5,
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: '28%',
                      padding: '2px 0',
                      fontWeight: 700,
                      color: '#000000',
                    }}
                  >
                    Inv. No :
                  </td>
                  <td style={{ width: '72%', padding: '2px 0', fontWeight: 600, color: '#000000' }}>
                    {invNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '28%', padding: '2px 0', fontWeight: 700, color: '#000000' }}>
                    Date :
                  </td>
                  <td style={{ width: '72%', padding: '2px 0', fontWeight: 600, color: '#000000' }}>
                    {invDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '28%', padding: '2px 0', fontWeight: 700, color: '#000000' }}>
                    Name :
                  </td>
                  <td
                    style={{
                      width: '72%',
                      padding: '2px 0',
                      fontWeight: 700,
                      color: '#000000',
                      textTransform: 'uppercase',
                    }}
                  >
                    {invoice.customer || 'Customer'}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '28%', padding: '2px 0', fontWeight: 700, color: '#000000' }}>
                    Phone :
                  </td>
                  <td style={{ width: '72%', padding: '2px 0', fontWeight: 600, color: '#000000' }}>
                    {invoice.mobile || '—'}
                  </td>
                </tr>
                {invoice.mode ? (
                <tr>
                  <td style={{ width: '28%', padding: '2px 0', fontWeight: 700, color: '#000000' }}>
                    Payment :
                  </td>
                  <td style={{ width: '72%', padding: '2px 0', fontWeight: 600, color: '#000000' }}>
                    {invoice.mode}
                  </td>
                </tr>
                ) : null}
              </tbody>
            </table>

            {/* Service / Items Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #000000',
                marginBottom: 12,
                tableLayout: 'fixed',
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th
                    style={{
                      border: '1.5px solid #000000',
                      padding: '6px 5px',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      letterSpacing: '0.02em',
                      width: '46%',
                      color: '#000000',
                    }}
                  >
                    SERVICE
                  </th>
                  <th
                    style={{
                      border: '1.5px solid #000000',
                      padding: '6px 3px',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      width: '14%',
                      color: '#000000',
                    }}
                  >
                    QTY
                  </th>
                  <th
                    style={{
                      border: '1.5px solid #000000',
                      padding: '6px 4px',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      width: '18%',
                      color: '#000000',
                    }}
                  >
                    PRICE
                  </th>
                  <th
                    style={{
                      border: '1.5px solid #000000',
                      padding: '6px 5px',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      width: '22%',
                      color: '#000000',
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
                          border: '1.5px solid #000000',
                          padding: '6px 7px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textAlign: 'left',
                          color: '#000000',
                          lineHeight: 1.3,
                        }}
                      >
                        <div>{cleanServiceNameForBill(l.name)}</div>
                        {l.staff ? <div style={{ fontSize: 11, color: '#444444', fontWeight: 500, marginTop: 1 }}>Beautician: {l.staff}</div> : null}
                        {discAmt > 0 && (
                          <div style={{ fontSize: 11, color: '#000000', fontWeight: 600, marginTop: 1 }}>
                            (Disc: -₹{discAmt.toLocaleString('en-IN')})
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          border: '1.5px solid #000000',
                          padding: '6px 3px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textAlign: 'center',
                          color: '#000000',
                        }}
                      >
                        {qty}
                      </td>
                      <td
                        style={{
                          border: '1.5px solid #000000',
                          padding: '6px 4px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textAlign: 'right',
                          color: '#000000',
                        }}
                      >
                        {price.toLocaleString('en-IN')}
                      </td>
                      <td
                        style={{
                          border: '1.5px solid #000000',
                          padding: '6px 6px',
                          fontSize: 13,
                          fontWeight: 700,
                          textAlign: 'right',
                          color: '#000000',
                        }}
                      >
                        {lineTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}

                {/* Unified Totals Rows with ColSpan 3 */}
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      border: '1.5px solid #000000',
                      padding: '6px 7px',
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: 'left',
                      color: '#000000',
                    }}
                  >
                    Grand Total
                  </td>
                  <td
                    style={{
                      border: '1.5px solid #000000',
                      padding: '6px 6px',
                      fontSize: 14,
                      fontWeight: 800,
                      textAlign: 'right',
                      color: '#000000',
                    }}
                  >
                    ₹{totalAmt.toLocaleString('en-IN')}
                  </td>
                </tr>

                {/* Advance row */}
                {advanceAmt > 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        border: '1.5px solid #000000',
                        padding: '6px 7px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        textAlign: 'left',
                        color: '#000000',
                      }}
                    >
                      Advance Received
                    </td>
                    <td
                      style={{
                        border: '1.5px solid #000000',
                        padding: '6px 6px',
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'right',
                        color: '#000000',
                      }}
                    >
                      ₹{advanceAmt.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ) : null}

                {/* Received / Paid row */}
                {advanceAmt === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        border: '1.5px solid #000000',
                        padding: '6px 7px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        textAlign: 'left',
                        color: '#000000',
                      }}
                    >
                      Received / Paid ({invoice.mode || 'Cash'})
                    </td>
                    <td
                      style={{
                        border: '1.5px solid #000000',
                        padding: '6px 6px',
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'right',
                        color: '#000000',
                      }}
                    >
                      ₹{paymentPaid.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                {advanceAmt > 0 && Math.max(0, paymentPaid - advanceAmt) > 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        border: '1.5px solid #000000',
                        padding: '6px 7px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        textAlign: 'left',
                        color: '#000000',
                      }}
                    >
                      Paid Today
                    </td>
                    <td
                      style={{
                        border: '1.5px solid #000000',
                        padding: '6px 6px',
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'right',
                        color: '#000000',
                      }}
                    >
                      ₹{Math.max(0, paymentPaid - advanceAmt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ) : null}

                {/* Balance Due row */}
                <tr style={{ background: balanceDue > 0 ? '#fff1f2' : '#f0fdf4' }}>
                  <td
                    colSpan={3}
                    style={{
                      border: '1.5px solid #000000',
                      padding: '7px 7px',
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: 'left',
                      color: '#000000',
                    }}
                  >
                    Balance Due
                  </td>
                  <td
                    style={{
                      border: '1.5px solid #000000',
                      padding: '7px 6px',
                      fontSize: 14,
                      fontWeight: 900,
                      textAlign: 'right',
                      color: balanceDue > 0 ? '#b91c1c' : '#15803d',
                    }}
                  >
                    ₹{balanceDue.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Heartfelt Footer */}
            <div style={{ textAlign: 'center', marginTop: 12, borderTop: '1.5px dashed #000000', paddingTop: 8 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#000000',
                  marginBottom: 3,
                  textAlign: 'center',
                }}
              >
                Thank you for choosing Shree Beauty Studio! 🙏
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: '#222222',
                  lineHeight: 1.4,
                  maxWidth: 340,
                  margin: '0 auto',
                  fontWeight: 500,
                }}
              >
                We truly value your trust and hope your experience was wonderful !! ✨
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

          {/* Email Fallback Card for Resend Sandbox / Unblockable Dispatch */}
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
                  <span>
                    {emailFallback.isDomainRestriction
                      ? 'Resend Testing Sandbox Mode'
                      : 'Dispatch Invoice via Email'}
                  </span>
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
                {emailFallback.isDomainRestriction ? (
                  <>
                    In Resend free testing mode, automated cloud emails are only sent to the account owner.
                    To deliver to all customers automatically, verify your domain at <b>resend.com/domains</b>.
                    In the meantime, 1-click dispatch to <b>{emailFallback.targetEmail}</b> below:
                  </>
                ) : (
                  <>
                    Send pre-formatted official invoice receipt directly to <b>{emailFallback.targetEmail}</b>:
                  </>
                )}
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

          {/* Row 1: Share & PDF Export Actions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
              gap: 8,
            }}
          >
            {/* 1. WhatsApp PDF Send Button */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSendWhatsAppPDF}
              disabled={waPdfResult.status === 'sending'}
              title={waPdfResult.message || 'Send PDF Invoice directly to customer WhatsApp via Meta API'}
              style={{
                background:
                  waPdfResult.status === 'sent'
                    ? '#16a34a'
                    : waPdfResult.status === 'failed' || waPdfResult.status === 'not_configured'
                    ? '#dc2626'
                    : '#059669',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                padding: '9px 10px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontSize: 12,
                cursor: waPdfResult.status === 'sending' ? 'wait' : 'pointer',
                opacity: waPdfResult.status === 'sending' ? 0.8 : 1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {waPdfResult.status === 'sending' ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Sending PDF…</span>
                </>
              ) : waPdfResult.status === 'sent' ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>PDF Sent!</span>
                </>
              ) : (
                <>
                  <FileText size={15} />
                  <span>WhatsApp PDF</span>
                </>
              )}
            </button>

            {/* 2. WhatsApp Text Send Button (Approved Template) */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSendWhatsAppText}
              disabled={waTextResult.status === 'sending'}
              title={waTextResult.message || 'Send official text receipt via Meta approved template (Guaranteed delivery to all numbers)'}
              style={{
                background:
                  waTextResult.status === 'sent'
                    ? '#16a34a'
                    : waTextResult.status === 'failed' || waTextResult.status === 'not_configured'
                    ? '#dc2626'
                    : '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                padding: '9px 10px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontSize: 12,
                cursor: waTextResult.status === 'sending' ? 'wait' : 'pointer',
                opacity: waTextResult.status === 'sending' ? 0.8 : 1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {waTextResult.status === 'sending' ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Sending Text…</span>
                </>
              ) : waTextResult.status === 'sent' ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Text Sent!</span>
                </>
              ) : (
                <>
                  <MessageSquare size={15} />
                  <span>WhatsApp Text</span>
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
                title="Send bill directly via WhatsApp (Works for all new customer numbers without 24h restrictions)"
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

            {/* Thermal PDF Button */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => handleDownloadPDF('thermal')}
              disabled={downloading}
              style={{
                background: '#05424A',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
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
              title="Download Ultra-HD Thermal Receipt PDF (58mm/80mm)"
            >
              <Download size={14} /> {downloading && downloadingFormat === 'thermal' ? 'Creating…' : 'Thermal PDF'}
            </button>

            {/* A4 PDF Button */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => handleDownloadPDF('a4')}
              disabled={downloading}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
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
              title="Download Ultra-HD A4 Full Page Tax Invoice PDF"
            >
              <FileText size={14} /> {downloading && downloadingFormat === 'a4' ? 'Creating…' : 'A4 PDF'}
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
    </div>
  );
}
