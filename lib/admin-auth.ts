// lib/admin-auth.ts

export const DEFAULT_ADMIN_USERS = ['admin@shreebeauty.com', 'shree@admin.com', 'admin', 'owner'];
export const DEFAULT_ADMIN_PASSWORDS = ['shreeadmin2026', 'shree1234', 'admin1234'];

const STORAGE_KEY = 'shree_admin_session_auth';
const COOKIE_NAME = 'shree_admin_token';
const ROLE_COOKIE_NAME = 'shree_admin_role';

export interface AdminAuthSession {
  authenticated: boolean;
  username: string;
  role: 'Admin' | 'Salesperson';
  loginTime: number;
}

export function verifyAdminCredentials(
  user: string,
  pass: string,
  configuredPassword?: string
): { valid: boolean; role: 'Admin' | 'Salesperson' } {
  const normalizedUser = user.trim().toLowerCase();
  const trimmedPass = pass.trim();

  // Check Salesperson
  if (normalizedUser.includes('sales') || normalizedUser === 'sales@shree.com') {
    if (trimmedPass === 'sales1234' || trimmedPass === 'sales') {
      return { valid: true, role: 'Salesperson' };
    }
  }

  // Check Admin
  const isUserValid = DEFAULT_ADMIN_USERS.some((u) => normalizedUser.includes(u));
  if (isUserValid) {
    if (configuredPassword && configuredPassword.trim() && trimmedPass === configuredPassword.trim()) {
      return { valid: true, role: 'Admin' };
    }
    if (DEFAULT_ADMIN_PASSWORDS.includes(trimmedPass)) {
      return { valid: true, role: 'Admin' };
    }
  }

  // Allow standard fallback
  if (trimmedPass === 'shree1234' || trimmedPass === 'shreeadmin2026') {
    return { valid: true, role: 'Admin' };
  }

  return { valid: false, role: 'Admin' };
}

export function getAdminSession(): AdminAuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: AdminAuthSession = JSON.parse(raw);
    if (session && session.authenticated) {
      return session;
    }
  } catch {
    clearAdminSession();
  }
  return null;
}

export function setAdminSession(username: string, role: 'Admin' | 'Salesperson' = 'Admin'): void {
  if (typeof window === 'undefined') return;

  const session: AdminAuthSession = {
    authenticated: true,
    username: username.trim(),
    role,
    loginTime: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(username)}; path=/; max-age=2592000; SameSite=Strict`;
    document.cookie = `${ROLE_COOKIE_NAME}=${encodeURIComponent(role)}; path=/; max-age=2592000; SameSite=Strict`;
  } catch {
    // Storage blocked fallback
  }
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
    document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
  } catch {
    // Fallback
  }
}
