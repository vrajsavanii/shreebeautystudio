// lib/customer-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SafeCustomerProfile } from './customer-auth';

interface CustomerAuthContextType {
  customer: SafeCustomerProfile | null;
  appointments: any[];
  bridal: any[];
  invoices: any[];
  loading: boolean;
  authenticated: boolean;
  login: (credentials: any) => Promise<{ success: boolean; error?: string; notFound?: boolean; needsPasswordSetup?: boolean }>;
  signup: (details: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updated: SafeCustomerProfile) => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<SafeCustomerProfile | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bridal, setBridal] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.authenticated && json.profile) {
          setCustomer(json.profile);
          setAppointments(json.appointments || []);
          setBridal(json.bridal || []);
          setInvoices(json.invoices || []);
          return;
        }
      }
      setCustomer(null);
      setAppointments([]);
      setBridal([]);
      setInvoices([]);
    } catch (err) {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (credentials: any) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      const json = await res.json();
      const customerData = json.profile || json.customer;
      if (json.success && customerData) {
        setCustomer(customerData);
        // Non-blocking background fetch for past appointments/invoices
        fetchProfile().catch(() => {});
        return { success: true };
      }
      return {
        success: false,
        error: json.error || 'Login failed. Please check your credentials.',
        notFound: json.notFound,
        needsPasswordSetup: json.needsPasswordSetup,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error occurred.' };
    }
  };

  const signup = async (details: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(details),
      });
      const json = await res.json();
      if (json.success && json.profile) {
        setCustomer(json.profile);
        // Non-blocking background fetch
        fetchProfile().catch(() => {});
        return { success: true };
      }
      return { success: false, error: json.error || 'Registration failed.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error occurred.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setCustomer(null);
    setAppointments([]);
    setBridal([]);
    setInvoices([]);
    window.location.href = '/';
  };

  const updateProfileState = (updated: SafeCustomerProfile) => {
    setCustomer(updated);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        appointments,
        bridal,
        invoices,
        loading,
        authenticated: !!customer,
        login,
        signup,
        logout,
        refreshProfile: fetchProfile,
        updateProfileState,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextType {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    return {
      customer: null,
      appointments: [],
      bridal: [],
      invoices: [],
      loading: false,
      authenticated: false,
      login: async () => ({ success: false, error: 'Auth context not available' }),
      signup: async () => ({ success: false, error: 'Auth context not available' }),
      logout: async () => {},
      refreshProfile: async () => {},
      updateProfileState: () => {},
    };
  }
  return context;
}
