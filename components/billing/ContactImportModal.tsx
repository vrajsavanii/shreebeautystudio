// components/billing/ContactImportModal.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Smartphone,
  Clipboard,
  FileText,
  Search,
  CheckCircle2,
  Sparkles,
  UserCheck,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface ContactImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers?: Array<{ id: string; name: string; mobile: string; loyaltyPoints?: number }>;
  onSelectContact: (name: string, mobile: string) => void;
}

export default function ContactImportModal({
  isOpen,
  onClose,
  customers = [],
  onSelectContact,
}: ContactImportModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'paste' | 'search' | 'vcf'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Smart Parser for pasted WhatsApp / Phonebook text
  const handleParseAndApply = () => {
    const text = pasteText.trim();
    if (!text) {
      toast('Please enter or paste contact details', 'error');
      return;
    }

    // Find Indian 10-digit mobile number
    const phoneMatch = text.match(/(?:(?:\+?91|0)[-\s]?)?([6-9]\d{9})/);
    let extractedPhone = '';
    let extractedName = '';

    if (phoneMatch) {
      extractedPhone = phoneMatch[1];
      // Name is the rest of the text without phone number and punctuation
      extractedName = text
        .replace(phoneMatch[0], '')
        .replace(/[\(\)—\-\:\,\+]/g, ' ')
        .replace(/tel|phone|contact|name|mobile/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      // Check if text is just digits
      const digits = text.replace(/\D/g, '');
      if (digits.length >= 10) {
        extractedPhone = digits.slice(-10);
      } else {
        extractedName = text;
      }
    }

    if (!extractedPhone && !extractedName) {
      toast('Could not detect a valid name or 10-digit number', 'error');
      return;
    }

    // Capitalize name
    const cleanName = extractedName
      ? extractedName
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      : '';

    onSelectContact(cleanName, extractedPhone);
    toast(`✅ Imported: ${cleanName || 'Contact'} (${extractedPhone || 'No phone'})`);
    setPasteText('');
    onClose();
  };

  // vCard (.vcf) Parser (for iPhone and exported Android contacts)
  const handleVcfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      let name = '';
      let tel = '';

      // Parse FN (Full Name)
      const fnMatch = content.match(/FN(?:;[^:]*)?:([^\r\n]+)/i);
      if (fnMatch) name = fnMatch[1].trim();

      // Parse TEL
      const telMatch = content.match(/TEL(?:;[^:]*)?:([^\r\n]+)/i);
      if (telMatch) {
        const rawDigits = telMatch[1].replace(/\D/g, '');
        tel = rawDigits.slice(-10);
      }

      if (name || tel) {
        onSelectContact(name, tel);
        toast(`📇 Imported from vCard: ${name} (${tel})`);
        onClose();
      } else {
        toast('Could not find name or phone number in contact file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery)
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.04)',
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #05424A 0%, #0d9488 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Smartphone size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
                Import Contact (Android & iPhone)
              </div>
              <div style={{ fontSize: 11, color: '#ccfbf1', marginTop: 1 }}>
                Auto-match & import Name & Mobile Number
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '4px 8px 0',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              borderBottom: activeTab === 'paste' ? '2px solid #0d9488' : '2px solid transparent',
              background: 'transparent',
              fontWeight: activeTab === 'paste' ? 700 : 500,
              fontSize: 11.5,
              color: activeTab === 'paste' ? '#0f766e' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <Clipboard size={13} />
            <span>Paste / WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              borderBottom: activeTab === 'search' ? '2px solid #0d9488' : '2px solid transparent',
              background: 'transparent',
              fontWeight: activeTab === 'search' ? 700 : 500,
              fontSize: 11.5,
              color: activeTab === 'search' ? '#0f766e' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <Search size={13} />
            <span>Salon Directory</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vcf')}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              borderBottom: activeTab === 'vcf' ? '2px solid #0d9488' : '2px solid transparent',
              background: 'transparent',
              fontWeight: activeTab === 'vcf' ? 700 : 500,
              fontSize: 11.5,
              color: activeTab === 'vcf' ? '#0f766e' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <Upload size={13} />
            <span>vCard File</span>
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {activeTab === 'paste' && (
            <div>
              <div style={{ fontSize: 12, color: '#334155', fontWeight: 600, marginBottom: 6 }}>
                Paste WhatsApp message, phonebook contact, or text:
              </div>
              <textarea
                rows={3}
                placeholder="Example: Pooja Patel +91 98241 83769&#10;or: 9316531885 Niti"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  padding: '8px 10px',
                  fontSize: 12.5,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={handleParseAndApply}
                  style={{
                    background: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={14} />
                  <span>Auto-Detect & Fill</span>
                </button>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 10,
                  background: '#f0fdf4',
                  borderRadius: 8,
                  border: '1px solid #bbf7d0',
                  fontSize: 11,
                  color: '#166534',
                  lineHeight: 1.45,
                }}
              >
                💡 <b>Tip for Android & iPhone:</b> Tap into the Customer Name or Mobile field directly on your phone, and your mobile keyboard will suggest contacts automatically!
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search
                  size={14}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: 9, top: 10 }}
                />
                <input
                  type="text"
                  placeholder="Search by name or 10-digit number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 28px',
                    fontSize: 12,
                    borderRadius: 7,
                    border: '1.5px solid #cbd5e1',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {filteredCustomers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: '#94a3b8' }}>
                    No customer match found
                  </div>
                ) : (
                  filteredCustomers.slice(0, 15).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectContact(c.name, c.mobile);
                        onClose();
                        toast(`✅ Auto-imported: ${c.name} (${c.mobile})`);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdfa')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 600 }}>
                          📞 {c.mobile}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#05424A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <span>Select</span>
                        <ArrowRight size={12} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'vcf' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#f0fdfa',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto',
                }}
              >
                <FileText size={22} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                Upload iPhone or Android Contact Card (.vcf)
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 14, maxWidth: 280, margin: '0 auto 14px auto' }}>
                Share or export a contact as .vcf from your phone, and select it here to auto-fill name & number.
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 8,
                  background: '#0d9488',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                <span>Choose .vcf Contact File</span>
                <input
                  type="file"
                  accept=".vcf,text/vcard"
                  onChange={handleVcfUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
