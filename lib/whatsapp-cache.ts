// lib/whatsapp-cache.ts
// Robust IndexedDB caching for WhatsApp chats & messages for instant load

const DB_NAME = 'ShreeWhatsAppDB';
const DB_VERSION = 1;
const STORE_CHATS = 'chats';
const STORE_MESSAGES = 'messages';

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_CHATS)) {
          db.createObjectStore(STORE_CHATS, { keyPath: 'jid' });
        }
        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          db.createObjectStore(STORE_MESSAGES, { keyPath: 'jid' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getCachedChats(): Promise<any[]> {
  try {
    const db = await openDB();
    if (!db) {
      const raw = localStorage.getItem('shree_wa_chats_cache');
      return raw ? JSON.parse(raw) : [];
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHATS, 'readonly');
      const store = tx.objectStore(STORE_CHATS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        resolve(list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveCachedChats(chats: any[]): Promise<void> {
  if (!Array.isArray(chats)) return;
  try {
    const db = await openDB();
    if (!db) {
      localStorage.setItem('shree_wa_chats_cache', JSON.stringify(chats.slice(0, 50)));
      return;
    }
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    chats.forEach((c) => {
      if (c && c.jid) store.put(c);
    });
  } catch {}
}

export async function getCachedMessages(jid: string): Promise<any[]> {
  if (!jid) return [];
  try {
    const db = await openDB();
    if (!db) {
      const raw = localStorage.getItem(`shree_wa_msg_${jid}`);
      return raw ? JSON.parse(raw) : [];
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MESSAGES, 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const req = store.get(jid);
      req.onsuccess = () => {
        resolve(req.result?.list || []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveCachedMessages(jid: string, list: any[]): Promise<void> {
  if (!jid || !Array.isArray(list)) return;
  try {
    const db = await openDB();
    if (!db) {
      localStorage.setItem(`shree_wa_msg_${jid}`, JSON.stringify(list.slice(-100)));
      return;
    }
    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
    const store = tx.objectStore(STORE_MESSAGES);
    store.put({ jid, list: list.slice(-200), updatedAt: Date.now() });
  } catch {}
}
