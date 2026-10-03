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

    // Disable custom smooth scroll engine on mobile/touch devices (iPhone, iPad, Android).
    // iOS Safari has native 120Hz ProMotion momentum scrolling. Running a JS RAF loop on touch
    // devices causes a conflict with iOS address bar collapse/expand, making the page bounce
    // up and down in an endless oscillation loop.
    const isTouchDevice =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0)) ||
      window.matchMedia('(pointer: coarse)').matches ||
      /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isTouchDevice) {
      return;
    }

    let lenisInstance: any = null;
    let rafId: number;

    // Dynamically load Lenis exclusively on desktop pointer devices
    import('lenis')
      .then(({ default: Lenis }) => {
        const lenis = new Lenis({
          duration: 1.15,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 0.95,
          touchMultiplier: 0,
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
