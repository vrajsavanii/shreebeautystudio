'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  User,
  Calendar,
  FileText,
  MapPin,
  Lock,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  Plus,
  Trash2,
  Edit2,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useCustomerAuth } from '@/lib/customer-context';
import { CustomerAddress } from '@/types/salon';

type ProfileTab = 'overview' | 'appointments' | 'invoices' | 'addresses' | 'security';

export default function ProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ProfileTab) || 'overview';

  const { customer, appointments, bridal, invoices, loading, logout, refreshProfile, updateProfileState } =
    useCustomerAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as ProfileTab;
    if (tabParam && ['overview', 'appointments', 'invoices', 'addresses', 'security'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editAnniversary, setEditAnniversary] = useState('');
  const [editSagaiDate, setEditSagaiDate] = useState('');
  const [editGender, setEditGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Address Management State
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrName, setAddrName] = useState('');
  const [addrMobile, setAddrMobile] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('Surat');
  const [addrState, setAddrState] = useState('Gujarat');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrType, setAddrType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrMsg, setAddrMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar Upload State
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Populate edit fields when customer data loads
  useEffect(() => {
    if (customer) {
      setEditName(customer.name || '');
      setEditEmail(customer.email || '');
      setEditPhone(customer.phone || '');
      setEditBirthday(customer.birthday || '');
      setEditAnniversary(customer.anniversary || '');
      setEditSagaiDate(customer.sagaiDate || '');
      setEditGender((customer.gender as 'Female' | 'Male' | 'Other') || 'Female');
      setAddresses(customer.addresses || []);
    }
  }, [customer]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setSaveLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          birthday: editBirthday || null,
          anniversary: editAnniversary || null,
          sagaiDate: editSagaiDate || null,
          gender: editGender,
        }),
      });

      const data = await res.json();
      if (data.success && data.profile) {
        updateProfileState(data.profile);
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.message || 'Network error occurred.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Avatar Upload
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Profile photo size should be under 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    setAvatarLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileImage: base64Data }),
        });
        const data = await res.json();
        if (data.success && data.profile) {
          updateProfileState(data.profile);
        } else {
          alert(data.error || 'Failed to update photo.');
        }
      } catch {
        alert('Could not upload photo. Please try again.');
      } finally {
        setAvatarLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPassMsg({ type: 'success', text: 'Your password has been changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMsg({ type: 'error', text: data.error || 'Failed to change password.' });
      }
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err?.message || 'Network error occurred.' });
    } finally {
      setPassLoading(false);
    }
  };

  // Open Address Modal for New or Edit
  const openAddressModal = (addr?: CustomerAddress) => {
    if (addr) {
      setEditingAddressId(addr.id);
      setAddrName(addr.name || '');
      setAddrMobile(addr.mobile || '');
      setAddrLine1(addr.line1 || '');
      setAddrLine2(addr.line2 || '');
      setAddrCity(addr.city || 'Surat');
      setAddrState(addr.state || 'Gujarat');
      setAddrPincode(addr.pincode || '');
      setAddrType(addr.type || 'Home');
      setAddrIsDefault(addr.isDefault || false);
    } else {
      setEditingAddressId(null);
      setAddrName(customer?.name || '');
      setAddrMobile(customer?.phone || '');
      setAddrLine1('');
      setAddrLine2('');
      setAddrCity('Surat');
      setAddrState('Gujarat');
      setAddrPincode('');
      setAddrType('Home');
      setAddrIsDefault(addresses.length === 0);
    }
    setAddrMsg(null);
    setShowAddressModal(true);
  };

  // Save Address (Create or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrMsg(null);
    setAddrLoading(true);

    try {
      const payload = {
        name: addrName.trim(),
        mobile: addrMobile.trim(),
        line1: addrLine1.trim(),
        line2: addrLine2.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        pincode: addrPincode.trim(),
        country: 'India',
        type: addrType,
        isDefault: addrIsDefault,
      };

      const res = await fetch('/api/auth/addresses', {
        method: editingAddressId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAddressId ? { id: editingAddressId, ...payload } : payload),
      });

      const data = await res.json();
      if (data.success && data.addresses) {
        setAddresses(data.addresses);
        if (customer) {
          updateProfileState({ ...customer, addresses: data.addresses });
        }
        setShowAddressModal(false);
      } else {
        setAddrMsg({ type: 'error', text: data.error || 'Failed to save address.' });
      }
    } catch (err: any) {
      setAddrMsg({ type: 'error', text: err?.message || 'Failed to save address.' });
    } finally {
      setAddrLoading(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to remove this address?')) return;
    try {
      const res = await fetch(`/api/auth/addresses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && data.addresses) {
        setAddresses(data.addresses);
        if (customer) {
          updateProfileState({ ...customer, addresses: data.addresses });
        }
      } else {
        alert(data.error || 'Failed to delete address.');
      }
    } catch {
      alert('Error deleting address.');
    }
  };

  // Set Address as Default
  const handleSetDefaultAddress = async (addr: CustomerAddress) => {
    try {
      const res = await fetch('/api/auth/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: addr.id, isDefault: true }),
      });
      const data = await res.json();
      if (data.success && data.addresses) {
        setAddresses(data.addresses);
        if (customer) {
          updateProfileState({ ...customer, addresses: data.addresses });
        }
      }
    } catch {}
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '75vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <Loader2 size={36} color="#EABA38" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading your salon account…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!customer) {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: '80px auto',
          padding: '40px 24px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 20px 48px rgba(5,66,74,0.08)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(234, 186, 56, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#05424A',
          }}
        >
          <Lock size={30} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#05424A', marginBottom: 8 }}>
          Authentication Required
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Please log in to your Shree Beauty Studio account to view and manage your profile, appointments, and billing history.
        </p>
        <Link
          href="/login?redirect=/profile"
          className="cust-btn-gold"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: 99,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          <User size={16} color="#EABA38" />
          <span>Sign In to Account</span>
        </Link>
      </div>
    );
  }

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 64px' }}>
      {/* ─── Hero Profile Header Card ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
          borderRadius: 24,
          padding: 'clamp(24px, 4vw, 36px)',
          color: '#ffffff',
          boxShadow: '0 20px 48px rgba(5,66,74,0.22)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 28,
        }}
      >
        {/* Decorative corner glow */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234, 186, 56, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Avatar & User Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                  color: '#032B30',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 30,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 0 0 4px rgba(234,186,56,0.3)',
                }}
              >
                {customer.profileImage ? (
                  <img
                    src={customer.profileImage}
                    alt={customer.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(customer.name)
                )}
              </div>
              <label
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#EABA38',
                  color: '#032B30',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: avatarLoading ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
                title="Update photo"
              >
                {avatarLoading ? (
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Camera size={14} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  style={{ display: 'none' }}
                  disabled={avatarLoading}
                />
              </label>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  {customer.name}
                </h1>
                <span
                  style={{
                    background: 'rgba(234, 186, 56, 0.2)',
                    color: '#EABA38',
                    border: '1px solid rgba(234, 186, 56, 0.4)',
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {customer.status || 'Active Member'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 6,
                  fontSize: 13.5,
                  color: 'rgba(255,255,255,0.85)',
                  flexWrap: 'wrap',
                }}
              >
                {customer.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Phone size={14} color="#EABA38" />
                    +91 {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Mail size={14} color="#EABA38" />
                    {customer.email}
                    {customer.emailVerified && (
                      <span title="Verified email">
                        <CheckCircle2 size={13} color="#22c55e" />
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                borderRadius: 16,
                padding: '12px 18px',
                border: '1px solid rgba(234,186,56,0.25)',
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: 11.5, color: '#EABA38', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} /> REWARDS
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                {customer.loyaltyPoints || 0}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>pts</span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                borderRadius: 16,
                padding: '12px 18px',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} /> BOOKINGS
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                {(appointments?.length || 0) + (bridal?.length || 0)}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                borderRadius: 16,
                padding: '12px 18px',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileText size={12} /> INVOICES
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                {invoices?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid: Tabs Nav & View ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 280px) 1fr',
          gap: 24,
          alignItems: 'start',
        }}
        className="profile-layout-grid"
      >
        {/* Left Side: Navigation Tabs Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'overview' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
              color: activeTab === 'overview' ? '#ffffff' : '#334155',
              fontWeight: activeTab === 'overview' ? 700 : 600,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={16} color={activeTab === 'overview' ? '#EABA38' : '#64748b'} />
              Overview & Profile
            </span>
            <ChevronRight size={14} opacity={activeTab === 'overview' ? 1 : 0.4} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'appointments' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
              color: activeTab === 'appointments' ? '#ffffff' : '#334155',
              fontWeight: activeTab === 'appointments' ? 700 : 600,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Calendar size={16} color={activeTab === 'appointments' ? '#EABA38' : '#64748b'} />
              My Appointments ({appointments?.length || 0})
            </span>
            <ChevronRight size={14} opacity={activeTab === 'appointments' ? 1 : 0.4} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'invoices' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
              color: activeTab === 'invoices' ? '#ffffff' : '#334155',
              fontWeight: activeTab === 'invoices' ? 700 : 600,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={16} color={activeTab === 'invoices' ? '#EABA38' : '#64748b'} />
              Billing & Invoices ({invoices?.length || 0})
            </span>
            <ChevronRight size={14} opacity={activeTab === 'invoices' ? 1 : 0.4} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'addresses' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
              color: activeTab === 'addresses' ? '#ffffff' : '#334155',
              fontWeight: activeTab === 'addresses' ? 700 : 600,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MapPin size={16} color={activeTab === 'addresses' ? '#EABA38' : '#64748b'} />
              Saved Addresses ({addresses?.length || 0})
            </span>
            <ChevronRight size={14} opacity={activeTab === 'addresses' ? 1 : 0.4} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'security' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
              color: activeTab === 'security' ? '#ffffff' : '#334155',
              fontWeight: activeTab === 'security' ? 700 : 600,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={16} color={activeTab === 'security' ? '#EABA38' : '#64748b'} />
              Security & Password
            </span>
            <ChevronRight size={14} opacity={activeTab === 'security' ? 1 : 0.4} />
          </button>

          <div style={{ height: 1, background: '#f1f5f9', margin: '8px 0' }} />

          <button
            type="button"
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'transparent',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Right Side: Tab Contents Panel */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: 'clamp(20px, 3.5vw, 32px)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          {/* ═══════════ TAB 1: OVERVIEW & PERSONAL DETAILS ═══════════ */}
          {activeTab === 'overview' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: 24,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#05424A', margin: 0 }}>
                    Personal Information
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                    View and update your contact info and personal milestones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 99,
                    border: '1px solid #cbd5e1',
                    background: isEditing ? '#f1f5f9' : '#ffffff',
                    color: '#05424A',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <Edit2 size={13} />
                  <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
                </button>
              </div>

              {profileMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: profileMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: profileMsg.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${profileMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              {isEditing ? (
                /* Edit Form */
                <form onSubmit={handleSaveProfile}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: 18,
                      marginBottom: 24,
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="10-digit mobile"
                        required
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="you@example.com"
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Gender
                      </label>
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          background: '#ffffff',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Birthday (Special Discounts!)
                      </label>
                      <input
                        type="date"
                        value={editBirthday}
                        onChange={(e) => setEditBirthday(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Anniversary Date
                      </label>
                      <input
                        type="date"
                        value={editAnniversary}
                        onChange={(e) => setEditAnniversary(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Sagai / Engagement Date
                      </label>
                      <input
                        type="date"
                        value={editSagaiDate}
                        onChange={(e) => setEditSagaiDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      style={{
                        padding: '11px 24px',
                        background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: saveLoading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {saveLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                      <span>{saveLoading ? 'Saving changes…' : 'Save Profile Changes'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      style={{
                        padding: '11px 18px',
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Readonly Profile Grid */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 20,
                  }}
                >
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Full Name</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{customer.name}</div>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Mobile Number</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                      {customer.phone ? `+91 ${customer.phone}` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Email Address</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                      {customer.email || 'Not provided'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gender</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                      {customer.gender || 'Female'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Birthday</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>
                      {customer.birthday || 'Add birthday to receive special birthday gift'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Anniversary</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>
                      {customer.anniversary || 'Not set'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sagai / Engagement</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>
                      {customer.sagaiDate || 'Not set'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Loyalty Points</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#b45309', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={16} color="#d97706" />
                      {customer.loyaltyPoints || 0} Points Available
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB 2: MY APPOINTMENTS & BRIDAL ═══════════ */}
          {activeTab === 'appointments' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: 24,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#05424A', margin: 0 }}>
                    My Appointments & Bookings
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                    All past and upcoming appointments booked under your phone number.
                  </p>
                </div>
                <Link
                  href="/book"
                  className="cust-btn-gold"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 18px',
                    borderRadius: 99,
                    background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                    color: '#032B30',
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                >
                  <Plus size={15} />
                  <span>Book New Appointment</span>
                </Link>
              </div>

              {appointments && appointments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {appointments.map((apt: any) => {
                    const statusColor =
                      apt.status === 'Confirmed'
                        ? { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }
                        : apt.status === 'Completed'
                        ? { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }
                        : apt.status === 'Cancelled'
                        ? { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' }
                        : { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };

                    return (
                      <div
                        key={apt.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 16,
                          padding: '18px 20px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          background: '#ffffff',
                          transition: 'box-shadow 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              background: 'rgba(5,66,74,0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#05424A',
                              flexShrink: 0,
                            }}
                          >
                            <Calendar size={22} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                                {apt.date || 'Scheduled Date'}
                              </span>
                              {apt.time && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 13,
                                    color: '#64748b',
                                    fontWeight: 600,
                                  }}
                                >
                                  <Clock size={13} /> {apt.time}
                                </span>
                              )}
                              <span
                                style={{
                                  background: statusColor.bg,
                                  color: statusColor.text,
                                  border: `1px solid ${statusColor.border}`,
                                  padding: '2px 8px',
                                  borderRadius: 99,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                }}
                              >
                                {apt.status || 'Scheduled'}
                              </span>
                            </div>

                            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                              {apt.notes ? apt.notes : 'Salon Appointment'}
                            </div>

                            {apt.totalAmount ? (
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#05424A', marginTop: 4 }}>
                                Estimated: ₹{apt.totalAmount}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <a
                            href={`https://wa.me/919824183769?text=Hi%20Shree%20Beauty%20Studio%2C%20regarding%20my%20appointment%20on%20${encodeURIComponent(
                              apt.date || ''
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '8px 14px',
                              borderRadius: 10,
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              fontSize: 12.5,
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            WhatsApp Salon
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 16,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <Calendar size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#334155' }}>No salon appointments found</div>
                  <p style={{ color: '#64748b', fontSize: 13, maxWidth: 360, margin: '6px auto 18px' }}>
                    You have not booked any appointments yet, or your previous bookings were made under a different phone number.
                  </p>
                  <Link
                    href="/book"
                    className="cust-btn-gold"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 20px',
                      borderRadius: 99,
                      background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                      color: '#032B30',
                      fontWeight: 700,
                      fontSize: 13.5,
                      textDecoration: 'none',
                    }}
                  >
                    <Calendar size={14} /> Book Your First Appointment
                  </Link>
                </div>
              )}

              {/* Bridal Bookings Section */}
              {bridal && bridal.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#05424A', marginBottom: 14 }}>
                    Bridal & Festive Orders
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {bridal.map((b: any) => (
                      <div
                        key={b.id}
                        style={{
                          border: '1px solid #fed7aa',
                          background: '#fffaf5',
                          borderRadius: 16,
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: '#7c2d12' }}>
                            {b.packageName || 'Bridal Package'}
                          </div>
                          <div style={{ fontSize: 13, color: '#9a3412', marginTop: 2 }}>
                            Wedding Date: {b.weddingDate || 'TBD'} · Bride: {b.brideName}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              background: '#ffedd5',
                              color: '#c2410c',
                              padding: '3px 10px',
                              borderRadius: 99,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {b.status || 'Active'}
                          </span>
                          {b.totalAmount && (
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#05424A', marginTop: 4 }}>
                              ₹{b.totalAmount}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB 3: INVOICES & BILLING ═══════════ */}
          {activeTab === 'invoices' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: 24,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#05424A', margin: 0 }}>
                    Billing History & Receipts
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                    View and print official GST-compliant tax invoices for your salon services.
                  </p>
                </div>
              </div>

              {invoices && invoices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 16,
                        padding: '18px 20px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                        background: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#05424A',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={22} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                              Invoice #{inv.invoiceNumber || inv.id}
                            </span>
                            <span style={{ fontSize: 12.5, color: '#64748b' }}>· {inv.date}</span>
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '2px 8px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              Paid ({inv.paymentMethod || 'Cash/UPI'})
                            </span>
                          </div>

                          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                            {inv.items?.length
                              ? `${inv.items.length} service(s) · Total: ₹${inv.total || inv.grandTotal || 0}`
                              : `Total: ₹${inv.total || inv.grandTotal || 0}`}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Link
                          href={`/invoice/${inv.id}`}
                          target="_blank"
                          style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: '#05424A',
                            color: '#ffffff',
                            fontSize: 13,
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <ExternalLink size={13} color="#EABA38" />
                          <span>View Invoice</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 16,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#334155' }}>No invoices on file</div>
                  <p style={{ color: '#64748b', fontSize: 13, maxWidth: 360, margin: '6px auto 0' }}>
                    Receipts will appear here automatically when billing is completed at Shree Beauty Studio.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB 4: SAVED ADDRESSES ═══════════ */}
          {activeTab === 'addresses' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: 24,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#05424A', margin: 0 }}>
                    Saved Delivery & Home Addresses
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                    Manage addresses for bridal on-site visits and product doorstep deliveries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAddressModal()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 18px',
                    borderRadius: 99,
                    background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} color="#EABA38" />
                  <span>Add New Address</span>
                </button>
              </div>

              {addresses && addresses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      style={{
                        border: addr.isDefault ? '2px solid #EABA38' : '1px solid #e2e8f0',
                        borderRadius: 16,
                        padding: '18px 20px',
                        background: '#ffffff',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: addr.isDefault ? '0 8px 20px rgba(234, 186, 56, 0.15)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              background: addr.type === 'Work' ? '#e0e7ff' : addr.type === 'Home' ? '#f0fdf4' : '#f1f5f9',
                              color: addr.type === 'Work' ? '#3730a3' : addr.type === 'Home' ? '#166534' : '#334155',
                            }}
                          >
                            {addr.type || 'Home'}
                          </span>
                          {addr.isDefault && (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '2px 8px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              Default
                            </span>
                          )}
                        </div>

                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{addr.name}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>+91 {addr.mobile}</div>
                        <div style={{ fontSize: 13.5, color: '#334155', marginTop: 8, lineHeight: 1.5 }}>
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ''}
                          <br />
                          {addr.city}, {addr.state} - {addr.pincode}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 16,
                          paddingTop: 12,
                          borderTop: '1px solid #f1f5f9',
                        }}
                      >
                        {!addr.isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#05424A',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Set as default
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={13} /> Default Address
                          </span>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => openAddressModal(addr)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 16,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <MapPin size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#334155' }}>No addresses saved yet</div>
                  <p style={{ color: '#64748b', fontSize: 13, maxWidth: 360, margin: '6px auto 18px' }}>
                    Save your home or event venue address for faster bridal appointments and beauty product shipments.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAddressModal()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 20px',
                      borderRadius: 99,
                      background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 13.5,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={15} color="#EABA38" />
                    <span>Add New Address</span>
                  </button>
                </div>
              )}

              {/* Add / Edit Address Modal */}
              {showAddressModal && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: 20,
                      padding: 'clamp(20px, 4vw, 32px)',
                      maxWidth: 520,
                      width: '100%',
                      boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                    }}
                  >
                    <h3 style={{ fontSize: 19, fontWeight: 800, color: '#05424A', margin: '0 0 16px' }}>
                      {editingAddressId ? 'Edit Address' : 'Add New Address'}
                    </h3>

                    {addrMsg && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 16,
                          background: '#fef2f2',
                          color: '#991b1b',
                          border: '1px solid #fecaca',
                        }}
                      >
                        {addrMsg.text}
                      </div>
                    )}

                    <form onSubmit={handleSaveAddress}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            Contact Name *
                          </label>
                          <input
                            type="text"
                            value={addrName}
                            onChange={(e) => setAddrName(e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: '1.5px solid #cbd5e1',
                              fontSize: 13.5,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            Mobile Number *
                          </label>
                          <input
                            type="tel"
                            value={addrMobile}
                            onChange={(e) => setAddrMobile(e.target.value)}
                            required
                            placeholder="10 digits"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: '1.5px solid #cbd5e1',
                              fontSize: 13.5,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Address Line 1 (House/Flat, Building, Street) *
                        </label>
                        <input
                          type="text"
                          value={addrLine1}
                          onChange={(e) => setAddrLine1(e.target.value)}
                          required
                          placeholder="e.g. 402, Royal Residency, Katargam"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1.5px solid #cbd5e1',
                            fontSize: 13.5,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Address Line 2 (Area, Landmark)
                        </label>
                        <input
                          type="text"
                          value={addrLine2}
                          onChange={(e) => setAddrLine2(e.target.value)}
                          placeholder="Near Gajera Circle"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1.5px solid #cbd5e1',
                            fontSize: 13.5,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            City *
                          </label>
                          <input
                            type="text"
                            value={addrCity}
                            onChange={(e) => setAddrCity(e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: '1.5px solid #cbd5e1',
                              fontSize: 13.5,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            State *
                          </label>
                          <input
                            type="text"
                            value={addrState}
                            onChange={(e) => setAddrState(e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: '1.5px solid #cbd5e1',
                              fontSize: 13.5,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            Pincode *
                          </label>
                          <input
                            type="text"
                            value={addrPincode}
                            onChange={(e) => setAddrPincode(e.target.value)}
                            required
                            placeholder="395004"
                            maxLength={6}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: '1.5px solid #cbd5e1',
                              fontSize: 13.5,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['Home', 'Work', 'Other'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setAddrType(t)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: addrType === t ? '1.5px solid #05424A' : '1px solid #cbd5e1',
                                background: addrType === t ? '#05424A' : '#ffffff',
                                color: addrType === t ? '#ffffff' : '#334155',
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: 'pointer',
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={addrIsDefault}
                            onChange={(e) => setAddrIsDefault(e.target.checked)}
                          />
                          <span>Set as default</span>
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                        <button
                          type="button"
                          onClick={() => setShowAddressModal(false)}
                          style={{
                            padding: '10px 18px',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: 8,
                            color: '#475569',
                            fontWeight: 600,
                            fontSize: 13.5,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addrLoading}
                          style={{
                            padding: '10px 22px',
                            background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                            border: 'none',
                            borderRadius: 8,
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 13.5,
                            cursor: addrLoading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {addrLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                          <span>Save Address</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB 5: SECURITY & CHANGE PASSWORD ═══════════ */}
          {activeTab === 'security' && (
            <div>
              <div
                style={{
                  paddingBottom: 16,
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: 24,
                }}
              >
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#05424A', margin: 0 }}>
                  Account Security
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                  Update your account password and review active authentication settings.
                </p>
              </div>

              {passMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: passMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: passMsg.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${passMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {passMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{passMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ maxWidth: 460 }}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password (leave empty if newly created via OTP)"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 6 characters"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={passLoading}
                  style={{
                    padding: '12px 26px',
                    background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: passLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {passLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={16} color="#EABA38" />}
                  <span>{passLoading ? 'Updating password…' : 'Update Password'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .profile-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
