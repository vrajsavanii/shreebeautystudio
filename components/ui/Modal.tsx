'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { fadeIn, scaleIn } from '@/variants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, footer, wide }: ModalProps) {
  const firstInputRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const panel = document.querySelector('.modal-body');
        const el = panel?.querySelector<HTMLElement>(
          'input, select, textarea, [autofocus]'
        );
        if (el) el.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop no-print"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className={`modal-panel ${wide ? 'wide' : ''}`}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="modal-header">
              <h2 className="modal-title">{title}</h2>
              <button className="modal-close" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
