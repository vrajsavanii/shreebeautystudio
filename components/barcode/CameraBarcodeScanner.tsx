'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Sparkles, Upload, Zap, ZapOff, CheckCircle2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
];

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = '📷 Mobile & Live Camera Barcode Scanner',
}: CameraBarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [detectedSuccess, setDetectedSuccess] = useState<string | null>(null);

  // Play audio beep + haptic vibration confirmation
  const playFeedback = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, audioCtx.currentTime); // High pitch clear tone
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    } catch {
      // Audio not permitted or not supported
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Vibrate not allowed
      }
    }
  }, []);

  const handleDetected = useCallback((code: string) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) return;
    playFeedback();
    setDetectedSuccess(trimmed);

    // Stop scanner smoothly then callback
    setTimeout(() => {
      onScan(trimmed);
      onClose();
    }, 450);
  }, [onScan, onClose, playFeedback]);

  // Stop scanner instance safely
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Start Html5Qrcode Scanner (Compatible with Android & iPhone iOS Safari)
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setDetectedSuccess(null);
    await stopScanner();

    // Ensure DOM container exists
    const container = document.getElementById('shree-barcode-reader-view');
    if (!container) return;

    try {
      const html5QrCode = new Html5Qrcode('shree-barcode-reader-view', {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxWidth = Math.floor(minEdge * 0.85);
        return {
          width: Math.min(340, boxWidth),
          height: Math.min(200, Math.floor(boxWidth * 0.55)),
        };
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        {
          fps: 15,
          qrbox: qrboxFunction,
          aspectRatio: 1.333333,
        },
        (decodedText: string) => {
          handleDetected(decodedText);
        },
        () => {
          // No barcode in current frame
        }
      );

      setScanning(true);

      // Check if torch/flashlight is supported
      try {
        const capabilities: any = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      let msg = err?.message || 'Camera permission denied or camera not found.';
      if (typeof msg === 'string' && (msg.includes('NotAllowedError') || msg.includes('Permission'))) {
        msg = 'Camera permission blocked. On iPhone/Android, please tap the lock icon in the address bar and allow Camera access.';
      }
      setCameraError(msg);
      setScanning(false);
    }
  }, [facingMode, handleDetected, stopScanner]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Scan from photo or phone camera snapshot (Native Android/iPhone Camera Capture)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingFile(true);
    setCameraError(null);

    try {
      let tempScanner = scannerRef.current;
      if (!tempScanner) {
        tempScanner = new Html5Qrcode('shree-barcode-reader-view', {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = tempScanner;
      }

      const decodedText = await tempScanner.scanFile(file, true);
      if (decodedText) {
        handleDetected(decodedText);
      } else {
        setCameraError('No barcode detected in the photo. Please ensure the barcode is sharp, well-lit, and try again.');
      }
    } catch (err: any) {
      console.warn('Photo scan error:', err);
      setCameraError('Could not read barcode from image. Please ensure good lighting or enter the number below.');
    } finally {
      setProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow Modal transition to render DOM element
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="var(--primary)" /> Hold barcode inside red guidelines (Android & iPhone supported)
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Scanner Viewport Box */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 420,
            minHeight: 260,
            background: '#071e23',
            borderRadius: 14,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {/* html5-qrcode mounts inside this div */}
          <div
            id="shree-barcode-reader-view"
            style={{ width: '100%', minHeight: 260, display: cameraError ? 'none' : 'block' }}
          />

          {/* Success Overlay Flash */}
          {detectedSuccess && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(16, 185, 129, 0.92)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 30,
                color: '#fff',
                textAlign: 'center',
                padding: 16,
              }}
            >
              <CheckCircle2 size={44} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 800 }}>Barcode Scanned!</div>
              <div style={{ fontSize: 14, fontFamily: 'monospace', marginTop: 4, background: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: 6 }}>
                {detectedSuccess}
              </div>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div style={{ padding: 20, textAlign: 'center', color: '#fca5a5', fontSize: 12.5, zIndex: 10 }}>
              <p style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>📷 Camera Access Needed</p>
              <p style={{ fontSize: 12, color: '#fecaca', marginBottom: 12, lineHeight: 1.5 }}>{cameraError}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => startScanner()}
                  style={{ fontSize: 12 }}
                >
                  <RefreshCw size={13} /> Try Again
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: 12, color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  <Camera size={13} /> Take Phone Photo
                </button>
              </div>
            </div>
          )}

          {/* Floating Controls Bar (Camera Switch, Torch, Snap Photo) */}
          {scanning && !detectedSuccess && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                display: 'flex',
                gap: 8,
                zIndex: 20,
              }}
            >
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  title={torchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
                  style={{
                    background: torchOn ? '#eab308' : 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: torchOn ? '#000' : '#fff',
                    borderRadius: '50%',
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {torchOn ? <ZapOff size={15} /> : <Zap size={15} />}
                </button>
              )}

              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                title="Switch Camera (Front / Back)"
                style={{
                  background: 'rgba(0,0,0,0.65)',
                  border: '1px solid rgba(255,255,255,0.25)',
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
            </div>
          )}
        </div>

        {/* Alternative Quick Scan Action: Native Phone Photo / Upload */}
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', justifyContent: 'center' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhotoCapture}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={processingFile}
            style={{ fontSize: 12, width: '100%', display: 'flex', justifyContent: 'center', gap: 6 }}
          >
            <Camera size={14} color="var(--primary)" />
            {processingFile ? 'Scanning photo…' : '📷 Take High-Resolution Phone Photo / Scan Image'}
          </button>
        </div>

        {/* Manual Barcode Input Fallback */}
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Or Enter / Paste Barcode Number:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input"
              placeholder="e.g. 84365423... or 890..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleDetected(manualCode);
                }
              }}
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

        {/* Gujarati & Hindi Guidance Note */}
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11.5,
            color: '#475569',
            lineHeight: 1.5,
          }}
        >
          💡 <strong>મોબાઇલ સ્કેનિંગ ટિપ્સ (Android / iPhone):</strong>
          <br />• કેમેરા સામે પ્રોડક્ટનો બારકોડ 10-15 cm અંતરે સ્થિર રાખો.
          <br />• જો કેમેરા બ્લર દેખાય તો ઉપરના <strong>&quot;Take Phone Photo&quot;</strong> બટનથી ફોટો પાડીને પણ તુરંત સ્કેન કરી શકો છો.
        </div>
      </div>
    </Modal>
  );
}
