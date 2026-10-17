'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, Sparkles, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useSalonStore } from '@/lib/store';
import { todayISO } from '@/lib/utils';
import {
  playAdminAppointmentReminderSound,
  playAdminPendingBillSound,
  playSuccessChime,
} from '@/lib/notification-sound';

/**
 * Parses time string like "14:30" or "02:30 PM" into total minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();

  // 12-hour format e.g. "02:30 pm"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = parseInt(match12[2], 10);
    const meridiem = match12[3];
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  // 24-hour format e.g. "14:30"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = parseInt(match24[2], 10);
    return hours * 60 + mins;
  }

  return null;
}

export default function AdminNotificationDaemon() {
  const { toast } = useToast();
  const { data, currentUser } = useSalonStore();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const warnedAppointmentsRef = useRef<Set<string>>(new Set());

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      const dismissed = localStorage.getItem('shree_admin_notif_prompt_dismissed');
      if (Notification.permission === 'default' && !dismissed) {
        // Show polite permission banner after 4 seconds
        const timer = setTimeout(() => setShowPromptBanner(true), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      setShowPromptBanner(false);
      if (res === 'granted') {
        playSuccessChime(true);
        toast('🔔 Device notifications enabled for appointments, bills & booking alerts!', 'success');
        try {
          new Notification('Shree Beauty Studio Staff Alerts', {
            body: 'Notifications are now active on your device! You will receive audio & push reminders for appointments and pending bills.',
            icon: '/icons/icon-192x192.png',
          });
        } catch {}
      } else {
        toast('Notifications were blocked. You can still hear in-app chimes.', 'info');
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
  };

  const dismissPromptBanner = () => {
    setShowPromptBanner(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shree_admin_notif_prompt_dismissed', 'true');
    }
  };

  // Helper to send OS notification
  const sendOSNotification = useCallback((title: string, body: string, tag: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          tag,
        });
      } catch (err) {
        console.warn('Failed to dispatch native Notification:', err);
      }
    }
  }, []);

  // 1. SCANNER: Upcoming Appointments (starts in next 30 mins or starting right now)
  const checkUpcomingAppointments = useCallback(() => {
    if (!data?.appointments || data.appointments.length === 0) return;

    const today = todayISO();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayAppts = data.appointments.filter(
      (a) =>
        a.date === today &&
        a.status !== 'Cancelled' &&
        a.status !== 'Completed' &&
        a.workStatus !== 'Completed' &&
        a.workStatus !== 'Billed'
    );

    for (const appt of todayAppts) {
      const apptMinutes = parseTimeToMinutes(appt.time);
      if (apptMinutes === null) continue;

      const diff = apptMinutes - currentMinutes;

      // Tier 1 Warning: 10 to 30 minutes before appointment
      if (diff > 0 && diff <= 30) {
        const key = `appt_soon_${appt.id}`;
        if (!warnedAppointmentsRef.current.has(key)) {
          warnedAppointmentsRef.current.add(key);
          try {
            sessionStorage.setItem(`shree_alert_${key}`, '1');
          } catch {}

          // Play signature appointment alert sound
          playAdminAppointmentReminderSound();

          // Show in-app interactive toast
          toast(
            `⏰ Appointment in ${diff}m: ${appt.customer} for ${appt.service} with ${appt.staff || 'Staff'} at ${appt.time}`,
            'info'
          );

          // Dispatch native OS notification
          sendOSNotification(
            `⏰ Appointment in ${diff}m: ${appt.customer}`,
            `${appt.service} with ${appt.staff || 'Staff'} scheduled at ${appt.time}`,
            `appt-warn-${appt.id}`
          );
        }
      }

      // Tier 2: Appointment Starting Now (-5 to 0 mins)
      if (diff <= 0 && diff >= -15) {
        const key = `appt_now_${appt.id}`;
        if (!warnedAppointmentsRef.current.has(key)) {
          warnedAppointmentsRef.current.add(key);
          try {
            sessionStorage.setItem(`shree_alert_${key}`, '1');
          } catch {}

          // Play signature appointment alert sound
          playAdminAppointmentReminderSound();

          // Show in-app interactive toast
          toast(
            `🔔 Appointment Starting Now: ${appt.customer} (${appt.service}) — Assigned to ${appt.staff || 'Staff'}`,
            'info'
          );

          // Dispatch native OS notification
          sendOSNotification(
            `🔔 Appointment Starting Now: ${appt.customer}`,
            `${appt.service} with ${appt.staff || 'Staff'} is scheduled now (${appt.time})`,
            `appt-now-${appt.id}`
          );
        }
      }
    }
  }, [data?.appointments, sendOSNotification, toast]);

  // 2. SCANNER: Remaining Bills & Unpaid Balances
  const checkPendingBills = useCallback(() => {
    if (!data) return;

    // Throttle check to avoid disturbing staff too frequently (at most once every 45 minutes)
    const lastAlertStr = typeof window !== 'undefined' ? sessionStorage.getItem('shree_last_bill_alert_ts') : null;
    const nowTs = Date.now();
    if (lastAlertStr && nowTs - parseInt(lastAlertStr, 10) < 45 * 60 * 1000) {
      return;
    }

    // Find invoices with balance > 0
    const invoicesWithBalance = (data.invoices || []).filter((inv) => Number(inv.balance || 0) > 0);
    const invoicePendingSum = invoicesWithBalance.reduce((acc, inv) => acc + Number(inv.balance || 0), 0);

    // Find completed appointments today that have pending payment
    const today = todayISO();
    const unpaidAppointments = (data.appointments || []).filter(
      (a) =>
        a.date === today &&
        (a.status === 'Completed' || a.workStatus === 'Completed') &&
        !a.invoiceId &&
        Number(a.price || 0) > Number(a.advance || 0)
    );
    const apptPendingSum = unpaidAppointments.reduce(
      (acc, a) => acc + (Number(a.price || 0) - Number(a.advance || 0)),
      0
    );

    const totalCount = invoicesWithBalance.length + unpaidAppointments.length;
    const totalAmount = invoicePendingSum + apptPendingSum;

    if (totalCount > 0 && totalAmount > 0) {
      try {
        sessionStorage.setItem('shree_last_bill_alert_ts', nowTs.toString());
      } catch {}

      // Play metallic gold cash register / bill sound
      playAdminPendingBillSound();

      // In-app Toast alert
      toast(
        `💰 Remaining Bills Reminder: ${totalCount} client(s) have unpaid balance totaling ₹${totalAmount.toLocaleString('en-IN')}. Check Billing POS.`,
        'info'
      );

      // Native OS notification
      sendOSNotification(
        `💰 Pending Bills & Balances Alert (${totalCount})`,
        `Total outstanding balance: ₹${totalAmount.toLocaleString('en-IN')}. Tap to open Billing POS.`,
        'shree-bill-alert'
      );
    }
  }, [data, sendOSNotification, toast]);

  // Periodic interval scanner (Appointments every 20 seconds, Bills checked every 60 seconds)
  useEffect(() => {
    // Initial check after short warmup delay
    const initialTimer = setTimeout(() => {
      checkUpcomingAppointments();
      checkPendingBills();
    }, 6000);

    const apptInterval = setInterval(checkUpcomingAppointments, 20000);
    const billInterval = setInterval(checkPendingBills, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(apptInterval);
      clearInterval(billInterval);
    };
  }, [checkUpcomingAppointments, checkPendingBills]);

  // Listen for custom trigger events across admin pages
  useEffect(() => {
    const handleAdminNotify = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type: 'appointment' | 'bill' | 'booking' | 'customer';
        title: string;
        body: string;
      }>;
      if (!customEvent.detail) return;
      const { type, title, body } = customEvent.detail;

      if (type === 'appointment') {
        playAdminAppointmentReminderSound();
      } else if (type === 'bill') {
        playAdminPendingBillSound();
      }

      toast(`${title}: ${body}`, 'info');
      sendOSNotification(title, body, `admin-${type}-${Date.now()}`);
    };

    window.addEventListener('shree-admin-notify', handleAdminNotify);
    return () => window.removeEventListener('shree-admin-notify', handleAdminNotify);
  }, [sendOSNotification, toast]);

  return (
    <>
      {/* Discreet Staff Notification Permission Banner */}
      {showPromptBanner && permission === 'default' && (
        <div
          role="dialog"
          aria-label="Staff Notification Prompt"
          style={{
            position: 'fixed',
            top: '64px',
            right: '20px',
            maxWidth: '380px',
            zIndex: 9999,
            background: '#032B30',
            border: '1px solid rgba(234, 186, 56, 0.4)',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            color: '#FFFFFF',
            animation: 'fadeInDown 0.3s ease-out forwards',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(234, 186, 56, 0.15)',
                border: '1px solid rgba(234, 186, 56, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#EABA38',
              }}
            >
              <Bell size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                  Enable Device Alerts
                </span>
                <button
                  type="button"
                  onClick={dismissPromptBanner}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', lineHeight: 1.4, color: 'rgba(255,255,255,0.8)' }}>
                Receive audio chimes & device push alerts for upcoming appointments, pending bills, and new client bookings.
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={requestPermission}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #EABA38 0%, #D49B1F 100%)',
                    color: '#032B30',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={12} />
                  <span>Enable Device Alerts</span>
                </button>
                <button
                  type="button"
                  onClick={dismissPromptBanner}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '11.5px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
