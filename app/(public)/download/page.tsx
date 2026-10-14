import type { Metadata } from 'next';
import DownloadClient from './DownloadClient';

export const metadata: Metadata = {
  title: 'Download Shree Beauty Studio App | Android APK & iOS (Coming Soon)',
  description:
    'Download the official Shree Beauty Studio mobile app for Android (v1.2 APK). Fast appointment booking, bridal consultations, and real-time reminders. iOS App Store coming soon.',
  keywords: [
    'shree beauty studio app',
    'shree beauty parlour apk download',
    'surat salon app download',
    'beauty parlour android app',
    'ladies salon booking app surat',
    'bridal makeup app surat',
  ],
  alternates: {
    canonical: '/download',
  },
  openGraph: {
    title: 'Download Shree Beauty Studio App | Android APK & iOS (Coming Soon)',
    description:
      'Download the official Shree Beauty Studio mobile app for Android (v1.2 APK). Fast appointment booking and salon services in Katargam, Surat.',
    url: 'https://shreebeauty.studio/download',
    siteName: 'Shree Beauty Studio & Parlour',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function DownloadPage() {
  return <DownloadClient />;
}
