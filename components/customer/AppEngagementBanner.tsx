'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Sparkles, X, CalendarCheck } from 'lucide-react';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  scheduleDailyNotifications,
  setupNotificationListeners,
} from '@/lib/notifications/engagement-notifications';
import { playCustomerNotificationSound } from '@/lib/notification-sound';

export default function AppEngagementBanner() {
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grantedToast, setGrantedToast] = useState(false);

  useEffect(() => {
    // Setup deep link click listener for notifications
    setupNotificationListeners((url) => {
      router.push(url);
    });

    // Check if permission already granted or prompt was dismissed recently
    async function init() {
      const isGranted = await checkNotificationPermission();
      if (isGranted) {
        // Automatically ensure the daily notifications are scheduled with fresh reasons
        scheduleDailyNotifications();
        return;
      }

      // Check if user dismissed it recently (within 5 days)
      const dismissedUntil = localStorage.getItem('shree_notif_dismissed_until');
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        return;
      }

      // Delay prompt slightly for polite first-impression
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500);

      return () => clearTimeout(timer);
    }

    init();
  }, [router]);

  const handleEnable = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    setLoading(false);
    setShowPrompt(false);

    if (granted) {
      playCustomerNotificationSound(true);
      setGrantedToast(true);
      setTimeout(() => setGrantedToast(false), 4500);
    } else {
      // User declined, don't ask again for 7 days
      localStorage.setItem(
        'shree_notif_dismissed_until',
        (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
      );
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Dismiss for 4 days
    localStorage.setItem(
      'shree_notif_dismissed_until',
      (Date.now() + 4 * 24 * 60 * 60 * 1000).toString()
    );
  };

  if (!showPrompt && !grantedToast) return null;

  return (
    <>
      {/* ─── Permission Request Floating Card ─── */}
      {showPrompt && (
        <div
          role="dialog"
          aria-label="Notification Permission"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '16px',
            right: '16px',
            maxWidth: '440px',
            margin: '0 auto',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #032B30 0%, #05424A 100%)',
            border: '1px solid rgba(234, 186, 56, 0.4)',
            borderRadius: '18px',
            padding: '18px 20px',
            boxShadow: '0 16px 40px rgba(3, 43, 48, 0.45), 0 0 20px rgba(234, 186, 56, 0.2)',
            color: '#FFFFFF',
            animation: 'fadeInUp 0.35s ease-out forwards',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(234, 186, 56, 0.15)',
                border: '1px solid rgba(234, 186, 56, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#EABA38',
              }}
            >
              <Bell size={22} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Daily Beauty Perks</span>
                  <Sparkles size={14} color="#EABA38" />
                </h4>
                <button
                  onClick={handleDismiss}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', lineHeight: 1.45, color: 'rgba(255,255,255,0.82)' }}>
                Enable alerts to receive daily morning skin rituals, afternoon flash salon perks, and easy appointment reminders.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #EABA38 0%, #D49B1F 100%)',
                    color: '#032B30',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(234, 186, 56, 0.35)',
                  }}
                >
                  <Sparkles size={14} />
                  <span>{loading ? 'Enabling...' : 'Enable Beauty Alerts'}</span>
                </button>

                <button
                  onClick={handleDismiss}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 600,
                    fontSize: '12.5px',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                  }}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Success Confirmation Toast ─── */}
      {grantedToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#032B30',
            border: '1px solid #EABA38',
            borderRadius: '14px',
            padding: '12px 20px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CalendarCheck size={18} color="#EABA38" />
          <span>✨ Beauty alerts enabled! We’ll keep you glowing daily.</span>
        </div>
      )}
    </>
  );
}
