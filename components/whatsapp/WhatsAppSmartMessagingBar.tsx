// components/whatsapp/WhatsAppSmartMessagingBar.tsx
// Quick-action pill row & AI Smart Replies suggestion panel

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, Smartphone, RefreshCw, ChevronDown, Check } from 'lucide-react';

interface WhatsAppSmartMessagingBarProps {
  customerName: string;
  targetPhone: string;
  lastMessages: any[];
  onSelectSuggestion: (text: string) => void;
  onSendPartyStatement: () => void;
  onShareOnlineStore: () => void;
}

export default function WhatsAppSmartMessagingBar({
  customerName,
  targetPhone,
  lastMessages,
  onSelectSuggestion,
  onSendPartyStatement,
  onShareOnlineStore,
}: WhatsAppSmartMessagingBarProps) {
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/whatsapp/ai-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || 'Client',
          lastMessages: lastMessages.slice(-10),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.suggestions) && json.suggestions.length > 0) {
          setSuggestions(json.suggestions);
          return;
        }
      }
    } catch {}

    // Fallback based on time of day
    const hour = new Date().getHours();
    const tod = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    setSuggestions([
      `Hello ${customerName || 'Client'}, how can we help you today?`,
      `${tod} ${customerName || 'Client'}! What can we do for you at Shree Beauty Studio?`,
      `Hi ${customerName || 'Client'}, hope you're doing well! Would you like to book an appointment?`,
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSuggestions();
  }, [customerName, targetPhone]);

  return (
    <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
      {/* ── QUICK ACTION ROW WITH 3 PILLS ── */}
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          background: '#f1f5f9',
          borderBottom: showAiPanel ? '1px solid #e2e8f0' : 'none',
        }}
      >
        {/* 1. Smart Messaging Pill (Orange/Green Gradient Border) */}
        <button
          type="button"
          onClick={() => setShowAiPanel((prev) => !prev)}
          style={{
            position: 'relative',
            background: showAiPanel ? '#ffffff' : '#f8fafc',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #f59e0b, #10b981)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            borderRadius: 99,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            transition: 'transform 0.1s ease',
          }}
          title="Toggle AI Smart Suggestions"
        >
          <Sparkles size={14} color="#f59e0b" />
          <span>Smart Messaging</span>
          <span
            style={{
              fontSize: 10,
              background: '#dcfce7',
              color: '#15803d',
              padding: '1px 6px',
              borderRadius: 99,
              fontWeight: 800,
            }}
          >
            AI
          </span>
        </button>

        {/* 2. Party Statement Pill (Red PDF Icon, Dropdown Arrow) */}
        <button
          type="button"
          onClick={onSendPartyStatement}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 99,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
          title="Send Customer Party Ledger / Statement PDF"
        >
          <FileText size={14} color="#dc2626" />
          <span>Party Statement</span>
          <ChevronDown size={13} color="#64748b" />
        </button>

        {/* 3. Share Online Store Pill (Mobile Icon) */}
        <button
          type="button"
          onClick={onShareOnlineStore}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 99,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
          title="Insert Online Store Link into Chat"
        >
          <Smartphone size={14} color="#0284c7" />
          <span>Share Online Store</span>
        </button>
      </div>

      {/* ── AI SUGGESTIONS PANEL (3 CARDS IN A ROW + REGENERATE) ── */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: '10px 14px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              overflowX: 'auto',
            }}
          >
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {suggestions.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectSuggestion(text);
                    setCopiedIdx(idx);
                    setTimeout(() => setCopiedIdx(null), 1200);
                  }}
                  style={{
                    background: copiedIdx === idx ? '#dcfce7' : '#f8fafc',
                    border: copiedIdx === idx ? '1px solid #86efac' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontSize: 11.5,
                    lineHeight: 1.4,
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (copiedIdx !== idx) e.currentTarget.style.borderColor = '#25D366';
                  }}
                  onMouseLeave={(e) => {
                    if (copiedIdx !== idx) e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                  title="Click to insert into message box"
                >
                  <span style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }}>
                    {copiedIdx === idx ? <Check size={13} /> : '💬'}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {text}
                  </span>
                </button>
              ))}
            </div>

            {/* Regenerate Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={fetchSuggestions}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
              title="Generate new suggestions"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Thinking...' : 'Regenerate'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
