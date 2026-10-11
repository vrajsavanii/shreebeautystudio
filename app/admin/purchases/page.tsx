'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Search, Eye, Trash2, Calendar, FileText, CheckCircle,
  Barcode, PlusCircle, Building2, AlertTriangle, ArrowRight, UserPlus, Camera, Pencil,
  Layers, ChevronDown, ChevronUp, Copy,
  Upload, CheckCircle2, RefreshCw, Sparkles, FileUp, Link2, Check, BookmarkCheck
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave, cloudSave, cloudSync } from '@/lib/sync';
import { uid, todayISO, money, fmtDate, toMonthInput, fmtExpiry } from '@/lib/utils';
import { Purchase, PurchaseLine, Supplier, InventoryItem } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import StatCard from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import Link from 'next/link';
import CameraBarcodeScanner from '@/components/barcode/CameraBarcodeScanner';
import { matchBillItemToInventory, addAliasToInventoryItem } from '@/lib/bill-product-matcher';

// Client-side image compression for fast bill upload
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const DEFAULT_LINE_COL_WIDTHS = [135, 195, 105, 52, 75, 75, 72, 54, 92, 58];
const MIN_LINE_COL_WIDTHS = [85, 110, 80, 42, 55, 55, 52, 45, 68, 50];

const PURCHASE_LINE_HEADERS = [
  { id: 'barcode', label: 'Barcode', align: 'left' },
  { id: 'name', label: 'Product Name *', align: 'left' },
  { id: 'expiry', label: 'Expiry (MM/YY)', align: 'left' },
  { id: 'qty', label: 'Qty', align: 'center' },
  { id: 'rate', label: 'Buy Rate', align: 'right' },
  { id: 'mrp', label: 'MRP (₹)', align: 'right' },
  { id: 'margin', label: 'Margin %', align: 'center' },
  { id: 'gst', label: 'GST', align: 'center' },
  { id: 'total', label: 'Item Total', align: 'right' },
  { id: 'actions', label: '', align: 'center' },
] as const;

const EMPTY_LINE = (defaultGst = 0): PurchaseLine => ({
  barcode: '',
  name: '',
  batch: '',
  expiry: '',
  qty: 1,
  rate: 0,
  gst: Number(defaultGst || 0),
});

function inferBrandAndCategory(name: string): { brand: string; category: string } {
  const lower = (name || '').toLowerCase();
  let brand = 'General';
  let category = 'Skin Care & Facials';

  if (lower.includes('jeannot')) {
    brand = 'Jeannot Professional';
    category = 'Skin Care & Facials';
  } else if (lower.includes("l'oreal") || lower.startsWith('lp ') || lower.includes('absolut repair') || lower.includes('vitamino')) {
    brand = "L'Oreal Professionnel";
    category = lower.includes('shampoo') || lower.includes('mask') || lower.includes('hair') ? 'Hair Care & Shampoo' : 'Salon Consumables';
  } else if (lower.includes('matrix') || lower.includes('biolage')) {
    brand = 'Matrix Biolage';
    category = 'Hair Care & Shampoo';
  } else if (lower.includes('schwarzkopf')) {
    brand = 'Schwarzkopf';
    category = 'Hair Care & Shampoo';
  } else if (lower.includes('o3+')) {
    brand = 'O3+ Professional';
    category = 'Skin Care & Facials';
  } else if (lower.includes('lotus')) {
    brand = 'Lotus Herbals Professional';
    category = 'Skin Care & Facials';
  } else if (lower.includes('streax')) {
    brand = 'Streax Professional';
    category = 'Hair Serum & Oils';
  } else if (lower.includes('vlcc')) {
    brand = 'VLCC Professional';
    category = 'Skin Care & Facials';
  } else if (lower.includes('raaga')) {
    brand = 'Raaga Professional';
    category = 'Skin Care & Facials';
  } else if (lower.includes('rica')) {
    brand = 'Rica Professional';
    category = 'Salon Consumables';
  } else if (lower.includes('shampoo') || lower.includes('conditioner') || lower.includes('hair spa')) {
    category = 'Hair Care & Shampoo';
  } else if (lower.includes('serum') || lower.includes('oil')) {
    category = 'Hair Serum & Oils';
  } else if (lower.includes('facial') || lower.includes('bleach') || lower.includes('d-tan') || lower.includes('mask') || lower.includes('cream')) {
    category = 'Skin Care & Facials';
  } else if (lower.includes('lipstick') || lower.includes('foundation') || lower.includes('makeup')) {
    category = 'Makeup & Cosmetics';
  } else if (lower.includes('wax') || lower.includes('strip') || lower.includes('tissue') || lower.includes('cotton')) {
    category = 'Salon Consumables';
  }

  return { brand, category };
}

type PurchaseTab = 'all' | 'dues' | 'settled';

export default function PurchasesPage() {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  useEffect(() => {
    // Reconcile purchases and inventory with live Supabase cloud
    cloudSync().catch(() => {});
  }, []);

  const [activeTab, setActiveTab] = useState<PurchaseTab>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [quickSupplierModal, setQuickSupplierModal] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [editPurchaseId, setEditPurchaseId] = useState<string | null>(null);
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null);

  // Expandable Item Order Breakdown in Main Table Rows
  const [expandedPurchaseIds, setExpandedPurchaseIds] = useState<Record<string, boolean>>({});
  const [showAllItemRows, setShowAllItemRows] = useState(false);

  const toggleRowExpand = (id: string) => {
    setExpandedPurchaseIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const defaultGst = Number(data?.settings?.defaultGstRate || 0);

  // Draggable / Resizable Column Widths for Purchase Line Items (Mouse & Touch)
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_LINE_COL_WIDTHS);
  const [resizingColIdx, setResizingColIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('shree_purchase_col_widths');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_LINE_COL_WIDTHS.length) {
          setColWidths(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const resetColWidths = () => {
    setColWidths(DEFAULT_LINE_COL_WIDTHS);
    try {
      localStorage.removeItem('shree_purchase_col_widths');
    } catch {
      // ignore
    }
  };

  const startColResize = (colIdx: number, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColIdx(colIdx);

    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startW = colWidths[colIdx];
    const minW = MIN_LINE_COL_WIDTHS[colIdx] || 40;

    let currentW = startW;

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const diff = clientX - startX;
      currentW = Math.max(minW, Math.round(startW + diff));

      setColWidths((prev) => {
        const next = [...prev];
        next[colIdx] = currentW;
        return next;
      });
    };

    const onEnd = () => {
      setResizingColIdx(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      setColWidths((latest) => {
        try {
          localStorage.setItem('shree_purchase_col_widths', JSON.stringify(latest));
        } catch {
          // ignore
        }
        return latest;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  const lineGridTemplate = useMemo(() => {
    return colWidths.map((w) => `${w}px`).join(' ');
  }, [colWidths]);

  const totalLineWidth = useMemo(() => {
    return colWidths.reduce((a, b) => a + b, 0) + (colWidths.length - 1) * 6;
  }, [colWidths]);



  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [supplierInvoice, setSupplierInvoice] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([EMPTY_LINE(defaultGst)]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [mode, setMode] = useState(data?.settings?.payments?.[0] || 'Cash');
  const [notes, setNotes] = useState('');
  const [billImage, setBillImage] = useState<string>('');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const billAttachInputRef = useRef<HTMLInputElement | null>(null);
  const billCameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleBillAttachFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const base64 = await compressImage(file);
      setBillImage(base64);
      setBillImage(base64);
      toast('✓ Bill photo attached successfully!', 'success');
    } catch {
      toast('Failed to process image file.', 'error');
    }
  };

  // Fast Barcode Lookup & Mobile Camera Scan for Purchases
  const [barcodeInput, setBarcodeInput] = useState('');
  const [targetLineIdx, setTargetLineIdx] = useState<number | null>(null);

  // AI Bill OCR Upload, Smart Product Matching & Future Alias Memory
  const billFileInputRef = useRef<HTMLInputElement | null>(null);
  const [scanningBill, setScanningBill] = useState(false);
  const [billMatchingModalOpen, setBillMatchingModalOpen] = useState(false);
  const [billReviewItems, setBillReviewItems] = useState<Array<{
    index: number;
    billName: string;
    qty: number;
    rate: number;
    mrp: number;
    gst: number;
    total: number;
    // Match details
    matchedInventoryId: string | null;
    matchedInventoryName: string | null;
    matchScore: number;
    matchMethod: 'exact' | 'alias' | 'fuzzy' | 'none';
    // User choices
    action: 'match_existing' | 'create_new';
    selectedInventoryId: string;
    rememberAlias: boolean;
    // New product overrides
    newName: string;
    newCategory: string;
  }>>([]);
  const [pendingBillData, setPendingBillData] = useState<any | null>(null);

  const handleBillFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setScanningBill(true);
    try {
      const base64 = await compressImage(file);
      const res = await fetch('/api/purchases/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const result = await res.json();
      if (!result.success || !result.data) {
        toast(result.error || 'Failed to scan bill. Please try again.', 'error');
        setScanningBill(false);
        return;
      }

      const bill = result.data;
      setPendingBillData(bill);

      const existingInv = data?.inventory || [];
      const reviewList: typeof billReviewItems = [];
      let needsReview = false;

      (bill.lines || []).forEach((line: any, idx: number) => {
        const match = matchBillItemToInventory(
          {
            name: line.name || '',
            mrp: Number(line.mrp) || Number(line.rate) || 0,
            rate: Number(line.rate) || 0,
          },
          existingInv
        );

        const isExactOrAlias = match && (match.method === 'exact' || match.method === 'alias');
        if (!isExactOrAlias) {
          needsReview = true;
        }

        const defaultAction: 'match_existing' | 'create_new' = match ? 'match_existing' : 'create_new';
        const bestMatchedId = match?.item.id || (existingInv[0]?.id || '');

        reviewList.push({
          index: idx,
          billName: line.name || 'Product',
          qty: Number(line.qty) || 1,
          rate: Number(line.rate) || 0,
          mrp: Number(line.mrp) || Number(line.rate) || 0,
          gst: line.gst !== undefined ? Number(line.gst) : defaultGst,
          total: Number(line.total) || (Number(line.qty) || 1) * (Number(line.rate) || 0),
          matchedInventoryId: match?.item.id || null,
          matchedInventoryName: match?.item.name || null,
          matchScore: match?.score || 0,
          matchMethod: match?.method || 'none',
          action: defaultAction,
          selectedInventoryId: bestMatchedId,
          rememberAlias: true,
          newName: line.name || 'Product',
          newCategory: match?.item.category || 'Skin Care & Facials',
        });
      });

      setBillReviewItems(reviewList);

      if (needsReview && reviewList.length > 0) {
        setBillMatchingModalOpen(true);
      } else {
        // All items matched exactly or via remembered aliases!
        applyMappedBillToOrder(bill, reviewList, existingInv);
        toast(`✓ Bill scanned! All ${bill.lines?.length || 0} products matched instantly from aliases/inventory.`, 'success');
      }
    } catch (err: any) {
      toast('Error processing bill: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setScanningBill(false);
    }
  };

  const updateReviewItem = (idx: number, patch: Partial<(typeof billReviewItems)[0]>) => {
    setBillReviewItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const handleConfirmBillMappings = () => {
    let currentInv = [...(data?.inventory || [])];

    // Process aliases and newly created products
    billReviewItems.forEach((item) => {
      if (item.action === 'match_existing' && item.selectedInventoryId) {
        if (item.rememberAlias && item.billName) {
          // Permanently record alias so future bills match 100% automatically!
          currentInv = addAliasToInventoryItem(currentInv, item.selectedInventoryId, item.billName);
        }
      } else if (item.action === 'create_new') {
        const alreadyHas = currentInv.some(
          (x) => x.name.trim().toLowerCase() === item.newName.trim().toLowerCase()
        );
        if (!alreadyHas) {
          const newProduct: InventoryItem = {
            id: uid(),
            name: item.newName.trim(),
            category: item.newCategory || 'Skin Care & Facials',
            brand: pendingBillData?.supplier || 'Salon Brand',
            stock: 0,
            buy: item.rate,
            sell: item.mrp || item.rate,
            mrp: item.mrp || item.rate,
            low: 2,
            expiry: '',
            batches: [],
            aliases: [item.billName.trim()],
          };
          currentInv.push(newProduct);
        }
      }
    });

    updateData((prev) => ({
      ...prev,
      inventory: currentInv,
    }));

    toast('✓ Product mappings & aliases saved! Future bills will auto-match.', 'success');
    setBillMatchingModalOpen(false);
    applyMappedBillToOrder(pendingBillData, billReviewItems, currentInv);
  };

  const applyMappedBillToOrder = (
    bill: any,
    mappings: typeof billReviewItems,
    latestInventory: InventoryItem[]
  ) => {
    if (!bill) return;

    // 1. Match or create Supplier
    const existingSuppliers = data?.suppliers || [];
    let sId = '';
    if (bill.supplier) {
      const cleanSupp = bill.supplier.trim().toLowerCase();
      const matched = existingSuppliers.find(
        (s) => s.name.toLowerCase().includes(cleanSupp) || cleanSupp.includes(s.name.toLowerCase())
      );
      if (matched) {
        sId = matched.id;
      } else {
        const newS: Supplier = {
          id: uid(),
          name: bill.supplier.trim(),
          gstin: bill.supplierGstin || '',
          city: bill.supplierCity || 'Surat',
          mobile: bill.supplierPhone || '',
          contact: '',
          opening: 0,
        };
        updateData((prev) => ({
          ...prev,
          suppliers: [...(prev.suppliers || []), newS],
        }));
        sId = newS.id;
      }
    }

    setSupplierId(sId);
    setSupplierInvoice(bill.supplierInvoice || '');

    if (bill.date) {
      if (bill.date.includes('/')) {
        const parts = bill.date.split('/');
        if (parts.length === 3) {
          setDate(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        } else {
          setDate(todayISO());
        }
      } else {
        setDate(bill.date);
      }
    }

    // 2. Map line items using resolved official inventory names & barcodes
    const newLines: PurchaseLine[] = mappings.map((m) => {
      let resolvedName = m.billName;
      let resolvedBarcode = '';

      if (m.action === 'match_existing' && m.selectedInventoryId) {
        const found = latestInventory.find((inv) => inv.id === m.selectedInventoryId);
        if (found) {
          resolvedName = found.name;
          resolvedBarcode = found.barcode || '';
        }
      } else if (m.action === 'create_new') {
        resolvedName = m.newName;
      }

      return {
        barcode: resolvedBarcode,
        name: resolvedName,
        expiry: '',
        qty: Number(m.qty) || 1,
        rate: Number(m.rate) || 0,
        mrp: Number(m.mrp) || Number(m.rate) || 0,
        gst: m.gst !== undefined ? Number(m.gst) : defaultGst,
      };
    });

    setLines(newLines.length > 0 ? newLines : [EMPTY_LINE(defaultGst)]);
    setEditPurchaseId(null);
    setModalOpen(true);
  };

    const [scanMode, setScanMode] = useState<'qty' | 'new_batch'>('qty');

  // Quick Supplier Form State
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierContact, setQuickSupplierContact] = useState('');
  const [quickSupplierMobile, setQuickSupplierMobile] = useState('');
  const [quickSupplierGstin, setQuickSupplierGstin] = useState('');
  const [quickSupplierCity, setQuickSupplierCity] = useState('');

  const suppliers = data?.suppliers || [];
  const purchases = data?.purchases || [];
  const inventory = data?.inventory || [];

  // KPIs & Counts
  const kpis = useMemo(() => {
    const total = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const paid = purchases.reduce((acc, p) => acc + Number(p.paid || 0), 0);
    const due = purchases.reduce((acc, p) => acc + Number(p.balance || 0), 0);
    const duesCount = purchases.filter((p) => Number(p.balance || 0) > 0).length;
    const settledCount = purchases.filter((p) => Number(p.balance || 0) <= 0).length;
    return { total, paid, due, count: purchases.length, duesCount, settledCount };
  }, [purchases]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return purchases.filter((p) => {
      const matchesSearch =
        !q ||
        p.no.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        (p.supplierInvoice && p.supplierInvoice.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeTab === 'dues') return Number(p.balance || 0) > 0;
      if (activeTab === 'settled') return Number(p.balance || 0) <= 0;
      return true;
    });
  }, [purchases, search, activeTab]);

  // Totals calculations
  const calc = useMemo(() => {
    let sub = 0;
    let gst = 0;
    lines.forEach((l) => {
      const lineSub = Number(l.qty || 0) * Number(l.rate || 0);
      const lineGst = (lineSub * Number(l.gst || 0)) / 100;
      sub += lineSub;
      gst += lineGst;
    });
    const total = Math.max(0, sub + gst - Number(discount || 0));
    const balance = Math.max(0, total - Number(paid || 0));
    return { sub, gst, total, balance };
  }, [lines, discount, paid]);

  const setLine = (idx: number, updates: Partial<PurchaseLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...updates } : l)));
  };

  const addBatchForLine = (idx: number) => {
    const source = lines[idx];
    if (!source || !source.name.trim()) {
      toast('Please enter or select a product name first before adding a batch.', 'error');
      return;
    }
    const newBatchLine: PurchaseLine = {
      barcode: source.barcode || '',
      name: source.name,
      batch: '',
      expiry: '',
      qty: 1,
      rate: source.rate || 0,
      mrp: source.mrp || 0,
      gst: source.gst !== undefined ? source.gst : defaultGst,
      buyDate: source.buyDate || todayISO(),
    };
    const nextLines = [...lines];
    nextLines.splice(idx + 1, 0, newBatchLine);
    setLines(nextLines);
    toast(`Added new batch line for "${source.name}". Enter its different Expiry Date & Qty!`);
  };

  const handleBarcodeFastLookup = (passedCode?: string, targetLine?: number) => {
    const code = (passedCode || barcodeInput).trim();
    if (!code) return;
    setBarcodeInput('');

    // If scanning directly into a specific row via row camera icon
    if (targetLine !== undefined && targetLine >= 0 && targetLine < lines.length) {
      const existingProduct = inventory.find((p) => String(p.barcode || '').trim() === code);
      if (existingProduct) {
        setLine(targetLine, {
          barcode: code,
          name: existingProduct.name,
          rate: existingProduct.buy || lines[targetLine].rate,
          mrp: existingProduct.mrp || existingProduct.sell || lines[targetLine].mrp,
          gst: existingProduct.taxRate !== undefined ? existingProduct.taxRate : defaultGst,
        });
        toast(`Scanned ${existingProduct.name} into line ${targetLine + 1}`);
      } else {
        setLine(targetLine, { barcode: code });
        toast(`Barcode "${code}" set on line ${targetLine + 1}`);
      }
      return;
    }

    const existingProduct = inventory.find((p) => String(p.barcode || '').trim() === code);

    // If scanMode is 'new_batch', always add as a separate row for this product/barcode
    if (scanMode === 'new_batch') {
      const newLine: PurchaseLine = {
        barcode: existingProduct?.barcode || code,
        name: existingProduct?.name || '',
        qty: 1,
        rate: existingProduct?.buy || 0,
        mrp: existingProduct?.mrp || existingProduct?.sell || 0,
        buyDate: todayISO(),
        batch: '',
        expiry: '',
        gst: existingProduct?.taxRate !== undefined ? existingProduct.taxRate : defaultGst,
      };
      if (lines.length === 1 && !lines[0].name && !lines[0].barcode) {
        setLines([newLine]);
      } else {
        setLines((prev) => [...prev, newLine]);
      }
      toast(existingProduct ? `Added new batch line for ${existingProduct.name}! Enter Expiry date.` : `Barcode "${code}" added as new line.`);
      return;
    }

    if (existingProduct) {
      const existingLineIdx = lines.findIndex(
        (l) => (l.barcode && l.barcode === code) || l.name === existingProduct.name
      );
      if (existingLineIdx >= 0) {
        setLine(existingLineIdx, { qty: Number(lines[existingLineIdx].qty || 0) + 1 });
        toast(`Incremented qty for ${existingProduct.name} (+1). Click "+ Batch" on line for different expiry date.`);
      } else {
        const newLine: PurchaseLine = {
          barcode: existingProduct.barcode || code,
          name: existingProduct.name,
          qty: 1,
          rate: existingProduct.buy || 0,
          mrp: existingProduct.mrp || existingProduct.sell || 0,
          buyDate: existingProduct.buyDate || todayISO(),
          batch: existingProduct.batch || '',
          expiry: existingProduct.expiry || '',
          gst: existingProduct.taxRate !== undefined ? existingProduct.taxRate : defaultGst,
        };
        if (lines.length === 1 && !lines[0].name) {
          setLines([newLine]);
        } else {
          setLines((prev) => [...prev, newLine]);
        }
        toast(`Added ${existingProduct.name} (${money(existingProduct.buy || 0)})`);
      }
    } else {
      if (lines.length === 1 && !lines[0].name) {
        setLines([{ ...EMPTY_LINE(defaultGst), barcode: code }]);
      } else {
        setLines((prev) => [...prev, { ...EMPTY_LINE(defaultGst), barcode: code }]);
      }
      toast(`Barcode "${code}" attached to new line item`);
    }
  };

  const handleProductSelect = (idx: number, name: string) => {
    const p = inventory.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    if (p) {
      setLine(idx, {
        name: p.name,
        barcode: p.barcode || lines[idx].barcode,
        rate: p.buy || lines[idx].rate,
        mrp: p.mrp || p.sell || lines[idx].mrp,
        buyDate: lines[idx].buyDate || todayISO(),
        batch: p.batch || lines[idx].batch,
        expiry: p.expiry || lines[idx].expiry,
        gst: p.taxRate !== undefined ? p.taxRate : (lines[idx].gst !== undefined ? lines[idx].gst : defaultGst),
      });
    } else {
      setLine(idx, { name });
    }
  };

  const openNew = () => {
    if (suppliers.length === 0) {
      setQuickSupplierModal(true);
      return;
    }
    setEditPurchaseId(null);
    setSupplierId(suppliers[0]?.id || '');
    setDate(todayISO());
    setSupplierInvoice('');
    setDueDate('');
    setLines([EMPTY_LINE(defaultGst)]);
    setDiscount(0);
    setPaid(0);
    setMode(data?.settings?.payments?.[0] || 'Cash');
    setNotes('');
    setBillImage('');
    setModalOpen(true);
  };

  const openEditPurchase = (p: Purchase) => {
    setEditPurchaseId(p.id);
    setSupplierId(p.supplierId || suppliers.find((s) => s.name === p.supplier)?.id || suppliers[0]?.id || '');
    setDate(p.date || todayISO());
    setSupplierInvoice(p.supplierInvoice || '');
    setDueDate(p.dueDate || '');
    setLines(p.lines && p.lines.length > 0 ? p.lines : [EMPTY_LINE(defaultGst)]);
    setDiscount(p.discount || 0);
    setPaid(p.paid || 0);
    setMode(p.mode || 'Cash');
    setNotes(p.notes || '');
    setBillImage(p.billImageUrl || '');
    setModalOpen(true);
  };

  const handleDeletePurchase = (id: string) => {
    const pur = (data?.purchases || []).find((p) => p.id === id);
    if (!pur) return;

    updateData((d) => {
      // 1. Deduct inward stock from inventory
      let inventory = [...(d.inventory || [])];
      (pur.lines || []).forEach((l) => {
        inventory = inventory.map((item) =>
          item.name === l.name || (l.barcode && item.barcode === l.barcode)
            ? { ...item, stock: Math.max(0, item.stock - Number(l.qty || 0)) }
            : item
        );
      });

      // 2. Remove purchase
      const purchases = (d.purchases || []).filter((p) => p.id !== id);

      // 3. Remove purchase audit transactions
      const inventoryTx = (d.inventoryTx || []).filter((tx) => tx.purchaseNo !== pur.no);

      // 4. Remove linked payment vouchers
      const vouchers = (d.vouchers || []).filter((v) => v.linkedDocNo !== pur.no);

      return {
        ...d,
        inventory,
        purchases,
        inventoryTx,
        vouchers,
      };
    });

    scheduleSave();
    toast(`Purchase order ${pur.no} deleted and stock updated!`, 'info');
    setDeletePurchaseId(null);
  };

  const handleSaveQuickSupplier = () => {
    if (!quickSupplierName.trim()) {
      toast('Supplier company name is required.', 'error');
      return;
    }

    const newSupplier: Supplier = {
      id: uid(),
      name: quickSupplierName.trim(),
      contact: quickSupplierContact.trim(),
      mobile: quickSupplierMobile.trim(),
      gstin: quickSupplierGstin.trim().toUpperCase(),
      city: quickSupplierCity.trim(),
      opening: 0,
    };

    updateData((d) => ({
      ...d,
      suppliers: [newSupplier, ...(d.suppliers || [])],
    }));
    scheduleSave();

    setSupplierId(newSupplier.id);
    toast(`Supplier "${newSupplier.name}" added and selected!`);
    setQuickSupplierModal(false);
    setQuickSupplierName('');
    setQuickSupplierContact('');
    setQuickSupplierMobile('');
    setQuickSupplierGstin('');
    setQuickSupplierCity('');

    // Open purchase modal directly if not already open
    if (!modalOpen) {
      setModalOpen(true);
    }
  };

  const handleSave = () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      toast('Please add/select a supplier before saving the purchase.', 'error');
      return;
    }
    const validLines = lines.filter((l) => l.name.trim() && Number(l.qty) > 0);
    if (validLines.length === 0) {
      toast('Add at least one product line with quantity.', 'error');
      return;
    }

    if (editPurchaseId) {
      const existingPur = (data?.purchases || []).find((p) => p.id === editPurchaseId);
      if (!existingPur) return;

      const updatedPur: Purchase = {
        ...existingPur,
        date,
        supplierId,
        supplier: supplier.name,
        supplierInvoice,
        dueDate,
        lines: validLines,
        subtotal: calc.sub,
        gst: calc.gst,
        discount: Number(discount || 0),
        total: calc.total,
        paid: Number(paid || 0),
        balance: calc.balance,
        mode,
        notes,
        billImageUrl: billImage || undefined,
      };

      updateData((d) => {
        let updatedInventory = [...(d.inventory || [])];

        // 1. Deduct old inward quantities
        (existingPur.lines || []).forEach((l) => {
          updatedInventory = updatedInventory.map((item) =>
            item.name === l.name || (l.barcode && item.barcode === l.barcode)
              ? { ...item, stock: Math.max(0, item.stock - Number(l.qty || 0)) }
              : item
          );
        });

        // 2. Add new inward quantities & update costs
        validLines.forEach((l) => {
          let p = updatedInventory.find(
            (x) => (l.barcode && x.barcode === l.barcode) || x.name.toLowerCase() === l.name.toLowerCase()
          );
          if (!p) {
            p = {
              id: uid(),
              barcode: l.barcode || '',
              name: l.name,
              supplierId: supplier.id,
              supplierName: supplier.name,
              stock: 0,
              buy: Number(l.rate || 0),
              sell: Number(l.rate || 0) * 1.5,
              mrp: Number(l.mrp || Number(l.rate || 0) * 1.6),
              buyDate: l.buyDate || date,
              unit: 'Pcs',
              low: 2,
              batch: l.batch || '',
              expiry: l.expiry || '',
              taxRate: l.gst !== undefined ? Number(l.gst) : defaultGst,
            };
            updatedInventory.push(p);
          }
          p.stock = Number(p.stock || 0) + Number(l.qty);
          p.buy = Number(l.rate || 0);
          if (l.mrp) p.mrp = Number(l.mrp);
          p.buyDate = l.buyDate || date;
          p.supplierId = supplier.id;
          p.supplierName = supplier.name;
          if (l.barcode) p.barcode = l.barcode;
          if (l.batch) p.batch = l.batch;
          if (l.expiry) p.expiry = l.expiry;
          if (l.gst !== undefined) p.taxRate = Number(l.gst);

          // Multi-batch / multi-expiry support
          if (!p.batches) p.batches = [];
          if (l.expiry || l.batch) {
            const bIdx = p.batches.findIndex(
              (b) => (l.batch && b.batch === l.batch) || (l.expiry && b.expiry === l.expiry)
            );
            if (bIdx >= 0) {
              p.batches[bIdx].stock = Number(p.batches[bIdx].stock || 0) + Number(l.qty);
              if (l.rate) p.batches[bIdx].buyRate = Number(l.rate);
              if (l.mrp) p.batches[bIdx].mrp = Number(l.mrp);
            } else {
              p.batches.push({
                id: uid(),
                batch: l.batch || '',
                expiry: l.expiry || '',
                stock: Number(l.qty),
                buyRate: Number(l.rate || 0),
                mrp: Number(l.mrp || 0),
                buyDate: date,
                purchaseNo: existingPur.no,
              });
            }
          }

          // Maintain primary expiry as earliest active expiry (FEFO)
          if (p.batches && p.batches.length > 0) {
            const activeBatches = p.batches.filter((b) => b.expiry && Number(b.stock) > 0);
            if (activeBatches.length > 0) {
              activeBatches.sort((a, b) => String(a.expiry || '').localeCompare(String(b.expiry || '')));
              p.expiry = activeBatches[0].expiry || p.expiry;
              p.batch = activeBatches[0].batch || p.batch;
            } else if (l.expiry) {
              p.expiry = l.expiry;
              p.batch = l.batch || p.batch;
            }
          } else if (l.expiry) {
            p.expiry = l.expiry;
            p.batch = l.batch || p.batch;
          }
        });

        // 3. Update purchases list
        const purchases = (d.purchases || []).map((p) => (p.id === editPurchaseId ? updatedPur : p));

        // 4. Update audit transactions
        const remainingTx = (d.inventoryTx || []).filter((tx) => tx.purchaseNo !== existingPur.no);
        const newTxs: any[] = validLines.map((l) => ({
          id: uid(),
          date,
          product: l.name,
          barcode: l.barcode || '',
          type: 'Buy',
          qty: Number(l.qty),
          rate: Number(l.rate),
          mrp: l.mrp,
          buyDate: l.buyDate || date,
          party: supplier.name,
          purchaseNo: existingPur.no,
          batch: l.batch || '',
          expiry: l.expiry || '',
          gst: Number(l.gst || 0),
        }));

        return {
          ...d,
          inventory: updatedInventory,
          purchases,
          inventoryTx: [...remainingTx, ...newTxs],
        };
      });

      scheduleSave();
      cloudSave().catch(() => {});
      toast(`Purchase order ${existingPur.no} updated successfully!`);
      setEditPurchaseId(null);
      setModalOpen(false);
      return;
    }

    const purNo = `PUR-${data?.purchaseSeq || 1001}`;
    const newPurchase: Purchase = {
      id: uid(),
      no: purNo,
      date,
      supplierId,
      supplier: supplier.name,
      supplierInvoice,
      dueDate,
      lines: validLines,
      subtotal: calc.sub,
      gst: calc.gst,
      discount: Number(discount || 0),
      total: calc.total,
      paid: Number(paid || 0),
      balance: calc.balance,
      mode,
      notes,
      billImageUrl: billImage || undefined,
    };

    updateData((d) => {
      let updatedInventory = [...(d.inventory || [])];
      let newTxs = [...(d.inventoryTx || [])];

      validLines.forEach((l) => {
        let p = updatedInventory.find(
          (x) => (l.barcode && x.barcode === l.barcode) || x.name.toLowerCase() === l.name.toLowerCase()
        );
        if (!p) {
          p = {
            id: uid(),
            barcode: l.barcode || '',
            name: l.name,
            supplierId: supplier.id,
            supplierName: supplier.name,
            stock: 0,
            buy: Number(l.rate || 0),
            sell: Number(l.rate || 0) * 1.5,
            mrp: Number(l.mrp || Number(l.rate || 0) * 1.6),
            buyDate: l.buyDate || date,
            unit: 'Pcs',
            low: 2,
            batch: l.batch || '',
            expiry: l.expiry || '',
            taxRate: l.gst !== undefined ? Number(l.gst) : defaultGst,
          };
          updatedInventory.push(p);
        }
        p.stock = Number(p.stock || 0) + Number(l.qty);
        p.buy = Number(l.rate || 0);
        if (l.mrp) p.mrp = Number(l.mrp);
        p.buyDate = l.buyDate || date;
        p.supplierId = supplier.id;
        p.supplierName = supplier.name;
        if (l.barcode) p.barcode = l.barcode;
        if (l.batch) p.batch = l.batch;
        if (l.expiry) p.expiry = l.expiry;
        if (l.gst !== undefined) p.taxRate = Number(l.gst);

        // Multi-batch / multi-expiry support
        if (!p.batches) p.batches = [];
        if (l.expiry || l.batch) {
          const bIdx = p.batches.findIndex(
            (b) => (l.batch && b.batch === l.batch) || (l.expiry && b.expiry === l.expiry)
          );
          if (bIdx >= 0) {
            p.batches[bIdx].stock = Number(p.batches[bIdx].stock || 0) + Number(l.qty);
            if (l.rate) p.batches[bIdx].buyRate = Number(l.rate);
            if (l.mrp) p.batches[bIdx].mrp = Number(l.mrp);
          } else {
            p.batches.push({
              id: uid(),
              batch: l.batch || '',
              expiry: l.expiry || '',
              stock: Number(l.qty),
              buyRate: Number(l.rate || 0),
              mrp: Number(l.mrp || 0),
              buyDate: date,
              purchaseNo: purNo,
            });
          }
        }

        // Maintain primary expiry as earliest active expiry (FEFO)
        if (p.batches && p.batches.length > 0) {
          const activeBatches = p.batches.filter((b) => b.expiry && Number(b.stock) > 0);
          if (activeBatches.length > 0) {
            activeBatches.sort((a, b) => String(a.expiry || '').localeCompare(String(b.expiry || '')));
            p.expiry = activeBatches[0].expiry || p.expiry;
            p.batch = activeBatches[0].batch || p.batch;
          } else if (l.expiry) {
            p.expiry = l.expiry;
            p.batch = l.batch || p.batch;
          }
        } else if (l.expiry) {
          p.expiry = l.expiry;
          p.batch = l.batch || p.batch;
        }

        newTxs.push({
          id: uid(),
          date,
          product: p.name,
          barcode: p.barcode || '',
          type: 'Buy',
          qty: Number(l.qty),
          rate: Number(l.rate),
          mrp: l.mrp || p.mrp,
          buyDate: l.buyDate || date,
          party: supplier.name,
          purchaseNo: purNo,
          batch: l.batch || '',
          expiry: l.expiry || '',
          gst: Number(l.gst || 0),
        });
      });

      return {
        ...d,
        inventory: updatedInventory,
        inventoryTx: newTxs,
        purchases: [newPurchase, ...(d.purchases || [])],
        purchaseSeq: (d.purchaseSeq || 1001) + 1,
      };
    });

    scheduleSave();
    toast(`Purchase ${purNo} saved successfully!`);
    setModalOpen(false);
  };

  return (
    <div>
      {/* Top KPIs */}
      <motion.div className="stats-grid" variants={staggerContainer} initial="hidden" animate="visible">
        <StatCard label="Total Purchases" value={money(kpis.total)} icon={<ShoppingBag size={18} />} />
        <StatCard label="Paid Amount" value={money(kpis.paid)} icon={<CheckCircle size={18} />} iconBg="#e6f7ef" iconColor="#19734b" />
        <StatCard label="Supplier Due" value={money(kpis.due)} icon={<FileText size={18} />} alert={kpis.due > 0} />
        <StatCard label="Purchase Invoices" value={kpis.count} icon={<Calendar size={18} />} />
      </motion.div>

      {/* Supplier Notice Alert if no suppliers */}
      {suppliers.length === 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 10, padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="#b45309" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#92400e' }}>
                Please add a Supplier first before creating a purchase.
              </div>
              <div style={{ fontSize: 12, color: '#b45309' }}>
                Register your distributors and cosmetic stockists to track vendor purchase orders and dues.
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setQuickSupplierModal(true)}
            style={{ background: '#b45309', borderColor: '#b45309' }}
          >
            <UserPlus size={14} /> Add Supplier Now
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <div className="search-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={15} className="search-icon" />
          <input
            type="search"
            className="input"
            placeholder="Search purchase no, supplier, ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            ref={billFileInputRef}
            accept="image/*,application/pdf"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleBillFileSelect}
          />
          <motion.button
            className="btn btn-secondary"
            onClick={() => billFileInputRef.current?.click()}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f0fdf4',
              borderColor: '#86efac',
              color: '#15803d',
              fontWeight: 700,
            }}
            title="Upload vendor bill image / PDF to auto-create purchase order"
          >
            <Upload size={14} /> 🧾 Upload / Scan Bill (AI Auto-Fill)
          </motion.button>
          <Link href="/admin/suppliers" className="btn btn-ghost">
            <Building2 size={14} /> Suppliers Directory ({suppliers.length})
          </Link>
          <motion.button className="btn btn-primary" onClick={openNew} whileTap={{ scale: 0.97 }}>
            <Plus size={15} /> New Purchase Order
          </motion.button>
        </div>
      </div>

      {/* Sub Tabs & Item Order Breakdown Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div className="tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All Purchases</span>
            <span className="tab-badge">{kpis.count}</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'dues' ? 'active' : ''}`}
            onClick={() => setActiveTab('dues')}
          >
            <span>⚠️ Pending Supplier Dues</span>
            <span className="tab-badge danger">{kpis.duesCount}</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'settled' ? 'active' : ''}`}
            onClick={() => setActiveTab('settled')}
          >
            <span>✓ Fully Paid / Settled</span>
            <span className="tab-badge">{kpis.settledCount}</span>
          </button>
        </div>

        {filtered.length > 0 && (
          <button
            type="button"
            className={`btn btn-sm ${showAllItemRows ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowAllItemRows((prev) => !prev)}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            title="Expand and view all individual item order totals in table rows"
          >
            <Layers size={13} />
            {showAllItemRows ? '▲ Hide Item Order Details' : '▼ Show All Item Order Totals in Rows'}
          </button>
        )}
      </div>

      {/* Purchases Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={44} />
            <h3>{search ? 'No matching purchases' : 'No product purchases recorded'}</h3>
            <p>Record stock purchases from your suppliers with GST breakdown and batch details.</p>
            {!search && (
              <motion.button className="btn btn-primary btn-sm" onClick={openNew} whileTap={{ scale: 0.97 }} style={{ marginTop: 8 }}>
                <Plus size={14} /> Record First Purchase
              </motion.button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Purchase Bill</th>
                  <th>Supplier & Invoice Ref</th>
                  <th>Items & Tax</th>
                  <th>Bill Total</th>
                  <th>Payment Status</th>
                  <th>Account & Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                {filtered.map((p) => {
                  const isExpanded = showAllItemRows || !!expandedPurchaseIds[p.id];
                  return (
                    <Fragment key={p.id}>
                      <motion.tr variants={fadeSlideUp}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{p.no}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{fmtDate(p.date)}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.supplier}</div>
                          {p.supplierInvoice && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
                              Ref: {p.supplierInvoice}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700 }}>{(p.lines || []).length} items</span>
                            <button
                              type="button"
                              className="badge"
                              style={{
                                cursor: 'pointer',
                                fontSize: 10.5,
                                padding: '2px 7px',
                                borderRadius: 5,
                                border: '1px solid var(--border)',
                                background: isExpanded ? '#05424A' : '#f8fafc',
                                color: isExpanded ? '#ffffff' : '#334155',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              onClick={() => toggleRowExpand(p.id)}
                              title="Toggle item order-wise totals in row"
                            >
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              {isExpanded ? 'Hide' : 'Item Totals'}
                            </button>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            Sub: {money(p.subtotal)} {p.gst > 0 ? `· GST: ${money(p.gst)}` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                            {money(p.total)}
                          </div>
                          {p.discount > 0 && (
                            <div style={{ fontSize: 10.5, color: 'var(--green)' }}>
                              Disc: −{money(p.discount)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 12 }}>
                              Paid: {money(p.paid)}
                            </span>
                          </div>
                          {p.balance > 0 ? (
                            <div style={{ color: 'var(--red)', fontWeight: 800, fontSize: 12 }}>
                              Due: {money(p.balance)}
                            </div>
                          ) : (
                            <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 6px' }}>
                              Fully Settled
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 45 }}>
                              {p.mode}
                            </span>
                            {p.billImageUrl && (
                              <button
                                className="btn-icon"
                                onClick={() => setPreviewImageModal(p.billImageUrl!)}
                                title="View Original Bill Photo"
                                style={{ color: '#15803d', background: '#f0fdf4', borderColor: '#86efac' }}
                              >
                                <FileText size={13} />
                              </button>
                            )}
                            <button className="btn-icon" onClick={() => setViewPurchase(p)} title="View Purchase Bill">
                              <Eye size={13} />
                            </button>
                            <button className="btn-icon edit" onClick={() => openEditPurchase(p)} title="Edit Purchase Bill">
                              <Pencil size={13} />
                            </button>
                            <button className="btn-icon danger" onClick={() => setDeletePurchaseId(p.id)} title="Delete Purchase Bill">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Expandable Item Order-wise Total in Row */}
                      {isExpanded && (
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan={6} style={{ padding: '6px 12px 14px 12px', borderTop: 'none' }}>
                            <div style={{
                              background: '#ffffff',
                              borderRadius: 8,
                              border: '1.5px solid #cbd5e1',
                              overflow: 'hidden',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                            }}>
                              <div style={{
                                padding: '8px 12px',
                                background: '#f1f5f9',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 8,
                              }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>
                                  📦 Order Items Breakdown — {p.lines?.length || 0} Products
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>
                                  Order Total: {money(p.total)}
                                </span>
                              </div>
                              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ background: '#f8fafc', color: '#475569', fontSize: 11, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', width: 32 }}>#</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Item / Product Name</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', width: 130 }}>Barcode</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', width: 130 }}>Expiry Date</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center', width: 60 }}>Qty</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', width: 95 }}>Buy Rate</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', width: 95 }}>MRP</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center', width: 90 }}>Margin %</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center', width: 60 }}>GST</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', width: 125, fontWeight: 800, color: '#0f172a' }}>
                                      Item Total in Row
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(p.lines || []).map((line, lIdx) => {
                                    const lineSub = Number(line.qty || 0) * Number(line.rate || 0);
                                    const lineGst = (lineSub * Number(line.gst || 0)) / 100;
                                    const lineTotal = lineSub + lineGst;
                                    return (
                                      <tr key={lIdx} style={{ borderBottom: lIdx === (p.lines?.length || 0) - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{lIdx + 1}</td>
                                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>
                                          {line.name}
                                        </td>
                                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                                          {line.barcode || '—'}
                                        </td>
                                        <td style={{ padding: '6px 10px', fontSize: 11, color: '#64748b' }}>
                                          {line.expiry ? fmtExpiry(line.expiry) : '—'}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                                          {line.qty}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                                          {money(line.rate)}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b' }}>
                                          {line.mrp ? money(line.mrp) : '—'}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                          {Number(line.mrp) > 0 && Number(line.rate) > 0 ? (
                                            (() => {
                                              const margin = ((Number(line.mrp) - Number(line.rate)) / Number(line.mrp)) * 100;
                                              const isHigh = margin >= 40;
                                              const isMed = margin >= 20;
                                              const isLow = margin > 0;
                                               const marginText = (Number.isInteger(margin) ? margin.toFixed(0) : margin.toFixed(1)) + "%";
                                              return (
                                                <span
                                                  style={{
                                                    fontSize: 11.5,
                                                    fontWeight: 800,
                                                    padding: '2px 7px',
                                                    borderRadius: 4,
                                                    background: isHigh ? '#dcfce7' : isMed ? '#e0f2fe' : isLow ? '#fef3c7' : '#fee2e2',
                                                    color: isHigh ? '#15803d' : isMed ? '#0369a1' : isLow ? '#b45309' : '#b91c1c',
                                                  }}
                                                   title={"Margin: " + margin.toFixed(1) + "% | Profit: ₹" + (Number(line.mrp) - Number(line.rate)).toFixed(2) + " / unit"}
                                                >
                                                  {marginText}
                                                </span>
                                              );
                                            })()
                                          ) : (
                                            <span style={{ color: '#94a3b8' }}>—</span>
                                          )}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                          {line.gst ? `${line.gst}%` : '0%'}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--teal)', fontSize: 12.5 }}>
                                          {money(lineTotal)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {/* Datalist for autocomplete */}
      <datalist id="purchaseProductList">
        {inventory.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      {/* Quick Add Supplier Modal */}
      <Modal
        isOpen={quickSupplierModal}
        onClose={() => setQuickSupplierModal(false)}
        title="🏢 Add Supplier First"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setQuickSupplierModal(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleSaveQuickSupplier} whileTap={{ scale: 0.97 }}>
              Save & Select Supplier
            </motion.button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Please add your product distributor or vendor so this purchase order can be properly linked and tracked in your supplier ledger.
        </p>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Supplier Company / Store Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. L'Oreal India Distributor / Beauty Mart"
              value={quickSupplierName}
              onChange={(e) => setQuickSupplierName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="label">Contact Person</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Rajesh Shah"
              value={quickSupplierContact}
              onChange={(e) => setQuickSupplierContact(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Mobile Number</label>
            <input
              type="tel"
              className="input"
              placeholder="10-digit mobile"
              value={quickSupplierMobile}
              onChange={(e) => setQuickSupplierMobile(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">GSTIN (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="24AAAAA0000A1Z5"
              value={quickSupplierGstin}
              onChange={(e) => setQuickSupplierGstin(e.target.value.toUpperCase())}
            />
          </div>
          <div className="form-group">
            <label className="label">City</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Surat"
              value={quickSupplierCity}
              onChange={(e) => setQuickSupplierCity(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* New / Edit Purchase Order Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditPurchaseId(null);
        }}
        title={
          editPurchaseId
            ? `✎ Edit Purchase Order — ${data?.purchases?.find((p) => p.id === editPurchaseId)?.no || ''}`
            : '🛒 New Product Purchase Order'
        }
        wide
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setModalOpen(false);
                setEditPurchaseId(null);
              }}
            >
              Cancel
            </button>
            <motion.button className="btn btn-primary" onClick={handleSave} whileTap={{ scale: 0.97 }}>
              {editPurchaseId ? 'Update Purchase Bill' : 'Save Purchase & Update Stock'}
            </motion.button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="label" style={{ margin: 0 }}>Supplier *</label>
              <button
                type="button"
                onClick={() => setQuickSupplierModal(true)}
                style={{ fontSize: 11.5, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
              >
                + Add New Supplier
              </button>
            </div>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.city ? `(${s.city})` : ''} {s.gstin ? `[${s.gstin}]` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Purchase Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Supplier Invoice Reference No.</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. BILL-9821"
              value={supplierInvoice}
              onChange={(e) => setSupplierInvoice(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Payment Due Date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Fast Barcode Scanner Input Bar with Mode Switch */}
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: '#f0fdfa',
          border: '1px solid #ccfbf1',
          padding: '8px 12px',
          borderRadius: 10,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 260 }}>
            <Barcode size={20} color="var(--teal)" />
            <input
              type="text"
              className="input"
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}
              placeholder="Scan with USB laser scanner or enter barcode & press Enter…"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeFastLookup(); } }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => handleBarcodeFastLookup()}>
              Scan & Add
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => billFileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#15803d',
                borderColor: '#86efac',
                background: '#f0fdf4',
                fontWeight: 700,
              }}
              title="Upload vendor bill image / PDF to auto-fill items and rates"
            >
              <Upload size={13} /> 🧾 Scan / Upload Bill Image
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                setTargetLineIdx(null);
                setCameraModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--primary)', fontWeight: 700 }}
            >
              <Camera size={14} /> 📱 Phone / Camera Scan
            </button>
          </div>

          {/* Scanner Mode Toggle (Same Batch vs New Expiry Batch) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            padding: '3px 8px',
            borderRadius: 8,
            border: '1px solid #99f6e4',
            fontSize: 11.5,
          }}>
            <span style={{ color: '#0f766e', fontWeight: 700 }}>Scan Mode:</span>
            <button
              type="button"
              className={`btn btn-xs ${scanMode === 'qty' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '2px 8px', fontSize: 11, height: 24 }}
              onClick={() => setScanMode('qty')}
              title="When scanning the same barcode, automatically increment quantity (+1)"
            >
              📦 +1 Qty (Same Batch)
            </button>
            <button
              type="button"
              className={`btn btn-xs ${scanMode === 'new_batch' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '2px 8px', fontSize: 11, height: 24 }}
              onClick={() => setScanMode('new_batch')}
              title="When scanning the same barcode, add a new row for different Expiry Date"
            >
              📅 + New Expiry Batch
            </button>
          </div>
        </div>

        {/* Purchase Line Items */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label className="label" style={{ margin: 0, fontWeight: 800 }}>Purchase Line Items</label>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={resetColWidths}
                title="Reset column widths to default"
                style={{ fontSize: 10.5, color: '#64748b', padding: '2px 6px', height: 22 }}
              >
                ↺ Reset Widths
              </button>
            </div>
            <motion.button
              className="btn btn-ghost btn-sm"
              onClick={() => setLines((prev) => [...prev, EMPTY_LINE(defaultGst)])}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={13} /> Add Line Item
            </motion.button>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
            <div style={{ minWidth: totalLineWidth }}>
              {/* Column Header Titles with Interactive Vertical Resizer Lines */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: lineGridTemplate,
                  gap: 6,
                  padding: '7px 8px',
                  background: '#e2e8f0',
                  borderRadius: '6px 6px 0 0',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  position: 'relative',
                  userSelect: resizingColIdx !== null ? 'none' : 'auto',
                }}
              >
                {PURCHASE_LINE_HEADERS.map((h, i) => (
                  <div
                    key={h.id}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: h.align === 'center' ? 'center' : h.align === 'right' ? 'flex-end' : 'flex-start',
                      paddingRight: i < PURCHASE_LINE_HEADERS.length - 1 ? 8 : 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.label}</span>
                    {i < PURCHASE_LINE_HEADERS.length - 1 && (
                      <div
                        onMouseDown={(e) => startColResize(i, e)}
                        onTouchStart={(e) => startColResize(i, e)}
                        title="↔ Drag or swipe vertical line to resize column"
                        style={{
                          position: 'absolute',
                          top: -7,
                          right: -3,
                          bottom: -7,
                          width: 14,
                          cursor: 'col-resize',
                          zIndex: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          touchAction: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: resizingColIdx === i ? 2.5 : 2,
                            height: resizingColIdx === i ? '100%' : '65%',
                            background: resizingColIdx === i ? 'var(--teal)' : '#94a3b8',
                            borderRadius: 1,
                            boxShadow: resizingColIdx === i ? '0 0 6px rgba(13,148,136,0.7)' : 'none',
                            transition: 'background 0.15s, height 0.15s',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {lines.map((l, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: lineGridTemplate,
                  gap: 6,
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Barcode…"
                    value={l.barcode || ''}
                    onChange={(e) => setLine(idx, { barcode: e.target.value })}
                    style={{ padding: '6px 26px 6px 8px', fontSize: 12, width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTargetLineIdx(idx);
                      setCameraModalOpen(true);
                    }}
                    title="Scan barcode with phone camera into this row"
                    style={{
                      position: 'absolute',
                      right: 4,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--primary)',
                      padding: 2,
                    }}
                  >
                    <Camera size={13} />
                  </button>
                </div>
                <input
                  type="text"
                  className="input"
                  list="purchaseProductList"
                  placeholder="Product Name *"
                  value={l.name}
                  onChange={(e) => handleProductSelect(idx, e.target.value)}
                  style={{ padding: '6px 8px', fontSize: 12.5 }}
                />
                <input
                  type="month"
                  className="input"
                  title="Expiry Date (Month & Year)"
                  value={toMonthInput(l.expiry)}
                  onChange={(e) => setLine(idx, { expiry: e.target.value })}
                  style={{ padding: '6px 4px', fontSize: 11.5 }}
                />
                <input
                  type="number"
                  min="1"
                  className="input"
                  title="Quantity"
                  placeholder="Qty: 1"
                  value={l.qty}
                  onChange={(e) => setLine(idx, { qty: Math.max(1, Number(e.target.value)) })}
                  style={{ padding: '6px 4px', textAlign: 'center', fontSize: 12 }}
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input"
                  title="Buy Rate (₹)"
                  placeholder="₹ Rate"
                  value={l.rate}
                  onChange={(e) => setLine(idx, { rate: Number(e.target.value) })}
                  style={{ padding: '6px 6px', textAlign: 'right', fontSize: 12 }}
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input"
                  title="MRP (₹)"
                  placeholder="MRP ₹"
                  value={l.mrp || ''}
                  onChange={(e) => setLine(idx, { mrp: Number(e.target.value) })}
                  style={{ padding: '6px 6px', textAlign: 'right', fontSize: 12 }}
                />
                {/* Buy / MRP % Column */}
                {/* Margin % Column */}
                <div style={{ textAlign: 'center' }}>
                  {Number(l.mrp) > 0 && Number(l.rate) > 0 ? (
                    (() => {
                      const margin = ((Number(l.mrp) - Number(l.rate)) / Number(l.mrp)) * 100;
                      const isHigh = margin >= 40;
                      const isMed = margin >= 20;
                      const isLow = margin > 0;
                                               const marginText = (Number.isInteger(margin) ? margin.toFixed(0) : margin.toFixed(1)) + "%";
                      return (
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            padding: '3px 7px',
                            borderRadius: 5,
                            background: isHigh ? '#dcfce7' : isMed ? '#e0f2fe' : isLow ? '#fef3c7' : '#fee2e2',
                            border: `1px solid ${isHigh ? '#bbf7d0' : isMed ? '#bae6fd' : isLow ? '#fde68a' : '#fecaca'}`,
                            color: isHigh ? '#15803d' : isMed ? '#0369a1' : isLow ? '#b45309' : '#b91c1c',
                            display: 'inline-block',
                          }}
                          title={"Margin: " + margin.toFixed(1) + "% | Profit: ₹" + (Number(l.mrp) - Number(l.rate)).toFixed(2) + " per unit"}
                        >
                          {marginText}
                        </span>
                      );
                    })()
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                  )}
                </div>
                <select
                  className="input"
                  title="GST Rate %"
                  value={l.gst !== undefined ? l.gst : defaultGst}
                  onChange={(e) => setLine(idx, { gst: Number(e.target.value) })}
                  style={{ padding: '6px 4px', fontSize: 11 }}
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                  {defaultGst > 0 && ![0, 5, 12, 18, 28].includes(defaultGst) && (
                    <option value={defaultGst}>{defaultGst}% (Default)</option>
                  )}
                  {l.gst !== undefined && ![0, 5, 12, 18, 28, defaultGst].includes(l.gst) && (
                    <option value={l.gst}>{l.gst}%</option>
                  )}
                </select>
                <div style={{ textAlign: 'right', paddingRight: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal)', whiteSpace: 'nowrap' }}>
                    {money(Number(l.qty || 0) * Number(l.rate || 0) + (Number(l.qty || 0) * Number(l.rate || 0) * Number(l.gst || 0)) / 100)}
                  </div>
                  {Number(l.gst || 0) > 0 && (
                    <div style={{ fontSize: 9.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      Incl. {l.gst}%
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ color: 'var(--teal)', padding: 4 }}
                    title="Add another batch/expiry date for this product"
                    onClick={() => addBatchForLine(idx)}
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    className="btn-icon danger"
                    type="button"
                    style={{ padding: 4 }}
                    title="Remove line"
                    onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
            </div>
          </div>

          {/* Subtle small 1-line guidance tip */}
          <div style={{
            fontSize: 11,
            color: '#64748b',
            marginTop: 6,
            padding: '5px 10px',
            borderRadius: 6,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <span>💡 <strong>Tip:</strong> એક જ બારકોડમાં અલગ Expiry Date માટે રો પર <strong>[+]</strong> દબાવો અથવા ઉપર <strong>&quot;📅 + New Expiry Batch&quot;</strong> મોડ વાપરો.</span>
            <span style={{ fontSize: 10.5, color: '#0f766e', fontWeight: 600 }}>↔ હેડર વર્ટિકલ લાઈન ડ્રેગ/સ્વાઈપ કરીને કોલમ નાની-મોટી (Resize) કરી શકો છો</span>
          </div>
        </div>

        {/* Totals Calculation Card */}
        <div className="billing-totals" style={{ marginTop: 14 }}>
          <div className="total-row">
            <span>Product Subtotal</span>
            <span style={{ fontWeight: 600 }}>{money(calc.sub)}</span>
          </div>
          <div className="total-row">
            <span>GST Amount</span>
            <span style={{ fontWeight: 600 }}>{money(calc.gst)}</span>
          </div>
          <div className="total-row" style={{ alignItems: 'center' }}>
            <span>Discount (₹)</span>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="0"
              value={discount || ''}
              onChange={(e) => setDiscount(Number(e.target.value))}
              style={{ width: 110, textAlign: 'right', padding: '4px 8px', fontSize: 13 }}
            />
          </div>
          <div className="total-row grand">
            <span>Net Purchase Total</span>
            <span style={{ color: 'var(--teal)' }}>{money(calc.total)}</span>
          </div>
          <div className="total-row" style={{ alignItems: 'center' }}>
            <span>Paid Out (₹)</span>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="0"
              value={paid || ''}
              onChange={(e) => setPaid(Number(e.target.value))}
              style={{ width: 110, textAlign: 'right', padding: '4px 8px', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}
            />
          </div>
          <div className="total-row" style={{ color: calc.balance > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
            <span>Supplier Balance Due</span>
            <span>{money(calc.balance)}</span>
          </div>
        </div>

        {/* Payment Account */}
        <div className="form-grid" style={{ marginTop: 14 }}>
          <div className="form-group">
            <label className="label">Paid via Payment Account</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              {(data?.settings?.payments || ['Cash', 'GPay UPI', 'HDFC Bank']).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Notes / Remarks</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Delivered via BlueDart, Carton No. 4"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* ─── BILL ATTACHMENT / CAMERA PHOTO UPLOAD ─── */}
        <div style={{
          marginTop: 14,
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: 10,
          border: '1.5px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
            <label className="label" style={{ marginBottom: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#1e293b' }}>
              <FileUp size={15} color="#2563eb" /> 🧾 Bill Photo / File Attachment (બિલનો ફોટો / ફાઈલ)
            </label>
            {billImage && (
              <span style={{ fontSize: 11, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                ✓ Attached & Ready to Save
              </span>
            )}
          </div>

          <input
            type="file"
            ref={billAttachInputRef}
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={handleBillAttachFileSelect}
          />
          <input
            type="file"
            ref={billCameraInputRef}
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleBillAttachFileSelect}
          />

          {billImage ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: '#ffffff',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              flexWrap: 'wrap',
            }}>
              <img
                src={billImage}
                alt="Bill Preview"
                style={{
                  width: 60,
                  height: 60,
                  objectFit: 'cover',
                  borderRadius: 6,
                  border: '1.5px solid #94a3b8',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                }}
                onClick={() => setPreviewImageModal(billImage)}
                title="Click to view full size"
              />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  🧾 Bill Photo Attached
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  આ બિલનો ફોટો Purchase રેકોર્ડ સાથે કાયમ માટે સચવાઈ જશે.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setPreviewImageModal(billImage)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#0284c7' }}
                >
                  <Eye size={13} /> 🔍 View
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => billCameraInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
                  title="Take new photo with camera"
                >
                  <Camera size={13} /> 📷 Camera
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => billAttachInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
                  title="Upload from files"
                >
                  <Upload size={13} /> 📁 Change
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setBillImage('')}
                  style={{ color: '#ef4444', fontSize: 12 }}
                  title="Remove photo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => billCameraInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  background: '#ffffff',
                  borderColor: '#0284c7',
                  color: '#0369a1',
                }}
              >
                <Camera size={14} color="#0284c7" /> 📷 Camera Foto (ફોટો પાડો)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => billAttachInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  background: '#ffffff',
                  borderColor: '#16a34a',
                  color: '#15803d',
                }}
              >
                <Upload size={14} color="#16a34a" /> 📁 Upload File / PDF (પસંદ કરો)
              </button>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                (બિલનો ફોટો પાડીને કે અપલોડ કરીને બિલ સાથે કાયમ માટે સેવ કરો)
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* View Purchase Bill Receipt Modal */}
      {viewPurchase && (
        <Modal
          isOpen={!!viewPurchase}
          onClose={() => setViewPurchase(null)}
          title={`🛒 Purchase Bill — ${viewPurchase.no}`}
          wide
          footer={
            <button className="btn btn-primary" onClick={() => setViewPurchase(null)}>
              Close
            </button>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div>
              <div><b>Supplier:</b> {viewPurchase.supplier}</div>
              <div><b>Date:</b> {fmtDate(viewPurchase.date)}</div>
              <div><b>Payment Account:</b> {viewPurchase.mode}</div>
            </div>
            <div>
              <div><b>Invoice Ref:</b> {viewPurchase.supplierInvoice || '—'}</div>
              <div><b>Due Date:</b> {fmtDate(viewPurchase.dueDate) || '—'}</div>
              <div><b>Status:</b> {viewPurchase.balance <= 0 ? '✓ Fully Paid' : `⚠️ Due ${money(viewPurchase.balance)}`}</div>
            </div>
          </div>

          {/* Attached Bill Document Preview */}
          {viewPurchase.billImageUrl && (
            <div style={{
              marginBottom: 16,
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={viewPurchase.billImageUrl}
                  alt="Bill Document"
                  style={{
                    width: 60,
                    height: 60,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1.5px solid #94a3b8',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPreviewImageModal(viewPurchase.billImageUrl!)}
                  title="Click to view full size"
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={15} color="#15803d" /> 🧾 Original Bill Photo Attached
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    આ ખરીદી સાથે અસલ બિલનો ફોટો સાચવેલો છે.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setPreviewImageModal(viewPurchase.billImageUrl!)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <Eye size={13} /> 🔍 View Fullscreen Photo
              </button>
            </div>
          )}

          <div className="table-wrap" style={{ marginBottom: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Product</th>
                  <th>Expiry Date</th>
                  <th>Qty</th>
                  <th>Buy Rate</th>
                  <th>MRP</th>
                  <th style={{ textAlign: 'center' }}>Margin %</th>
                  <th>GST %</th>
                  <th style={{ textAlign: 'right' }}>Item Order Total</th>
                </tr>
              </thead>
              <tbody>
                {viewPurchase.lines.map((l, i) => {
                  const lineSub = l.qty * l.rate;
                  const lineGst = (lineSub * (l.gst || 0)) / 100;
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{l.barcode || '—'}</td>
                      <td style={{ fontWeight: 700 }}>{l.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {l.expiry ? fmtExpiry(l.expiry) : '—'}
                      </td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>{l.qty}</td>
                      <td>{money(l.rate)}</td>
                      <td style={{ fontWeight: 600 }}>{l.mrp ? money(l.mrp) : '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {Number(l.mrp) > 0 && Number(l.rate) > 0 ? (
                          (() => {
                            const margin = ((Number(l.mrp) - Number(l.rate)) / Number(l.mrp)) * 100;
                            const isHigh = margin >= 40;
                            const isMed = margin >= 20;
                            const isLow = margin > 0;
                                               const marginText = (Number.isInteger(margin) ? margin.toFixed(0) : margin.toFixed(1)) + "%";
                            return (
                              <span
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: isHigh ? '#dcfce7' : isMed ? '#e0f2fe' : isLow ? '#fef3c7' : '#fee2e2',
                                  color: isHigh ? '#15803d' : isMed ? '#0369a1' : isLow ? '#b45309' : '#b91c1c',
                                }}
                                title={"Margin: " + margin.toFixed(1) + "% | Profit: ₹" + (Number(l.mrp) - Number(l.rate)).toFixed(2) + " per unit"}
                              >
                                {marginText}
                              </span>
                            );
                          })()
                        ) : '—'}
                      </td>
                      <td>{l.gst || 0}%</td>
                      <td style={{ fontWeight: 800, color: 'var(--teal)', textAlign: 'right' }}>{money(lineSub + lineGst)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="billing-totals">
            <div className="total-row"><span>Subtotal:</span> <span>{money(viewPurchase.subtotal)}</span></div>
            <div className="total-row"><span>GST:</span> <span>{money(viewPurchase.gst)}</span></div>
            <div className="total-row"><span>Discount:</span> <span>−{money(viewPurchase.discount)}</span></div>
            <div className="total-row grand"><span>Total:</span> <span>{money(viewPurchase.total)}</span></div>
            <div className="total-row"><span>Paid:</span> <span style={{ color: 'var(--green)' }}>{money(viewPurchase.paid)}</span></div>
            <div className="total-row" style={{ fontWeight: 700, color: viewPurchase.balance > 0 ? 'var(--red)' : 'var(--green)' }}>
              <span>Balance Due:</span> <span>{money(viewPurchase.balance)}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Purchase Confirmation Modal */}
      {deletePurchaseId && (
        <Modal
          isOpen={!!deletePurchaseId}
          onClose={() => setDeletePurchaseId(null)}
          title="🗑️ Delete Purchase Bill"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeletePurchaseId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDeletePurchase(deletePurchaseId)}>
                Delete & Deduct Stock
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13.5, color: 'var(--text)', margin: '0 0 8px' }}>
            Are you sure you want to delete purchase bill{' '}
            <b>{data?.purchases?.find((p) => p.id === deletePurchaseId)?.no}</b> from{' '}
            <b>{data?.purchases?.find((p) => p.id === deletePurchaseId)?.supplier}</b>?
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            💡 All inwarded product quantities from this purchase order will be automatically deducted from your inventory.
          </p>
        </Modal>
      )}

      {/* ─── AI BILL SCANNING OVERLAY ─── */}
      {scanningBill && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#ffffff',
            padding: '28px 36px',
            borderRadius: 18,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
            maxWidth: 440,
            width: '90%',
          }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              background: '#f0fdf4',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <RefreshCw size={28} className="spin" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              🔍 AI Bill Scanner Analyzing...
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 0 }}>
              Extracting Supplier, Bill No, Dates, Product Names, Buy Rates & MRPs...
            </p>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
              સલૂન AI બિલમાંથી પ્રોડક્ટ્સ અને રેટ આપમેળે વાંચી રહ્યું છે...
            </div>
          </div>
        </div>
      )}

      {/* ─── SMART BILL PRODUCT MATCHING & ALIAS MEMORY MODAL ─── */}
      {billMatchingModalOpen && (
        <Modal
          isOpen={billMatchingModalOpen}
          onClose={() => {
            setBillMatchingModalOpen(false);
            if (pendingBillData) {
              applyMappedBillToOrder(pendingBillData, billReviewItems, data?.inventory || []);
            }
          }}
          title={`🧾 Smart Product Matching & Review (${billReviewItems.length} Items)`}
          wide
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setBillMatchingModalOpen(false);
                  if (pendingBillData) {
                    applyMappedBillToOrder(pendingBillData, billReviewItems, data?.inventory || []);
                  }
                }}
              >
                Skip Matching (Keep Raw Names)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmBillMappings}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <CheckCircle2 size={16} /> ✓ Confirm Mappings & Open Purchase Order
              </button>
            </div>
          }
        >
          {/* Header Explanation */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 12.5,
            color: '#166534',
            lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#15803d" /> AI એ બિલના નામોને તમારી સલૂન Inventory સાથે સ્માર્ટલી મેચ કર્યા છે:
            </div>
            <div>
              જેમ કે બિલમાં <code>JC-INTENSE FIRMING AMPOULE</code> છે અને Inventory માં <code>Jeannot Intense Firming Ampoule 7 x 2 ml</code> છે.
              રિવ્યૂ કરો અને <strong>યાદ રાખો (Remember Alias)</strong> પર ચેક રહેવા દો — જેથી <strong>ભવિષ્યમાં જ્યારે પણ આ બિલ આવશે ત્યારે આપમેળે ૧૦૦% મેચ થઈ જશે!</strong>
            </div>
          </div>

          {/* Review Rows */}
          <div style={{ maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
            {billReviewItems.map((item, idx) => {
              const invList = data?.inventory || [];
              const isMatched = item.action === 'match_existing';

              return (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* Top: Bill Item Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        બિલમાં નામ (Item #{idx + 1}):
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {item.billName}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#475569', background: '#f8fafc', padding: '4px 10px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      <span>Qty: <strong>{item.qty}</strong></span>
                      <span>Buy Rate: <strong>₹{item.rate}</strong></span>
                      <span>MRP: <strong>₹{item.mrp}</strong></span>
                    </div>
                  </div>

                  {/* Middle: Match with existing OR Add new */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, background: '#fafafa', padding: 10, borderRadius: 8 }}>
                    {/* Option 1: Match Existing */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                        <input
                          type="radio"
                          name={`action_${idx}`}
                          checked={item.action === 'match_existing'}
                          onChange={() => updateReviewItem(idx, { action: 'match_existing' })}
                        />
                        <span>🔗 સલૂન Inventory સાથે Link કરો</span>
                        {item.matchScore > 0 && (
                          <span style={{
                            fontSize: 10.5,
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '1px 6px',
                            borderRadius: 10,
                            fontWeight: 700,
                          }}>
                            {item.matchMethod === 'alias' ? '🔖 Saved Alias (100%)' : `✨ AI Match (${Math.round(item.matchScore * 100)}%)`}
                          </span>
                        )}
                      </label>

                      <select
                        className="input"
                        disabled={item.action !== 'match_existing'}
                        value={item.selectedInventoryId}
                        onChange={(e) => updateReviewItem(idx, { selectedInventoryId: e.target.value })}
                        style={{
                          fontSize: 12,
                          padding: '6px 8px',
                          width: '100%',
                          background: item.action === 'match_existing' ? '#ffffff' : '#f1f5f9',
                          borderColor: item.action === 'match_existing' ? '#86efac' : '#cbd5e1',
                        }}
                      >
                        {invList.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (MRP: ₹{inv.mrp || inv.buy || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Option 2: Create New */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                        <input
                          type="radio"
                          name={`action_${idx}`}
                          checked={item.action === 'create_new'}
                          onChange={() => updateReviewItem(idx, { action: 'create_new' })}
                        />
                        <span>➕ નવું પ્રોડક્ટ ઉમેરો (નવું ઇન્વેન્ટરી)</span>
                      </label>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          className="input"
                          disabled={item.action !== 'create_new'}
                          value={item.newName}
                          placeholder="Official Product Name"
                          onChange={(e) => updateReviewItem(idx, { newName: e.target.value })}
                          style={{
                            fontSize: 12,
                            padding: '6px 8px',
                            flex: 1,
                            background: item.action === 'create_new' ? '#ffffff' : '#f1f5f9',
                          }}
                        />
                        <select
                          className="input"
                          disabled={item.action !== 'create_new'}
                          value={item.newCategory}
                          onChange={(e) => updateReviewItem(idx, { newCategory: e.target.value })}
                          style={{
                            fontSize: 12,
                            padding: '6px 6px',
                            width: 130,
                            background: item.action === 'create_new' ? '#ffffff' : '#f1f5f9',
                          }}
                        >
                          <option value="Skin Care & Facials">Skin Care & Facials</option>
                          <option value="Hair Care & Shampoo">Hair Care & Shampoo</option>
                          <option value="Hair Serum & Oils">Hair Serum & Oils</option>
                          <option value="Makeup & Cosmetics">Makeup & Cosmetics</option>
                          <option value="Salon Consumables">Salon Consumables</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Alias Memory Checkbox */}
                  {isMatched && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#475569', cursor: 'pointer', marginTop: 2 }}>
                      <input
                        type="checkbox"
                        checked={item.rememberAlias}
                        onChange={(e) => updateReviewItem(idx, { rememberAlias: e.target.checked })}
                      />
                      <span>
                        💾 <strong>ભવિષ્ય માટે યાદ રાખો:</strong> આગળ ક્યારેય આ સપ્લાયરનું બિલ આવે ત્યારે <code>{item.billName}</code> આપમેળે આ જ પ્રોડક્ટ સાથે ૧૦૦% મેચ થઈ જશે (પૂછ્યા વગર).
                      </span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ─── FULLSCREEN BILL PHOTO LIGHTBOX MODAL ─── */}
      {previewImageModal && (
        <Modal
          isOpen={!!previewImageModal}
          onClose={() => setPreviewImageModal(null)}
          title="🧾 Original Bill Photo Preview"
          wide
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <a
                href={previewImageModal}
                download="Purchase-Bill.jpg"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Upload size={13} style={{ transform: 'rotate(180deg)' }} /> Download Image
              </a>
              <button className="btn btn-primary btn-sm" onClick={() => setPreviewImageModal(null)}>
                Close Preview
              </button>
            </div>
          }
        >
          <div style={{ textAlign: 'center', background: '#0f172a', borderRadius: 10, padding: 12, overflow: 'hidden' }}>
            <img
              src={previewImageModal}
              alt="Bill Full Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 6,
                margin: '0 auto',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </Modal>
      )}

            {/* Live Camera Barcode Scanner (Android & iPhone Compatible) */}
      <CameraBarcodeScanner
        isOpen={cameraModalOpen}
        onClose={() => {
          setCameraModalOpen(false);
          setTargetLineIdx(null);
        }}
        onScan={(code) => {
          if (targetLineIdx !== null && targetLineIdx >= 0) {
            handleBarcodeFastLookup(code, targetLineIdx);
            setTargetLineIdx(null);
          } else {
            handleBarcodeFastLookup(code);
          }
        }}
      />
    </div>
  );
}
