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

import { usePathname } from 'next/navigation';
import { useSalonStore } from '@/lib/store';

const ALLOWED_SALES_ROUTES = ['/appointments', '/bridal', '/purchases', '/inventory', '/billing', '/customers'];

function DashboardShell({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useSalonStore();

  useEffect(() => {
    // Role permissions guard
    if (currentUser && currentUser.role === 'Salesperson') {
      const isAllowed = ALLOWED_SALES_ROUTES.some((route) => pathname === route || (route !== '/' && pathname.startsWith(route)));
      if (!isAllowed) {
        toast('🔒 Salesperson Mode: Access restricted to Appointments, Bridal, Purchase, Inventory & Billing.', 'error');
        router.replace('/billing');
      }
    }

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
  }, [toast, pathname, currentUser, router]);

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

