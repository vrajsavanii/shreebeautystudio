import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shree Beauty Studio — Management System',
  description:
    'Cloud-first salon management platform for Shree Beauty Studio, Surat. Book appointments, manage billing, inventory, bridal bookings and more.',
  keywords: ['salon', 'beauty studio', 'parlour management', 'Shree Beauty Studio', 'Surat'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#05424A" />
      </head>
      <body>{children}</body>
    </html>
  );
}
