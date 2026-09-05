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

  return {
    ...cloud,
    ...local,
    settings: { ...(cloud.settings || {}), ...(local.settings || {}) },
    inventory: Array.from(invMap.values()),
    customers: (local.customers || []).length >= (cloud.customers || []).length ? local.customers : cloud.customers,
    appointments: (local.appointments || []).length >= (cloud.appointments || []).length ? local.appointments : cloud.appointments,
    invoices: (local.invoices || []).length >= (cloud.invoices || []).length ? local.invoices : cloud.invoices,
    bridal: (local.bridal || []).length >= (cloud.bridal || []).length ? local.bridal : cloud.bridal,
  };
}

export async function cloudSave(): Promise<void> {
  const store = useSalonStore.getState();
  store.setCloudStatus('syncing');
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      store.setCloudStatus('idle');
      return;
    }
    const localData = store.data;
    const stamp = new Date().toISOString();
    const { error } = await supabase.from('salon_state').upsert(
      { owner_id: user.id, data: localData, updated_at: stamp },
      { onConflict: 'owner_id' }
    );
    if (error) throw error;
    store.setCloudStatus('saved');
    store.setLastSynced(stamp);
  } catch {
    store.setCloudStatus('error');
  }
}

export async function cloudLoad(): Promise<void> {
  const store = useSalonStore.getState();
  store.setCloudStatus('syncing');
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      store.setCloudStatus('idle');
      return;
    }
    const { data: row, error } = await supabase
      .from('salon_state')
      .select('data, updated_at')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (row?.data) {
      const merged = mergeSalonData(row.data as SalonData, store.data);
      store.setData(merged);
      store.setLastSynced(row.updated_at);
    }
    store.setCloudStatus('saved');
  } catch {
    store.setCloudStatus('error');
  }
}

export async function cloudSync(): Promise<void> {
  const store = useSalonStore.getState();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      store.setCloudStatus('idle');
      return;
    }
    store.setCloudStatus('syncing');
    const { data: row } = await supabase
      .from('salon_state')
      .select('data, updated_at')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (row?.data) {
      const merged = mergeSalonData(row.data as SalonData, store.data);
      store.setData(merged);
      store.setLastSynced(row.updated_at);
      store.setCloudStatus('saved');
    } else {
      await cloudSave();
    }
  } catch {
    store.setCloudStatus('error');
  }
}
