// scripts/whatsapp-service.mjs
// Dedicated standalone WhatsApp Web backend service using Baileys

import http from 'http';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import pino from 'pino';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const authDir = path.join(rootDir, 'whatsapp_auth');
const dataDir = path.join(rootDir, 'whatsapp_data');
const uploadsDir = path.join(rootDir, 'public', 'uploads', 'whatsapp');

[authDir, dataDir, uploadsDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const chatsFile = path.join(dataDir, 'chats.json');
const messagesFile = path.join(dataDir, 'messages.json');
const rawFile = path.join(dataDir, 'raw_messages.json');

// Store in memory
let chats = new Map();
let messages = new Map();
let rawMessages = new Map();

export function toCanonicalJid(jid) {
  if (!jid) return '';
  const str = String(jid).trim();
  if (str.endsWith('@g.us')) return str;
  const cleanPhone = str.replace(/@.*$/, '').replace(/^91/, '').slice(-10);
  if (cleanPhone.length === 10 && /^\d+$/.test(cleanPhone)) {
    return `91${cleanPhone}@s.whatsapp.net`;
  }
  return str;
}

function loadStore() {
  try {
    if (fs.existsSync(chatsFile)) {
      const list = JSON.parse(fs.readFileSync(chatsFile, 'utf-8'));
      if (Array.isArray(list)) list.forEach((c) => chats.set(c.jid, c));
    }
    if (fs.existsSync(messagesFile)) {
      const obj = JSON.parse(fs.readFileSync(messagesFile, 'utf-8'));
      Object.entries(obj).forEach(([jid, msgs]) => messages.set(jid, msgs));
    }
    if (fs.existsSync(rawFile)) {
      const obj = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
      Object.entries(obj).forEach(([id, m]) => rawMessages.set(id, m));
    }

    // Consolidate any LID or duplicate keys into canonical phone JID
    const consolidatedMessages = new Map();
    messages.forEach((list, jid) => {
      const canon = toCanonicalJid(jid);
      const existing = consolidatedMessages.get(canon) || [];
      const idMap = new Map();
      existing.forEach((m) => idMap.set(m.id, m));
      list.forEach((m) => {
        m.jid = canon;
        idMap.set(m.id, m);
      });
      const merged = Array.from(idMap.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      consolidatedMessages.set(canon, merged);
    });
    messages = consolidatedMessages;

    const consolidatedChats = new Map();
    chats.forEach((c, jid) => {
      const canon = toCanonicalJid(jid);
      const cleanPhone = canon.replace(/@.*$/, '').replace(/^91/, '').slice(-10);
      const msgs = messages.get(canon) || [];
      const lastMsgObj = msgs[msgs.length - 1];
      const prev = consolidatedChats.get(canon);
      const resolvedName = (c.name && c.name !== c.phone && c.name !== cleanPhone) ? c.name : (prev?.name || c.name || cleanPhone);
      consolidatedChats.set(canon, {
        jid: canon,
        name: resolvedName,
        phone: cleanPhone,
        lastMessage: lastMsgObj?.body || c.lastMessage || 'Ready to chat',
        timestamp: lastMsgObj?.timestamp || c.timestamp || new Date().toISOString(),
        unreadCount: (prev?.unreadCount || 0) + (c.unreadCount || 0),
      });
    });
    chats = consolidatedChats;
    chats.delete('919601014899@s.whatsapp.net');
    messages.delete('919601014899@s.whatsapp.net');
    saveStore();
  } catch (err) {
    console.error('Error loading store:', err);
  }
}

function saveStore() {
  try {
    const chatList = Array.from(chats.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    fs.writeFileSync(chatsFile, JSON.stringify(chatList, null, 2), 'utf-8');

    const msgsObj = {};
    messages.forEach((list, jid) => {
      msgsObj[jid] = list.slice(-200);
    });
    fs.writeFileSync(messagesFile, JSON.stringify(msgsObj, null, 2), 'utf-8');

    const rawObj = Object.fromEntries(Array.from(rawMessages.entries()).slice(-1500));
    fs.writeFileSync(rawFile, JSON.stringify(rawObj), 'utf-8');
  } catch (err) {
    console.error('Error saving store:', err);
  }
}

loadStore();

// WhatsApp state
let sock = null;
let status = 'disconnected'; // 'disconnected' | 'waiting_qr' | 'connecting' | 'connected'
let qrString = null;
let qrDataUrl = null;
let connectedPhone = '';
let connectedName = '';
const sseClients = new Set();

function broadcast(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(payload);
    } catch {}
  });
}

function getStatusPayload() {
  return {
    success: true,
    status,
    phone: connectedPhone,
    name: connectedName,
    isConnected: status === 'connected',
    connected: status === 'connected',
    qr: qrString,
    qrDataUrl,
  };
}

async function connectToWhatsApp() {
  try {
    status = 'connecting';
    broadcast('status', getStatusPayload());

    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import('@whiskeysockets/baileys');

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['Shree Beauty Studio', 'Desktop', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      getMessage: async (key) => {
        if (key?.id && rawMessages.has(key.id)) {
          return rawMessages.get(key.id);
        }
        return undefined;
      },
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrString = qr;
        try {
          qrDataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            scale: 8,
            errorCorrectionLevel: 'H',
            color: { dark: '#05424A', light: '#ffffff' },
          });
        } catch {}
        if (status !== 'waiting_qr') {
          console.log('[WhatsApp Service] Waiting for QR scan at /admin/whatsapp...');
        }
        status = 'waiting_qr';
        broadcast('qr', { qr: qrString, qrDataUrl });
        broadcast('status', getStatusPayload());
      }

      if (connection === 'connecting') {
        status = 'connecting';
        broadcast('status', getStatusPayload());
      }

      if (connection === 'open') {
        status = 'connected';
        qrString = null;
        qrDataUrl = null;
        const rawId = sock.user?.id || '';
        connectedPhone = rawId.replace(/:.*$/, '').replace(/@.*$/, '').replace(/^91/, '');
        connectedName = sock.user?.name || 'Shree Beauty Studio';
        console.log(`[WhatsApp Service] Connected as +91 ${connectedPhone} (${connectedName})`);
        broadcast('status', getStatusPayload());
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`[WhatsApp Service] Connection closed. StatusCode: ${statusCode}`);

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403 || statusCode === 440) {
          status = 'disconnected';
          connectedPhone = '';
          connectedName = '';
          qrString = null;
          qrDataUrl = null;
          sock = null;
          try {
            fs.rmSync(authDir, { recursive: true, force: true });
            fs.mkdirSync(authDir, { recursive: true });
          } catch {}
          broadcast('status', getStatusPayload());
          console.log('[WhatsApp Service] Session terminated or replaced (440/loggedOut). Cleaned auth, waiting for fresh QR.');
          setTimeout(() => {
            connectToWhatsApp();
          }, 1500);
        } else {
          status = 'disconnected';
          broadcast('status', getStatusPayload());
          console.log('[WhatsApp Service] Reconnecting in 4 seconds...');
          setTimeout(() => {
            connectToWhatsApp();
          }, 4000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages: newMsgs }) => {
      if (!Array.isArray(newMsgs)) return;

      for (const m of newMsgs) {
        if (m.key.remoteJid === 'status@broadcast') continue;

        // 1. Intercept Message Revocation (Delete for everyone)
        const protoMsg = m.message?.protocolMessage;
        if (protoMsg && (protoMsg.type === 0 || protoMsg.type === 'REVOKE')) {
          const revokedKey = protoMsg.key;
          if (revokedKey?.id && revokedKey?.remoteJid) {
            const canon = toCanonicalJid(revokedKey.remoteJid);
            const targetId = revokedKey.id;
            const list = messages.get(canon) || [];
            const target = list.find((x) => x.id === targetId);
            if (target) {
              target.isDeleted = true;
              target.deletedForEveryone = true;
              target.body = '🚫 This message was deleted';
              saveStore();
              broadcast('message_status', { id: targetId, jid: canon, isDeleted: true, deletedForEveryone: true });
              const c = chats.get(canon);
              if (c) {
                c.lastMessage = '🚫 This message was deleted';
                broadcast('chat_update', c);
              }
            }
          }
          continue;
        }

        // 2. Intercept Message Reaction
        const reactionMsg = m.message?.reactionMessage;
        if (reactionMsg && reactionMsg.key) {
          const canon = toCanonicalJid(reactionMsg.key.remoteJid);
          const targetId = reactionMsg.key.id;
          const emoji = reactionMsg.text || '';
          const senderName = m.pushName || (m.key.fromMe ? 'Me' : 'Client');
          const list = messages.get(canon) || [];
          const target = list.find((x) => x.id === targetId);
          if (target) {
            target.reactions = target.reactions || {};
            if (emoji) {
              target.reactions[emoji] = senderName;
            } else {
              delete target.reactions;
            }
            saveStore();
            broadcast('message_status', { id: targetId, jid: canon, reaction: { emoji, senderName } });
          }
          continue;
        }

        if (m.key.id && m.message) {
          rawMessages.set(m.key.id, m.message);
        }

        const parsed = await parseMsg(m);
        if (parsed) {
          const canonicalJid = toCanonicalJid(parsed.jid);
          parsed.jid = canonicalJid;

          const list = messages.get(canonicalJid) || [];
          const idx = list.findIndex((x) => x.id === parsed.id);
          if (idx >= 0) list[idx] = parsed;
          else list.push(parsed);
          messages.set(canonicalJid, list);

          const cleanPhone = canonicalJid.replace(/@.*$/, '').replace(/^91/, '').slice(-10);
          const existingChat = chats.get(canonicalJid);
          const resolvedName = (existingChat?.name && existingChat.name !== cleanPhone)
            ? existingChat.name
            : (parsed.senderName || existingChat?.name || cleanPhone);
          const unreadCount = !parsed.fromMe ? (existingChat?.unreadCount || 0) + 1 : (existingChat?.unreadCount || 0);

          const chatEntry = {
            jid: canonicalJid,
            name: resolvedName,
            phone: cleanPhone,
            lastMessage: parsed.body,
            timestamp: parsed.timestamp,
            unreadCount,
          };
          chats.set(canonicalJid, chatEntry);
          saveStore();

          broadcast('message', parsed);
          broadcast('chat_update', chatEntry);
        }
      }
    });

    sock.ev.on('messages.update', (updates) => {
      if (!Array.isArray(updates)) return;
      for (const u of updates) {
        const jid = u.key.remoteJid;
        const id = u.key.id;
        let newStatus = null;
        if (u.update?.status === 3) newStatus = 'delivered';
        if (u.update?.status === 4) newStatus = 'read';

        if (newStatus && jid && id && messages.has(jid)) {
          const list = messages.get(jid);
          const item = list.find((m) => m.id === id);
          if (item) {
            item.status = newStatus;
            saveStore();
            broadcast('message_status', { id, jid, status: newStatus });
          }
        }
      }
    });
  } catch (err) {
    console.error('[WhatsApp Service] Error in connectToWhatsApp:', err);
    status = 'disconnected';
    broadcast('status', getStatusPayload());
  }
}

async function parseMsg(m) {
  try {
    const jid = m.key.remoteJid;
    if (!jid) return null;
    const fromMe = Boolean(m.key.fromMe);
    const id = m.key.id || `msg_${Date.now()}`;
    const timestamp = m.messageTimestamp
      ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();

    let c = m.message;
    if (!c) return null;
    if (c.ephemeralMessage?.message) c = c.ephemeralMessage.message;
    if (c.viewOnceMessage?.message) c = c.viewOnceMessage.message;
    if (c.viewOnceMessageV2?.message) c = c.viewOnceMessageV2.message;
    if (c.documentWithCaptionMessage?.message) c = c.documentWithCaptionMessage.message;

    let type = 'text';
    let body = '';
    let mediaUrl = undefined;
    let fileName = undefined;
    let mimetype = undefined;
    let quotedMessage = undefined;

    const ctx =
      c.extendedTextMessage?.contextInfo ||
      c.imageMessage?.contextInfo ||
      c.documentMessage?.contextInfo ||
      c.audioMessage?.contextInfo ||
      c.videoMessage?.contextInfo;

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
        senderName: ctx.participant ? (ctx.participant.includes(connectedPhone) ? 'You' : undefined) : undefined,
      };
    }

    if (c.conversation) {
      type = 'text';
      body = c.conversation;
    } else if (c.extendedTextMessage?.text) {
      type = 'text';
      body = c.extendedTextMessage.text;
    } else if (c.imageMessage) {
      type = 'image';
      body = c.imageMessage.caption || 'Photo';
      mimetype = c.imageMessage.mimetype || 'image/jpeg';
      try {
        const baileys = await import('@whiskeysockets/baileys');
        const buffer = await baileys.downloadMediaMessage(m, 'buffer', {});
        if (buffer) {
          const fname = `img_${id}.jpg`;
          fs.writeFileSync(path.join(uploadsDir, fname), buffer);
          mediaUrl = `/uploads/whatsapp/${fname}`;
        }
      } catch {}
    } else if (c.documentMessage) {
      type = 'document';
      fileName = c.documentMessage.fileName || 'document.pdf';
      body = c.documentMessage.caption || fileName;
      mimetype = c.documentMessage.mimetype || 'application/pdf';
      try {
        const baileys = await import('@whiskeysockets/baileys');
        const buffer = await baileys.downloadMediaMessage(m, 'buffer', {});
        if (buffer) {
          const ext = path.extname(fileName) || '.pdf';
          const fname = `doc_${id}${ext}`;
          fs.writeFileSync(path.join(uploadsDir, fname), buffer);
          mediaUrl = `/uploads/whatsapp/${fname}`;
        }
      } catch {}
    } else if (c.audioMessage) {
      type = 'audio';
      body = c.audioMessage.ptt ? 'Voice Note 🎙️' : 'Audio 🎵';
      try {
        const baileys = await import('@whiskeysockets/baileys');
        const buffer = await baileys.downloadMediaMessage(m, 'buffer', {});
        if (buffer) {
          const fname = `audio_${id}.mp3`;
          fs.writeFileSync(path.join(uploadsDir, fname), buffer);
          mediaUrl = `/uploads/whatsapp/${fname}`;
        }
      } catch {}
    } else if (c.videoMessage) {
      type = 'video';
      body = c.videoMessage.caption || 'Video 🎥';
    } else if (c.locationMessage) {
      type = 'location';
      body = c.locationMessage.name || `📍 Location (${c.locationMessage.degreesLatitude}, ${c.locationMessage.degreesLongitude})`;
    } else if (c.contactMessage || c.contactsArrayMessage) {
      type = 'contact';
      body = c.contactMessage?.displayName || 'Contact Card 👤';
    } else if (c.reactionMessage) {
      type = 'reaction';
      body = c.reactionMessage.text || '❤️';
    } else {
      type = 'text';
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
  } catch (e) {
    return null;
  }
}

// ── HTTP API SERVER ──────────────────────────────────────────────
const PORT = process.env.WHATSAPP_SERVICE_PORT || 3001;

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // 1. SSE Events
  if (pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    res.write(`event: status\ndata: ${JSON.stringify(getStatusPayload())}\n\n`);
    if (qrDataUrl) {
      res.write(`event: qr\ndata: ${JSON.stringify({ qr: qrString, qrDataUrl })}\n\n`);
    }

    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 2. Status
  if (pathname === '/status') {
    if (!sock && status === 'disconnected') {
      connectToWhatsApp();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStatusPayload()));
    return;
  }

  // 3. QR
  if (pathname === '/qr') {
    if (!sock && status === 'disconnected') {
      connectToWhatsApp();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        qr: qrString,
        qrDataUrl,
        status,
        connected: status === 'connected',
        phone: connectedPhone,
        name: connectedName,
      })
    );
    return;
  }

  // 4. Chats
  if (pathname === '/chats') {
    const chatList = Array.from(chats.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, chats: chatList, total: chatList.length }));
    return;
  }

  // 5. Messages (?jid=... or /messages/:chatId)
  if (pathname === '/messages' || pathname.startsWith('/messages/')) {
    let jid = '';
    if (pathname.startsWith('/messages/')) {
      jid = decodeURIComponent(pathname.replace(/^\/messages\/?/, '')).trim();
    }
    if (!jid) {
      jid = (url.searchParams.get('jid') || '').trim();
    }
    const canon = toCanonicalJid(jid);
    let list = messages.get(jid) || (canon ? messages.get(canon) : null);
    if (!list && jid) {
      const cleanPhone = jid.replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        for (const [key, msgList] of messages.entries()) {
          if (key.includes(cleanPhone)) {
            list = msgList;
            break;
          }
        }
      }
    }
    const resultList = list || [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, jid: canon || jid, messages: resultList, total: resultList.length }));
    return;
  }

  // Helper to read JSON body
  const readBody = () =>
    new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({});
        }
      });
    });

  // 6. Send message
  if (pathname === '/send' && req.method === 'POST') {
    const body = await readBody();
    let { jid, text, mediaUrl, mediaType, fileName, caption, quotedId, ptt } = body;

    if (!sock || status !== 'connected') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'WhatsApp not connected – scan QR first.' }));
      return;
    }

    if (!jid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Recipient jid is required.' }));
      return;
    }

    let targetJid = jid.trim();
    if (!targetJid.includes('@')) {
      const clean = targetJid.replace(/\D/g, '').slice(-10);
      targetJid = `91${clean}@s.whatsapp.net`;
    }

    try {
      let sentResult = null;
      let finalType = 'text';
      let finalBody = (text || caption || '').trim();

      // Handle quoted reply
      let sendOptions = {};
      let storedQuoted = null;
      if (quotedId) {
        const rawQuoted = rawMessages.get(quotedId);
        const msgList = messages.get(targetJid) || [];
        storedQuoted = msgList.find((x) => x.id === quotedId);
        if (rawQuoted) {
          sendOptions.quoted = {
            key: { remoteJid: targetJid, fromMe: storedQuoted?.fromMe ?? false, id: quotedId },
            message: rawQuoted,
          };
        } else if (storedQuoted) {
          sendOptions.quoted = {
            key: { remoteJid: targetJid, fromMe: storedQuoted.fromMe, id: storedQuoted.id },
            message: { conversation: storedQuoted.body },
          };
        }
      }

      if (mediaUrl) {
        const fullLocalPath = mediaUrl.startsWith('/uploads/')
          ? path.join(rootDir, 'public', mediaUrl)
          : null;
        const mediaBuffer = fullLocalPath && fs.existsSync(fullLocalPath)
          ? fs.readFileSync(fullLocalPath)
          : Buffer.from('');

        if (mediaType === 'image') {
          finalType = 'image';
          sentResult = await sock.sendMessage(
            targetJid,
            {
              image: mediaBuffer.length > 0 ? mediaBuffer : { url: mediaUrl },
              caption: finalBody,
            },
            sendOptions
          );
        } else if (mediaType === 'document') {
          finalType = 'document';
          sentResult = await sock.sendMessage(
            targetJid,
            {
              document: mediaBuffer.length > 0 ? mediaBuffer : { url: mediaUrl },
              fileName: fileName || 'document.pdf',
              mimetype: 'application/pdf',
              caption: finalBody,
            },
            sendOptions
          );
        } else if (mediaType === 'audio') {
          finalType = 'audio';
          sentResult = await sock.sendMessage(
            targetJid,
            {
              audio: mediaBuffer.length > 0 ? mediaBuffer : { url: mediaUrl },
              mimetype: 'audio/mp4',
              ptt: ptt ?? true,
            },
            sendOptions
          );
        } else {
          sentResult = await sock.sendMessage(targetJid, { text: finalBody }, sendOptions);
        }
      } else {
        sentResult = await sock.sendMessage(targetJid, { text: finalBody }, sendOptions);
      }

      const msgId = sentResult?.key?.id || `sent_${Date.now()}`;
      const storedMsg = {
        id: msgId,
        jid: targetJid,
        fromMe: true,
        type: finalType,
        body: finalBody,
        mediaUrl,
        fileName,
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

      const list = messages.get(targetJid) || [];
      list.push(storedMsg);
      messages.set(targetJid, list);

      const cleanPhone = targetJid.replace(/@.*$/, '').replace(/^91/, '').slice(-10);
      const existingChat = chats.get(targetJid);
      const chatEntry = {
        jid: targetJid,
        name: existingChat?.name || cleanPhone,
        phone: cleanPhone,
        lastMessage: finalBody,
        timestamp: storedMsg.timestamp,
        unreadCount: existingChat?.unreadCount || 0,
        isPinned: existingChat?.isPinned || false,
        isArchived: existingChat?.isArchived || false,
        isMuted: existingChat?.isMuted || false,
      };
      chats.set(targetJid, chatEntry);
      saveStore();

      broadcast('message', storedMsg);
      broadcast('chat_update', chatEntry);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: storedMsg }));
    } catch (err) {
      console.error('[WhatsApp Service] Send error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err?.message || 'Send failed' }));
    }
    return;
  }

  // 6b. Delete message (Delete for me vs Delete for everyone)
  if (pathname === '/delete-message' && req.method === 'POST') {
    const { jid, id, forEveryone } = await readBody();
    const canon = toCanonicalJid(jid);

    if (forEveryone && sock && status === 'connected') {
      try {
        await sock.sendMessage(canon, { delete: { remoteJid: canon, fromMe: true, id } });
      } catch (e) {
        console.error('[WhatsApp Service] socket revocation error:', e);
      }
    }

    const list = messages.get(canon) || [];
    if (forEveryone) {
      const msg = list.find((m) => m.id === id);
      if (msg) {
        msg.isDeleted = true;
        msg.deletedForEveryone = true;
        msg.body = '🚫 This message was deleted';
      }
    } else {
      const next = list.filter((m) => m.id !== id);
      messages.set(canon, next);
    }
    saveStore();

    broadcast('message_status', { id, jid: canon, isDeleted: true, deletedForEveryone: Boolean(forEveryone) });
    const last = (messages.get(canon) || []).slice(-1)[0];
    const c = chats.get(canon);
    if (c) {
      c.lastMessage = last ? (last.isDeleted ? '🚫 This message was deleted' : last.body) : '';
      c.timestamp = last?.timestamp || c.timestamp;
      broadcast('chat_update', c);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 6c. Send Emoji Reaction
  if (pathname === '/react' && req.method === 'POST') {
    const { jid, id, emoji, fromMe = true } = await readBody();
    const canon = toCanonicalJid(jid);

    if (sock && status === 'connected') {
      try {
        await sock.sendMessage(canon, { react: { text: emoji, key: { remoteJid: canon, fromMe, id } } });
      } catch (e) {
        console.error('[WhatsApp Service] react error:', e);
      }
    }

    const list = messages.get(canon) || [];
    const target = list.find((m) => m.id === id);
    if (target) {
      target.reactions = target.reactions || {};
      if (emoji) target.reactions[emoji] = 'Me';
      else delete target.reactions;
      saveStore();
      broadcast('message_status', { id, jid: canon, reaction: { emoji, senderName: 'Me' } });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 6d. Clear Chat History
  if (pathname === '/clear-chat' && req.method === 'POST') {
    const { jid } = await readBody();
    const canon = toCanonicalJid(jid);
    messages.set(canon, []);
    const c = chats.get(canon);
    if (c) {
      c.lastMessage = '';
      c.unreadCount = 0;
      saveStore();
      broadcast('chat_update', c);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 6e. Delete Conversation
  if (pathname === '/delete-chat' && req.method === 'POST') {
    const { jid } = await readBody();
    const canon = toCanonicalJid(jid);
    messages.delete(canon);
    chats.delete(canon);
    saveStore();
    broadcast('chat_update', { jid: canon, isDeleted: true });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 6f. Chat Actions (Pin, Archive, Mute)
  if (pathname === '/chat-actions' && req.method === 'POST') {
    const { jid, action, value } = await readBody();
    const canon = toCanonicalJid(jid);
    const c = chats.get(canon);
    if (c) {
      if (action === 'pin') c.isPinned = Boolean(value);
      else if (action === 'archive') c.isArchived = Boolean(value);
      else if (action === 'mute') {
        c.isMuted = Boolean(value);
        c.muteUntil = value || null;
      }
      saveStore();
      broadcast('chat_update', c);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, chat: c }));
    return;
  }

  // 6g. File / Media Upload
  if (pathname === '/upload' && req.method === 'POST') {
    const { base64Data, fileName, mimetype } = await readBody();
    if (!base64Data) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'base64Data is required' }));
      return;
    }
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }
    const ext =
      path.extname(fileName || 'file') ||
      (mimetype?.includes('image')
        ? '.jpg'
        : mimetype?.includes('pdf')
        ? '.pdf'
        : mimetype?.includes('audio')
        ? '.mp3'
        : '.bin');
    const fname = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    const savePath = path.join(uploadsDir, fname);
    fs.writeFileSync(savePath, buffer);
    const mediaUrl = `/uploads/whatsapp/${fname}`;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        url: mediaUrl,
        fileName: fileName || fname,
        mimetype,
        size: buffer.length,
      })
    );
    return;
  }

  // 7. Mark Read
  if (pathname === '/mark-read' && req.method === 'POST') {
    const { jid } = await readBody();
    if (jid && chats.has(jid)) {
      const c = chats.get(jid);
      c.unreadCount = 0;
      saveStore();
      broadcast('chat_update', c);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 8. Logout
  if (pathname === '/logout' && req.method === 'POST') {
    try {
      if (sock) {
        try {
          await sock.logout();
        } catch {}
        try {
          sock.end();
        } catch {}
      }
      sock = null;
      status = 'disconnected';
      connectedPhone = '';
      connectedName = '';
      qrString = null;
      qrDataUrl = null;
      fs.rmSync(authDir, { recursive: true, force: true });
      fs.mkdirSync(authDir, { recursive: true });
      broadcast('status', getStatusPayload());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 9. Reconnect / Reset
  if ((pathname === '/reconnect' || pathname === '/reset') && req.method === 'POST') {
    if (sock) {
      try {
        sock.end();
      } catch {}
      sock = null;
    }
    if (pathname === '/reset') {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
        fs.mkdirSync(authDir, { recursive: true });
      } catch {}
    }
    connectToWhatsApp();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Reconnecting...' }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Auto-reminder runner (24h and 2h before appointments)
const reminderTrackFile = path.join(dataDir, 'reminders_sent.json');
let sentReminders = new Set();
if (fs.existsSync(reminderTrackFile)) {
  try {
    const list = JSON.parse(fs.readFileSync(reminderTrackFile, 'utf-8'));
    if (Array.isArray(list)) sentReminders = new Set(list);
  } catch {}
}

async function checkAndSendAppointmentReminders() {
  if (status !== 'connected' || !sock) return;
  try {
    const response = await fetch('http://localhost:3000/api/cloud/sync');
    if (!response.ok) return;
    const json = await response.json();
    const appts = json?.data?.appointments || [];
    const salon = json?.data?.settings?.salon || 'Shree Beauty Studio';
    const now = Date.now();

    for (const appt of appts) {
      if (!appt.date || !appt.time || !appt.mobile) continue;
      const dateParts = String(appt.date).split('-');
      if (dateParts.length !== 3) continue;

      let hours = 10;
      let minutes = 0;
      const tMatch = String(appt.time).match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (tMatch) {
        hours = parseInt(tMatch[1], 10);
        minutes = parseInt(tMatch[2], 10);
        if (tMatch[3] && tMatch[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (tMatch[3] && tMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      const apptTimestamp = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10),
        hours,
        minutes
      ).getTime();

      const diffMs = apptTimestamp - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      const cleanMob = String(appt.mobile).replace(/\D/g, '').slice(-10);
      if (cleanMob.length !== 10) continue;
      const jid = `91${cleanMob}@s.whatsapp.net`;

      // 24h reminder (between 22.5h and 25.5h before)
      const key24 = `${appt.id}_24h`;
      if (diffHours >= 22.5 && diffHours <= 25.5 && !sentReminders.has(key24)) {
        sentReminders.add(key24);
        fs.writeFileSync(reminderTrackFile, JSON.stringify(Array.from(sentReminders)), 'utf-8');
        const text = `🌸 *APPOINTMENT REMINDER (TOMORROW) — ${salon.toUpperCase()}* 🌸\n\nDear ${appt.customer || 'Client'},\nThis is a gentle reminder that your appointment for *${appt.service || 'Salon Service'}* is tomorrow at *${appt.time}*.\n\n📍 Katargam, Surat\n📞 Call/WhatsApp: +91 98241 83769\nSee you tomorrow! ✨`;
        await sock.sendMessage(jid, { text });
        console.log(`[WhatsApp Reminder] Sent 24h reminder to ${appt.customer} (${cleanMob})`);
      }

      // 2h reminder (between 1.5h and 2.5h before)
      const key2 = `${appt.id}_2h`;
      if (diffHours >= 1.5 && diffHours <= 2.5 && !sentReminders.has(key2)) {
        sentReminders.add(key2);
        fs.writeFileSync(reminderTrackFile, JSON.stringify(Array.from(sentReminders)), 'utf-8');
        const text = `⏰ *APPOINTMENT REMINDER (IN 2 HOURS) — ${salon.toUpperCase()}* ⏰\n\nDear ${appt.customer || 'Client'},\nYour appointment for *${appt.service || 'Salon Service'}* is in about 2 hours at *${appt.time}*.\n\nSpecialist is prepared for your visit. See you soon! 💖`;
        await sock.sendMessage(jid, { text });
        console.log(`[WhatsApp Reminder] Sent 2h reminder to ${appt.customer} (${cleanMob})`);
      }
    }
  } catch (err) {
    // Silent catch
  }
}

// Run auto-reminder check every 5 minutes
setInterval(checkAndSendAppointmentReminders, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`[WhatsApp Backend Service] Running at http://localhost:${PORT}`);
  connectToWhatsApp();
});
