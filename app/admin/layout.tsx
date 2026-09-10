'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import AICopilotWidget from '@/components/copilot/AICopilotWidget';
import AdminAuthGate from '@/components/auth/AdminAuthGate';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { cloudSync } from '@/lib/sync';
import { initSupabaseRealtime } from '@/lib/realtime';
import { fadeSlideUp } from '@/variants';
import { useSalonStore } from '@/lib/store';

const ALLOWED_SALES_ROUTES = [
  '/admin/appointments',
  '/admin/bridal',
  '/admin/purchases',
  '/admin/inventory',
  '/admin/billing',
  '/admin/customers',
];

function DashboardShell({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useSalonStore();

  useEffect(() => {
    // Role permissions guard for Salesperson
    if (currentUser && currentUser.role === 'Salesperson') {
      const isAllowed = ALLOWED_SALES_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
      );
      if (!isAllowed) {
        toast('🔒 Salesperson Mode: Access restricted to Billing, Appointments, Bridal, Purchases & Inventory.', 'error');
        router.replace('/admin/billing');
      }
    }

    // Cloud sync on mount unconditionally to load latest live salon state
    cloudSync().catch(() => {});

    // Initialize Supabase Realtime channel for live bookings
    const unsubscribeRealtime = initSupabaseRealtime((newAppt) => {
      toast(
        `🔔 Online Booking: ${newAppt.customer} booked ${newAppt.service} for ${newAppt.date} at ${newAppt.time}!`,
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

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminAuthGate>
        <DashboardShell>{children}</DashboardShell>
      </AdminAuthGate>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </ToastProvider>
  );
}
