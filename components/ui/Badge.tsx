import React from 'react';
import { AppointmentStatus, WorkStatus } from '@/types/salon';

interface BadgeProps {
  status: AppointmentStatus | WorkStatus | 'paid' | string;
  children?: React.ReactNode;
}

const colorMap: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  confirmed:   { bg: '#e1f6ea', text: '#166534', dot: '#22c55e', border: '#bbf7d0' },
  completed:   { bg: '#e1f6ea', text: '#166534', dot: '#22c55e', border: '#bbf7d0' },
  paid:        { bg: '#e1f6ea', text: '#166534', dot: '#22c55e', border: '#bbf7d0' },
  'in service':{ bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', border: '#bfdbfe' },
  billed:      { bg: '#f0fdf4', text: '#15803d', dot: '#16a34a', border: '#bbf7d0' },
  booked:      { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b', border: '#fde68a' },
  pending:     { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b', border: '#fde68a' },
  cancelled:   { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', border: '#fecaca' },
  buy:         { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', border: '#bfdbfe' },
  sell:        { bg: '#f0fdf4', text: '#15803d', dot: '#16a34a', border: '#bbf7d0' },
  low:         { bg: '#fff7ed', text: '#9a3412', dot: '#f97316', border: '#fed7aa' },
};

export default function Badge({ status, children }: BadgeProps) {
  const key = (status || '').toLowerCase().trim();
  const style = colorMap[key] || { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', border: '#e2e8f0' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: style.dot,
          display: 'inline-block',
        }}
      />
      {children ?? status}
    </span>
  );
}
