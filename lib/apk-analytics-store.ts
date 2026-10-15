// lib/apk-analytics-store.ts
// Robust persistence store for APK downloads, installs, and in-app sessions.
// Combines in-memory cache, filesystem persistence, and Supabase cloud sync.

import fs from 'fs';
import path from 'path';

export interface ApkDownloadEvent {
  id: string;
  appType: 'customer' | 'admin';
  timestamp: string;
  ip: string;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  deviceModel?: string;
  city?: string;
  referrer?: string;
}

export interface ApkSessionEvent {
  id: string;
  installationId: string;
  appType: 'customer' | 'admin';
  event: 'install' | 'open' | 'heartbeat';
  timestamp: string;
  deviceModel?: string;
  osVersion?: string;
  screenResolution?: string;
  ip?: string;
}

export interface ApkBookingEvent {
  id: string;
  installationId?: string;
  customerName?: string;
  service?: string;
  amount?: number;
  timestamp: string;
}

export interface ApkAnalyticsData {
  downloads: ApkDownloadEvent[];
  sessions: ApkSessionEvent[];
  bookings: ApkBookingEvent[];
  lastUpdated: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';

// Default initial state with seed/historical baseline
const INITIAL_DATA: ApkAnalyticsData = {
  downloads: [],
  sessions: [],
  bookings: [],
  lastUpdated: new Date().toISOString(),
};

class ApkAnalyticsStore {
  private data: ApkAnalyticsData = { ...INITIAL_DATA };
  private filePath: string = '';
  private initialized: boolean = false;
  private syncTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.resolvePath();
    this.loadFromDisk();
  }

  private resolvePath() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch {
          // Fallback to /tmp on serverless
        }
      }
      this.filePath = fs.existsSync(dataDir)
        ? path.join(dataDir, 'apk-analytics.json')
        : path.join('/tmp', 'apk-analytics.json');
    } catch {
      this.filePath = path.join('/tmp', 'apk-analytics.json');
    }
  }

  private loadFromDisk() {
    if (this.initialized) return;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.downloads)) {
          this.data = parsed;
        }
      }
    } catch (err) {
      console.warn('[ApkAnalyticsStore] Failed to read disk file, using memory cache:', err);
    }
    this.initialized = true;
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      // Ignored on read-only environments
    }
  }

  // Sync to Supabase in the background
  private triggerCloudSync() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(async () => {
      try {
        // Fetch current cloud state to merge
        const getRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?select=id,data&limit=1`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
            'Content-Type': 'application/json',
          },
        });
        if (!getRes.ok) return;

        const rows = await getRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const rowId = rows[0].id;
          const currentCloudData = rows[0].data || {};

          // Merge downloads & sessions by id
          const existingDownloads: ApkDownloadEvent[] = currentCloudData.apkAnalytics?.downloads || [];
          const existingSessions: ApkSessionEvent[] = currentCloudData.apkAnalytics?.sessions || [];
          const existingBookings: ApkBookingEvent[] = currentCloudData.apkAnalytics?.bookings || [];

          const mergedDownloadsMap = new Map<string, ApkDownloadEvent>();
          existingDownloads.forEach((d) => mergedDownloadsMap.set(d.id, d));
          this.data.downloads.forEach((d) => mergedDownloadsMap.set(d.id, d));

          const mergedSessionsMap = new Map<string, ApkSessionEvent>();
          existingSessions.forEach((s) => mergedSessionsMap.set(s.id, s));
          this.data.sessions.forEach((s) => mergedSessionsMap.set(s.id, s));

          const mergedBookingsMap = new Map<string, ApkBookingEvent>();
          existingBookings.forEach((b) => mergedBookingsMap.set(b.id, b));
          this.data.bookings.forEach((b) => mergedBookingsMap.set(b.id, b));

          const updatedApkAnalytics = {
            downloads: Array.from(mergedDownloadsMap.values()).slice(-2000), // Keep last 2,000 records
            sessions: Array.from(mergedSessionsMap.values()).slice(-5000),
            bookings: Array.from(mergedBookingsMap.values()).slice(-1000),
            lastUpdated: new Date().toISOString(),
          };

          this.data = updatedApkAnalytics;
          this.saveToDisk();

          // Patch back to Supabase
          await fetch(`${SUPABASE_URL}/rest/v1/salon_state?id=eq.${rowId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              apikey: SERVICE_KEY,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              data: {
                ...currentCloudData,
                apkAnalytics: updatedApkAnalytics,
              },
              updated_at: new Date().toISOString(),
            }),
          });
        }
      } catch (err) {
        console.warn('[ApkAnalyticsStore] Cloud sync failed:', err);
      }
    }, 2000);
  }

  public async pullFromCloud(): Promise<void> {
    try {
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?select=data&limit=1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      if (getRes.ok) {
        const rows = await getRes.json();
        if (Array.isArray(rows) && rows[0]?.data?.apkAnalytics) {
          const cloudAnalytics = rows[0].data.apkAnalytics;
          // Merge with memory
          const downloadsMap = new Map<string, ApkDownloadEvent>();
          (cloudAnalytics.downloads || []).forEach((d: ApkDownloadEvent) => downloadsMap.set(d.id, d));
          this.data.downloads.forEach((d) => downloadsMap.set(d.id, d));

          const sessionsMap = new Map<string, ApkSessionEvent>();
          (cloudAnalytics.sessions || []).forEach((s: ApkSessionEvent) => sessionsMap.set(s.id, s));
          this.data.sessions.forEach((s) => sessionsMap.set(s.id, s));

          const bookingsMap = new Map<string, ApkBookingEvent>();
          (cloudAnalytics.bookings || []).forEach((b: ApkBookingEvent) => bookingsMap.set(b.id, b));
          this.data.bookings.forEach((b) => bookingsMap.set(b.id, b));

          this.data = {
            downloads: Array.from(downloadsMap.values()).slice(-2000),
            sessions: Array.from(sessionsMap.values()).slice(-5000),
            bookings: Array.from(bookingsMap.values()).slice(-1000),
            lastUpdated: new Date().toISOString(),
          };
          this.saveToDisk();
        }
      }
    } catch (e) {
      console.warn('[ApkAnalyticsStore] pullFromCloud error:', e);
    }
  }

  public recordDownload(download: Omit<ApkDownloadEvent, 'id' | 'timestamp'>): ApkDownloadEvent {
    const entry: ApkDownloadEvent = {
      ...download,
      id: 'apk_dl_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
    };
    this.data.downloads.unshift(entry);
    if (this.data.downloads.length > 2000) this.data.downloads.pop();
    this.saveToDisk();
    this.triggerCloudSync();
    return entry;
  }

  public recordSession(session: Omit<ApkSessionEvent, 'id' | 'timestamp'>): ApkSessionEvent {
    const entry: ApkSessionEvent = {
      ...session,
      id: 'apk_sess_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
    };
    this.data.sessions.unshift(entry);
    if (this.data.sessions.length > 5000) this.data.sessions.pop();
    this.saveToDisk();
    this.triggerCloudSync();
    return entry;
  }

  public recordBooking(booking: Omit<ApkBookingEvent, 'id' | 'timestamp'>): ApkBookingEvent {
    const entry: ApkBookingEvent = {
      ...booking,
      id: 'apk_bk_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
    };
    this.data.bookings.unshift(entry);
    if (this.data.bookings.length > 1000) this.data.bookings.pop();
    this.saveToDisk();
    this.triggerCloudSync();
    return entry;
  }

  public getRawData(): ApkAnalyticsData {
    return this.data;
  }

  public getSummary() {
    const now = new Date();
    const nowMs = now.getTime();
    const oneDayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();

    const downloads = this.data.downloads;
    const sessions = this.data.sessions;
    const bookings = this.data.bookings;

    const totalCustomerDownloads = downloads.filter((d) => d.appType === 'customer').length;
    const totalAdminDownloads = downloads.filter((d) => d.appType === 'admin').length;
    const totalDownloads = downloads.length;

    const downloads24h = downloads.filter((d) => d.timestamp >= oneDayAgo).length;
    const downloads7d = downloads.filter((d) => d.timestamp >= sevenDaysAgo).length;

    // Unique installs & active users
    const uniqueInstalls = new Set(
      sessions.filter((s) => s.event === 'install').map((s) => s.installationId)
    );
    const allUniqueUsers = new Set(sessions.map((s) => s.installationId));

    const activeUsersToday = new Set(
      sessions.filter((s) => s.timestamp >= oneDayAgo).map((s) => s.installationId)
    ).size;

    const activeUsersWeek = new Set(
      sessions.filter((s) => s.timestamp >= sevenDaysAgo).map((s) => s.installationId)
    ).size;

    const activeUsersMonth = new Set(
      sessions.filter((s) => s.timestamp >= thirtyDaysAgo).map((s) => s.installationId)
    ).size;

    // Daily trends (last 14 days)
    const dailyMap = new Map<
      string,
      { date: string; customerDownloads: number; adminDownloads: number; appOpens: number }
    >();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(nowMs - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        customerDownloads: 0,
        adminDownloads: 0,
        appOpens: 0,
      });
    }

    downloads.forEach((d) => {
      const dateStr = d.timestamp.split('T')[0];
      if (dailyMap.has(dateStr)) {
        const entry = dailyMap.get(dateStr)!;
        if (d.appType === 'customer') entry.customerDownloads++;
        else entry.adminDownloads++;
      }
    });

    sessions.forEach((s) => {
      const dateStr = s.timestamp.split('T')[0];
      if (dailyMap.has(dateStr)) {
        const entry = dailyMap.get(dateStr)!;
        entry.appOpens++;
      }
    });

    // Device models & OS distribution
    const deviceCounts = new Map<string, number>();
    const osCounts = new Map<string, number>();

    sessions.forEach((s) => {
      const model = s.deviceModel || 'Android Device';
      deviceCounts.set(model, (deviceCounts.get(model) || 0) + 1);

      const os = s.osVersion || 'Android';
      osCounts.set(os, (osCounts.get(os) || 0) + 1);
    });

    const topDevices = Array.from(deviceCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topOS = Array.from(osCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // In-app booking revenue
    const totalAppBookings = bookings.length;
    const totalAppRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

    return {
      totalDownloads,
      totalCustomerDownloads,
      totalAdminDownloads,
      downloads24h,
      downloads7d,
      totalInstalls: Math.max(uniqueInstalls.size, allUniqueUsers.size),
      totalSessions: sessions.length,
      activeUsersToday,
      activeUsersWeek,
      activeUsersMonth,
      totalAppBookings,
      totalAppRevenue,
      dailyTrends: Array.from(dailyMap.values()),
      topDevices,
      topOS,
      recentDownloads: downloads.slice(0, 25),
      recentSessions: sessions.slice(0, 25),
      lastUpdated: this.data.lastUpdated,
    };
  }
}

// Global singleton instance
export const apkAnalyticsStore = new ApkAnalyticsStore();
