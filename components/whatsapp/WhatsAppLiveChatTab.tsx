// components/whatsapp/WhatsAppLiveChatTab.tsx
// Exact match to user reference screenshot (media_1791886635049.png)
// WhatsApp Connect Live Chat Tab: Left Contact List + Right Doodle Chat Window

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Check,
  CheckCheck,
  MoreVertical,
  Plus,
  Send,
  FileText,
  Image as ImageIcon,
  Volume2,
  Receipt,
  Sparkles,
  QrCode,
  ArrowDown,
  Lock,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Store,
  Trash2,
  VolumeX,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { getCachedChats, saveCachedChats, getCachedMessages, saveCachedMessages } from '@/lib/whatsapp-cache';

export interface ChatContact {
  jid: string;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  jid: string;
  fromMe: boolean;
  type: string;
  body: string;
  mediaUrl?: string;
  fileName?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  senderName?: string;
}

interface WhatsAppLiveChatTabProps {
  customers?: any[];
  invoices?: any[];
  appointments?: any[];
  salonName?: string;
  onSendInvoice?: (phone: string, name: string) => void;
  onSendBridalCard?: (name: string) => void;
  onSendPartyStatement?: (phone: string, name: string) => void;
  onShowCustomerProfile?: (phone: string, name: string) => void;
}

// ── EXACT WHATSAPP AVATAR (MATCHES SCREENSHOT) ─────────────────────────
function WhatsAppAvatar({ size = 44 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#dfe5e7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <svg viewBox="0 0 40 40" width={size * 0.9} height={size * 0.9} fill="#ffffff">
        <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.33 0-16 2.67-16 8v3h32v-3c0-5.33-10.67-8-16-8z" />
      </svg>
    </div>
  );
}

export default function WhatsAppLiveChatTab({
  customers = [],
  invoices = [],
  appointments = [],
  salonName = 'Shree Beauty Studio',
  onSendInvoice,
  onSendBridalCard,
  onSendPartyStatement,
  onShowCustomerProfile,
}: WhatsAppLiveChatTabProps) {
  const defaultChats: ChatContact[] = [];

  const [chats, setChats] = useState<ChatContact[]>(defaultChats);
  const [selectedJid, setSelectedJid] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});

  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSmartMenu, setShowSmartMenu] = useState(false);
  const [showPartyMenu, setShowPartyMenu] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isSyncingOlder, setIsSyncingOlder] = useState(false);

  // AI Smart replies state
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const outerContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const [attachType, setAttachType] = useState<'image' | 'document' | 'audio'>('image');

  // WhatsApp Web 3-dots Menu States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [mutedChats, setMutedChats] = useState<Record<string, string>>({});
  const [muteModalOpen, setMuteModalOpen] = useState(false);
  const [selectedMuteDuration, setSelectedMuteDuration] = useState<'8 hours' | '1 week' | 'Always'>('8 hours');
  const [disappearingModalOpen, setDisappearingModalOpen] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState<'24 hours' | '7 days' | '90 days' | 'Off'>('Off');
  const [confirmClearModalOpen, setConfirmClearModalOpen] = useState(false);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsMenu]);

  // Keep outer container strictly scrolled to top
  useEffect(() => {
    if (outerContainerRef.current) {
      outerContainerRef.current.scrollTop = 0;
    }
  }, [selectedJid]);

  // 1. Load from IndexedDB on initial mount
  useEffect(() => {
    (async () => {
      const cached = await getCachedChats();
      if (cached && cached.length > 0) {
        setChats((prev) => {
          const map = new Map<string, ChatContact>();
          prev.forEach((c) => map.set(c.jid, c));
          cached.forEach((c) => map.set(c.jid, c));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
      }
    })();
  }, []);

  // 2. Fetch live chats from Baileys
  const fetchLiveChats = async () => {
    try {
      const res = await fetch('/api/whatsapp/chats');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.chats)) {
          setChats((prev) => {
            const map = new Map<string, ChatContact>();
            json.chats.forEach((c: ChatContact) => {
              if (c.phone === '9601014899' || c.jid.includes('9601014899')) return;
              map.set(c.jid, c);
            });
            const sorted = Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            saveCachedChats(sorted);
            setSelectedJid((curr) => {
              if (curr && map.has(curr)) return curr;
              return sorted[0]?.jid || '';
            });
            return sorted;
          });
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchLiveChats();
    const interval = setInterval(fetchLiveChats, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. Fetch messages for active chat
  const fetchChatMessages = async (jid: string) => {
    if (!jid) return;

    // First load cached messages from IndexedDB for instant UI
    const cached = await getCachedMessages(jid);
    if (cached && cached.length > 0) {
      setMessagesMap((prev) => ({ ...prev, [jid]: cached }));
    }

    try {
      const res = await fetch(`/api/whatsapp/messages?jid=${encodeURIComponent(jid)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.messages)) {
          setMessagesMap((prev) => {
            const existing = prev[jid] || [];
            // Merge unique by id
            const idMap = new Map();
            existing.forEach((m) => idMap.set(m.id, m));
            json.messages.forEach((m: ChatMessage) => idMap.set(m.id, m));
            const list = Array.from(idMap.values()).sort(
              (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            saveCachedMessages(jid, list);
            return { ...prev, [jid]: list };
          });
        }
      }
    } catch {}
  };

  useEffect(() => {
    const targetJid = selectedJid || (chats[0]?.jid || '');
    if (!targetJid) return;

    fetchChatMessages(targetJid);
    fetch('/api/whatsapp/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid: targetJid }),
    }).catch(() => {});

    // Live continuous sync: poll messages every 2.5s so newly received messages appear immediately!
    const pollInterval = setInterval(() => {
      fetchChatMessages(targetJid);
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [selectedJid, chats[0]?.jid]);

  // 4. SSE real-time listener for incoming messages & status updates
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/whatsapp/events');

      es.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data) as ChatMessage;
          setMessagesMap((prev) => {
            const list = prev[msg.jid] || [];
            if (list.some((m) => m.id === msg.id)) return prev;
            const updated = [...list, msg];
            saveCachedMessages(msg.jid, updated);
            return { ...prev, [msg.jid]: updated };
          });
          fetchLiveChats();
        } catch {}
      });

      es.addEventListener('chat_update', (e) => {
        try {
          const chat = JSON.parse(e.data) as ChatContact;
          setChats((prev) => {
            const idx = prev.findIndex((c) => c.jid === chat.jid);
            let next: ChatContact[];
            if (idx >= 0) {
              next = [...prev];
              next[idx] = { ...next[idx], ...chat };
            } else {
              next = [chat, ...prev];
            }
            const sorted = next.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            saveCachedChats(sorted);
            return sorted;
          });
        } catch {}
      });

      es.addEventListener('message_status', (e) => {
        try {
          const { id, jid, status } = JSON.parse(e.data);
          setMessagesMap((prev) => {
            const list = prev[jid];
            if (!list) return prev;
            const updated = list.map((m) => (m.id === id ? { ...m, status } : m));
            saveCachedMessages(jid, updated);
            return { ...prev, [jid]: updated };
          });
        } catch {}
      });
    } catch {}

    return () => {
      if (es) es.close();
    };
  }, []);

  // 5. Active chat object
  const activeChat = useMemo(() => {
    return chats.find((c) => c.jid === selectedJid) || chats[0] || null;
  }, [chats, selectedJid]);

  const activeMessages = useMemo(() => {
    if (!activeChat) return [];
    return messagesMap[activeChat.jid] || [];
  }, [messagesMap, activeChat]);

  // 6. Filtered chat list with name AND phone search
  const filteredChats = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return chats;
    return chats.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q);
      return nameMatch || phoneMatch;
    });
  }, [chats, searchQuery]);

  // 7. Auto-scroll on new message (Using direct scrollTop on message container to NEVER scroll outer page/header)
  useEffect(() => {
    if (!showScrollBottom && chatScrollContainerRef.current) {
      const container = chatScrollContainerRef.current;
      // Scroll only inside the message stream container
      container.scrollTop = container.scrollHeight;
    }
  }, [activeMessages, showScrollBottom]);

  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    setShowScrollBottom(false);
  };

  // 8. Fetch AI Smart Replies for Active Chat
  const loadAiReplies = async () => {
    if (!activeChat) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/whatsapp/ai-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: activeChat.name || 'Client',
          lastMessages: activeMessages.slice(-10),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.suggestions) && json.suggestions.length > 0) {
          setAiSuggestions(json.suggestions);
          setIsAiLoading(false);
          return;
        }
      }
    } catch {}

    const hour = new Date().getHours();
    const tod = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    setAiSuggestions([
      `Hello ${activeChat.name || 'Client'}, how can we help?`,
      `${tod} ${activeChat.name || 'Client'}! What can we do for you?`,
      `Hi ${activeChat.name || 'Client'}, hope you're well.`,
    ]);
    setIsAiLoading(false);
  };

  useEffect(() => {
    loadAiReplies();
  }, [activeChat?.jid]);

  // 9. Send Message handler with instant optimistic bubble
  const handleSendMessage = async (textToSend?: string, media?: { mediaUrl: string; mediaType: string; fileName?: string }) => {
    const body = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!body && !media) return;
    if (!activeChat) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      jid: activeChat.jid,
      fromMe: true,
      type: media ? media.mediaType : 'text',
      body: body || (media ? media.fileName || 'Attachment' : ''),
      mediaUrl: media?.mediaUrl,
      fileName: media?.fileName,
      status: 'sent',
      timestamp: new Date().toISOString(),
      senderName: 'Me',
    };

    // Instant optimistic update
    setMessagesMap((prev) => {
      const list = prev[activeChat.jid] || [];
      return { ...prev, [activeChat.jid]: [...list, optimisticMsg] };
    });

    // Instant chat preview update
    setChats((prev) => {
      return prev.map((c) =>
        c.jid === activeChat.jid
          ? { ...c, lastMessage: optimisticMsg.body, timestamp: optimisticMsg.timestamp }
          : c
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });

    if (textToSend === undefined) {
      setInputText('');
    }

    try {
      const payload: any = {
        jid: activeChat.jid,
        text: body,
      };
      if (media) {
        payload.mediaUrl = media.mediaUrl;
        payload.mediaType = media.mediaType;
        payload.fileName = media.fileName;
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.message) {
          setMessagesMap((prev) => {
            const list = prev[activeChat.jid] || [];
            return {
              ...prev,
              [activeChat.jid]: list.map((m) => (m.id === tempId ? { ...json.message, status: 'delivered' } : m)),
            };
          });
        }
      } else {
        setMessagesMap((prev) => {
          const list = prev[activeChat.jid] || [];
          return {
            ...prev,
            [activeChat.jid]: list.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
          };
        });
      }
    } catch {
      setMessagesMap((prev) => {
        const list = prev[activeChat.jid] || [];
        return {
          ...prev,
          [activeChat.jid]: list.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
        };
      });
    }
  };

  // 10. Sync older messages simulator / fetcher
  const handleSyncOlder = async () => {
    setIsSyncingOlder(true);
    if (activeChat) {
      await fetchChatMessages(activeChat.jid);
    }
    setTimeout(() => {
      setIsSyncingOlder(false);
    }, 1200);
  };

  // 11. File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await handleSendMessage('', {
        mediaUrl: base64Data,
        mediaType: attachType,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const triggerUpload = (type: 'image' | 'document' | 'audio') => {
    setAttachType(type);
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*';
      else if (type === 'document') fileInputRef.current.accept = '.pdf,.doc,.docx,.txt';
      else if (type === 'audio') fileInputRef.current.accept = 'audio/*';
      fileInputRef.current.click();
    }
  };

  // Helper for message date chips
  const formatDateChip = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isToday(d)) return 'TODAY';
      if (isYesterday(d)) return 'YESTERDAY';
      return format(d, 'MM/dd/yyyy');
    } catch {
      return 'TODAY';
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: Array<{ date: string; messages: ChatMessage[] }> = [];
    activeMessages.forEach((msg) => {
      const dateKey = formatDateChip(msg.timestamp);
      let g = groups.find((item) => item.date === dateKey);
      if (!g) {
        g = { date: dateKey, messages: [] };
        groups.push(g);
      }
      g.messages.push(msg);
    });
    return groups;
  }, [activeMessages]);

  const menuItemStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    padding: '9px 24px',
    border: 'none',
    background: 'none',
    fontSize: 14,
    fontWeight: 400,
    color: '#3b4a54',
    cursor: 'pointer',
    display: 'block',
    transition: 'background 0.1s ease',
    outline: 'none',
  };

  return (
    <div
      ref={outerContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        minWidth: 0,
        background: '#ffffff',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        height: 'calc(100vh - 120px)',
        minHeight: 600,
        maxHeight: 'calc(100vh - 110px)',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── LEFT PANEL: SEARCH & CHAT LIST (PERMANENTLY VISIBLE, NEVER HIDDEN) ── */}
      <div
        style={{
          width: 320,
          minWidth: 280,
          maxWidth: 340,
          flexShrink: 0,
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Top Search Pill Input (Exact match to screenshot with magnifying glass) */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f2f5' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 20,
              padding: '4px 12px',
              gap: 8,
              height: 34,
            }}
          >
            <Search size={14} color="#667781" />
            <input
              type="text"
              placeholder="Search by name or number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 12.5,
                width: '100%',
                color: '#111b21',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Contact List */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {filteredChats.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              No contact found for &quot;{searchQuery}&quot;
              {searchQuery.replace(/\D/g, '').length >= 10 && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = searchQuery.replace(/\D/g, '').slice(-10);
                      const jid = `91${clean}@s.whatsapp.net`;
                      const newC: ChatContact = {
                        jid,
                        name: clean,
                        phone: clean,
                        lastMessage: 'Ready to chat',
                        timestamp: new Date().toISOString(),
                        unreadCount: 0,
                      };
                      setChats((prev) => [newC, ...prev]);
                      setSelectedJid(jid);
                    }}
                    style={{
                      background: '#05424A',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Start chat with {searchQuery}
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredChats.map((c) => {
              const isSelected = activeChat?.jid === c.jid;
              const formattedTime = c.timestamp
                ? format(new Date(c.timestamp), 'h:mm a')
                : '3:46 PM';

              return (
                <div
                  key={c.jid}
                  onClick={() => {
                    setSelectedJid(c.jid);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f8fafc',
                    background: isSelected ? '#eef3f5' : '#ffffff',
                    borderLeft: isSelected ? '4px solid #05424A' : '4px solid transparent',
                    transition: 'background 0.15s ease, border-left-color 0.15s ease',
                  }}
                >
                  {/* Round Avatar Icon (Matching exact grey circle from screenshot) */}
                  <WhatsAppAvatar size={42} />

                  {/* Name & Snippet */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#111b21',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.name || c.phone}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {mutedChats[c.jid] && <VolumeX size={12} color="#8696a0" />}
                        <span style={{ fontSize: 11, color: '#667781' }}>
                          {formattedTime}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#667781',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                        }}
                      >
                        {/* Checkmark icon for last message */}
                        <CheckCheck size={14} color="#53bdeb" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.lastMessage ? c.lastMessage : 'Messages are end-to-end encrypted.'}
                        </span>
                      </div>

                      {/* Green unread count badge */}
                      {c.unreadCount > 0 && (
                        <span
                          style={{
                            background: '#25D366',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 800,
                            borderRadius: 99,
                            padding: '1px 6px',
                            minWidth: 18,
                            textAlign: 'center',
                            marginLeft: 6,
                          }}
                        >
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: CHAT WINDOW OR WHATSAPP EMPTY STATE (EXACT SCREENSHOT MATCH) ── */}
      {!activeChat ? (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: '#f0f2f5',
            padding: 32,
            textAlign: 'center',
            borderLeft: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37,211,102,0.25)',
              marginBottom: 20,
            }}
          >
            <MessageCircle size={44} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 300, color: '#41525d', margin: '0 0 10px' }}>
            WhatsApp Web
          </h2>
          <p style={{ fontSize: 13.5, color: '#667781', maxWidth: 440, lineHeight: 1.6, margin: '0 0 32px' }}>
            Send and receive messages without keeping your phone online.<br />
            Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#8696a0', marginTop: 'auto' }}>
            <Lock size={12} color="#8696a0" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#efeae2 url(/images/whatsapp-doodle-bg.svg) repeat',
            backgroundSize: '412px 412px',
            overflow: 'hidden',
          }}
        >
          {/* Chat Top Bar: Selection Mode OR Normal Top Bar */}
          {isSelectionMode ? (
            <div
              style={{
                height: 54,
                background: '#008069',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                flexShrink: 0,
                width: '100%',
                minWidth: 0,
                position: 'sticky',
                top: 0,
                zIndex: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedMessageIds(new Set());
                  }}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
                  title="Cancel selection"
                >
                  <X size={20} />
                </button>
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  {selectedMessageIds.size} selected
                </span>
              </div>

              {selectedMessageIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeChat) {
                      setMessagesMap((prev) => ({
                        ...prev,
                        [activeChat.jid]: (prev[activeChat.jid] || []).filter((m) => !selectedMessageIds.has(m.id)),
                      }));
                    }
                    setIsSelectionMode(false);
                    setSelectedMessageIds(new Set());
                  }}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 6 }}
                  title="Delete selected messages"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                height: 54,
                background: '#f0f2f5',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                flexShrink: 0,
                width: '100%',
                minWidth: 0,
                position: 'sticky',
                top: 0,
                zIndex: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Avatar */}
                <WhatsAppAvatar size={36} />

                {/* Contact Name & Muted Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#111b21' }}>
                    {activeChat?.name || activeChat?.phone || 'Select a chat'}
                  </span>
                  {activeChat && mutedChats[activeChat.jid] && (
                    <span title={`Muted for ${mutedChats[activeChat.jid]}`}>
                      <VolumeX size={14} color="#8696a0" />
                    </span>
                  )}
                </div>
              </div>

              {/* Three dots ⋮ Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 6,
                    cursor: 'pointer',
                    color: '#54656f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Menu"
                >
                  <MoreVertical size={18} />
                </button>

                {showOptionsMenu && (
                  <div
                    ref={optionsMenuRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 4,
                      background: '#ffffff',
                      borderRadius: 8,
                      boxShadow: '0 4px 24px rgba(11,20,26,0.18)',
                      border: '1px solid #e2e8f0',
                      width: 200,
                      zIndex: 50,
                      padding: '6px 0',
                    }}
                  >
                    {/* 1. Contact info */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        if (activeChat && onShowCustomerProfile) {
                          onShowCustomerProfile(activeChat.phone, activeChat.name);
                        }
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f6f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={menuItemStyle}
                    >
                      Contact info
                    </button>

                    {/* 2. Select messages */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setIsSelectionMode(true);
                        setSelectedMessageIds(new Set());
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f6f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={menuItemStyle}
                    >
                      Select messages
                    </button>

                    {/* 3. Close chat */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setSelectedJid('');
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f6f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={menuItemStyle}
                    >
                      Close chat
                    </button>

                    {/* 4. Mute notifications / Unmute */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        if (activeChat && mutedChats[activeChat.jid]) {
                          setMutedChats((prev) => {
                            const next = { ...prev };
                            delete next[activeChat.jid];
                            return next;
                          });
                        } else {
                          setMuteModalOpen(true);
                        }
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f6f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={menuItemStyle}
                    >
                      {activeChat && mutedChats[activeChat.jid] ? 'Unmute notifications' : 'Mute notifications'}
                    </button>

                    {/* 5. Disappearing messages */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setDisappearingModalOpen(true);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f6f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={menuItemStyle}
                    >
                      Disappearing messages
                    </button>

                    {/* 6. Clear chat */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setConfirmClearModalOpen(true);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f6f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={menuItemStyle}
                    >
                      Clear chat
                    </button>

                    {/* 7. Delete chat */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setConfirmDeleteModalOpen(true);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f6f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={menuItemStyle}
                    >
                      Delete chat
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Message Stream Area */}
        <div
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '12px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            position: 'relative',
          }}
        >
          {/* Top Pill Button: "Click here to sync older messages from your phone" (Matches screenshot) */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px' }}>
            <button
              type="button"
              onClick={handleSyncOlder}
              disabled={isSyncingOlder}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 99,
                padding: '6px 16px',
                fontSize: 11,
                fontWeight: 600,
                color: '#54656f',
                cursor: isSyncingOlder ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(11,20,26,0.1)',
              }}
            >
              <RefreshCw size={11} className={isSyncingOlder ? 'animate-spin' : ''} color="#54656f" />
              <span>Click here to sync older messages from your phone</span>
            </button>
          </div>

          {groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Date Chip (e.g. 09/22/2026 or TODAY - Matches screenshot pill) */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 4px' }}>
                <span
                  style={{
                    background: '#ffffff',
                    color: '#54656f',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 6,
                    boxShadow: '0 1px 2px rgba(11,20,26,0.1)',
                  }}
                >
                  {group.date}
                </span>
              </div>

              {/* Yellow End-to-End Encryption Notice (Under the very first date chip - Matches screenshot) */}
              {groupIdx === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 8px' }}>
                  <div
                    style={{
                      background: '#ffeecd',
                      color: '#54656f',
                      fontSize: 11,
                      padding: '6px 14px',
                      borderRadius: 8,
                      maxWidth: 480,
                      textAlign: 'center',
                      lineHeight: 1.45,
                      boxShadow: '0 1px 2px rgba(11,20,26,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Lock size={12} color="#b45309" style={{ flexShrink: 0 }} />
                    <span>
                      Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
                    </span>
                  </div>
                </div>
              )}

              {/* Message Bubbles */}
              {group.messages.map((msg) => {
                const isOut = Boolean(msg.fromMe);
                const timeText = msg.timestamp ? format(new Date(msg.timestamp), 'h:mm a') : '3:46 PM';
                const isUndecrypted = !msg.body || msg.body.includes("can't be displayed");
                const isSelected = selectedMessageIds.has(msg.id);

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        setSelectedMessageIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(msg.id)) next.delete(msg.id);
                          else next.add(msg.id);
                          return next;
                        });
                      }
                    }}
                    style={{
                      alignSelf: isOut ? 'flex-end' : 'flex-start',
                      maxWidth: isSelectionMode ? '85%' : '75%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexDirection: isOut ? 'row' : 'row-reverse',
                      cursor: isSelectionMode ? 'pointer' : 'default',
                    }}
                  >
                    {isSelectionMode && (
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: isSelected ? '2px solid #00a884' : '2px solid #8696a0',
                          background: isSelected ? '#00a884' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
                      </div>
                    )}
                    <div
                      style={{
                        background: isOut ? '#d9fdd3' : '#ffffff',
                        color: '#111b21',
                        borderRadius: isOut ? '8px 8px 0 8px' : '8px 8px 8px 0',
                        padding: '6px 10px',
                        fontSize: 13,
                        lineHeight: 1.45,
                        boxShadow: '0 1px 1.5px rgba(11,20,26,0.13)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {/* Sender name for received messages */}
                      {!isOut && msg.senderName && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#05424A', marginBottom: 2 }}>
                          {msg.senderName}
                        </div>
                      )}

                      {/* Media Image */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div style={{ marginBottom: 4, borderRadius: 6, overflow: 'hidden' }}>
                          <img
                            src={msg.mediaUrl}
                            alt="Photo"
                            style={{ maxWidth: '100%', maxHeight: 240, display: 'block', borderRadius: 6 }}
                          />
                        </div>
                      )}

                      {/* Media Document */}
                      {msg.type === 'document' && msg.mediaUrl && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 10px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            marginBottom: 6,
                          }}
                        >
                          <FileText size={20} color="#05424A" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.fileName || 'document.pdf'}
                            </div>
                            <a
                              href={msg.mediaUrl}
                              download={msg.fileName || 'document.pdf'}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 11, color: '#0369a1', textDecoration: 'underline' }}
                            >
                              Download File
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Media Audio / Voice Note */}
                      {msg.type === 'audio' && msg.mediaUrl && (
                        <div style={{ marginBottom: 6, minWidth: 200 }}>
                          <audio controls src={msg.mediaUrl} style={{ width: '100%', height: 36 }} />
                        </div>
                      )}

                      {/* Text Body */}
                      {isUndecrypted ? (
                        <span style={{ fontStyle: 'italic', color: '#166534', opacity: 0.95 }}>
                          This message can&apos;t be displayed here
                        </span>
                      ) : (
                        <span>{msg.body}</span>
                      )}

                      {/* Timestamp & Delivery Ticks (Float right inline) */}
                      <div
                        style={{
                          alignSelf: 'flex-end',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: 10,
                          color: '#667781',
                          marginTop: 2,
                          float: 'right',
                          marginLeft: 8,
                        }}
                      >
                        <span>{timeText}</span>
                        {isOut && (
                          msg.status === 'failed' ? (
                            <button
                              type="button"
                              onClick={() => handleSendMessage(msg.body)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#dc2626' }}
                              title="Failed - click to retry"
                            >
                              <AlertCircle size={12} color="#dc2626" />
                            </button>
                          ) : msg.status === 'sent' ? (
                            <Check size={13} color="#8696a0" />
                          ) : msg.status === 'read' ? (
                            <CheckCheck size={14} color="#53bdeb" />
                          ) : (
                            <CheckCheck size={14} color="#53bdeb" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll To Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              bottom: 120,
              right: 28,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#54656f',
              zIndex: 30,
            }}
            title="Scroll to bottom"
          >
            <ArrowDown size={18} />
          </button>
        )}

        {/* ── QUICK ACTION ROW DIRECTLY ABOVE INPUT (EXACT MATCH TO SCREENSHOT) ── */}
        <div
          style={{
            padding: '6px 14px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            position: 'relative',
            flexWrap: 'wrap',
            minWidth: 0,
          }}
        >
          {/* 1. Smart Messaging Button (Orange Border + Chevron) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowSmartMenu((o) => !o);
                setShowPartyMenu(false);
                setShowAttachMenu(false);
              }}
              style={{
                background: '#fffdfa',
                border: '1.5px solid #d97706',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(217,119,6,0.15)',
              }}
            >
              <Sparkles size={13} color="#d97706" />
              <span>Smart Messaging</span>
              {showSmartMenu ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Smart Messaging Dropdown & AI Suggestions */}
            {showSmartMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: 8,
                  background: '#ffffff',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  width: 320,
                  zIndex: 40,
                  padding: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px 8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#05424A', textTransform: 'uppercase' }}>
                    🤖 AI Suggested Replies
                  </span>
                  <button
                    type="button"
                    onClick={loadAiReplies}
                    disabled={isAiLoading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 11 }}
                  >
                    <RefreshCw size={11} className={isAiLoading ? 'animate-spin' : ''} />
                    <span>{isAiLoading ? 'Thinking...' : 'Regenerate'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
                  {aiSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(s);
                        setShowSmartMenu(false);
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#1e293b',
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '6px 8px 4px', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderTop: '1px solid #f1f5f9' }}>
                  Instant Salon Templates
                </div>
                {[
                  {
                    title: '📅 Booking Confirmation',
                    msg: `✨ *APPOINTMENT CONFIRMED — ${salonName.toUpperCase()}* ✨\n\nDear ${activeChat?.name || 'Client'},\nYour salon appointment is confirmed for today!\n📍 Katargam, Surat\nSee you soon! 💖`,
                  },
                  {
                    title: '🧾 Digital Bill & Receipt',
                    msg: `🧾 *DIGITAL INVOICE — ${salonName.toUpperCase()}* 🧾\n\nDear ${activeChat?.name || 'Client'},\nThank you for visiting us! Your latest salon bill has been recorded.\nHave a wonderful glowing day! ✨`,
                  },
                  {
                    title: '🎂 Birthday Treat (20% OFF)',
                    msg: `🎉 *HAPPY BIRTHDAY ${activeChat?.name?.toUpperCase() || 'CLIENT'}!* 🎂\n\nFrom all of us at Shree Beauty Studio, enjoy flat 20% OFF on all hair spa & Hydra facials today! 🎁✨`,
                  },
                ].map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInputText(item.msg);
                      setShowSmartMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'none',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Party Statement Button (Red PDF icon + chevron) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowPartyMenu((o) => !o);
                setShowSmartMenu(false);
                setShowAttachMenu(false);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  background: '#e11d48',
                  color: '#ffffff',
                  fontSize: 8.5,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Pdf
              </div>
              <span>Party Statement</span>
              {showPartyMenu ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showPartyMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: 8,
                  background: '#ffffff',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  width: 220,
                  zIndex: 40,
                  padding: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (activeChat && onSendPartyStatement) {
                      onSendPartyStatement(activeChat.phone, activeChat.name);
                    }
                    setShowPartyMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer',
                  }}
                >
                  📊 Send Party Ledger (Khata)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeChat && onSendInvoice) {
                      onSendInvoice(activeChat.phone, activeChat.name);
                    }
                    setShowPartyMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer',
                  }}
                >
                  🧾 Send Latest Invoice PDF
                </button>
              </div>
            )}
          </div>

          {/* 3. Share Online Store Button (Blue store icon) */}
          <button
            type="button"
            onClick={() => {
              const storeMsg = `👑 *SHREE BEAUTY STUDIO — ONLINE BOOKING & MENU* 👑\n\nDear ${activeChat?.name || 'Client'},\nExplore our salon services and packages online:\n🌐 https://shreebeautystudio.com\n\n📍 Katargam, Surat\n📞 Call/WhatsApp: +91 98241 83769`;
              setInputText(storeMsg);
            }}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Store size={14} color="#0284c7" />
            <span>Share Online Store</span>
          </button>
        </div>

        {/* ── INPUT BAR: "+" ATTACH, TEXT INPUT, SEND ARROW ── */}
        <div
          style={{
            background: '#f0f2f5',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
            width: '100%',
            minWidth: 0,
          }}
        >
          {/* "+" Attach Menu Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: '#54656f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Attach"
            >
              <Plus size={22} />
            </button>

            {showAttachMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: 8,
                  background: '#ffffff',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  width: 230,
                  zIndex: 40,
                  padding: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() => triggerUpload('image')}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', background: 'none', fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ImageIcon size={14} color="#0284c7" /> <span>Photos & Images</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerUpload('document')}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', background: 'none', fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <FileText size={14} color="#dc2626" /> <span>Document (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerUpload('audio')}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', background: 'none', fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Volume2 size={14} color="#7c3aed" /> <span>Audio / Voice Note</span>
                </button>
                <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                <button
                  type="button"
                  onClick={() => {
                    if (activeChat && onSendInvoice) {
                      onSendInvoice(activeChat.phone, activeChat.name);
                    }
                    setShowAttachMenu(false);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', background: 'none', fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Receipt size={14} color="#16a34a" /> <span>Invoice Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeChat && onSendBridalCard) {
                      onSendBridalCard(activeChat.name);
                    }
                    setShowAttachMenu(false);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', background: 'none', fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Sparkles size={14} color="#d97706" /> <span>Bridal Rate Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendMessage(`💳 *PAYMENT QR CODE & UPI — ${salonName}*\n\nGPay / PhonePe / Paytm: 98241 83769@upi\nStudio WhatsApp: +91 98241 83769`);
                    setShowAttachMenu(false);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', background: 'none', fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <QrCode size={14} color="#0284c7" /> <span>Payment UPI QR</span>
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>

          {/* Text Input "Type a Message" */}
          <input
            type="text"
            placeholder="Type a Message"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            style={{
              flex: 1,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '9px 14px',
              fontSize: 13,
              outline: 'none',
              color: '#111b21',
            }}
          />

          {/* Send Arrow Button (Paper-airplane icon from screenshot) */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              color: inputText.trim() ? '#05424A' : '#54656f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            title="Send Message (Enter)"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    )}

      {/* ── MODAL 1: Mute Notifications (WhatsApp Web Style) ── */}
      {muteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setMuteModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: 360,
              boxShadow: '0 12px 36px rgba(11,20,26,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: '#111b21', marginBottom: 16 }}>
              Mute notifications for {activeChat?.name || activeChat?.phone}?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {(['8 hours', '1 week', 'Always'] as const).map((dur) => (
                <label key={dur} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#3b4a54' }}>
                  <input
                    type="radio"
                    name="muteDur"
                    checked={selectedMuteDuration === dur}
                    onChange={() => setSelectedMuteDuration(dur)}
                    style={{ accentColor: '#00a884', width: 16, height: 16 }}
                  />
                  <span>{dur}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setMuteModalOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 20,
                  padding: '7px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#00a884',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeChat) {
                    setMutedChats((prev) => ({ ...prev, [activeChat.jid]: selectedMuteDuration }));
                  }
                  setMuteModalOpen(false);
                }}
                style={{
                  background: '#00a884',
                  border: 'none',
                  borderRadius: 20,
                  padding: '7px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Mute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Disappearing Messages (WhatsApp Web Style) ── */}
      {disappearingModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setDisappearingModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: 380,
              boxShadow: '0 12px 36px rgba(11,20,26,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: '#111b21', marginBottom: 10 }}>
              Disappearing messages
            </div>
            <p style={{ fontSize: 13, color: '#667781', lineHeight: 1.5, margin: '0 0 16px' }}>
              For more privacy and storage, new messages will disappear from this chat for everyone after the selected duration.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {(['24 hours', '7 days', '90 days', 'Off'] as const).map((d) => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#3b4a54' }}>
                  <input
                    type="radio"
                    name="disappearDur"
                    checked={disappearingDuration === d}
                    onChange={() => setDisappearingDuration(d)}
                    style={{ accentColor: '#00a884', width: 16, height: 16 }}
                  />
                  <span>{d}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDisappearingModalOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 20,
                  padding: '7px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#00a884',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setDisappearingModalOpen(false)}
                style={{
                  background: '#00a884',
                  border: 'none',
                  borderRadius: 20,
                  padding: '7px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Clear Chat Confirmation (WhatsApp Web Style) ── */}
      {confirmClearModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setConfirmClearModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: 380,
              boxShadow: '0 12px 36px rgba(11,20,26,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: '#111b21', marginBottom: 10 }}>
              Clear this chat?
            </div>
            <p style={{ fontSize: 13.5, color: '#667781', lineHeight: 1.5, margin: '0 0 24px' }}>
              Messages will only be removed from this device and cannot be recovered.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmClearModalOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 20,
                  padding: '7px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#00a884',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeChat) {
                    setMessagesMap((prev) => ({ ...prev, [activeChat.jid]: [] }));
                  }
                  setConfirmClearModalOpen(false);
                }}
                style={{
                  background: '#ea0038',
                  border: 'none',
                  borderRadius: 20,
                  padding: '7px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Clear chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Delete Chat Confirmation (WhatsApp Web Style) ── */}
      {confirmDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setConfirmDeleteModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: 380,
              boxShadow: '0 12px 36px rgba(11,20,26,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: '#111b21', marginBottom: 10 }}>
              Delete this chat?
            </div>
            <p style={{ fontSize: 13.5, color: '#667781', lineHeight: 1.5, margin: '0 0 24px' }}>
              Messages will be deleted from your phone and this device.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteModalOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 20,
                  padding: '7px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#00a884',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeChat) {
                    const deletedJid = activeChat.jid;
                    setChats((prev) => {
                      const updated = prev.filter((c) => c.jid !== deletedJid);
                      saveCachedChats(updated);
                      return updated;
                    });
                    setMessagesMap((prev) => {
                      const next = { ...prev };
                      delete next[deletedJid];
                      return next;
                    });
                    setSelectedJid('');
                  }
                  setConfirmDeleteModalOpen(false);
                }}
                style={{
                  background: '#ea0038',
                  border: 'none',
                  borderRadius: 20,
                  padding: '7px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Delete chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
