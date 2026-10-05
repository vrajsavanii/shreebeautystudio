import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans, Inter } from 'next/font/google';
import SmoothScrollProvider from '@/components/providers/SmoothScrollProvider';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import './globals.css';

// Self-hosted Google Fonts via Next.js with zero external network requests
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: true,
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
  preload: true,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

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
    <html
      lang="en"
      className={`${jakarta.variable} ${cormorant.variable} ${inter.variable}`}
    >
      <head>
        {/* Resource Hints for High Speed & Low-Network Performance */}
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />

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
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      // Check for service worker updates in background
                      reg.onupdatefound = function() {
                        var installingWorker = reg.installing;
                        if (installingWorker) {
                          installingWorker.onstatechange = function() {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New content is available; will activate seamlessly
                            }
                          };
                        }
                      };
                    })
                    .catch(function() {});
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

