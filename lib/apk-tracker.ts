// lib/apk-tracker.ts
// Client-side analytics SDK for tracking APK downloads, installs, and active mobile sessions.

export function isInsideApk(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check Capacitor native runtime
  const cap = (window as any).Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return true;
  }

  // 2. Check Android WebView user agent signatures
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua) && (/wv/i.test(ua) || /Version\/[0-9.]+/i.test(ua))) {
    return true;
  }

  // 3. Check custom injected bridge or query param
  if (window.location.search.includes('source=apk') || window.location.search.includes('platform=android')) {
    return true;
  }

  return false;
}

export function trackApkDownload(appType: 'customer' | 'admin' = 'customer') {
  if (typeof window === 'undefined') return;

  try {
    // 1. Report to our internal server analytics
    fetch('/api/analytics/apk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'download',
        payload: { appType },
      }),
      keepalive: true,
    }).catch(() => {});

    // 2. Also log to Google Analytics 4 if present
    const gtag = (window as any).gtag;
    if (typeof gtag === 'function') {
      gtag('event', 'apk_download', {
        app_type: appType,
        file_name: appType === 'admin' ? 'Shree-Beauty-Admin.apk' : 'Shree-Beauty-Studio.apk',
      });
    }
  } catch (err) {
    console.warn('[trackApkDownload] failed:', err);
  }
}

export function initApkSessionTracker(appType: 'customer' | 'admin' = 'customer') {
  if (typeof window === 'undefined') return;

  const isNative = isInsideApk();
  if (!isNative) return;

  try {
    const INSTALLATION_KEY = 'shree_apk_installation_id';
    const LAST_SESSION_KEY = 'shree_apk_last_session_time';

    let installationId = localStorage.getItem(INSTALLATION_KEY);
    const isNewInstall = !installationId;

    if (!installationId) {
      installationId = 'inst_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(INSTALLATION_KEY, installationId);
    }

    const now = Date.now();
    const lastSession = Number(localStorage.getItem(LAST_SESSION_KEY) || 0);
    const THIRTY_MINUTES = 30 * 60 * 1000;

    const screenRes = `${window.screen.width}x${window.screen.height}`;

    if (isNewInstall) {
      // First Open / Install event
      fetch('/api/analytics/apk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'install',
          payload: {
            installationId,
            appType,
            screenResolution: screenRes,
          },
        }),
      }).catch(() => {});
      localStorage.setItem(LAST_SESSION_KEY, now.toString());
    } else if (now - lastSession > THIRTY_MINUTES) {
      // New distinct session
      fetch('/api/analytics/apk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'open',
          payload: {
            installationId,
            appType,
            screenResolution: screenRes,
          },
        }),
      }).catch(() => {});
      localStorage.setItem(LAST_SESSION_KEY, now.toString());
    }

    // Report to Google Analytics as Native App Session
    const gtag = (window as any).gtag;
    if (typeof gtag === 'function') {
      gtag('event', 'app_session_start', {
        app_type: appType,
        installation_id: installationId,
        is_first_open: isNewInstall,
      });
    }
  } catch (err) {
    console.warn('[initApkSessionTracker] error:', err);
  }
}

export function trackApkBooking(customerName: string, service: string, amount: number) {
  if (typeof window === 'undefined') return;
  if (!isInsideApk()) return;

  try {
    const installationId = localStorage.getItem('shree_apk_installation_id') || '';
    fetch('/api/analytics/apk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booking',
        payload: {
          installationId,
          customerName,
          service,
          amount,
        },
      }),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {
    // Suppress
  }
}
