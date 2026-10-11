'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Clock,
  Music,
  Zap,
  Volume2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface MusicPresetMarker {
  time: number;
  label: string;
  icon?: string;
  color?: string;
}

export interface MusicWaveformGraphProps {
  /** Decoded AudioBuffer if available for authentic PCM peak rendering */
  audioBuffer?: AudioBuffer | null;
  /** Audio URL or ID (used for deterministic fallback wave generation) */
  trackId?: string;
  /** Track title for display */
  trackTitle?: string;
  /** Track artist / subtitle */
  trackArtist?: string;
  /** Total duration of audio in seconds (e.g. 30, 60) */
  totalDuration?: number;
  /** Start offset in seconds for Story / Reel clip */
  startTime: number;
  /** Duration of the clip window in seconds (e.g. 7, 15) */
  duration: number;
  /** Current playback time in seconds */
  currentTime?: number;
  /** Whether the audio is currently playing */
  isPlaying?: boolean;
  /** Callback when user scrubs or sets the music start time */
  onSeekStartTime: (newStartTime: number) => void;
  /** Callback when user changes the clip duration */
  onChangeDuration?: (newDuration: number) => void;
  /** Callback to toggle play/pause preview */
  onTogglePlay?: () => void;
  /** Optional custom beat / section markers */
  markers?: MusicPresetMarker[];
}

// Format seconds into MM:SS
function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

// Fallback deterministic waveform peak generator
function generatePseudoPeaks(seedStr: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / count;
    // Musical curve: Intro quiet, build-up, big chorus at 30%-65%, breakdown, outro
    let envelope = 0.35;
    if (progress < 0.15) {
      envelope = 0.25 + progress * 2.5; // Intro rising
    } else if (progress >= 0.15 && progress < 0.35) {
      envelope = 0.65 + Math.sin(progress * 20) * 0.15; // Buildup
    } else if (progress >= 0.35 && progress < 0.70) {
      envelope = 0.85 + Math.sin(progress * 30) * 0.15; // Hook / Chorus Drop (High energy)
    } else {
      envelope = 0.55 + Math.sin(progress * 15) * 0.2; // Bridge / Outro
    }

    // Dynamic pseudo-random variation
    const pseudoRand = ((Math.sin(hash + i * 9.3) + 1) / 2) * 0.45;
    const finalVal = Math.min(1, Math.max(0.12, envelope * 0.65 + pseudoRand));
    peaks.push(finalVal);
  }
  return peaks;
}

const DEFAULT_MARKERS: MusicPresetMarker[] = [
  { time: 0, label: 'Intro (0:00)', icon: '⚡', color: '#38bdf8' },
  { time: 8, label: 'Beat Drop (0:08)', icon: '💥', color: '#f43f5e' },
  { time: 15, label: 'Main Chorus (0:15)', icon: '👑', color: '#eab308' },
  { time: 22, label: 'Shehnai Climax (0:22)', icon: '🎺', color: '#a855f7' },
];

const DURATION_PRESETS = [
  { sec: 5, label: '5s Quick' },
  { sec: 7, label: '7s Story' },
  { sec: 10, label: '10s Reel' },
  { sec: 15, label: '15s Full' },
];

export const MusicWaveformGraph: React.FC<MusicWaveformGraphProps> = ({
  audioBuffer,
  trackId = 'default_track',
  trackTitle = 'Selected Music Track',
  trackArtist = 'Bridal & Salon Beats',
  totalDuration = 30,
  startTime,
  duration,
  currentTime = 0,
  isPlaying = false,
  onSeekStartTime,
  onChangeDuration,
  onTogglePlay,
  markers = DEFAULT_MARKERS,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [isDraggingLeftHandle, setIsDraggingLeftHandle] = useState(false);
  const [isDraggingRightHandle, setIsDraggingRightHandle] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTimeOffset, setDragStartTimeOffset] = useState(0);
  const [dragStartDuration, setDragStartDuration] = useState(0);

  const safeTotalDuration = Math.max(1, totalDuration || (audioBuffer ? audioBuffer.duration : 30));
  const barCount = 76; // Number of waveform vertical bars

  // Extract peak amplitudes from AudioBuffer or fallback to pseudo peaks
  const waveformPeaks = useMemo(() => {
    if (audioBuffer && audioBuffer.numberOfChannels > 0) {
      try {
        const channelData = audioBuffer.getChannelData(0);
        const totalSamples = channelData.length;
        const blockSize = Math.max(1, Math.floor(totalSamples / barCount));
        const peaks: number[] = [];

        for (let i = 0; i < barCount; i++) {
          const start = i * blockSize;
          let sumSquares = 0;
          let count = 0;
          // Step by 4 for high-speed RMS calculation
          for (let j = 0; j < blockSize; j += 4) {
            const sample = channelData[start + j] || 0;
            sumSquares += sample * sample;
            count++;
          }
          const rms = Math.sqrt(sumSquares / Math.max(1, count));
          // Normalize and amplify slightly for punchy visuals
          const norm = Math.min(1, Math.max(0.12, rms * 3.8));
          peaks.push(norm);
        }
        return peaks;
      } catch (err) {
        console.warn('Failed to extract audio peaks, using pseudo waveform', err);
      }
    }
    return generatePseudoPeaks(`${trackId}_${trackTitle}`, barCount);
  }, [audioBuffer, trackId, trackTitle]);

  // Clamp helper
  const clampStartTime = useCallback(
    (newStart: number, clipDuration: number = duration) => {
      const maxStart = Math.max(0, safeTotalDuration - clipDuration);
      return Math.min(maxStart, Math.max(0, newStart));
    },
    [safeTotalDuration, duration]
  );

  // Convert clientX to seconds offset
  const getSecondsFromPointerX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = relativeX / rect.width;
      return ratio * safeTotalDuration;
    },
    [safeTotalDuration]
  );

  // Handle direct click on waveform
  const handleGraphPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only trigger if clicked outside window handles
    if (isDraggingWindow || isDraggingLeftHandle || isDraggingRightHandle) return;
    const clickSec = getSecondsFromPointerX(e.clientX);
    // Center the duration window around the click point or align start
    const centeredStart = clickSec - duration / 2;
    const targetStart = clampStartTime(centeredStart);
    onSeekStartTime(Math.round(targetStart * 10) / 10);
  };

  // Start dragging selection window
  const handleWindowPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingWindow(true);
    setDragStartX(e.clientX);
    setDragStartTimeOffset(startTime);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Start dragging Left handle (Start Time fine-tune)
  const handleLeftHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingLeftHandle(true);
    setDragStartX(e.clientX);
    setDragStartTimeOffset(startTime);
    setDragStartDuration(duration);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Start dragging Right handle (Duration adjust)
  const handleRightHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingRightHandle(true);
    setDragStartX(e.clientX);
    setDragStartDuration(duration);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Global pointer move listener during drag
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX;
    const deltaSec = (deltaX / rect.width) * safeTotalDuration;

    if (isDraggingWindow) {
      const nextStart = clampStartTime(dragStartTimeOffset + deltaSec);
      onSeekStartTime(Math.round(nextStart * 10) / 10);
    } else if (isDraggingLeftHandle) {
      const nextStart = Math.max(0, Math.min(dragStartTimeOffset + dragStartDuration - 3, dragStartTimeOffset + deltaSec));
      const nextDuration = dragStartDuration - (nextStart - dragStartTimeOffset);
      onSeekStartTime(Math.round(nextStart * 10) / 10);
      if (onChangeDuration && nextDuration >= 3 && nextDuration <= 30) {
        onChangeDuration(Math.round(nextDuration));
      }
    } else if (isDraggingRightHandle) {
      const nextDuration = Math.max(3, Math.min(safeTotalDuration - startTime, dragStartDuration + deltaSec));
      if (onChangeDuration) {
        onChangeDuration(Math.round(nextDuration));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDraggingWindow(false);
    setIsDraggingLeftHandle(false);
    setIsDraggingRightHandle(false);
  };

  // Calculate percentages for window & playhead
  const windowLeftPct = Math.min(100, Math.max(0, (startTime / safeTotalDuration) * 100));
  const windowWidthPct = Math.min(100 - windowLeftPct, Math.max(3, (duration / safeTotalDuration) * 100));
  const playheadPct = Math.min(100, Math.max(0, (currentTime / safeTotalDuration) * 100));

  const endTime = Math.min(safeTotalDuration, startTime + duration);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #0b0f19 0%, #060911 100%)',
        border: '1.5px solid rgba(225, 48, 108, 0.35)',
        borderRadius: 16,
        padding: '14px 16px',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        userSelect: 'none',
      }}
    >
      {/* ── HEADER HUD: Track Info, Selected Window & Playhead ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f09433, #dc2743)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(220, 39, 67, 0.4)',
              flexShrink: 0,
            }}
          >
            <Music size={18} color="#ffffff" />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 220,
                }}
              >
                {trackTitle}
              </span>
              {isPlaying && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 9,
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    padding: '1px 6px',
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#4ade80',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                  LIVE
                </span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {trackArtist} • Track Duration: {formatTime(safeTotalDuration)}
            </div>
          </div>
        </div>

        {/* Selected Window HUD Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '5px 10px',
            borderRadius: 10,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>SET MUSIC CLIP</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#f43f5e', letterSpacing: 0.3 }}>
              {formatTime(startTime)} <span style={{ color: '#64748b' }}>➔</span> {formatTime(endTime)}
              <span style={{ fontSize: 10.5, color: '#facc15', marginLeft: 5 }}>({duration}s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE MUSIC WAVEFORM GRAPH ── */}
      <div style={{ position: 'relative', marginTop: 4 }}>
        <div
          ref={containerRef}
          onPointerDown={handleGraphPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'relative',
            height: 94,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            overflow: 'hidden',
            cursor: 'crosshair',
            touchAction: 'none',
            display: 'flex',
            alignItems: 'center',
            padding: '0 6px',
            boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Waveform Bars Container */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px',
              gap: 2,
              pointerEvents: 'none',
            }}
          >
            {waveformPeaks.map((peak, idx) => {
              const barProgress = (idx / barCount) * 100;
              const isInWindow = barProgress >= windowLeftPct && barProgress <= windowLeftPct + windowWidthPct;
              const isPastPlayhead = barProgress <= playheadPct;

              // Waveform styling
              const barHeight = Math.max(8, peak * 78);
              let barBg = 'rgba(100, 116, 139, 0.35)'; // Muted outside
              let barGlow = 'none';

              if (isInWindow) {
                if (isPlaying && isPastPlayhead) {
                  // Currently playing energy wave
                  barBg = 'linear-gradient(180deg, #fef08a 0%, #f59e0b 50%, #dc2626 100%)';
                  barGlow = '0 0 6px rgba(245, 158, 11, 0.8)';
                } else {
                  // Inside selected clip window
                  barBg = 'linear-gradient(180deg, #f09433 0%, #dc2743 70%, #bc2a8d 100%)';
                  barGlow = '0 0 4px rgba(220, 39, 67, 0.4)';
                }
              }

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: `${barHeight}px`,
                    maxHeight: '80px',
                    borderRadius: 999,
                    background: barBg,
                    boxShadow: barGlow,
                    transition: isPlaying ? 'none' : 'height 0.2s ease, background 0.15s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Time markers grid (subtle vertical guides) */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <div
              key={pct}
              style={{
                position: 'absolute',
                left: `${pct * 100}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* ── DRAGGABLE SELECTION WINDOW ("SET MUSIC" REGION) ── */}
          <div
            onPointerDown={handleWindowPointerDown}
            style={{
              position: 'absolute',
              left: `${windowLeftPct}%`,
              width: `${windowWidthPct}%`,
              top: 0,
              bottom: 0,
              background: 'rgba(225, 48, 108, 0.14)',
              borderTop: '2px solid #f43f5e',
              borderBottom: '2px solid #f43f5e',
              boxShadow: '0 0 25px rgba(225, 48, 108, 0.35), inset 0 0 15px rgba(244, 63, 94, 0.15)',
              cursor: isDraggingWindow ? 'grabbing' : 'grab',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              touchAction: 'none',
            }}
          >
            {/* Left Drag Handle */}
            <div
              onPointerDown={handleLeftHandlePointerDown}
              title="Drag to trim start time"
              style={{
                width: 14,
                height: '100%',
                background: 'linear-gradient(180deg, #f43f5e, #dc2626)',
                cursor: 'ew-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '-2px 0 8px rgba(244, 63, 94, 0.6)',
                zIndex: 12,
                touchAction: 'none',
              }}
            >
              <div style={{ width: 2, height: 16, background: '#fff', borderRadius: 1 }} />
            </div>

            {/* Center Floating Guide Tag */}
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: '#fff',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(244, 63, 94, 0.5)',
                padding: '2px 8px',
                borderRadius: 999,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={9} color="#facc15" />
              <span>DRAG GRAPH TO SET MUSIC ({duration}s)</span>
            </div>

            {/* Right Drag Handle */}
            <div
              onPointerDown={handleRightHandlePointerDown}
              title="Drag to change duration"
              style={{
                width: 14,
                height: '100%',
                background: 'linear-gradient(180deg, #f43f5e, #dc2626)',
                cursor: 'ew-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 0 8px rgba(244, 63, 94, 0.6)',
                zIndex: 12,
                touchAction: 'none',
              }}
            >
              <div style={{ width: 2, height: 16, background: '#fff', borderRadius: 1 }} />
            </div>
          </div>

          {/* ── REAL-TIME PLAYHEAD NEEDLE ── */}
          <div
            style={{
              position: 'absolute',
              left: `${playheadPct}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: '#ffffff',
              boxShadow: '0 0 10px #ffffff, 0 0 20px #f43f5e',
              zIndex: 15,
              pointerEvents: 'none',
              transition: isPlaying ? 'none' : 'left 0.15s ease',
            }}
          >
            {/* Playhead Top Pin */}
            <div
              style={{
                position: 'absolute',
                top: -1,
                left: -4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ffffff',
                border: '2px solid #f43f5e',
                boxShadow: '0 0 8px #ffffff',
              }}
            />
          </div>
        </div>

        {/* Timeline Second Ticks */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            color: '#64748b',
            fontWeight: 700,
            marginTop: 4,
            padding: '0 4px',
          }}
        >
          <span>0:00</span>
          <span>{formatTime(safeTotalDuration * 0.25)}</span>
          <span>{formatTime(safeTotalDuration * 0.5)}</span>
          <span>{formatTime(safeTotalDuration * 0.75)}</span>
          <span>{formatTime(safeTotalDuration)}</span>
        </div>
      </div>

      {/* ── CONTROLS ROW: Play/Pause, Precision Trimming, Duration Chips ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 2 }}>
        {/* Play/Pause & Micro-step Trimming */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              className="btn btn-sm"
              style={{
                background: isPlaying
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #f09433, #dc2743)',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(220, 39, 67, 0.45)',
                cursor: 'pointer',
              }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
              <span>{isPlaying ? 'Pause' : 'Play Preview'}</span>
            </button>
          )}

          {/* -1s / +1s Precision Step */}
          <button
            type="button"
            onClick={() => onSeekStartTime(Math.max(0, startTime - 1))}
            title="Step Back 1s"
            className="btn btn-xs btn-secondary"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 9px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 10.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <ChevronLeft size={13} />
            <span>-1s</span>
          </button>

          <button
            type="button"
            onClick={() => onSeekStartTime(clampStartTime(startTime + 1))}
            title="Step Forward 1s"
            className="btn btn-xs btn-secondary"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 9px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 10.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span>+1s</span>
            <ChevronRight size={13} />
          </button>

          {/* Reset to Start 0:00 */}
          <button
            type="button"
            onClick={() => onSeekStartTime(0)}
            title="Reset to Beginning (0:00)"
            className="btn btn-xs btn-secondary"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 8px',
              borderRadius: 8,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Clip Duration Presets */}
        {onChangeDuration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginRight: 2 }}>
              Clip Length:
            </span>
            {DURATION_PRESETS.map((p) => {
              const isSelected = duration === p.sec;
              return (
                <button
                  key={p.sec}
                  type="button"
                  onClick={() => onChangeDuration(p.sec)}
                  style={{
                    background: isSelected ? '#f43f5e' : 'rgba(255, 255, 255, 0.08)',
                    color: isSelected ? '#fff' : '#cbd5e1',
                    border: isSelected ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    padding: '3px 7px',
                    fontSize: 10,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── QUICK BEAT / SECTION JUMP MARKERS ── */}
      {markers && markers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
          <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Zap size={11} color="#facc15" /> Quick Beats:
          </span>
          {markers.map((m, idx) => {
            const isNear = Math.abs(startTime - m.time) < 1.5;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSeekStartTime(clampStartTime(m.time));
                }}
                style={{
                  background: isNear ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: isNear ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isNear ? '#fff' : '#cbd5e1',
                  borderRadius: 999,
                  padding: '2px 8px',
                  fontSize: 9.5,
                  fontWeight: isNear ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{m.icon || '🎵'}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
