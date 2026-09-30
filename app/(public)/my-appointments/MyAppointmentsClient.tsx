'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Search,
  ArrowRight,
  RotateCcw,
  Loader2,
  CalendarCheck,
  MapPin,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { getAppointmentGoogleCalendarUrl } from '@/lib/calendar';
import { useCustomerAuth } from '@/lib/customer-context';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function MyAppointmentsView() {
  const searchParams = useSearchParams();
  const { data } = useSalonStore();
  const { customer, authenticated } = useCustomerAuth();

  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');

  // Fetch appointments for a mobile number (direct lookup, no OTP)
  const fetchAppointments = useCallback(async (targetMobile: string) => {
    const clean = targetMobile.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/my-appointments?mobile=${clean}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load appointments. Please try again.');
        return;
      }

      const appts = json.appointments || [];
      const bridal = (json.bridal || []).map((b: any) => ({
        id: b.id,
        date: b.weddingDate || b.date,
        time: '08:00 AM',
        customer: b.name,
        mobile: b.mobile,
        service: `👑 Bridal: ${b.packageName || 'Bridal Package'}`,
        advance: b.advance || 0,
        price: b.totalAmount || b.package || b.price || 0,
        status: b.status || 'Confirmed',
        notes: `Event: ${b.event || 'Wedding'} | Venue: ${b.venue || 'Surat'}`,
      }));

      const all = [...appts, ...bridal].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setMatches(all);
      setSearched(true);

      if (json.customer?.name) {
        setCustomerName(json.customer.name);
      } else if (all.length > 0 && all[0].customer) {
        setCustomerName(all[0].customer);
      } else {
        setCustomerName('');
      }

      sessionStorage.setItem('shree_appt_mobile', clean);
    } catch {
      setError('Network error while fetching appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Pre-fill and auto-search if logged in or URL param or sessionStorage
  useEffect(() => {
    const paramMobile = searchParams.get('mobile');
    const savedMobile = typeof window !== 'undefined' ? sessionStorage.getItem('shree_appt_mobile') : null;
    const authMobile = customer?.phone;

    const initialMobile = paramMobile || authMobile || savedMobile || '';
    const clean = initialMobile.replace(/\D/g, '').slice(-10);

    if (clean.length === 10) {
      setMobile(clean);
      fetchAppointments(clean);
    }
  }, [searchParams, customer, fetchAppointments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppointments(mobile);
  };

  const handleResetSearch = () => {
    setSearched(false);
    setMatches([]);
    setError('');
    sessionStorage.removeItem('shree_appt_mobile');
  };

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: 'clamp(24px, 4vw, 48px) 16px 80px',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      }}
    >
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(234, 186, 56, 0.12)',
            color: '#05424A',
            border: '1px solid rgba(234, 186, 56, 0.3)',
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <CalendarCheck size={14} color="#05424A" /> Direct Client Appointment Tracker
        </span>
        <h1
          style={{
            fontSize: 'clamp(24px, 4.5vw, 36px)',
            fontWeight: 800,
            color: '#0f172a',
            margin: '12px 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          My Salon Appointments &amp; Bridal Bookings
        </h1>
        <p style={{ fontSize: 14.5, color: '#64748b', margin: 0, maxWidth: 580, marginInline: 'auto' }}>
          Enter your 10-digit mobile number to instantly view your upcoming salon appointments, bridal bookings &amp; service passes.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Search Form (When not searched or user wants to search another) ─── */}
        {!searched ? (
          <motion.div
            key="search-box"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{
              background: '#ffffff',
              borderRadius: 22,
              border: '1px solid #e2e8f0',
              padding: '32px 28px',
              boxShadow: '0 8px 30px rgba(5,66,74,0.06)',
              maxWidth: 540,
              margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(5,66,74,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#05424A',
                }}
              >
                <Phone size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                  Look Up Your Bookings
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  No OTP required — instant appointment lookup
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                  Mobile Number (મોબાઈલ નંબર)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#475569',
                      borderRight: '1px solid #cbd5e1',
                      paddingRight: 10,
                    }}
                  >
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    maxLength={10}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 88px',
                      borderRadius: 14,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#05424A')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                  />
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#b91c1c',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mobile.replace(/\D/g, '').length < 10}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: loading || mobile.replace(/\D/g, '').length < 10 ? 'not-allowed' : 'pointer',
                  opacity: loading || mobile.replace(/\D/g, '').length < 10 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(5,66,74,0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Searching appointments…</span>
                  </>
                ) : (
                  <>
                    <Search size={16} color="#EABA38" />
                    <span>View My Appointments</span>
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                fontSize: 12,
                color: '#64748b',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} color="#16a34a" /> Instant 1-Click Search
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} color="#16a34a" /> Google Calendar Sync
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} color="#16a34a" /> Free Appointment Passes
              </span>
            </div>
          </motion.div>
        ) : (
          /* ─── Appointments Results Dashboard ─── */
          <motion.div
            key="results-dashboard"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Top User Info Bar */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 18,
                border: '1px solid #e2e8f0',
                padding: '16px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 24,
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                    color: '#EABA38',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 17,
                  }}
                >
                  {customerName ? customerName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    {customerName ? customerName : 'Shree Beauty Client'} ✨
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <Phone size={13} color="#05424A" />
                    <span>Mobile: +91 {mobile}</span>
                    <span style={{ color: '#cbd5e1', margin: '0 4px' }}>·</span>
                    <span style={{ color: '#05424A', fontWeight: 700 }}>
                      {matches.length} {matches.length === 1 ? 'Booking' : 'Bookings'} Found
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleResetSearch}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '8px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Check Another Number</span>
                </button>

                <Link
                  href="/book"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#05424A',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(5,66,74,0.2)',
                  }}
                >
                  <Sparkles size={13} color="#EABA38" />
                  <span>Book New Service</span>
                </Link>
              </div>
            </div>

            {/* Results Grid */}
            {matches.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  padding: '48px 24px',
                  textAlign: 'center',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <Calendar size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#334155' }}>
                  No Bookings Found (કોઈ બુકિંગ મળ્યું નથી)
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
                  No appointments were found for mobile +91 {mobile}. Would you like to schedule one now?
                </p>
                <Link
                  href="/book"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#05424A',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  <span>Book Salon Service Online</span>
                  <ArrowRight size={15} />
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
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>ID: #{appt.id?.slice(0, 8)}</span>
                        </div>

                        {Number(appt.price || 0) > 0 && (
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#05424A' }}>
                            ₹{Number(appt.price).toLocaleString('en-IN')}
                          </span>
                        )}
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
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
