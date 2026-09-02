'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { fadeSlideUp } from '@/variants';
import { money } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
  sub?: string;
  isMoney?: boolean;
  alert?: boolean;
}

export default function StatCard({
  label,
  value,
  icon,
  iconBg = '#e8f4f6',
  iconColor = '#05424A',
  sub,
  isMoney,
  alert,
}: StatCardProps) {
  const displayValue = isMoney ? money(Number(value)) : value;

  return (
    <motion.div
      className="stat-card"
      variants={fadeSlideUp}
      style={{
        borderColor: alert && Number(value) > 0 ? '#ffd5d3' : undefined,
        background: alert && Number(value) > 0 ? '#fff9f9' : undefined,
      }}
      whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(15,35,40,.12)' }}
      transition={{ duration: 0.2 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          className="stat-card-icon"
          style={{ background: alert && Number(value) > 0 ? '#ffe4e3' : iconBg }}
        >
          <span style={{ color: alert && Number(value) > 0 ? 'var(--red)' : iconColor }}>
            {icon}
          </span>
        </div>
      </div>
      <div>
        <div className="stat-card-label">{label}</div>
        <div
          className="stat-card-value"
          style={{ color: alert && Number(value) > 0 ? 'var(--red)' : undefined }}
        >
          {displayValue}
        </div>
        {sub && <div className="stat-card-sub">{sub}</div>}
      </div>
    </motion.div>
  );
}
