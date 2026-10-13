// components/whatsapp/WhatsAppSyncingModal.tsx
// Syncing modal and connected empty-state backdrop

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Smartphone, Wifi, CheckCircle2 } from 'lucide-react';

interface WhatsAppSyncingModalProps {
  isOpen: boolean;
  onFinish?: () => void;
}

export default function WhatsAppSyncingModal({ isOpen, onFinish }: WhatsAppSyncingModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(6px)',
          padding: 16,
        }}
      >
        {/* Background Empty State Card (Visible behind dimmed overlay) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.22,
            pointerEvents: 'none',
            color: '#ffffff',
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              color: '#05424A',
            }}
          >
            <Smartphone size={48} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Phone connected</h2>
          <p style={{ fontSize: 14, maxWidth: 460, margin: 0, lineHeight: 1.5 }}>
            WhatsApp connects to your phone to sync messages. To reduce data usage, connect your phone to Wi-Fi.
          </p>
        </div>

        {/* Centered Modal Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'relative',
            zIndex: 10,
            background: '#ffffff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
          }}
        >
          <div style={{ padding: '36px 30px 28px' }}>
            {/* Pulsing WhatsApp Logo */}
            <motion.div
              animate={{
                scale: [1, 1.12, 1],
                boxShadow: [
                  '0 0 0 0 rgba(37, 211, 102, 0.4)',
                  '0 0 0 18px rgba(37, 211, 102, 0)',
                  '0 0 0 0 rgba(37, 211, 102, 0)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#ffffff',
              }}
            >
              <MessageCircle size={44} fill="#ffffff" color="#25D366" />
            </motion.div>

            {/* Heading */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 12px',
                letterSpacing: '-0.3px',
              }}
            >
              Just a Moment! Syncing Your Chats...
            </h2>

            {/* Subtext with bold red 5X */}
            <p
              style={{
                fontSize: 14.5,
                color: '#475569',
                margin: '0 0 20px',
                lineHeight: 1.5,
              }}
            >
              91% of businesses who use WhatsApp report <strong style={{ color: '#dc2626', fontWeight: 900 }}>5X</strong> more profits
            </p>

            {/* Progress Animation Bar */}
            <div
              style={{
                width: '100%',
                height: 6,
                background: '#f1f5f9',
                borderRadius: 99,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                style={{
                  width: '50%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #25D366, #128C7E)',
                  borderRadius: 99,
                }}
              />
            </div>
          </div>

          {/* Light-blue footer strip */}
          <div
            style={{
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '12px 20px',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderTop: '1px solid #bae6fd',
            }}
          >
            <span>🚀</span>
            <span>Join the community of 1Cr+ Vyaparis today!</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
