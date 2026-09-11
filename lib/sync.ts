// lib/sync.ts
import { supabase } from './supabase';
import { useSalonStore, DEFAULT_DATA } from './store';
import { SalonData, InventoryItem } from '@/types/salon';

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSave() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => cloudSave(), 400);
}

/**
 * Smart Non-Destructive Data Merger
 * Ensures local items created while offline or un-synced are never wiped out by older cloud snapshots.
 */
export function mergeSalonData(cloud: SalonData, local: SalonData): SalonData {
  const invMap = new Map<string, InventoryItem>();
  
  // 0. Include all 56 default product catalog items first
  (DEFAULT_DATA.inventory || []).forEach((i) => {
    const key = (i.barcode || i.name || i.id).toLowerCase().trim();
    if (key) invMap.set(key, i);
  });

  // 1. Add all cloud items (override defaults with saved cloud state)
  (cloud.inventory || []).forEach((i) => {
    const key = (i.barcode || i.name || i.id).toLowerCase().trim();
    if (key) {
      const existing = invMap.get(key);
      invMap.set(key, { ...(existing || {}), ...i });
    }
  });

  // 2. Add local items (override with local modifications)
  (local.inventory || []).forEach((i) => {
    const key = (i.barcode || i.name || i.id).toLowerCase().trim();
    if (key) {
      const existing = invMap.get(key);
      invMap.set(key, { ...(existing || {}), ...i });
    }
  });

  // Helper to merge arrays by item ID (local changes take priority, keeping both cloud and local unique items)
  const mergeById = <T extends { id?: string }>(cloudArr: T[] = [], localArr: T[] = []): T[] => {
    const map = new Map<string, T>();
    (cloudArr || []).forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    (localArr || []).forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  };

  return {
    ...cloud,
    ...local,
    settings: { ...(cloud.settings || {}), ...(local.settings || {}) },
    inventory: Array.from(invMap.values()),
    customers: mergeById(cloud.customers, local.customers),
    appointments: mergeById(cloud.appointments, local.appointments),
    invoices: mergeById(cloud.invoices, local.invoices),
    bridal: mergeById(cloud.bridal, local.bridal),
    expenses: mergeById(cloud.expenses, local.expenses),
    purchases: mergeById(cloud.purchases, local.purchases),
    vouchers: mergeById(cloud.vouchers, local.vouchers),
    suppliers: mergeById(cloud.suppliers, local.suppliers),
    bankAccounts: mergeById(cloud.bankAccounts, local.bankAccounts),
    accountTransfers: mergeById(cloud.accountTransfers, local.accountTransfers),
    staff: (local.staff || []).length > 0 ? local.staff : cloud.staff || [],
    services: (local.services || []).length > 0 ? local.services : cloud.services || [],
    bridalPackages: (local.bridalPackages || []).length > 0 ? local.bridalPackages : cloud.bridalPackages || [],
    membershipPlans: (local.membershipPlans || []).length > 0 ? local.membershipPlans : cloud.membershipPlans || [],
    users: (local.users || []).length > 0 ? local.users : cloud.users || [],
  };
}

export async function cloudSave(): Promise<void> {
  const store = useSalonStore.getState();
  store.setCloudStatus('syncing');
  try {
    const localData = store.data;
    const res = await fetch('/api/cloud/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: localData }),
    });
    if (!res.ok) throw new Error('Cloud save failed');
    const json = await res.json();
    if (json.success) {
      store.setCloudStatus('saved');
      if (json.updated_at) store.setLastSynced(json.updated_at);
    } else {
      store.setCloudStatus('error');
    }
  } catch (e) {
    console.warn('[Sync] cloudSave failed:', e);
    store.setCloudStatus('error');
  }
}

export async function cloudLoad(): Promise<void> {
  const store = useSalonStore.getState();
  store.setCloudStatus('syncing');
  try {
    const res = await fetch('/api/cloud/sync', { cache: 'no-store' });
    if (!res.ok) throw new Error('Cloud sync fetch failed');
    const json = await res.json();
    if (json.success && json.data) {
      // Adopt cloud state directly so additions, updates, and deletions stay 100% in sync
      store.setData(json.data as SalonData);
      if (json.updated_at) store.setLastSynced(json.updated_at);
      store.setCloudStatus('saved');
    } else {
      store.setCloudStatus('idle');
    }
  } catch (e) {
    console.warn('[Sync] cloudLoad failed:', e);
    store.setCloudStatus('error');
  }
}

export async function cloudSync(): Promise<void> {
  await cloudLoad();
}

export async function forceCloudReset(cleanData: SalonData): Promise<void> {
  const store = useSalonStore.getState();
  store.setCloudStatus('syncing');
  try {
    const res = await fetch('/api/cloud/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: cleanData }),
    });
    if (!res.ok) throw new Error('Cloud reset failed');
    const json = await res.json();
    if (json.success) {
      store.setData(cleanData);
      store.setCloudStatus('saved');
      if (json.updated_at) store.setLastSynced(json.updated_at);
    } else {
      store.setCloudStatus('error');
    }
  } catch (e) {
    console.warn('[Sync] forceCloudReset failed:', e);
    store.setCloudStatus('error');
  }
}

