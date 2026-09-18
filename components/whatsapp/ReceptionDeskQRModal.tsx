'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  Copy,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Sparkles,
  Smartphone,
  Check,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';
import { getReceptionWhatsAppUrl, getReceptionWhatsAppQrUrl } from '@/lib/whatsapp';
import { useToast } from '@/components/ui/Toast';

interface ReceptionDeskQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioName?: string;
  studioMobile?: string;
  customerMobile?: string;
  customerName?: string;
  onActivated?: () => void;
}

export default function ReceptionDeskQRModal({
  isOpen,
  onClose,
  studioName = 'Shree Beauty Studio',
  studioMobile = '919773240010',
  customerMobile,
  customerName,
  onActivated,
}: ReceptionDeskQRModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  if (!isOpen) return null;

  const cleanStudio = studioMobile.replace(/\D/g, '').slice(-10) || '9773240010';
  const waUrl = getReceptionWhatsAppUrl(cleanStudio, 'Hi');
  const qrUrl = getReceptionWhatsAppQrUrl(cleanStudio, 'Hi', 360);

  const handleCopy = () => {
    navigator.clipboard.writeText(waUrl);
    setCopied(true);
    toast('📋 WhatsApp Activation link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrintStandee = () => {
    const printContent = document.getElementById('shree-reception-standee-card');
    if (!printContent) return;

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
          <title>Reception Standee - ${studioName}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #fff;
              color: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .standee-frame {
              border: 3px double #05424A;
              border-radius: 20px;
              padding: 30px 24px;
              text-align: center;
              max-width: 440px;
              width: 100%;
              background: #ffffff;
            }
            .logo {
              max-width: 180px;
              margin: 0 auto 12px;
              display: block;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              color: #05424A;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              margin: 0 0 6px;
            }
            .subtitle {
              font-size: 13px;
              color: #475569;
              margin: 0 0 20px;
            }
            .qr-box {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 16px;
              padding: 16px;
              display: inline-block;
              margin: 0 auto 18px;
            }
            .qr-box img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .scan-instructions {
              font-size: 14px;
              font-weight: 700;
              color: #05424A;
              margin: 0 0 8px;
            }
            .step-pill {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #05424A10;
              color: #05424A;
              font-size: 11.5px;
              font-weight: 600;
              padding: 6px 14px;
              border-radius: 99px;
              margin: 4px;
            }
            .wa-number {
              font-size: 15px;
              font-weight: 800;
              color: #25D366;
              margin-top: 14px;
              display: block;
            }
            .footer-note {
              font-size: 10.5px;
              color: #94a3b8;
              margin-top: 14px;
            }
          </style>
        </head>
        <body>
          <div class="standee-frame">
            <img src="${SHREE_LOGO_BASE64}" class="logo" alt="${studioName}" />
            <div class="title">WhatsApp Counter Desk</div>
            <div class="subtitle">Scan to receive your digital bills, invoices & appointment updates</div>
            <div class="qr-box">
              <img src="${qrUrl}" alt="WhatsApp QR Code" />
            </div>
            <div class="scan-instructions">📲 Point your camera & tap "Send" in WhatsApp</div>
            <div>
              <span class="step-pill">1. Scan QR</span>
              <span class="step-pill">2. Send "Hi"</span>
              <span class="step-pill">3. Instant Digital Bill</span>
            </div>
            <div class="wa-number">💬 WhatsApp: +91 ${cleanStudio}</div>
            <div class="footer-note">Shree Beauty Studio • Katargam, Surat</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.frameElement?.remove(); }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const handleSimulateActivation = async () => {
    const mob = (customerMobile || '').replace(/\D/g, '').slice(-10);
    if (!mob || mob.length !== 10) {
      toast('Enter a valid 10-digit mobile number in the form first.', 'error');
      return;
    }
    setSimulating(true);
    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry: [
            {
              changes: [
                {
                  value: {
                    contacts: [{ profile: { name: customerName || 'Valued Client' }, wa_id: `91${mob}` }],
                    messages: [
                      {
                        from: `91${mob}`,
                        id: `sim_${Date.now()}`,
                        timestamp: `${Math.floor(Date.now() / 1000)}`,
                        text: { body: 'Hi' },
                        type: 'text',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast(`✅ 24-Hour Free Service Window activated for +91 ${mob}!`);
        if (onActivated) onActivated();
      } else {
        toast(`Activation error: ${json.error || 'Webhook returned error'}`, 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Error triggering activation webhook', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          style={{
            background: '#ffffff',
            borderRadius: 20,
            maxWidth: 480,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QrCode size={20} color="#EABA38" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.02em' }}>
                  Reception Desk QR Station
                </div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>
                  Instant 24-Hour Free WhatsApp Window Activation
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

          {/* Modal Body */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {/* Printable Preview Card */}
            <div
              id="shree-reception-standee-card"
              style={{
                background: '#ffffff',
                border: '2px dashed #05424A',
                borderRadius: 16,
                padding: '20px 16px',
                textAlign: 'center',
                marginBottom: 16,
                boxShadow: '0 4px 14px rgba(5, 66, 74, 0.05)',
              }}
            >
              <img
                src={SHREE_LOGO_BASE64}
                alt={studioName}
                style={{
                  maxWidth: 150,
                  width: '60%',
                  height: 'auto',
                  margin: '0 auto 10px',
                  display: 'block',
                }}
              />
              <div style={{ fontSize: 14, fontWeight: 800, color: '#05424A', marginBottom: 2 }}>
                SCAN FOR DIGITAL INVOICE &amp; REMINDERS
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
                Ask customer to scan with their phone camera and tap <strong>Send</strong>
              </div>

              {/* QR Display */}
              <div
                style={{
                  display: 'inline-block',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <img
                  src={qrUrl}
                  alt="WhatsApp QR Code"
                  style={{
                    width: 190,
                    height: 190,
                    display: 'block',
                    borderRadius: 8,
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: '#15803d',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                <span>💬 WhatsApp: +91 {cleanStudio}</span>
              </div>
            </div>

            {/* Explanatory 3-Step Pill Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 15, marginBottom: 2 }}>📷</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1e293b' }}>1. Client Scans</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Opens WhatsApp</div>
              </div>
              <div
                style={{
                  background: '#f0fdf4',
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: '1px solid #bbf7d0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 15, marginBottom: 2 }}>✉️</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d' }}>2. Sends &quot;Hi&quot;</div>
                <div style={{ fontSize: 10, color: '#166534' }}>Incoming message</div>
              </div>
              <div
                style={{
                  background: '#fefce8',
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: '1px solid #fef08a',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 15, marginBottom: 2 }}>🟢</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#854d0e' }}>3. 24h ₹0 Window</div>
                <div style={{ fontSize: 10, color: '#a16207' }}>Free API Delivery</div>
              </div>
            </div>

            {/* Test Simulation Button (If customer mobile is provided) */}
            {customerMobile && (
              <div
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 11.5 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    Testing with +91 {customerMobile.replace(/\D/g, '').slice(-10)}?
                  </div>
                  <div style={{ color: '#64748b', fontSize: 10.5 }}>
                    Simulate customer sending &quot;Hi&quot; to activate window immediately:
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateActivation}
                  disabled={simulating}
                  style={{
                    background: '#05424A',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: simulating ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Zap size={13} color="#EABA38" />
                  <span>{simulating ? 'Activating…' : 'Activate 24h'}</span>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrintStandee}
                style={{
                  height: 38,
                  fontSize: 12.5,
                  fontWeight: 700,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Printer size={15} />
                <span>Print Desk Standee</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopy}
                style={{
                  height: 38,
                  fontSize: 12.5,
                  fontWeight: 700,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {copied ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                <span>{copied ? 'Link Copied!' : 'Copy WA Link'}</span>
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  width: '100%',
                  height: 38,
                  fontSize: 12.5,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: '#25D366',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={15} />
                <span>Open WhatsApp Direct (+91 {cleanStudio})</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
