import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REDIRECT_MAP: Record<string, string> = {
  '/billing': '/admin/billing',
  '/expenses': '/admin/expenses',
  '/appointments': '/admin/appointments',
  '/inventory': '/admin/inventory',
  '/purchases': '/admin/purchases',
  '/suppliers': '/admin/suppliers',
  '/staff': '/admin/staff',
  '/reports': '/admin/reports',
  '/whatsapp': '/admin/whatsapp',
  '/reminders': '/admin/reminders',
  '/settings': '/admin/settings',
};

const SALESPERSON_ALLOWED_ROUTES = [
  '/admin/billing',
  '/admin/appointments',
  '/admin/bridal',
  '/admin/purchases',
  '/admin/inventory',
  '/admin/customers',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check legacy admin redirects
  if (REDIRECT_MAP[pathname]) {
    const url = request.nextUrl.clone();
    url.pathname = REDIRECT_MAP[pathname];
    return NextResponse.redirect(url);
  }

  const adminToken = request.cookies.get('shree_admin_token')?.value;
  const adminRole = request.cookies.get('shree_admin_role')?.value;
  const customerToken = request.cookies.get('shree_customer_token')?.value;

  // 2. Admin Route Authentication & Role Guard
  if (pathname.startsWith('/admin')) {
    if (!adminToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('staff', 'true');
      return NextResponse.redirect(loginUrl);
    }

    // Role guard for Salesperson
    if (adminRole === 'Salesperson') {
      const isAllowed = SALESPERSON_ALLOWED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
      );
      if (!isAllowed) {
        const fallbackUrl = request.nextUrl.clone();
        fallbackUrl.pathname = '/admin/billing';
        return NextResponse.redirect(fallbackUrl);
      }
    }
  }

  // 3. Customer Route Authentication Guard
  if (pathname === '/account') {
    const profileUrl = request.nextUrl.clone();
    profileUrl.pathname = '/profile';
    return NextResponse.redirect(profileUrl);
  }

  if (pathname === '/profile' || pathname.startsWith('/profile/')) {
    if (!customerToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Smart redirect from /login for Staff if authenticated
  if (pathname === '/login') {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const isStaffQuery = request.nextUrl.searchParams.get('staff') === 'true';

    if (adminToken && (isStaffQuery || redirectParam?.startsWith('/admin'))) {
      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = adminRole === 'Salesperson' ? '/admin/billing' : '/admin';
      return NextResponse.redirect(targetUrl);
    }
  }

  // 5. Set security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (.png, .jpg, .pdf, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
};
