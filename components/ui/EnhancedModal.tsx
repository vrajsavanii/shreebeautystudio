'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface EnhancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  overlayClassName?: string;
}

export default function EnhancedModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  overlayClassName = '',
}: EnhancedModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
  };

  return (
    <>
      {/* Animated Overlay */}
      <motion.div
        className={`modal-backdrop ${overlayClassName}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      >
        {/* Modal Panel */}
        <motion.div
          className={`modal-panel ${sizeClasses[size]} ${className}`}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ 
            type: 'spring',
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1] 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="modal-header">
              <h3 className="modal-title">
                {title}
              </h3>
              <motion.button
                onClick={onClose}
                className="modal-close"
                whileHover={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </div>
          )}

          {/* Body */}
          <div className="modal-body">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="modal-footer">
              {footer}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
