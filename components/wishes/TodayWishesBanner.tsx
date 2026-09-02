// components/wishes/TodayWishesBanner.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Heart, Send, CheckCircle2, Sparkles, MessageCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { getTodaysCelebrants, sendCelebrantWish, sendAllTodaysWishes, TodaysCelebrant } from '@/lib/auto-wish';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

interface TodayWishesBannerProps {
  compact?: boolean;
}

export default function TodayWishesBanner({ compact = false }: TodayWishesBannerProps) {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [previewCelebrant, setPreviewCelebrant] = useState<TodaysCelebrant | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [sendingAll, setSendingAll] = useState(false);

  const celebrants = useMemo(() => {
    return getTodaysCelebrants(data?.customers || [], data?.settings);
  }, [data?.customers, data?.settings]);

  if (celebrants.length === 0) return null;

  const unwishedCount = celebrants.filter((c) => !c.alreadyWished).length;

  const handleSendSingle = async (cel: TodaysCelebrant) => {
    try {
      const res = await sendCelebrantWish(cel, data?.settings, updateData);
      if (res.method === 'cloud_api') {
        toast(`✅ Wish sent automatically to ${cel.customer.name} via WhatsApp API! 🎉`);
      } else {
        toast(`WhatsApp opened to wish ${cel.customer.name}! 💖`);
      }
    } catch {
      toast('Failed to send wish', 'error');
    }
  };

  const handleSendCustom = async () => {
    if (!previewCelebrant) return;
    try {
      const modifiedCel = { ...previewCelebrant, message: customMsg };
      const res = await sendCelebrantWish(modifiedCel, data?.settings, updateData);
      if (res.method === 'cloud_api') {
        toast(`✅ Custom wish sent to ${previewCelebrant.customer.name}! 🎉`);
      } else {
        toast(`WhatsApp opened for ${previewCelebrant.customer.name}! 💖`);
      }
      setPreviewCelebrant(null);
    } catch {
      toast('Failed to send wish', 'error');
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      const { sentCount, method } = await sendAllTodaysWishes(celebrants, data?.settings, updateData);
      if (method === 'cloud_api') {
        toast(`🎉 Successfully sent ${sentCount} celebration wishes automatically via WhatsApp API! 🚀`);
      } else {
        toast(`Sent wishes for ${sentCount} celebrants via WhatsApp! ✨`);
      }
    } catch {
      toast('Error sending all wishes', 'error');
    } finally {
      setSendingAll(false);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fdf2f8 50%, #f0fdf4 100%)',
        border: '2px solid #f59e0b',
        borderRadius: 14,
        padding: compact ? '12px 16px' : '16px 20px',
        marginBottom: 20,
        boxShadow: '0 4px 18px rgba(245, 158, 11, 0.12)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gift size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#92400e' }}>
                🎉 Today's Customer Celebrations &amp; Wishes
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: '#fde68a',
                  color: '#78350f',
                }}
              >
                {celebrants.length} Milestone{celebrants.length > 1 ? 's' : ''} Today
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
              {unwishedCount > 0
                ? `⚡ ${unwishedCount} customer${unwishedCount > 1 ? 's have' : ' has'} not been wished yet. Send wishes now!`
                : '✅ All customers have been wished for today!'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unwishedCount > 0 && (
            <motion.button
              type="button"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderColor: '#b45309',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                padding: '6px 14px',
              }}
              onClick={handleSendAll}
              disabled={sendingAll}
              whileTap={{ scale: 0.96 }}
            >
              <Sparkles size={14} />
              {sendingAll ? 'Sending...' : `Auto Send All (${unwishedCount})`}
            </motion.button>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px 10px', color: '#92400e' }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Celebrants List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: 14, overflow: 'hidden' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
              {celebrants.map((cel) => (
                <div
                  key={`${cel.customer.id}_${cel.type}`}
                  style={{
                    background: '#fff',
                    border: cel.alreadyWished ? '1.5px solid #86efac' : '1.5px solid #fde68a',
                    borderRadius: 10,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background:
                            cel.type === 'birthday'
                              ? '#fef3c7'
                              : cel.type === 'sagai'
                              ? '#e0f2fe'
                              : '#fce7f3',
                          color:
                            cel.type === 'birthday'
                              ? '#92400e'
                              : cel.type === 'sagai'
                              ? '#0369a1'
                              : '#9d174d',
                          display: 'inline-block',
                          marginBottom: 4,
                        }}
                      >
                        {cel.type === 'birthday' && '🎂 Birthday'}
                        {cel.type === 'sagai' && '💍 Sagai Anniversary'}
                        {cel.type === 'anniversary' && '👰 Wedding Anniversary'}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#1e293b' }}>
                        {cel.customer.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {cel.customer.mobile}
                      </div>
                    </div>

                    {cel.alreadyWished ? (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: '#166534',
                          background: '#dcfce7',
                          padding: '2px 7px',
                          borderRadius: 99,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <CheckCircle2 size={11} /> Wished
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: '#b45309',
                          background: '#fef3c7',
                          padding: '2px 7px',
                          borderRadius: 99,
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{
                        flex: 1,
                        fontSize: 11,
                        padding: '4px 8px',
                        background: cel.alreadyWished ? '#059669' : '#f59e0b',
                        borderColor: cel.alreadyWished ? '#047857' : '#d97706',
                      }}
                      onClick={() => handleSendSingle(cel)}
                    >
                      <MessageCircle size={12} />
                      {cel.alreadyWished ? 'Wish Again' : 'Send WhatsApp Wish'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: 11, padding: '4px 8px', color: '#64748b' }}
                      title="Preview / Edit message"
                      onClick={() => {
                        setPreviewCelebrant(cel);
                        setCustomMsg(cel.message);
                      }}
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview / Edit Custom Message Modal */}
      {previewCelebrant && (
        <Modal
          isOpen={!!previewCelebrant}
          onClose={() => setPreviewCelebrant(null)}
          title={`🎉 Wish ${previewCelebrant.customer.name} on WhatsApp`}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPreviewCelebrant(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSendCustom}>
                <Send size={14} /> Send WhatsApp Wish
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              Message for {previewCelebrant.customer.name} ({previewCelebrant.customer.mobile}):
            </div>
            <textarea
              className="input"
              rows={6}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              style={{ fontSize: 12.5, lineHeight: 1.5, fontFamily: 'monospace' }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
