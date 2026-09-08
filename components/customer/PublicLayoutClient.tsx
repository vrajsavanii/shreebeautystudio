'use client';

import React, { useEffect } from 'react';
import CustomerNavbar from '@/components/customer/CustomerNavbar';
import CustomerFooter from '@/components/customer/CustomerFooter';
import { MessageCircle } from 'lucide-react';
import { useSalonStore } from '@/lib/store';

export default function PublicLayoutClient({ children }: { children: React.ReactNode }) {
  const { data, updateData } = useSalonStore();
  const whatsapp = data?.settings?.whatsapp || '919824183769';

  useEffect(() => {
    fetch('/api/public-data')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && (res.services || res.settings || res.bridalPackages)) {
          updateData((prev) => ({
            ...prev,
            settings: { ...prev.settings, ...(res.settings || {}) },
            services: res.services && res.services.length > 0 ? res.services : prev.services,
            bridalPackages:
              res.bridalPackages && res.bridalPackages.length > 0
                ? res.bridalPackages
                : prev.bridalPackages,
          }));
        }
      })
      .catch((err) => console.warn('Public data sync notice:', err));
  }, [updateData]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <CustomerNavbar />
      <main style={{ flex: 1 }}>{children}</main>
      <CustomerFooter />

      {/* Sticky WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${whatsapp}?text=Hi%20Shree%20Beauty%20Studio!%20I%27d%20like%20to%20inquire%20about%20booking.`}
        target="_blank"
        rel="noopener noreferrer"
        className="cust-whatsapp-float"
        aria-label="Chat with Shree Beauty Studio on WhatsApp"
      >
        <MessageCircle size={22} />
        <span>Book via WhatsApp</span>
      </a>
    </div>
  );
}
