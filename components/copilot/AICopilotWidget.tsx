// components/copilot/AICopilotWidget.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Bot,
  Send,
  Mic,
  MicOff,
  X,
  Minus,
  Maximize2,
  Volume2,
  VolumeX,
  Zap,
  Radio,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { executeCopilotAction } from '@/lib/copilot-actions';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  provider?: string;
  actionExecuted?: string;
  isQuestion?: boolean;
  timestamp: string;
}

export default function AICopilotWidget() {
  const router = useRouter();
  const { data } = useSalonStore();
  const { toast } = useToast();

  // Widget States
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>('');

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false); // Keeps listening until user stops

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: 'નમસ્તે! હું તમારો કન્ટીન્યુઅસ AI વોઇસ આસિસ્ટન્ટ છું ✨ તમે જ્યાં સુધી સ્ટોપ ન કહો ત્યાં સુધી હું સાંભળતો રહીશ અને દરેક કામ રીયલ-ટાઇમમાં કરતો રહીશ!',
      provider: 'Shree AI Continuous Voice Operator',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  // Synchronization refs to avoid race conditions in continuous speech events
  const shouldKeepListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Global Keyboard Shortcut: Ctrl + K or Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) setIsMinimized(false);
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
    }
  }, []);

  // Text-To-Speech (TTS) in Gujarati / Indian voice
  const speakText = useCallback(
    (textToSpeak: string, onEndCallback?: () => void) => {
      if (!voiceEnabled || !speechSynthRef.current) {
        if (onEndCallback) onEndCallback();
        return;
      }

      try {
        speechSynthRef.current.cancel(); // Stop ongoing speech

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;

        // Try finding Gujarati voice, then Hindi, then Indian English
        const voices = speechSynthRef.current.getVoices();
        const guVoice = voices.find((v) => v.lang.startsWith('gu'));
        const hiVoice = voices.find((v) => v.lang.startsWith('hi'));
        const enInVoice = voices.find((v) => v.lang.includes('IN') || v.lang.startsWith('en'));

        if (guVoice) {
          utterance.voice = guVoice;
          utterance.lang = 'gu-IN';
        } else if (hiVoice) {
          utterance.voice = hiVoice;
          utterance.lang = 'hi-IN';
        } else if (enInVoice) {
          utterance.voice = enInVoice;
          utterance.lang = 'en-IN';
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          isSpeakingRef.current = true;
          setLiveStatus('🔊 જવાબ આપી રહ્યો છું...');
        };

        const handleFinish = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setLiveStatus(shouldKeepListeningRef.current ? '🎙️ સાંભળી રહ્યો છું...' : '');
          if (onEndCallback) onEndCallback();
        };

        utterance.onend = handleFinish;
        utterance.onerror = handleFinish;

        speechSynthRef.current.speak(utterance);
      } catch {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onEndCallback) onEndCallback();
      }
    },
    [voiceEnabled]
  );

  // Stop current speech
  const stopSpeaking = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  // Build real-time context summary for AI
  const buildContextSummary = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const appts = (data?.appointments || []).length;
    const todayAppts = (data?.appointments || []).filter((a) => a.date === todayStr).length;
    const invs = (data?.invoices || []).length;
    const prods = (data?.inventory || []).length;
    const lowStock = (data?.inventory || []).filter((p) => p.stock <= (p.low || 3)).length;
    const custs = (data?.customers || []).length;
    const todayRev = (data?.invoices || [])
      .filter((i) => i.date === todayStr)
      .reduce((s, i) => s + Number(i.total || 0), 0);

    return `Salon Name: ${data?.settings?.salon || 'Shree Beauty Studio'}
Location: Katargam, Surat
Today's Date: ${todayStr}
Today's Appointments: ${todayAppts} (Total: ${appts})
Today's Total Revenue: ₹${todayRev} (Total Invoices: ${invs})
Total Products in Stock: ${prods} (Low Stock Alerts: ${lowStock})
Total Registered Customers: ${custs}`;
  };

  // Send Prompt to AI with Multi-turn history and Real-time Continuous Updates
  const handleSendPrompt = async (promptToSend?: string) => {
    const query = (promptToSend || inputPrompt).trim();
    if (!query || isProcessingRef.current) return;

    // Check for explicit stop command from user
    const lower = query.toLowerCase();
    if (
      lower === 'stop' ||
      lower.includes('સ્ટોપ') ||
      lower.includes('બસ') ||
      lower.includes('બંધ કરો') ||
      lower.includes('રોકો') ||
      lower.includes('શાંત રહો')
    ) {
      stopSpeaking();
      stopContinuousListening();
      toast('🛑 વોઇસ લિસનિંગ બંધ કર્યું.', 'info');
      speakText('ચોક્કસ, મેં સાંભળવાનું બંધ કર્યું છે.');
      return;
    }

    isProcessingRef.current = true;
    stopSpeaking();

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt('');
    setLoading(true);
    setLiveStatus('⚡ પ્રોસેસ કરી રહ્યો છું...');

    try {
      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          contextSummary: buildContextSummary(),
          history: historyPayload,
        }),
      });

      const json = await res.json();

      if (json.success) {
        let actionExecMsg = '';
        if (json.action && json.action !== 'NONE') {
          setLiveStatus(`⚡ એક્શન અમલમાં મૂકી રહ્યો છું: ${json.action}`);
          const result = await executeCopilotAction(json.action, json.payload, toast);
          if (result.executed) {
            actionExecMsg = result.message;
            if (result.navigatePath) {
              router.push(result.navigatePath);
            }
          }
        }

        const replyText = json.replyText || 'હાજી, વિગત પ્રોસેસ થઈ ગઈ છે.';
        const isQuestion =
          json.action === 'NONE' &&
          (replyText.includes('?') ||
            replyText.includes('કહો') ||
            replyText.includes('જણાવો') ||
            replyText.includes('કઈ') ||
            replyText.includes('કોના'));

        const copilotMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'copilot',
          text: replyText,
          provider: json.provider || 'Continuous AI Voice Operator',
          actionExecuted: actionExecMsg,
          isQuestion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, copilotMsg]);

        // Speak response out loud in Gujarati
        speakText(replyText, () => {
          // When speech output completes, if continuous mode is on, resume listening seamlessly!
          if (shouldKeepListeningRef.current) {
            startBrowserRecognition();
          }
        });
      } else {
        toast(`Copilot error: ${json.error}`, 'error');
        if (shouldKeepListeningRef.current) {
          startBrowserRecognition();
        }
      }
    } catch (err: any) {
      toast(`Copilot error: ${err?.message || 'Failed to connect'}`, 'error');
      if (shouldKeepListeningRef.current) {
        startBrowserRecognition();
      }
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  // Web Speech API Voice Recognition (Low-level starter)
  const startBrowserRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast('Speech recognition requires Google Chrome or Microsoft Edge.', 'error');
      return;
    }

    // Do not listen while the assistant is speaking to avoid echo loop
    if (isSpeakingRef.current || isProcessingRef.current) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true; // KEEP LISTENING CONTINUOUSLY!
      recognition.interimResults = true;
      recognition.lang = 'gu-IN'; // Listen for Gujarati and Indian speech

      recognition.onstart = () => {
        setIsListening(true);
        setLiveStatus('🎙️ સાંભળી રહ્યો છું... (બોલવાનું ચાલુ રાખો)');
      };

      recognition.onresult = (event: any) => {
        // If assistant started speaking, ignore microphone input
        if (isSpeakingRef.current || isProcessingRef.current) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (interimTranscript) {
          setInputPrompt(interimTranscript);
        }

        if (finalTranscript.trim()) {
          const captured = finalTranscript.trim();
          setInputPrompt(captured);

          // Temporarily pause recognition while processing command
          try {
            recognition.stop();
          } catch {}

          handleSendPrompt(captured);
        }
      };

      recognition.onerror = (e: any) => {
        // Ignore "no-speech" errors in continuous mode and auto-recover
        if (e.error === 'no-speech' && shouldKeepListeningRef.current && !isSpeakingRef.current) {
          return;
        }
        if (e.error === 'not-allowed') {
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          setContinuousMode(false);
          toast('Microphone permission was denied. Please allow microphone access.', 'error');
        }
      };

      recognition.onend = () => {
        // In continuous mode, auto-restart unless explicitly stopped or currently speaking
        if (shouldKeepListeningRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Start Continuous Hands-Free Voice Mode (Keeps listening until user stops)
  const startContinuousListening = () => {
    shouldKeepListeningRef.current = true;
    setContinuousMode(true);
    stopSpeaking();
    startBrowserRecognition();
    toast('🎙️ કન્ટીન્યુઅસ લિસનિંગ શરૂ થયું! બોલતા રહો, સોફ્ટવેર રીયલ-ટાઇમમાં કામ કરતું રહેશે.', 'success');
  };

  // Stop Continuous Listening
  const stopContinuousListening = () => {
    shouldKeepListeningRef.current = false;
    setContinuousMode(false);
    setIsListening(false);
    setLiveStatus('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
  };

  // Toggle Continuous Listening
  const toggleContinuousListening = () => {
    if (continuousMode || isListening) {
      stopContinuousListening();
    } else {
      startContinuousListening();
    }
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. FLOATING TRIGGER BUTTON (When closed)
          ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <motion.button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="copilot-floating-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999,
            background: 'linear-gradient(135deg, #032B30 0%, #05424A 100%)',
            color: '#ffffff',
            border: '1.5px solid #EABA38',
            borderRadius: 30,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 24px rgba(3,43,48,0.45)',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          <div
            style={{
              background: 'rgba(234, 186, 56, 0.2)',
              borderRadius: '50%',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={17} color="#EABA38" />
          </div>
          <span className="copilot-btn-text" style={{ letterSpacing: 0.2 }}>
            AI Voice Copilot
          </span>
          <span
            className="copilot-shortcut"
            style={{
              background: 'rgba(255,255,255,0.15)',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 700,
              color: '#fef08a',
            }}
          >
            Ctrl+K
          </span>
        </motion.button>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. MINIMIZED VOICE PILL (Compact floating mode)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`copilot-voice-pill ${isListening || isSpeaking ? 'pulse-active' : ''}`}
            onClick={() => setIsMinimized(false)}
            title="Click to expand AI Copilot window"
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: isListening ? '#dc2626' : isSpeaking ? '#EABA38' : 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSpeaking ? '#032B30' : '#ffffff',
                flexShrink: 0,
              }}
            >
              {isListening ? <Mic size={16} /> : isSpeaking ? <Volume2 size={16} /> : <Bot size={16} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 105, overflow: 'hidden' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 5 }}>
                AI Voice
                {isListening ? (
                  <span style={{ color: '#f87171', fontSize: 10 }}>સાંભળે છે...</span>
                ) : isSpeaking ? (
                  <span style={{ color: '#fef08a', fontSize: 10 }}>બોલે છે...</span>
                ) : (
                  <span style={{ color: '#86efac', fontSize: 10 }}>હાજર</span>
                )}
              </div>
              <div style={{ fontSize: 9.5, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {continuousMode ? '🎙️ કન્ટીન્યુઅસ ચાલુ' : 'ક્લિક કરીને મોટું કરો'}
              </div>
            </div>

            {/* Audio Wave Visualizer */}
            {(isListening || isSpeaking) && (
              <div className="voice-bars">
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
              </div>
            )}

            {/* Stop Continuous Listening Button from Pill */}
            {continuousMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stopContinuousListening();
                }}
                title="Stop Continuous Listening"
                style={{
                  background: 'rgba(220, 38, 38, 0.4)',
                  border: '1px solid #f87171',
                  color: '#ffffff',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                બંધ કરો
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Maximize2 size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          3. FULL SLIM COMPACT COPILOT WINDOW (Width: 330px)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="copilot-drawer-window"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: '#ffffff',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #032B30 0%, #05424A 100%)',
                color: '#ffffff',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(234, 186, 56, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: 'rgba(234, 186, 56, 0.2)',
                    border: '1px solid rgba(234, 186, 56, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bot size={18} color="#EABA38" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 5 }}>
                    AI Voice Copilot
                    {continuousMode && (
                      <span style={{ fontSize: 9, background: '#22c55e', color: '#ffffff', padding: '1px 5px', borderRadius: 99, fontWeight: 700 }}>
                        AUTO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#EABA38', fontWeight: 600 }}>
                    {continuousMode ? 'કન્ટીન્યુઅસ મોડ ચાલુ' : 'ગુજરાતી વોઇસ આસિસ્ટન્ટ'}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Continuous Mode Toggle, Voice Mute/Unmute, Minimize, Close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {/* Continuous Listening Toggle Button */}
                <button
                  type="button"
                  onClick={toggleContinuousListening}
                  title={
                    continuousMode
                      ? 'Continuous Listening is ON (Click to Stop)'
                      : 'Enable Continuous Listening (Keeps listening until you stop)'
                  }
                  style={{
                    background: continuousMode ? '#22c55e' : 'rgba(255,255,255,0.12)',
                    border: continuousMode ? '1px solid #86efac' : '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    borderRadius: 6,
                    padding: '3px 6px',
                    fontSize: 9.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Radio size={11} className={continuousMode ? 'spin' : ''} />
                  <span>{continuousMode ? 'Live' : 'Auto'}</span>
                </button>

                {/* Voice Audio Mute/Unmute */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  title={voiceEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    color: voiceEnabled ? '#EABA38' : '#94a3b8',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  title="Minimize to Voice Pill (Keeps running in background)"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={14} />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    stopContinuousListening();
                    setIsOpen(false);
                  }}
                  title="Close Copilot"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Continuous Mode Live Status Banner */}
            {continuousMode && (
              <div
                style={{
                  background: '#f0fdf4',
                  borderBottom: '1px solid #bbf7d0',
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 10.5,
                  color: '#166534',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
                  <span>કન્ટીન્યુઅસ લિસનિંગ ચાલુ છે (Stop કહેવાથી બંધ થશે)</span>
                </div>
                <button
                  type="button"
                  onClick={stopContinuousListening}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  બંધ કરો
                </button>
              </div>
            )}

            {/* Quick Action Chips */}
            <div
              style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '6px 10px',
                display: 'flex',
                gap: 5,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
              }}
            >
              {[
                { label: '📅 એપોઇન્ટમેન્ટ', prompt: 'પ્રિયા પટેલ માટે આજે સાંજે 4 વાગ્યે હેર કટ બુક કરો' },
                { label: '🧾 બિલ બનાવો', prompt: 'વોક-ઇન ક્લાયન્ટ માટે હેર સ્પા 1200 નું બિલ બનાવો' },
                { label: '☕ ખર્ચ નોંધો', prompt: 'સ્ટાફ ચા નાસ્તો 150 રૂપિયા ખર્ચ નોંધો' },
                { label: '📦 સ્ટોક ઉમેરો', prompt: 'સ્ટોકમાં લોરિયલ શેમ્પૂ 10 પીસ ઉમેરો' },
                { label: '💰 કલેક્શન', prompt: 'આજનું કુલ કલેક્શન કેટલું છે?' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSendPrompt(chip.prompt)}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 99,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#032B30',
                    cursor: 'pointer',
                    flexShrink: 0,
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
                padding: 12,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: '#f1f5f9',
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                  }}
                >
                  <div
                    style={{
                      background: msg.sender === 'user' ? '#032B30' : msg.isQuestion ? '#fffbeb' : '#ffffff',
                      color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                      padding: '8px 12px',
                      borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      boxShadow: '0 1.5px 5px rgba(0,0,0,0.06)',
                      fontSize: 12,
                      lineHeight: 1.45,
                      border: msg.sender === 'user' ? 'none' : msg.isQuestion ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                    }}
                  >
                    {/* Counter Question Indicator */}
                    {msg.isQuestion && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d97706', fontSize: 10.5, fontWeight: 700, marginBottom: 4 }}>
                        <HelpCircle size={12} /> <span>વધારાની માહિતી જરૂરી છે:</span>
                      </div>
                    )}

                    {msg.text}

                    {/* Action Executed Badge */}
                    {msg.actionExecuted && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '4px 8px',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: 6,
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Zap size={11} color="#16a34a" /> <span>{msg.actionExecuted}</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                        fontSize: 9,
                        opacity: 0.65,
                      }}
                    >
                      <span>{msg.provider || ''}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: 12,
                    fontSize: 11.5,
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={14} className="spin" color="#05424A" /> AI સોફ્ટવેરમાં કાર્ય કરી રહ્યું છે...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Speaking / Listening Live Waveform Notification Bar */}
            {(isListening || isSpeaking || liveStatus) && (
              <div
                style={{
                  background: isListening ? '#fee2e2' : isSpeaking ? '#fef9c3' : '#f0fdf4',
                  borderTop: isListening ? '1px solid #fca5a5' : isSpeaking ? '1px solid #fef08a' : '1px solid #bbf7d0',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(isListening || isSpeaking) && (
                    <div className="voice-bars">
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                    </div>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: isListening ? '#b91c1c' : isSpeaking ? '#854d0e' : '#166534' }}>
                    {liveStatus || (isListening ? '🎙️ સાંભળી રહ્યો છું...' : '🔊 બોલી રહ્યો છું...')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stopContinuousListening();
                    if (isSpeaking) stopSpeaking();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  રોકો
                </button>
              </div>
            )}

            {/* Input Form Footer */}
            <div
              style={{
                padding: '8px 10px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {/* Mic Voice Button (Starts continuous voice mode) */}
              <button
                type="button"
                onClick={toggleContinuousListening}
                title={
                  continuousMode
                    ? 'Stop Voice Listening (Click to pause)'
                    : 'Start Continuous Voice Listening (Keeps listening and executing tasks)'
                }
                className={isListening ? 'mic-pulsing' : ''}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: isListening ? '2px solid #dc2626' : continuousMode ? '2px solid #22c55e' : '1px solid #cbd5e1',
                  background: isListening ? '#fee2e2' : continuousMode ? '#f0fdf4' : '#f8fafc',
                  color: isListening ? '#dc2626' : continuousMode ? '#16a34a' : '#032B30',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>

              <input
                type="text"
                className="input"
                placeholder={isListening ? 'સાંભળે છે... (બોલો)' : 'બોલો અથવા લખો... (બિલ, એપોઇન્ટમેન્ટ)'}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                style={{ flex: 1, fontSize: 12, padding: '7px 10px', height: 34 }}
              />

              <button
                type="button"
                onClick={() => handleSendPrompt()}
                disabled={loading || !inputPrompt.trim()}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: 'none',
                  background: inputPrompt.trim() ? '#032B30' : '#cbd5e1',
                  color: '#ffffff',
                  cursor: inputPrompt.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
