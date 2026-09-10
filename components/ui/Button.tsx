'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'gold' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
  iconRight?: boolean;
  shadow?: boolean;
  glass?: boolean;
  pulse?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  children,
  disabled,
  className = '',
  fullWidth = false,
  iconRight = false,
  shadow = true,
  glass = false,
  pulse = false,
  ...rest
}: ButtonProps) {
  const baseCls = [
    'btn',
    variant === 'primary' ? 'btn-primary' :
    variant === 'gold' ? 'btn-gold' :
    variant === 'ghost' ? 'btn-ghost' :
    variant === 'danger' ? 'btn-danger' :
    variant === 'success' ? 'btn-success' :
    'btn-outline',
    size === 'xs' ? 'btn-xs' :
    size === 'sm' ? 'btn-sm' :
    size === 'lg' ? 'btn-lg' : '',
    fullWidth ? 'btn-full' : '',
    glass ? 'glass' : '',
    pulse ? 'animate-pulse' : '',
    className,
  ].filter(Boolean).join(' ');

  const iconOnly = icon && !children;

  return (
    <motion.button
      className={baseCls}
      whileTap={{ scale: 0.96 }}
      whileHover={{ 
        scale: iconOnly ? 1.05 : 1.02,
        boxShadow: shadow ? "0 10px 30px rgba(5, 66, 74, 0.2)" : undefined,
        y: -2 
      }}
      animate={{
        scale: iconOnly && pulse ? [1, 1.05, 1] : 1,
      }}
      transition={{
        scale: { duration: 0.2 },
        boxShadow: { duration: 0.3 },
        animate: pulse ? { duration: 2, repeat: Infinity, repeatType: "reverse" } : {}
      }}
      disabled={disabled || loading}
      {...rest}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...rest.style
      }}
    >
      {/* Ripple Effect Container */}
      <span className="absolute inset-0 overflow-hidden">
        <span className="ripple-effect"></span>
      </span>
      
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="loading-spinner-mini" />
          <span>{children}</span>
        </div>
      ) : (
        <div className={`flex items-center justify-center gap-2 ${iconRight ? 'flex-row-reverse' : ''}`}>
          {icon && <span className={iconOnly ? '' : ''}>{icon}</span>}
          {!iconOnly && <span>{children}</span>}
        </div>
      )}
    </motion.button>
  );
}
