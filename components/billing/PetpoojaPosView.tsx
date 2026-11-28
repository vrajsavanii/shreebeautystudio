'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Barcode,
  Camera,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  Printer,
  PauseCircle,
  PlayCircle,
  Coins,
  Sparkles,
  Smartphone,
  User,
  Phone,
  Tag,
  Check,
  ChevronDown,
  Layers,
  ShoppingBag,
  Scissors,
  CheckCircle2,
  X,
} from 'lucide-react';
import { InvoiceLine, BridalBooking, SalonData } from '@/types/salon';
import { money, autoCapitalizeName } from '@/lib/utils';
import { resolveBridalBookingPrice } from '@/lib/store';
import { playSuccessChime } from '@/lib/notification-sound';

export interface PetpoojaPosViewProps {
  data: SalonData;
  customer: string;
  setCustomer: (val: string) => void;
  mobile: string;
  setMobile: (val: string) => void;
  lines: InvoiceLine[];
  setLines: React.Dispatch<React.SetStateAction<InvoiceLine[]>>;
  discount: number;
  setDiscount: (val: number) => void;
  discountMode: 'percent' | 'amount';
  setDiscountMode: (val: 'percent' | 'amount') => void;
  billDiscountPercent: number | '';
  setBillDiscountPercent: (val: number | '') => void;
  advance: number;
  setAdvance: (val: number) => void;
  advanceMode: string;
  setAdvanceMode: (val: string) => void;
  paid: number | '';
  setPaid: (val: number | '') => void;
  mode: string;
  setMode: (val: string) => void;
  isSplitPayment: boolean;
  setIsSplitPayment: (val: boolean) => void;
  splitCash: number | '';
  setSplitCash: (val: number | '') => void;
  splitUpi: number | '';
  setSplitUpi: (val: number | '') => void;
  splitCard: number | '';
  setSplitCard: (val: number | '') => void;
  rawSubtotal: number;
  totalAllDiscount: number;
  roundOffDiff: number;
  roundedTotal: number;
  totalAfterLoyalty: number;
  finalPayable: number;
  balance: number;
  handleSave: () => void;
  handleParkCurrentBill: () => void;
  posStaffAssigned: string;
  setPosStaffAssigned: (val: string) => void;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  handleScanBarcode: () => void;
  setCameraModalOpen: (val: boolean) => void;
  setContactModalOpen: (val: boolean) => void;
  handleAllClearInvoice: () => void;
  cancelEditInvoice: () => void;
  editingInvoiceId: string | null;
  appointmentRef: string | null;
  hasBelowBuyLines: boolean;
  paymentOptions: string[];
  upiPaymentOptions: string[];
  posSearchInputRef: React.RefObject<HTMLInputElement>;
  onImportBridalBooking: (b: BridalBooking) => void;
}

export default function PetpoojaPosView({
  data,
  customer,
  setCustomer,
  mobile,
  setMobile,
  lines,
  setLines,
  discount,
  setDiscount,
  discountMode,
  setDiscountMode,
  billDiscountPercent,
  setBillDiscountPercent,
  advance,
  setAdvance,
  advanceMode,
  setAdvanceMode,
  paid,
  setPaid,
  mode,
  setMode,
  isSplitPayment,
  setIsSplitPayment,
  splitCash,
  setSplitCash,
  splitUpi,
  setSplitUpi,
  splitCard,
  setSplitCard,
  rawSubtotal,
  totalAllDiscount,
  roundOffDiff,
  roundedTotal,
  totalAfterLoyalty,
  finalPayable,
  balance,
  handleSave,
  handleParkCurrentBill,
  posStaffAssigned,
  setPosStaffAssigned,
  barcodeInput,
  setBarcodeInput,
  handleScanBarcode,
  setCameraModalOpen,
  setContactModalOpen,
  handleAllClearInvoice,
  cancelEditInvoice,
  editingInvoiceId,
  appointmentRef,
  hasBelowBuyLines,
  paymentOptions,
  upiPaymentOptions,
  posSearchInputRef,
  onImportBridalBooking,
}: PetpoojaPosViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('🔥 Popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [custSuggestOpen, setCustSuggestOpen] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('🔥 Popular');
    set.add('All');
    (data?.services || []).forEach((s) => {
      if (s.category && s.category.trim()) {
        set.add(s.category.trim());
      }
    });
    if ((data?.inventory || []).length > 0) {
      set.add('🛍️ Products');
    }
    return Array.from(set);
  }, [data?.services, data?.inventory]);

  // Catalog items list
  const catalogItems = useMemo(() => {
    const services = (data?.services || []).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category || 'General',
      price: Number(s.price) || 0,
      type: 'S' as const,
      barcode: '',
      stock: undefined as number | undefined,
    }));

    const products = (data?.inventory || []).map((p) => ({
      id: p.id,
      name: p.name,
      category: '🛍️ Products',
      price: Number(p.sell || p.mrp || 0),
      type: 'P' as const,
      barcode: p.barcode || '',
      stock: p.stock,
      brand: p.brand,
    }));

    let items = [...services, ...products];

    if (selectedCategory === '🔥 Popular') {
      const popKeywords = [
        'hair cut',
        'haircut',
        'cleanup',
        'clean up',
        'facial',
        'hair spa',
        'threading',
        'waxing',
        'd-tan',
        'bleach',
        'pedicure',
        'manicure',
      ];
      items = services.filter((s) => popKeywords.some((k) => s.name.toLowerCase().includes(k)));
      if (items.length === 0) items = services.slice(0, 16);
    } else if (selectedCategory === '🛍️ Products') {
      items = products;
    } else if (selectedCategory !== 'All') {
      items = services.filter((s) => s.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.barcode && it.barcode.toLowerCase().includes(q)) ||
          ((it as any).brand && (it as any).brand.toLowerCase().includes(q))
      );
    }

    return items;
  }, [data?.services, data?.inventory, selectedCategory, searchQuery]);

  // In-cart map for instant O(1) lookup
  const inCartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    lines.forEach((l) => {
      if (l.name && l.name.trim()) {
        const key = l.name.trim().toLowerCase();
        map.set(key, (map.get(key) || 0) + (Number(l.qty) || 1));
      }
    });
    return map;
  }, [lines]);

  // Add or increment item
  const handleAddItem = (item: {
    id: string;
    name: string;
    category: string;
    price: number;
    type: 'S' | 'P';
    barcode?: string;
  }) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.name && l.name.trim().toLowerCase() === item.name.trim().toLowerCase());
      if (idx !== -1) {
        const copy = [...prev];
        const cur = copy[idx];
        copy[idx] = { ...cur, qty: (Number(cur.qty) || 1) + 1 };
        return copy;
      }

      const newLine: InvoiceLine = {
        type: item.type,
        name: item.name,
        qty: 1,
        price: item.price,
        discount: 0,
        discountType: '%',
        productId: item.type === 'P' ? item.id : undefined,
        barcode: item.barcode,
        staff: posStaffAssigned || undefined,
      };

      const last = prev[prev.length - 1];
      if (last && (!last.name || last.name.trim() === '') && Number(last.price || 0) === 0) {
        const copy = [...prev];
        copy[prev.length - 1] = newLine;
        return copy;
      }
      return [...prev, newLine];
    });

    playSuccessChime();
  };

  // Decrement item
  const handleDecreaseItem = (itemName: string) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.name && l.name.trim().toLowerCase() === itemName.trim().toLowerCase());
      if (idx === -1) return prev;
      const copy = [...prev];
      const cur = copy[idx];
      const curQty = Number(cur.qty) || 1;
      if (curQty > 1) {
        copy[idx] = { ...cur, qty: curQty - 1 };
        return copy;
      } else {
        const filtered = copy.filter((_, i) => i !== idx);
        return filtered.length === 0
          ? [
              {
                type: 'S',
                name: '',
                qty: 1,
                price: 0,
                discount: 0,
                discountType: '%',
              },
            ]
          : filtered;
      }
    });
  };

  // Remove line item
  const handleRemoveLine = (idx: number) => {
    setLines((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.length === 0
        ? [
            {
              type: 'S',
              name: '',
              qty: 1,
              price: 0,
              discount: 0,
              discountType: '%',
            },
          ]
        : filtered;
    });
  };

  // Change to return calculation
  const cashGiven = typeof paid === 'number' ? paid : 0;
  const changeToReturn = cashGiven > finalPayable ? cashGiven - finalPayable : 0;

  // Preset cash tender chips
  const quickCashTenders = useMemo(() => {
    const list: Array<{ label: string; value: number }> = [];
    if (finalPayable > 0) {
      list.push({ label: 'Exact', value: finalPayable });
    }
    const presets = [100, 200, 500, 1000, 2000];
    presets.forEach((val) => {
      if (val >= finalPayable || list.length < 5) {
        list.push({ label: `₹${val}`, value: val });
      }
    });
    return list.slice(0, 5);
  }, [finalPayable]);

  // Customer match from store
  const matchedClient = useMemo(() => {
    if (!mobile && !customer) return null;
    const cleanMob = mobile.replace(/\D/g, '').slice(-10);
    return (data?.customers || []).find((c) => {
      const cMob = (c.mobile || '').replace(/\D/g, '').slice(-10);
      return (cleanMob && cMob === cleanMob) || (customer && c.name?.trim().toLowerCase() === customer.trim().toLowerCase());
    });
  }, [mobile, customer, data?.customers]);

  // Customer suggestions
  const clientSuggestions = useMemo(() => {
    if (!custSuggestOpen) return [];
    const term = (mobile || customer || '').trim().toLowerCase();
    if (term.length < 2) return [];
    return (data?.customers || [])
      .filter((c) => (c.name && c.name.toLowerCase().includes(term)) || (c.mobile && c.mobile.includes(term)))
      .slice(0, 6);
  }, [custSuggestOpen, mobile, customer, data?.customers]);

  return (
    <div className="petpooja-pos-container">
      {/* ══════════════════════════════════════════════════════════════
          LEFT PANE: VISUAL ITEM CATALOG & FAST SEARCH
          ══════════════════════════════════════════════════════════════ */}
      <div className="petpooja-catalog-pane">
        {/* Search Bar & Barcode Scanner Row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Text Filter Input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              color="#64748b"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              ref={posSearchInputRef}
              type="text"
              className="input"
              style={{
                width: '100%',
                height: 38,
                paddingLeft: 32,
                paddingRight: searchQuery ? 30 : 54,
                fontSize: 13,
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
              }}
              placeholder="Search catalog... (F2)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>
            ) : (
              <span
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#64748b',
                  background: '#f1f5f9',
                  padding: '2px 5px',
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                }}
              >
                F2
              </span>
            )}
          </div>

          {/* Barcode input for hardware scanner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input
              type="text"
              className="input"
              style={{
                width: 140,
                height: 38,
                fontSize: 12.5,
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                padding: '0 8px',
              }}
              placeholder="Scan Barcode…"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleScanBarcode();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setCameraModalOpen(true)}
              style={{
                height: 38,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
              }}
              title="Scan with Device Camera"
            >
              <Camera size={14} />
            </button>
          </div>
        </div>

        {/* Bridal Booking Quick Import (if available) */}
        {data?.bridal && data.bridal.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#be185d' }}>👑 Bridal Quick Import:</span>
            <select
              style={{
                flex: 1,
                height: 28,
                fontSize: 11.5,
                fontWeight: 600,
                border: '1px solid #f472b6',
                borderRadius: 6,
                background: '#ffffff',
                color: '#831843',
                padding: '0 6px',
              }}
              onChange={(e) => {
                const bId = e.target.value;
                if (!bId) return;
                const b = data.bridal?.find((x) => x.id === bId);
                if (b) {
                  onImportBridalBooking(b);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                -- Select Bridal Booking to Load --
              </option>
              {data.bridal.map((b) => {
                const resolved = resolveBridalBookingPrice(b, data?.bridalPackages, data?.services);
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.mobile || 'No Mobile'}) — {money(resolved)} [Bal: {money(b.balance)}]
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Category Carousel Pills */}
        <div className="petpooja-cat-tabs">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`petpooja-cat-tab ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Catalog Items Grid */}
        <div className="petpooja-items-grid">
          {catalogItems.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '36px 12px', textAlign: 'center', color: '#64748b' }}>
              <Scissors size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>No items match &quot;{searchQuery}&quot;</p>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Try searching another keyword or select &quot;All&quot;</span>
            </div>
          ) : (
            catalogItems.map((item) => {
              const inCartQty = inCartQtyMap.get(item.name.trim().toLowerCase()) || 0;
              const isInCart = inCartQty > 0;

              return (
                <div
                  key={item.id + item.name}
                  className={`petpooja-item-card ${isInCart ? 'in-cart' : ''}`}
                  onClick={(e) => {
                    // If user clicked inside the stepper, don't trigger outer card click
                    if ((e.target as HTMLElement).closest('.petpooja-stepper-btn')) return;
                    handleAddItem(item);
                  }}
                >
                  {/* Top Bar: Category pill & Type tag */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: item.type === 'P' ? '#fef3c7' : '#f0fdf4',
                        color: item.type === 'P' ? '#b45309' : '#15803d',
                        border: item.type === 'P' ? '1px solid #fde68a' : '1px solid #bbf7d0',
                        maxWidth: '85%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.type === 'P' ? '🛍️ Retail' : item.category}
                    </span>
                    {isInCart && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 900,
                          color: '#ffffff',
                          background: '#05424A',
                          borderRadius: 99,
                          padding: '1px 5px',
                        }}
                      >
                        x{inCartQty}
                      </span>
                    )}
                  </div>

                  {/* Middle: Item Name */}
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: '#0f172a',
                      lineHeight: 1.25,
                      marginTop: 6,
                      marginBottom: 6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </div>

                  {/* Bottom: Price Tag & In-Cart Stepper */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#05424A' }}>
                      {money(item.price)}
                    </span>

                    {isInCart ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          background: '#ffffff',
                          border: '1px solid #05424A',
                          borderRadius: 6,
                          padding: 1,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="petpooja-stepper-btn"
                          onClick={() => handleDecreaseItem(item.name)}
                          style={{
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            background: '#f1f5f9',
                            color: '#0f172a',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ fontSize: 11.5, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>
                          {inCartQty}
                        </span>
                        <button
                          type="button"
                          className="petpooja-stepper-btn"
                          onClick={() => handleAddItem(item)}
                          style={{
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            background: '#05424A',
                            color: '#ffffff',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#05424A',
                          background: '#f0fdfa',
                          border: '1px solid #ccfbf1',
                          padding: '2px 7px',
                          borderRadius: 5,
                        }}
                      >
                        + Add
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANE: ACTIVE ORDER PAD / TICKET (STICKY)
          ══════════════════════════════════════════════════════════════ */}
      <div className="petpooja-bill-pane">
        {/* Ticket Header & Beautician Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1.5px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#05424A', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>Order Ticket</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                {editingInvoiceId ? `(Edit: ${editingInvoiceId})` : `INV-${data?.invoiceSeq || 1001}`}
              </span>
            </div>
            {appointmentRef && (
              <span style={{ fontSize: 10, color: '#15803d', fontWeight: 700 }}>
                Linked Appt: {appointmentRef}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Staff / Stylist Assignment */}
            <select
              style={{
                height: 28,
                fontSize: 11.5,
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                background: '#f8fafc',
                color: '#334155',
                padding: '0 6px',
              }}
              value={posStaffAssigned}
              onChange={(e) => setPosStaffAssigned(e.target.value)}
              title="Assign primary beautician/stylist for this ticket"
            >
              <option value="">Beautician: All / General</option>
              {(data?.staff || []).map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Clear all items */}
            {lines.some((l) => l.name && l.name.trim() !== '') && (
              <button
                type="button"
                onClick={handleAllClearInvoice}
                style={{
                  height: 28,
                  padding: '0 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  border: '1px solid #fecdd3',
                  background: '#fff1f2',
                  color: '#e11d48',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                title="Clear Ticket"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Customer Bar: Mobile + Name + VIP Chips */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'center' }}>
            {/* Mobile Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                className="input"
                style={{
                  width: '100%',
                  height: 32,
                  fontSize: 12.5,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
                placeholder="Mobile (10 digits)"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  setCustSuggestOpen(true);
                }}
                onFocus={() => setCustSuggestOpen(true)}
              />
            </div>

            {/* Customer Name Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                style={{
                  width: '100%',
                  height: 32,
                  fontSize: 12.5,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
                placeholder="Client Name"
                value={customer}
                onChange={(e) => {
                  setCustomer(autoCapitalizeName(e.target.value));
                  setCustSuggestOpen(true);
                }}
                onFocus={() => setCustSuggestOpen(true)}
              />
            </div>

            {/* Phone Contact Import */}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setContactModalOpen(true)}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 11.5,
                background: '#ffffff',
              }}
              title="Import from device phonebook"
            >
              <Smartphone size={13} />
            </button>
          </div>

          {/* Autocomplete suggestions dropdown */}
          {clientSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 40,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginTop: 2,
                maxHeight: 180,
                overflowY: 'auto',
              }}
            >
              {clientSuggestions.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                  onMouseDown={() => {
                    setCustomer(c.name || '');
                    setMobile(c.mobile || '');
                    setCustSuggestOpen(false);
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                  <span style={{ color: '#64748b' }}>{c.mobile}</span>
                </div>
              ))}
            </div>
          )}

          {/* Loyalty & Wallet badges */}
          {matchedClient && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {Number(matchedClient.loyaltyPoints || 0) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 4, border: '1px solid #fde68a' }}>
                  🪙 {matchedClient.loyaltyPoints} pts
                </span>
              )}
              {Number(matchedClient.walletBalance || 0) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4, border: '1px solid #86efac' }}>
                  👛 {money(matchedClient.walletBalance)} Wallet
                </span>
              )}
              {matchedClient.openingBalanceType === 'To Receive' && Number(matchedClient.openingBalance || 0) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', background: '#fee2e2', padding: '1px 6px', borderRadius: 4, border: '1px solid #fca5a5' }}>
                  ⚠️ Due: {money(matchedClient.openingBalance)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Active Ticket Line Items Table */}
        <div style={{ maxHeight: 240, minHeight: 120, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          {lines.filter((l) => l.name && l.name.trim() !== '').length === 0 ? (
            <div style={{ padding: '28px 12px', textAlign: 'center', color: '#94a3b8' }}>
              <ShoppingBag size={24} style={{ opacity: 0.4, margin: '0 auto 6px' }} />
              <p style={{ fontSize: 12, fontWeight: 600 }}>Ticket is empty</p>
              <span style={{ fontSize: 10.5 }}>Tap items on the left to add to bill</span>
            </div>
          ) : (
            lines
              .filter((l) => l.name && l.name.trim() !== '')
              .map((line, idx) => {
                const qty = Number(line.qty) || 1;
                const price = Number(line.price) || 0;
                const lineTotal = qty * price;

                return (
                  <div key={line.name + idx} className="petpooja-ticket-item">
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: line.type === 'P' ? '#fef3c7' : '#f0fdf4',
                            color: line.type === 'P' ? '#b45309' : '#15803d',
                          }}
                        >
                          {line.type === 'P' ? 'P' : 'S'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {line.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                        {money(price)} each
                      </div>
                    </div>

                    {/* Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleDecreaseItem(line.name)}
                        style={{
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <Minus size={10} />
                      </button>
                      <span style={{ fontSize: 11.5, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddItem({
                            id: line.productId || '',
                            name: line.name,
                            category: '',
                            price: line.price,
                            type: line.type,
                          })
                        }
                        style={{
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #05424A',
                          background: '#05424A',
                          color: '#ffffff',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {/* Net Total & Delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', minWidth: 50, textAlign: 'right' }}>
                        {money(lineTotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', padding: 2 }}
                        title="Remove item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Bill Summary (Subtotal, Discount, Advance, Round-off) */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 11.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 3 }}>
            <span>Subtotal (Gross)</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{money(rawSubtotal)}</span>
          </div>

          {/* Discount presets & input */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#c2410c', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Bill Discount</span>
              <div style={{ display: 'inline-flex', gap: 2 }}>
                {[5, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDiscountMode('percent');
                      setBillDiscountPercent(pct);
                      const amt = Math.round((rawSubtotal * pct) / 100);
                      setDiscount(amt);
                    }}
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '1px 4px',
                      borderRadius: 3,
                      border: '1px solid #fdba74',
                      background: billDiscountPercent === pct ? '#c2410c' : '#ffffff',
                      color: billDiscountPercent === pct ? '#ffffff' : '#c2410c',
                      cursor: 'pointer',
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>-</span>
              <input
                type="number"
                min="0"
                style={{
                  width: 55,
                  height: 22,
                  fontSize: 11,
                  fontWeight: 700,
                  textAlign: 'right',
                  padding: '0 4px',
                  borderRadius: 4,
                  border: '1px solid #fdba74',
                }}
                value={discount || ''}
                placeholder="0"
                onChange={(e) => {
                  setDiscountMode('amount');
                  setBillDiscountPercent('');
                  setDiscount(Math.max(0, Number(e.target.value) || 0));
                }}
              />
            </div>
          </div>

          {/* Advance Deduction if any */}
          {Number(advance || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', marginBottom: 3 }}>
              <span>Advance Paid ({advanceMode})</span>
              <span style={{ fontWeight: 700 }}>- {money(advance)}</span>
            </div>
          )}

          {/* Round off */}
          {roundOffDiff !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 3 }}>
              <span>Round-off</span>
              <span style={{ fontWeight: 600 }}>{roundOffDiff > 0 ? `+${roundOffDiff}` : roundOffDiff}</span>
            </div>
          )}

          {/* Big Net Payable Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1.5px dashed #cbd5e1' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>Net Payable:</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#05424A' }}>{money(finalPayable)}</span>
          </div>
        </div>

        {/* Petpooja Quick Cash Tenders & Instant Change Calculator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick Cash Tender:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10.5, color: '#64748b' }}>Given: ₹</span>
              <input
                type="number"
                min="0"
                style={{
                  width: 75,
                  height: 26,
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '0 6px',
                  borderRadius: 5,
                  border: '1.5px solid #cbd5e1',
                  textAlign: 'right',
                }}
                value={paid === '' ? '' : paid}
                placeholder={finalPayable.toString()}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setPaid(val);
                }}
              />
            </div>
          </div>

          {/* Quick Tender Buttons */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {quickCashTenders.map((btn) => (
              <button
                key={btn.label}
                type="button"
                className={`petpooja-quick-tender-btn ${paid === btn.value ? 'active' : ''}`}
                onClick={() => {
                  setPaid(btn.value);
                  setMode('Cash');
                  setIsSplitPayment(false);
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Live Return Change Banner */}
          {changeToReturn > 0 && (
            <div className="petpooja-return-change-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💵</span>
                <span>Change to Return:</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900 }}>{money(changeToReturn)}</span>
            </div>
          )}
        </div>

        {/* Quick Payment Mode Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              height: 32,
              padding: '0 4px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 6,
              background: mode === 'Cash' && !isSplitPayment ? '#05424A' : '#f1f5f9',
              color: mode === 'Cash' && !isSplitPayment ? '#ffffff' : '#334155',
              border: mode === 'Cash' && !isSplitPayment ? 'none' : '1px solid #cbd5e1',
            }}
            onClick={() => {
              setMode('Cash');
              setIsSplitPayment(false);
              setPaid(finalPayable);
            }}
          >
            💵 Cash (F4)
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              height: 32,
              padding: '0 4px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 6,
              background: mode.includes('UPI') && !isSplitPayment ? '#05424A' : '#f1f5f9',
              color: mode.includes('UPI') && !isSplitPayment ? '#ffffff' : '#334155',
              border: mode.includes('UPI') && !isSplitPayment ? 'none' : '1px solid #cbd5e1',
            }}
            onClick={() => {
              setMode(upiPaymentOptions[0] || 'GPay UPI');
              setIsSplitPayment(false);
              setPaid(finalPayable);
            }}
          >
            📱 UPI (F8)
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              height: 32,
              padding: '0 4px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 6,
              background: mode === 'Card' && !isSplitPayment ? '#05424A' : '#f1f5f9',
              color: mode === 'Card' && !isSplitPayment ? '#ffffff' : '#334155',
              border: mode === 'Card' && !isSplitPayment ? 'none' : '1px solid #cbd5e1',
            }}
            onClick={() => {
              setMode('Card');
              setIsSplitPayment(false);
              setPaid(finalPayable);
            }}
          >
            💳 Card
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              height: 32,
              padding: '0 4px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 6,
              background: isSplitPayment ? '#05424A' : '#f1f5f9',
              color: isSplitPayment ? '#ffffff' : '#334155',
              border: isSplitPayment ? 'none' : '1px solid #cbd5e1',
            }}
            onClick={() => {
              setIsSplitPayment(!isSplitPayment);
              if (!isSplitPayment) {
                setSplitCash(finalPayable);
                setSplitUpi('');
                setSplitCard('');
              }
            }}
          >
            🔀 Split
          </button>
        </div>

        {/* If Split Payment is Active: Show split amount inputs */}
        {isSplitPayment && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '6px 8px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Cash</span>
              <input
                type="number"
                min="0"
                style={{ width: '100%', height: 26, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                value={splitCash === '' ? '' : splitCash}
                placeholder="0"
                onChange={(e) => setSplitCash(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>UPI</span>
              <input
                type="number"
                min="0"
                style={{ width: '100%', height: 26, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                value={splitUpi === '' ? '' : splitUpi}
                placeholder="0"
                onChange={(e) => setSplitUpi(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Card</span>
              <input
                type="number"
                min="0"
                style={{ width: '100%', height: 26, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                value={splitCard === '' ? '' : splitCard}
                placeholder="0"
                onChange={(e) => setSplitCard(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {/* Primary Action Buttons: Save & Print, Hold Bill, Reset */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {/* Hold Bill */}
          <button
            type="button"
            onClick={handleParkCurrentBill}
            style={{
              height: 44,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              border: '1px solid #fed7aa',
              background: '#fff7ed',
              color: '#c2410c',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Park active bill to serve another customer (F7)"
          >
            <PauseCircle size={15} />
            <span className="hide-on-mobile">Hold (F7)</span>
          </button>

          {/* Reset / All Clear */}
          <button
            type="button"
            onClick={editingInvoiceId ? cancelEditInvoice : handleAllClearInvoice}
            style={{
              height: 44,
              padding: '0 10px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              border: '1px solid #fecdd3',
              background: '#fff1f2',
              color: '#e11d48',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
            title={editingInvoiceId ? 'Cancel Edit' : 'Reset form'}
          >
            <RotateCcw size={14} />
          </button>

          {/* Primary Save & Print Bill */}
          <button
            type="button"
            className="btn btn-primary"
            style={{
              flex: 1,
              height: 44,
              padding: '0 14px',
              fontSize: 15,
              fontWeight: 800,
              borderRadius: 8,
              cursor: 'pointer',
              background: hasBelowBuyLines ? '#dc2626' : 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)',
              boxShadow: '0 2px 8px rgba(5, 66, 74, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onClick={handleSave}
            title="Generate invoice & print receipt (Ctrl+Enter)"
          >
            <Printer size={16} />
            <span>
              {editingInvoiceId ? 'Update & Print' : 'Save & Print (Ctrl+Enter)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
