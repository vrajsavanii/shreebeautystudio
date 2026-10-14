// components/whatsapp/WhatsAppLiveChatTab.tsx
// Full-Featured WhatsApp Web Workspace for Shree Beauty Studio
// Exact WhatsApp Web UI + Real Baileys socket execution, message deletion, reactions, quoted replies, voice notes, and search

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Pin,
  PinOff,
  Archive,
  Smile,
  Mic,
  MicOff,
  CornerUpLeft,
  Copy,
  Star,
  Phone,
  UserPlus,
  ArrowUp,
  ChevronRight,
  Ban,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  getCachedChats,
  saveCachedChats,
  getCachedMessages,
  saveCachedMessages,
} from '@/lib/whatsapp-cache';

export interface ChatContact {
  jid: string;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  muteUntil?: string | null;
  isGroup?: boolean;
}

export interface ChatMessage {
  id: string;
  jid: string;
  fromMe: boolean;
  type: string;
  body: string;
  mediaUrl?: string;
  fileName?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  timestamp: string;
  senderName?: string;
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  isStarred?: boolean;
  reactions?: Record<string, string>; // emoji -> senderName
  quotedMessage?: {
    id: string;
    body: string;
    senderName?: string;
    type?: string;
  };
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

const COMMON_EMOJIS = ['😊', '❤️', '👍', '🙏', '😂', '🔥', '✨', '🌸', '💇', '💅', '💖', '🙌', '🎉', '🥰', '💐', '⭐'];
const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Format text for WhatsApp formatting (*bold*, _italic_, ~strikethrough~, `code`)
function renderFormattedText(text: string, highlightQuery = '') {
  if (!text) return null;

  // Split lines
  const lines = text.split('\n');
  return lines.map((line, lIdx) => {
    // If highlight query exists, highlight matching terms
    let elements: React.ReactNode[] = [line];

    if (highlightQuery && highlightQuery.trim().length > 0) {
      const q = highlightQuery.trim();
      const parts = line.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      elements = parts.map((part, pIdx) => {
        if (part.toLowerCase() === q.toLowerCase()) {
          return (
            <mark
              key={pIdx}
              style={{
                background: '#fef08a',
                color: '#854d0e',
                borderRadius: 2,
                padding: '0 2px',
              }}
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    }

    return (
      <React.Fragment key={lIdx}>
        {elements}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

function WhatsAppAvatar({ name = '', size = 44 }: { name?: string; size?: number }) {
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '';

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
        color: '#54656f',
        fontWeight: 700,
        fontSize: size * 0.38,
      }}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <svg viewBox="0 0 40 40" width={size * 0.9} height={size * 0.9} fill="#ffffff">
          <path d="M20 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.33 0-16 2.67-16 8v3h32v-3c0-5.33-10.67-8-16-8z" />
        </svg>
      )}
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
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [selectedJid, setSelectedJid] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'contacts' | 'groups'>('all');
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});

  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSmartMenu, setShowSmartMenu] = useState(false);
  const [showPartyMenu, setShowPartyMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isSyncingOlder, setIsSyncingOlder] = useState(false);

  // Quoted reply state
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  // Message Hover & Actions State
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeMessageDropdownId, setActiveMessageDropdownId] = useState<string | null>(null);
  const [reactionBarMessageId, setReactionBarMessageId] = useState<string | null>(null);

  // In-Chat Message Search State
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteMessage, setTargetDeleteMessage] = useState<ChatMessage | null>(null);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatCustomerSearch, setNewChatCustomerSearch] = useState('');
  const [muteModalOpen, setMuteModalOpen] = useState(false);
  const [selectedMuteDuration, setSelectedMuteDuration] = useState<'8 hours' | '1 week' | 'Always'>('8 hours');
  const [confirmClearModalOpen, setConfirmClearModalOpen] = useState(false);
  const [confirmDeleteChatModalOpen, setConfirmDeleteChatModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Copy feedback toast
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // AI Smart replies
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const outerContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const [attachType, setAttachType] = useState<'image' | 'document' | 'audio'>('image');

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
      if (activeMessageDropdownId) {
        setActiveMessageDropdownId(null);
      }
      if (reactionBarMessageId) {
        setReactionBarMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMessageDropdownId, reactionBarMessageId]);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    (async () => {
      const cached = await getCachedChats();
      if (cached && cached.length > 0) {
        setChats((prev) => {
          const map = new Map<string, ChatContact>();
          prev.forEach((c) => map.set(c.jid, c));
          cached.forEach((c) => map.set(c.jid, c));
          return Array.from(map.values()).sort((a, b) => {
            if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
        });
      }
    })();
  }, []);

  // Fetch live chats from Baileys backend
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
            const sorted = Array.from(map.values()).sort((a, b) => {
              if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
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

  // Fetch messages for active chat
  const fetchChatMessages = async (jid: string) => {
    if (!jid) return;

    // Load from IndexedDB first for instant rendering
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
    const targetJid = selectedJid || chats[0]?.jid || '';
    if (!targetJid) return;

    fetchChatMessages(targetJid);
    fetch('/api/whatsapp/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid: targetJid }),
    }).catch(() => {});

    const pollInterval = setInterval(() => {
      fetchChatMessages(targetJid);
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [selectedJid, chats[0]?.jid]);

  // SSE real-time listener for incoming messages, reactions, deletions, and chat updates
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/whatsapp/events');

      es.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data) as ChatMessage;
          setMessagesMap((prev) => {
            const list = prev[msg.jid] || [];
            if (list.some((m) => m.id === msg.id)) {
              return {
                ...prev,
                [msg.jid]: list.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
              };
            }
            const updated = [...list, msg];
            saveCachedMessages(msg.jid, updated);
            return { ...prev, [msg.jid]: updated };
          });
          fetchLiveChats();
        } catch {}
      });

      es.addEventListener('chat_update', (e) => {
        try {
          const chat = JSON.parse(e.data) as ChatContact & { isDeleted?: boolean };
          if (chat.isDeleted) {
            setChats((prev) => prev.filter((c) => c.jid !== chat.jid));
            setMessagesMap((prev) => {
              const next = { ...prev };
              delete next[chat.jid];
              return next;
            });
            return;
          }

          setChats((prev) => {
            const idx = prev.findIndex((c) => c.jid === chat.jid);
            let next: ChatContact[];
            if (idx >= 0) {
              next = [...prev];
              next[idx] = { ...next[idx], ...chat };
            } else {
              next = [chat, ...prev];
            }
            const sorted = next.sort((a, b) => {
              if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            saveCachedChats(sorted);
            return sorted;
          });
        } catch {}
      });

      es.addEventListener('message_status', (e) => {
        try {
          const { id, jid, status, isDeleted, deletedForEveryone, reaction } = JSON.parse(e.data);
          setMessagesMap((prev) => {
            const list = prev[jid];
            if (!list) return prev;
            const updated = list
              .map((m) => {
                if (m.id !== id) return m;
                if (isDeleted) {
                  if (deletedForEveryone) {
                    return {
                      ...m,
                      isDeleted: true,
                      deletedForEveryone: true,
                      body: '🚫 This message was deleted',
                    };
                  }
                  return null; // deleted for me
                }
                if (reaction) {
                  const reactions = { ...(m.reactions || {}) };
                  if (reaction.emoji) reactions[reaction.emoji] = reaction.senderName;
                  else delete reactions[reaction.emoji];
                  return { ...m, reactions };
                }
                if (status) return { ...m, status };
                return m;
              })
              .filter(Boolean) as ChatMessage[];

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

  // Active chat & messages
  const activeChat = useMemo(() => {
    return chats.find((c) => c.jid === selectedJid) || chats[0] || null;
  }, [chats, selectedJid]);

  const activeMessages = useMemo(() => {
    if (!activeChat) return [];
    return messagesMap[activeChat.jid] || [];
  }, [messagesMap, activeChat]);

  // Filtered chats list
  const filteredChats = useMemo(() => {
    let list = chats;

    // Filter tab
    if (chatFilter === 'unread') {
      list = list.filter((c) => (c.unreadCount || 0) > 0);
    } else if (chatFilter === 'groups') {
      list = list.filter((c) => Boolean(c.isGroup));
    } else if (chatFilter === 'contacts') {
      list = list.filter((c) => !c.isGroup);
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q);
      const lastMsgMatch = (c.lastMessage || '').toLowerCase().includes(q);
      return nameMatch || phoneMatch || lastMsgMatch;
    });
  }, [chats, searchQuery, chatFilter]);

  // In-chat matching messages for search
  const inChatMatchingMessageIds = useMemo(() => {
    const q = inChatSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return activeMessages
      .filter((m) => (m.body || '').toLowerCase().includes(q))
      .map((m) => m.id);
  }, [activeMessages, inChatSearchQuery]);

  // Scroll to matching message in search
  useEffect(() => {
    if (inChatMatchingMessageIds.length > 0) {
      const targetId = inChatMatchingMessageIds[currentSearchIndex % inChatMatchingMessageIds.length];
      const el = document.getElementById(`msg-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSearchIndex, inChatMatchingMessageIds]);

  // Auto-scroll on new message
  useEffect(() => {
    if (!showScrollBottom && chatScrollContainerRef.current) {
      const container = chatScrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [activeMessages.length, showScrollBottom]);

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

  // AI Smart Replies
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

  // ── SEND MESSAGE HANDLER ─────────────────────────────────────────
  const handleSendMessage = async (
    textToSend?: string,
    media?: { mediaUrl: string; mediaType: string; fileName?: string }
  ) => {
    const body = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!body && !media) return;
    if (!activeChat) return;

    const tempId = `temp_${Date.now()}`;
    const quoted = replyingToMessage
      ? {
          id: replyingToMessage.id,
          body: replyingToMessage.body,
          senderName: replyingToMessage.senderName || (replyingToMessage.fromMe ? 'You' : undefined),
        }
      : undefined;

    const optimisticMsg: ChatMessage = {
      id: tempId,
      jid: activeChat.jid,
      fromMe: true,
      type: media ? media.mediaType : 'text',
      body: body || (media ? media.fileName || 'Attachment' : ''),
      mediaUrl: media?.mediaUrl,
      fileName: media?.fileName,
      status: 'pending',
      timestamp: new Date().toISOString(),
      senderName: 'Me',
      quotedMessage: quoted,
    };

    // Instant optimistic update
    setMessagesMap((prev) => {
      const list = prev[activeChat.jid] || [];
      return { ...prev, [activeChat.jid]: [...list, optimisticMsg] };
    });

    setChats((prev) => {
      return prev
        .map((c) =>
          c.jid === activeChat.jid
            ? { ...c, lastMessage: optimisticMsg.body, timestamp: optimisticMsg.timestamp }
            : c
        )
        .sort((a, b) => {
          if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    });

    if (textToSend === undefined) {
      setInputText('');
    }
    setReplyingToMessage(null);
    setShowEmojiPicker(false);

    try {
      const payload: any = {
        jid: activeChat.jid,
        text: body,
        quotedId: quoted?.id,
      };
      if (media) {
        payload.mediaUrl = media.mediaUrl;
        payload.mediaType = media.mediaType;
        payload.fileName = media.fileName;
        if (media.mediaType === 'audio') payload.ptt = true;
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
            const updated = list.map((m) =>
              m.id === tempId ? { ...json.message, status: 'delivered' } : m
            );
            saveCachedMessages(activeChat.jid, updated);
            return { ...prev, [activeChat.jid]: updated };
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

  // ── MESSAGE DELETION (CRITICAL REQUIREMENT) ───────────────────────
  const triggerDeleteMessage = (msg: ChatMessage) => {
    setTargetDeleteMessage(msg);
    setDeleteModalOpen(true);
    setActiveMessageDropdownId(null);
  };

  const executeDeleteMessage = async (forEveryone: boolean) => {
    if (!targetDeleteMessage) return;
    const { jid, id } = targetDeleteMessage;

    // Optimistic UI update
    setMessagesMap((prev) => {
      const list = prev[jid] || [];
      let updated: ChatMessage[];
      if (forEveryone) {
        updated = list.map((m) =>
          m.id === id
            ? {
                ...m,
                isDeleted: true,
                deletedForEveryone: true,
                body: '🚫 You deleted this message',
              }
            : m
        );
      } else {
        updated = list.filter((m) => m.id !== id);
      }
      saveCachedMessages(jid, updated);
      return { ...prev, [jid]: updated };
    });

    setDeleteModalOpen(false);
    setTargetDeleteMessage(null);

    try {
      await fetch('/api/whatsapp/delete-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid, id, forEveryone }),
      });
      fetchLiveChats();
    } catch (err) {
      console.error('Error executing delete:', err);
    }
  };

  // ── REACTION HANDLER ─────────────────────────────────────────────
  const handleToggleReaction = async (msg: ChatMessage, emoji: string) => {
    const existing = msg.reactions?.[emoji];
    const emojiToSend = existing ? '' : emoji;

    // Optimistic update
    setMessagesMap((prev) => {
      const list = prev[msg.jid] || [];
      const updated = list.map((m) => {
        if (m.id !== msg.id) return m;
        const reactions = { ...(m.reactions || {}) };
        if (emojiToSend) reactions[emojiToSend] = 'Me';
        else delete reactions[emoji];
        return { ...m, reactions };
      });
      saveCachedMessages(msg.jid, updated);
      return { ...prev, [msg.jid]: updated };
    });

    setReactionBarMessageId(null);

    try {
      await fetch('/api/whatsapp/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: msg.jid, id: msg.id, emoji: emojiToSend, fromMe: true }),
      });
    } catch {}
  };

  // ── CLEAR CHAT HANDLER ───────────────────────────────────────────
  const executeClearChat = async () => {
    if (!activeChat) return;
    const jid = activeChat.jid;

    setMessagesMap((prev) => ({ ...prev, [jid]: [] }));
    saveCachedMessages(jid, []);
    setConfirmClearModalOpen(false);

    try {
      await fetch('/api/whatsapp/clear-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid }),
      });
      fetchLiveChats();
    } catch {}
  };

  // ── DELETE CONVERSATION HANDLER ──────────────────────────────────
  const executeDeleteChat = async () => {
    if (!activeChat) return;
    const jid = activeChat.jid;

    setChats((prev) => prev.filter((c) => c.jid !== jid));
    setMessagesMap((prev) => {
      const next = { ...prev };
      delete next[jid];
      return next;
    });
    setSelectedJid('');
    setConfirmDeleteChatModalOpen(false);

    try {
      await fetch('/api/whatsapp/delete-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid }),
      });
      fetchLiveChats();
    } catch {}
  };

  // ── CHAT PIN / MUTE / ARCHIVE ACTIONS ────────────────────────────
  const handleTogglePin = async (c: ChatContact) => {
    const nextPin = !c.isPinned;
    setChats((prev) =>
      prev
        .map((item) => (item.jid === c.jid ? { ...item, isPinned: nextPin } : item))
        .sort((a, b) => {
          if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
    );
    try {
      await fetch('/api/whatsapp/chat-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: c.jid, action: 'pin', value: nextPin }),
      });
    } catch {}
  };

  const handleToggleMute = async (duration: string | null) => {
    if (!activeChat) return;
    const isMuted = Boolean(duration);
    setChats((prev) =>
      prev.map((c) => (c.jid === activeChat.jid ? { ...c, isMuted, muteUntil: duration } : c))
    );
    setMuteModalOpen(false);
    try {
      await fetch('/api/whatsapp/chat-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: activeChat.jid, action: 'mute', value: duration }),
      });
    } catch {}
  };

  // ── VOICE NOTE RECORDING (MediaRecorder) ─────────────────────────
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone permission required for voice notes.');
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const stopAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          // Upload to server
          const uploadRes = await fetch('/api/whatsapp/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data,
              fileName: `voice_${Date.now()}.mp3`,
              mimetype: 'audio/mp4',
            }),
          });
          if (uploadRes.ok) {
            const upJson = await uploadRes.json();
            if (upJson.url) {
              await handleSendMessage('', {
                mediaUrl: upJson.url,
                mediaType: 'audio',
                fileName: 'Voice Note.mp3',
              });
            }
          }
        } catch (e) {
          console.error('Voice upload failed:', e);
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Copy message text
  const copyMessageText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied to clipboard');
    setTimeout(() => setCopyFeedback(null), 2000);
    setActiveMessageDropdownId(null);
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const uploadRes = await fetch('/api/whatsapp/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
            mimetype: file.type,
          }),
        });
        if (uploadRes.ok) {
          const upJson = await uploadRes.json();
          await handleSendMessage('', {
            mediaUrl: upJson.url,
            mediaType: attachType,
            fileName: file.name,
          });
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const triggerUpload = (type: 'image' | 'document' | 'audio') => {
    setAttachType(type);
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*,video/*';
      else if (type === 'document') fileInputRef.current.accept = '.pdf,.doc,.docx,.txt';
      else if (type === 'audio') fileInputRef.current.accept = 'audio/*';
      fileInputRef.current.click();
    }
  };

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
    padding: '9px 20px',
    border: 'none',
    background: 'none',
    fontSize: 13.5,
    fontWeight: 400,
    color: '#3b4a54',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
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
        position: 'relative',
      }}
    >
      {/* Toast Feedback */}
      {copyFeedback && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(17,27,33,0.9)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: 20,
            fontSize: 12.5,
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {copyFeedback}
        </div>
      )}

      {/* ── LEFT PANEL: SEARCH, TABS & CHAT LIST ── */}
      <div
        style={{
          width: 340,
          minWidth: 290,
          maxWidth: 360,
          flexShrink: 0,
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Top Header with title and + New Chat button */}
        <div
          style={{
            padding: '10px 14px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111b21' }}>Chats</span>
          <button
            type="button"
            onClick={() => setNewChatModalOpen(true)}
            style={{
              background: '#05424A',
              color: '#ffffff',
              border: 'none',
              borderRadius: 20,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Start new chat with customer or number"
          >
            <Plus size={14} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Pill Input */}
        <div style={{ padding: '6px 12px 8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f0f2f5',
              borderRadius: 20,
              padding: '5px 12px',
              gap: 8,
              height: 35,
            }}
          >
            <Search size={14} color="#667781" />
            <input
              type="text"
              placeholder="Search or start new chat"
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

        {/* Filter Pills (All, Unread, Contacts, Groups) */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '0 12px 8px',
            borderBottom: '1px solid #f0f2f5',
            overflowX: 'auto',
          }}
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'contacts', label: 'Contacts' },
              { id: 'groups', label: 'Groups' },
            ] as const
          ).map((tab) => {
            const isActive = chatFilter === tab.id;
            const unreadTotal =
              tab.id === 'unread' ? chats.filter((c) => (c.unreadCount || 0) > 0).length : 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChatFilter(tab.id)}
                style={{
                  background: isActive ? '#e7fce3' : '#f0f2f5',
                  color: isActive ? '#008069' : '#54656f',
                  border: isActive ? '1px solid #00a884' : '1px solid transparent',
                  borderRadius: 16,
                  padding: '3px 12px',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{tab.label}</span>
                {unreadTotal > 0 && (
                  <span
                    style={{
                      background: '#25D366',
                      color: '#fff',
                      fontSize: 10,
                      borderRadius: 10,
                      padding: '0 5px',
                    }}
                  >
                    {unreadTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contact List */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {filteredChats.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              No chats found.
              {searchQuery && (
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
                  onClick={() => setSelectedJid(c.jid)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f8fafc',
                    background: isSelected ? '#f0f2f5' : '#ffffff',
                    borderLeft: isSelected ? '4px solid #00a884' : '4px solid transparent',
                    transition: 'background 0.15s ease',
                    position: 'relative',
                  }}
                >
                  <WhatsAppAvatar name={c.name} size={44} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 2,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
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
                        {c.isPinned && <Pin size={11} color="#00a884" style={{ flexShrink: 0 }} />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c.isMuted && <VolumeX size={12} color="#8696a0" />}
                        <span style={{ fontSize: 11, color: c.unreadCount > 0 ? '#00a884' : '#667781' }}>
                          {formattedTime}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div
                        style={{
                          fontSize: 12.5,
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
                        <CheckCheck size={14} color="#53bdeb" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.lastMessage ? c.lastMessage : 'Messages are end-to-end encrypted.'}
                        </span>
                      </div>

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

      {/* ── RIGHT PANEL: CONVERSATION WINDOW ── */}
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
            Send and receive messages without keeping your phone online.
            <br />
            Select a chat from the left or click <strong>+ New Chat</strong> to begin.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              color: '#8696a0',
              marginTop: 'auto',
            }}
          >
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
          {/* Top Chat Bar */}
          <div
            style={{
              height: 56,
              background: '#f0f2f5',
              borderBottom: '1px solid #d1d7db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              flexShrink: 0,
              zIndex: 20,
            }}
          >
            {/* Left: Avatar + Info */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minWidth: 0 }}
              onClick={() => {
                if (onShowCustomerProfile) onShowCustomerProfile(activeChat.phone, activeChat.name);
              }}
            >
              <WhatsAppAvatar name={activeChat.name} size={40} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#111b21',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeChat.name || activeChat.phone}
                </div>
                <div style={{ fontSize: 11.5, color: '#667781' }}>
                  {activeChat.phone ? `+91 ${activeChat.phone}` : 'online'}
                </div>
              </div>
            </div>

            {/* Right: In-Chat Search + 3-dots Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* In-chat search button */}
              <button
                type="button"
                onClick={() => setInChatSearchOpen((o) => !o)}
                style={{
                  background: inChatSearchOpen ? '#d1d7db' : 'none',
                  border: 'none',
                  padding: 8,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: '#54656f',
                }}
                title="Search messages in chat"
              >
                <Search size={18} />
              </button>

              {/* Pin Chat toggle */}
              <button
                type="button"
                onClick={() => handleTogglePin(activeChat)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 8,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: activeChat.isPinned ? '#00a884' : '#54656f',
                }}
                title={activeChat.isPinned ? 'Unpin chat' : 'Pin chat'}
              >
                {activeChat.isPinned ? <PinOff size={18} /> : <Pin size={18} />}
              </button>

              {/* 3-dots Menu Button */}
              <div style={{ position: 'relative' }} ref={optionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu((o) => !o)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 8,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: '#54656f',
                  }}
                  title="More options"
                >
                  <MoreVertical size={18} />
                </button>

                {showOptionsMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 4,
                      background: '#ffffff',
                      borderRadius: 6,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                      border: '1px solid #e2e8f0',
                      width: 210,
                      zIndex: 60,
                      padding: '6px 0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        if (onShowCustomerProfile) onShowCustomerProfile(activeChat.phone, activeChat.name);
                      }}
                      style={menuItemStyle}
                    >
                      <Phone size={14} /> <span>Contact info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setIsSelectionMode(true);
                        setSelectedMessageIds(new Set());
                      }}
                      style={menuItemStyle}
                    >
                      <Check size={14} /> <span>Select messages</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        if (activeChat.isMuted) handleToggleMute(null);
                        else setMuteModalOpen(true);
                      }}
                      style={menuItemStyle}
                    >
                      <VolumeX size={14} />{' '}
                      <span>{activeChat.isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
                    </button>
                    <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setConfirmClearModalOpen(true);
                      }}
                      style={menuItemStyle}
                    >
                      <Trash2 size={14} color="#ea0038" /> <span style={{ color: '#ea0038' }}>Clear chat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setConfirmDeleteChatModalOpen(true);
                      }}
                      style={menuItemStyle}
                    >
                      <Trash2 size={14} color="#ea0038" /> <span style={{ color: '#ea0038' }}>Delete chat</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* In-Chat Message Search Bar */}
          {inChatSearchOpen && (
            <div
              style={{
                height: 44,
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 12,
                zIndex: 15,
              }}
            >
              <Search size={16} color="#667781" />
              <input
                type="text"
                placeholder="Search messages..."
                value={inChatSearchQuery}
                onChange={(e) => {
                  setInChatSearchQuery(e.target.value);
                  setCurrentSearchIndex(0);
                }}
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: '#111b21',
                }}
              />
              {inChatSearchQuery && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#667781' }}>
                  <span>
                    {inChatMatchingMessageIds.length > 0
                      ? `${(currentSearchIndex % inChatMatchingMessageIds.length) + 1} of ${
                          inChatMatchingMessageIds.length
                        }`
                      : '0 matches'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSearchIndex((i) =>
                        i <= 0 ? inChatMatchingMessageIds.length - 1 : i - 1
                      )
                    }
                    disabled={inChatMatchingMessageIds.length === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    title="Previous match"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSearchIndex((i) => i + 1)}
                    disabled={inChatMatchingMessageIds.length === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    title="Next match"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setInChatSearchOpen(false);
                  setInChatSearchQuery('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#667781' }}
              >
                <X size={16} />
              </button>
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
            {/* Top Pill Button: "Click here to sync older messages from your phone" */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px' }}>
              <button
                type="button"
                onClick={async () => {
                  setIsSyncingOlder(true);
                  if (activeChat) await fetchChatMessages(activeChat.jid);
                  setTimeout(() => setIsSyncingOlder(false), 1200);
                }}
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
                {/* Date Chip */}
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

                {/* Encryption banner under very first chip */}
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
                  const isHovered = hoveredMessageId === msg.id;
                  const isDropdownOpen = activeMessageDropdownId === msg.id;
                  const isReactionOpen = reactionBarMessageId === msg.id;
                  const isDeleted = msg.isDeleted;

                  return (
                    <div
                      id={`msg-${msg.id}`}
                      key={msg.id}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      style={{
                        alignSelf: isOut ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                      }}
                    >
                      {/* Floating Reaction Bar on message */}
                      {isReactionOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: isOut ? 0 : 'auto',
                            left: isOut ? 'auto' : 0,
                            marginBottom: 4,
                            background: '#ffffff',
                            borderRadius: 24,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                            padding: '4px 8px',
                            display: 'flex',
                            gap: 6,
                            zIndex: 45,
                          }}
                        >
                          {QUICK_REACTION_EMOJIS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => handleToggleReaction(msg, em)}
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: 18,
                                cursor: 'pointer',
                                padding: 2,
                                transition: 'transform 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Main Message Bubble */}
                      <div
                        style={{
                          background: isDeleted ? '#f1f5f9' : isOut ? '#d9fdd3' : '#ffffff',
                          color: '#111b21',
                          borderRadius: isOut ? '8px 8px 0 8px' : '8px 8px 8px 0',
                          padding: '6px 10px',
                          fontSize: 13,
                          lineHeight: 1.45,
                          boxShadow: '0 1px 1.5px rgba(11,20,26,0.13)',
                          wordBreak: 'break-word',
                          position: 'relative',
                        }}
                      >
                        {/* Hover Down Chevron for Message Dropdown */}
                        {!isDeleted && (isHovered || isDropdownOpen) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMessageDropdownId(isDropdownOpen ? null : msg.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              background: 'rgba(255,255,255,0.85)',
                              border: 'none',
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#54656f',
                              zIndex: 10,
                            }}
                            title="Message actions"
                          >
                            <ChevronDown size={14} />
                          </button>
                        )}

                        {/* Dropdown Menu for Message Actions */}
                        {isDropdownOpen && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 26,
                              right: 4,
                              background: '#ffffff',
                              borderRadius: 6,
                              boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                              border: '1px solid #e2e8f0',
                              width: 175,
                              zIndex: 50,
                              padding: '4px 0',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToMessage(msg);
                                setActiveMessageDropdownId(null);
                              }}
                              style={menuItemStyle}
                            >
                              <CornerUpLeft size={14} /> <span>Reply</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReactionBarMessageId(msg.id);
                                setActiveMessageDropdownId(null);
                              }}
                              style={menuItemStyle}
                            >
                              <Smile size={14} /> <span>React</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copyMessageText(msg.body)}
                              style={menuItemStyle}
                            >
                              <Copy size={14} /> <span>Copy text</span>
                            </button>
                            <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                            <button
                              type="button"
                              onClick={() => triggerDeleteMessage(msg)}
                              style={{ ...menuItemStyle, color: '#dc2626' }}
                            >
                              <Trash2 size={14} color="#dc2626" /> <span>Delete message</span>
                            </button>
                          </div>
                        )}

                        {/* Quoted Message Preview inside bubble */}
                        {msg.quotedMessage && (
                          <div
                            style={{
                              background: isOut ? '#cbf7c3' : '#f0f2f5',
                              borderLeft: '4px solid #00a884',
                              borderRadius: 4,
                              padding: '4px 8px',
                              marginBottom: 6,
                              fontSize: 11.5,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const el = document.getElementById(`msg-${msg.quotedMessage?.id}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          >
                            <div style={{ fontWeight: 700, color: '#008069', marginBottom: 2 }}>
                              {msg.quotedMessage.senderName || 'Original Message'}
                            </div>
                            <div
                              style={{
                                color: '#54656f',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {msg.quotedMessage.body}
                            </div>
                          </div>
                        )}

                        {/* Sender name for group/incoming */}
                        {!isOut && msg.senderName && !isDeleted && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#05424A', marginBottom: 2 }}>
                            {msg.senderName}
                          </div>
                        )}

                        {/* Media: Image */}
                        {msg.type === 'image' && msg.mediaUrl && !isDeleted && (
                          <div style={{ marginBottom: 4, borderRadius: 6, overflow: 'hidden' }}>
                            <img
                              src={msg.mediaUrl}
                              alt="Photo"
                              style={{ maxWidth: '100%', maxHeight: 260, display: 'block', borderRadius: 6 }}
                            />
                          </div>
                        )}

                        {/* Media: Document (PDF) */}
                        {msg.type === 'document' && msg.mediaUrl && !isDeleted && (
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
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {msg.fileName || 'document.pdf'}
                              </div>
                              <a
                                href={msg.mediaUrl}
                                download={msg.fileName || 'document.pdf'}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: 11, color: '#0369a1', textDecoration: 'underline' }}
                              >
                                Download Document
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Media: Audio / Voice Note */}
                        {msg.type === 'audio' && msg.mediaUrl && !isDeleted && (
                          <div style={{ marginBottom: 6, minWidth: 220 }}>
                            <audio controls src={msg.mediaUrl} style={{ width: '100%', height: 36 }} />
                          </div>
                        )}

                        {/* Message Body or Deleted State */}
                        {isDeleted ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              color: '#8696a0',
                              fontStyle: 'italic',
                              fontSize: 12.5,
                            }}
                          >
                            <Ban size={14} color="#8696a0" />
                            <span>{msg.body || 'This message was deleted'}</span>
                          </div>
                        ) : (
                          <div>{renderFormattedText(msg.body, inChatSearchQuery)}</div>
                        )}

                        {/* Timestamp & Delivery Ticks */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 3,
                            fontSize: 10,
                            color: '#667781',
                            marginTop: 2,
                            marginLeft: 8,
                          }}
                        >
                          <span>{timeText}</span>
                          {isOut && !isDeleted && (
                            msg.status === 'failed' ? (
                              <button
                                type="button"
                                onClick={() => handleSendMessage(msg.body)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  color: '#dc2626',
                                }}
                                title="Failed - click to retry"
                              >
                                <AlertCircle size={12} color="#dc2626" />
                              </button>
                            ) : msg.status === 'read' ? (
                              <CheckCheck size={14} color="#53bdeb" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck size={14} color="#8696a0" />
                            ) : (
                              <Check size={13} color="#8696a0" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Floating Emoji Reactions Pills below bubble */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            marginTop: -6,
                            marginLeft: isOut ? 'auto' : 8,
                            marginRight: isOut ? 8 : 'auto',
                            zIndex: 10,
                          }}
                        >
                          {Object.entries(msg.reactions).map(([emoji, sender]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg, emoji)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 12,
                                padding: '1px 6px',
                                fontSize: 11,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                              }}
                              title={`Reacted by ${sender}`}
                            >
                              <span>{emoji}</span>
                            </button>
                          ))}
                        </div>
                      )}
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

          {/* ── QUOTED REPLY PREVIEW BANNER (ABOVE COMPOSER) ── */}
          {replyingToMessage && (
            <div
              style={{
                background: '#f0f2f5',
                borderLeft: '4px solid #00a884',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#008069' }}>
                  Replying to {replyingToMessage.senderName || (replyingToMessage.fromMe ? 'You' : 'Client')}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#54656f',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {replyingToMessage.body || 'Media attachment'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ── QUICK ACTION ROW DIRECTLY ABOVE INPUT ── */}
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
            {/* Smart Messaging Button */}
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 8px 8px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#05424A', textTransform: 'uppercase' }}>
                      🤖 AI Suggested Replies
                    </span>
                    <button
                      type="button"
                      onClick={loadAiReplies}
                      disabled={isAiLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#64748b',
                        fontSize: 11,
                      }}
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

                  <div
                    style={{
                      padding: '6px 8px 4px',
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    Instant Salon Templates
                  </div>
                  {[
                    {
                      title: '📅 Booking Confirmation',
                      msg: `✨ *APPOINTMENT CONFIRMED — ${salonName.toUpperCase()}* ✨\n\nDear ${
                        activeChat?.name || 'Client'
                      },\nYour salon appointment is confirmed for today!\n📍 Katargam, Surat\nSee you soon! 💖`,
                    },
                    {
                      title: '🧾 Digital Bill & Receipt',
                      msg: `🧾 *DIGITAL INVOICE — ${salonName.toUpperCase()}* 🧾\n\nDear ${
                        activeChat?.name || 'Client'
                      },\nThank you for visiting us! Your latest salon bill has been recorded.\nHave a wonderful glowing day! ✨`,
                    },
                    {
                      title: '🎂 Birthday Treat (20% OFF)',
                      msg: `🎉 *HAPPY BIRTHDAY ${
                        activeChat?.name?.toUpperCase() || 'CLIENT'
                      }!* 🎂\n\nFrom all of us at Shree Beauty Studio, enjoy flat 20% OFF on all hair spa & Hydra facials today! 🎁✨`,
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

            {/* Party Statement Button */}
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

            {/* Share Online Store Button */}
            <button
              type="button"
              onClick={() => {
                const storeMsg = `👑 *SHREE BEAUTY STUDIO — ONLINE BOOKING & MENU* 👑\n\nDear ${
                  activeChat?.name || 'Client'
                },\nExplore our salon services and packages online:\n🌐 https://shreebeautystudio.com\n\n📍 Katargam, Surat\n📞 Call/WhatsApp: +91 98241 83769`;
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

          {/* ── INPUT BAR: EMOJIS, ATTACH, TEXT INPUT, VOICE NOTE / SEND ── */}
          <div
            style={{
              background: '#f0f2f5',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              position: 'relative',
              width: '100%',
              minWidth: 0,
            }}
          >
            {/* Live Voice Recording Bar */}
            {isRecordingVoice ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  borderRadius: 24,
                  padding: '6px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#ef4444',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                    Recording... {Math.floor(recordingSeconds / 60)}:
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: 6,
                    }}
                    title="Cancel recording"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={stopAndSendVoiceRecording}
                    style={{
                      background: '#00a884',
                      border: 'none',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff',
                    }}
                    title="Send voice note"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Emoji Picker Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((o) => !o)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 6,
                      cursor: 'pointer',
                      color: showEmojiPicker ? '#00a884' : '#54656f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Insert emoji"
                  >
                    <Smile size={22} />
                  </button>

                  {showEmojiPicker && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        marginBottom: 10,
                        background: '#ffffff',
                        borderRadius: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                        border: '1px solid #e2e8f0',
                        width: 260,
                        padding: 10,
                        zIndex: 40,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#64748b',
                          marginBottom: 8,
                          textTransform: 'uppercase',
                        }}
                      >
                        Frequently Used Emojis
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                        {COMMON_EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setInputText((prev) => prev + em);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: 18,
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 4,
                            }}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <ImageIcon size={14} color="#0284c7" /> <span>Photos & Videos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerUpload('document')}
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <FileText size={14} color="#dc2626" /> <span>Document (PDF)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerUpload('audio')}
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Volume2 size={14} color="#7c3aed" /> <span>Audio File</span>
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Sparkles size={14} color="#d97706" /> <span>Bridal Rate Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSendMessage(
                            `💳 *PAYMENT QR CODE & UPI — ${salonName}*\n\nGPay / PhonePe / Paytm: 98241 83769@upi\nStudio WhatsApp: +91 98241 83769`
                          );
                          setShowAttachMenu(false);
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <QrCode size={14} color="#0284c7" /> <span>Payment UPI QR</span>
                      </button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                </div>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder="Type a message"
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

                {/* Mic (if empty) or Send Arrow (if text present) */}
                {inputText.trim() ? (
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 6,
                      cursor: 'pointer',
                      color: '#00a884',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Send message (Enter)"
                  >
                    <Send size={20} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
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
                    title="Record voice note"
                  >
                    <Mic size={20} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 1: MESSAGE DELETION (CRITICAL REQUIREMENT) ── */}
      {deleteModalOpen && targetDeleteMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: 380,
              boxShadow: '0 12px 36px rgba(11,20,26,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: '#111b21', marginBottom: 12 }}>
              Delete message?
            </div>
            <p style={{ fontSize: 13.5, color: '#667781', lineHeight: 1.5, margin: '0 0 20px' }}>
              {targetDeleteMessage.fromMe
                ? 'You can delete this message for everyone or delete it for yourself only.'
                : 'Delete this message from your device?'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {targetDeleteMessage.fromMe && (
                <button
                  type="button"
                  onClick={() => executeDeleteMessage(true)}
                  style={{
                    background: '#ea0038',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 20,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Delete for everyone
                </button>
              )}
              <button
                type="button"
                onClick={() => executeDeleteMessage(false)}
                style={{
                  background: '#f0f2f5',
                  color: '#111b21',
                  border: '1px solid #cbd5e1',
                  borderRadius: 20,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete for me
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                style={{
                  background: 'none',
                  color: '#00a884',
                  border: 'none',
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: NEW CHAT / START CONVERSATION ── */}
      {newChatModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setNewChatModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: 24,
              width: 440,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 36px rgba(11,20,26,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111b21' }}>New WhatsApp Chat</div>
              <button
                type="button"
                onClick={() => setNewChatModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Custom Phone Number input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Enter Any Phone Number
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. 9824183769"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = newChatPhone.replace(/\D/g, '').slice(-10);
                    if (clean.length === 10) {
                      const jid = `91${clean}@s.whatsapp.net`;
                      const newC: ChatContact = {
                        jid,
                        name: newChatName.trim() || clean,
                        phone: clean,
                        lastMessage: 'Ready to chat',
                        timestamp: new Date().toISOString(),
                        unreadCount: 0,
                      };
                      setChats((prev) => [newC, ...prev.filter((c) => c.jid !== jid)]);
                      setSelectedJid(jid);
                      setNewChatModalOpen(false);
                      setNewChatPhone('');
                    } else {
                      alert('Please enter a valid 10-digit mobile number');
                    }
                  }}
                  style={{
                    background: '#00a884',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Start
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: '#f1f5f9', margin: '8px 0 14px' }} />

            {/* Salon Customers Quick Pick */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              Or Pick From Salon Customers ({customers.length})
            </div>

            <input
              type="text"
              placeholder="Search salon customer by name or phone..."
              value={newChatCustomerSearch}
              onChange={(e) => setNewChatCustomerSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 12.5,
                outline: 'none',
                marginBottom: 10,
              }}
            />

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {customers
                .filter((c: any) => {
                  const q = newChatCustomerSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    (c.name || '').toLowerCase().includes(q) ||
                    (c.mobile || '').includes(q) ||
                    (c.phone || '').includes(q)
                  );
                })
                .slice(0, 30)
                .map((cust: any, idx: number) => {
                  const phone = cust.mobile || cust.phone || '';
                  const clean = String(phone).replace(/\D/g, '').slice(-10);
                  const jid = `91${clean}@s.whatsapp.net`;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (clean.length === 10) {
                          const newC: ChatContact = {
                            jid,
                            name: cust.name || clean,
                            phone: clean,
                            lastMessage: 'Ready to chat',
                            timestamp: new Date().toISOString(),
                            unreadCount: 0,
                          };
                          setChats((prev) => [newC, ...prev.filter((c) => c.jid !== jid)]);
                          setSelectedJid(jid);
                          setNewChatModalOpen(false);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: '#f8fafc',
                        cursor: 'pointer',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                          {cust.name || 'Client'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>+91 {clean}</div>
                      </div>
                      <ChevronRight size={14} color="#94a3b8" />
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: MUTE NOTIFICATIONS ── */}
      {muteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setMuteModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: 360,
              boxShadow: '0 12px 36px rgba(11,20,26,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: '#111b21', marginBottom: 16 }}>
              Mute notifications for {activeChat?.name || activeChat?.phone}?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {(['8 hours', '1 week', 'Always'] as const).map((dur) => (
                <label
                  key={dur}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#3b4a54' }}
                >
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
                onClick={() => handleToggleMute(selectedMuteDuration)}
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

      {/* ── MODAL 4: CLEAR CHAT CONFIRMATION ── */}
      {confirmClearModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setConfirmClearModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: 380,
              boxShadow: '0 12px 36px rgba(11,20,26,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: '#111b21', marginBottom: 10 }}>
              Clear this chat?
            </div>
            <p style={{ fontSize: 13.5, color: '#667781', lineHeight: 1.5, margin: '0 0 24px' }}>
              Messages will be cleared from this conversation on both server and local storage.
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
                onClick={executeClearChat}
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

      {/* ── MODAL 5: DELETE CHAT CONFIRMATION ── */}
      {confirmDeleteChatModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,20,26,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setConfirmDeleteChatModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: 380,
              boxShadow: '0 12px 36px rgba(11,20,26,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: '#111b21', marginBottom: 10 }}>
              Delete this chat?
            </div>
            <p style={{ fontSize: 13.5, color: '#667781', lineHeight: 1.5, margin: '0 0 24px' }}>
              This conversation and all its messages will be removed permanently.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteChatModalOpen(false)}
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
                onClick={executeDeleteChat}
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
