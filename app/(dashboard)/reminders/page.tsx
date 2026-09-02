'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bell, MessageCircle, Cake, Heart, Calendar, Sparkles } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { getAllUpcomingReminders, Reminder } from '@/lib/reminders';
import {
  openWA, birthdayMessage, anniversaryMessage,
  appointmentStaffMessage, bridalMessage,
} from '@/lib/whatsapp';
import { fmtDate } from '@/lib/utils';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { format, parseISO } from 'date-fns';

type TabFilter = 'all' | 'birthday' | 'anniversary' | 'appointment' | 'bridal';

export default function RemindersPage() {
  const { data } = useSalonStore();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const reminders = useMemo(() => getAllUpcomingReminders(data, 30), [data]);

  const counts = useMemo(() => ({
    all: reminders.length,
    birthday: reminders.filter((r) => r.type === 'birthday').length,
    anniversary: reminders.filter((r) => r.type === 'anniversary').length,
    appointment: reminders.filter((r) => r.type === 'appointment').length,
    bridal: reminders.filter((r) => r.type === 'bridal').length,
  }), [reminders]);

  const filteredReminders = useMemo(() => {
    if (activeTab === 'all') return reminders;
    return reminders.filter((r) => r.type === activeTab);
  }, [reminders, activeTab]);

  const handleWA = (r: Reminder) => {
    if (!r.mobile) return;
    let msg = '';
    const salonName = data?.settings?.salon || 'Shree Beauty Studio';
    if (r.type === 'birthday') {
      msg = birthdayMessage(r.title.replace('🎂 Birthday — ', ''), salonName);
    } else if (r.type === 'anniversary') {
      msg = anniversaryMessage(r.title.replace('💍 Anniversary — ', ''), salonName);
    } else if (r.type === 'appointment') {
      const appt = (data?.appointments || []).find((a) => a.mobile === r.mobile);
      if (appt) msg = appointmentStaffMessage(appt, salonName);
    } else if (r.type === 'bridal') {
      const b = (data?.bridal || []).find((x) => x.mobile === r.mobile);
      if (b) msg = bridalMessage(b.name, 'event', b.weddingDate, b.venue, salonName);
    }
    if (msg) openWA(r.mobile, msg);
  };

  const typeStyles: Record<string, { bg: string; text: string; icon: any }> = {
    birthday: { bg: '#e1f6ea', text: '#166534', icon: Cake },
    anniversary: { bg: '#fdf2f8', text: '#9d174d', icon: Heart },
    appointment: { bg: '#eff6ff', text: '#1e40af', icon: Calendar },
    bridal: { bg: '#fff7ed', text: '#9a3412', icon: Sparkles },
  };

  const tabs: { id: TabFilter; label: string; icon: any }[] = [
    { id: 'all', label: 'All Reminders', icon: Bell },
    { id: 'birthday', label: 'Birthdays', icon: Cake },
    { id: 'anniversary', label: 'Anniversaries', icon: Heart },
    { id: 'appointment', label: 'Appointments', icon: Calendar },
    { id: 'bridal', label: 'Bridal Events', icon: Sparkles },
  ];

  return (
    <div>
      {/* Sub Tabs */}
      <div className="tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              <span className="tab-badge">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="card">
        {filteredReminders.length === 0 ? (
          <div className="empty-state">
            <Bell size={44} />
            <h3>No {activeTab === 'all' ? 'upcoming' : activeTab} reminders</h3>
            <p>Upcoming customer alerts for the next 30 days will appear here automatically.</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{ padding: '6px 0' }}
          >
            {filteredReminders.map((r, idx) => {
              let d: Date;
              try { d = parseISO(r.date); } catch { d = new Date(); }
              const conf = typeStyles[r.type] || { bg: '#f8fafc', text: '#475569', icon: Bell };

              return (
                <motion.div
                  key={idx}
                  variants={fadeSlideUp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border)',
                  }}
                  whileHover={{ backgroundColor: '#f8fafc' }}
                >
                  {/* Date Box */}
                  <div style={{
                    width: 52, height: 54,
                    background: conf.bg,
                    borderRadius: 10,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, border: `1.5px solid ${conf.text}22`,
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: conf.text, lineHeight: 1 }}>
                      {format(d, 'd')}
                    </div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: conf.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {format(d, 'MMM')}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{r.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {fmtDate(r.date)}
                    </div>
                  </div>

                  {/* Type Tag */}
                  <div style={{
                    background: conf.bg, color: conf.text,
                    borderRadius: 99, padding: '3px 9px',
                    fontSize: 11, fontWeight: 700,
                    textTransform: 'capitalize',
                    border: `1px solid ${conf.text}33`,
                  }}>
                    {r.type}
                  </div>

                  {/* WhatsApp Action Button */}
                  {r.mobile && (
                    <motion.button
                      className="btn-icon wa"
                      onClick={() => handleWA(r)}
                      whileTap={{ scale: 0.9 }}
                      title="Send WhatsApp greeting/reminder"
                    >
                      <MessageCircle size={15} />
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
