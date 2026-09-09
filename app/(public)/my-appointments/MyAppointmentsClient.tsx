'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Phone, Search, Calendar, Clock, User, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { getAppointmentGoogleCalendarUrl } from '@/lib/calendar';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function MyAppointmentsView() {
  const searchParams = useSearchParams();
  const { data } = useSalonStore();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');

  const lookupAppointments = useCallback(async (num: string) => {
    setLoading(true);
    setError('');
    setSearched(false);

    try {
      const clean = num.replace(/\D/g, '').slice(-10);

      // 1. Search in local store
      const storeAppts = (data?.appointments || []).filter((a) => {
        const aMobile = (a.mobile || '').replace(/\D/g, '').slice(-10);
        return aMobile === clean;
      });

      const storeBridalAppts = (data?.bridal || [])
        .filter((b) => (b.mobile || '').replace(/\D/g, '').slice(-10) === clean)
        .map((b) => ({
          id: b.id,
          date: b.weddingDate || b.date,
          time: '08:00 AM',
          customer: b.name,
          mobile: b.mobile,
          service: `👑 Bridal: ${b.packageName}`,
          staff: 'Master Bridal Artist',
          advance: b.advance || 0,
          status: b.status || 'Confirmed',
          workStatus: b.status || 'Booked',
          notes: `Event: ${b.event} | Venue: ${b.venue}`,
        }));

      // 2. Fetch live from server API
      let cloudAppts: any[] = [];
      let cloudCustomerName = '';
      try {
        const res = await fetch(`/api/my-appointments?mobile=${clean}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            cloudAppts = [
              ...(json.appointments || []),
              ...(json.bridal || []).map((b: any) => ({
                id: b.id,
                date: b.weddingDate || b.date,
                time: '08:00 AM',
                customer: b.name,
                mobile: b.mobile,
                service: `👑 Bridal: ${b.packageName}`,
                staff: 'Master Bridal Artist',
                advance: b.advance || 0,
                status: b.status || 'Confirmed',
                workStatus: b.status || 'Booked',
                notes: `Event: ${b.event} | Venue: ${b.venue}`,
              })),
            ];
            if (json.customer?.name) {
              cloudCustomerName = json.customer.name;
            }
          }
        }
      } catch {
        // Fallback to store
      }

      // Merge and deduplicate by id
      const map = new Map<string, any>();
      [...storeAppts, ...storeBridalAppts, ...cloudAppts].forEach((item) => {
        if (item.id) map.set(item.id, item);
      });
      const allMatches = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      setMatches(allMatches);

      // Look up customer name
      if (cloudCustomerName) {
        setCustomerName(cloudCustomerName);
      } else if (allMatches.length > 0) {
        setCustomerName(allMatches[0].customer || '');
      } else {
        const cust = (data?.customers || []).find((c) => (c.mobile || '').replace(/\D/g, '').slice(-10) === clean);
        setCustomerName(cust?.name || '');
      }

      setSearched(true);
    } catch {
      setError('An error occurred while looking up appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [data?.appointments, data?.bridal, data?.customers]);

  useEffect(() => {
    const paramMobile = searchParams.get('mobile');
    if (paramMobile) {
      const clean = paramMobile.replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        setMobile(clean);
        lookupAppointments(clean);
      }
    }
  }, [searchParams, lookupAppointments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobile.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    lookupAppointments(clean);
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '40px 20px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <span className="cust-section-badge">
          <Calendar size={13} /> Appointment Tracker
        </span>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, color: '#0f172a', margin: '8px 0 10px' }}>
          Find Your Appointments
        </h1>
        <p style={{ fontSize: 14.5, color: '#64748b', margin: 0 }}>
          Enter your registered 10-digit mobile number to view upcoming and past salon bookings.
        </p>
      </div>

      {/* Search Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          marginBottom: 32,
        }}
      >
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Phone size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              maxLength={15}
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                borderRadius: 12,
                border: '1.5px solid #cbd5e1',
                fontSize: 15,
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || mobile.replace(/\D/g, '').length < 10}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(5,66,74,0.2)',
            }}
          >
            <Search size={16} />
            <span>{loading ? 'Searching...' : 'Check Bookings'}</span>
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 14, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searched && (
        <div>
          {customerName && (
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#05424A', fontWeight: 700 }}>
              <User size={18} />
              <span>Bookings for: {customerName}</span>
            </div>
          )}

          {matches.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: 20,
                padding: '44px 20px',
                textAlign: 'center',
                border: '1px dashed #cbd5e1',
              }}
            >
              <Calendar size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#334155' }}>
                No bookings found for {mobile}
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>
                You haven't scheduled any appointments yet or they were booked under a different number.
              </p>
              <Link href="/book" className="cust-btn-primary">
                <span>Book an Appointment Online</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {matches.map((appt) => {
                const isCancelled = (appt.status || '').toLowerCase() === 'cancelled';
                const isCompleted = (appt.status || '').toLowerCase() === 'completed';

                return (
                  <motion.div
                    key={appt.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    style={{
                      background: '#ffffff',
                      borderRadius: 18,
                      border: '1px solid #e2e8f0',
                      padding: 22,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            background: isCancelled ? '#fee2e2' : isCompleted ? '#dcfce7' : '#e0f2fe',
                            color: isCancelled ? '#991b1b' : isCompleted ? '#166534' : '#075985',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 99,
                            textTransform: 'capitalize',
                          }}
                        >
                          {appt.status || 'Confirmed'}
                        </span>
                        <span style={{ fontSize: 12.5, color: '#94a3b8' }}>ID: #{appt.id?.slice(0, 8)}</span>
                      </div>

                      <span style={{ fontSize: 16, fontWeight: 800, color: '#05424A' }}>
                        ₹{Number(appt.price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                        {appt.service}
                      </h3>
                      {appt.notes && (
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                          Note: {appt.notes}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 12,
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: 12,
                        fontSize: 13,
                        color: '#334155',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={15} color="#05424A" />
                        <span><strong>Date:</strong> {appt.date}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={15} color="#05424A" />
                        <span><strong>Time:</strong> {appt.time}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={15} color="#05424A" />
                        <span><strong>Staff:</strong> {appt.staff || 'Studio Specialist'}</span>
                      </div>
                      {Number(appt.advance || 0) > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircle2 size={15} color="#16a34a" />
                          <span><strong>Advance Paid:</strong> ₹{Number(appt.advance).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>

                    {!isCancelled && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 2 }}>
                        <a
                          href={getAppointmentGoogleCalendarUrl(
                            {
                              customer: appt.customer || customerName || 'Customer',
                              mobile: appt.mobile || mobile,
                              service: appt.service || 'Salon Service',
                              date: appt.date,
                              time: appt.time,
                              staff: appt.staff,
                              advance: appt.advance,
                              notes: appt.notes,
                              price: appt.price,
                            },
                            data?.settings?.salon,
                            data?.settings?.address
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: 10,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Calendar size={13} />
                          <span>📅 Save to Google Calendar (Auto Reminder)</span>
                        </a>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyAppointmentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Appointment Tracker...</div>}>
      <MyAppointmentsView />
    </Suspense>
  );
}
