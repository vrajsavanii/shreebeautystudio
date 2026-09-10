'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface EnhancedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  pulse?: boolean;
  delay?: number;
}

export default function EnhancedCard({
  children,
  className = '',
  onClick,
  hoverEffect = true,
  pulse = false,
  delay = 0,
}: EnhancedCardProps) {
  return (
    <motion.div
      className={`card ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      animate={{
        scale: pulse ? [1, 1.02, 1] : 1,
        transition: pulse ? { duration: 2, repeat: Infinity } : { duration: 0.3 },
      }}
      whileHover={hoverEffect ? { y: -4, boxShadow: '0 20px 40px rgba(5, 66, 74, 0.15)' } : {}}
      transition={{ delay }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      {pulse && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle, rgba(5,66,74,0.1) 0%, transparent 70%)',
            opacity: 0,
            animation: 'pulse-glow 3s infinite',
          }}
        />
      )}
    </motion.div>
  );
}
