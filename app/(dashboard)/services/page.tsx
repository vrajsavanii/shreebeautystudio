'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Plus,
  Search,
  Clock,
  DollarSign,
  Tag,
  Pencil,
  Trash2,
  Receipt,
  Calendar,
  Layers,
  LayoutGrid,
  List,
  Share2,
  Printer,
  Copy,
  Check,
  MessageCircle,
  Zap,
  FileSpreadsheet,
  Upload,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, money } from '@/lib/utils';
import { openWA } from '@/lib/whatsapp';
import { Service } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';

const DEFAULT_CATEGORIES = [
  'Hair Care & Styling',
  'Skin Care & Facials',
  'Waxing & Threading',
  'Hands, Feet & Nails',
  'Makeup & Bridal',
  'Body Spa & Bleach',
  'Other Treatments',
];

const SALON_PRESET_PACKAGES = [
  {
    title: '💇 Hair Care & Styling Pack',
    category: 'Hair Care & Styling',
    services: [
      { name: 'Hair Cut & Style', price: 350, duration: 30, description: 'Hair wash, cut & blowdry styling' },
      { name: 'Hair Spa Treatment', price: 850, duration: 45, description: 'Deep nourishing hair spa mask' },
      { name: 'Keratin Smooth Treatment', price: 3500, duration: 120, description: 'Frizz control & hair smoothing' },
      { name: 'Root Touchup / Gray Coverage', price: 1200, duration: 60, description: 'L\'Oreal professional root color' },
      { name: 'Global Hair Coloring', price: 2800, duration: 90, description: 'Full length global hair color' },
      { name: 'Hair Rebonding / Smoothening', price: 4200, duration: 150, description: 'Permanent hair straightening' },
    ],
  },
  {
    title: '💆 Skin Care & Facials Pack',
    category: 'Skin Care & Facials',
    services: [
      { name: 'Herbal Deep Cleanup', price: 450, duration: 30, description: 'Deep cleansing & exfoliation' },
      { name: 'Fruit Glow Facial', price: 850, duration: 45, description: 'Natural fruit extract facial' },
      { name: 'Gold Radiance Facial', price: 1500, duration: 60, description: '24K gold foil glow facial' },
      { name: 'Diamond Insta-Glow Facial', price: 2200, duration: 60, description: 'Skin brightening diamond facial' },
      { name: 'O3+ Advanced D-Tan Facial', price: 2500, duration: 60, description: 'Sun tan removal & hydration' },
      { name: 'Full Face Bleach & Pack', price: 350, duration: 25, description: 'Insta bleach with cooling face pack' },
    ],
  },
  {
    title: '🦵 Waxing & Threading Pack',
    category: 'Waxing & Threading',
    services: [
      { name: 'Eyebrow & Upper Lip Threading', price: 80, duration: 15, description: 'Precision threading shaping' },
      { name: 'Full Arms + Underarms Rica Wax', price: 650, duration: 30, description: 'Rica peel-off wax for sensitive skin' },
      { name: 'Full Legs Honey Wax', price: 550, duration: 30, description: 'Smooth legs waxing' },
      { name: 'Full Body Waxing Package', price: 1800, duration: 90, description: 'Full body smooth waxing' },
    ],
  },
  {
    title: '💅 Hands, Feet & Nails Pack',
    category: 'Hands, Feet & Nails',
    services: [
      { name: 'Classic Pedicure', price: 550, duration: 40, description: 'Relaxing foot soak, scrub & polish' },
      { name: 'Spa Manicure & Pedicure Combo', price: 1100, duration: 60, description: 'Deluxe spa hands & feet treatment' },
      { name: 'Gel Polish Application', price: 650, duration: 45, description: 'Long-lasting UV gel nail color' },
      { name: 'Acrylic Nail Extensions Set', price: 1800, duration: 90, description: 'Full set acrylic extensions' },
    ],
  },
  {
    title: '👰 Makeup & Bridal Pack',
    category: 'Makeup & Bridal',
    services: [
      { name: 'HD Party Makeup', price: 2500, duration: 60, description: 'Glam party makeup with lashes' },
      { name: 'Airbrush Engagement Makeup', price: 6500, duration: 120, description: 'Flawless airbrush finish' },
      { name: 'Royal Bridal HD Makeup Package', price: 12500, duration: 180, description: 'Complete bridal look with hair & saree' },
      { name: 'Saree / Dupatta Draping', price: 350, duration: 20, description: 'Professional saree pleating & draping' },
    ],
  },
];

export default function ServicesPage() {
  const router = useRouter();
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rateCardModal, setRateCardModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bulk Add Services Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<'table' | 'presets' | 'csv'>('table');
  const [bulkRows, setBulkRows] = useState<Array<{ id: string; name: string; category: string; price: number | ''; duration: number | ''; description: string }>>([
    { id: '1', name: '', category: 'Hair Care & Styling', price: '', duration: 45, description: '' },
    { id: '2', name: '', category: 'Skin Care & Facials', price: '', duration: 45, description: '' },
    { id: '3', name: '', category: 'Waxing & Threading', price: '', duration: 30, description: '' },
  ]);
  const [selectedPresetServices, setSelectedPresetServices] = useState<Record<string, boolean>>({});
  const [csvInput, setCsvInput] = useState('');

  const services = useMemo(() => data?.services || [], [data?.services]);
  const salonName = data?.settings?.salon || 'Shree Beauty Studio';
  const salonPhone = data?.settings?.whatsapp || '';
  const salonAddress = data?.settings?.address || '';

  // Extract all categories dynamically
  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [services]);

  const openBulkModal = () => {
    // Pre-fill default selected state for presets
    const initialPresetState: Record<string, boolean> = {};
    SALON_PRESET_PACKAGES.forEach((pack) => {
      pack.services.forEach((s) => {
        const key = `${pack.category}___${s.name}`;
        // Default check if service not already in catalog
        const exists = (data?.services || []).some((ex) => ex.name.toLowerCase() === s.name.toLowerCase());
        initialPresetState[key] = !exists;
      });
    });
    setSelectedPresetServices(initialPresetState);
    setBulkModalOpen(true);
  };

  const addBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      { id: uid(), name: '', category: 'Hair Care & Styling', price: '', duration: 45, description: '' },
    ]);
  };

  const removeBulkRow = (id: string) => {
    setBulkRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateBulkRow = (id: string, field: string, val: any) => {
    setBulkRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleSaveBulkTable = () => {
    const valid = bulkRows
      .filter((r) => r.name.trim() !== '' && Number(r.price) > 0)
      .map((r) => ({
        id: uid(),
        name: r.name.trim(),
        category: r.category.trim() || 'General',
        price: Number(r.price),
        duration: Number(r.duration || 45),
        description: r.description.trim(),
      }));

    if (valid.length === 0) {
      toast('Please enter at least one valid service with a name and price > ₹0', 'error');
      return;
    }

    updateData((d) => ({
      ...d,
      services: [...valid, ...(d.services || [])],
    }));

    scheduleSave();
    toast(`🎉 Successfully added ${valid.length} new services to salon menu!`);
    setBulkModalOpen(false);
  };

  const handleSaveBulkPresets = () => {
    const toImport: Service[] = [];
    SALON_PRESET_PACKAGES.forEach((pack) => {
      pack.services.forEach((s) => {
        const key = `${pack.category}___${s.name}`;
        if (selectedPresetServices[key]) {
          toImport.push({
            id: uid(),
            name: s.name,
            category: pack.category,
            price: s.price,
            duration: s.duration,
            description: s.description,
          });
        }
      });
    });

    if (toImport.length === 0) {
      toast('Please select at least one preset service to import', 'error');
      return;
    }

    updateData((d) => ({
      ...d,
      services: [...toImport, ...(d.services || [])],
    }));

    scheduleSave();
    toast(`🎉 Successfully imported ${toImport.length} package services!`);
    setBulkModalOpen(false);
  };

  const handleSaveBulkCsv = () => {
    if (!csvInput.trim()) {
      toast('Please paste CSV text or service lines first', 'error');
      return;
    }

    const lines = csvInput.split('\n').filter((l) => l.trim().length > 0);
    const parsed: Service[] = [];

    lines.forEach((line) => {
      const parts = line.split(/,|\t/).map((p) => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const price = Number(parts[1].replace(/[^0-9.]/g, ''));
        const category = parts[2] || 'Hair Care & Styling';
        const duration = Number(parts[3] || 45);

        if (name && price > 0) {
          parsed.push({
            id: uid(),
            name,
            price,
            category,
            duration: duration > 0 ? duration : 45,
          });
        }
      }
    });

    if (parsed.length === 0) {
      toast('Could not parse any valid service lines. Format: Name, Price, Category, Duration', 'error');
      return;
    }

    updateData((d) => ({
      ...d,
      services: [...parsed, ...(d.services || [])],
    }));

    scheduleSave();
    toast(`🎉 Successfully parsed & added ${parsed.length} services from CSV!`);
    setBulkModalOpen(false);
    setCsvInput('');
  };

  // KPI Metrics
  const stats = useMemo(() => {
    const totalCount = services.length;
    const totalRevenuePotential = services.reduce((s, i) => s + Number(i.price || 0), 0);
    const avgPrice = totalCount > 0 ? Math.round(totalRevenuePotential / totalCount) : 0;
    const expressCount = services.filter((s) => Number(s.duration || 0) <= 30).length;
    const categoriesCount = new Set(services.map((s) => s.category || 'General')).size;

    return {
      totalCount,
      categoriesCount,
      avgPrice,
      expressCount,
    };
  }, [services]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: services.length };
    categories.forEach((c) => (map[c] = 0));
    services.forEach((s) => {
      const cat = s.category || 'Other Treatments';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [services, categories]);

  // Filtered Services
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return services.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        String(s.price).includes(q);

      if (!matchesSearch) return false;
      if (activeCategory === 'all') return true;
      return (s.category || 'Other Treatments') === activeCategory;
    });
  }, [services, search, activeCategory]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Service>({
    defaultValues: {
      id: '',
      name: '',
      category: 'Hair Care & Styling',
      price: '' as any,
      duration: 45,
      description: '',
    },
  });

  const openNew = () => {
    setEditId(null);
    reset({
      id: '',
      name: '',
      category: activeCategory !== 'all' ? activeCategory : 'Hair Care & Styling',
      price: '' as any,
      duration: 45,
      description: '',
    });
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditId(s.id);
    reset({
      id: s.id,
      name: s.name,
      category: s.category || 'Hair Care & Styling',
      price: s.price,
      duration: s.duration || 45,
      description: s.description || '',
    });
    setModalOpen(true);
  };

  const onSubmit = (form: Service) => {
    const numPrice = Number(form.price || 0);
    const numDuration = Number(form.duration || 30);

    if (!form.name.trim()) {
      toast('Please enter a service name', 'error');
      return;
    }

    if (numPrice <= 0) {
      toast('Please enter a valid price', 'error');
      return;
    }

    if (editId) {
      updateData((d) => ({
        ...d,
        services: (d.services || []).map((s) =>
          s.id === editId
            ? {
                ...s,
                name: form.name.trim(),
                category: form.category?.trim() || 'General',
                price: numPrice,
                duration: numDuration,
                description: form.description?.trim() || '',
              }
            : s
        ),
      }));
      scheduleSave();
      toast(`Service "${form.name}" updated successfully!`);
      setEditId(null);
      setModalOpen(false);
      return;
    }

    const newService: Service = {
      id: uid(),
      name: form.name.trim(),
      category: form.category?.trim() || 'General',
      price: numPrice,
      duration: numDuration,
      description: form.description?.trim() || '',
    };

    updateData((d) => ({
      ...d,
      services: [newService, ...(d.services || [])],
    }));

    scheduleSave();
    toast(`✨ Service "${form.name}" added to salon menu!`);
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const sName = services.find((s) => s.id === id)?.name;
    updateData((d) => ({
      ...d,
      services: (d.services || []).filter((s) => s.id !== id),
    }));
    scheduleSave();
    toast(`Service "${sName || ''}" deleted from catalog.`, 'info');
    setDeleteId(null);
  };

  // Quick Action Shortcuts
  const handleQuickBill = (s: Service) => {
    toast(`Opening POS billing for ${s.name}…`);
    router.push('/billing');
  };

  const handleQuickBook = (s: Service) => {
    toast(`Opening appointments for ${s.name}…`);
    router.push('/appointments');
  };

  // WhatsApp Rate Card Text Formatter
  const rateCardText = useMemo(() => {
    let msg = `✨ *${salonName.toUpperCase()} — SERVICES & RATE CARD* ✨\n`;
    if (salonAddress) msg += `📍 ${salonAddress}\n`;
    if (salonPhone) msg += `📞 Booking WhatsApp: +${salonPhone}\n`;
    msg += `────────────────────────────\n\n`;

    const grouped: Record<string, Service[]> = {};
    services.forEach((s) => {
      const cat = s.category || 'General Services';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });

    Object.entries(grouped).forEach(([cat, list]) => {
      msg += `🏷️ *${cat.toUpperCase()}*\n`;
      list.forEach((s) => {
        msg += `• *${s.name}* — ₹${s.price} (${s.duration || 45} mins)\n`;
        if (s.description) msg += `  _${s.description}_\n`;
      });
      msg += `\n`;
    });

    msg += `────────────────────────────\n`;
    msg += `💖 *Thank you for choosing ${salonName}!*`;
    return msg;
  }, [services, salonName, salonAddress, salonPhone]);

  const handleCopyRateCard = () => {
    navigator.clipboard.writeText(rateCardText);
    setCopied(true);
    toast('📋 Full Price Menu copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div>
      {/* Top Header & Toolbar */}
      <div className="toolbar" style={{ justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="toolbar-title">💇 Salon Services & Rate Card</div>
          <span className="badge badge-teal" style={{ fontSize: 11.5 }}>
            {services.length} Total Treatments
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              background: '#e2e8f0',
              padding: 2,
              borderRadius: 8,
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                color: viewMode === 'cards' ? 'var(--teal)' : 'var(--muted)',
                boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <LayoutGrid size={13} /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? 'var(--teal)' : 'var(--muted)',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <List size={13} /> Table
            </button>
          </div>

          {/* Rate Card WhatsApp Share */}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '7px 12px' }}
            onClick={() => setRateCardModal(true)}
            title="Share or copy salon price rate card"
          >
            <Share2 size={13} /> Rate Card
          </button>

          {/* Print Menu */}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '7px 12px' }}
            onClick={() => window.print()}
            title="Print Services Price List"
          >
            <Printer size={13} /> Print
          </button>

          {/* Bulk Add Services Button */}
          <motion.button
            type="button"
            className="btn btn-secondary"
            onClick={openBulkModal}
            whileTap={{ scale: 0.97 }}
            style={{
              fontSize: 12.5,
              padding: '7.5px 14px',
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
          >
            <Layers size={14} /> Bulk Add Services
          </motion.button>

          {/* Add Service Button */}
          <motion.button
            className="btn btn-primary"
            onClick={openNew}
            whileTap={{ scale: 0.97 }}
            style={{ fontSize: 12.5, padding: '7.5px 14px' }}
          >
            <Plus size={14} /> Add Service
          </motion.button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <motion.div
        className="stats-grid"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(5, 66, 74, 0.1)', color: 'var(--teal)' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div className="stat-card-label">Active Services</div>
            <div className="stat-card-value" style={{ color: 'var(--teal)' }}>
              {stats.totalCount}
            </div>
            <div className="stat-card-sub">In salon treatment menu</div>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(234, 186, 56, 0.15)', color: '#b45309' }}>
            <Layers size={20} />
          </div>
          <div>
            <div className="stat-card-label">Service Categories</div>
            <div className="stat-card-value">{stats.categoriesCount}</div>
            <div className="stat-card-sub">Hair, skin, makeup, nails, spa</div>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: 'var(--green)' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div className="stat-card-label">Average Price</div>
            <div className="stat-card-value" style={{ color: 'var(--green)' }}>
              {money(stats.avgPrice)}
            </div>
            <div className="stat-card-sub">Per treatment session</div>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--blue)' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-card-label">Express Treatments</div>
            <div className="stat-card-value" style={{ color: 'var(--blue)' }}>
              {stats.expressCount}
            </div>
            <div className="stat-card-sub">Quick 15–30 min services</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Search & Category Filter Bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 260 }}>
          <Search size={14} className="search-icon" />
          <input
            type="search"
            className="input"
            placeholder="Search service name, category, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Static Category Tabs (No Horizontal Scroll) */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <span>All Services</span>
          <span className="tab-badge">{categoryCounts.all}</span>
        </button>

        {categories.map((cat) => {
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              type="button"
              className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              <span>{cat}</span>
              <span className="tab-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Services Content: Grid Cards or Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Sparkles size={44} />
            <h3>{search ? 'No matching services found' : 'No services in this category'}</h3>
            <p>Add treatment services to your salon price menu with customizable duration and rates.</p>
            {!search && (
              <motion.button className="btn btn-primary btn-sm" onClick={openNew} whileTap={{ scale: 0.97 }} style={{ marginTop: 8 }}>
                <Plus size={14} /> Add First Service
              </motion.button>
            )}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Luxury Cards Grid */
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}
        >
          {filtered.map((s) => (
            <motion.div
              key={s.id}
              variants={fadeSlideUp}
              className="card"
              style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.18s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span className="badge badge-teal" style={{ fontSize: 10.5 }}>
                    {s.category || 'General'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>
                    <Clock size={11} /> {s.duration || 45} min
                  </div>
                </div>

                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', margin: '4px 0 2px' }}>
                  {s.name}
                </h3>

                {s.description && (
                  <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.4 }}>
                    {s.description}
                  </p>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Treatment Fee:</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>
                    {money(s.price)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: 11, padding: '4px 8px', color: 'var(--teal)', borderColor: 'var(--teal-subtle)' }}
                      title="Quick Bill in POS"
                      onClick={() => handleQuickBill(s)}
                    >
                      <Zap size={11} /> Bill
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: 11, padding: '4px 8px', color: 'var(--blue)' }}
                      title="Book Appointment"
                      onClick={() => handleQuickBook(s)}
                    >
                      <Calendar size={11} /> Book
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-icon edit" onClick={() => openEdit(s)} title="Edit Service">
                      <Pencil size={13} />
                    </button>
                    <button className="btn-icon danger" onClick={() => setDeleteId(s.id)} title="Delete Service">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* High Density Table View (Zero Horizontal Scroll) */
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Treatment Service</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Rate / Price (₹)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                {filtered.map((s) => (
                  <motion.tr key={s.id} variants={fadeSlideUp}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>
                        {s.name}
                      </div>
                      {s.description && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {s.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-teal" style={{ fontSize: 11 }}>
                        {s.category || 'General'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
                        <Clock size={12} /> {s.duration || 45} min
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--teal)' }}>
                        {money(s.price)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: 10.5, padding: '3px 7px', color: 'var(--teal)' }}
                          title="Quick Bill in POS"
                          onClick={() => handleQuickBill(s)}
                        >
                          <Zap size={11} /> Bill
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: 10.5, padding: '3px 7px', color: 'var(--blue)' }}
                          title="Book Appointment"
                          onClick={() => handleQuickBook(s)}
                        >
                          <Calendar size={11} /> Book
                        </button>
                        <button className="btn-icon edit" onClick={() => openEdit(s)} title="Edit Service">
                          <Pencil size={13} />
                        </button>
                        <button className="btn-icon danger" onClick={() => setDeleteId(s.id)} title="Delete Service">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? '✎ Edit Salon Service' : '✨ Add New Treatment Service'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleSubmit(onSubmit)} whileTap={{ scale: 0.97 }}>
              {editId ? 'Update Service' : 'Save Service to Menu'}
            </motion.button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Service / Treatment Name *</label>
            <input
              type="text"
              className={`input ${errors.name ? 'error' : ''}`}
              placeholder="e.g. Hydra Deep Cleanse Facial / Hair Spa & Scalp Detox"
              {...register('name', { required: 'Service name is required' })}
              autoFocus
            />
            {errors.name && <span className="error-msg">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="label">Category *</label>
            <select className="input" {...register('category')}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Price (₹) *</label>
            <input
              type="number"
              min="0"
              className={`input ${errors.price ? 'error' : ''}`}
              placeholder="e.g. 1200"
              {...register('price', { required: 'Price is required' })}
            />
            {errors.price && <span className="error-msg">{errors.price.message}</span>}
          </div>

          <div className="form-group">
            <label className="label">Duration (Minutes)</label>
            <input
              type="number"
              min="5"
              step="5"
              className="input"
              placeholder="45"
              {...register('duration')}
            />
          </div>

          <div className="form-group">
            <label className="label">Quick Presets</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[15, 30, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => setValue('duration', mins)}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Service Description / Inclusions (Optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g. Includes hair wash, deep conditioning massage, serum finish and basic blow dry."
              {...register('description')}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="🗑️ Delete Salon Service"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>
                Delete Service
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13.5, margin: '0 0 6px' }}>
            Are you sure you want to remove{' '}
            <b>{services.find((s) => s.id === deleteId)?.name}</b> from your salon treatment menu?
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            💡 Existing past invoices and appointments with this service will remain recorded.
          </p>
        </Modal>
      )}

      {/* Rate Card WhatsApp Share Modal */}
      <Modal
        isOpen={rateCardModal}
        onClose={() => setRateCardModal(false)}
        title="📱 WhatsApp Rate Card & Menu"
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setRateCardModal(false)}>Close</button>
            <button className="btn btn-ghost" onClick={handleCopyRateCard} style={{ color: 'var(--teal)' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              className="btn btn-primary"
              style={{ background: '#16a34a', borderColor: '#16a34a' }}
              onClick={() => openWA('', rateCardText)}
            >
              <MessageCircle size={14} /> Share on WhatsApp
            </button>
          </>
        }
      >
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
          Preview and share your categorized treatment price list directly with clients on WhatsApp or social media.
        </p>

        <div
          style={{
            background: '#0f172a',
            color: '#e2e8f0',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: 16,
            borderRadius: 10,
            whiteSpace: 'pre-wrap',
            maxHeight: 360,
            overflowY: 'auto',
            lineHeight: 1.6,
          }}
        >
          {rateCardText}
        </div>
      </Modal>

      {/* ⚡ Bulk Add Services Modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="⚡ Bulk Add & Import Salon Services"
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setBulkModalOpen(false)}>Cancel</button>
            {bulkTab === 'table' && (
              <button className="btn btn-primary" onClick={handleSaveBulkTable}>
                <Sparkles size={14} /> Add {bulkRows.filter(r => r.name.trim() !== '' && Number(r.price) > 0).length} Services
              </button>
            )}
            {bulkTab === 'presets' && (
              <button className="btn btn-primary" onClick={handleSaveBulkPresets}>
                <Sparkles size={14} /> Import Selected Packages
              </button>
            )}
            {bulkTab === 'csv' && (
              <button className="btn btn-primary" onClick={handleSaveBulkCsv}>
                <Upload size={14} /> Parse & Add Services
              </button>
            )}
          </>
        }
      >
        {/* Sub Tabs inside Modal */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`tab-btn ${bulkTab === 'table' ? 'active' : ''}`}
            onClick={() => setBulkTab('table')}
          >
            <List size={14} /> <span>Interactive Grid Table</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${bulkTab === 'presets' ? 'active' : ''}`}
            onClick={() => setBulkTab('presets')}
          >
            <Sparkles size={14} /> <span>1-Click Salon Packages</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${bulkTab === 'csv' ? 'active' : ''}`}
            onClick={() => setBulkTab('csv')}
          >
            <FileSpreadsheet size={14} /> <span>Paste CSV / Text</span>
          </button>
        </div>

        {/* Tab 1: Interactive Grid Table */}
        {bulkTab === 'table' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
                Type multiple services in the table below and save all at once.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={addBulkRow}
                style={{ color: 'var(--teal)', fontWeight: 700 }}
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Service Name *</th>
                    <th style={{ width: '25%' }}>Category</th>
                    <th style={{ width: '18%' }}>Price (₹) *</th>
                    <th style={{ width: '15%' }}>Duration (mins)</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row, idx) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="text"
                          className="input"
                          placeholder={`Service #${idx + 1} name…`}
                          value={row.name}
                          onChange={(e) => updateBulkRow(row.id, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          value={row.category}
                          onChange={(e) => updateBulkRow(row.id, 'category', e.target.value)}
                        >
                          {DEFAULT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="500"
                          value={row.price}
                          onChange={(e) => updateBulkRow(row.id, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={5}
                          className="input"
                          placeholder="45"
                          value={row.duration}
                          onChange={(e) => updateBulkRow(row.id, 'duration', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-icon danger"
                          title="Remove Row"
                          onClick={() => removeBulkRow(row.id)}
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
                onClick={addBulkRow}
                style={{ fontSize: 12 }}
              >
                <Plus size={13} /> + Add Another Row
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {bulkRows.filter(r => r.name.trim() !== '' && Number(r.price) > 0).length} valid rows to add
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: 1-Click Salon Packages */}
        {bulkTab === 'presets' && (
          <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
              Select pre-built popular salon service menus to import instantly into your catalog.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SALON_PRESET_PACKAGES.map((pack) => (
                <div key={pack.title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{pack.title}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{pack.category}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {pack.services.map((s) => {
                      const key = `${pack.category}___${s.name}`;
                      const isChecked = !!selectedPresetServices[key];
                      const alreadyExists = (data?.services || []).some((ex) => ex.name.toLowerCase() === s.name.toLowerCase());

                      return (
                        <div
                          key={s.name}
                          onClick={() => setSelectedPresetServices((prev) => ({ ...prev, [key]: !prev[key] }))}
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
                              {s.name}
                              {alreadyExists && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>Already Added</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                              ₹{s.price} • {s.duration} mins
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

        {/* Tab 3: CSV / Text Paste */}
        {bulkTab === 'csv' && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
              Paste lines of text from Excel or CSV file. Format: <code>Service Name, Price, Category, Duration</code>
            </p>
            <textarea
              className="input"
              rows={8}
              placeholder={`Example:\nHair Spa Treatment, 850, Hair Care & Styling, 45\nFruit Glow Facial, 950, Skin Care & Facials, 45\nFull Arms Waxing, 650, Waxing & Threading, 30`}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5 }}
            />
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)' }}>
              💡 <b>Tip:</b> You can copy columns directly from Excel or Google Sheets and paste them here!
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
