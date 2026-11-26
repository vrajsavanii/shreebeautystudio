'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Users, UserCog, Building2 } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import CustomersView from '@/app/admin/customers/CustomersView';
import StaffView from '@/app/admin/staff/StaffView';
import SuppliersView from '@/app/admin/suppliers/SuppliersView';

export type DirectoryTab = 'customers' | 'staff' | 'suppliers';

interface DirectoryHubProps {
  initialTab?: DirectoryTab;
}

function DirectoryHubContent({ initialTab = 'customers' }: DirectoryHubProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useSalonStore();

  const tabParam = searchParams.get('tab') as DirectoryTab | null;
  const [activeTab, setActiveTab] = useState<DirectoryTab>(() => {
    if (tabParam && ['customers', 'staff', 'suppliers'].includes(tabParam)) {
      return tabParam;
    }
    return initialTab;
  });

  // Sync tab with URL search parameter if changed externally
  useEffect(() => {
    if (tabParam && ['customers', 'staff', 'suppliers'].includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: DirectoryTab) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Fallback
      router.replace(`${pathname}?tab=${tab}`);
    }
  };

  const customerCount = data?.customers?.length || 0;
  const staffCount = data?.staff?.length || 0;
  const supplierCount = data?.suppliers?.length || 0;

  return (
    <div>
      {/* ── Top Unified Directory Navigation Tabs: Customers, Staff, Suppliers ── */}
      <div
        className="tabs no-print"
        style={{
          marginBottom: 18,
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          padding: '6px',
          borderRadius: 12,
          display: 'flex',
          gap: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => handleTabChange('customers')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontWeight: activeTab === 'customers' ? 800 : 600,
            color: activeTab === 'customers' ? '#05424A' : '#64748b',
            background: activeTab === 'customers' ? '#f0fdfa' : 'transparent',
            border: activeTab === 'customers' ? '1.5px solid #99f6e4' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={16} color={activeTab === 'customers' ? '#0d9488' : '#64748b'} />
          <span>Customers (ગ્રાહક લિસ્ટ)</span>
          <span
            className="tab-badge"
            style={{
              background: activeTab === 'customers' ? '#0d9488' : '#e2e8f0',
              color: activeTab === 'customers' ? '#ffffff' : '#475569',
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            {customerCount}
          </span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => handleTabChange('staff')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontWeight: activeTab === 'staff' ? 800 : 600,
            color: activeTab === 'staff' ? '#05424A' : '#64748b',
            background: activeTab === 'staff' ? '#faf5ff' : 'transparent',
            border: activeTab === 'staff' ? '1.5px solid #e9d5ff' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <UserCog size={16} color={activeTab === 'staff' ? '#9333ea' : '#64748b'} />
          <span>Staff & Users (સ્ટાફ & કમિશન)</span>
          <span
            className="tab-badge"
            style={{
              background: activeTab === 'staff' ? '#9333ea' : '#e2e8f0',
              color: activeTab === 'staff' ? '#ffffff' : '#475569',
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            {staffCount}
          </span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => handleTabChange('suppliers')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontWeight: activeTab === 'suppliers' ? 800 : 600,
            color: activeTab === 'suppliers' ? '#05424A' : '#64748b',
            background: activeTab === 'suppliers' ? '#eef2ff' : 'transparent',
            border: activeTab === 'suppliers' ? '1.5px solid #c7d2fe' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Building2 size={16} color={activeTab === 'suppliers' ? '#4f46e5' : '#64748b'} />
          <span>Suppliers (સપ્લાયર્સ & વેન્ડર્સ)</span>
          <span
            className="tab-badge"
            style={{
              background: activeTab === 'suppliers' ? '#4f46e5' : '#e2e8f0',
              color: activeTab === 'suppliers' ? '#ffffff' : '#475569',
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            {supplierCount}
          </span>
        </button>
      </div>

      {/* ── Active Tab View ── */}
      {activeTab === 'customers' && <CustomersView />}
      {activeTab === 'staff' && <StaffView />}
      {activeTab === 'suppliers' && <SuppliersView />}
    </div>
  );
}

export default function DirectoryHub(props: DirectoryHubProps) {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading Directory...</div>}>
      <DirectoryHubContent {...props} />
    </Suspense>
  );
}
