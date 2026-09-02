'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  Barcode,
  History,
  TrendingDown,
  Upload,
  Download,
  Building2,
  CheckCircle2,
  Layers,
  Sparkles,
  Camera,
  Printer,
  Scale,
  DollarSign,
  Tag,
  Calendar,
  FileSpreadsheet,
  CheckSquare,
  Square,
  List,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave, cloudSave } from '@/lib/sync';
import { uid, fmtDate, money, todayISO } from '@/lib/utils';
import { InventoryItem, InventoryTx, Supplier, StockAdjustment, AdjustmentReason } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';
import CameraBarcodeScanner from '@/components/barcode/CameraBarcodeScanner';
import BarcodeLabelSheet from '@/components/barcode/BarcodeLabelSheet';

type InventoryTab = 'products' | 'transactions' | 'adjustments' | 'lowstock' | 'expiring';

const SAMPLE_CATEGORIES = [
  'Hair Care & Shampoo',
  'Hair Serum & Oils',
  'Skin Care & Facials',
  'Makeup & Cosmetics',
  'Bridal & Nail Art',
  'Bleach & Cleanup',
  'Salon Consumables',
  'Equipment & Accessories',
];

const SAMPLE_BRANDS = [
  "L'Oreal Professionnel",
  'Matrix Biolage',
  'Schwarzkopf',
  'O3+ Professional',
  'Lotus Herbals Professional',
  'Streax Professional',
  'VLCC Professional',
  'Raga Professional',
  'Generic / In-house',
];

const SALON_PRESET_PRODUCT_PACKAGES = [
  {
    title: '💇 Hair Care & Styling Products Pack',
    category: 'Hair Care & Shampoo',
    brand: "L'Oreal Professionnel",
    products: [
      { name: "L'Oreal Vitamino Color Shampoo 1500ml", barcode: '89012345001', stock: 10, buy: 1250, sell: 1650, mrp: 1850, unit: 'Pcs' },
      { name: 'Matrix Biolage Hair Spa Cream 500g', barcode: '89012345002', stock: 15, buy: 650, sell: 850, mrp: 950, unit: 'Pcs' },
      { name: 'Schwarzkopf Smooth Intense Keratin 1000ml', barcode: '89012345003', stock: 6, buy: 2800, sell: 3800, mrp: 4200, unit: 'Pcs' },
      { name: 'Streax Professional Gloss Hair Serum 100ml', barcode: '89012345004', stock: 25, buy: 180, sell: 260, mrp: 310, unit: 'Pcs' },
      { name: "L'Oreal Majirel Hair Color Shade Tube 50ml", barcode: '89012345005', stock: 30, buy: 240, sell: 320, mrp: 380, unit: 'Pcs' },
    ],
  },
  {
    title: '💆 Skin Care & Facials Products Pack',
    category: 'Skin Care & Facials',
    brand: 'O3+ Professional',
    products: [
      { name: 'O3+ Gold Radiance Facial Kit 500g', barcode: '89012346001', stock: 8, buy: 1800, sell: 2400, mrp: 2800, unit: 'Kits' },
      { name: 'Lotus Herbals Fruit Facial Kit Pack', barcode: '89012346002', stock: 10, buy: 480, sell: 750, mrp: 850, unit: 'Kits' },
      { name: 'Raaga Professional D-Tan Removal Pack 500g', barcode: '89012346003', stock: 15, buy: 620, sell: 950, mrp: 1100, unit: 'Pcs' },
      { name: 'VLCC Insta-Glow Facial Bleach Cream 1kg', barcode: '89012346004', stock: 10, buy: 380, sell: 550, mrp: 650, unit: 'Pcs' },
    ],
  },
  {
    title: '🦵 Salon Consumables & Wax Pack',
    category: 'Salon Consumables',
    brand: 'Rica Professional',
    products: [
      { name: 'Rica White Chocolate Liposoluble Wax 800g', barcode: '89012347001', stock: 20, buy: 520, sell: 750, mrp: 850, unit: 'Tins' },
      { name: 'Honey Wax Tin Container 800g', barcode: '89012347002', stock: 25, buy: 180, sell: 320, mrp: 380, unit: 'Tins' },
      { name: 'Non-woven Hair Removal Wax Strips (100 Strips)', barcode: '89012347003', stock: 50, buy: 65, sell: 120, mrp: 150, unit: 'Packs' },
      { name: 'Disposable Facial Tissue Box (200 Sheets)', barcode: '89012347004', stock: 30, buy: 85, sell: 140, mrp: 160, unit: 'Boxes' },
    ],
  },
  {
    title: '💅 Nails & Cosmetics Pack',
    category: 'Bridal & Nail Art',
    brand: 'Generic / In-house',
    products: [
      { name: 'UV Gel Nail Polish Color Set (12 Shade Bottles)', barcode: '89012348001', stock: 5, buy: 1400, sell: 2200, mrp: 2600, unit: 'Sets' },
      { name: 'Pure Acetone Nail Polish Remover 500ml', barcode: '89012348002', stock: 15, buy: 120, sell: 200, mrp: 240, unit: 'Bottles' },
      { name: 'Nail Primer & Base Top Coat Combo', barcode: '89012348003', stock: 10, buy: 350, sell: 550, mrp: 650, unit: 'Pcs' },
    ],
  },
];

const GST_TAX_RATES = [0, 5, 12, 18, 28];

const ADJUSTMENT_REASONS: AdjustmentReason[] = [
  'Physical Count Correction',
  'Salon In-House Usage',
  'Damaged / Broken',
  'Tester / Sample',
  'Expired',
];

export default function InventoryPage() {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<InventoryTab>('products');
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Barcode Camera Scanner Modal
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Barcode Label Sheet Modal
  const [barcodeLabelsModalOpen, setBarcodeLabelsModalOpen] = useState(false);

  // Stock Adjustment Modal
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjProductId, setAdjProductId] = useState('');
  const [adjType, setAdjType] = useState<'Add' | 'Reduce'>('Reduce');
  const [adjQty, setAdjQty] = useState<number | ''>(1);
  const [adjReason, setAdjReason] = useState<AdjustmentReason>('Salon In-House Usage');
  const [adjStaff, setAdjStaff] = useState('');
  const [adjNotes, setAdjNotes] = useState('');

  // Quick Inward Stock Modal
  const [stockModal, setStockModal] = useState(false);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState(1);
  const [stockRate, setStockRate] = useState(0);
  const [stockParty, setStockParty] = useState('');
  const [stockBatch, setStockBatch] = useState('');
  const [stockExpiry, setStockExpiry] = useState('');

  // Bulk Add / Excel Upload Products State
  const [importModal, setImportModal] = useState(false);
  const [bulkImportTab, setBulkImportTab] = useState<'excel' | 'table' | 'presets' | 'paste'>('excel');
  const [importFileName, setImportFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<Partial<InventoryItem>[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [bulkProductRows, setBulkProductRows] = useState<Array<{ id: string; barcode: string; name: string; brand: string; category: string; stock: number | ''; buy: number | ''; sell: number | ''; mrp: number | ''; expiry: string }>>([
    { id: '1', barcode: '', name: '', brand: SAMPLE_BRANDS[0], category: SAMPLE_CATEGORIES[0], stock: 10, buy: 500, sell: 750, mrp: 850, expiry: '' },
    { id: '2', barcode: '', name: '', brand: SAMPLE_BRANDS[1], category: SAMPLE_CATEGORIES[1], stock: 12, buy: 650, sell: 850, mrp: 950, expiry: '' },
    { id: '3', barcode: '', name: '', brand: SAMPLE_BRANDS[3], category: SAMPLE_CATEGORIES[2], stock: 8, buy: 1800, sell: 2400, mrp: 2800, expiry: '' },
  ]);
  const [selectedPresetProducts, setSelectedPresetProducts] = useState<Record<string, boolean>>({});
  const [pasteInput, setPasteInput] = useState('');

  const openImportModal = () => {
    // Pre-fill selected state for preset product packages
    const initialPresetState: Record<string, boolean> = {};
    SALON_PRESET_PRODUCT_PACKAGES.forEach((pack) => {
      pack.products.forEach((p) => {
        const key = `${pack.category}___${p.name}`;
        const exists = (data?.inventory || []).some((ex) => ex.name.toLowerCase() === p.name.toLowerCase());
        initialPresetState[key] = !exists;
      });
    });
    setSelectedPresetProducts(initialPresetState);
    setImportModal(true);
  };

  const downloadSampleExcelTemplate = () => {
    let csv = 'Barcode,Product Name,Brand,Category,Supplier,Stock Qty,Buy Price (₹),Sell Price (₹),MRP (₹),Buy Date,Expiry Date,Unit,Low Stock Alert\n';
    csv += '89012345001,L\'Oreal Serie Expert Vitamino Shampoo 1500ml,L\'Oreal Professionnel,Hair Care & Shampoo,L\'Oreal Official,12,1250,1650,1850,2026-08-01,2028-08-01,Pcs,3\n';
    csv += '89012345002,Matrix Biolage Hair Spa Cream 500g,Matrix Biolage,Hair Care & Shampoo,Matrix Supplier,15,650,850,950,2026-08-01,2028-05-01,Pcs,4\n';
    csv += '89012345003,O3+ Gold Radiance Facial Kit 500g,O3+ Professional,Skin Care & Facials,O3+ Distributor,8,1800,2400,2800,2026-08-01,2028-12-01,Kits,2\n';
    csv += '89012345004,Rica White Chocolate Liposoluble Wax 800g,Rica Professional,Salon Consumables,Beauty Wholesale,20,520,750,850,2026-08-01,2028-06-01,Tins,5\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `salon_inventory_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('📥 Sample Excel/CSV template downloaded!');
  };

  const addBulkProductRow = () => {
    setBulkProductRows((prev) => [
      ...prev,
      { id: uid(), barcode: '', name: '', brand: SAMPLE_BRANDS[0], category: SAMPLE_CATEGORIES[0], stock: 10, buy: '', sell: '', mrp: '', expiry: '' },
    ]);
  };

  const removeBulkProductRow = (id: string) => {
    setBulkProductRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateBulkProductRow = (id: string, field: string, val: any) => {
    setBulkProductRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleSaveBulkProductTable = () => {
    const valid = bulkProductRows
      .filter((r) => r.name.trim() !== '' && Number(r.sell) > 0)
      .map((r) => ({
        id: uid(),
        barcode: r.barcode.trim() || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        name: r.name.trim(),
        brand: r.brand.trim() || SAMPLE_BRANDS[0],
        category: r.category.trim() || SAMPLE_CATEGORIES[0],
        stock: Number(r.stock || 0),
        buy: Number(r.buy || 0),
        sell: Number(r.sell),
        mrp: Number(r.mrp || Number(r.sell) * 1.15),
        buyDate: todayISO(),
        expiry: r.expiry || '',
        unit: 'Pcs',
        low: 3,
        hsnCode: '3305',
        taxRate: 18,
      }));

    if (valid.length === 0) {
      toast('Please enter at least one valid product with name and sell rate > ₹0', 'error');
      return;
    }

    updateData((d) => ({
      ...d,
      inventory: [...valid, ...(d.inventory || [])],
    }));

    scheduleSave();
    cloudSave();
    setSearch('');
    setBrandFilter('');
    setCategoryFilter('');
    setActiveTab('products');
    toast(`🎉 Successfully added ${valid.length} new products to inventory!`);
    setImportModal(false);
  };

  const handleSaveBulkPresets = () => {
    const toImport: InventoryItem[] = [];
    SALON_PRESET_PRODUCT_PACKAGES.forEach((pack) => {
      pack.products.forEach((p) => {
        const key = `${pack.category}___${p.name}`;
        if (selectedPresetProducts[key]) {
          toImport.push({
            id: uid(),
            barcode: p.barcode,
            name: p.name,
            brand: pack.brand,
            category: pack.category,
            stock: p.stock,
            buy: p.buy,
            sell: p.sell,
            mrp: p.mrp,
            unit: p.unit,
            buyDate: todayISO(),
            low: 3,
            hsnCode: '3305',
            taxRate: 18,
          });
        }
      });
    });

    if (toImport.length === 0) {
      toast('Please select at least one preset product to import', 'error');
      return;
    }

    updateData((d) => ({
      ...d,
      inventory: [...toImport, ...(d.inventory || [])],
    }));

    scheduleSave();
    cloudSave();
    setSearch('');
    setBrandFilter('');
    setCategoryFilter('');
    setActiveTab('products');
    toast(`🎉 Successfully imported ${toImport.length} product SKUs!`);
    setImportModal(false);
  };

  const handleSaveBulkPaste = () => {
    if (!pasteInput.trim()) {
      toast('Please paste Excel / CSV text first', 'error');
      return;
    }

    const lines = pasteInput.split('\n').filter((l) => l.trim().length > 0);
    const parsed: InventoryItem[] = [];

    lines.forEach((line) => {
      const parts = line.split(/,|\t/).map((p) => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const sell = Number(parts[1].replace(/[^0-9.]/g, ''));
        const buy = Number((parts[2] || '').replace(/[^0-9.]/g, '') || Math.round(sell * 0.7));
        const stock = Number((parts[3] || '').replace(/[^0-9.]/g, '') || 10);
        const category = parts[4] || SAMPLE_CATEGORIES[0];
        const brand = parts[5] || SAMPLE_BRANDS[0];
        const barcode = parts[6] || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;

        if (name && sell > 0) {
          parsed.push({
            id: uid(),
            barcode,
            name,
            brand,
            category,
            stock,
            buy,
            sell,
            mrp: Math.round(sell * 1.15),
            unit: 'Pcs',
            buyDate: todayISO(),
            low: 3,
          });
        }
      }
    });

    if (parsed.length === 0) {
      toast('Could not parse any valid product rows. Format: Name, Sell Price, Buy Price, Stock Qty', 'error');
      return;
    }

    updateData((d) => ({
      ...d,
      inventory: [...parsed, ...(d.inventory || [])],
    }));

    scheduleSave();
    cloudSave();
    setSearch('');
    setBrandFilter('');
    setCategoryFilter('');
    setActiveTab('products');
    toast(`🎉 Successfully parsed & added ${parsed.length} products from Excel paste!`);
    setImportModal(false);
    setPasteInput('');
  };

  // Barcode Fast Scan Input
  const [barcodeScan, setBarcodeScan] = useState('');

  const inventory = data?.inventory || [];
  const inventoryTx = data?.inventoryTx || [];
  const adjustments = data?.adjustments || [];
  const suppliers = data?.suppliers || [];
  const staffList = data?.staff || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InventoryItem>({
    defaultValues: {
      id: '',
      barcode: '',
      name: '',
      brand: SAMPLE_BRANDS[0],
      category: SAMPLE_CATEGORIES[0],
      supplierId: '',
      supplierName: '',
      stock: 0,
      buy: 0,
      sell: 0,
      mrp: 0,
      minSellPrice: 0,
      unit: 'Pcs',
      low: 3,
      batch: '',
      expiry: '',
      hsnCode: '3305',
      taxRate: 18,
    },
  });

  // Filtered Products
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter((p) => {
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q));

      const matchBrand = !brandFilter || p.brand === brandFilter;
      const matchCategory = !categoryFilter || p.category === categoryFilter;

      return matchQuery && matchBrand && matchCategory;
    });
  }, [inventory, search, brandFilter, categoryFilter]);

  const lowStockItems = useMemo(
    () => filtered.filter((i) => Number(i.stock) <= Number(i.low)),
    [filtered]
  );

  const today = todayISO();
  const expiringItems = useMemo(() => {
    const future60 = new Date();
    future60.setDate(future60.getDate() + 60);
    const limitDate = future60.toISOString().slice(0, 10);
    return filtered.filter((i) => i.expiry && i.expiry <= limitDate);
  }, [filtered]);

  // Valuation KPIs
  const valuationStats = useMemo(() => {
    let totalStockCount = 0;
    let totalCostValuation = 0;
    let totalMrpValuation = 0;

    inventory.forEach((i) => {
      const qty = Number(i.stock || 0);
      totalStockCount += qty;
      totalCostValuation += qty * Number(i.buy || 0);
      totalMrpValuation += qty * Number(i.mrp || i.sell || 0);
    });

    return { totalStockCount, totalCostValuation, totalMrpValuation };
  }, [inventory]);

  const generateBarcode = () => {
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    const code = `890${randomDigits}`;
    setValue('barcode', code);
    toast(`Generated barcode: ${code}`);
  };

  const openNew = (prefillBarcode = '') => {
    setEditId(null);
    reset({
      id: '',
      barcode: prefillBarcode,
      name: '',
      brand: SAMPLE_BRANDS[0],
      category: SAMPLE_CATEGORIES[0],
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || '',
      stock: 0,
      buy: 0,
      sell: 0,
      mrp: 0,
      minSellPrice: 0,
      unit: 'Pcs',
      buyDate: todayISO(),
      low: 3,
      batch: '',
      expiry: '',
      hsnCode: '3305',
      taxRate: 18,
    });
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditId(item.id);
    reset({
      ...item,
      buyDate: item.buyDate || todayISO(),
      mrp: item.mrp || item.sell,
      hsnCode: item.hsnCode || '3305',
      taxRate: item.taxRate !== undefined ? item.taxRate : 18,
      minSellPrice: item.minSellPrice || item.sell,
    });
    setModalOpen(true);
  };

  const handleBarcodeLookup = (codeToLookup?: string) => {
    const code = (codeToLookup || barcodeScan).trim();
    if (!code) return;
    setBarcodeScan('');
    const p = inventory.find((x) => String(x.barcode || '').trim() === code);
    if (p) {
      openEdit(p);
      toast(`Found product: ${p.name}`);
    } else {
      openNew(code);
      toast(`New product with barcode "${code}"`);
    }
  };

  const openAdjustment = (productId?: string) => {
    setAdjProductId(productId || inventory[0]?.id || '');
    setAdjType('Reduce');
    setAdjQty(1);
    setAdjReason('Salon In-House Usage');
    setAdjStaff(staffList[0]?.name || '');
    setAdjNotes('');
    setAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = () => {
    const product = inventory.find((i) => i.id === adjProductId);
    if (!product) {
      toast('Please select a valid product to adjust.', 'error');
      return;
    }
    const numQty = Number(adjQty || 0);
    if (numQty <= 0) {
      toast('Quantity must be greater than 0.', 'error');
      return;
    }

    if (adjType === 'Reduce' && product.stock < numQty) {
      toast(`Cannot reduce ${numQty} items — only ${product.stock} in stock.`, 'error');
      return;
    }

    const diff = adjType === 'Add' ? numQty : -numQty;
    const newStock = Math.max(0, product.stock + diff);

    const newAdj: StockAdjustment = {
      id: uid(),
      date: todayISO(),
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      type: adjType,
      qty: numQty,
      reason: adjReason,
      staff: adjStaff,
      notes: adjNotes.trim(),
    };

    const newTx: InventoryTx = {
      id: uid(),
      date: todayISO(),
      product: product.name,
      barcode: product.barcode,
      type: adjReason === 'Salon In-House Usage' ? 'Salon Use' : adjReason === 'Damaged / Broken' ? 'Damage' : 'Adjust',
      qty: numQty,
      rate: product.buy,
      party: adjStaff ? `Staff: ${adjStaff}` : adjReason,
      batch: product.batch,
      expiry: product.expiry,
    };

    updateData((d) => ({
      ...d,
      inventory: (d.inventory || []).map((i) => (i.id === product.id ? { ...i, stock: newStock } : i)),
      adjustments: [newAdj, ...(d.adjustments || [])],
      inventoryTx: [newTx, ...(d.inventoryTx || [])],
    }));

    scheduleSave();
    toast(`Stock updated for ${product.name}! New Stock: ${newStock} ${product.unit || 'Pcs'}`);
    setAdjustmentModalOpen(false);
  };

  const openStockIn = (id: string) => {
    const item = inventory.find((i) => i.id === id);
    setStockProductId(id);
    setStockQty(1);
    setStockRate(item?.buy || 0);
    setStockParty(item?.supplierName || '');
    setStockModal(true);
  };

  const onSubmit = (form: InventoryItem) => {
    const id = editId || uid();
    const barcode = (form.barcode || '').trim();

    // Check duplicate barcode
    if (barcode) {
      const duplicate = inventory.find((x) => x.id !== id && String(x.barcode || '').trim() === barcode);
      if (duplicate) {
        toast(`Barcode "${barcode}" already assigned to "${duplicate.name}"`, 'error');
        return;
      }
    }

    const supplier = suppliers.find((s) => s.id === form.supplierId);
    const updatedItem: InventoryItem = {
      ...form,
      id,
      barcode,
      supplierName: supplier ? supplier.name : form.supplierName || '',
    };

    updateData((d) => {
      const list = [...(d.inventory || [])];
      if (editId) {
        return { ...d, inventory: list.map((i) => (i.id === editId ? updatedItem : i)) };
      }
      return { ...d, inventory: [...list, updatedItem] };
    });

    scheduleSave();
    toast(editId ? 'Product updated!' : 'Product added to inventory!');
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    updateData((d) => ({ ...d, inventory: (d.inventory || []).filter((i) => i.id !== id) }));
    scheduleSave();
    toast('Product deleted', 'info');
    setDeleteId(null);
  };

  const handleDeleteAdjustment = (a: StockAdjustment) => {
    updateData((d) => {
      let inventory = [...(d.inventory || [])];
      inventory = inventory.map((item) => {
        if (item.id === a.productId || item.name === a.productName) {
          const delta = a.type === 'Add' ? -Number(a.qty || 0) : Number(a.qty || 0);
          return { ...item, stock: Math.max(0, item.stock + delta) };
        }
        return item;
      });

      const adjustments = (d.adjustments || []).filter((x) => x.id !== a.id);
      return { ...d, inventory, adjustments };
    });

    scheduleSave();
    toast(`Stock adjustment removed and stock reverted!`);
  };

  const handleDeleteTx = (id: string) => {
    updateData((d) => ({
      ...d,
      inventoryTx: (d.inventoryTx || []).filter((tx) => tx.id !== id),
    }));
    scheduleSave();
    toast('Audit transaction entry removed.');
  };

  const handleStockIn = () => {
    if (!stockProductId || stockQty <= 0) return;
    const product = inventory.find((i) => i.id === stockProductId);
    if (!product) return;

    updateData((d) => ({
      ...d,
      inventory: (d.inventory || []).map((i) =>
        i.id === stockProductId ? { ...i, stock: i.stock + stockQty, buy: stockRate || i.buy } : i
      ),
      inventoryTx: [
        {
          id: uid(),
          date: todayISO(),
          product: product.name,
          barcode: product.barcode,
          type: 'Buy',
          qty: stockQty,
          rate: stockRate || product.buy,
          party: stockParty || product.supplierName || 'Direct Stock In',
          batch: stockBatch || product.batch,
          expiry: stockExpiry || product.expiry,
        },
        ...(d.inventoryTx || []),
      ],
    }));

    scheduleSave();
    toast(`Added ${stockQty} ${product.unit || 'units'} to ${product.name}!`);
    setStockModal(false);
  };

  // CSV Export & Template Download
  const downloadSampleTemplate = () => {
    const csvContent =
      'Barcode,Product Name,Brand,Category,Supplier,Stock,Buy Price,Sell Price,MRP,Buy Date,Expiry Date,Unit,Low Stock Alert\n' +
      '890123456001,L\'Oreal Xtenso Care Shampoo 250ml,L\'Oreal Professionnel,Hair Care & Shampoo,Surat Cosmetics Hub,12,450,650,750,2026-01-15,2027-12-31,Pcs,3\n' +
      '890123456002,O3+ Bridal Facial Glow Kit,O3+ Professional,Skin Care & Facials,L\'Oreal Professional Distributor,8,1200,1850,2100,2026-02-10,2026-11-30,Kit,2\n' +
      '890123456003,Matrix Opti Care Hair Serum 100ml,Matrix Biolage,Hair Serum & Oils,Surat Cosmetics Hub,15,320,499,550,2026-03-01,2027-05-30,Bottle,4\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'shree_inventory_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventoryCSV = () => {
    let csv = 'Barcode,Product Name,Brand,Category,Supplier,Stock,Buy Price,Sell Price,MRP,Buy Date,Expiry Date,Unit,Low Stock Alert\n';
    inventory.forEach((i) => {
      const row = [
        `"${i.barcode || ''}"`,
        `"${i.name.replace(/"/g, '""')}"`,
        `"${(i.brand || '').replace(/"/g, '""')}"`,
        `"${(i.category || '').replace(/"/g, '""')}"`,
        `"${(i.supplierName || '').replace(/"/g, '""')}"`,
        i.stock,
        i.buy,
        i.sell,
        i.mrp || i.sell,
        `"${i.buyDate || ''}"`,
        `"${i.expiry || ''}"`,
        `"${i.unit || 'Pcs'}"`,
        i.low,
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shree_inventory_export_${todayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast('CSV file is empty or missing data rows.', 'error');
        return;
      }

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
          } else if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const rows: Partial<InventoryItem>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = parseLine(lines[i]);
        if (cells.length === 0 || !cells.some((c) => c.trim())) continue;

        const barcode = cells[0] || '';
        const name = cells[1] || '';
        const brand = cells[2] || '';
        const category = cells[3] || '';
        const supplierName = cells[4] || '';
        const stock = Number(cells[5] || 0);
        const buy = Number(cells[6] || 0);
        const sell = Number(cells[7] || 0);
        const mrp = Number(cells[8] || sell * 1.15);
        const buyDate = cells[9] || todayISO();
        const expiry = cells[10] || '';
        const unit = cells[11] || 'Pcs';
        const low = Number(cells[12] || 3);

        if (name.trim()) {
          rows.push({
            id: uid(),
            barcode,
            name,
            brand: brand || SAMPLE_BRANDS[0],
            category: category || SAMPLE_CATEGORIES[0],
            supplierName,
            stock,
            buy,
            sell,
            mrp,
            buyDate,
            unit,
            expiry,
            low,
          });
        }
      }

      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;

    updateData((d) => {
      const currentList = [...(d.inventory || [])];
      parsedRows.forEach((row) => {
        const existingIdx = row.barcode
          ? currentList.findIndex((x) => x.barcode === row.barcode)
          : currentList.findIndex((x) => x.name.toLowerCase() === row.name?.toLowerCase());

        if (existingIdx >= 0) {
          currentList[existingIdx] = {
            ...currentList[existingIdx],
            ...row,
            stock: currentList[existingIdx].stock + (row.stock || 0),
          };
          updatedCount++;
        } else {
          currentList.push({
            id: uid(),
            barcode: row.barcode || '',
            name: row.name || 'Unnamed Product',
            brand: row.brand || SAMPLE_BRANDS[0],
            category: row.category || SAMPLE_CATEGORIES[0],
            supplierName: row.supplierName || '',
            stock: row.stock || 0,
            buy: row.buy || 0,
            sell: row.sell || 0,
            mrp: row.mrp || 0,
            buyDate: row.buyDate || todayISO(),
            unit: row.unit || 'Pcs',
            expiry: row.expiry || '',
            low: row.low || 3,
            hsnCode: '3305',
            taxRate: 18,
          });
          addedCount++;
        }
      });
      return { ...d, inventory: currentList };
    });

    scheduleSave();
    cloudSave();
    setSearch('');
    setBrandFilter('');
    setCategoryFilter('');
    setActiveTab('products');
    toast(`Successfully imported ${addedCount} new and updated ${updatedCount} existing products!`);
    setImportModal(false);
    setParsedRows([]);
    setImportFileName('');
  };

  const tabs: { id: InventoryTab; label: string; count: number; icon: any }[] = [
    { id: 'products', label: 'Products & Stock Levels', count: filtered.length, icon: Package },
    { id: 'transactions', label: 'Stock In/Out Audit', count: inventoryTx.length, icon: History },
    { id: 'adjustments', label: 'Stock Adjustments & Usage', count: adjustments.length, icon: Scale },
    { id: 'lowstock', label: 'Low Stock Alerts', count: lowStockItems.length, icon: AlertTriangle },
    { id: 'expiring', label: 'Expiring / Expired Products', count: expiringItems.length, icon: Calendar },
  ];

  return (
    <div>
      {/* Top Valuation Metrics */}
      <motion.div
        className="stats-grid"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(5,66,74,.1)', color: '#05424A' }}>
            <Package size={20} />
          </div>
          <div className="stat-card-label">Total Inventory Units</div>
          <div className="stat-card-value">{valuationStats.totalStockCount}</div>
          <div className="stat-card-sub">{inventory.length} Product SKUs</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(35,163,109,.12)', color: '#23a36d' }}>
            <DollarSign size={20} />
          </div>
          <div className="stat-card-label">Total Stock Cost Value</div>
          <div className="stat-card-value">{money(valuationStats.totalCostValuation)}</div>
          <div className="stat-card-sub">Valued at Buy Rate (FIFO)</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(230,154,34,.12)', color: '#e69a22' }}>
            <Tag size={20} />
          </div>
          <div className="stat-card-label">Total Retail MRP Value</div>
          <div className="stat-card-value" style={{ color: 'var(--teal)' }}>
            {money(valuationStats.totalMrpValuation)}
          </div>
          <div className="stat-card-sub">Estimated Gross Revenue</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(217,48,37,.1)', color: '#d93025' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-card-label">Low Stock Warnings</div>
          <div className="stat-card-value" style={{ color: lowStockItems.length > 0 ? 'var(--red)' : 'var(--green)' }}>
            {lowStockItems.length}
          </div>
          <div className="stat-card-sub">Requires Re-order from Vendor</div>
        </motion.div>
      </motion.div>

      {/* Barcode Fast Scanner Bar */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--teal)' }}>
            <Barcode size={18} /> Fast Barcode Scan:
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <input
              type="text"
              className="input"
              placeholder="Scan with USB barcode laser gun or type barcode & press Enter…"
              value={barcodeScan}
              onChange={(e) => setBarcodeScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleBarcodeLookup();
                }
              }}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => handleBarcodeLookup()}>
            Find / Add
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCameraModalOpen(true)}>
            <Camera size={14} /> Camera Scan
          </button>
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, maxWidth: 500, alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="input"
              placeholder="Search product, barcode, brand, supplier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input"
            style={{ width: 170, padding: '7px 10px', fontSize: 12 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {SAMPLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(search || categoryFilter || brandFilter) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#dc2626', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setBrandFilter('');
              }}
            >
              🔄 Clear Filters
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => openAdjustment()} title="Stock Adjustment & Internal Salon Usage">
            <Scale size={14} /> Stock Adjustment
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setBarcodeLabelsModalOpen(true)} title="Generate Barcode Labels">
            <Printer size={14} /> Print Barcode Labels
          </button>
          {/* Bulk Add / Excel Upload Products Button */}
          <motion.button
            type="button"
            className="btn btn-secondary"
            onClick={openImportModal}
            whileTap={{ scale: 0.97 }}
            style={{
              fontSize: 12.5,
              padding: '6px 13px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              fontWeight: 700,
              borderRadius: 8,
              cursor: 'pointer',
            }}
            title="Upload Excel / CSV spreadsheet or Bulk Add Products"
          >
            <FileSpreadsheet size={15} /> Bulk Add / Excel Upload
          </motion.button>
          <button className="btn btn-ghost btn-sm" onClick={exportInventoryCSV} title="Export Inventory to CSV">
            <Download size={14} /> Export CSV
          </button>
          <motion.button className="btn btn-primary" onClick={() => openNew()} whileTap={{ scale: 0.97 }}>
            <Plus size={15} /> Add Product
          </motion.button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              <span className={`tab-badge ${tab.id === 'lowstock' && tab.count > 0 ? 'danger' : ''}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* Tab 1: Products Catalog */}
        {activeTab === 'products' && (
          <motion.div key="products" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card">
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <Package size={48} />
                  <h3>{search ? 'No matching products' : 'Inventory is empty'}</h3>
                  <p>Add products individually or upload via Excel/CSV spreadsheet.</p>
                  {!search && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => openNew()}>
                        <Plus size={14} /> Add Product
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setImportModal(true)}>
                        <Upload size={14} /> Bulk CSV Import
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product & Barcode</th>
                        <th>Category & Supplier</th>
                        <th>Stock Level</th>
                        <th>Pricing (Sell / MRP / Buy)</th>
                        <th>Expiry & Buy Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                      {filtered.map((item) => {
                        const isLow = Number(item.stock) <= Number(item.low);
                        const isExpired = item.expiry && item.expiry < today;
                        const isExpiringSoon =
                          item.expiry &&
                          !isExpired &&
                          item.expiry <= new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
                        return (
                          <motion.tr key={item.id} variants={fadeSlideUp} className={isLow ? 'low-stock-row' : ''}>
                            <td>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <span>{item.brand || 'Unbranded'}</span>
                                {item.barcode && (
                                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--teal)' }}>
                                    · [{item.barcode}]
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-teal" style={{ fontSize: 11 }}>
                                {item.category || 'General'}
                              </span>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                {item.supplierName || '—'}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 13.5,
                                    color: isLow ? 'var(--red)' : 'var(--text)',
                                  }}
                                >
                                  {item.stock} {item.unit || 'Pcs'}
                                </span>
                                {isLow && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: '#fee2e2',
                                      color: '#b91c1c',
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    LOW
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>
                                Sell: {money(item.sell)}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                MRP: {money(item.mrp || item.sell)} · Buy: {money(item.buy)}
                              </div>
                            </td>
                            <td>
                              <div>
                                {isExpired ? (
                                  <span className="tab-badge danger" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                                    Expired ({fmtDate(item.expiry)})
                                  </span>
                                ) : isExpiringSoon ? (
                                  <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 10.5, padding: '2px 6px', borderRadius: 99 }}>
                                    Exp: {fmtDate(item.expiry)}
                                  </span>
                                ) : item.expiry ? (
                                  <span style={{ fontSize: 11.5 }}>Exp: {fmtDate(item.expiry)}</span>
                                ) : (
                                  <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>No Expiry</span>
                                )}
                              </div>
                              {item.buyDate && (
                                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                                  Inward: {fmtDate(item.buyDate)}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ fontSize: 10.5, padding: '3px 6px', color: 'var(--teal)' }}
                                  title="Quick Inward Stock"
                                  onClick={() => openStockIn(item.id)}
                                >
                                  + Inward
                                </button>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ fontSize: 10.5, padding: '3px 6px' }}
                                  title="Stock Adjustment / Usage"
                                  onClick={() => openAdjustment(item.id)}
                                >
                                  <Scale size={11} />
                                </button>
                                <button className="btn-icon edit" onClick={() => openEdit(item)} title="Edit Product">
                                  <Pencil size={13} />
                                </button>
                                <button className="btn-icon danger" onClick={() => setDeleteId(item.id)} title="Delete">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </motion.tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 2: Transactions Audit */}
        {activeTab === 'transactions' && (
          <motion.div key="tx" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card">
              {inventoryTx.length === 0 ? (
                <div className="empty-state">
                  <History size={48} />
                  <h3>No stock movement history yet</h3>
                  <p>Inward stock purchases, sales deductions, and adjustments will be logged here.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Rate (₹)</th>
                        <th>Party / Supplier / Client</th>
                        <th>Batch / Expiry</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryTx.slice(0, 50).map((tx) => (
                        <tr key={tx.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(tx.date)}</td>
                          <td>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background:
                                  tx.type === 'Buy'
                                    ? '#f0fdf4'
                                    : tx.type === 'Sell'
                                    ? '#eff6ff'
                                    : tx.type === 'Salon Use'
                                    ? '#fef3c7'
                                    : '#fef2f2',
                                color:
                                  tx.type === 'Buy'
                                    ? '#15803d'
                                    : tx.type === 'Sell'
                                    ? '#1d4ed8'
                                    : tx.type === 'Salon Use'
                                    ? '#b45309'
                                    : '#b91c1c',
                              }}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{tx.product}</td>
                          <td style={{ fontWeight: 700 }}>{tx.qty}</td>
                          <td>{money(tx.rate)}</td>
                          <td>{tx.party || '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {tx.batch ? `Batch: ${tx.batch}` : ''} {tx.expiry ? `(Exp: ${fmtDate(tx.expiry)})` : ''}
                          </td>
                          <td>
                            <button
                              className="btn-icon danger"
                              onClick={() => handleDeleteTx(tx.id)}
                              title="Delete Transaction"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 3: Stock Adjustments History */}
        {activeTab === 'adjustments' && (
          <motion.div key="adjustments" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>⚖️ Stock Adjustment & Salon In-House Usage Log</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                    Track consumption for salon services, damaged testers, and physical count reconciliation.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => openAdjustment()}>
                  <Plus size={14} /> Record Adjustment
                </button>
              </div>

              {adjustments.length === 0 ? (
                <div className="empty-state">
                  <Scale size={44} />
                  <h3>No adjustments recorded yet</h3>
                  <p>Log in-house salon product usage, damaged cosmetic bottles, or inventory count fixes.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Action</th>
                        <th>Qty</th>
                        <th>Reason</th>
                        <th>Staff Responsible</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustments.map((a) => (
                        <tr key={a.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.date)}</td>
                          <td style={{ fontWeight: 700 }}>{a.productName}</td>
                          <td>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: a.type === 'Add' ? '#f0fdf4' : '#fef2f2',
                                color: a.type === 'Add' ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {a.type === 'Add' ? '+ Increase Stock' : '- Deduct Stock'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800 }}>{a.qty}</td>
                          <td>
                            <span className="badge badge-blue" style={{ fontSize: 11 }}>
                              {a.reason}
                            </span>
                          </td>
                          <td>{a.staff || '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{a.notes || '—'}</td>
                          <td>
                            <button
                              className="btn-icon danger"
                              onClick={() => handleDeleteAdjustment(a)}
                              title="Delete Adjustment & Revert Stock"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 4: Low Stock Alerts */}
        {activeTab === 'lowstock' && (
          <motion.div key="lowstock" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card">
              {lowStockItems.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={48} color="#16a34a" />
                  <h3 style={{ color: '#16a34a' }}>Inventory is Healthy!</h3>
                  <p>All product stocks are above their minimum threshold alert level.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product & Brand</th>
                        <th>Supplier</th>
                        <th>Current Stock</th>
                        <th>Min Alert Level</th>
                        <th>Buy Price (₹)</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700 }}>
                            <div>{item.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.brand}</div>
                          </td>
                          <td>{item.supplierName || '—'}</td>
                          <td>
                            <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 14 }}>
                              {item.stock} {item.unit || 'Pcs'}
                            </span>
                          </td>
                          <td>{item.low} {item.unit || 'Pcs'}</td>
                          <td>{money(item.buy)}</td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openStockIn(item.id)}
                            >
                              + Re-order Stock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 5: Expiring / Expired Products */}
        {activeTab === 'expiring' && (
          <motion.div key="expiring" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card">
              {expiringItems.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={48} color="#16a34a" />
                  <h3 style={{ color: '#16a34a' }}>No Expiring Products!</h3>
                  <p>All salon products have healthy expiry dates beyond 60 days.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Barcode</th>
                        <th>Product & Brand</th>
                        <th>Batch No</th>
                        <th>Expiry Date</th>
                        <th>Current Stock</th>
                        <th>Buy Rate (₹)</th>
                        <th>MRP (₹)</th>
                        <th>Supplier</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringItems.map((item) => {
                        const isExpired = item.expiry && item.expiry < today;
                        return (
                          <tr key={item.id} className={isExpired ? 'low-stock-row' : ''}>
                            <td style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{item.barcode || '—'}</td>
                            <td style={{ fontWeight: 700 }}>
                              <div>{item.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.brand}</div>
                            </td>
                            <td>{item.batch || '—'}</td>
                            <td>
                              {isExpired ? (
                                <span className="tab-badge danger" style={{ fontSize: 11, padding: '3px 8px' }}>
                                  Expired on {fmtDate(item.expiry)}
                                </span>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 11, padding: '3px 8px', borderRadius: 99 }}>
                                  Expiring {fmtDate(item.expiry)}
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 800, fontSize: 13.5 }}>
                                {item.stock} {item.unit || 'Pcs'}
                              </span>
                            </td>
                            <td>{money(item.buy)}</td>
                            <td>{item.mrp ? money(item.mrp) : money(item.sell)}</td>
                            <td>{item.supplierName || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => openAdjustment(item.id)}
                                  title="Mark as Expired in Stock Adjustment"
                                >
                                  Mark Disposed
                                </button>
                                <button className="btn-icon edit" onClick={() => openEdit(item)} title="Edit">
                                  <Pencil size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Adjustment Modal */}
      {adjustmentModalOpen && (
        <Modal
          isOpen={adjustmentModalOpen}
          onClose={() => setAdjustmentModalOpen(false)}
          title="⚖️ Stock Adjustment & In-House Salon Consumption"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setAdjustmentModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveAdjustment}>
                Save Adjustment
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Select Product to Adjust *</label>
              <select
                className="input"
                value={adjProductId}
                onChange={(e) => setAdjProductId(e.target.value)}
              >
                {inventory.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.brand}) — Stock: {i.stock} {i.unit || 'Pcs'} [Barcode: {i.barcode || 'N/A'}]
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Adjustment Action</label>
              <select
                className="input"
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as 'Add' | 'Reduce')}
              >
                <option value="Reduce">- Deduct / Consume Stock</option>
                <option value="Add">+ Add / Found Extra Stock</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Quantity *</label>
              <input
                type="number"
                min={1}
                className="input"
                placeholder="Qty to adjust (e.g. 2)"
                value={adjQty}
                onChange={(e) => setAdjQty(Number(e.target.value) || '')}
              />
            </div>

            <div className="form-group">
              <label className="label">Reason for Adjustment</label>
              <select
                className="input"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value as AdjustmentReason)}
              >
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Staff / Beautician Responsible</label>
              <select
                className="input"
                value={adjStaff}
                onChange={(e) => setAdjStaff(e.target.value)}
              >
                <option value="">None / General</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Notes / Service Details</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Used for Deluxe Hair Spa client service"
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? '✎ Edit Product Details' : '📦 Add New Product'}
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleSubmit(onSubmit)} whileTap={{ scale: 0.97 }}>
              {editId ? 'Update Product' : 'Save Product'}
            </motion.button>
          </>
        }
      >
        <div className="form-grid">
          {/* Barcode with Auto-Generator */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label className="label" style={{ margin: 0 }}>Barcode (EAN-13 / Code128)</label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '2px 7px' }}
                onClick={generateBarcode}
              >
                <Sparkles size={12} color="var(--teal)" /> Auto-Generate
              </button>
            </div>
            <input
              type="text"
              className="input"
              placeholder="Scan laser barcode or click Auto-Generate"
              {...register('barcode')}
            />
          </div>

          <div className="form-group">
            <label className="label">Product Name *</label>
            <input
              type="text"
              className={`input ${errors.name ? 'error' : ''}`}
              placeholder="e.g. L'Oreal Xtenso Care Shampoo 250ml"
              {...register('name', { required: 'Product name is required' })}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Brand</label>
            <input
              type="text"
              className="input"
              list="brand-list"
              placeholder="e.g. L'Oreal Professionnel"
              {...register('brand')}
            />
            <datalist id="brand-list">
              {SAMPLE_BRANDS.map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>

          <div className="form-group">
            <label className="label">Category</label>
            <select className="input" {...register('category')}>
              {SAMPLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Primary Supplier</label>
            <select className="input" {...register('supplierId')}>
              <option value="">Direct / Local Purchase</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">HSN / SAC Code</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 3305 (Hair Preparations)"
              {...register('hsnCode')}
            />
          </div>

          <div className="form-group">
            <label className="label">GST Tax Rate (%)</label>
            <select className="input" {...register('taxRate', { valueAsNumber: true })}>
              {GST_TAX_RATES.map((t) => (
                <option key={t} value={t}>{t}% GST</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Initial Stock Quantity</label>
            <input
              type="number"
              min={0}
              className="input"
              placeholder="e.g. 12"
              {...register('stock', { valueAsNumber: true })}
            />
          </div>

          <div className="form-group">
            <label className="label">Unit of Measure</label>
            <select className="input" {...register('unit')}>
              <option value="Pcs">Pcs (Pieces)</option>
              <option value="Bottle">Bottle</option>
              <option value="Kit">Kit</option>
              <option value="Box">Box</option>
              <option value="Pack">Pack</option>
              <option value="Tube">Tube</option>
              <option value="Jar">Jar</option>
              <option value="Kg">Kg</option>
              <option value="Ml">Ml</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Buy Cost Rate (₹)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className="input"
              placeholder="₹ Buy cost (e.g. 350)"
              {...register('buy', { valueAsNumber: true })}
            />
          </div>

          <div className="form-group">
            <label className="label">Sell Rate (₹)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className="input"
              placeholder="₹ Studio sell price (e.g. 500)"
              {...register('sell', { valueAsNumber: true })}
            />
          </div>

          <div className="form-group">
            <label className="label">Maximum Retail Price - MRP (₹)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className="input"
              placeholder="₹ MRP printed on package (e.g. 550)"
              {...register('mrp', { valueAsNumber: true })}
            />
          </div>

          <div className="form-group">
            <label className="label">Low Stock Alert Level</label>
            <input
              type="number"
              min={1}
              className="input"
              placeholder="Alert minimum (e.g. 3)"
              {...register('low', { valueAsNumber: true })}
            />
          </div>

          <div className="form-group">
            <label className="label">Batch Number</label>
            <input type="text" className="input" placeholder="e.g. B-01 / LOT-492" {...register('batch')} />
          </div>

          <div className="form-group">
            <label className="label">Buy / Purchase Date</label>
            <input type="date" className="input" {...register('buyDate')} />
          </div>

          <div className="form-group">
            <label className="label">Expiry Date</label>
            <input type="date" className="input" {...register('expiry')} />
          </div>
        </div>
      </Modal>

      {/* Quick Inward Stock Modal */}
      <Modal
        isOpen={stockModal}
        onClose={() => setStockModal(false)}
        title="📥 Inward Stock Addition"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setStockModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleStockIn}>
              Add to Stock
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Quantity to Add</label>
            <input
              type="number"
              min={1}
              className="input"
              value={stockQty}
              onChange={(e) => setStockQty(Number(e.target.value))}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="label">Purchase Rate (₹)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={stockRate}
              onChange={(e) => setStockRate(Number(e.target.value))}
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Supplier / Source</label>
            <input
              type="text"
              className="input"
              value={stockParty}
              onChange={(e) => setStockParty(e.target.value)}
              placeholder="e.g. Surat Cosmetics Hub"
            />
          </div>
          <div className="form-group">
            <label className="label">Batch No</label>
            <input
              type="text"
              className="input"
              value={stockBatch}
              onChange={(e) => setStockBatch(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Expiry Date</label>
            <input
              type="date"
              className="input"
              value={stockExpiry}
              onChange={(e) => setStockExpiry(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ⚡ Bulk Add & Excel Upload Products Modal */}
      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="⚡ Bulk Add & Excel Sheet Product Upload"
        wide
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button
              className="btn btn-ghost"
              onClick={downloadSampleExcelTemplate}
              title="Download sample Excel / CSV import template"
              style={{ color: 'var(--teal)', fontWeight: 600 }}
            >
              <Download size={14} /> Download Sample Excel Template
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setImportModal(false)}>Cancel</button>
              {bulkImportTab === 'excel' && (
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmImport}
                  disabled={parsedRows.length === 0}
                >
                  <Upload size={14} /> Import {parsedRows.length} Products
                </button>
              )}
              {bulkImportTab === 'table' && (
                <button className="btn btn-primary" onClick={handleSaveBulkProductTable}>
                  <Sparkles size={14} /> Add {bulkProductRows.filter(r => r.name.trim() !== '' && Number(r.sell) > 0).length} Products
                </button>
              )}
              {bulkImportTab === 'presets' && (
                <button className="btn btn-primary" onClick={handleSaveBulkPresets}>
                  <Sparkles size={14} /> Import Selected Packages
                </button>
              )}
              {bulkImportTab === 'paste' && (
                <button className="btn btn-primary" onClick={handleSaveBulkPaste}>
                  <Upload size={14} /> Parse & Add Products
                </button>
              )}
            </div>
          </div>
        }
      >
        {/* Sub Tabs inside Modal */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`tab-btn ${bulkImportTab === 'excel' ? 'active' : ''}`}
            onClick={() => setBulkImportTab('excel')}
          >
            <FileSpreadsheet size={14} /> <span>Excel / CSV File Upload</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${bulkImportTab === 'table' ? 'active' : ''}`}
            onClick={() => setBulkImportTab('table')}
          >
            <List size={14} /> <span>Interactive Grid Table</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${bulkImportTab === 'presets' ? 'active' : ''}`}
            onClick={() => setBulkImportTab('presets')}
          >
            <Sparkles size={14} /> <span>1-Click Salon Packages</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${bulkImportTab === 'paste' ? 'active' : ''}`}
            onClick={() => setBulkImportTab('paste')}
          >
            <Upload size={14} /> <span>Paste Excel Text</span>
          </button>
        </div>

        {/* Tab 1: Excel / CSV File Upload */}
        {bulkImportTab === 'excel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <FileSpreadsheet size={40} color="var(--teal)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                {importFileName ? `Selected: ${importFileName}` : 'Click or Drag & Drop Excel / CSV file here'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Supports all columns: Barcode, Product Name, Brand, Category, Supplier, Stock Qty, Buy Price (₹), Sell Price (₹), MRP (₹), Buy Date, Expiry Date, Unit, Low Stock Alert
              </div>
            </div>

            {parsedRows.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--teal)' }}>
                  Preview Parsed Rows ({parsedRows.length} items ready to import):
                </div>
                <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Barcode</th>
                        <th>Product Name</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Buy (₹)</th>
                        <th>Sell (₹)</th>
                        <th>MRP (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r, idx) => (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'monospace' }}>{r.barcode || '—'}</td>
                          <td style={{ fontWeight: 700 }}>{r.name}</td>
                          <td>{r.brand}</td>
                          <td>{r.category}</td>
                          <td>{r.stock} {r.unit}</td>
                          <td>{money(r.buy || 0)}</td>
                          <td>{money(r.sell || 0)}</td>
                          <td>{money(r.mrp || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Interactive Grid Table */}
        {bulkImportTab === 'table' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
                Type multiple inventory products in the table below and save all at once.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={addBulkProductRow}
                style={{ color: 'var(--teal)', fontWeight: 700 }}
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Barcode</th>
                    <th style={{ width: '25%' }}>Product Name *</th>
                    <th style={{ width: '18%' }}>Category</th>
                    <th style={{ width: '10%' }}>Stock</th>
                    <th style={{ width: '11%' }}>Buy (₹)</th>
                    <th style={{ width: '11%' }}>Sell (₹) *</th>
                    <th style={{ width: '7%', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkProductRows.map((row, idx) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="text"
                          className="input"
                          placeholder="Auto / Code…"
                          value={row.barcode}
                          onChange={(e) => updateBulkProductRow(row.id, 'barcode', e.target.value)}
                          style={{ fontFamily: 'monospace', fontSize: 11.5 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input"
                          placeholder={`Product #${idx + 1} name…`}
                          value={row.name}
                          onChange={(e) => updateBulkProductRow(row.id, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          value={row.category}
                          onChange={(e) => updateBulkProductRow(row.id, 'category', e.target.value)}
                          style={{ fontSize: 11.5 }}
                        >
                          {SAMPLE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="10"
                          value={row.stock}
                          onChange={(e) => updateBulkProductRow(row.id, 'stock', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="500"
                          value={row.buy}
                          onChange={(e) => updateBulkProductRow(row.id, 'buy', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="750"
                          value={row.sell}
                          onChange={(e) => updateBulkProductRow(row.id, 'sell', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-icon danger"
                          title="Remove Row"
                          onClick={() => removeBulkProductRow(row.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={addBulkProductRow}
                style={{ fontSize: 12 }}
              >
                <Plus size={13} /> + Add Another Row
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {bulkProductRows.filter(r => r.name.trim() !== '' && Number(r.sell) > 0).length} valid rows to add
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: 1-Click Salon Product Packages */}
        {bulkImportTab === 'presets' && (
          <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
              Select pre-built popular professional salon products to import instantly into your stock.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SALON_PRESET_PRODUCT_PACKAGES.map((pack) => (
                <div key={pack.title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{pack.title}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{pack.category}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {pack.products.map((p) => {
                      const key = `${pack.category}___${p.name}`;
                      const isChecked = !!selectedPresetProducts[key];
                      const alreadyExists = (data?.inventory || []).some((ex) => ex.name.toLowerCase() === p.name.toLowerCase());

                      return (
                        <div
                          key={p.name}
                          onClick={() => setSelectedPresetProducts((prev) => ({ ...prev, [key]: !prev[key] }))}
                          style={{
                            background: isChecked ? '#f0fdf4' : '#ffffff',
                            border: isChecked ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                            borderRadius: 8,
                            padding: 10,
                            cursor: 'pointer',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ color: isChecked ? '#16a34a' : '#94a3b8' }}>
                            {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                              {p.name}
                              {alreadyExists && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>Already Added</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                              Sell: ₹{p.sell} • Buy: ₹{p.buy} • Initial Stock: {p.stock} {p.unit}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Paste Excel Text */}
        {bulkImportTab === 'paste' && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
              Paste lines of text copied directly from Excel or Google Sheets. Format: <code>Product Name, Sell Price (₹), Buy Price (₹), Stock Qty, Category, Brand</code>
            </p>
            <textarea
              className="input"
              rows={8}
              placeholder={`Example:\nL'Oreal Vitamino Color Shampoo 1500ml, 1650, 1250, 10, Hair Care & Shampoo, L'Oreal\nMatrix Hair Spa 500g, 850, 650, 12, Hair Care & Shampoo, Matrix\nO3+ Gold Facial Kit 500g, 2400, 1800, 8, Skin Care & Facials, O3+`}
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5 }}
            />
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)' }}>
              💡 <b>Tip:</b> You can copy columns directly from Excel or Google Sheets and paste them here!
            </div>
          </div>
        )}
      </Modal>

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScanner
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onScan={(scannedBarcode) => {
          handleBarcodeLookup(scannedBarcode);
        }}
      />

      {/* Barcode Label Sheet Generator Modal */}
      <BarcodeLabelSheet
        isOpen={barcodeLabelsModalOpen}
        onClose={() => setBarcodeLabelsModalOpen(false)}
        items={inventory}
        salonName={data?.settings?.salon}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="Delete Product?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </>
          }
        >
          <p>Are you sure you want to remove this product from your inventory?</p>
        </Modal>
      )}
    </div>
  );
}
