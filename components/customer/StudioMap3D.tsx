'use client';

import React, { useState } from 'react';
import { MapPin, ExternalLink, Navigation, Star } from 'lucide-react';
import { useSalonStore } from '@/lib/store';

interface StudioMap3DProps {
  height?: number | string;
  className?: string;
  showCardOverlay?: boolean;
}

// Google Maps Embed PB Strings
// !5e1 = Realistic 3D Satellite Imagery layer
// !5e0 = Roadmap Vector layer
// Exact Place: Shree beauty studio, Katargam, Surat (Place ID: 0x3be04f0b9062c70f:0xa017a32a652d8ad2)
const SATELLITE_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d700!2d72.8158985!3d21.2369033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04f0b9062c70f%3A0xa017a32a652d8ad2!2sShree%20beauty%20studio!5e1!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin';

const ROADMAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1400!2d72.8158985!3d21.2369033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04f0b9062c70f%3A0xa017a32a652d8ad2!2sShree%20beauty%20studio!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin';

export const STUDIO_GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Shree+beauty+studio/@21.2369639,72.8160001,283m/data=!3m1!1e3!4m8!3m7!1s0x3be04f0b9062c70f:0xa017a32a652d8ad2!8m2!3d21.2369033!4d72.8158985!9m1!1b1!16s%2Fg%2F11kqdqq61p?entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D';

export default function StudioMap3D({
  height = '100%',
  className = '',
  showCardOverlay = true,
}: StudioMap3DProps) {
  const { data } = useSalonStore();
  const settings = data?.settings;
  const mapsUrl = settings?.googleMapsUrl || STUDIO_GOOGLE_MAPS_URL;
  const embedCustom = settings?.googleMapsEmbedUrl;

  // Default to Realistic 3D Satellite view
  const [viewMode, setViewMode] = useState<'satellite' | 'roadmap'>('satellite');
  const [isMapInteractive, setIsMapInteractive] = useState(false);

  const currentEmbedUrl = embedCustom || (viewMode === 'satellite' ? SATELLITE_EMBED_URL : ROADMAP_EMBED_URL);

  return (
    <div
      className={className}
      onClick={() => setIsMapInteractive(true)}
      onMouseLeave={() => setIsMapInteractive(false)}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: typeof height === 'number' ? height : 380,
        height: height,
        background: '#0f172a',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Floating Controls Bar */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Toggle Mode Switcher */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: 4,
            borderRadius: 99,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('satellite')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background:
                viewMode === 'satellite'
                  ? 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)'
                  : 'transparent',
              color: viewMode === 'satellite' ? '#ffffff' : '#94a3b8',
              boxShadow:
                viewMode === 'satellite' ? '0 2px 8px rgba(5, 66, 74, 0.5)' : 'none',
            }}
          >
            <span style={{ fontSize: 13 }}>🛰️</span>
            <span>3D Satellite</span>
            {viewMode === 'satellite' && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px #22c55e',
                }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode('roadmap')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background:
                viewMode === 'roadmap'
                  ? 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)'
                  : 'transparent',
              color: viewMode === 'roadmap' ? '#ffffff' : '#94a3b8',
              boxShadow:
                viewMode === 'roadmap' ? '0 2px 8px rgba(5, 66, 74, 0.5)' : 'none',
            }}
          >
            <span style={{ fontSize: 13 }}>🗺️</span>
            <span>Street Map</span>
          </button>
        </div>

        {/* Direct Link to Google 3D / Directions */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in full Google Maps app for 3D navigation & turn-by-turn directions"
          style={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#0f172a',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 99,
            textDecoration: 'none',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            transition: 'transform 0.15s ease, background 0.15s ease',
          }}
        >
          <Navigation size={13} color="#05424A" />
          <span>Open 3D Map</span>
          <ExternalLink size={12} color="#64748b" />
        </a>
      </div>

      {/* Actual Google Maps Iframe (Clipped to eliminate native Google white info box) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          minHeight: typeof height === 'number' ? height : 380,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <iframe
          key={viewMode}
          src={currentEmbedUrl}
          width="100%"
          height="100%"
          style={{
            border: 0,
            width: '100%',
            height: 'calc(100% + 145px)',
            marginTop: '-135px',
            display: 'block',
            filter: viewMode === 'satellite' ? 'contrast(1.04) saturate(1.04)' : 'none',
            pointerEvents: isMapInteractive ? 'auto' : 'none',
          }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Shree Beauty Studio Katargam Surat 3D Location Map"
        />
      </div>

      {/* Tap / Click to interact hint overlay */}
      {!isMapInteractive && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9,
            background: 'rgba(3, 43, 48, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: 99,
            fontSize: 12.5,
            fontWeight: 600,
            border: '1px solid rgba(234, 186, 56, 0.4)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>👆 Click map to pan & explore</span>
        </div>
      )}

      {/* Floating Bottom Card: Studio Verification & Rating Overlay */}
      {showCardOverlay && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            zIndex: 10,
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: 14,
              padding: '8px 12px',
              color: '#ffffff',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              maxWidth: 380,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #05424A 0%, #0e7490 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <MapPin size={16} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                  Shree Beauty Studio
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    background: '#16a34a',
                    color: '#ffffff',
                    padding: '1px 5px',
                    borderRadius: 4,
                    letterSpacing: '0.02em',
                  }}
                >
                  VERIFIED
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: '#e2e8f0',
                  marginTop: 1,
                }}
              >
                <div style={{ display: 'flex', color: '#f59e0b' }}>
                  <Star size={10} fill="#f59e0b" />
                </div>
                <span style={{ fontWeight: 700, color: '#fde047' }}>4.9</span>
                <span style={{ color: '#94a3b8', fontSize: 10 }}>(72 reviews)</span>
                <span style={{ color: '#64748b' }}>•</span>
                <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: 10 }}>
                  Katargam, Surat
                </span>
              </div>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '5px 10px',
                borderRadius: 7,
                background: '#05424A',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 700,
                textDecoration: 'none',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Directions</span>
              <Navigation size={10} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
