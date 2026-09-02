'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { uid } from '@/lib/utils';
import { fadeSlideUp } from '@/variants';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = uid();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 size={16} />,
    error: <XCircle size={16} />,
    info: <Info size={16} />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container no-print">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.type}`}
              variants={fadeSlideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              {icons[t.type]}
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.7,
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
