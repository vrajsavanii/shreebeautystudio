'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerAuth } from '@/lib/customer-context';
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
  Crown,
  Check,
  X,
  Plus,
  Edit3,
  Lock,
  LogIn,
  UserPlus,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, fmtDate, money, isPastTimeForDate, getFirstFutureSlot, getServicePricingBasis } from '@/lib/utils';
import { Appointment, BridalBooking, BridalPackage } from '@/types/salon';
import { sendDirectWhatsAppMessage, appointmentCustomerMessage, appointmentRequestPendingMessage, bridalRequestPendingMessage } from '@/lib/whatsapp';
import { sendBridalRateCardPDFViaWhatsApp } from '@/lib/bridal-pdf';
import { getServiceImage } from '@/lib/customer-images';

import { getAppointmentGoogleCalendarUrl, getBridalGoogleCalendarUrl } from '@/lib/calendar';
import { checkDateHolidayOrBlocked } from '@/lib/holidays';

const TIME_SLOTS = [
  '09:00 AM',
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

function PublicBookingPageContent() {
  const searchParams = useSearchParams();
  const dateTimeSectionRef = useRef<HTMLDivElement>(null);
  const [isServicePickerExpanded, setIsServicePickerExpanded] = useState(false);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  const { data, updateData } = useSalonStore();

  const salon = data?.settings?.salon || 'Shree Beauty Studio';
  const phone = data?.settings?.whatsapp || '98241 83769';
  const address = data?.settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const mapsUrl = data?.settings?.googleMapsUrl || 'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8';
  const instaHandle = data?.settings?.instagramHandle || '@shreebeauty.studio';
  const services = data?.services || [];
  const bridalPackages = data?.bridalPackages || [];

  useEffect(() => {
    fetch('/api/public-data')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.services?.length) {
          updateData((prev) => ({
            ...prev,
            services: json.services,
            bridalPackages: json.bridalPackages?.length ? json.bridalPackages : prev.bridalPackages,
            settings: {
              ...prev.settings,
              ...(json.settings || {}),
            },
          }));
        }
      })
      .catch(() => {});
  }, [updateData]);

  // Booking Type: 'regular' | 'bridal'
  const [bookingMode, setBookingMode] = useState<'regular' | 'bridal'>('regular');

  // Form State - Regular Services
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState(todayISO());
  const [selectedTime, setSelectedTime] = useState(() => getFirstFutureSlot(todayISO(), TIME_SLOTS) || TIME_SLOTS[0]);

  // Form State - Bridal Bookings
  const [selectedBridalPkgIds, setSelectedBridalPkgIds] = useState<string[]>([]);
  const [weddingDate, setWeddingDate] = useState(todayISO());
  const [sagaiDate, setSagaiDate] = useState('');
  const [venue, setVenue] = useState('');
  const [eventTitle, setEventTitle] = useState('Bridal & Siders Makeup');

  // Pre-select service, bridal package or mode from URL searchParams
  useEffect(() => {
    if (!searchParams) return;
    const paramService = searchParams.get('service');
    const paramMode = searchParams.get('mode');
    const paramPackage = searchParams.get('package') || searchParams.get('bridalPackage') || searchParams.get('pkg');
    const paramCategory = searchParams.get('category');

    if (paramMode === 'bridal' || paramPackage) {
      setBookingMode('bridal');
      if (paramPackage && bridalPackages.length > 0) {
        const match = bridalPackages.find(
          (p) =>
            p.id.toLowerCase() === paramPackage.toLowerCase() ||
            p.name.toLowerCase() === paramPackage.toLowerCase()
        );
        if (match) setSelectedBridalPkgIds([match.id]);
      }
    } else if (paramService) {
      const decoded = decodeURIComponent(paramService).trim();
      if (decoded) {
        setSelectedServices([decoded]);
        setIsServicePickerExpanded(false);
        if (!hasAutoScrolled) {
          setTimeout(() => {
            if (dateTimeSectionRef.current) {
              dateTimeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setHasAutoScrolled(true);
            }
          }, 250);
        }
      }
    } else {
      // No service pre-selected, expand service picker by default
      setIsServicePickerExpanded(true);
    }

    if (paramCategory) {
      setSelectedCategory(decodeURIComponent(paramCategory));
    }
  }, [searchParams, bridalPackages, hasAutoScrolled]);

  const loginCardRef = useRef<HTMLDivElement>(null);
  const { customer, login: customerLogin, signup: customerSignup, logout: customerLogout } = useCustomerAuth();

  // In-Page Customer Login / Signup State
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [authMobile, setAuthMobile] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [showAuthPass, setShowAuthPass] = useState(false);

  // Customer Contact Info
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Automatically sync logged-in customer's details
  useEffect(() => {
    if (customer) {
      if (customer.name) {
        setCustomerName(customer.name);
      }
      const rawPhone = customer.phone || customer.mobile || '';
      const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        setCustomerMobile(cleanPhone);
      }
      if (customer.email) {
        setCustomerEmail(customer.email);
      }
      setAuthError('');
    }
  }, [customer]);

  // Fast In-Page Customer Login
  const handleInPageLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    const clean = authMobile.replace(/\D/g, '').slice(-10);
    if (!clean || clean.length !== 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!authPassword) {
      setAuthError('Please enter your account password.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await customerLogin({
        method: 'mobile',
        phone: clean,
        password: authPassword,
      });

      if (res.success) {
        setAuthSuccessMsg('✓ Logged in successfully! Identity verified.');
        setAuthPassword('');
      } else if (res.notFound) {
        setAuthError('No account found with this mobile number. Please switch to "Register" tab to create your account.');
      } else if (res.needsPasswordSetup) {
        setAuthError('Your account needs password setup. Please use "Forgot Password" or full login.');
      } else {
        setAuthError(res.error || 'Invalid credentials. Please verify your mobile and password.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Login failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Fast In-Page Customer Signup
  const handleInPageSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    if (!authName.trim() || authName.trim().length < 2) {
      setAuthError('Please enter your full name (minimum 2 characters).');
      return;
    }
    const cleanPhone = authMobile.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setAuthError('Please enter a valid 10-digit WhatsApp mobile number.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await customerSignup({
        name: authName.trim(),
        mobile: cleanPhone,
        phone: cleanPhone,
        email: authEmail.trim() || undefined,
        password: authPassword,
        method: 'mobile',
      });

      if (res.success) {
        setAuthSuccessMsg('✓ Account registered & logged in! Identity verified.');
        setAuthPassword('');
      } else {
        setAuthError(res.error || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState<Appointment | null>(null);
  const [confirmedBridal, setConfirmedBridal] = useState<BridalBooking | null>(null);
  const [searchService, setSearchService] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Available unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach((s) => {
      if (s.category && s.category.trim()) cats.add(s.category.trim());
    });
    return ['All', ...Array.from(cats)];
  }, [services]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (selectedCategory !== 'All' && (s.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (!searchService) return true;
      const q = searchService.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q);
    });
  }, [services, searchService, selectedCategory]);

  // Regular Services Total
  const regularTotal = useMemo(() => {
    return selectedServices.reduce((sum, name) => {
      const s = services.find((x) => x.name === name);
      return sum + Number(s?.price || 0);
    }, 0);
  }, [selectedServices, services]);

  // Bridal Packages Total
  const bridalTotal = useMemo(() => {
    return selectedBridalPkgIds.reduce((sum, id) => {
      const pkg = bridalPackages.find((x) => x.id === id);
      return sum + Number(pkg?.price || 0);
    }, 0);
  }, [selectedBridalPkgIds, bridalPackages]);

  // Holiday & Fully Booked Checks
  const regularHolidayCheck = useMemo(
    () => checkDateHolidayOrBlocked(bookingDate, data?.holidays || []),
    [bookingDate, data?.holidays]
  );
  const bridalHolidayCheck = useMemo(
    () => checkDateHolidayOrBlocked(weddingDate, data?.holidays || []),
    [weddingDate, data?.holidays]
  );

  // Past Time Slots Check
  const areAllSlotsPast = useMemo(() => {
    return TIME_SLOTS.every((slot) => isPastTimeForDate(bookingDate, slot));
  }, [bookingDate]);

  const toggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const toggleBridalPkg = (id: string) => {
    setSelectedBridalPkgIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeCheck = bookingMode === 'bridal' ? bridalHolidayCheck : regularHolidayCheck;
    if (activeCheck.isBlocked) {
      alert(activeCheck.userMessage);
      return;
    }

    if (bookingMode === 'regular') {
      if (bookingDate < todayISO()) {
        alert('Cannot book appointments for past dates.');
        return;
      }
      if (isPastTimeForDate(bookingDate, selectedTime)) {
        alert('Selected time slot has already passed for today. Please select a live upcoming future time slot.');
        return;
      }
    } else {
      if (weddingDate < todayISO()) {
        alert('Cannot book bridal appointments for past dates.');
        return;
      }
    }

    if (!customer) {
      if (loginCardRef.current) {
        loginCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setAuthError('🔒 Customer Login is mandatory before scheduling your appointment. Please sign in or create an account below.');
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

    const cleanMobile = customerMobile.replace(/\D/g, '').slice(-10);
    setIsSubmitting(true);

    try {
      if (bookingMode === 'regular') {
        if (selectedServices.length === 0) {
          alert('Please select at least 1 service to book.');
          setIsSubmitting(false);
          return;
        }

        const newAppt: Appointment = {
          id: uid(),
          date: bookingDate,
          time: selectedTime,
          customer: customerName.trim(),
          mobile: cleanMobile,
          email: customerEmail.trim() || undefined,
          service: selectedServices.join(', '),
          staff: 'Studio Specialist',
          advance: 0,
          status: 'Pending',
          workStatus: 'Booked',
          notes: notes.trim() || 'Online Booking Request (Pending Approval)',
        };

        // Update Local Store for instant client UX
        updateData((prev) => ({
          ...prev,
          appointments: [newAppt, ...(prev.appointments || [])],
          customers: prev.customers.some((c) => c.mobile === newAppt.mobile)
            ? prev.customers.map((c) =>
                c.mobile === newAppt.mobile
                  ? { ...c, email: customerEmail.trim() || c.email }
                  : c
              )
            : [
                {
                  id: uid(),
                  name: newAppt.customer,
                  mobile: newAppt.mobile,
                  email: customerEmail.trim() || undefined,
                  visits: 1,
                  totalSpend: 0,
                  lastVisit: newAppt.date,
                },
                ...prev.customers,
              ],
        }));

        scheduleSave();

        // Sync directly to Supabase cloud via server API and dispatch WhatsApp & Email request notification
        const apiRes = await fetch('/api/public-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'regular',
            appointment: newAppt,
            customer: { name: newAppt.customer, mobile: newAppt.mobile, email: customerEmail.trim() || undefined },
          }),
        }).catch((err) => {
          console.warn('Cloud booking API warning:', err);
          return null;
        });

        // Update state and display success confirmation on screen (NO auto-redirect)
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setConfirmedAppt(newAppt);
      } else {
        // Bridal Booking Mode
        if (selectedBridalPkgIds.length === 0) {
          alert('Please select at least 1 Bridal or Siders Package.');
          setIsSubmitting(false);
          return;
        }

        const selectedPkgsList = selectedBridalPkgIds.map((id) => {
          const p = bridalPackages.find((x) => x.id === id);
          return {
            packageId: id,
            count: 1,
            customPrice: p?.price || 0,
            name: p?.name || 'Bridal Package',
          };
        });

        const newBridalBooking: BridalBooking = {
          id: uid(),
          name: customerName.trim(),
          mobile: cleanMobile,
          email: customerEmail.trim() || undefined,
          venue: venue.trim() || 'Surat Venue',
          event: eventTitle.trim() || 'Bridal Glam',
          date: weddingDate,
          weddingDate: weddingDate,
          sagaiDate: sagaiDate || undefined,
          includeWedding: true,
          includeSagai: !!sagaiDate,
          packageName: selectedPkgsList.map((p) => p.name).join(', '),
          package: bridalTotal,
          advance: 0,
          balance: bridalTotal,
          status: 'Booked',
          notes: notes.trim() || 'Online Bridal Booking Request',
        };

        // Also add an appointment record for calendar visibility
        const bridalAppt: Appointment = {
          id: uid(),
          date: weddingDate,
          time: '08:00 AM',
          customer: `👑 ${customerName.trim()} (BRIDAL)`,
          mobile: cleanMobile,
          email: customerEmail.trim() || undefined,
          service: `👑 Bridal: ${selectedPkgsList.map((p) => p.name).join(', ')}`,
          staff: 'Master Bridal Artist',
          advance: 0,
          status: 'Pending',
          workStatus: 'Booked',
          notes: `Venue: ${venue || 'Surat'} | Event: ${eventTitle}`,
        };

        // Update Local Store for instant client UX
        updateData((prev) => ({
          ...prev,
          bridal: [newBridalBooking, ...(prev.bridal || [])],
          appointments: [bridalAppt, ...(prev.appointments || [])],
          customers: prev.customers.some((c) => c.mobile === cleanMobile)
            ? prev.customers.map((c) =>
                c.mobile === cleanMobile
                  ? { ...c, email: customerEmail.trim() || c.email }
                  : c
              )
            : [
                {
                  id: uid(),
                  name: customerName.trim(),
                  mobile: cleanMobile,
                  email: customerEmail.trim() || undefined,
                  anniversary: weddingDate,
                  sagaiDate: sagaiDate || undefined,
                  visits: 1,
                  totalSpend: 0,
                  lastVisit: weddingDate,
                },
                ...prev.customers,
              ],
        }));

        scheduleSave();

        // Sync directly to Supabase cloud via server API
        fetch('/api/public-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'bridal',
            bridal: newBridalBooking,
            appointment: bridalAppt,
            customer: { name: newBridalBooking.name, mobile: newBridalBooking.mobile, email: customerEmail.trim() || undefined },
          }),
        }).catch((err) => console.warn('Cloud bridal booking API warning:', err));

        // Update state and display success confirmation on screen (NO auto-redirect)
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setConfirmedBridal(newBridalBooking);
      }
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
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
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
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: '#ffffff',
                border: '2px solid #eaba38',
                boxShadow: '0 4px 14px rgba(234,186,56,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                padding: 2,
              }}
            >
              <img
                src="/only-logo.jpg"
                alt={salon}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 10,
                  display: 'block',
                }}
              />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                {salon}
              </h1>
              <div style={{ fontSize: 12, color: '#e2e8f0', opacity: 0.9, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} color="#eaba38" /> {address}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              href="/"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 11.5,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ArrowLeft size={13} />
              Home
            </Link>
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
          </div>
        </motion.div>

        {/* Confirmation Screen */}
        <AnimatePresence mode="wait">
          {confirmedAppt || confirmedBridal ? (
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
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 24px rgba(22,163,74,0.25)',
                }}
              >
                <CheckCircle2 size={44} />
              </div>

              <span
                style={{
                  display: 'inline-block',
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  borderRadius: 99,
                  padding: '4px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                ✨ BOOKING REQUEST RECEIVED ✨
              </span>

              <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: '#05424a' }}>
                {confirmedBridal ? '👑 Bridal Booking Submitted!' : '🎉 Appointment Request Submitted!'}
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                Thank you, <b>{confirmedAppt?.customer || confirmedBridal?.name}</b>! Your appointment request has been submitted to <b>{salon}</b>.
              </p>

              {/* Automatic Background Dispatch Confirmation Badges */}
              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  marginBottom: 20,
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 12.5,
                    color: '#166534',
                    fontWeight: 700,
                  }}
                >
                  <MessageCircle size={18} className="shrink-0 text-emerald-600" />
                  <span>
                    Auto WhatsApp message dispatched in background to <b>+91 {confirmedAppt?.mobile || confirmedBridal?.mobile}</b>
                  </span>
                </div>

                {customerEmail && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 12,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 12.5,
                      color: '#1e40af',
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={18} className="shrink-0 text-blue-600" />
                    <span>
                      Confirmation receipt &amp; details dispatched to <b>{customerEmail}</b>
                    </span>
                  </div>
                )}
              </div>

              {/* Gujarati Notice Banner: Confirmed Thaya Pasi J Book Thase */}
              <div
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 20,
                  textAlign: 'left',
                  fontSize: 13,
                  color: '#92400e',
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📢 Important Booking Notice:
                </div>
                Your appointment will be finalized once our studio team approves and confirms the schedule. You will receive a <b>WhatsApp confirmation message with your exact appointment time</b>.
              </div>

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
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Booking Status:</span>
                  <span style={{ fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '2px 10px', borderRadius: 99, fontSize: 12 }}>
                    ⏳ Pending Salon Confirmation
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Customer Name:</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>
                    {confirmedAppt?.customer || confirmedBridal?.name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Booking Type:</span>
                  <span style={{ fontWeight: 800, color: confirmedBridal ? '#db2777' : '#05424a' }}>
                    {confirmedBridal ? '👑 Bridal & Siders Package' : '💄 Regular Salon Service'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Selected Package / Service:</span>
                  <span style={{ fontWeight: 800, color: '#05424a', textAlign: 'right', maxWidth: '60%' }}>
                    {confirmedAppt?.service || confirmedBridal?.packageName || 'Bridal Glam'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Requested Date &amp; Time:</span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>
                    {fmtDate(confirmedAppt?.date || confirmedBridal?.date || todayISO())}
                    {confirmedAppt?.time ? ` at ${confirmedAppt.time}` : ''}
                  </span>
                </div>
                {confirmedBridal?.venue && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Venue / Location:</span>
                    <span style={{ fontWeight: 700, color: '#475569' }}>{confirmedBridal.venue}</span>
                  </div>
                )}
              </div>

              {/* Instant WhatsApp Booking Pass Card */}
              {(() => {
                const customerNum = (confirmedAppt?.mobile || confirmedBridal?.mobile || '').replace(/\D/g, '').slice(-10);
                const gcalUrl = confirmedBridal
                  ? getBridalGoogleCalendarUrl(confirmedBridal, salon, address)
                  : confirmedAppt
                  ? getAppointmentGoogleCalendarUrl(confirmedAppt, salon, address)
                  : '';

                const mapsUrl = data?.settings?.googleMapsUrl || 'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8';
                const instaHandle = data?.settings?.instagramHandle || '@shreebeauty.studio';
                const phoneDisplay = '+91 98241 83769';

                const fullPassText = confirmedBridal
                  ? `👑 *BRIDAL BOOKING PASS — ${salon.toUpperCase()}* 👑\n────────────────────────────\nDear ${confirmedBridal.name},\nYour bridal booking request has been received! ✨\n\n💄 *Package:* ${confirmedBridal.packageName || 'Bridal Glam'}\n📅 *Wedding Date:* ${fmtDate(confirmedBridal.weddingDate || confirmedBridal.date)}\n📍 *Venue:* ${confirmedBridal.venue || address}\n💵 *Estimated Package:* ₹${confirmedBridal.package || confirmedBridal.totalAmount || 0}\n────────────────────────────\n📍 *Studio Address:*\n${address}\n📍 *Google Map:* ${mapsUrl}\n📸 *Instagram:* ${instaHandle}\n📞 *WhatsApp Support:* ${phoneDisplay}\n\n${gcalUrl ? `📅 *Google Calendar Reminder:*\n${gcalUrl}\n\n` : ''}Thank you for choosing ${salon}! 💖`
                  : `💅 *APPOINTMENT BOOKING PASS — ${salon.toUpperCase()}* 💅\n────────────────────────────\nDear ${confirmedAppt?.customer},\nYour appointment booking request has been received! ✨\n\n💄 *Service:* ${confirmedAppt?.service}\n📅 *Date:* ${fmtDate(confirmedAppt?.date || todayISO())}\n⏰ *Time:* ${confirmedAppt?.time || 'Selected Slot'}\n${confirmedAppt?.price ? `💵 *Estimated Price:* ₹${confirmedAppt.price}\n` : ''}📍 *Studio Address:*\n${address}\n📍 *Google Map:* ${mapsUrl}\n📸 *Instagram:* ${instaHandle}\n📞 *Studio Contact:* ${phoneDisplay}\n────────────────────────────\n${gcalUrl ? `📅 *Google Calendar Reminder:*\n${gcalUrl}\n\n` : ''}Thank you for choosing ${salon}! 🙏✨`;

                const salonGreeting = `Hello ${salon}! I have submitted an online appointment request for ${
                  confirmedAppt?.service || confirmedBridal?.packageName
                } on ${fmtDate(confirmedAppt?.date || confirmedBridal?.date)}. Please confirm my booking! ✨`;

                return (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                      border: '2px solid #86efac',
                      borderRadius: 18,
                      padding: '20px 18px',
                      marginBottom: 20,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: '#16a34a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(22,163,74,0.3)',
                        }}
                      >
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#064e3b' }}>
                          ✅ WhatsApp &amp; Email Confirmation Dispatched
                        </div>
                        <div style={{ fontSize: 12.5, color: '#047857', marginTop: 2 }}>
                          Automated booking pass sent directly to <b>+91 {customerNum}</b> via Studio WhatsApp API
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 10 }}>
                      {/* Copy Booking Details */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(fullPassText);
                          setCopiedPass(true);
                          setTimeout(() => setCopiedPass(false), 3000);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: '#ffffff',
                          color: '#334155',
                          border: '1.5px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: 12.5,
                          padding: '10px 16px',
                          borderRadius: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <Copy size={15} />
                        <span>{copiedPass ? '✅ Booking Pass Copied!' : '📋 Copy Booking Details'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                <a
                  href={
                    confirmedBridal
                      ? getBridalGoogleCalendarUrl(confirmedBridal, salon, address)
                      : confirmedAppt
                      ? getAppointmentGoogleCalendarUrl(confirmedAppt, salon, address)
                      : '#'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 14,
                    padding: '13px 20px',
                    borderRadius: 14,
                    textDecoration: 'none',
                    boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Calendar size={18} />
                  <span>📅 Save to Google Calendar (Auto Reminder)</span>
                </a>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: '#ffffff',
                    color: '#05424a',
                    border: '1.5px solid #05424a',
                    fontWeight: 800,
                    fontSize: 13.5,
                    padding: '12px 20px',
                    borderRadius: 14,
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(5,66,74,0.08)',
                  }}
                >
                  <MapPin size={18} />
                  <span>📍 Get Directions on Google Maps</span>
                </a>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedAppt(null);
                    setConfirmedBridal(null);
                  }}
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
              className="p-4 sm:p-6 md:p-8"
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: 24,
                boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              }}
            >
              {/* REGULAR SALON SERVICES */}
              <div style={{ marginBottom: 24 }}>
                {/* Step 1 Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#05424a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Scissors size={18} color="#05424a" /> 1. Selected Service(s) *
                  </h3>
                  {selectedServices.length > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: 99 }}>
                      {selectedServices.length} Selected ({money(regularTotal)})
                    </span>
                  )}
                </div>

                {/* When services are selected and picker is collapsed: Show clean selected services summary banner */}
                {selectedServices.length > 0 && !isServicePickerExpanded ? (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%)',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: 16,
                      padding: '16px 18px',
                      marginBottom: 16,
                      boxShadow: '0 4px 14px rgba(5,66,74,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: '#05424a', color: '#eaba38', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                          ✓ STEP 1 READY
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#065f46' }}>
                          {selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'} Selected
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsServicePickerExpanded(true)}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #05424a',
                          color: '#05424a',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Change / Add Services</span>
                      </button>
                    </div>

                    {/* Selected Services Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedServices.map((name) => {
                        const sObj = services.find((x) => x.name.toLowerCase() === name.toLowerCase() || x.name === name) || {
                          name,
                          price: 0,
                          duration: 30,
                          category: 'Hair',
                        };
                        const sImg = getServiceImage(sObj.name, sObj.category);
                        const pricingBasis = getServicePricingBasis(sObj.category, sObj.name, (sObj as any).pricingType);
                        return (
                          <div
                            key={name}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #d1fae5',
                              borderRadius: 12,
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                                <img src={sImg} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {name}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  <span>⏱ {sObj.duration || 30} mins</span>
                                  <span>•</span>
                                  <span>{pricingBasis.isFixed ? 'Fixed Rate' : 'Starts from'}</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontWeight: 900, fontSize: 15, color: '#05424a' }}>
                                {sObj.price ? money(sObj.price) : 'Standard Rates'}{pricingBasis.isFixed ? '' : '+'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: 12, fontSize: 12.5, color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>👇</span>
                      <span>Now pick your preferred appointment <b>Date &amp; Time Slot</b> below:</span>
                    </div>
                  </div>
                ) : (
                  /* Expanded Service Picker */
                  <div>
                    {/* Starting Price & Customization Note */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(5,66,74,0.05) 0%, rgba(234,186,56,0.1) 100%)',
                        border: '1px solid rgba(234,186,56,0.3)',
                        borderRadius: 12,
                        padding: '10px 14px',
                        marginBottom: 14,
                        fontSize: 12,
                        color: '#334155',
                        lineHeight: 1.45,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <Sparkles size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong>Starting Rates Notice:</strong> Hair service prices vary according to <b>hair length &amp; density</b> (Short / Medium / Long / Waist), and skin treatments vary according to <b>skin type &amp; condition</b>.
                      </div>
                    </div>

                    {/* Quick Category Filter Pills */}
                    {categories.length > 1 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          overflowX: 'auto',
                          paddingBottom: 8,
                          marginBottom: 10,
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        {categories.map((cat) => {
                          const isCatActive = selectedCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedCategory(cat)}
                              style={{
                                whiteSpace: 'nowrap',
                                padding: '6px 13px',
                                borderRadius: 9999,
                                fontSize: 12,
                                fontWeight: 800,
                                border: `1.5px solid ${isCatActive ? '#05424a' : '#e2e8f0'}`,
                                background: isCatActive ? '#05424a' : '#ffffff',
                                color: isCatActive ? '#ffffff' : '#475569',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                                WebkitTapHighlightColor: 'transparent',
                                userSelect: 'none',
                                minHeight: 34,
                                boxShadow: isCatActive ? '0 2px 8px rgba(5,66,74,0.25)' : 'none',
                                transition: 'all 0.15s ease',
                              }}
                              className="active:scale-95 shrink-0"
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Search Service Input */}
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <input
                        type="search"
                        placeholder="Search haircut, facial, waxing, hair spa…"
                        value={searchService}
                        onChange={(e) => setSearchService(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 36px 11px 14px',
                          borderRadius: 12,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          outline: 'none',
                          minHeight: 44,
                          touchAction: 'manipulation',
                        }}
                        className="text-base sm:text-sm"
                      />
                      {searchService && (
                        <button
                          type="button"
                          onClick={() => setSearchService('')}
                          style={{
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: '#e2e8f0',
                            border: 'none',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#475569',
                            touchAction: 'manipulation',
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Service List Items */}
                    <div
                      style={{
                        maxHeight: 330,
                        overflowY: 'auto',
                        display: 'grid',
                        gap: 8,
                        paddingRight: 4,
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain',
                      }}
                    >
                      {filteredServices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94a3b8', fontSize: 13 }}>
                          No matching services found.
                          {selectedCategory !== 'All' && (
                            <button
                              type="button"
                              onClick={() => { setSelectedCategory('All'); setSearchService(''); }}
                              style={{
                                display: 'block',
                                margin: '8px auto 0',
                                color: '#05424a',
                                fontWeight: 700,
                                fontSize: 12,
                                background: 'none',
                                border: 'none',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                              }}
                            >
                              View all services
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredServices.map((s) => {
                          const isSelected = selectedServices.includes(s.name);
                          const sImg = getServiceImage(s.name, s.category);
                          const pricingBasis = getServicePricingBasis(s.category, s.name, s.pricingType);
                          return (
                            <button
                              key={s.id || s.name}
                              type="button"
                              role="checkbox"
                              aria-checked={isSelected}
                              onClick={() => toggleService(s.name)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '10px 14px',
                                borderRadius: 14,
                                border: `1.5px solid ${isSelected ? '#05424a' : '#e2e8f0'}`,
                                background: isSelected ? '#f0fdf9' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                transition: 'all 0.15s ease',
                                touchAction: 'manipulation',
                                WebkitTapHighlightColor: 'transparent',
                                userSelect: 'none',
                                minHeight: 64,
                                boxShadow: isSelected ? '0 3px 12px rgba(5,66,74,0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                              }}
                              className="active:scale-[0.98] transition-all"
                            >
                              {/* Service Image Thumbnail */}
                              <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(5,66,74,0.12)', background: '#f8fafc' }}>
                                <img src={sImg} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                              </div>

                              <div style={{ pointerEvents: 'none', flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 13.5, color: isSelected ? '#05424a' : '#1e293b', lineHeight: 1.3 }}>
                                  {s.name}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span>⏱ {s.duration || 30} mins</span>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 10,
                                      color: pricingBasis.isFixed ? '#0f766e' : pricingBasis.type === 'hair' ? '#0e7490' : pricingBasis.type === 'skin' ? '#a16207' : '#64748b',
                                      background: pricingBasis.isFixed ? '#f0fdfa' : pricingBasis.type === 'hair' ? '#ecfeff' : pricingBasis.type === 'skin' ? '#fefce8' : '#f1f5f9',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      border: pricingBasis.isFixed ? '1px solid #99f6e4' : pricingBasis.type === 'hair' ? '1px solid #cffafe' : pricingBasis.type === 'skin' ? '1px solid #fef08a' : '1px solid #e2e8f0',
                                    }}
                                  >
                                    {pricingBasis.shortBadge}
                                  </span>
                                </div>
                              </div>
                              <div style={{ pointerEvents: 'none', textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 9.5, fontWeight: 800, color: '#05424a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                  {pricingBasis.isFixed ? 'Fixed Price' : 'Starts From'}
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 14.5, color: '#16a34a' }}>
                                  {money(s.price)}{pricingBasis.isFixed ? '' : '+'}
                                </div>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    color: isSelected ? '#ffffff' : '#05424a',
                                    background: isSelected ? '#05424a' : '#edf7f9',
                                    border: isSelected ? '1px solid #05424a' : '1px solid #c2e2e7',
                                    padding: '3px 10px',
                                    borderRadius: 8,
                                    marginTop: 4,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    boxShadow: isSelected ? '0 2px 6px rgba(5,66,74,0.25)' : 'none',
                                  }}
                                >
                                  {isSelected ? '✓ Added' : '+ Add'}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Button when services are selected to collapse and move to Step 2 */}
                    {selectedServices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsServicePickerExpanded(false);
                          if (dateTimeSectionRef.current) {
                            dateTimeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        style={{
                          width: '100%',
                          marginTop: 12,
                          padding: '11px 16px',
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #05424a 0%, #032b30 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: 13.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 4px 12px rgba(5,66,74,0.25)',
                        }}
                      >
                        <CheckCircle2 size={16} color="#4ade80" />
                        <span>Done Choosing Services ({selectedServices.length}) — Select Date &amp; Time ➔</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Date & Time Selection */}
              <div ref={dateTimeSectionRef} id="datetime-section" style={{ marginBottom: 24, scrollMarginTop: 80 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 900, color: '#05424a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} color="#05424a" /> 2. Select Date &amp; Time Slot *
                </h3>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Booking Date:
                      </label>
                      <input
                        type="date"
                        min={todayISO()}
                        value={bookingDate}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setBookingDate(newDate);
                          if (isPastTimeForDate(newDate, selectedTime)) {
                            const nextValid = getFirstFutureSlot(newDate, TIME_SLOTS);
                            if (nextValid) setSelectedTime(nextValid);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 12,
                          border: `1.5px solid ${regularHolidayCheck.isBlocked ? '#f43f5e' : '#cbd5e1'}`,
                          fontSize: 14,
                          fontWeight: 700,
                          outline: 'none',
                          minHeight: 46,
                          touchAction: 'manipulation',
                        }}
                        className="text-base sm:text-sm"
                      />
                    </div>

                    {regularHolidayCheck.isBlocked && (
                      <div
                        style={{
                          background: regularHolidayCheck.holiday?.type === 'Holiday' ? '#fef3c7' : '#fee2e2',
                          border: `1.5px solid ${regularHolidayCheck.holiday?.type === 'Holiday' ? '#fde68a' : '#fecaca'}`,
                          color: regularHolidayCheck.holiday?.type === 'Holiday' ? '#92400e' : '#991b1b',
                          borderRadius: 12,
                          padding: '12px 16px',
                          marginBottom: 14,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {regularHolidayCheck.userMessage}
                      </div>
                    )}

                    {!regularHolidayCheck.isBlocked && areAllSlotsPast && (
                      <div
                        style={{
                          background: '#fff1f2',
                          border: '1.5px solid #fecdd3',
                          color: '#be123c',
                          borderRadius: 12,
                          padding: '12px 16px',
                          marginBottom: 14,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        ⏰ All appointment slots for today have already passed. Please select tomorrow or an upcoming date.
                      </div>
                    )}

                    <div style={{ opacity: regularHolidayCheck.isBlocked ? 0.4 : 1, pointerEvents: regularHolidayCheck.isBlocked ? 'none' : 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', margin: 0 }}>
                          Select Time Slot:
                        </label>
                        {bookingDate === todayISO() && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 6 }}>
                            ⚡ Live Future Slots
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 8,
                        }}
                        className="sm:!grid-cols-4 md:!grid-cols-4"
                      >
                        {TIME_SLOTS.map((slot) => {
                          const isSlotPast = isPastTimeForDate(bookingDate, slot);
                          const isSelected = selectedTime === slot && !isSlotPast;
                          return (
                            <button
                              key={slot}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              disabled={isSlotPast || regularHolidayCheck.isBlocked}
                              onClick={() => !isSlotPast && setSelectedTime(slot)}
                              title={isSlotPast ? 'Past time slot — cannot be booked' : `Book ${slot}`}
                              style={{
                                minHeight: 48,
                                padding: '11px 6px',
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: isSelected ? 800 : 700,
                                border: isSlotPast
                                  ? '1px dashed #cbd5e1'
                                  : `1.5px solid ${isSelected ? '#05424a' : '#cbd5e1'}`,
                                background: isSlotPast
                                  ? '#f1f5f9'
                                  : isSelected
                                  ? '#05424a'
                                  : '#ffffff',
                                color: isSlotPast
                                  ? '#94a3b8'
                                  : isSelected
                                  ? '#ffffff'
                                  : '#1e293b',
                                cursor: isSlotPast ? 'not-allowed' : 'pointer',
                                opacity: isSlotPast ? 0.45 : 1,
                                textDecoration: isSlotPast ? 'line-through' : 'none',
                                transition: 'all 0.15s ease',
                                touchAction: 'manipulation',
                                WebkitTapHighlightColor: 'transparent',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                boxShadow: isSelected
                                  ? '0 4px 12px rgba(5,66,74,0.3)'
                                  : '0 1px 2px rgba(0,0,0,0.03)',
                              }}
                              className={!isSlotPast ? 'active:scale-95 transition-transform' : ''}
                            >
                              {isSelected && <Check size={14} className="shrink-0 text-amber-300" />}
                              <span>{slot}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

              {/* Step 3: Customer Authentication & Details */}
              <div ref={loginCardRef} id="customer-auth-section" style={{ marginBottom: 24, scrollMarginTop: 80 }}>
                {!customer ? (
                  /* ─── CASE A: User is NOT Logged In (Authentication Required) ─── */
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#05424a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Lock size={18} color="#05424a" /> 3. Customer Login Required (લૉગિન જરૂરી છે) *
                      </h3>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1.5px solid #fde68a', padding: '3px 10px', borderRadius: 99 }}>
                        🔒 Login Mandatory Before Booking
                      </span>
                    </div>

                    <div
                      style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        border: '2px solid #05424a',
                        borderRadius: 20,
                        padding: '20px',
                        boxShadow: '0 8px 24px rgba(5,66,74,0.08)',
                      }}
                    >
                      {/* Notice Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #05424a 0%, #0d626e 100%)',
                            color: '#eaba38',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            Sign In / Register to Confirm Your Slot
                          </h4>
                          <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.45 }}>
                            બુકિંગ કન્ફર્મ કરવા અને WhatsApp પાસ મેળવવા માટે પહેલાં લૉગિન જરૂરી છે. Sign in with your mobile number to protect your slot.
                          </p>
                        </div>
                      </div>

                      {/* Tab Switcher */}
                      <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                        <button
                          type="button"
                          onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccessMsg(''); }}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: 9,
                            border: 'none',
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: authTab === 'login' ? '#ffffff' : 'transparent',
                            color: authTab === 'login' ? '#05424a' : '#64748b',
                            boxShadow: authTab === 'login' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <LogIn size={15} />
                          <span>Sign In (લૉગિન)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAuthTab('signup'); setAuthError(''); setAuthSuccessMsg(''); }}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: 9,
                            border: 'none',
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: authTab === 'signup' ? '#ffffff' : 'transparent',
                            color: authTab === 'signup' ? '#05424a' : '#64748b',
                            boxShadow: authTab === 'signup' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <UserPlus size={15} />
                          <span>New? Register (નવું ખાતું)</span>
                        </button>
                      </div>

                      {/* Error & Success Alerts */}
                      {authError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                          <span>{authError}</span>
                        </div>
                      )}
                      {authSuccessMsg && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                          <span>{authSuccessMsg}</span>
                        </div>
                      )}

                      {/* Form inputs */}
                      {authTab === 'login' ? (
                        <div style={{ display: 'grid', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                              Registered Mobile Number (10 Digits) *:
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ padding: '10px 12px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, fontSize: 13.5, fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center' }}>
                                +91
                              </span>
                              <input
                                type="tel"
                                maxLength={10}
                                placeholder="e.g. 9898012345"
                                value={authMobile}
                                onChange={(e) => setAuthMobile(e.target.value.replace(/\D/g, ''))}
                                style={{
                                  flex: 1,
                                  padding: '10px 14px',
                                  borderRadius: 10,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 14,
                                  outline: 'none',
                                  background: '#ffffff',
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', margin: 0 }}>
                                Password *:
                              </label>
                              <Link
                                href="/forgot-password"
                                target="_blank"
                                style={{ fontSize: 11.5, color: '#05424a', fontWeight: 700, textDecoration: 'none' }}
                              >
                                Forgot Password?
                              </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <input
                                type={showAuthPass ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInPageLogin(); } }}
                                style={{
                                  width: '100%',
                                  padding: '10px 38px 10px 14px',
                                  borderRadius: 10,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 14,
                                  outline: 'none',
                                  background: '#ffffff',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowAuthPass(!showAuthPass)}
                                style={{
                                  position: 'absolute',
                                  right: 10,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#64748b',
                                  padding: 4,
                                }}
                              >
                                {showAuthPass ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={authLoading || !authMobile || !authPassword}
                            onClick={() => handleInPageLogin()}
                            style={{
                              padding: '12px 18px',
                              borderRadius: 11,
                              background: 'linear-gradient(135deg, #05424a 0%, #032b30 100%)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 13.5,
                              fontWeight: 800,
                              cursor: authLoading || !authMobile || !authPassword ? 'not-allowed' : 'pointer',
                              opacity: authLoading || !authMobile || !authPassword ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              boxShadow: '0 4px 14px rgba(5,66,74,0.25)',
                              marginTop: 4,
                            }}
                          >
                            {authLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                            <span>{authLoading ? 'Signing In…' : 'Sign In & Unlock Booking ➔'}</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                              Full Name (પૂરું નામ) *:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Priya Patel"
                              value={authName}
                              onChange={(e) => setAuthName(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1.5px solid #cbd5e1',
                                fontSize: 14,
                                outline: 'none',
                                background: '#ffffff',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                              WhatsApp Mobile Number (10 Digits) *:
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ padding: '10px 12px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, fontSize: 13.5, fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center' }}>
                                +91
                              </span>
                              <input
                                type="tel"
                                maxLength={10}
                                placeholder="e.g. 9898012345"
                                value={authMobile}
                                onChange={(e) => setAuthMobile(e.target.value.replace(/\D/g, ''))}
                                style={{
                                  flex: 1,
                                  padding: '10px 14px',
                                  borderRadius: 10,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 14,
                                  outline: 'none',
                                  background: '#ffffff',
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                              Email Address (Optional):
                            </label>
                            <input
                              type="email"
                              placeholder="e.g. priya.patel@gmail.com"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1.5px solid #cbd5e1',
                                fontSize: 14,
                                outline: 'none',
                                background: '#ffffff',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                              Set Password (ઓછામાં ઓછા 6 અક્ષર) *:
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type={showAuthPass ? 'text' : 'password'}
                                placeholder="Create a password (min 6 characters)"
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInPageSignup(); } }}
                                style={{
                                  width: '100%',
                                  padding: '10px 38px 10px 14px',
                                  borderRadius: 10,
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: 14,
                                  outline: 'none',
                                  background: '#ffffff',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowAuthPass(!showAuthPass)}
                                style={{
                                  position: 'absolute',
                                  right: 10,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#64748b',
                                  padding: 4,
                                }}
                              >
                                {showAuthPass ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={authLoading || !authName || !authMobile || authPassword.length < 6}
                            onClick={() => handleInPageSignup()}
                            style={{
                              padding: '12px 18px',
                              borderRadius: 11,
                              background: 'linear-gradient(135deg, #05424a 0%, #032b30 100%)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 13.5,
                              fontWeight: 800,
                              cursor: authLoading || !authName || !authMobile || authPassword.length < 6 ? 'not-allowed' : 'pointer',
                              opacity: authLoading || !authName || !authMobile || authPassword.length < 6 ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              boxShadow: '0 4px 14px rgba(5,66,74,0.25)',
                              marginTop: 4,
                            }}
                          >
                            {authLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                            <span>{authLoading ? 'Registering…' : 'Register Account & Continue ➔'}</span>
                          </button>
                        </div>
                      )}

                      {/* Full Login Link */}
                      <div style={{ textAlign: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                        Prefer dedicated login page?{' '}
                        <Link
                          href={`/login?redirect=${encodeURIComponent('/book')}`}
                          style={{ color: '#05424a', fontWeight: 800, textDecoration: 'none' }}
                        >
                          Go to Customer Login Screen ➔
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── CASE B: User IS Logged In (Verified Identity Display) ─── */
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#05424a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={18} color="#05424a" /> 3. Verified Client Identity (વેરિફાઈડ એકાઉન્ટ) *
                      </h3>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: '#16a34a', background: '#dcfce7', border: '1px solid #86efac', padding: '3px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} color="#16a34a" /> Logged In &amp; Verified
                      </span>
                    </div>

                    {/* Verified Customer Profile Card */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                        border: '1.5px solid #86efac',
                        borderRadius: 16,
                        padding: '16px 18px',
                        marginBottom: 16,
                        boxShadow: '0 4px 14px rgba(22,163,74,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              background: '#05424a',
                              color: '#eaba38',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                              fontWeight: 800,
                            }}
                          >
                            {customer.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: '#065f46' }}>
                              {customer.name}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#047857', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                              <span>📞 +91 {(customer.phone || customer.mobile || customerMobile || '').replace(/\D/g, '').slice(-10)}</span>
                              {customer.email && <span>• ✉️ {customer.email}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => customerLogout()}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#64748b',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Switch Account / Logout
                        </button>
                      </div>
                    </div>

                    {/* Notes / Special Request */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Special Request / Notes (Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Preferred hair styling, allergies, or special event timing"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 12,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          outline: 'none',
                          minHeight: 46,
                        }}
                        className="text-base sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Schedule Button */}
              {(() => {
                const activeHolidayCheck = bookingMode === 'bridal' ? bridalHolidayCheck : regularHolidayCheck;
                const isTimePast = bookingMode === 'regular' && isPastTimeForDate(bookingDate, selectedTime);
                const isPastSlotBlocked = bookingMode === 'regular' && (areAllSlotsPast || isTimePast);
                const isHolidayBlocked = activeHolidayCheck.isBlocked;
                const isNoService = (bookingMode === 'regular' && selectedServices.length === 0) || (bookingMode === 'bridal' && selectedBridalPkgIds.length === 0);
                const isNotLoggedIn = !customer;

                const isBlocked = isHolidayBlocked || isPastSlotBlocked || isNoService;

                // When user is NOT logged in: Prominently prompt login on the submit button
                if (isNotLoggedIn) {
                  return (
                    <motion.button
                      type="button"
                      onClick={() => {
                        if (loginCardRef.current) {
                          loginCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        setAuthError('🔒 Please sign in or create an account in Step 3 above before scheduling.');
                      }}
                      style={{
                        width: '100%',
                        padding: '15px 20px',
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: 15,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        minHeight: 52,
                        boxShadow: '0 8px 24px rgba(180,83,9,0.35)',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Lock size={18} color="#fde68a" />
                      <span>🔒 Login Required to Confirm Booking (Step 3) ➔</span>
                    </motion.button>
                  );
                }

                return (
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || isBlocked}
                    style={{
                      width: '100%',
                      padding: '15px 20px',
                      borderRadius: 14,
                      background: isBlocked
                        ? '#94a3b8'
                        : bookingMode === 'bridal'
                        ? 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'
                        : 'linear-gradient(135deg, #05424a 0%, #0d626e 100%)',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: 15,
                      border: 'none',
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      minHeight: 52,
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      userSelect: 'none',
                      boxShadow: isBlocked
                        ? 'none'
                        : bookingMode === 'bridal'
                        ? '0 8px 24px rgba(219,39,119,0.35)'
                        : '0 8px 24px rgba(5,66,74,0.3)',
                    }}
                    whileTap={isBlocked ? {} : { scale: 0.98 }}
                  >
                    {isBlocked ? (
                      <span>⛔</span>
                    ) : bookingMode === 'bridal' ? (
                      <Crown size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    {isSubmitting
                      ? 'Submitting Booking Request…'
                      : activeHolidayCheck.isBlocked
                      ? `${activeHolidayCheck.badgeText} - Booking Unavailable`
                      : isPastSlotBlocked
                      ? '⏰ Past Time Slot - Choose Live/Future Time'
                      : isNoService
                      ? 'Please Select a Service Above'
                      : bookingMode === 'bridal'
                      ? `👑 Submit Bridal Booking Request (${money(bridalTotal)})`
                      : `💄 Submit Booking Request (${money(regularTotal)})`}
                  </motion.button>
                );
              })()}
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PublicBookingPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #05424a 0%, #0d626e 50%, #053320 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Loading Booking System…
        </div>
      }
    >
      <PublicBookingPageContent />
    </Suspense>
  );
}
