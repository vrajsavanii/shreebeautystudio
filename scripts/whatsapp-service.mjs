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

    if (chats.size === 0) {
      const seedJid = '919601014899@s.whatsapp.net';
      chats.set(seedJid, {
        jid: seedJid,
        name: 'sandip',
        phone: '9601014899',
        lastMessage: 'hi',
        timestamp: new Date().toISOString(),
        unreadCount: 0,
      });
      messages.set(seedJid, [
        {
          id: 'seed_msg_1',
          jid: seedJid,
          fromMe: true,
          type: 'text',
          body: 'hi',
          status: 'read',
          timestamp: new Date().toISOString(),
          senderName: 'sandip',
        },
      ]);
    }
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

        if (statusCode === DisconnectReason.loggedOut) {
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

    const c = m.message;
    if (!c) return null;

    let type = 'text';
    let body = '';
    let mediaUrl = undefined;
    let fileName = undefined;
    let mimetype = undefined;

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
    if (jid && !jid.includes('@')) {
      const clean = jid.replace(/\D/g, '').slice(-10);
      jid = `91${clean}@s.whatsapp.net`;
    }
    const list = jid ? (messages.get(jid) || []) : [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, jid, messages: list, total: list.length }));
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
    let { jid, text, mediaUrl, mediaType, fileName, caption } = body;

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

      if (mediaUrl) {
        const fullLocalPath = mediaUrl.startsWith('/uploads/')
          ? path.join(rootDir, 'public', mediaUrl)
          : null;
        const mediaBuffer = fullLocalPath && fs.existsSync(fullLocalPath)
          ? fs.readFileSync(fullLocalPath)
          : Buffer.from('');

        if (mediaType === 'image') {
          finalType = 'image';
          sentResult = await sock.sendMessage(targetJid, {
            image: mediaBuffer.length > 0 ? mediaBuffer : { url: mediaUrl },
            caption: finalBody,
          });
        } else if (mediaType === 'document') {
          finalType = 'document';
          sentResult = await sock.sendMessage(targetJid, {
            document: mediaBuffer.length > 0 ? mediaBuffer : { url: mediaUrl },
            fileName: fileName || 'document.pdf',
            mimetype: 'application/pdf',
            caption: finalBody,
          });
        } else if (mediaType === 'audio') {
          finalType = 'audio';
          sentResult = await sock.sendMessage(targetJid, {
            audio: mediaBuffer.length > 0 ? mediaBuffer : { url: mediaUrl },
            mimetype: 'audio/mp4',
            ptt: true,
          });
        } else {
          sentResult = await sock.sendMessage(targetJid, { text: finalBody });
        }
      } else {
        sentResult = await sock.sendMessage(targetJid, { text: finalBody });
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
