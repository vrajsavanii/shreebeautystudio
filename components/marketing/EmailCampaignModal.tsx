// components/marketing/EmailCampaignModal.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Sparkles, Users, Check, AlertCircle, Eye, Loader2, Tag } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Customer } from '@/types/salon';
import { useToast } from '@/components/ui/Toast';
import { useSalonStore } from '@/lib/store';

interface EmailCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  defaultEmail?: string;
}

export default function EmailCampaignModal({
  isOpen,
  onClose,
  customers,
  defaultEmail,
}: EmailCampaignModalProps) {
  const { data } = useSalonStore();
  const { toast } = useToast();

  const [audience, setAudience] = useState<'all' | 'single'>('all');
  const [singleEmail, setSingleEmail] = useState(defaultEmail || '');
  const [subject, setSubject] = useState('✨ Exclusive Glamour Offer from Shree Beauty Studio');
  const [headline, setHeadline] = useState('Celebrate Your Beauty with Special Studio Savings');
  const [message, setMessage] = useState(
    'Treat yourself to a lavish salon experience! Enjoy exclusive savings on our premium hair spas, rejuvenating facials, and bridal makeovers this season.\n\nBook your appointment today and step into elegance.'
  );
  const [discountText, setDiscountText] = useState('FLAT 20% OFF');
  const [promoCode, setPromoCode] = useState('GLAMOUR20');
  const [ctaText, setCtaText] = useState('Book Your Appointment');
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Filter customers with valid email
  const customersWithEmail = useMemo(() => {
    return (customers || []).filter(
      (c) => c.email && c.email.includes('@') && c.email.includes('.')
    );
  }, [customers]);

  const recipientList = useMemo(() => {
    if (audience === 'single') {
      return singleEmail.trim() ? [singleEmail.trim()] : [];
    }
    return customersWithEmail.map((c) => c.email!.trim());
  }, [audience, singleEmail, customersWithEmail]);

  const buildHtml = (custEmail: string) => {
    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    return `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <div style="background: #05424A; color: #ffffff; padding: 28px 20px; text-align: center; border-bottom: 3px solid #D4AF37;">
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">${salon}</h1>
          <p style="margin: 6px 0 0; color: #D4AF37; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;">Luxury Salon &amp; Couture Bridal Lounge</p>
        </div>
        <div style="padding: 32px 24px; text-align: center; background: #ffffff;">
          <div style="display: inline-block; background: #FEF9C3; color: #854D0E; border: 1px solid #FEF08A; padding: 4px 14px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 16px;">
            ✨ EXCLUSIVE STUDIO INVITATION ✨
          </div>
          <h2 style="color: #05424A; font-size: 22px; margin: 0 0 14px; font-weight: 700; line-height: 1.3;">${headline}</h2>
          <div style="color: #334155; font-size: 14px; line-height: 1.65; white-space: pre-line; margin-bottom: 24px;">${message}</div>
          ${
            discountText || promoCode
              ? `<div style="background: #FAF9F6; border: 2px dashed #D4AF37; border-radius: 10px; padding: 18px; margin: 20px 0; text-align: center;">
                  ${discountText ? `<div style="font-size: 22px; font-weight: 800; color: #05424A; letter-spacing: 1px;">${discountText}</div>` : ''}
                  ${promoCode ? `<div style="font-family: monospace; font-size: 17px; font-weight: 700; color: #05424A; letter-spacing: 2px; margin-top: 6px; background: #ffffff; display: inline-block; padding: 4px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">USE CODE: <strong>${promoCode}</strong></div>` : ''}
                </div>`
              : ''
          }
          <div style="margin-top: 28px;">
            <a href="https://shreebeauty.studio/book" style="display: inline-block; background: linear-gradient(135deg, #EABA38 0%, #D4AF37 100%); color: #032B30; font-weight: 700; font-size: 14px; padding: 13px 32px; border-radius: 99px; text-decoration: none; box-shadow: 0 4px 14px rgba(212,175,55,0.35);">
              ${ctaText || 'Book Appointment Online'} &rarr;
            </a>
          </div>
          <div style="margin-top: 14px;">
            <a href="https://wa.me/919773240010?text=Hi%20Shree%20Beauty%20Studio!%20I%20received%20your%20offer%20email." style="display: inline-block; color: #05424A; font-size: 12.5px; font-weight: 600; text-decoration: underline;">
              Or chat with us on WhatsApp (+91 97732 40010)
            </a>
          </div>
        </div>
        <div style="background: #FAF9F6; border-top: 1px solid #E2E8F0; padding: 16px 20px; text-align: center; font-size: 11.5px; color: #64748B;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #334155;">📍 22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004</p>
          <p style="margin: 0;">Sent with care by Shree Beauty Studio &bull; Reply to this email or reach us at <a href="mailto:shreebeauty.studio22@gmail.com" style="color: #05424A;">shreebeauty.studio22@gmail.com</a></p>
        </div>
      </div>
    `;
  };

  const handleSend = async () => {
    if (!recipientList.length) {
      toast('Please select or enter at least one recipient email.', 'error');
      return;
    }
    setSending(true);
    let successCount = 0;
    let failCount = 0;
    try {
      for (const to of recipientList) {
        try {
          const res = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'marketing',
              to,
              subject,
              html: buildHtml(to),
              message,
              replyTo: 'shreebeauty.studio22@gmail.com',
            }),
          });
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      if (successCount > 0) {
        toast(`✅ Successfully dispatched campaign email to ${successCount} recipient(s)!`, 'success');
        onClose();
      } else {
        toast(`⚠️ Could not send campaign emails. Please check domain & API settings.`, 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error sending campaign email.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📧 Send Email Marketing Campaign"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye size={14} /> {previewMode ? 'Edit Mode' : 'Preview Email'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <motion.button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || !recipientList.length}
              whileTap={{ scale: 0.97 }}
              style={{ background: '#05424A', borderColor: '#05424A' }}
            >
              {sending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Dispatching...
                </>
              ) : (
                <>
                  <Send size={14} /> Send to {recipientList.length} Recipient{recipientList.length === 1 ? '' : 's'}
                </>
              )}
            </motion.button>
          </div>
        </div>
      }
    >
      <div style={{ maxHeight: '72vh', overflowY: 'auto', padding: '4px 2px' }}>
        {!previewMode ? (
          <div>
            {/* Audience Selector */}
            <div className="form-group">
              <label className="label" style={{ fontWeight: 700 }}>
                🎯 Target Audience
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div
                  onClick={() => setAudience('all')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `2px solid ${audience === 'all' ? '#05424A' : 'var(--border)'}`,
                    background: audience === 'all' ? '#F0F9FA' : '#FFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
                    <Users size={16} color="#05424A" /> All Email Clients
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {customersWithEmail.length} customer{customersWithEmail.length === 1 ? '' : 's'} on record
                  </div>
                </div>

                <div
                  onClick={() => setAudience('single')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `2px solid ${audience === 'single' ? '#05424A' : 'var(--border)'}`,
                    background: audience === 'single' ? '#F0F9FA' : '#FFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
                    <Mail size={16} color="#05424A" /> Single Recipient
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Send test or custom direct message
                  </div>
                </div>
              </div>

              {audience === 'single' && (
                <div style={{ marginTop: 8 }}>
                  <input
                    type="email"
                    className="input"
                    placeholder="Enter recipient email (e.g. client@gmail.com)"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Campaign Details */}
            <div className="form-group">
              <label className="label">Subject Line *</label>
              <input
                type="text"
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. ✨ Special Salon Gift Just for You!"
              />
            </div>

            <div className="form-group">
              <label className="label">Hero Headline *</label>
              <input
                type="text"
                className="input"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Refresh Your Style with Festive Glamour"
              />
            </div>

            <div className="form-group">
              <label className="label">Promotional Message Body *</label>
              <textarea
                className="input"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the personalized announcement or promotional message here..."
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="label">Discount Banner (Optional)</label>
                <input
                  type="text"
                  className="input"
                  value={discountText}
                  onChange={(e) => setDiscountText(e.target.value)}
                  placeholder="e.g. FLAT 25% OFF"
                />
              </div>

              <div className="form-group">
                <label className="label">Promo Code (Optional)</label>
                <input
                  type="text"
                  className="input"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE25"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">CTA Button Label</label>
              <input
                type="text"
                className="input"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Book Your Appointment"
              />
            </div>
          </div>
        ) : (
          /* Live HTML Preview */
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                background: '#05424A',
                color: '#FFF',
                padding: '20px 16px',
                borderRadius: '8px 8px 0 0',
                textAlign: 'center',
                borderBottom: '3px solid #D4AF37',
              }}
            >
              <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 18 }}>
                {data?.settings?.salon || 'SHREE BEAUTY STUDIO'}
              </h3>
              <div style={{ color: '#D4AF37', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                LUXURY SALON &amp; BRIDAL LOUNGE
              </div>
            </div>

            <div style={{ background: '#FFF', padding: 24, borderRadius: '0 0 8px 8px' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span
                  style={{
                    background: '#FEF9C3',
                    color: '#854D0E',
                    border: '1px solid #FEF08A',
                    borderRadius: 99,
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ✨ EXCLUSIVE SALON OFFER ✨
                </span>
                <h2 style={{ color: '#05424A', fontSize: 20, margin: '14px 0 8px' }}>{headline}</h2>
                <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {message}
                </div>
              </div>

              {(discountText || promoCode) && (
                <div
                  style={{
                    background: '#FDFBF5',
                    border: '2px dashed #D4AF37',
                    borderRadius: 10,
                    padding: 16,
                    textAlign: 'center',
                    margin: '16px 0',
                  }}
                >
                  {discountText && (
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#05424A' }}>{discountText}</div>
                  )}
                  {promoCode && (
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#05424A',
                        letterSpacing: 2,
                        marginTop: 4,
                      }}
                    >
                      {promoCode}
                    </div>
                  )}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 99,
                    padding: '10px 24px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {ctaText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
