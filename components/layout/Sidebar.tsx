'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Check, RotateCcw,
  ExternalLink, SlidersHorizontal, Sparkles, X, MoveVertical, GripVertical
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave, cloudSync } from '@/lib/sync';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';
import {
  DEFAULT_NAV_ITEMS,
  DEFAULT_NAV_ORDER,
  getSortedNavItems,
  moveItemDirection,
  reorderArray,
  NavItem,
} from '@/lib/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data, updateData, currentUser } = useSalonStore();
  const { toast } = useToast();
  const salonName = data?.settings?.salon || 'Shree Beauty Studio';

  const [isReordering, setIsReordering] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const savedOrder = data?.settings?.sidebarNavOrder || DEFAULT_NAV_ORDER;

  // Keep local order state synchronized with store when not reordering
  useEffect(() => {
    if (!isReordering) {
      setCurrentOrder(savedOrder);
    }
  }, [savedOrder, isReordering]);

  const isSalesperson = currentUser?.role === 'Salesperson';

  // Compute sorted nav items based on current active order (during reorder or normal)
  const effectiveOrder = isReordering ? currentOrder : savedOrder;
  const allSortedNav = getSortedNavItems(effectiveOrder);

  const visibleNav = allSortedNav.filter((item) => {
    if (isSalesperson) {
      return item.role === 'all';
    }
    return true;
  });

  // Handle Move Up / Move Down
  const handleMove = (index: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Map visible item index back to currentOrder IDs
    const visibleIds = visibleNav.map((item) => item.id);
    const targetId = visibleIds[index];
    const fullIndex = currentOrder.indexOf(targetId);

    if (fullIndex === -1) return;

    // Find destination index in full order
    const nextIndex = direction === 'up' ? fullIndex - 1 : fullIndex + 1;
    if (nextIndex < 0 || nextIndex >= currentOrder.length) return;

    const newOrder = reorderArray(currentOrder, fullIndex, nextIndex);
    setCurrentOrder(newOrder);
  };

  // Save new order to store & cloud
  const handleSaveOrder = async () => {
    updateData((d) => ({
      ...d,
      settings: {
        ...d.settings,
        sidebarNavOrder: currentOrder,
      },
    }));
    scheduleSave();
    try {
      await cloudSync();
      toast('✅ Sidebar tab arrangement saved & synced!', 'success');
    } catch {
      toast('✅ Sidebar tab arrangement saved locally!', 'success');
    }
    setIsReordering(false);
  };

  // Reset order to factory defaults
  const handleResetOrder = () => {
    setCurrentOrder(DEFAULT_NAV_ORDER);
    updateData((d) => ({
      ...d,
      settings: {
        ...d.settings,
        sidebarNavOrder: DEFAULT_NAV_ORDER,
      },
    }));
    scheduleSave();
    toast('🔄 Reset to default sidebar arrangement!', 'info');
  };

  // Drag & drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const visibleIds = visibleNav.map((item) => item.id);
    const sourceId = visibleIds[draggedIndex];
    const targetId = visibleIds[dropIndex];

    const sourceFullIdx = currentOrder.indexOf(sourceId);
    const targetFullIdx = currentOrder.indexOf(targetId);

    if (sourceFullIdx !== -1 && targetFullIdx !== -1) {
      const newOrder = reorderArray(currentOrder, sourceFullIdx, targetFullIdx);
      setCurrentOrder(newOrder);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <nav className="sidebar no-print" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Direct Brand Logo Banner - Seamless Borderless Big Size */}
      <div
        style={{
          padding: '12px 14px 6px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src={SHREE_LOGO_BASE64}
          alt={salonName}
          style={{
            width: '100%',
            maxWidth: '230px',
            height: 'auto',
            display: 'block',
            objectFit: 'contain',
            border: 'none',
            outline: 'none',
          }}
        />
      </div>

      {/* Reorder Mode Notification Banner */}
      <AnimatePresence>
        {isReordering && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'linear-gradient(135deg, rgba(234, 186, 56, 0.18) 0%, rgba(212, 155, 31, 0.12) 100%)',
              border: '1px solid rgba(234, 186, 56, 0.35)',
              borderRadius: 8,
              margin: '6px 10px',
              padding: '8px 10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowUpDown size={14} color="#EABA38" />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#EABA38' }}>
                  Manual Tab Arranger
                </span>
              </div>
              <button
                onClick={() => setIsReordering(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
                title="Cancel Reordering"
              >
                <X size={13} />
              </button>
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3, marginBottom: 8 }}>
              Click <b>▲ Up</b> / <b>▼ Down</b> buttons or drag tabs to rearrange.
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={handleSaveOrder}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '5px 8px',
                  borderRadius: 6,
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Check size={12} /> Save Order
              </button>
              <button
                onClick={handleResetOrder}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px 7px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.85)',
                  border: 'none',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
                title="Reset to default order"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav Items */}
      <motion.div
        className="sidebar-nav"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ flex: 1, overflowY: 'auto' }}
      >
        {visibleNav.map((item, index) => {
          const { href, label, icon: Icon, id } = item;
          const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          const isFirst = index === 0;
          const isLast = index === visibleNav.length - 1;
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;

          return (
            <motion.div
              key={id}
              variants={fadeSlideUp}
              draggable={isReordering}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              style={{
                position: 'relative',
                opacity: isDragging ? 0.4 : 1,
                borderTop: isOver ? '2px solid #EABA38' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {isReordering ? (
                /* Reorder Mode Row */
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px 6px 12px',
                    marginRight: 8,
                    borderRadius: '0 8px 8px 0',
                    background: isOver
                      ? 'rgba(234, 186, 56, 0.22)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderLeft: '3px solid #EABA38',
                    cursor: 'grab',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <GripVertical size={13} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
                    <Icon size={14.5} color="#EABA38" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Move Up / Move Down Arrow Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={(e) => handleMove(index, 'up', e)}
                      style={{
                        background: isFirst ? 'transparent' : 'rgba(255,255,255,0.12)',
                        color: isFirst ? 'rgba(255,255,255,0.2)' : '#ffffff',
                        border: 'none',
                        borderRadius: 4,
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isFirst ? 'not-allowed' : 'pointer',
                        padding: 0,
                      }}
                      title={`Move ${label} Up`}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={(e) => handleMove(index, 'down', e)}
                      style={{
                        background: isLast ? 'transparent' : 'rgba(255,255,255,0.12)',
                        color: isLast ? 'rgba(255,255,255,0.2)' : '#ffffff',
                        border: 'none',
                        borderRadius: 4,
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isLast ? 'not-allowed' : 'pointer',
                        padding: 0,
                      }}
                      title={`Move ${label} Down`}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Link Row */
                <Link
                  href={href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15.5} className="icon" />
                  <span>{label}</span>
                </Link>
              )}
            </motion.div>
          );
        })}

        {/* Public Website Preview Link */}
        <motion.div variants={fadeSlideUp} style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link
            href="/"
            target="_blank"
            className="sidebar-link"
            style={{ color: '#EABA38', fontWeight: 600 }}
          >
            <ExternalLink size={15} className="icon" color="#EABA38" />
            Public Website ↗
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom Reorder Trigger Button (Admin / Quick Toggle) */}
      {!isSalesperson && (
        <div
          style={{
            padding: '8px 12px 10px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => setIsReordering((prev) => !prev)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              background: isReordering
                ? 'rgba(234, 186, 56, 0.25)'
                : 'rgba(255, 255, 255, 0.07)',
              border: isReordering
                ? '1px solid #EABA38'
                : '1px solid rgba(255, 255, 255, 0.12)',
              color: isReordering ? '#EABA38' : 'rgba(255, 255, 255, 0.75)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Arrange and Reorder Navigation Tabs Up & Down"
          >
            <ArrowUpDown size={13} />
            <span>{isReordering ? 'Close Tab Arranger' : 'Arrange Tabs ⇅'}</span>
          </button>

          <Link
            href="/admin/settings?tab=sidebar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(255, 255, 255, 0.7)',
              textDecoration: 'none',
            }}
            title="Open Full Sidebar Settings"
          >
            <SlidersHorizontal size={13} />
          </Link>
        </div>
      )}
    </nav>
  );
}
