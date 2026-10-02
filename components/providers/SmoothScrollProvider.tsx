'use client';

import React, { useEffect } from 'react';

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  useEffect(() => {
    // Respect user's motion preferences
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let lenisInstance: any = null;
    let rafId: number;

    // Dynamically load Lenis exclusively on the client
    import('lenis')
      .then(({ default: Lenis }) => {
        const lenis = new Lenis({
          duration: 1.15,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 0.95,
          touchMultiplier: 1.5,
          syncTouch: false,
          infinite: false,
        });

        lenisInstance = lenis;
        (window as any).__lenis = lenis;

        function raf(time: number) {
          lenis.raf(time);
          rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);
      })
      .catch((err) => {
        console.warn('Lenis smooth scroll load error:', err);
      });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (lenisInstance) {
        lenisInstance.destroy();
        delete (window as any).__lenis;
      }
    };
  }, []);

  return <>{children}</>;
}
