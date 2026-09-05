'use client';

import { useState } from 'react';
import { BookUser, Search, X, UserCheck } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { formatCustomerContactName } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

interface ContactPickerButtonProps {
  onSelectContact: (contact: { name: string; mobile: string }) => void;
  buttonText?: string;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'ghost' | 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

export default function ContactPickerButton({
  onSelectContact,
  buttonText = 'Pick from Phone Contacts',
  className = '',
  style,
  variant = 'ghost',
  size = 'sm',
}: ContactPickerButtonProps) {
  const { data } = useSalonStore();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handlePick = async () => {
    // Check if Web Contact Picker API is available (Mobile Chrome / Android / iOS supported)
    if (
      typeof window !== 'undefined' &&
      'contacts' in navigator &&
      'select' in (navigator as any).contacts
    ) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts && contacts[0]) {
          const rawName = contacts[0].name?.[0] || '';
          const rawTel = contacts[0].tel?.[0] || '';
          const cleanMobile = rawTel.replace(/\D/g, '').slice(-10);
          const formattedName = rawName ? formatCustomerContactName(rawName) : '';

          if (formattedName || cleanMobile) {
            onSelectContact({ name: formattedName, mobile: cleanMobile });
            toast(`📇 Phone contact selected: ${formattedName || rawName} (${cleanMobile})`);
            return;
          }
        }
      } catch (err: any) {
        // User cancelled picker or permission rejected - silent fallback
        if (err.name === 'SecurityError' || err.name === 'InvalidStateError') {
          setModalOpen(true);
          return;
        }
      }
    }

    // Fallback for Desktop browsers or browsers without Web Contacts API
    setModalOpen(true);
  };

  const customers = data?.customers || [];
  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search)
  );

  const selectExistingCustomer = (c: { name: string; mobile: string }) => {
    const formatted = formatCustomerContactName(c.name);
    onSelectContact({ name: formatted, mobile: c.mobile });
    toast(`👤 Loaded contact: ${formatted} (${c.mobile})`);
    setModalOpen(false);
  };

  const btnPadding = size === 'sm' ? '4px 10px' : '8px 14px';
  const fontSize = size === 'sm' ? 11.5 : 13;

  return (
    <>
      <button
        type="button"
        className={`btn btn-${variant} ${className}`}
        onClick={handlePick}
        style={{
          fontSize,
          padding: btnPadding,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 700,
          color: 'var(--teal)',
          background: 'var(--teal-subtle)',
          border: '1px solid var(--teal-light, #05424a30)',
          borderRadius: 8,
          cursor: 'pointer',
          ...style,
        }}
        title="Automatically select customer name and mobile number from phone contacts"
      >
        <BookUser size={size === 'sm' ? 14 : 16} />
        <span>{buttonText}</span>
      </button>

      {/* Fallback Contact Selector Modal for Desktop */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="📇 Select Contact from Salon Database"
      >
        <div style={{ paddingBottom: 10 }}>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
            Select an existing customer contact to auto-fill details into the form:
          </p>

          <div className="search-wrap" style={{ marginBottom: 12 }}>
            <Search size={14} className="search-icon" />
            <input
              type="search"
              className="input"
              placeholder="Search contact name or 10-digit mobile number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div
            style={{
              maxHeight: 280,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {filteredCustomers.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 20,
                  color: 'var(--muted)',
                  fontSize: 13,
                }}
              >
                No matching contacts found. You can type a new customer name and mobile directly in the form!
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectExistingCustomer(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--teal)';
                    e.currentTarget.style.background = 'var(--teal-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>
                      {formatCustomerContactName(c.name)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>📞 {c.mobile}</div>
                  </div>
                  <UserCheck size={16} color="var(--teal)" />
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
