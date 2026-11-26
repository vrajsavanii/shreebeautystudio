'use client';

import { useSalonStore } from '@/lib/store';
import { cloudSave } from '@/lib/sync';
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function CloudStatusBadge() {
  const { cloudStatus, lastSynced } = useSalonStore();

  const config = {
    idle:    { label: 'Cloud Synced',      icon: <Check size={13} />, cls: 'saved' },
    syncing: { label: 'Syncing…',          icon: <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />, cls: 'syncing' },
    saved:   { label: 'Cloud Synced',      icon: <Check size={13} />, cls: 'saved' },
    error:   { label: 'Sync Error',        icon: <AlertCircle size={13} />, cls: 'error' },
    offline: { label: 'Offline',           icon: <CloudOff size={13} />, cls: 'idle' },
  };

  const { label, icon, cls } = config[cloudStatus] || config.idle;

  return (
    <button
      className={`cloud-badge ${cls}`}
      onClick={() => cloudSave()}
      title={lastSynced ? `Cloud DB Synced: ${format(new Date(lastSynced), 'dd MMM HH:mm')}` : 'Click to sync with Cloud'}
      style={{
        width: 114,
        minWidth: 114,
        maxWidth: 114,
        height: 28,
        minHeight: 28,
        maxHeight: 28,
        padding: '0 8px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, flexShrink: 0 }}>
        {icon}
      </span>
      <span className="cloud-badge-label" style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  );
}
