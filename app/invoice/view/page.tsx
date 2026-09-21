// app/invoice/view/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Printer, MessageCircle, CheckCircle2, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { Invoice, SalonData } from '@/types/salon';
import { downloadInvoicePDF, formatIndianDate, cleanServiceNameForBill } from '@/lib/invoice-pdf';
import { money } from '@/lib/utils';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';

function InvoiceViewerContent() {
  const searchParams = useSearchParams();
  const no = searchParams.get('no') || '';
  const id = searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!no && !id) {
      setError('No invoice reference provided.');
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const query = no ? `no=${encodeURIComponent(no)}` : `id=${encodeURIComponent(id)}`;
        const res = await fetch(`/api/public-invoice?${query}`);
        const data = await res.json();
        if (data.success && data.invoice) {
          setInvoice(data.invoice);
          setSettings(data.settings);
        } else {
          setError(data.error || 'Invoice not found.');
        }
      } catch (err: any) {
        setError('Error loading invoice. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [no, id]);

  const handleDownload = async (format: 'a4' | 'thermal' = 'a4') => {
    if (!invoice) return;
    try {
      setDownloading(true);
      const fakeSalonData = {
        settings: settings || { salon: 'Shree Beauty Studio' },
      } as unknown as SalonData;
      await downloadInvoicePDF(invoice, fakeSalonData, undefined, format);
    } catch (e) {
      alert('Could not generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #047857', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 14, color: '#4b5563', fontWeight: 600 }}>Loading official invoice…</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, maxWidth: 440, textAlign: 'center' }}>
          <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#991b1b', marginBottom: 6 }}>Invoice Not Found</h2>
          <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5, marginBottom: 16 }}>
            {error || 'The requested invoice reference could not be verified in our records.'}
          </p>
          <a
            href="https://wa.me/919773240010"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#25D366',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <MessageCircle size={15} />
            <span>Contact Salon on WhatsApp</span>
          </a>
        </div>
      </div>
    );
  }

  const salon = settings?.salon || 'Shree Beauty Studio';
  const salonAddress = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const totalAmt = Number(invoice.total || 0);
  const advanceAmt = Number(invoice.advance || 0);
  const paymentPaid = Number(invoice.paid || 0);
  const balanceDue = Number(
    invoice.balance !== undefined ? invoice.balance : Math.max(0, totalAmt - advanceAmt - paymentPaid)
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Action Header Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #023d38 0%, #0d544c 100%)',
            color: '#ffffff',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 4px 20px rgba(2,61,56,0.2)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a7f3d0' }}>
              <ShieldCheck size={14} /> Official Digital Tax Receipt
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              Invoice #{invoice.no}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleDownload('a4')}
              disabled={downloading}
              style={{
                background: '#ffffff',
                color: '#023d38',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
            >
              <Download size={14} />
              <span>{downloading ? 'Generating…' : 'Download PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* The Authentic Invoice Sheet */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '24px 22px',
            border: '1.5px solid #000000',
            boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
            color: '#000000',
          }}
        >
          {/* Header & Logo */}
          <div style={{ textAlign: 'center', paddingBottom: 6, marginBottom: 12 }}>
            {SHREE_LOGO_BASE64 ? (
              <img
                src={SHREE_LOGO_BASE64}
                alt="Shree Beauty Studio"
                style={{ maxWidth: 210, width: '60%', height: 'auto', margin: '0 auto 6px', display: 'block' }}
              />
            ) : null}
            <p style={{ fontSize: 11.5, color: '#333333', margin: '4px 0 0', lineHeight: 1.4, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              {salonAddress}
            </p>
            <p style={{ fontSize: 11.5, color: '#333333', margin: '2px 0 0', fontWeight: 600 }}>
              📞 +91 97732 40010, 9825339924
            </p>
          </div>

          {/* Customer & Invoice Meta Details */}
          <div style={{ fontSize: 12, lineHeight: 1.6, borderBottom: '1.5px dashed #000000', paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Bill No:</strong> {invoice.no}</span>
              <span><strong>Date:</strong> {formatIndianDate(invoice.date)}</span>
            </div>
            <div><strong>Customer:</strong> {invoice.customer}</div>
            {invoice.mobile && <div><strong>Mobile:</strong> +91 {invoice.mobile}</div>}
            <div><strong>Payment Mode:</strong> {invoice.mode || 'Cash'}</div>
          </div>

          {/* Table of Line Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'left', fontWeight: 800 }}>SERVICE</th>
                <th style={{ border: '1.5px solid #000000', padding: '6px 4px', textAlign: 'center', width: 40, fontWeight: 800 }}>QTY</th>
                <th style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', width: 70, fontWeight: 800 }}>PRICE</th>
                <th style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', width: 80, fontWeight: 800 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).map((line: any, idx: number) => {
                const q = line.qty || 1;
                const p = Number(line.price || 0);
                const sub = p * q;
                return (
                  <tr key={idx}>
                    <td style={{ border: '1.5px solid #000000', padding: '6px 8px', fontWeight: 600 }}>
                      {cleanServiceNameForBill(line.name)}
                    </td>
                    <td style={{ border: '1.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>
                      {q}
                    </td>
                    <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right' }}>
                      ₹{p.toLocaleString('en-IN')}
                    </td>
                    <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                      ₹{sub.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
              {/* Grand Total */}
              <tr>
                <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '7px 8px', fontWeight: 800, textAlign: 'left' }}>
                  Grand Total
                </td>
                <td style={{ border: '1.5px solid #000000', padding: '7px 8px', fontWeight: 900, textAlign: 'right', fontSize: 13 }}>
                  ₹{totalAmt.toLocaleString('en-IN')}
                </td>
              </tr>
              {advanceAmt > 0 && (
                <tr>
                  <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '5px 8px', fontWeight: 700, textAlign: 'left' }}>
                    Advance Received
                  </td>
                  <td style={{ border: '1.5px solid #000000', padding: '5px 8px', fontWeight: 700, textAlign: 'right' }}>
                    ₹{advanceAmt.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              {paymentPaid > 0 && (
                <tr>
                  <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '5px 8px', fontWeight: 700, textAlign: 'left' }}>
                    Amount Paid
                  </td>
                  <td style={{ border: '1.5px solid #000000', padding: '5px 8px', fontWeight: 700, textAlign: 'right' }}>
                    ₹{paymentPaid.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              <tr style={{ background: balanceDue > 0 ? '#fff1f2' : '#f0fdf4' }}>
                <td colSpan={3} style={{ border: '1.5px solid #000000', padding: '7px 8px', fontWeight: 800, textAlign: 'left' }}>
                  Balance Due
                </td>
                <td
                  style={{
                    border: '1.5px solid #000000',
                    padding: '7px 8px',
                    fontWeight: 900,
                    textAlign: 'right',
                    fontSize: 13,
                    color: balanceDue > 0 ? '#b91c1c' : '#15803d',
                  }}
                >
                  ₹{balanceDue.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer Note */}
          <div style={{ textAlign: 'center', borderTop: '1.5px dashed #000000', paddingTop: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
              Thank you for choosing us! 🙏
            </div>
            <div style={{ fontSize: 11, color: '#444', lineHeight: 1.4 }}>
              We truly value your trust and hope your experience was wonderful !!
            </div>
          </div>
        </div>

        {/* WhatsApp & Contact Footer Bar */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a
            href="https://wa.me/919773240010"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#25D366',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
            }}
          >
            <MessageCircle size={16} />
            <span>Chat with {salon} on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceViewerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading invoice…</div>}>
      <InvoiceViewerContent />
    </Suspense>
  );
}
