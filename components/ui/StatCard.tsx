'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode, useEffect, useState, useMemo } from 'react';
import { fadeSlideUp, scaleIn } from '@/variants';
import { money } from '@/lib/utils';

interface StatCardProps extends HTMLMotionProps<'div'> {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
  sub?: string;
  isMoney?: boolean;
  alert?: boolean;
  animateValue?: boolean;
  delay?: number;
}

export default function StatCard({
  label,
  value,
  icon,
  iconBg = 'rgba(5,66,74,.1)',
  iconColor = '#05424A',
  sub,
  isMoney,
  alert,
  animateValue = true,
  delay = 0,
  className = '',
  ...rest
}: StatCardProps) {
  const displayValue = isMoney ? money(Number(value)) : value;
  
  const isNumeric = !isNaN(Number(value)) && value !== '' && value !== null;
  const [currentValue, setCurrentValue] = useState<number | string>(() => isNumeric ? Number(value) : value);
  
  useEffect(() => {
    if (animateValue && isNumeric) {
      const targetValue = Number(value);
      if (isMoney) {
        let start = 0;
        const duration = 800;
        const startTime = performance.now();
        
        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOutQuart = 1 - Math.pow(1 - progress, 4);
          
          start = targetValue * easeOutQuart;
          setCurrentValue(start);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setCurrentValue(targetValue);
          }
        };
        
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(targetValue);
      }
    } else {
      setCurrentValue(value);
    }
  }, [value, isMoney, animateValue, isNumeric]);

  return (
    <motion.div
      className={`stat-card ${alert ? 'red' : ''} ${className}`}
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      transition={{ delay, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      whileHover={{ 
        y: -6,
        scale: 1.02,
        boxShadow: '0 20px 40px rgba(5, 66, 74, 0.15)'
      }}
      style={{
        borderColor: alert && Number(value) > 0 ? '#fecaca' : undefined,
        background: alert && Number(value) > 0 ? '#fff9f9' : undefined,
      }}
      {...rest}
    >
      {/* Animated background gradient */}
      <div
        className="absolute top-0 left-0 w-full h-1"
        style={{
          background: alert && Number(value) > 0 
            ? 'linear-gradient(90deg, #dc2626, #f87171)'
            : `linear-gradient(90deg, ${iconColor}, #05424A)`,
          opacity: 0,
          transition: 'opacity 0.3s ease',
        }}
      />
      
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}
      >
        <motion.div
          className="stat-card-icon"
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={{ 
            background: alert && Number(value) > 0 
              ? 'rgba(220, 38, 38, 0.15)' 
              : iconBg,
            boxShadow: `0 0 15px ${iconColor}20`
          }}
        >
          <motion.span
            animate={{
              rotate: alert ? [0, 10, -10, 0] : [0, 5, -5, 0],
              scale: alert ? [1, 1.1, 0.9, 1] : [1, 1.05, 0.95, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut"
            }}
            style={{ color: alert && Number(value) > 0 ? '#dc2626' : iconColor }}
          >
            {icon}
          </motion.span>
        </motion.div>
        
      </div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="stat-card-label">{label}</div>
        <motion.div
          className="stat-card-value"
          style={{ 
            color: alert && Number(value) > 0 ? 'var(--red)' : undefined,
            fontSize: isMoney ? '26px' : '24px'
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.2 }}
        >
          {isMoney && isNumeric
            ? `₹${Math.round(Number(currentValue)).toLocaleString('en-IN')}`
            : currentValue
          }
        </motion.div>
        {sub && (
          <motion.div 
            className="stat-card-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {sub}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
