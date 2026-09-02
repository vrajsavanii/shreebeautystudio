'use client';

import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    variant === 'primary' ? 'btn-primary' :
    variant === 'gold' ? 'btn-gold' :
    variant === 'ghost' ? 'btn-ghost' :
    'btn-danger',
    size === 'sm' ? 'btn-sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <motion.button
      className={cls}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      {...(rest as object)}
    >
      {loading ? (
        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
      ) : icon}
      {children}
    </motion.button>
  );
}
