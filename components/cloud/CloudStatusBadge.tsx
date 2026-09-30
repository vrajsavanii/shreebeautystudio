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
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={cloudStatus}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          {icon}
        </motion.span>
      </AnimatePresence>
      <span className="cloud-badge-label">{label}</span>
    </button>
  );
}
