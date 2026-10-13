// lib/whatsapp-backend-store.ts
// Persistent storage for WhatsApp Web (Baileys) chats, messages, and raw message cache

import fs from 'fs';
import path from 'path';

export interface StoredWhatsAppMessage {
  id: string;
  jid: string;
  fromMe: boolean;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'reaction' | 'location' | 'contact' | 'other';
  body: string;
  mediaUrl?: string;
  fileName?: string;
  mimetype?: string;
  status: 'sent' | 'delivered' | 'read' | 'pending';
  timestamp: string; // ISO string
  senderName?: string;
}

export interface StoredWhatsAppChat {
  jid: string;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: string; // ISO string
  unreadCount: number;
}

class WhatsAppBackendStore {
  private dataDir = path.join(process.cwd(), 'whatsapp_data');
  private messagesFile = path.join(process.cwd(), 'whatsapp_data', 'messages.json');
  private chatsFile = path.join(process.cwd(), 'whatsapp_data', 'chats.json');
  private rawFile = path.join(process.cwd(), 'whatsapp_data', 'raw_messages.json');

  private messages: Map<string, StoredWhatsAppMessage[]> = new Map();
  private chats: Map<string, StoredWhatsAppChat> = new Map();
  private rawMessages: Map<string, any> = new Map();
  private initialized = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Load chats
      if (fs.existsSync(this.chatsFile)) {
        const raw = fs.readFileSync(this.chatsFile, 'utf-8');
        const list: StoredWhatsAppChat[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((c) => this.chats.set(c.jid, c));
        }
      }

      // Load messages
      if (fs.existsSync(this.messagesFile)) {
        const raw = fs.readFileSync(this.messagesFile, 'utf-8');
        const data: Record<string, StoredWhatsAppMessage[]> = JSON.parse(raw);
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([jid, msgs]) => {
            if (Array.isArray(msgs)) {
              this.messages.set(jid, msgs);
            }
          });
        }
      }

      // Load raw messages (keep latest 1500)
      if (fs.existsSync(this.rawFile)) {
        const raw = fs.readFileSync(this.rawFile, 'utf-8');
        const data: Record<string, any> = JSON.parse(raw);
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([id, msg]) => {
            this.rawMessages.set(id, msg);
          });
        }
      }

      // Ensure seed Sandip chat exists if empty
      if (this.chats.size === 0) {
        this.chats.set('919601014899@s.whatsapp.net', {
          jid: '919601014899@s.whatsapp.net',
          name: 'sandip',
          phone: '9601014899',
          lastMessage: 'hi',
          timestamp: new Date().toISOString(),
          unreadCount: 0,
        });

        this.messages.set('919601014899@s.whatsapp.net', [
          {
            id: 'init_msg_1',
            jid: '919601014899@s.whatsapp.net',
            fromMe: true,
            type: 'text',
            body: 'hi',
            status: 'read',
            timestamp: new Date().toISOString(),
            senderName: 'sandip',
          },
        ]);
        this.saveNow();
      }

      this.initialized = true;
    } catch (err) {
      console.error('[WhatsAppStore] Failed to initialize store:', err);
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveNow();
    }, 400);
  }

  public saveNow() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Save chats
      const chatsList = Array.from(this.chats.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      fs.writeFileSync(this.chatsFile, JSON.stringify(chatsList, null, 2), 'utf-8');

      // Save messages
      const msgsObj: Record<string, StoredWhatsAppMessage[]> = {};
      this.messages.forEach((msgs, jid) => {
        msgsObj[jid] = msgs.slice(-200); // keep up to 200 messages per chat
      });
      fs.writeFileSync(this.messagesFile, JSON.stringify(msgsObj, null, 2), 'utf-8');

      // Save raw messages (max 1500)
      const rawEntries = Array.from(this.rawMessages.entries()).slice(-1500);
      const rawObj: Record<string, any> = Object.fromEntries(rawEntries);
      fs.writeFileSync(this.rawFile, JSON.stringify(rawObj), 'utf-8');
    } catch (err) {
      console.error('[WhatsAppStore] Error saving store to disk:', err);
    }
  }

  public saveRawMessage(id: string, rawMessage: any) {
    if (!id || !rawMessage) return;
    this.rawMessages.set(id, rawMessage);
    // Prune if over 2000
    if (this.rawMessages.size > 2000) {
      const firstKeys = Array.from(this.rawMessages.keys()).slice(0, 500);
      firstKeys.forEach((k) => this.rawMessages.delete(k));
    }
    this.scheduleSave();
  }

  public getRawMessage(id: string): any {
    return this.rawMessages.get(id);
  }

  public saveMessage(msg: StoredWhatsAppMessage, contactName?: string) {
    const list = this.messages.get(msg.jid) || [];
    const existingIndex = list.findIndex((m) => m.id === msg.id);

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...msg };
    } else {
      list.push(msg);
    }
    this.messages.set(msg.jid, list);

    // Update Chat Entry
    const cleanPhone = msg.jid.replace(/@.*$/, '').replace(/^91/, '').slice(-10);
    const existingChat = this.chats.get(msg.jid);
    const resolvedName = contactName || existingChat?.name || msg.senderName || cleanPhone;

    const unreadCount = !msg.fromMe && msg.status !== 'read'
      ? (existingChat?.unreadCount || 0) + 1
      : (existingChat?.unreadCount || 0);

    const chatEntry: StoredWhatsAppChat = {
      jid: msg.jid,
      name: resolvedName,
      phone: cleanPhone,
      lastMessage: msg.body || (msg.type !== 'text' ? `[${msg.type}]` : ''),
      timestamp: msg.timestamp || new Date().toISOString(),
      unreadCount,
    };

    this.chats.set(msg.jid, chatEntry);
    this.scheduleSave();
    return msg;
  }

  public updateMessageStatus(id: string, jid: string, status: StoredWhatsAppMessage['status']) {
    const list = this.messages.get(jid);
    if (!list) return;
    const item = list.find((m) => m.id === id);
    if (item) {
      item.status = status;
      this.scheduleSave();
    }
  }

  public getMessages(jid: string): StoredWhatsAppMessage[] {
    const list = this.messages.get(jid) || [];
    return [...list].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public getChats(): StoredWhatsAppChat[] {
    return Array.from(this.chats.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public markChatRead(jid: string) {
    const chat = this.chats.get(jid);
    if (chat) {
      chat.unreadCount = 0;
    }
    const msgs = this.messages.get(jid);
    if (msgs) {
      msgs.forEach((m) => {
        if (!m.fromMe && m.status !== 'read') {
          m.status = 'read';
        }
      });
    }
    this.scheduleSave();
  }

  public deleteChat(jid: string) {
    this.chats.delete(jid);
    this.messages.delete(jid);
    this.scheduleSave();
  }
}

// Global Singleton instance for process persistence
const globalForWAStore = globalThis as unknown as {
  __whatsappBackendStore?: WhatsAppBackendStore;
};

export const whatsappStore =
  globalForWAStore.__whatsappBackendStore || new WhatsAppBackendStore();

if (process.env.NODE_ENV !== 'production') {
  globalForWAStore.__whatsappBackendStore = whatsappStore;
}
