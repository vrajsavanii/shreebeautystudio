'use client';

import { useState } from 'react';
import { Printer, X, Tag, SlidersHorizontal, Check } from 'lucide-react';
import { InventoryItem } from '@/types/salon';
import { money, fmtDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

interface BarcodeLabelSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  salonName?: string;
}

// Generate simple SVG Barcode pattern from string
function BarcodeSvg({ value }: { value: string }) {
  const cleanVal = (value || '890000000000').replace(/[^0-9A-Za-z]/g, '');
  // Deterministic bar widths based on char codes
  const bars: { width: number; space: number }[] = [];
  for (let i = 0; i < cleanVal.length; i++) {
    const code = cleanVal.charCodeAt(i);
    const w1 = (code % 3) + 1;
    const s1 = ((code >> 1) % 2) + 1;
    const w2 = ((code >> 2) % 3) + 1;
    const s2 = ((code >> 3) % 2) + 1;
    bars.push({ width: w1, space: s1 });
    bars.push({ width: w2, space: s2 });
  }

  let totalWidth = bars.reduce((acc, b) => acc + b.width + b.space, 0) + 12;

  let currentX = 6;
  return (
    <svg
      viewBox={`0 0 ${totalWidth} 42`}
      style={{ width: '100%', height: '36px', display: 'block', margin: '2px 0' }}
    >
      <rect x="0" y="0" width={totalWidth} height="42" fill="#ffffff" />
      {/* Guard bars */}
      <rect x="2" y="0" width="2" height="42" fill="#000000" />
      <rect x="5" y="0" width="1" height="42" fill="#000000" />
      {bars.map((bar, idx) => {
        const x = currentX;
        currentX += bar.width + bar.space;
        return (
          <rect
            key={idx}
            x={x}
            y="0"
            width={bar.width}
            height="34"
            fill="#000000"
          />
        );
      })}
      {/* End Guard bars */}
      <rect x={totalWidth - 6} y="0" width="1" height="42" fill="#000000" />
      <rect x={totalWidth - 3} y="0" width="2" height="42" fill="#000000" />
    </svg>
  );
}

export default function BarcodeLabelSheet({
  isOpen,
  onClose,
  items,
  salonName = 'Shree Beauty Studio',
}: BarcodeLabelSheetProps) {
  const [copiesPerItem, setCopiesPerItem] = useState(4);
  const [showSalonName, setShowSalonName] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showDates, setShowDates] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    items.slice(0, 10).map((i) => i.id)
  );

  const selectedItems = items.filter((i) => selectedItemIds.includes(i.id));

  // Flatten label cards list
  const labelsToPrint: InventoryItem[] = [];
  selectedItems.forEach((item) => {
    for (let c = 0; c < copiesPerItem; c++) {
      labelsToPrint.push(item);
    }
  });

  const toggleSelectAll = () => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((i) => i.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏷️ Print Barcode Sticker Labels (Sheet)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>
            Total Labels to Print: {labelsToPrint.length} Stickers
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handlePrint} disabled={labelsToPrint.length === 0}>
              <Printer size={15} /> Print Barcode Sheet
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Print Settings Toolbar */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
              Stickers per Product:
            </label>
            <input
              type="number"
              min={1}
              max={50}
              className="input"
              style={{ width: 70, padding: '5px 8px', fontSize: 13 }}
              value={copiesPerItem}
              onChange={(e) => setCopiesPerItem(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showSalonName}
                onChange={(e) => setShowSalonName(e.target.checked)}
              />
              Studio Name
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showMrp}
                onChange={(e) => setShowMrp(e.target.checked)}
              />
              MRP
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
              />
              Offer Price
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showDates}
                onChange={(e) => setShowDates(e.target.checked)}
              />
              Buy & Exp Dates
            </label>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleSelectAll}
            style={{ marginLeft: 'auto', fontSize: 12 }}
          >
            {selectedItemIds.length === items.length ? 'Deselect All' : `Select All (${items.length})`}
          </button>
        </div>

        {/* Product Selection Chips */}
        <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((item) => {
            const isSelected = selectedItemIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: isSelected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(5, 66, 74, 0.08)' : '#ffffff',
                  color: isSelected ? 'var(--teal)' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Check size={12} color="var(--teal)" />}
                <span>{item.name}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>[{item.barcode || 'No Code'}]</span>
              </button>
            );
          })}
        </div>

        {/* Printable Label Grid Preview */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>
            Sheet Preview (A4 Standard 3×8 / 24-Sticker Grid):
          </div>

          <div
            id="printable-barcode-sheet"
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: 8,
              padding: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              maxHeight: 380,
              overflowY: 'auto',
            }}
          >
            {labelsToPrint.map((item, idx) => (
              <div
                key={idx}
                className="barcode-sticker"
                style={{
                  border: '1px dashed #94a3b8',
                  borderRadius: 6,
                  padding: '8px 10px',
                  textAlign: 'center',
                  background: '#ffffff',
                  pageBreakInside: 'avoid',
                }}
              >
                {showSalonName && (
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: '#05424A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {salonName}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                  {item.name} {item.brand ? `(${item.brand})` : ''}
                </div>

                <BarcodeSvg value={item.barcode || '890123456001'} />

                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#334155', fontFamily: 'monospace' }}>
                  {item.barcode || '890123456001'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3, fontSize: 10 }}>
                  {showMrp && (
                    <span style={{ color: '#64748b', textDecoration: 'line-through' }}>
                      MRP: {money(item.mrp || item.sell * 1.15)}
                    </span>
                  )}
                  {showPrice && (
                    <span style={{ fontWeight: 800, color: '#05424A', marginLeft: 'auto' }}>
                      Offer: {money(item.sell)}
                    </span>
                  )}
                </div>

                {showDates && (item.buyDate || item.expiry) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748b', marginTop: 2, borderTop: '0.5px solid #e2e8f0', paddingTop: 2 }}>
                    {item.buyDate ? <span>Buy: {fmtDate(item.buyDate)}</span> : <span />}
                    {item.expiry ? <span style={{ fontWeight: 600 }}>Exp: {fmtDate(item.expiry)}</span> : <span />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
