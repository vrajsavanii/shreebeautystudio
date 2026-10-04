'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

// Support both measurement IDs to guarantee data flows to whichever property is active
export const GA_MEASUREMENT_IDS = ['G-157MFZDCT3', 'G-SY02ZF4TB3'];

function AnalyticsPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const gtag = (window as any).gtag;
    if (typeof gtag !== 'function') return;

    const search = searchParams?.toString();
    const url = pathname + (search ? `?${search}` : '');

    GA_MEASUREMENT_IDS.forEach((id) => {
      gtag('config', id, {
        page_path: url,
        page_title: document.title,
      });
    });
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_IDS[0]}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_IDS[0]}', {
            page_path: window.location.pathname,
            send_page_view: true,
          });
          gtag('config', '${GA_MEASUREMENT_IDS[1]}', {
            page_path: window.location.pathname,
            send_page_view: true,
          });
        `}
      </Script>
      <Suspense fallback={null}>
        <AnalyticsPageViewTracker />
      </Suspense>
    </>
  );
}
