'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  Copy,
  ArrowLeft,
  Scissors,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, fmtDate, money } from '@/lib/utils';
import { Appointment } from '@/types/salon';
import { sendDirectWhatsAppMessage, appointmentCustomerMessage } from '@/lib/whatsapp';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';

const TIME_SLOTS = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
];

export default function PublicBookingPage() {
  const { data, updateData } = useSalonStore();

  const salon = data?.settings?.salon || 'Shree Beauty Studio';
  const phone = data?.settings?.phone || '9898012345';
  const address = data?.settings?.address || 'Ring Road, Surat, Gujarat';
  const services = data?.services || [];
  const staffList = data?.staff || [];

  // Form State
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState(todayISO());
  const [selectedTime, setSelectedTime] = useState('11:00 AM');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState<Appointment | null>(null);
  const [searchService, setSearchService] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Filtered services
  const filteredServices = useMemo(() => {
    if (!searchService) return services;
    const q = searchService.toLowerCase();
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  }, [services, searchService]);

  // Total amount & duration
  const totalAmount = useMemo(() => {
    return selectedServices.reduce((sum, name) => {
      const s = services.find((x) => x.name === name);
      return sum + Number(s?.price || 0);
    }, 0);
  }, [selectedServices, services]);

  const toggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      alert('Please select at least 1 service to book.');
      return;
    }
    if (!customerName.trim()) {
      alert('Please enter your full name.');
      return;
    }
    if (!customerMobile.trim() || customerMobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);

    const newAppt: Appointment = {
      id: uid(),
      date: bookingDate,
      time: selectedTime,
      customer: customerName.trim(),
      mobile: customerMobile.replace(/\D/g, '').slice(-10),
      service: selectedServices.join(', '),
      staff: selectedStaff || 'Senior Beautician',
      advance: 0,
      status: 'Confirmed',
      workStatus: 'Booked',
      notes: notes.trim() || 'Online Self-Booking',
    };

    try {
      // 1. Save to Local Store & Cloud Supabase
      updateData((prev) => ({
        ...prev,
        appointments: [newAppt, ...(prev.appointments || [])],
        // Auto add or update customer in system
        customers: prev.customers.some((c) => c.mobile === newAppt.mobile)
          ? prev.customers
          : [
              {
                id: uid(),
                name: newAppt.customer,
                mobile: newAppt.mobile,
                visits: 1,
                totalSpend: 0,
                lastVisit: newAppt.date,
              },
              ...prev.customers,
            ],
      }));

      scheduleSave();

      // 2. Dispatch Confirmation via WhatsApp Meta API
      const msg = appointmentCustomerMessage(newAppt, salon, address);
      sendDirectWhatsAppMessage(newAppt.mobile, msg).catch((err) =>
        console.error('WhatsApp Confirmation Error:', err)
      );

      setConfirmedAppt(newAppt);
    } catch (err: any) {
      alert(`Booking error: ${err?.message || 'Failed to submit booking.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyBookingLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05424a 0%, #0d626e 50%, #053320 100%)',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px 16px 60px',
      }}
    >
      {/* Header Container */}
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Salon Branding Card */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 20,
            padding: '20px 24px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={SHREE_ONLY_LOGO_BASE64}
              alt={salon}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                border: '2px solid #eaba38',
                objectFit: 'cover',
                boxShadow: '0 4px 14px rgba(234,186,56,0.3)',
              }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                {salon}
              </h1>
              <div style={{ fontSize: 12, color: '#e2e8f0', opacity: 0.9, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} color="#eaba38" /> {address}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyBookingLink}
            style={{
              background: copiedLink ? '#22c55e' : 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 10,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            {copiedLink ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copiedLink ? 'Link Copied!' : 'Share Link'}
          </button>
        </motion.div>

        {/* Confirmation Screen */}
        <AnimatePresence mode="wait">
          {confirmedAppt ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: 24,
                padding: '32px 24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: '#0f172a' }}>
                Appointment Confirmed! 💖
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>
                We have received your booking request and sent a WhatsApp confirmation to <b>+91 {confirmedAppt.mobile}</b>.
              </p>

              {/* Booking Summary Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '18px 20px',
                  textAlign: 'left',
                  marginBottom: 24,
                  fontSize: 13,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: 8 }}>
                  <span style={{ color: '#64748b' }}>Customer Name:</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{confirmedAppt.customer}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: 8 }}>
                  <span style={{ color: '#64748b' }}>Selected Service:</span>
                  <span style={{ fontWeight: 800, color: '#05424a', textAlign: 'right', maxWidth: '60%' }}>
                    {confirmedAppt.service}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: 8 }}>
                  <span style={{ color: '#64748b' }}>Date &amp; Time Slot:</span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>
                    {fmtDate(confirmedAppt.date)} at {confirmedAppt.time}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Assigned Beautician:</span>
                  <span style={{ fontWeight: 700, color: '#475569' }}>{confirmedAppt.staff}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setConfirmedAppt(null)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: '#05424a',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13.5,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Book Another Appointment
                </button>
              </div>
            </motion.div>
          ) : (
            /* Booking Form Container */
            <motion.form
              key="form"
              onSubmit={handleBookingSubmit}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: 24,
                padding: '24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              }}
            >
              {/* Step 1: Select Services */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#05424a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Scissors size={18} color="#05424a" /> 1. Select Service(s) *
                  </h3>
                  {selectedServices.length > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: 99 }}>
                      {selectedServices.length} Selected ({money(totalAmount)})
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <input
                    type="search"
                    placeholder="Search haircut, facial, bridal, waxing…"
                    value={searchService}
                    onChange={(e) => setSearchService(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div
                  style={{
                    maxHeight: 280,
                    overflowY: 'auto',
                    display: 'grid',
                    gap: 8,
                    paddingRight: 4,
                  }}
                >
                  {filteredServices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 13 }}>
                      No matching services found.
                    </div>
                  ) : (
                    filteredServices.map((s) => {
                      const isSelected = selectedServices.includes(s.name);
                      return (
                        <div
                          key={s.id || s.name}
                          onClick={() => toggleService(s.name)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: `1.5px solid ${isSelected ? '#05424a' : '#e2e8f0'}`,
                            background: isSelected ? '#f0fdf4' : '#fafafa',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13.5, color: isSelected ? '#05424a' : '#1e293b' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                              ⏱ {s.durationMin || 30} mins • {s.category || 'General'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#16a34a' }}>
                              {money(s.price)}
                            </div>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                color: isSelected ? '#fff' : '#05424a',
                                background: isSelected ? '#05424a' : '#e2e8f0',
                                padding: '2px 8px',
                                borderRadius: 6,
                                marginTop: 4,
                                display: 'inline-block',
                              }}
                            >
                              {isSelected ? '✓ Added' : '+ Select'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 2: Date & Time Selection */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 900, color: '#05424a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} color="#05424a" /> 2. Select Date &amp; Time Slot *
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Booking Date:
                    </label>
                    <input
                      type="date"
                      min={todayISO()}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 13,
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Select Beautician (Optional):
                    </label>
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 13,
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    >
                      <option value="">Any Senior Beautician</option>
                      {staffList.map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name} ({st.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                    Select Convenient Time Slot:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 6 }}>
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = selectedTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          style={{
                            padding: '8px 6px',
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                            border: `1.5px solid ${isSelected ? '#05424a' : '#e2e8f0'}`,
                            background: isSelected ? '#05424a' : '#f8fafc',
                            color: isSelected ? '#ffffff' : '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 3: Customer Details */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 900, color: '#05424a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} color="#05424a" /> 3. Your Contact Details *
                </h3>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pooja Patel"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      WhatsApp Mobile Number (10 digits) *
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ padding: '10px 12px', background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRadius: 10, fontSize: 13, fontWeight: 800, color: '#475569' }}>
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="e.g. 9898012345"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Special Request / Notes (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sensitive skin, skin allergy note, or preferred color"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 12.5,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting || selectedServices.length === 0}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #05424a 0%, #0d626e 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: 15,
                  border: 'none',
                  cursor: selectedServices.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedServices.length === 0 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 8px 24px rgba(5,66,74,0.3)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles size={18} />
                {isSubmitting ? 'Booking Your Appointment…' : `Confirm Booking (${money(totalAmount)})`}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
