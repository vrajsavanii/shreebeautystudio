'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Crown,
  Eye,
  Download,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useSalonStore, DEFAULT_BRIDAL_PACKAGES } from '@/lib/store';
import { downloadBridalRateCardPDF, sendBridalRateCardPDFViaWhatsApp } from '@/lib/bridal-pdf';
import { scheduleSave } from '@/lib/sync';
import { uid, money, getServicePricingBasis } from '@/lib/utils';
import { openWAApp } from '@/lib/whatsapp';
import { Service, ServicePricingType, BridalPackage } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';

const PRICING_TYPE_OPTIONS: Array<{
  value: ServicePricingType;
  label: string;
  badge: string;
  sublabel: string;
  icon: string;
}> = [
  {
    value: 'fixed',
    label: 'Fixed Price',
    badge: '🏷️ Fixed Rate',
    sublabel: 'Exact fixed price (e.g. Eyebrow ₹50, Threading, Waxing)',
    icon: '🏷️',
  },
  {
    value: 'hair_length',
    label: 'According to Hair Length',
    badge: '💇‍♀️ Hair Length',
    sublabel: 'Starts from base rate (Short / Medium / Long / Waist)',
    icon: '💇‍♀️',
  },
  {
    value: 'skin_type',
    label: 'According to Skin Type',
    badge: '✨ Skin Type',
    sublabel: 'Starts from base rate (Glow, Acne, D-Tan, Sensitive)',
    icon: '✨',
  },
  {
    value: 'starting',
    label: 'Starting Price (General)',
    badge: '🌸 Starts From',
    sublabel: 'General treatment starting price (Starts from ₹...)',
    icon: '🌸',
  },
];

const DEFAULT_CATEGORIES = [
  'Hair Care & Styling',
  'Skin Care & Facials',
  'Waxing & Threading',
  'Makeup & Bridal',
  'Body Spa & Bleach',
  'Other Treatments',
];

const SALON_PRESET_PACKAGES = [
  {
    title: '💇 Hair Care & Styling Pack (Price According to Hair Length)',
    category: 'Hair Care & Styling',
    services: [
      { name: 'Hair Cut & Style', price: 350, duration: 30, description: 'Starting price • According to hair length & styling (Short/Medium/Long)' },
      { name: 'Hair Spa Treatment', price: 850, duration: 45, description: 'Starts from • Deep nourishing spa mask according to hair length & density' },
      { name: 'Keratin Smooth Treatment', price: 3500, duration: 120, description: 'Starts from • Price calculated according to hair length (Short / Medium / Long / Waist)' },
      { name: 'Root Touchup / Gray Coverage', price: 1200, duration: 60, description: 'Starts from • L\'Oreal professional root color & regrowth coverage' },
      { name: 'Global Hair Coloring', price: 2800, duration: 90, description: 'Starts from • Full length global shade according to hair length and volume' },
      { name: 'Hair Rebonding / Smoothening', price: 4200, duration: 150, description: 'Starts from • Permanent straightening according to hair length & texture' },
    ],
  },
  {
    title: '💆 Skin Care & Facials Pack (Price According to Skin Type)',
    category: 'Skin Care & Facials',
    services: [
      { name: 'Herbal Deep Cleanup', price: 450, duration: 30, description: 'Starts from • Deep pore cleansing according to skin type & condition' },
      { name: 'Fruit Glow Facial', price: 850, duration: 45, description: 'Starts from • Natural antioxidant fruit facial according to skin type & condition' },
      { name: 'Gold Radiance Facial', price: 1500, duration: 60, description: 'Starts from • 24K gold foil radiance treatment according to skin type' },
      { name: 'Diamond Insta-Glow Facial', price: 2200, duration: 60, description: 'Starts from • Polishing & micro-exfoliation according to skin sensitivity' },
      { name: 'O3+ Advanced D-Tan Facial', price: 2500, duration: 60, description: 'Starts from • Sun tan removal & pigmentation treatment according to skin profile' },
      { name: 'Full Face Bleach & Pack', price: 350, duration: 25, description: 'Starts from • Gentle glow bleach & soothing pack according to skin sensitivity' },
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
    title: '👰 Makeup & Bridal Pack (Luxury Catalog)',
    category: 'Makeup & Bridal',
    services: [
      { name: 'HD Party & Occasion Makeup', price: 2500, duration: 60, description: 'Glamorous HD party makeup with lashes, hair styling & dupatta draping' },
      { name: 'Engagement & Sangeet Makeup', price: 6500, duration: 90, description: 'Airbrush & HD fusion look with premium eyelashes, lenses & jewelry setting' },
      { name: 'Royal Bridal HD Makeover', price: 15000, duration: 180, description: 'Signature bridal couture makeover, hair styling, jewelry setting, extensions, lenses & draping' },
      { name: 'Airbrush Couture Bridal Package', price: 25000, duration: 180, description: 'Ultra-HD water-resistant airbrush bridal makeup, 3D lashes, real flower hair styling & dupatta styling' },
      { name: 'Siders & Bridesmaids Makeup', price: 3500, duration: 60, description: 'Elegant party makeover, designer hairstyle & traditional draping for relatives & bridesmaids' },
      { name: 'Saree & Lehenga Dupatta Draping', price: 500, duration: 25, description: 'Flawless pleating, Gujarati/Can-Can style draping & jewelry placement' },
      { name: 'Pre-Bridal Luxury Skin & Hair Ritual', price: 4500, duration: 120, description: 'Full body polishing, gold radiance facial, L\'Oreal hair spa, waxing & manicure/pedicure glow' },
      { name: 'Bridal Designer Hairstyle & Flowers', price: 1800, duration: 45, description: 'Traditional Gujarati bridal bun, romantic messy curls, real flower setting & accessories pinning' },
    ],
  },
];

const OFFICIAL_BRIDAL_CATALOG_SERVICES = [
  {
    name: 'HD Party & Occasion Makeup',
    price: 2500,
    category: 'Makeup & Bridal',
    duration: 60,
    pricingType: 'starting' as ServicePricingType,
    description: 'Glamorous HD party makeup with lashes, hair styling & dupatta draping (Starts from)',
  },
  {
    name: 'Engagement & Sangeet Makeup',
    price: 6500,
    category: 'Makeup & Bridal',
    duration: 90,
    pricingType: 'starting' as ServicePricingType,
    description: 'Airbrush & HD fusion look with premium eyelashes, lenses & jewelry setting',
  },
  {
    name: 'Royal Bridal HD Makeover',
    price: 15000,
    category: 'Makeup & Bridal',
    duration: 180,
    pricingType: 'fixed' as ServicePricingType,
    description: 'Signature bridal couture makeover, hair styling, jewelry setting, extensions, lenses & draping',
  },
  {
    name: 'Airbrush Couture Bridal Package',
    price: 25000,
    category: 'Makeup & Bridal',
    duration: 180,
    pricingType: 'fixed' as ServicePricingType,
    description: 'Ultra-HD water-resistant airbrush bridal makeup, 3D lashes, real flower hair styling & dupatta styling',
  },
  {
    name: 'Siders & Bridesmaids Makeup',
    price: 3500,
    category: 'Makeup & Bridal',
    duration: 60,
    pricingType: 'starting' as ServicePricingType,
    description: 'Elegant party makeover, designer hairstyle & traditional draping for relatives & bridesmaids',
  },
  {
    name: 'Saree & Lehenga Dupatta Draping',
    price: 500,
    category: 'Makeup & Bridal',
    duration: 25,
    pricingType: 'fixed' as ServicePricingType,
    description: 'Flawless pleating, Gujarati/Can-Can style draping & jewelry placement',
  },
  {
    name: 'Pre-Bridal Luxury Skin & Hair Ritual',
    price: 4500,
    category: 'Makeup & Bridal',
    duration: 120,
    pricingType: 'fixed' as ServicePricingType,
    description: 'Full body polishing, gold radiance facial, L\'Oreal hair spa, waxing & manicure/pedicure glow',
  },
  {
    name: 'Bridal Designer Hairstyle & Flowers',
    price: 1800,
    category: 'Makeup & Bridal',
    duration: 45,
    pricingType: 'starting' as ServicePricingType,
    description: 'Traditional Gujarati bridal bun, romantic messy curls, real flower setting & accessories pinning',
  },
];

export default function ServicesPage() {
  const router = useRouter();
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  // Main Tab: Services vs Packages
  type MainTab = 'services' | 'packages';
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('services');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'packages' || tabParam === 'bridal') {
        setActiveCategory('Makeup & Bridal');
      }
    }
  }, []);

  const bridalPackages = (data?.bridalPackages && data.bridalPackages.length > 0)
    ? data.bridalPackages
    : DEFAULT_BRIDAL_PACKAGES;

  // Package Management State
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editPackageId, setEditPackageId] = useState<string | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);

  const [packageForm, setPackageForm] = useState<Partial<BridalPackage>>({
    type: 'Bridal Package',
    name: '',
    price: 25000,
    sessions: 3,
    includes: 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping',
  });

  const openNewPackage = (type: 'Bridal Package' | 'Siders Package' | 'Makeup Package' = 'Makeup Package') => {
    setEditPackageId(null);
    setPackageForm({
      type,
      name: '',
      price: type === 'Bridal Package' ? 25000 : type === 'Makeup Package' ? 12000 : 5000,
      sessions: type === 'Bridal Package' ? 3 : type === 'Makeup Package' ? 2 : 1,
      includes: type === 'Bridal Package'
        ? 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping'
        : type === 'Makeup Package'
        ? 'Makeup, hairstyle, draping, eyelashes and lenses'
        : 'Makeup, hairstyle and draping',
    });
    setPackageModalOpen(true);
  };

  const openEditPackage = (pkg: BridalPackage) => {
    setEditPackageId(pkg.id);
    setPackageForm({ ...pkg });
    setPackageModalOpen(true);
  };

  const handleSavePackage = () => {
    if (!packageForm.name?.trim()) {
      toast('Please enter package name.', 'error');
      return;
    }
    if (!packageForm.price || packageForm.price <= 0) {
      toast('Please enter a valid price.', 'error');
      return;
    }

    const id = editPackageId || uid();
    const newPkg: BridalPackage = {
      id,
      type: packageForm.type || 'Bridal Package',
      name: packageForm.name.trim(),
      price: Number(packageForm.price),
      sessions: Number(packageForm.sessions || 1),
      includes: packageForm.includes || '',
    };

    updateData((d) => {
      const existing = d.bridalPackages || [];
      const idx = existing.findIndex((p) => p.id === id);
      let updated: BridalPackage[];
      if (idx >= 0) {
        updated = [...existing];
        updated[idx] = newPkg;
      } else {
        updated = [...existing, newPkg];
      }

      // Clean up any legacy mirrored package service from services so it doesn't pollute general services/billing
      const services = (d.services || []).filter((s) => s.id !== `svc_${id}` && !s.name.toLowerCase().includes(newPkg.name.toLowerCase()));

      return { ...d, bridalPackages: updated, services };
    });

    scheduleSave();
    toast(editPackageId ? `✅ Package "${newPkg.name}" updated successfully!` : `🎉 New package "${newPkg.name}" added!`);
    setPackageModalOpen(false);
  };

  const handleDeletePackage = (id: string) => {
    updateData((d) => ({
      ...d,
      bridalPackages: (d.bridalPackages || []).filter((p) => p.id !== id),
      services: (d.services || []).filter((s) => s.id !== `svc_${id}`),
    }));
    scheduleSave();
    toast('🗑️ Package removed from rate card.');
    setDeletePackageId(null);
  };

  const handleDownloadPDF = async () => {
    toast('⏳ Generating high-res Glamour Lounge Rate Card PDF…');
    await downloadBridalRateCardPDF(data?.bridalPackages || [], data);
    toast('✅ Rate Card PDF downloaded!');
  };

  const handleSendPDFWhatsApp = async (mobile?: string, name?: string) => {
    const targetMob = mobile || prompt('Enter recipient WhatsApp mobile number (10 digits):');
    if (!targetMob) return;

    toast(`⏳ Sending Bridal Rate Card PDF to ${targetMob} via Meta WhatsApp API…`);
    const res = await sendBridalRateCardPDFViaWhatsApp(data?.bridalPackages || [], targetMob, name, data);
    if (res.success) {
      toast(`✅ Bridal Rate Card PDF sent directly to ${targetMob}'s WhatsApp via Meta API!`);
    } else {
      toast(`❌ Error sending PDF via Meta API: ${res.message}`, 'error');
    }
  };


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

  const handleAddBridalCatalog = () => {
    const existingNames = new Set((data?.services || []).map((s) => s.name.toLowerCase()));
    const bridalPkgs = (data?.bridalPackages && data.bridalPackages.length > 0)
      ? data.bridalPackages
      : DEFAULT_BRIDAL_PACKAGES;

    const toAdd: Service[] = bridalPkgs
      .map((pkg: BridalPackage) => {
        const isSider = pkg.type === 'Siders Package';
        const isBridal = pkg.type === 'Bridal Package';
        let svcName = pkg.name;
        if (isSider && !svcName.toLowerCase().includes('sider')) {
          svcName = `${pkg.name} (Siders Package)`;
        } else if (isBridal && !svcName.toLowerCase().includes('bridal')) {
          svcName = `${pkg.name} (Bridal Package)`;
        } else if (!isSider && !isBridal && !svcName.toLowerCase().includes('package')) {
          svcName = `${pkg.name} (Luxury Package)`;
        }

        return {
          id: `svc_${pkg.id || uid()}`,
          name: svcName,
          category: 'Makeup & Bridal',
          price: Number(pkg.price || 0),
          duration: (pkg.sessions && pkg.sessions > 1) ? pkg.sessions * 60 : (isBridal ? 180 : (isSider ? 60 : 90)),
          pricingType: 'fixed' as ServicePricingType,
          description: pkg.includes ? `${pkg.includes} (${pkg.sessions || 1} ${(pkg.sessions || 1) === 1 ? 'Session' : 'Sessions'})` : '',
        };
      })
      .filter((s: Service) => !existingNames.has(s.name.toLowerCase()));

    if (toAdd.length === 0) {
      toast('All 14 Luxury Bridal & Siders packages are already present in your Services catalog!', 'info');
      setActiveCategory('Makeup & Bridal');
      return;
    }

    updateData((d) => ({
      ...d,
      services: [...(d.services || []), ...toAdd],
    }));

    scheduleSave();
    toast(`🎉 Successfully moved ${toAdd.length} Luxury Packages to Makeup & Bridal services!`, 'success');
    setActiveCategory('Makeup & Bridal');
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
    if (bridalPackages.length > 0) {
      map['Makeup & Bridal'] = Math.max(map['Makeup & Bridal'] || 0, bridalPackages.length);
    }
    return map;
  }, [services, categories, bridalPackages]);

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
    watch,
    reset,
    formState: { errors },
  } = useForm<Service>({
    defaultValues: {
      id: '',
      name: '',
      category: 'Hair Care & Styling',
      pricingType: 'hair_length',
      price: '' as any,
      duration: 45,
      description: '',
    },
  });

  const selectedPricingType = (watch('pricingType') || 'fixed') as ServicePricingType;

  const openNew = () => {
    setEditId(null);
    const cat = activeCategory !== 'all' ? activeCategory : 'Hair Care & Styling';
    const autoBasis = getServicePricingBasis(cat, '');
    reset({
      id: '',
      name: '',
      category: cat,
      pricingType: autoBasis.pricingType,
      price: '' as any,
      duration: 45,
      description: '',
    });
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditId(s.id);
    const basis = getServicePricingBasis(s.category, s.name, s.pricingType);
    reset({
      id: s.id,
      name: s.name,
      category: s.category || 'Hair Care & Styling',
      pricingType: s.pricingType || basis.pricingType,
      price: s.price,
      duration: s.duration || 45,
      description: s.description || '',
    });
    setModalOpen(true);
  };

  const onSubmit = (form: Service) => {
    const numPrice = Number(form.price || 0);
    const numDuration = Number(form.duration || 30);
    const chosenPricingType = (form.pricingType || getServicePricingBasis(form.category, form.name).pricingType) as ServicePricingType;

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
                pricingType: chosenPricingType,
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
      pricingType: chosenPricingType,
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
    router.push('/admin/billing');
  };

  const handleQuickBook = (s: Service) => {
    toast(`Opening appointments for ${s.name}…`);
    router.push('/admin/appointments');
  };

  // WhatsApp Rate Card Text Formatter
  const rateCardText = useMemo(() => {
    let msg = `✨ *${salonName.toUpperCase()} — SERVICES & STARTING RATE CARD* ✨\n`;
    if (salonAddress) msg += `📍 ${salonAddress}\n`;
    if (salonPhone) msg += `📞 Booking WhatsApp: +${salonPhone}\n`;
    msg += `────────────────────────────\n`;
    msg += `💡 *Pricing Policy:*\n`;
    msg += `💇‍♀️ Hair service rates are Starting Prices based on *Hair Length & Volume* (Short / Medium / Long / Waist).\n`;
    msg += `✨ Skin care & facials are customized according to *Skin Type & Condition*.\n`;
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
        const basis = getServicePricingBasis(s.category, s.name, s.pricingType);
        const tag = basis.badgeShort ? ` [${basis.badgeShort}]` : '';
        const priceStr = basis.isFixed ? `Fixed ${money(s.price)}` : `Starts from ${money(s.price)}+`;
        msg += `• *${s.name}* — ${priceStr}${tag} (${s.duration || 45} mins)\n`;
        if (s.description) msg += `  _${s.description}_\n`;
      });
      msg += `\n`;
    });

    msg += `────────────────────────────\n`;
    msg += `💇‍♀️ *Hair service prices vary by length & skin services are customized by skin type.*\n`;
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

          {/* 1-Click Add Bridal Catalog Button */}
          <motion.button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddBridalCatalog}
            whileTap={{ scale: 0.97 }}
            style={{
              fontSize: 12.5,
              padding: '7.5px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
              color: '#be185d',
              border: '1px solid #fbcfe8',
              fontWeight: 700,
              borderRadius: 8,
              cursor: 'pointer',
            }}
            title="1-Click add complete Luxury Bridal & Makeup services to catalog"
          >
            <Crown size={14} color="#be185d" />
            <span>+ Add Bridal Catalog</span>
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

      {/* 👑 The Glamour Lounge — Official Rate Card & Packages (ONLY shown when Makeup & Bridal tab is clicked) */}
      {activeCategory === 'Makeup & Bridal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
          {/* Top Actions Bar for Rate Card */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                👑 The Glamour Lounge — Official Rate Card &amp; Packages
              </div>
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                Update prices anytime. Generated PDF &amp; WhatsApp rate card will reflect your updated prices live!
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <motion.a
                href="/shree-bridal-rate-card.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ background: '#ffffff', borderColor: '#86efac', color: '#15803d', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                whileTap={{ scale: 0.96 }}
                title="View 100% original uploaded PDF rate card"
              >
                <Eye size={14} /> View Original PDF
              </motion.a>

              <motion.a
                href="/shree-bridal-rate-card.pdf"
                download="Shree_Beauty_Studio_Bridal_Rate_Card.pdf"
                className="btn btn-ghost btn-sm"
                style={{ background: '#ffffff', borderColor: '#86efac', color: '#15803d', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                whileTap={{ scale: 0.96 }}
                title="Direct download Bridal Rate Card PDF"
              >
                <Download size={14} /> Download Rate Card PDF
              </motion.a>

              <motion.button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSendPDFWhatsApp()}
                style={{ background: '#25D366', color: '#ffffff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                whileTap={{ scale: 0.96 }}
              >
                <MessageCircle size={14} /> Send PDF via WhatsApp
              </motion.button>

              <motion.button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openNewPackage('Bridal Package')}
                whileTap={{ scale: 0.96 }}
              >
                <Plus size={14} /> Add New Package
              </motion.button>
            </div>
          </div>
          {/* Bridal Packages (3 Sessions) */}
          <div>
            <div className="section-header" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  👰 Bridal Packages (3 Sessions)
                </h2>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  3-session package with makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openNewPackage('Bridal Package')}
                style={{ fontSize: 11.5, color: 'var(--teal)', fontWeight: 700 }}
              >
                + Add Bridal Package
              </button>
            </div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {(data?.bridalPackages || DEFAULT_BRIDAL_PACKAGES).filter((p) => p.type === 'Bridal Package').map((pkg) => (
                <div key={pkg.id || pkg.name} className="stat-card" style={{ border: '1.5px solid #cbd5e1', padding: 18, background: '#ffffff', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--teal)' }}>{pkg.name}</div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--gold-light)', color: 'var(--teal-dark)', display: 'inline-block', marginTop: 4 }}>
                        {pkg.sessions || 3} Sessions Package
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-icon edit"
                        onClick={() => openEditPackage(pkg)}
                        title="Edit Package & Price"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => setDeletePackageId(pkg.id)}
                        title="Delete Package"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '10px 0 6px', fontFamily: 'monospace' }}>
                    {money(pkg.price)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{pkg.includes}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Siders Packages (1 Session) */}
          <div>
            <div className="section-header" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✨ Siders &amp; Family Packages (1 Session)
                </h2>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  1-Time package with makeup, hairstyle and draping.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openNewPackage('Siders Package')}
                style={{ fontSize: 11.5, color: 'var(--teal)', fontWeight: 700 }}
              >
                + Add Siders Package
              </button>
            </div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {(data?.bridalPackages || DEFAULT_BRIDAL_PACKAGES).filter((p) => p.type === 'Siders Package').map((pkg) => (
                <div key={pkg.id || pkg.name} className="stat-card" style={{ border: '1.5px solid #cbd5e1', padding: 16, background: '#ffffff', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--teal)' }}>{pkg.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99, background: '#eff6ff', color: '#1e40af', display: 'inline-block', marginTop: 4 }}>
                        1 Session
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-icon edit"
                        onClick={() => openEditPackage(pkg)}
                        title="Edit Package & Price"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => setDeletePackageId(pkg.id)}
                        title="Delete Package"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '8px 0 4px', fontFamily: 'monospace' }}>
                    {money(pkg.price)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{pkg.includes}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Makeup Packages (Custom Sessions) */}
          <div>
            <div className="section-header" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  💄 Makeup Packages (Custom Sessions / સેશન નક્કી કરો)
                </h2>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Customizable session packages (1, 2, 3, 4+ sessions) with HD makeup, hair styling, lenses and draping.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openNewPackage('Makeup Package')}
                style={{ fontSize: 11.5, color: 'var(--teal)', fontWeight: 700 }}
              >
                + Add Makeup Package
              </button>
            </div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {(data?.bridalPackages || DEFAULT_BRIDAL_PACKAGES).filter((p) => p.type === 'Makeup Package').length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1', color: 'var(--muted)', fontSize: 13 }}>
                  No makeup packages added yet. Click <b>+ Add Makeup Package</b> to create one with custom sessions.
                </div>
              ) : (
                (data?.bridalPackages || DEFAULT_BRIDAL_PACKAGES).filter((p) => p.type === 'Makeup Package').map((pkg) => (
                  <div key={pkg.id || pkg.name} className="stat-card" style={{ border: '1.5px solid #cbd5e1', padding: 16, background: '#ffffff', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--teal)' }}>{pkg.name}</div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#fdf4ff', color: '#c026d3', border: '1px solid #f0abfc', display: 'inline-block', marginTop: 4 }}>
                          {pkg.sessions || 1} {(pkg.sessions || 1) === 1 ? 'Session' : 'Sessions'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn-icon edit"
                          onClick={() => openEditPackage(pkg)}
                          title="Edit Package & Price"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => setDeletePackageId(pkg.id)}
                          title="Delete Package"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '8px 0 4px', fontFamily: 'monospace' }}>
                      {money(pkg.price)}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{pkg.includes}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}


      {/* Services Content: Grid Cards or Table */}
      {filtered.length === 0 ? (
        activeCategory !== 'Makeup & Bridal' && (
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
        )
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
          {filtered.map((s) => {
            const basis = getServicePricingBasis(s.category, s.name, s.pricingType);
            return (
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
                  borderTop: basis.basis === 'hair' ? '3px solid #0d9488' : basis.basis === 'skin' ? '3px solid #db2777' : basis.isFixed ? '3px solid #0f766e' : '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-teal" style={{ fontSize: 10.5 }}>
                      {s.category || 'General'}
                    </span>
                    <span
                      className="badge"
                      style={{
                        fontSize: 10,
                        background: basis.isFixed ? '#f0fdfa' : basis.basis === 'hair' ? '#ecfdf5' : basis.basis === 'skin' ? '#fdf2f8' : '#f8fafc',
                        color: basis.isFixed ? '#0f766e' : basis.basis === 'hair' ? '#065f46' : basis.basis === 'skin' ? '#9d174d' : '#475569',
                        border: `1px solid ${basis.isFixed ? '#99f6e4' : basis.basis === 'hair' ? '#a7f3d0' : basis.basis === 'skin' ? '#fbcfe8' : '#e2e8f0'}`,
                        fontWeight: 700,
                      }}
                    >
                      {basis.badgeShort}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', margin: '4px 0 2px' }}>
                    {s.name}
                  </h3>

                  {s.description && (
                    <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                      {s.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>
                    <Clock size={11} /> {s.duration || 45} min • {basis.noteGuj}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {basis.isFixed ? 'Fixed Rate:' : 'Starting Price:'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 600 }}>
                        {basis.label}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {!basis.isFixed && (
                        <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, marginRight: 3 }}>Starts</span>
                      )}
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>
                        {money(s.price)}{basis.isFixed ? '' : '+'}
                      </span>
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
            );
          })}
        </motion.div>
      ) : (
        /* High Density Table View (Zero Horizontal Scroll) */
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Treatment Service</th>
                  <th>Category & Basis</th>
                  <th>Duration</th>
                  <th>Rate (₹)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                {filtered.map((s) => {
                  const basis = getServicePricingBasis(s.category, s.name, s.pricingType);
                  return (
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
                        <div style={{ fontSize: 10.5, color: 'var(--teal)', marginTop: 2 }}>
                          {basis.noteGuj}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className="badge badge-teal" style={{ fontSize: 10.5 }}>
                            {s.category || 'General'}
                          </span>
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              background: basis.isFixed ? '#f0fdfa' : basis.basis === 'hair' ? '#ecfdf5' : basis.basis === 'skin' ? '#fdf2f8' : '#f8fafc',
                              color: basis.isFixed ? '#0f766e' : basis.basis === 'hair' ? '#065f46' : basis.basis === 'skin' ? '#9d174d' : '#475569',
                            }}
                          >
                            {basis.badgeShort}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
                          <Clock size={12} /> {s.duration || 45} min
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                            {basis.isFixed ? 'Fixed Rate' : 'Starts From'}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--teal)' }}>
                            {money(s.price)}{basis.isFixed ? '' : '+'}
                          </div>
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
                );
              })}
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
              placeholder="e.g. Eyebrow, Hydra Facial, Keratin Smooth Treatment"
              {...register('name', { required: 'Service name is required' })}
              autoFocus
            />
            {errors.name && <span className="error-msg">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="label">Category *</label>
            <select
              className="input"
              {...register('category')}
              onChange={(e) => {
                setValue('category', e.target.value);
                const suggestedBasis = getServicePricingBasis(e.target.value, watch('name'));
                setValue('pricingType', suggestedBasis.pricingType, { shouldDirty: true });
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">
              {selectedPricingType === 'fixed' ? 'Fixed Price (₹) *' : 'Starting Price (₹) *'}
              <span className="label-hint" style={{ fontSize: 10.5, color: 'var(--teal)', marginLeft: 4 }}>
                {selectedPricingType === 'fixed'
                  ? '(Exact rate)'
                  : selectedPricingType === 'hair_length'
                  ? '(According to Hair Length)'
                  : selectedPricingType === 'skin_type'
                  ? '(According to Skin Type)'
                  : '(Starts From)'}
              </span>
            </label>
            <input
              type="number"
              min="0"
              className={`input ${errors.price ? 'error' : ''}`}
              placeholder={selectedPricingType === 'fixed' ? 'e.g. 50' : 'e.g. 1200'}
              {...register('price', { required: 'Price is required' })}
            />
            {errors.price && <span className="error-msg">{errors.price.message}</span>}
          </div>

          {/* Pricing Model Option Selector */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Pricing Type / Options *</span>
              <span className="label-hint" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 11.5 }}>
                {selectedPricingType === 'fixed'
                  ? '🏷️ Fixed Price (Exact Rate, No "+")'
                  : selectedPricingType === 'hair_length'
                  ? '💇‍♀️ Starts from ₹... (According to Hair Length)'
                  : selectedPricingType === 'skin_type'
                  ? '✨ Starts from ₹... (According to Skin Type)'
                  : '🌸 General Starting Price'}
              </span>
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 8,
                marginTop: 4,
              }}
            >
              {PRICING_TYPE_OPTIONS.map((opt) => {
                const isSelected = selectedPricingType === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setValue('pricingType', opt.value, { shouldDirty: true })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? 'var(--teal)' : '#cbd5e1'}`,
                      background: isSelected ? '#f0fdfa' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 9,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(13,148,136,0.18)' : 'none',
                    }}
                  >
                    <input
                      type="radio"
                      name="pricingTypeRadio"
                      checked={isSelected}
                      onChange={() => setValue('pricingType', opt.value, { shouldDirty: true })}
                      style={{ marginTop: 2, accentColor: 'var(--teal)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: isSelected ? '#0f766e' : '#1e293b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2, lineHeight: 1.3 }}>
                        {opt.sublabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
              onClick={() => openWAApp('', rateCardText)}
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

      {/* 👑 Package Edit / Add Modal */}
      {packageModalOpen && (
        <Modal
          isOpen={packageModalOpen}
          onClose={() => setPackageModalOpen(false)}
          title={editPackageId ? '✏️ Edit Package & Price' : '➕ Add New Glamour Lounge Package'}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPackageModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSavePackage}>
                Save Package
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="label">Package Type *</label>
              <select
                className="input"
                value={packageForm.type}
                onChange={(e) => {
                  const t = e.target.value as 'Bridal Package' | 'Siders Package' | 'Makeup Package';
                  setPackageForm((prev) => ({
                    ...prev,
                    type: t,
                    sessions: t === 'Bridal Package' ? 3 : t === 'Makeup Package' ? (prev.sessions || 2) : 1,
                    includes: t === 'Bridal Package'
                      ? 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping'
                      : t === 'Makeup Package'
                      ? 'HD Makeup, hairstyle, draping, eyelashes and lenses'
                      : 'Makeup, hairstyle and draping',
                  }));
                }}
              >
                <option value="Bridal Package">👰 Bridal Package (3 Sessions)</option>
                <option value="Siders Package">✨ Siders Package (1 Session)</option>
                <option value="Makeup Package">💄 Makeup Package (Custom Sessions / સેશન નક્કી કરો)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Package / Brand Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Mac | Forever, HD Party Look, Charlotte Tilbury"
                value={packageForm.name || ''}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="label">Package Price (₹) *</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="25300"
                  value={packageForm.price || ''}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="label">Number of Sessions (સેશન સંખ્યા) *</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="input"
                  value={packageForm.sessions ?? 1}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, sessions: Math.max(1, Number(e.target.value)) }))}
                  style={{ fontFamily: 'monospace', fontWeight: 700 }}
                />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPackageForm((prev) => ({ ...prev, sessions: num }))}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: packageForm.sessions === num ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                        background: packageForm.sessions === num ? 'var(--teal)' : '#ffffff',
                        color: packageForm.sessions === num ? '#ffffff' : 'var(--text)',
                        fontWeight: packageForm.sessions === num ? 700 : 500,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {num} {num === 1 ? 'Session' : 'Sessions'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Included Services / Description</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping..."
                value={packageForm.includes || ''}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, includes: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Package Confirmation Modal */}
      {deletePackageId && (
        <Modal
          isOpen={!!deletePackageId}
          onClose={() => setDeletePackageId(null)}
          title="Delete Package from Rate Card?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeletePackageId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeletePackage(deletePackageId)}>Delete</button>
            </>
          }
        >
          <p>Are you sure you want to remove this package from your Glamour Lounge Rate Card?</p>
        </Modal>
      )}


    </div>
  );
}
