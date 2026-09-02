'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import AICopilotWidget from '@/components/copilot/AICopilotWidget';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { cloudSync } from '@/lib/sync';
import { initSupabaseRealtime } from '@/lib/realtime';
import { fadeSlideUp } from '@/variants';

function DashboardShell({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    // Auth guard & cloud sync on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        cloudSync().catch(() => {});
      }
    });

    // Initialize Supabase Realtime channel
    const unsubscribeRealtime = initSupabaseRealtime((newAppt) => {
      toast(
        `🔔 WhatsApp Booking: ${newAppt.customer} booked ${newAppt.service} on ${newAppt.date} at ${newAppt.time}!`,
        'success'
      );
    });

    return () => {
      unsubscribeRealtime();
    };
  }, [toast]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={typeof window !== 'undefined' ? window.location.pathname : ''}
              variants={fadeSlideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileBottomNav />
      <AICopilotWidget />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DashboardShell>{children}</DashboardShell>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </ToastProvider>
  );
}

