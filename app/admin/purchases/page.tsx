'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Search, Eye, Trash2, Calendar, FileText, CheckCircle,
  Barcode, PlusCircle, Building2, AlertTriangle, ArrowRight, UserPlus, Camera, Pencil,
  Layers, ChevronDown, ChevronUp, Sparkles, Copy
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

  // Fast Barcode Lookup & Mobile Camera Scan for Purchases
  const [barcodeInput, setBarcodeInput] = useState('');
  const [targetLineIdx, setTargetLineIdx] = useState<number | null>(null);
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                                    <th style={{ padding: '6px 10px', textAlign: 'left', width: 140 }}>Batch / Expiry</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center', width: 60 }}>Qty</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', width: 95 }}>Buy Rate</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', width: 95 }}>MRP</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center', width: 90 }}>(Buy/MRP)%</th>
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
                                          {line.batch ? `B: ${line.batch} ` : ''}
                                          {line.expiry ? `(Exp: ${fmtExpiry(line.expiry)})` : '—'}
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
                                              const pct = (Number(line.rate) / Number(line.mrp)) * 100;
                                              const isLow = pct <= 50;
                                              const isMed = pct <= 75;
                                              return (
                                                <span
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: isLow ? '#dcfce7' : isMed ? '#e0f2fe' : '#fef3c7',
                                                    color: isLow ? '#15803d' : isMed ? '#0369a1' : '#b45309',
                                                  }}
                                                  title={`Buy rate is ${pct.toFixed(1)}% of MRP (${(100 - pct).toFixed(0)}% margin discount)`}
                                                >
                                                  {pct.toFixed(1)}%
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
            <label className="label" style={{ margin: 0, fontWeight: 800 }}>Purchase Line Items</label>
            <motion.button
              className="btn btn-ghost btn-sm"
              onClick={() => setLines((prev) => [...prev, EMPTY_LINE(defaultGst)])}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={13} /> Add Line Item
            </motion.button>
          </div>

          {/* Column Header Titles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 1.35fr 0.65fr 0.75fr 48px 68px 68px 68px 50px 88px 58px',
              gap: 6,
              padding: '6px 8px',
              background: '#e2e8f0',
              borderRadius: '6px 6px 0 0',
              fontSize: 11,
              fontWeight: 700,
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            <span>Barcode</span>
            <span>Product Name *</span>
            <span>Batch No</span>
            <span>Expiry (MM/YY)</span>
            <span style={{ textAlign: 'center' }}>Qty</span>
            <span style={{ textAlign: 'right' }}>Buy Rate</span>
            <span style={{ textAlign: 'right' }}>MRP (₹)</span>
            <span style={{ textAlign: 'center' }}>Buy/MRP %</span>
            <span style={{ textAlign: 'center' }}>GST</span>
            <span style={{ textAlign: 'right' }}>Item Total</span>
            <span style={{ textAlign: 'center' }}>Actions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {lines.map((l, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.15fr 1.35fr 0.65fr 0.75fr 48px 68px 68px 68px 50px 88px 58px',
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
                  type="text"
                  className="input"
                  placeholder="Batch (e.g. B-01)"
                  value={l.batch || ''}
                  onChange={(e) => setLine(idx, { batch: e.target.value })}
                  style={{ padding: '6px 8px', fontSize: 11.5 }}
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
                <div style={{ textAlign: 'center' }}>
                  {Number(l.mrp) > 0 && Number(l.rate) > 0 ? (
                    (() => {
                      const pct = (Number(l.rate) / Number(l.mrp)) * 100;
                      const margin = 100 - pct;
                      const isLow = pct <= 50;
                      const isMed = pct <= 75;
                      return (
                        <div
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 4px',
                            borderRadius: 5,
                            background: isLow ? '#dcfce7' : isMed ? '#e0f2fe' : '#fef3c7',
                            border: `1px solid ${isLow ? '#bbf7d0' : isMed ? '#bae6fd' : '#fde68a'}`,
                            minWidth: 46,
                          }}
                          title={`Purchase rate is ${pct.toFixed(1)}% of MRP. Margin discount is ${margin.toFixed(1)}%`}
                        >
                          <span style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: isLow ? '#15803d' : isMed ? '#0369a1' : '#b45309',
                            lineHeight: 1.1,
                          }}>
                            {pct.toFixed(1)}%
                          </span>
                          <span style={{ fontSize: 8.5, color: '#64748b', lineHeight: 1 }}>
                            {margin.toFixed(0)}% margin
                          </span>
                        </div>
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

          {/* Gujarati & English Multi-Expiry Guidance Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11.5,
            color: '#475569',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '7px 12px',
            borderRadius: 6,
            marginTop: 8,
          }}>
            <Sparkles size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>
              <strong>💡 એક જ બારકોડમાં અલગ Expiry Date ઉમેરવા માટે:</strong>{' '}
              તે રો પર <strong>[+]</strong> બટન દબાવો જેથી એ જ બારકોડની નવી રો બનશે અને તમે અલગ Expiry Date નાખી શકશો. અથવા ઉપર <strong>&quot;📅 + New Expiry Batch&quot;</strong> મોડ ચાલુ રાખીને સ્કેન કરો.
            </span>
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

          <div className="table-wrap" style={{ marginBottom: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Product</th>
                  <th>Batch / Expiry</th>
                  <th>Qty</th>
                  <th>Buy Rate</th>
                  <th>MRP</th>
                  <th style={{ textAlign: 'center' }}>(Buy/MRP) %</th>
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
                        {l.batch || l.expiry ? `${l.batch ? `Batch: ${l.batch} ` : ''}${l.expiry ? `(Exp: ${fmtExpiry(l.expiry)})` : ''}` : '—'}
                      </td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>{l.qty}</td>
                      <td>{money(l.rate)}</td>
                      <td style={{ fontWeight: 600 }}>{l.mrp ? money(l.mrp) : '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {Number(l.mrp) > 0 && Number(l.rate) > 0 ? (
                          (() => {
                            const pct = (Number(l.rate) / Number(l.mrp)) * 100;
                            const isLow = pct <= 50;
                            const isMed = pct <= 75;
                            return (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: isLow ? '#dcfce7' : isMed ? '#e0f2fe' : '#fef3c7',
                                  color: isLow ? '#15803d' : isMed ? '#0369a1' : '#b45309',
                                }}
                              >
                                {pct.toFixed(1)}%
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
