// lib/whatsapp-backend-store.ts
// Persistent storage for WhatsApp Web (Baileys) chats, messages, reactions, and raw message cache

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
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
  timestamp: string; // ISO string
  senderName?: string;
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  isStarred?: boolean;
  reactions?: Record<string, string>; // emoji -> senderName / senderId
  quotedMessage?: {
    id: string;
    body: string;
    senderName?: string;
    type?: string;
  };
}

export interface StoredWhatsAppChat {
  jid: string;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: string; // ISO string
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  muteUntil?: string | null;
  profilePicUrl?: string;
  isGroup?: boolean;
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

      this.saveNow();
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

      // Save chats (pinned chats first, then newest timestamp)
      const chatsList = Array.from(this.chats.values()).sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      fs.writeFileSync(this.chatsFile, JSON.stringify(chatsList, null, 2), 'utf-8');

      // Save messages (keep latest 300 messages per chat)
      const msgsObj: Record<string, StoredWhatsAppMessage[]> = {};
      this.messages.forEach((msgs, jid) => {
        msgsObj[jid] = msgs.slice(-300);
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
    if (this.rawMessages.size > 2000) {
      const firstKeys = Array.from(this.rawMessages.keys()).slice(0, 500);
      firstKeys.forEach((k) => this.rawMessages.delete(k));
    }
    this.scheduleSave();
  }

  public getRawMessage(id: string): any {
    return this.rawMessages.get(id);
  }

  public saveMessage(msg: StoredWhatsAppMessage, contactName?: string): StoredWhatsAppMessage {
    const list = this.messages.get(msg.jid) || [];
    const existingIndex = list.findIndex((m) => m.id === msg.id);

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...msg };
    } else {
      list.push(msg);
    }
    this.messages.set(msg.jid, list);

    // Update Chat Entry
    const isGroup = msg.jid.endsWith('@g.us');
    const cleanPhone = isGroup ? '' : msg.jid.replace(/@.*$/, '').replace(/^91/, '').slice(-10);
    const existingChat = this.chats.get(msg.jid);
    const resolvedName = contactName || existingChat?.name || msg.senderName || cleanPhone || (isGroup ? 'WhatsApp Group' : 'Contact');

    const unreadCount = !msg.fromMe && msg.status !== 'read'
      ? (existingChat?.unreadCount || 0) + 1
      : (existingChat?.unreadCount || 0);

    const chatEntry: StoredWhatsAppChat = {
      jid: msg.jid,
      name: resolvedName,
      phone: cleanPhone,
      lastMessage: msg.isDeleted
        ? '🚫 This message was deleted'
        : msg.body || (msg.type !== 'text' ? `[${msg.type}]` : ''),
      timestamp: msg.timestamp || new Date().toISOString(),
      unreadCount,
      isPinned: existingChat?.isPinned || false,
      isArchived: existingChat?.isArchived || false,
      isMuted: existingChat?.isMuted || false,
      muteUntil: existingChat?.muteUntil || null,
      isGroup,
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
    return Array.from(this.chats.values()).sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
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

  // ── DELETION & MESSAGE ACTIONS ─────────────────────────────────────
  public deleteMessage(jid: string, messageId: string, forEveryone = false): boolean {
    const list = this.messages.get(jid);
    if (!list) return false;

    if (forEveryone) {
      // Mark as deleted for everyone (WhatsApp Web protocol behaviour)
      const msg = list.find((m) => m.id === messageId);
      if (msg) {
        msg.isDeleted = true;
        msg.deletedForEveryone = true;
        msg.body = '🚫 You deleted this message';
        msg.mediaUrl = undefined;
      }
    } else {
      // Delete for me (remove from view)
      const nextList = list.filter((m) => m.id !== messageId);
      this.messages.set(jid, nextList);
    }

    // Refresh lastMessage in chat
    const remaining = this.messages.get(jid) || [];
    const last = remaining[remaining.length - 1];
    const chat = this.chats.get(jid);
    if (chat) {
      chat.lastMessage = last ? (last.isDeleted ? '🚫 This message was deleted' : last.body) : '';
      if (last?.timestamp) chat.timestamp = last.timestamp;
    }

    this.scheduleSave();
    return true;
  }

  public deleteMessages(jid: string, messageIds: string[]): boolean {
    const idSet = new Set(messageIds);
    const list = this.messages.get(jid);
    if (!list) return false;

    const nextList = list.filter((m) => !idSet.has(m.id));
    this.messages.set(jid, nextList);

    const remaining = this.messages.get(jid) || [];
    const last = remaining[remaining.length - 1];
    const chat = this.chats.get(jid);
    if (chat) {
      chat.lastMessage = last ? (last.isDeleted ? '🚫 This message was deleted' : last.body) : '';
      if (last?.timestamp) chat.timestamp = last.timestamp;
    }

    this.scheduleSave();
    return true;
  }

  public clearChat(jid: string): boolean {
    this.messages.set(jid, []);
    const chat = this.chats.get(jid);
    if (chat) {
      chat.lastMessage = '';
      chat.unreadCount = 0;
    }
    this.scheduleSave();
    return true;
  }

  public deleteChat(jid: string): boolean {
    this.chats.delete(jid);
    this.messages.delete(jid);
    this.scheduleSave();
    return true;
  }

  public setChatPin(jid: string, isPinned: boolean): boolean {
    const chat = this.chats.get(jid);
    if (chat) {
      chat.isPinned = isPinned;
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public setChatArchive(jid: string, isArchived: boolean): boolean {
    const chat = this.chats.get(jid);
    if (chat) {
      chat.isArchived = isArchived;
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public setChatMute(jid: string, muteUntil: string | null): boolean {
    const chat = this.chats.get(jid);
    if (chat) {
      chat.isMuted = Boolean(muteUntil);
      chat.muteUntil = muteUntil;
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public addReaction(jid: string, messageId: string, emoji: string, senderName = 'Me'): boolean {
    const list = this.messages.get(jid);
    if (!list) return false;
    const msg = list.find((m) => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      if (!emoji) {
        delete msg.reactions[senderName];
      } else {
        msg.reactions[senderName] = emoji;
      }
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public toggleStarMessage(jid: string, messageId: string): boolean {
    const list = this.messages.get(jid);
    if (!list) return false;
    const msg = list.find((m) => m.id === messageId);
    if (msg) {
      msg.isStarred = !msg.isStarred;
      this.scheduleSave();
      return true;
    }
    return false;
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
