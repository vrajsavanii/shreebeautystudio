// components/copilot/AICopilotWidget.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Bot,
  Send,
  Mic,
  MicOff,
  X,
  Zap,
  CheckCircle2,
  Calendar,
  Receipt,
  Package,
  Heart,
  MessageCircle,
  TrendingUp,
  Cpu,
  ChevronDown,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { executeCopilotAction } from '@/lib/copilot-actions';
import { money } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  provider?: string;
  actionExecuted?: string;
  timestamp: string;
}

export default function AICopilotWidget() {
  const router = useRouter();
  const { data } = useSalonStore();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: 'નમસ્તે! I am your AI Salon Copilot ✨ Tell me any task (in English, Gujarati, or Hinglish) and I will execute it in the software for you!',
      provider: 'System AI Operator',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Global Keyboard Shortcut: Ctrl + K or Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Web Speech API Voice Recognition Handler
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast('Speech recognition is not supported in this browser. Please use Google Chrome.', 'error');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'gu-IN'; // Default to Gujarati/Indian English

      recognition.onstart = () => {
        setIsListening(true);
        toast('🎙️ Listening... Speak your request now in Gujarati or English!');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputPrompt(transcript);
        setIsListening(false);
        toast(`🗣️ Captured: "${transcript}"`);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Build real-time context summary for AI
  const buildContextSummary = () => {
    const appts = (data?.appointments || []).length;
    const invs = (data?.invoices || []).length;
    const prods = (data?.inventory || []).length;
    const custs = (data?.customers || []).length;
    const todayRev = (data?.invoices || [])
      .filter((i) => i.date === new Date().toISOString().slice(0, 10))
      .reduce((s, i) => s + Number(i.total || 0), 0);

    return `Salon Name: ${data?.settings?.salon || 'Shree Beauty Studio'}
Today's Date: ${new Date().toISOString().slice(0, 10)}
Total Appointments: ${appts}
Total Invoices: ${invs}
Total Products in Stock: ${prods}
Total Registered Customers: ${custs}
Today's Total Revenue: ₹${todayRev}`;
  };

  // Process AI Prompt
  const handleSendPrompt = async (promptToSend?: string) => {
    const query = (promptToSend || inputPrompt).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          contextSummary: buildContextSummary(),
        }),
      });

      const json = await res.json();

      if (json.success) {
        // Execute Action in Salon Store & UI
        let actionExecMsg = '';
        if (json.action && json.action !== 'NONE') {
          const result = await executeCopilotAction(json.action, json.payload, toast);
          if (result.executed) {
            actionExecMsg = result.message;
            if (result.navigatePath) {
              router.push(result.navigatePath);
            }
          }
        }

        const copilotMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'copilot',
          text: json.replyText || 'Task processed successfully.',
          provider: json.provider || 'AI Copilot',
          actionExecuted: actionExecMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, copilotMsg]);
      } else {
        toast(`Copilot error: ${json.error}`, 'error');
      }
    } catch (err: any) {
      toast(`Copilot error: ${err?.message || 'Failed to connect'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button on Bottom Right */}
      {!isOpen && (
        <motion.button
          type="button"
          onClick={() => setIsOpen(true)}
          className="copilot-floating-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999,
            background: 'linear-gradient(135deg, #05424A 0%, #0d9488 100%)',
            color: '#ffffff',
            border: '2px solid #5eead4',
            borderRadius: 30,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 24px rgba(5,66,74,0.4)',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color="#fef08a" />
          </div>
          <span>AI Copilot</span>
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 700,
            }}
          >
            Ctrl+K
          </span>
        </motion.button>
      )}

      {/* Expanded Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 410,
              maxWidth: '92vw',
              height: 580,
              maxHeight: '85vh',
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
              border: '1px solid #cbd5e1',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #05424A 0%, #032A30 100%)',
                color: '#ffffff',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <Bot size={20} color="#80EEEE" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Shree Salon AI Copilot
                    <span style={{ fontSize: 9.5, background: '#22c55e', color: '#ffffff', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                      LIVE
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#99f6e4' }}>
                    Multi-AI Engine (Groq • NIM • Gemini)
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Prompt Chips */}
            <div
              style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '8px 12px',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {[
                { label: '📅 Book Appt', prompt: 'Book appointment for Priya Patel today at 4pm for Hydra Facial' },
                { label: '🧾 Quick Bill', prompt: 'Create invoice for Walk-in Client for Hair Spa ₹1200' },
                { label: '📦 Add Product', prompt: 'Add new product L\'Oreal Shampoo stock 15 buy 1250 sell 1650' },
                { label: '👰 Bridal PDF', prompt: 'Send bridal rate card pdf to 9898012345' },
                { label: '💳 Check Dues', prompt: 'Show all customers with pending balance dues' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSendPrompt(chip.prompt)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 99,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Chat Body */}
            <div
              style={{
                flex: 1,
                padding: 14,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                background: '#f1f5f9',
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div
                    style={{
                      background: msg.sender === 'user' ? '#05424A' : '#ffffff',
                      color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                      padding: '10px 14px',
                      borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    }}
                  >
                    {msg.text}

                    {msg.actionExecuted && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '6px 10px',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Zap size={12} color="#16a34a" /> <span>{msg.actionExecuted}</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                        fontSize: 9.5,
                        opacity: 0.7,
                      }}
                    >
                      <span>{msg.provider || ''}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '10px 14px', borderRadius: 12, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} className="spin" color="var(--teal)" /> Processing request with AI model...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Footer */}
            <div
              style={{
                padding: '10px 12px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                title={isListening ? 'Stop Listening' : 'Voice Input (Speak in Gujarati / English)'}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: isListening ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  background: isListening ? '#fee2e2' : '#f8fafc',
                  color: isListening ? '#dc2626' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                className="input"
                placeholder={isListening ? 'Listening...' : 'Ask Copilot to do any task... (e.g. book appt, create bill)'}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                style={{ flex: 1, fontSize: 12.5, padding: '8px 12px' }}
              />

              <button
                type="button"
                onClick={() => handleSendPrompt()}
                disabled={loading || !inputPrompt.trim()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: inputPrompt.trim() ? '#05424A' : '#cbd5e1',
                  color: '#ffffff',
                  cursor: inputPrompt.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
