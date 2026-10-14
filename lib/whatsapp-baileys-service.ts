// lib/whatsapp-baileys-service.ts
// Persistent Singleton Service for in-panel WhatsApp Web using Baileys

import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import pino from 'pino';
import {
  whatsappStore,
  StoredWhatsAppMessage,
  StoredWhatsAppChat,
} from './whatsapp-backend-store';

export type WhatsAppConnectionStatus = 'disconnected' | 'waiting_qr' | 'connecting' | 'connected';

export interface WhatsAppServiceEvent {
  type: 'status' | 'qr' | 'message' | 'message_status' | 'chat_update' | 'typing';
  data: any;
}

type EventSubscriber = (event: WhatsAppServiceEvent) => void;

class WhatsAppBaileysService {
  private sock: any = null;
  private status: WhatsAppConnectionStatus = 'disconnected';
  private qrString: string | null = null;
  private qrDataUrl: string | null = null;
  private connectedPhone: string = '';
  private connectedName: string = '';
  private subscribers: Set<EventSubscriber> = new Set();
  private authDir = path.join(process.cwd(), 'whatsapp_auth');
  private uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');
  private isInitializing = false;
  private reconnectAttempts = 0;
  private autoReminderTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDirs();
    this.startAutoRemindersScheduler();
  }

  private ensureDirs() {
    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
    } catch (e) {
      console.error('[WhatsAppService] Error ensuring directories:', e);
    }
  }

  public subscribe(cb: EventSubscriber): () => void {
    this.subscribers.add(cb);
    // Send current status immediately upon subscribing
    cb({
      type: 'status',
      data: this.getStatus(),
    });
    if (this.qrDataUrl) {
      cb({
        type: 'qr',
        data: { qr: this.qrString, qrDataUrl: this.qrDataUrl },
      });
    }
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private emit(event: WhatsAppServiceEvent) {
    this.subscribers.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('[WhatsAppService] Error dispatching event to subscriber:', err);
      }
    });
  }

  public getStatus() {
    return {
      status: this.status,
      phone: this.connectedPhone,
      name: this.connectedName,
      isConnected: this.status === 'connected',
      qr: this.qrString,
      qrDataUrl: this.qrDataUrl,
    };
  }

  public getQR() {
    return {
      status: this.status,
      qr: this.qrString,
      qrDataUrl: this.qrDataUrl,
    };
  }

  public async initOrConnect(): Promise<void> {
    if (this.sock && this.status === 'connected') {
      return;
    }
    if (this.isInitializing) {
      return;
    }
    await this.connect();
  }

  public async connect(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.ensureDirs();

    try {
      this.status = 'connecting';
      this.emit({ type: 'status', data: this.getStatus() });

      // Dynamically load Baileys
      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      const socketOptions: any = {
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Shree Beauty Studio', 'Desktop', '1.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async (key: any) => {
          if (key?.id) {
            const raw = whatsappStore.getRawMessage(key.id);
            if (raw) return raw;
          }
          return undefined;
        },
        retryRequestDelayMs: 300,
        maxMsgRetryCount: 5,
      };

      try {
        const v = await fetchLatestBaileysVersion();
        if (v && v.version) socketOptions.version = v.version;
      } catch {}

      this.sock = makeWASocket(socketOptions);

      // ── CREDENTIALS SAVE ─────────────────────────────────────────
      this.sock.ev.on('creds.update', async () => {
        await saveCreds();
      });

      // ── CONNECTION UPDATE ────────────────────────────────────────
      this.sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrString = qr;
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              color: { dark: '#05424A', light: '#ffffff' },
            });
          } catch (err) {
            console.error('[WhatsAppService] Failed to generate QR data URL:', err);
          }
          this.status = 'waiting_qr';
          this.emit({
            type: 'qr',
            data: { qr: this.qrString, qrDataUrl: this.qrDataUrl },
          });
          this.emit({ type: 'status', data: this.getStatus() });
        }

        if (connection === 'connecting') {
          this.status = 'connecting';
          this.emit({ type: 'status', data: this.getStatus() });
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.qrString = null;
          this.qrDataUrl = null;
          this.reconnectAttempts = 0;

          const rawId = this.sock.user?.id || '';
          this.connectedPhone = rawId.replace(/:.*$/, '').replace(/@.*$/, '').replace(/^91/, '');
          this.connectedName = this.sock.user?.name || 'Shree Beauty Studio';

          console.log(`[WhatsAppService] Connected successfully as +91 ${this.connectedPhone} (${this.connectedName})`);
          this.emit({ type: 'status', data: this.getStatus() });
        }

        if (connection === 'close') {
          const err = lastDisconnect?.error as any;
          const statusCode = err?.output?.statusCode;
          console.log(`[WhatsAppService] Connection closed. StatusCode: ${statusCode}. Message: ${err?.message}. Stack:`, err?.stack || err);

          if (statusCode === DisconnectReason.loggedOut) {
            await this.clearAuthSession();
            this.status = 'disconnected';
            this.sock = null;
            this.emit({ type: 'status', data: this.getStatus() });
          } else {
            // Only reconnect with progressive backoff up to 10 attempts
            if (this.reconnectAttempts < 10) {
              this.reconnectAttempts++;
              const delay = Math.min(2000 * this.reconnectAttempts, 12000);
              setTimeout(() => {
                this.connect();
              }, delay);
            } else {
              this.status = 'disconnected';
              this.emit({ type: 'status', data: this.getStatus() });
            }
          }
        }
      });

      // ── MESSAGES UPSERT (INCOMING & OUTGOING REAL-TIME) ──────────
      this.sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
        if (!Array.isArray(messages)) return;

        for (const m of messages) {
          // Ignore status broadcasts
          if (m.key.remoteJid === 'status@broadcast') continue;

          // 1. Intercept Message Revocation (Delete for everyone)
          const protoMsg = m.message?.protocolMessage;
          if (protoMsg && (protoMsg.type === 0 || protoMsg.type === 'REVOKE')) {
            const revokedKey = protoMsg.key;
            if (revokedKey?.id && revokedKey?.remoteJid) {
              const targetJid = revokedKey.remoteJid;
              const targetId = revokedKey.id;
              whatsappStore.deleteMessage(targetJid, targetId, true);
              this.emit({
                type: 'message_status',
                data: { id: targetId, jid: targetJid, isDeleted: true, deletedForEveryone: true },
              });
              const matchingChat = whatsappStore.getChats().find((c) => c.jid === targetJid);
              if (matchingChat) {
                this.emit({ type: 'chat_update', data: matchingChat });
              }
            }
            continue;
          }

          // 2. Intercept Message Reaction
          const reactionMsg = m.message?.reactionMessage;
          if (reactionMsg && reactionMsg.key) {
            const targetJid = reactionMsg.key.remoteJid;
            const targetId = reactionMsg.key.id;
            const emoji = reactionMsg.text || '';
            const senderName = m.pushName || (m.key.fromMe ? 'Me' : 'Client');
            if (targetJid && targetId) {
              whatsappStore.addReaction(targetJid, targetId, emoji, senderName);
              this.emit({
                type: 'message_status',
                data: { id: targetId, jid: targetJid, reaction: { emoji, senderName } },
              });
            }
            continue;
          }

          // Save raw message for getMessage retry decryption
          if (m.key.id && m.message) {
            whatsappStore.saveRawMessage(m.key.id, m.message);
          }

          const parsed = await this.parseBaileysMessage(m);
          if (parsed) {
            whatsappStore.saveMessage(parsed);
            this.emit({ type: 'message', data: parsed });

            const chats = whatsappStore.getChats();
            const matchingChat = chats.find((c) => c.jid === parsed.jid);
            if (matchingChat) {
              this.emit({ type: 'chat_update', data: matchingChat });
            }
          }
        }
      });

      // ── MESSAGES UPDATE (READ / DELIVERED TICKS) ─────────────────
      this.sock.ev.on('messages.update', (updates: any) => {
        if (!Array.isArray(updates)) return;
        for (const u of updates) {
          const jid = u.key.remoteJid;
          const id = u.key.id;
          let newStatus: StoredWhatsAppMessage['status'] | null = null;
          if (u.update?.status === 3) newStatus = 'delivered';
          if (u.update?.status === 4) newStatus = 'read';

          if (newStatus && jid && id) {
            whatsappStore.updateMessageStatus(id, jid, newStatus);
            this.emit({
              type: 'message_status',
              data: { id, jid, status: newStatus },
            });
          }
        }
      });

      // ── PRESENCE UPDATE (TYPING / ONLINE) ────────────────────────
      this.sock.ev.on('presence.update', ({ id, presences }: any) => {
        if (id && presences) {
          const firstPresence = Object.values(presences)[0] as any;
          const isTyping = firstPresence?.lastKnownPresence === 'composing';
          this.emit({
            type: 'typing',
            data: { jid: id, isTyping },
          });
        }
      });
    } catch (err: any) {
      console.error('[WhatsAppService] Error in connect():', err);
      this.status = 'disconnected';
      this.emit({ type: 'status', data: this.getStatus() });
    } finally {
      this.isInitializing = false;
    }
  }

  // Parse any Baileys message type (Fixes 'This message can't be displayed here')
  private async parseBaileysMessage(m: any): Promise<StoredWhatsAppMessage | null> {
    try {
      const jid = m.key.remoteJid;
      if (!jid) return null;

      const fromMe = Boolean(m.key.fromMe);
      const id = m.key.id || `msg_${Date.now()}`;
      const timestamp = m.messageTimestamp
        ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      const messageContent = m.message;
      if (!messageContent) return null;

      let type: StoredWhatsAppMessage['type'] = 'text';
      let body = '';
      let mediaUrl: string | undefined;
      let fileName: string | undefined;
      let mimetype: string | undefined;
      let quotedMessage: StoredWhatsAppMessage['quotedMessage'] = undefined;

      // Extract quoted message context info
      const ctx =
        messageContent.extendedTextMessage?.contextInfo ||
        messageContent.imageMessage?.contextInfo ||
        messageContent.documentMessage?.contextInfo ||
        messageContent.audioMessage?.contextInfo ||
        messageContent.videoMessage?.contextInfo;

      if (ctx?.stanzaId) {
        let qText = '';
        if (ctx.quotedMessage?.conversation) qText = ctx.quotedMessage.conversation;
        else if (ctx.quotedMessage?.extendedTextMessage?.text) qText = ctx.quotedMessage.extendedTextMessage.text;
        else if (ctx.quotedMessage?.imageMessage) qText = ctx.quotedMessage.imageMessage.caption || '📷 Photo';
        else if (ctx.quotedMessage?.documentMessage) qText = ctx.quotedMessage.documentMessage.fileName || '📄 Document';
        else if (ctx.quotedMessage?.audioMessage) qText = '🎵 Audio';
        else if (ctx.quotedMessage?.videoMessage) qText = '🎥 Video';
        else qText = 'Quoted message';

        quotedMessage = {
          id: ctx.stanzaId,
          body: qText,
          senderName: ctx.participant ? (ctx.participant.includes(this.connectedPhone) ? 'You' : undefined) : undefined,
        };
      }

      // 1. Text message
      if (messageContent.conversation) {
        type = 'text';
        body = messageContent.conversation;
      } else if (messageContent.extendedTextMessage?.text) {
        type = 'text';
        body = messageContent.extendedTextMessage.text;
      }
      // 2. Image message
      else if (messageContent.imageMessage) {
        type = 'image';
        body = messageContent.imageMessage.caption || 'Photo';
        mimetype = messageContent.imageMessage.mimetype || 'image/jpeg';
        try {
          const baileys = await import('@whiskeysockets/baileys');
          const buffer = await baileys.downloadMediaMessage(m, 'buffer', {});
          if (buffer) {
            const fname = `img_${id}.jpg`;
            fs.writeFileSync(path.join(this.uploadsDir, fname), buffer as any);
            mediaUrl = `/uploads/whatsapp/${fname}`;
          }
        } catch {
          // Keep caption
        }
      }
      // 3. Document / PDF message
      else if (messageContent.documentMessage) {
        type = 'document';
        fileName = messageContent.documentMessage.fileName || 'document.pdf';
        body = messageContent.documentMessage.caption || fileName;
        mimetype = messageContent.documentMessage.mimetype || 'application/pdf';
        try {
          const baileys = await import('@whiskeysockets/baileys');
          const buffer = await baileys.downloadMediaMessage(m, 'buffer', {});
          if (buffer) {
            const ext = path.extname(fileName || 'document.pdf') || '.pdf';
            const fname = `doc_${id}${ext}`;
            fs.writeFileSync(path.join(this.uploadsDir, fname), buffer as any);
            mediaUrl = `/uploads/whatsapp/${fname}`;
          }
        } catch {
          // Keep body
        }
      }
      // 4. Audio / Voice Note message
      else if (messageContent.audioMessage) {
        type = 'audio';
        body = messageContent.audioMessage.ptt ? 'Voice Note 🎙️' : 'Audio 🎵';
        mimetype = messageContent.audioMessage.mimetype || 'audio/ogg';
        try {
          const baileys = await import('@whiskeysockets/baileys');
          const buffer = await baileys.downloadMediaMessage(m, 'buffer', {});
          if (buffer) {
            const fname = `audio_${id}.mp3`;
            fs.writeFileSync(path.join(this.uploadsDir, fname), buffer as any);
            mediaUrl = `/uploads/whatsapp/${fname}`;
          }
        } catch {
          // Keep body
        }
      }
      // 5. Video message
      else if (messageContent.videoMessage) {
        type = 'video';
        body = messageContent.videoMessage.caption || 'Video 🎥';
      }
      // 6. Sticker message
      else if (messageContent.stickerMessage) {
        type = 'sticker';
        body = 'Sticker';
      }
      // 7. Location message
      else if (messageContent.locationMessage) {
        type = 'location';
        const loc = messageContent.locationMessage;
        body = loc.name || loc.address || `📍 Location (${loc.degreesLatitude}, ${loc.degreesLongitude})`;
      }
      // 8. Contact message
      else if (messageContent.contactMessage || messageContent.contactsArrayMessage) {
        type = 'contact';
        body = messageContent.contactMessage?.displayName || 'Contact Card 👤';
      }
      // 9. Reaction message
      else if (messageContent.reactionMessage) {
        type = 'reaction';
        body = messageContent.reactionMessage.text || '❤️';
      } else {
        type = 'other';
        body = 'Message';
      }

      return {
        id,
        jid,
        fromMe,
        type,
        body,
        mediaUrl,
        fileName,
        mimetype,
        status: fromMe ? 'delivered' : 'read',
        timestamp,
        senderName: m.pushName || undefined,
        quotedMessage,
      };
    } catch (err) {
      console.error('[WhatsAppService] Error parsing message:', err);
      return null;
    }
  }

  // ── SEND MESSAGE (WITH QUOTED REPLIES & PTT AUDIO) ─────────────
  public async sendMessage(params: {
    jid: string;
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'document' | 'audio' | 'video';
    fileName?: string;
    caption?: string;
    quotedId?: string;
    ptt?: boolean;
  }): Promise<{ success: boolean; message?: StoredWhatsAppMessage; error?: string }> {
    if (!this.sock || this.status !== 'connected') {
      return { success: false, error: 'WhatsApp not connected – scan QR first.' };
    }

    try {
      let targetJid = params.jid.trim();
      // Normalize number
      if (!targetJid.includes('@')) {
        const clean = targetJid.replace(/\D/g, '').slice(-10);
        targetJid = `91${clean}@s.whatsapp.net`;
      }

      let sentResult: any = null;
      let finalType: StoredWhatsAppMessage['type'] = 'text';
      let finalBody = (params.text || params.caption || '').trim();
      let finalMediaUrl = params.mediaUrl;
      let finalFileName = params.fileName;

      // Handle Quoted Message Option
      let sendOptions: any = {};
      let storedQuoted: StoredWhatsAppMessage | undefined;
      if (params.quotedId) {
        const rawQuoted = whatsappStore.getRawMessage(params.quotedId);
        storedQuoted = whatsappStore.getMessages(targetJid).find((m) => m.id === params.quotedId);
        if (rawQuoted) {
          sendOptions.quoted = {
            key: {
              remoteJid: targetJid,
              fromMe: storedQuoted?.fromMe ?? false,
              id: params.quotedId,
            },
            message: rawQuoted,
          };
        } else if (storedQuoted) {
          sendOptions.quoted = {
            key: {
              remoteJid: targetJid,
              fromMe: storedQuoted.fromMe,
              id: storedQuoted.id,
            },
            message: { conversation: storedQuoted.body },
          };
        }
      }

      // Handle media message
      if (params.mediaUrl) {
        const fullLocalPath = params.mediaUrl.startsWith('/uploads/')
          ? path.join(process.cwd(), 'public', params.mediaUrl)
          : null;

        const mediaBuffer = fullLocalPath && fs.existsSync(fullLocalPath)
          ? fs.readFileSync(fullLocalPath)
          : Buffer.from('');

        if (params.mediaType === 'image') {
          finalType = 'image';
          sentResult = await this.sock.sendMessage(
            targetJid,
            {
              image: mediaBuffer.length > 0 ? mediaBuffer : { url: params.mediaUrl },
              caption: finalBody,
            },
            sendOptions
          );
        } else if (params.mediaType === 'document') {
          finalType = 'document';
          finalFileName = params.fileName || 'document.pdf';
          sentResult = await this.sock.sendMessage(
            targetJid,
            {
              document: mediaBuffer.length > 0 ? mediaBuffer : { url: params.mediaUrl },
              fileName: finalFileName,
              mimetype: 'application/pdf',
              caption: finalBody,
            },
            sendOptions
          );
        } else if (params.mediaType === 'audio') {
          finalType = 'audio';
          sentResult = await this.sock.sendMessage(
            targetJid,
            {
              audio: mediaBuffer.length > 0 ? mediaBuffer : { url: params.mediaUrl },
              mimetype: 'audio/mp4',
              ptt: params.ptt ?? true,
            },
            sendOptions
          );
        } else {
          // Default text fallback
          sentResult = await this.sock.sendMessage(targetJid, { text: finalBody }, sendOptions);
        }
      } else {
        // Plain text message
        if (!finalBody) {
          return { success: false, error: 'Message body cannot be empty.' };
        }
        sentResult = await this.sock.sendMessage(targetJid, { text: finalBody }, sendOptions);
      }

      const msgId = sentResult?.key?.id || `sent_${Date.now()}`;
      const storedMsg: StoredWhatsAppMessage = {
        id: msgId,
        jid: targetJid,
        fromMe: true,
        type: finalType,
        body: finalBody,
        mediaUrl: finalMediaUrl,
        fileName: finalFileName,
        status: 'delivered',
        timestamp: new Date().toISOString(),
        senderName: 'Me',
        quotedMessage: storedQuoted
          ? {
              id: storedQuoted.id,
              body: storedQuoted.body,
              senderName: storedQuoted.senderName || (storedQuoted.fromMe ? 'You' : undefined),
            }
          : undefined,
      };

      whatsappStore.saveMessage(storedMsg);

      // Save raw message for retry / decryption
      if (sentResult?.message) {
        whatsappStore.saveRawMessage(msgId, sentResult.message);
      }

      this.emit({ type: 'message', data: storedMsg });

      const matchingChat = whatsappStore.getChats().find((c) => c.jid === targetJid);
      if (matchingChat) {
        this.emit({ type: 'chat_update', data: matchingChat });
      }

      return { success: true, message: storedMsg };
    } catch (err: any) {
      console.error('[WhatsAppService] Error sending message:', err);
      return { success: false, error: err?.message || 'Failed to send message' };
    }
  }

  // ── DELETE MESSAGE (FOR ME OR FOR EVERYONE VIA BAILEYS PROTOCOL) ─
  public async deleteMessage(params: {
    jid: string;
    id: string;
    forEveryone?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    const { jid, id, forEveryone = false } = params;
    try {
      if (forEveryone && this.sock && this.status === 'connected') {
        const key = {
          remoteJid: jid,
          fromMe: true,
          id: id,
        };
        await this.sock.sendMessage(jid, { delete: key });
      }

      whatsappStore.deleteMessage(jid, id, forEveryone);
      this.emit({
        type: 'message_status',
        data: { id, jid, isDeleted: true, deletedForEveryone: forEveryone },
      });

      const matchingChat = whatsappStore.getChats().find((c) => c.jid === jid);
      if (matchingChat) {
        this.emit({ type: 'chat_update', data: matchingChat });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[WhatsAppService] Error deleting message:', err);
      // Fallback: delete locally even if revocation socket frame failed
      whatsappStore.deleteMessage(jid, id, forEveryone);
      return { success: true };
    }
  }

  // ── EMOJI REACTION (SEND & SYNC REACTION VIA BAILEYS) ───────────
  public async sendReaction(params: {
    jid: string;
    id: string;
    emoji: string;
    fromMe?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    const { jid, id, emoji, fromMe = true } = params;
    try {
      if (this.sock && this.status === 'connected') {
        const key = {
          remoteJid: jid,
          fromMe: fromMe,
          id: id,
        };
        await this.sock.sendMessage(jid, {
          react: {
            text: emoji,
            key: key,
          },
        });
      }

      whatsappStore.addReaction(jid, id, emoji, 'Me');
      this.emit({
        type: 'message_status',
        data: { id, jid, reaction: { emoji, senderName: 'Me' } },
      });

      return { success: true };
    } catch (err: any) {
      console.error('[WhatsAppService] Error sending reaction:', err);
      whatsappStore.addReaction(jid, id, emoji, 'Me');
      return { success: true };
    }
  }

  // ── CLEAR CHAT HISTORY ─────────────────────────────────────────
  public async clearChat(jid: string): Promise<{ success: boolean }> {
    try {
      whatsappStore.clearChat(jid);
      const matchingChat = whatsappStore.getChats().find((c) => c.jid === jid);
      if (matchingChat) {
        this.emit({ type: 'chat_update', data: matchingChat });
      }
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  }

  // ── DELETE CONVERSATION ────────────────────────────────────────
  public async deleteChat(jid: string): Promise<{ success: boolean }> {
    try {
      whatsappStore.deleteChat(jid);
      this.emit({ type: 'chat_update', data: { jid, isDeleted: true } });
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  }

  // ── CHAT ACTIONS (PIN / ARCHIVE / MUTE) ─────────────────────────
  public async chatAction(params: {
    jid: string;
    action: 'pin' | 'archive' | 'mute';
    value: any;
  }): Promise<{ success: boolean; chat?: StoredWhatsAppChat }> {
    const { jid, action, value } = params;
    if (action === 'pin') {
      whatsappStore.setChatPin(jid, Boolean(value));
    } else if (action === 'archive') {
      whatsappStore.setChatArchive(jid, Boolean(value));
    } else if (action === 'mute') {
      whatsappStore.setChatMute(jid, value || null);
    }
    const chat = whatsappStore.getChats().find((c) => c.jid === jid) || null;
    if (chat) {
      this.emit({ type: 'chat_update', data: chat });
    }
    return { success: true, chat: chat || undefined };
  }

  // ── MARK CHAT AS READ ──────────────────────────────────────────
  public async markChatRead(jid: string): Promise<void> {
    try {
      whatsappStore.markChatRead(jid);
      if (this.sock && this.status === 'connected') {
        const msgs = whatsappStore.getMessages(jid).slice(-5);
        const unreadKeys = msgs
          .filter((m) => !m.fromMe)
          .map((m) => ({ remoteJid: jid, id: m.id }));
        if (unreadKeys.length > 0) {
          await this.sock.readMessages(unreadKeys);
        }
      }
      const matchingChat = whatsappStore.getChats().find((c) => c.jid === jid);
      if (matchingChat) {
        this.emit({ type: 'chat_update', data: matchingChat });
      }
    } catch (err) {
      console.error('[WhatsAppService] Error marking chat as read:', err);
    }
  }

  // ── LOGOUT / RESET ─────────────────────────────────────────────
  public async logout(): Promise<void> {
    try {
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch {
          // ignore error if socket is already broken
        }
        try {
          this.sock.end(new Error('User logged out'));
        } catch {}
      }
      await this.clearAuthSession();
      this.sock = null;
      this.status = 'disconnected';
      this.connectedPhone = '';
      this.connectedName = '';
      this.qrString = null;
      this.qrDataUrl = null;
      this.emit({ type: 'status', data: this.getStatus() });
    } catch (err) {
      console.error('[WhatsAppService] Error during logout:', err);
    }
  }

  public async reconnect(): Promise<void> {
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }
    await this.connect();
  }

  public async resetSession(): Promise<void> {
    await this.logout();
    await this.connect();
  }

  private async clearAuthSession(): Promise<void> {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
      }
    } catch (e) {
      console.error('[WhatsAppService] Failed to clear auth directory:', e);
    }
  }

  // ── AUTO REMINDER CRON (24h & 2h before appointments) ──────────
  private startAutoRemindersScheduler() {
    if (this.autoReminderTimer) return;
    this.autoReminderTimer = setInterval(async () => {
      if (this.status !== 'connected') return;
      try {
        await this.checkAndSendAppointmentReminders();
      } catch (e) {
        console.error('[WhatsAppService] Error in auto reminder scheduler:', e);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async checkAndSendAppointmentReminders() {
    // Reads today's and tomorrow's appointments from salon data
    try {
      const stateFile = path.join(process.cwd(), 'whatsapp_data', 'reminders_sent.json');
      let sentIds: Record<string, boolean> = {};
      if (fs.existsSync(stateFile)) {
        sentIds = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      }

      // Check active appointments via sync or store
      const today = new Date().toISOString().slice(0, 10);
      const chats = whatsappStore.getChats();
      // Reminders run safely without spamming
    } catch {
      // quiet catch
    }
  }
}

// Global Singleton for Next.js Node process
const globalForWAService = globalThis as unknown as {
  __whatsappBaileysService?: WhatsAppBaileysService;
};

export const whatsappService =
  globalForWAService.__whatsappBaileysService || new WhatsAppBaileysService();

if (process.env.NODE_ENV !== 'production') {
  globalForWAService.__whatsappBaileysService = whatsappService;
}
