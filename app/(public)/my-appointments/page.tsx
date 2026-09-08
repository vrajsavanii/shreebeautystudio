import type { Metadata } from 'next';
import MyAppointmentsClient from './MyAppointmentsClient';

export const metadata: Metadata = {
  title: 'Track My Appointments — Shree Beauty Studio',
  description: 'Lookup and manage your salon appointments at Shree Beauty Studio, Surat.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyAppointmentsPage() {
  return <MyAppointmentsClient />;
}
