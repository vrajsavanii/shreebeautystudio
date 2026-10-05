import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import SmoothScrollProvider from '@/components/providers/SmoothScrollProvider';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://shreebeauty.studio'),
  title: {
    default: 'Shree Beauty Parlour & Studio — Official Website | Best Ladies Salon & Bridal Studio',
    template: '%s | Shree Beauty Studio',
  },
  description:
    'Surat’s premier ladies-only beauty salon and bridal makeover studio in Katargam. 25+ years excellence in HD bridal makeup, hair Botox, nanoplastia, and luxury facials.',
  keywords: [
    'shree beauty parlour',
    'shree beauty parlour surat',
    'shree beauty studio',
    'beauty salon Surat',
    'ladies salon Katargam Surat',
    'bridal makeup artist Surat',
    'best beauty parlour Surat',
    'hair Botox Surat',
    'keratin treatment Surat',
    'hydra facial Surat',
  ],
  alternates: {
    canonical: 'https://shreebeauty.studio',
    types: {
      'application/rss+xml': [
        {
          url: 'https://shreebeauty.studio/rss.xml',
          title: 'Shree Beauty Studio & Bridal Journal RSS Feed',
        },
      ],
    },
  },
  verification: {
    google: '2EZxH2Nusun00VMqlKGAB6OJv238XGDL5dqSgtrh_hs',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#05424A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Font preconnects — must come before the stylesheet link */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load ALL fonts in a single non-blocking request (display=swap) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#05424A" />
        <meta name="google-site-verification" content="2EZxH2Nusun00VMqlKGAB6OJv238XGDL5dqSgtrh_hs" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Shree Beauty" />
        <meta name="application-name" content="Shree Beauty" />
        <meta name="format-detection" content="telephone=no" />
        {/* Google Search & Browser Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <SmoothScrollProvider>
          {children}
        </SmoothScrollProvider>

        <GoogleAnalytics />
      </body>
    </html>
  );
}
