'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { uid } from '@/lib/utils';
import { fadeSlideUp, slideFromRight } from '@/variants';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  toastPromise: <T>(
    promise: Promise<T>,
    options?: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: unknown) => string);
      duration?: number;
    }
  ) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue>({ 
  toast: () => {}, 
  toastPromise: async (p) => p 
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success', duration: number = 3000) => {
    const id = uid();
    setToasts((p) => [...p, { id, message, type, duration }]);
    
    const remove = () => setToasts((p) => p.filter((t) => t.id !== id));
    
    setTimeout(remove, duration);
    return remove;
  }, []);

  const toastPromise = useCallback(async <T,>(
    promise: Promise<T>,
    options: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: unknown) => string);
      duration?: number;
    } = {}
  ): Promise<T> => {
    const { loading, success, error, duration = 3000 } = options;
    
    if (loading) toast(loading, 'info', duration);
    
    try {
      const data = await promise;
      const successMsg = typeof success === 'function' ? success(data) : (success || 'Operation successful');
      toast(successMsg, 'success', duration);
      return data;
    } catch (err) {
      const errorMsg = typeof error === 'function' ? error(err) : (error || 'Operation failed');
      toast(errorMsg, 'error', duration);
      throw err;
    }
  }, [toast]);

  const remove = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} />;
      case 'error': return <XCircle size={18} />;
      case 'warning': return <Info size={18} />;
      case 'info': return <Info size={18} />;
    }
  };

  const getToastColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'var(--green)';
      case 'error': return 'var(--red)';
      case 'warning': return 'var(--gold)';
      case 'info': return 'var(--blue)';
    }
  };

  return (
    <ToastContext.Provider value={{ toast, toastPromise }}>
      {children}
      <div className="toast-container no-print">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.type}`}
              variants={slideFromRight}
              initial="hidden"
              animate="visible"
              exit={{
                opacity: 0,
                x: 50,
                transition: { duration: 0.2 }
              }}
              layout
              style={{
                borderLeftColor: getToastColor(t.type)
              }}
              onClick={() => remove(t.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 50,
                  background: `${getToastColor(t.type)}20`,
                  color: getToastColor(t.type)
                }}>
                  {getIcon(t.type)}
                </div>
                <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{t.message}</span>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  whileTap={{ scale: 0.8 }}
                >
                  <X size={14} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
