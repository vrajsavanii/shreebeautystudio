'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Volume2, Sparkles } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = '📷 Live Camera Barcode Scanner',
}: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Play audio beep confirmation
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio not permitted or not supported
    }
  }, []);

  const handleDetected = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    playBeep();
    onScan(trimmed);
    onClose();
  }, [onScan, onClose, playBeep]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(err.message || 'Camera permission denied or camera not available.');
      setScanning(false);
    }
  }, [facingMode]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Native BarcodeDetector loop if supported
  useEffect(() => {
    if (!isOpen || !scanning) return;

    let intervalId: any;
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    if (hasBarcodeDetector) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
      });

      intervalId = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              handleDetected(rawValue);
            }
          }
        } catch {
          // Frame detection pass
        }
      }, 250);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, scanning, handleDetected]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="var(--gold)" /> Hold barcode inside red guidelines
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        {/* Video Viewport Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 440,
            height: 280,
            background: '#071e23',
            borderRadius: 14,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {cameraError ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#fca5a5', fontSize: 13 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Camera Unavailable</p>
              <p style={{ fontSize: 12, color: '#fecaca', marginBottom: 12 }}>{cameraError}</p>
              <p style={{ color: '#cbd5e1', fontSize: 12 }}>
                You can type or paste the barcode manually below, or scan using your USB laser scanner gun.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Scanning Target Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: '30px 40px',
                  border: '2px dashed #f43f5e',
                  borderRadius: 12,
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 9999px rgba(7, 30, 35, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Center laser line animation */}
                <div
                  style={{
                    width: '90%',
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
                    boxShadow: '0 0 8px #ef4444',
                  }}
                />
              </div>

              {/* Camera Switch button */}
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                title="Switch Camera"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} />
              </button>
            </>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Or Enter / Paste Barcode Number:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input"
              placeholder="e.g. 890123456001"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleDetected(manualCode);
                }
              }}
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={() => handleDetected(manualCode)}
              disabled={!manualCode.trim()}
            >
              Use Code
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
