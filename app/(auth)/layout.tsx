import { CustomerAuthProvider } from '@/lib/customer-context';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>;
}
