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
    '22, Radhika Society, Near Cancer Hospital, Katargam, Surat - 395004';
  const salonPhone = salonData?.settings?.whatsapp
    ? `${salonData.settings.whatsapp}, 9825339924`
    : '9824183769, 9825339924';
  const salonEmail = 'shreebeauty.studio22@gmail.com';

  const invNo = invoice.no.replace(/^INV-/, '');
  const invDate = formatIndianDate(invoice.date);

  const totalAmt = Number(invoice.total || 0);
  const advanceAmt = Number(invoice.advance || 0);
  const paymentPaid = Number(invoice.paid || 0);
  const balanceDue = Number(invoice.balance || 0);

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
        setWaResult({
          status: 'not_configured',
          message: 'WhatsApp API not configured. Add credentials in Settings → WhatsApp.',
        });
        toast('WhatsApp API not set up. Go to Settings → WhatsApp to configure.', 'error');
        setTimeout(() => setWaResult({ status: 'idle', message: '' }), 6000);
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

    const printWin = window.open('', '', 'width=800,height=900');
    if (!printWin) return;

    printWin.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice.no} - ${invoice.customer}</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              color: #111;
              background: #fff;
              margin: 0;
              padding: 20px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 440px; margin: 0 auto;">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #05424A 0%, #0d626e 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
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
              fontFamily: "'Montserrat', 'Segoe UI', Arial, sans-serif",
              color: '#1f2937',
              maxWidth: 420,
              margin: '0 auto',
            }}
          >
            {/* Top Logo */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <img
                src={SHREE_LOGO_BASE64}
                alt="Shree Beauty Studio"
                style={{
                  maxWidth: 240,
                  height: 'auto',
                  margin: '0 auto 6px',
                  display: 'block',
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: '#4b5563',
                  lineHeight: 1.45,
                  maxWidth: 320,
                  margin: '0 auto 3px',
                }}
              >
                {salonAddress}
              </div>
              <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>
                Email: {salonEmail}
              </div>
              <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>
                Phone / WhatsApp: {salonPhone}
              </div>
            </div>

            {/* Dashed Line Divider */}
            <div
              style={{
                borderTop: '1.5px dashed #9ca3af',
                margin: '12px 0 16px',
              }}
            />

            {/* Header Info Left Column */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: 16,
                fontSize: 13.5,
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: 85,
                      padding: '3px 0',
                      fontWeight: 800,
                      color: '#111',
                    }}
                  >
                    Inv. No :
                  </td>
                  <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>
                    {invNo}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>
                    Date :
                  </td>
                  <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>
                    {invDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>
                    Name :
                  </td>
                  <td
                    style={{
                      padding: '3px 0',
                      fontWeight: 600,
                      color: '#111',
                      textTransform: 'capitalize',
                    }}
                  >
                    {invoice.customer || 'Customer'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>
                    Phone :
                  </td>
                  <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>
                    {invoice.mobile || '—'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>
                    Event :
                  </td>
                  <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>
                    {invDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>
                    Venue :
                  </td>
                  <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>
                    Katargam Studio
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Service / Items Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #222',
              }}
            >
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th
                    style={{
                      border: '1.5px solid #222',
                      padding: '7px 8px',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      letterSpacing: '0.04em',
                    }}
                  >
                    SERVICE
                  </th>
                  <th
                    style={{
                      border: '1.5px solid #222',
                      padding: '7px 4px',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      width: 45,
                    }}
                  >
                    QTY
                  </th>
                  <th
                    style={{
                      border: '1.5px solid #222',
                      padding: '7px 6px',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      width: 65,
                    }}
                  >
                    PRICE
                  </th>
                  <th
                    style={{
                      border: '1.5px solid #222',
                      padding: '7px 8px',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      width: 75,
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
                          border: '1.5px solid #222',
                          padding: '7px 8px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textAlign: 'left',
                        }}
                      >
                        <div>{cleanServiceNameForBill(l.name)}</div>
                        {discAmt > 0 && (
                          <div style={{ fontSize: 10, color: '#16a34a' }}>
                            (Disc: -₹{discAmt})
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          border: '1.5px solid #222',
                          padding: '7px 4px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textAlign: 'center',
                        }}
                      >
                        {qty}
                      </td>
                      <td
                        style={{
                          border: '1.5px solid #222',
                          padding: '7px 6px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textAlign: 'right',
                        }}
                      >
                        {price.toLocaleString('en-IN')}
                      </td>
                      <td
                        style={{
                          border: '1.5px solid #222',
                          padding: '7px 8px',
                          fontSize: 13,
                          fontWeight: 800,
                          textAlign: 'right',
                        }}
                      >
                        {lineTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals Summary Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #222',
                borderTop: 'none',
                marginBottom: 20,
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      border: '1.5px solid #222',
                      borderTop: 'none',
                      padding: '6px 10px',
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: 'left',
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      border: '1.5px solid #222',
                      borderTop: 'none',
                      padding: '6px 10px',
                      fontSize: 14,
                      fontWeight: 800,
                      textAlign: 'right',
                      width: 140,
                    }}
                  >
                    ₹{totalAmt.toLocaleString('en-IN')}
                  </td>
                </tr>
                {advanceAmt > 0 && (
                  <tr>
                    <td
                      style={{
                        border: '1.5px solid #222',
                        padding: '6px 10px',
                        fontSize: 13,
                        fontWeight: 800,
                        textAlign: 'left',
                      }}
                    >
                      Advance
                    </td>
                    <td
                      style={{
                        border: '1.5px solid #222',
                        padding: '6px 10px',
                        fontSize: 14,
                        fontWeight: 800,
                        textAlign: 'right',
                      }}
                    >
                      ₹{advanceAmt.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    style={{
                      border: '1.5px solid #222',
                      padding: '6px 10px',
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: 'left',
                    }}
                  >
                    {balanceDue > 0 ? 'Received / Paid' : 'Payment'}
                  </td>
                  <td
                    style={{
                      border: '1.5px solid #222',
                      padding: '6px 10px',
                      fontSize: 14,
                      fontWeight: 800,
                      textAlign: 'right',
                    }}
                  >
                    ₹{(paymentPaid > 0 ? paymentPaid : totalAmt - advanceAmt).toLocaleString('en-IN')}
                  </td>
                </tr>
                {balanceDue > 0 && (
                  <tr style={{ background: '#fff1f2' }}>
                    <td
                      style={{
                        border: '1.5px solid #222',
                        padding: '6px 10px',
                        fontSize: 13,
                        fontWeight: 800,
                        textAlign: 'left',
                        color: '#dc2626',
                      }}
                    >
                      Balance Due
                    </td>
                    <td
                      style={{
                        border: '1.5px solid #222',
                        padding: '6px 10px',
                        fontSize: 14,
                        fontWeight: 800,
                        textAlign: 'right',
                        color: '#dc2626',
                      }}
                    >
                      ₹{balanceDue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Heartfelt Footer */}
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111',
                  marginBottom: 3,
                }}
              >
                Thank you for choosing us! 🙏
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: '#4b5563',
                  lineHeight: 1.4,
                  maxWidth: 320,
                  margin: '0 auto',
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
