// components/billing/InvoiceReceiptModal.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Printer,
  Download,
  MessageCircle,
  CheckCircle2,
  Share2,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Invoice, SalonData } from '@/types/salon';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';
import { downloadInvoicePDF, formatIndianDate, sendInvoicePDFViaWhatsApp, cleanServiceNameForBill } from '@/lib/invoice-pdf';
import { money } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

type WAStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'not_configured';
type WAResult = { status: WAStatus; message: string };

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
  const [waResult, setWaResult] = useState<WAResult>({ status: 'idle', message: '' });

  if (!isOpen || !invoice) return null;

  const salon = salonData?.settings?.salon || 'Shree Beauty Studio';
  const salonAddress =
    salonData?.settings?.address ||
    '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const salonPhone = salonData?.settings?.whatsapp
    ? `${salonData.settings.whatsapp}, 9825339924`
    : '919824183769, 9825339924';
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

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      await downloadInvoicePDF(invoice, salonData);
      toast('✅ PDF Bill downloaded successfully!');
    } catch (e: any) {
      toast(`PDF download error: ${e.message}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!invoice.mobile) {
      setWaResult({ status: 'failed', message: 'No mobile number on this invoice.' });
      setTimeout(() => setWaResult({ status: 'idle', message: '' }), 4000);
      return;
    }

    setWaResult({ status: 'sending', message: 'Sending PDF to customer WhatsApp…' });

    try {
      const res = await sendInvoicePDFViaWhatsApp(invoice, salonData);

      if (res.success) {
        setWaResult({ status: 'sent', message: res.message });
        toast(res.message);
        // Auto-reset after 5 seconds
        setTimeout(() => setWaResult({ status: 'idle', message: '' }), 5000);
      } else if (res.notConfigured) {
        const cleanDigits = (invoice.mobile || '').replace(/\D/g, '').slice(-10);
        if (cleanDigits.length === 10) {
          const salonName = salonData?.settings?.salon || 'Shree Beauty Studio';
          const text = `✨ *${salonName.toUpperCase()} — Invoice Receipt #${invoice.no}* ✨\nDear ${invoice.customer || 'Customer'}, thank you for choosing us! 💖\nTotal Bill: ${money(invoice.total)}\nPaid: ${money(invoice.paid + (invoice.advance || 0))}\nBalance Due: ${money(invoice.balance)}\nHave a wonderful day! 🙏`;
          window.open(`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(text)}`, '_blank');
          setWaResult({ status: 'sent', message: '📱 Opening WhatsApp Web to send bill receipt...' });
          toast('📱 Opening WhatsApp Web to send bill receipt...', 'info');
          setTimeout(() => setWaResult({ status: 'idle', message: '' }), 5000);
        } else {
          setWaResult({
            status: 'not_configured',
            message: 'WhatsApp API not configured. Add credentials in Settings → WhatsApp.',
          });
          toast('WhatsApp API not set up. Go to Settings → WhatsApp to configure.', 'info');
          setTimeout(() => setWaResult({ status: 'idle', message: '' }), 6000);
        }
      } else {
        setWaResult({ status: 'failed', message: res.message });
        toast(res.message, 'error');
        setTimeout(() => setWaResult({ status: 'idle', message: '' }), 5000);
      }
    } catch (e: any) {
      const errMsg = e?.message || 'Unexpected error while sending WhatsApp message.';
      setWaResult({ status: 'failed', message: errMsg });
      toast(errMsg, 'error');
      setTimeout(() => setWaResult({ status: 'idle', message: '' }), 5000);
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
              font-family: 'Segoe UI', Arial, Helvetica, sans-serif !important;
              font-size: 10px !important;
              font-weight: 400 !important;
              -webkit-font-smoothing: antialiased !important;
            }
            .thermal-container {
              width: 100% !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
              padding: 2mm 3mm 0mm 3mm !important;
              box-sizing: border-box !important;
              font-size: 10px !important;
              font-weight: 400 !important;
            }
            .thermal-container * {
              box-sizing: border-box !important;
              color: #000000 !important;
            }
            .thermal-container table {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
              font-size: 10px !important;
            }
            .thermal-container th,
            .thermal-container td {
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              border-color: #000000 !important;
              border-width: 1px !important;
              color: #000000 !important;
              font-size: 10px !important;
            }
            .thermal-container img {
              max-width: 180px !important;
              width: 75% !important;
              height: auto !important;
              object-fit: contain !important;
              margin: 0 auto 4px !important;
              display: block !important;
            }
            .cut-feed-space {
              height: 25mm;
              min-height: 25mm;
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
                font-size: 10px !important;
                font-weight: 400 !important;
              }
              .thermal-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                font-size: 10px !important;
                font-weight: 400 !important;
              }
              .thermal-container * {
                color: #000000 !important;
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
          maxWidth: 520,
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
              padding: '26px 22px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
              color: '#000000',
              maxWidth: 420,
              margin: '0 auto',
            }}
          >
            {/* Top Logo */}
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <img
                src={SHREE_LOGO_BASE64}
                alt="Shree Beauty Studio"
                style={{
                  maxWidth: 180,
                  width: '75%',
                  height: 'auto',
                  objectFit: 'contain',
                  margin: '0 auto 4px',
                  display: 'block',
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: '#000000',
                  lineHeight: 1.35,
                  maxWidth: 300,
                  margin: '0 auto 2px',
                  fontWeight: 400,
                }}
              >
                {salonAddress}
              </div>
              <div style={{ fontSize: 10, color: '#000000', lineHeight: 1.35, fontWeight: 400 }}>
                Email: {salonEmail}
              </div>
              <div style={{ fontSize: 10, color: '#000000', lineHeight: 1.35, fontWeight: 500 }}>
                Phone / WhatsApp: {salonPhone}
              </div>
            </div>

            {/* Dashed Line Divider */}
            <div
              style={{
                borderTop: '1px dashed #000000',
                margin: '6px 0 8px',
              }}
            />

            {/* Header Info Left Column */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: 8,
                fontSize: 10,
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: '28%',
                      padding: '2px 0',
                      fontWeight: 600,
                      color: '#000000',
                      fontSize: 10,
                    }}
                  >
                    Inv. No :
                  </td>
                  <td style={{ width: '72%', padding: '2px 0', fontWeight: 400, color: '#000000', fontSize: 10 }}>
                    {invNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '28%', padding: '2px 0', fontWeight: 600, color: '#000000', fontSize: 10 }}>
                    Date :
                  </td>
                  <td style={{ width: '72%', padding: '2px 0', fontWeight: 400, color: '#000000', fontSize: 10 }}>
                    {invDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '28%', padding: '2px 0', fontWeight: 600, color: '#000000', fontSize: 10 }}>
                    Name :
                  </td>
                  <td
                    style={{
                      width: '72%',
                      padding: '2px 0',
                      fontWeight: 400,
                      color: '#000000',
                      textTransform: 'uppercase',
                      fontSize: 10,
                    }}
                  >
                    {invoice.customer || 'Customer'}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '28%', padding: '2px 0', fontWeight: 600, color: '#000000', fontSize: 10 }}>
                    Phone :
                  </td>
                  <td style={{ width: '72%', padding: '2px 0', fontWeight: 400, color: '#000000', fontSize: 10 }}>
                    {invoice.mobile || '—'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Service / Items Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #000000',
                marginBottom: 10,
                tableLayout: 'fixed',
                fontSize: 10,
              }}
            >
              <thead>
                <tr style={{ background: '#fdfefe' }}>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 3px',
                      fontSize: 10,
                      fontWeight: 600,
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
                      border: '1px solid #000000',
                      padding: '4px 2px',
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: 'center',
                      width: '14%',
                      color: '#000000',
                    }}
                  >
                    QTY
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 3px',
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: 'center',
                      width: '18%',
                      color: '#000000',
                    }}
                  >
                    PRICE
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 3px',
                      fontSize: 10,
                      fontWeight: 600,
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
                          border: '1px solid #000000',
                          padding: '4px 5px',
                          fontSize: 10,
                          fontWeight: 400,
                          textAlign: 'left',
                          color: '#000000',
                        }}
                      >
                        <div>{cleanServiceNameForBill(l.name)}</div>
                        {discAmt > 0 && (
                          <div style={{ fontSize: 10, color: '#000000', fontWeight: 400 }}>
                            (Disc: -₹{discAmt})
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '4px 2px',
                          fontSize: 10,
                          fontWeight: 400,
                          textAlign: 'center',
                          color: '#000000',
                        }}
                      >
                        {qty}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '4px 3px',
                          fontSize: 10,
                          fontWeight: 400,
                          textAlign: 'right',
                          color: '#000000',
                        }}
                      >
                        {price.toLocaleString('en-IN')}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '4px 4px',
                          fontSize: 10,
                          fontWeight: 500,
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
                      border: '1px solid #000000',
                      padding: '4px 5px',
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: 'left',
                      color: '#000000',
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 4px',
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: 'right',
                      color: '#000000',
                    }}
                  >
                    ₹{totalAmt.toLocaleString('en-IN')}
                  </td>
                </tr>

                {/* Advance row - only if advance was recorded */}
                {advanceAmt > 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 5px',
                        fontSize: 10,
                        fontWeight: 600,
                        textAlign: 'left',
                        color: '#000000',
                      }}
                    >
                      Advance
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 4px',
                        fontSize: 10,
                        fontWeight: 600,
                        textAlign: 'right',
                        color: '#000000',
                      }}
                    >
                      ₹{advanceAmt.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                {/* Received / Paid row - if no advance, show payment. If advance existed, only show if additional payment made today */}
                {advanceAmt === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 5px',
                        fontSize: 10,
                        fontWeight: 600,
                        textAlign: 'left',
                        color: '#000000',
                      }}
                    >
                      Received / Paid
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 4px',
                        fontSize: 10,
                        fontWeight: 600,
                        textAlign: 'right',
                        color: '#000000',
                      }}
                    >
                      ₹{paymentPaid.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                {advanceAmt > 0 && Math.max(0, paymentPaid - advanceAmt) > 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 5px',
                        fontSize: 10,
                        fontWeight: 600,
                        textAlign: 'left',
                        color: '#000000',
                      }}
                    >
                      Paid Today
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 4px',
                        fontSize: 10,
                        fontWeight: 600,
                        textAlign: 'right',
                        color: '#000000',
                      }}
                    >
                      ₹{Math.max(0, paymentPaid - advanceAmt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                {/* Balance Due row - Always displayed on POS receipts */}
                <tr style={balanceDue > 0 ? { background: '#fff1f2' } : undefined}>
                  <td
                    colSpan={3}
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 5px',
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: 'left',
                      color: '#000000',
                    }}
                  >
                    Balance Due
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 4px',
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: 'right',
                      color: '#000000',
                    }}
                  >
                    ₹{balanceDue.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Heartfelt Footer */}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: '#000000',
                  marginBottom: 2,
                  letterSpacing: '0.01em',
                }}
              >
                Thank you for choosing us! 🙏
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#000000',
                  lineHeight: 1.45,
                  maxWidth: 320,
                  margin: '0 auto',
                  fontWeight: 400,
                  letterSpacing: '0.01em',
                }}
              >
                We truly value your trust and hope your experience was
                everything you imagined !!
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div
          style={{
            padding: '14px 20px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: 10,
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {/* WhatsApp Send Button — with loading / success / failed states */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSendWhatsApp}
              disabled={waResult.status === 'sending'}
              title={waResult.message || 'Send PDF Invoice directly to customer WhatsApp'}
              style={{
                background:
                  waResult.status === 'sent'
                    ? '#16a34a'
                    : waResult.status === 'failed' || waResult.status === 'not_configured'
                    ? '#dc2626'
                    : '#25D366',
                color:
                  waResult.status === 'sent' || waResult.status === 'failed' || waResult.status === 'not_configured'
                    ? '#fff'
                    : '#053320',
                fontWeight: 700,
                border: 'none',
                padding: '8px 14px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: waResult.status === 'sending' ? 'wait' : 'pointer',
                opacity: waResult.status === 'sending' ? 0.8 : 1,
                minWidth: 170,
                justifyContent: 'center',
                transition: 'background 0.3s',
              }}
            >
              {waResult.status === 'sending' && (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending…
                </>
              )}
              {waResult.status === 'sent' && (
                <>
                  <CheckCircle2 size={14} />
                  ✅ Sent!
                </>
              )}
              {(waResult.status === 'failed' || waResult.status === 'not_configured') && (
                <>
                  <AlertCircle size={14} />
                  {waResult.status === 'not_configured' ? 'Not Configured' : '❌ Failed'}
                </>
              )}
              {waResult.status === 'idle' && (
                <>
                  <MessageCircle size={15} />
                  Send WhatsApp Bill
                </>
              )}
            </button>

            {/* Status message below the button */}
            {waResult.message && waResult.status !== 'idle' && (
              <div
                style={{
                  fontSize: 11,
                  color:
                    waResult.status === 'sent'
                      ? '#16a34a'
                      : waResult.status === 'sending'
                      ? '#0369a1'
                      : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  maxWidth: 180,
                  lineHeight: 1.3,
                }}
              >
                {waResult.message}
              </div>
            )}

            <button
              type="button"
              className="btn btn-sm"
              onClick={handleDownloadPDF}
              disabled={downloading}
              style={{
                background: '#05424A',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                padding: '8px 14px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Download size={15} /> {downloading ? 'Creating PDF…' : 'Download PDF'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 12px',
              }}
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ padding: '8px 14px' }}
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
