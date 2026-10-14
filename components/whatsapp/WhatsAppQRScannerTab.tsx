// components/whatsapp/WhatsAppQRScannerTab.tsx
// Two-pane QR Scanner Screen: Left light-blue carousel (3s rotation) + Right white QR scanner

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  ShieldCheck,
  Zap,
  RefreshCw,
  Check,
  Lock,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

interface WhatsAppQRScannerTabProps {
  waStatus: 'disconnected' | 'waiting_qr' | 'connecting' | 'connected';
  waQrDataUrl: string | null;
  waConnectedPhone?: string;
  waConnectedName?: string;
  onRefreshQR: () => void;
  onOpenChat?: () => void;
  onSimulateConnect?: () => void;
}

export default function WhatsAppQRScannerTab({
  waStatus,
  waQrDataUrl,
  waConnectedPhone,
  waConnectedName,
  onRefreshQR,
  onOpenChat,
  onSimulateConnect,
}: WhatsAppQRScannerTabProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [isQrExpired, setIsQrExpired] = useState(false);

  // 1. Auto-rotating carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 2. 60-second QR expiration timer
  useEffect(() => {
    setIsQrExpired(false);
    setSecondsRemaining(60);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [waQrDataUrl]);

  const slides = [
    {
      title: 'Smart Messaging',
      desc: 'Bills, party statements, reminders and all transactions are shared instantly from a smart panel.',
      icon: <Zap size={44} color="#0284c7" />,
      tag: '1-Click Automation',
      pillColor: '#e0f2fe',
      textColor: '#0369a1',
    },
    {
      title: 'Party Smart Connect',
      desc: 'Send booking confirmations with Google Calendar links and studio map directions in 1 click.',
      icon: <Smartphone size={44} color="#16a34a" />,
      tag: 'Calendar & Maps',
      pillColor: '#dcfce7',
      textColor: '#15803d',
    },
    {
      title: 'Safety & Security',
      desc: 'All messages are end-to-end encrypted, keeping your data fully protected.',
      icon: <ShieldCheck size={44} color="#7c3aed" />,
      tag: 'E2E Encryption',
      pillColor: '#f3e8ff',
      textColor: '#6b21a8',
    },
  ];

  const currentSlide = slides[activeSlide];

  const handleReloadQR = () => {
    setIsQrExpired(false);
    setSecondsRemaining(60);
    onRefreshQR();
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(320px, 1.1fr)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        background: '#ffffff',
        minHeight: 560,
      }}
    >
      {/* ── LEFT PANE: LIGHT BLUE CAROUSEL (ROTATES EVERY 3 SECONDS) ── */}
      <div
        style={{
          background: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          borderRight: '1px solid #bae6fd',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Header pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              padding: '6px 14px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 800,
              color: '#0369a1',
              boxShadow: '0 2px 6px rgba(2,132,199,0.12)',
              marginBottom: 32,
            }}
          >
            <span>✨</span>
            <span>Shree Beauty Studio WhatsApp Web Link</span>
          </div>

          {/* Carousel Slide Animation */}
          <div style={{ minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0.65, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {/* Preview Illustration Card */}
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 24,
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  boxShadow: '0 12px 28px -6px rgba(2, 132, 199, 0.18)',
                  border: '2px solid #bae6fd',
                }}
              >
                {currentSlide.icon}
              </div>

              {/* Tag Pill */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: currentSlide.pillColor,
                  color: currentSlide.textColor,
                  padding: '3px 10px',
                  borderRadius: 99,
                  marginBottom: 10,
                }}
              >
                {currentSlide.tag}
              </span>

              {/* Bold Title */}
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0 0 10px',
                  letterSpacing: '-0.3px',
                }}
              >
                {currentSlide.title}
              </h2>

              {/* Grey Description */}
              <p
                style={{
                  fontSize: 13.5,
                  color: '#334155',
                  lineHeight: 1.55,
                  margin: 0,
                  maxWidth: 340,
                  fontWeight: 500,
                }}
              >
                {currentSlide.desc}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Dot Indicators */}
        <div style={{ display: 'flex', gap: 8, marginTop: 32 }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              style={{
                width: activeSlide === idx ? 24 : 8,
                height: 8,
                borderRadius: 99,
                background: activeSlide === idx ? '#0284c7' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── RIGHT PANE: WHITE QR SCANNER OR CONNECTED SCREEN ── */}
      <div
        style={{
          background: '#ffffff',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {waStatus === 'connected' ? (
          <div
            style={{
              maxWidth: 380,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#15803d',
                padding: '4px 14px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#16a34a',
                  boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.25)',
                }}
              />
              <span>Live &amp; Connected</span>
            </div>

            {/* Glowing Icon Card */}
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow: '0 12px 28px -4px rgba(22, 163, 74, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                border: '4px solid #ffffff',
              }}
            >
              <MessageCircle size={46} color="#ffffff" fill="#ffffff" />
            </div>

            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 6px',
                letterSpacing: '-0.3px',
              }}
            >
              WhatsApp Connected!
            </h2>

            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 18px', fontWeight: 600 }}>
              Linked Phone: <span style={{ color: '#0f172a', fontWeight: 800 }}>+91 {waConnectedPhone || '98241 83769'}</span>
              {waConnectedName && (
                <span style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                  ({waConnectedName})
                </span>
              )}
            </p>

            {/* Features Enabled List */}
            <div
              style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 22,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 12.5,
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                <span>Real-time WhatsApp Web live chat active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                <span>Send PDF invoices &amp; party statements in 1-click</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                <span>Automated appointment reminders &amp; wishes</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              {onOpenChat && (
                <button
                  type="button"
                  onClick={onOpenChat}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 18px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(5, 66, 74, 0.25)',
                  }}
                >
                  <MessageCircle size={16} />
                  <span>Open Live Chat</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReloadQR}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                title="Refresh or reconnect device"
              >
                <RefreshCw size={14} />
                <span>Reconnect</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 6px',
                letterSpacing: '-0.3px',
              }}
            >
              Scan this QR code
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
              Open WhatsApp on your mobile phone to link this device
            </p>

            {/* QR Code Container with Centered WhatsApp Logo */}
            <div
              style={{
                position: 'relative',
                width: 260,
                height: 260,
                borderRadius: 16,
                border: '2px solid #e2e8f0',
                background: '#ffffff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              {!termsAccepted ? (
                <div style={{ padding: 20, color: '#64748b', fontSize: 13 }}>
                  <Lock size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    Please accept the usage terms below to view the QR code.
                  </p>
                </div>
              ) : waQrDataUrl ? (
                <div style={{ position: 'relative', width: 236, height: 236 }}>
                  {/* QR Image */}
                  <img
                    src={waQrDataUrl}
                    alt="WhatsApp QR Code"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      filter: isQrExpired ? 'blur(4px) grayscale(50%)' : 'none',
                      transition: 'filter 0.2s ease',
                    }}
                  />

                  {/* Centered WhatsApp Brand Logo */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#25D366',
                      border: '2.5px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      pointerEvents: 'none',
                    }}
                  >
                    <MessageCircle size={20} color="#ffffff" fill="#ffffff" />
                  </div>

                  {/* Expired QR Overlay */}
                  {isQrExpired && (
                    <div
                      onClick={handleReloadQR}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.7)',
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        cursor: 'pointer',
                        zIndex: 3,
                        padding: 16,
                      }}
                    >
                      <RefreshCw size={28} color="#25D366" style={{ marginBottom: 8 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>
                        QR expired, click to reload
                      </span>
                      <span style={{ fontSize: 11, color: '#cbd5e1' }}>
                        Click here to generate a fresh QR
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: 20, color: '#64748b', fontSize: 13 }}>
                  <RefreshCw size={30} className="animate-spin" color="#05424A" style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                    {waStatus === 'connecting' ? 'Connecting to WhatsApp...' : 'Generating WhatsApp QR Code...'}
                  </p>
                  <p style={{ margin: '4px 0 12px', fontSize: 11.5, color: '#64748b' }}>
                    {waStatus === 'connecting'
                      ? 'Establishing secure Baileys socket link'
                      : 'Connecting to Baileys socket service'}
                  </p>
                  <button
                    type="button"
                    onClick={handleReloadQR}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <RefreshCw size={11} /> Refresh QR
                  </button>
                </div>
              )}
            </div>

        {/* 3 Numbered Steps */}
        <div
          style={{
            textAlign: 'left',
            maxWidth: 320,
            width: '100%',
            marginBottom: 16,
            background: '#f8fafc',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 12.5, color: '#334155' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#05424A', color: '#fff', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              1
            </span>
            <span>Open WhatsApp on your mobile, tap on the ⋮ icon</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 12.5, color: '#334155' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#05424A', color: '#fff', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              2
            </span>
            <span>Tap &quot;Linked devices&quot; to open the QR scanner</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#334155' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#05424A', color: '#fff', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              3
            </span>
            <span>&quot;Scan the QR code&quot; on the right side using your phone</span>
          </div>
        </div>

        {/* Checkbox: Proceed with Standard Usage Terms */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            color: '#475569',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#05424A', cursor: 'pointer' }}
          />
          <span>
            Proceed with{' '}
            <span style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 600 }}>
              Standard Usage Terms
            </span>
          </span>
        </label>
          </>
        )}
      </div>
    </div>
  );
}

