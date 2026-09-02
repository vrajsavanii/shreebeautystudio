// lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SalonData, BridalPackage, MembershipPlan } from '@/types/salon';
import { uid } from './utils';

export const DEFAULT_BRIDAL_PACKAGES: BridalPackage[] = [
  { id: 'sider-forever', type: 'Siders Package', name: 'Forever', price: 3300, sessions: 1, includes: 'Makeup, hairstyle and draping' },
  { id: 'sider-mac', type: 'Siders Package', name: 'Mac', price: 4200, sessions: 1, includes: 'Makeup, hairstyle and draping' },
  { id: 'sider-makeup-forever', type: 'Siders Package', name: 'Make Up Forever', price: 5100, sessions: 1, includes: 'Makeup, hairstyle and draping' },
  { id: 'sider-huda-bobbi', type: 'Siders Package', name: 'Huda | Bobbi Brown', price: 6999, sessions: 1, includes: 'Makeup, hairstyle and draping' },
  { id: 'sider-armani-dior-nars', type: 'Siders Package', name: 'Armani | Dior | Nars', price: 8200, sessions: 1, includes: 'Makeup, hairstyle and draping' },
  { id: 'sider-hourglass', type: 'Siders Package', name: 'Hourglass', price: 10000, sessions: 1, includes: 'Makeup, hairstyle and draping' },
  { id: 'sider-charlotte', type: 'Siders Package', name: 'Charlotte Tilbury', price: 12300, sessions: 1, includes: 'Makeup, hairstyle and draping' },
  { id: 'bridal-mac-forever', type: 'Bridal Package', name: 'Mac | Forever', price: 25300, sessions: 3, includes: 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping' },
  { id: 'bridal-huda-bobbi', type: 'Bridal Package', name: 'Huda | Bobbi Brown', price: 35700, sessions: 3, includes: 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping' },
  { id: 'bridal-armani-dior-nars', type: 'Bridal Package', name: 'Armani | Dior | Nars', price: 46000, sessions: 3, includes: 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping' },
  { id: 'bridal-hourglass', type: 'Bridal Package', name: 'Hourglass', price: 55000, sessions: 3, includes: 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping' },
  { id: 'bridal-charlotte', type: 'Bridal Package', name: 'Charlotte Tilbury', price: 60000, sessions: 3, includes: 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping' },
  { id: 'bridal-valentino', type: 'Bridal Package', name: 'Very Valentino', price: 80200, sessions: 3, includes: 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping' },
];

export const DEFAULT_MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: 'mem-silver', name: 'Silver', price: 1999, validityDays: 180, discountPercent: 5, color: '#9ca3af', perks: '5% off on all services, Priority booking' },
  { id: 'mem-gold', name: 'Gold', price: 3999, validityDays: 365, discountPercent: 10, color: '#f59e0b', perks: '10% off on all services, Free birthday facial, Priority booking' },
  { id: 'mem-vip', name: 'VIP', price: 7999, validityDays: 365, discountPercent: 15, color: '#8b5cf6', perks: '15% off on all services, Free birthday + anniversary facial, Complimentary threading, Priority booking' },
];

export const DEFAULT_DATA: SalonData = {
  settings: {
    salon: 'Shree Beauty Studio',
    whatsapp: '919824183769',
    open: '10:00',
    close: '19:00',
    address: '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004',
    custR1: 24,
    custR2: 4,
    staffR: 1,
    printer: 'both',
    payments: ['Cash', 'GPay UPI', 'PhonePe UPI', 'Bank Transfer', 'Card', 'HDFC Bank'],
    // Loyalty defaults
    loyaltyEnabled: true,
    loyaltyEarnRate: 100,   // ₹100 spent = 1 point
    loyaltyRedeemRate: 10,  // 10 points = ₹1 discount
    loyaltyMinRedeem: 50,   // minimum 50 points to redeem
    // Wallet defaults
    walletEnabled: true,
    // WhatsApp defaults
    whatsappMode: 'web',
    autoSendPdfWhatsApp: true,
  },
  services: [
    { id: 's1', name: 'Layer Cut / Feather Haircut', category: 'Hair Care & Styling', price: 450, duration: 45, description: 'Precision styling, wash & blow dry setup' },
    { id: 's2', name: 'L\'Oreal Hair Spa & Deep Conditioning', category: 'Hair Care & Styling', price: 1200, duration: 60, description: 'Nourishing scalp massage & steam treatment' },
    { id: 's3', name: 'Global Hair Color & Highlights', category: 'Hair Care & Styling', price: 2800, duration: 120, description: 'Ammonia-free premium hair color' },
    { id: 's4', name: 'O3+ Bridal Glow Facial', category: 'Skin Care & Facials', price: 2100, duration: 75, description: 'Radiance brightening facial with serum infusion' },
    { id: 's5', name: 'Hydra Deep Cleanse Facial', category: 'Skin Care & Facials', price: 2500, duration: 90, description: 'Aqua peeling, blackhead extraction & hydra hydration' },
    { id: 's6', name: 'Full Arms + Legs RICA Waxing', category: 'Waxing & Threading', price: 850, duration: 45, description: 'Painless liposoluble Italian wax' },
    { id: 's7', name: 'Eyebrow & Upper Lip Threading', category: 'Waxing & Threading', price: 120, duration: 15, description: 'Gentle precision shaping' },
    { id: 's8', name: 'Deluxe Spa Manicure & Pedicure', category: 'Hands, Feet & Nails', price: 1100, duration: 60, description: 'Exfoliation scrub, cuticle care & relaxing massage' },
    { id: 's9', name: 'HD Party / Engagement Makeup', category: 'Makeup & Bridal', price: 4500, duration: 90, description: 'Long-lasting HD camera-ready makeup with eyelashes' },
    { id: 's10', name: 'Full Body Herbal Bleach & De-Tan', category: 'Body Spa & Bleach', price: 1800, duration: 60, description: 'Instant tan removal with cooling herbal pack' },
  ],
  staff: [
    { id: 'st1', name: 'Neha', mobile: '', role: 'Beautician', services: 'Makeup, Skin, Hair', serviceCommission: 0, productCommission: 0 },
    { id: 'st2', name: 'Pooja', mobile: '', role: 'Beautician', services: 'Hair, Waxing', serviceCommission: 0, productCommission: 0 },
  ],
  customers: [],
  appointments: [],
  invoices: [],
  inventory: [
    { id: 'p1', barcode: '890123456001', name: 'Hair Serum', stock: 5, buy: 350, sell: 550, low: 3 },
    { id: 'p2', barcode: '890123456002', name: 'Facial Kit', stock: 3, buy: 600, sell: 900, low: 2 },
    { id: 'p3', barcode: '890123456003', name: 'Hair Color', stock: 8, buy: 450, sell: 700, low: 3 },
  ],
  inventoryTx: [],
  adjustments: [],
  suppliers: [],
  purchases: [],
  purchaseSeq: 1001,
  vouchers: [],
  voucherSeq: 1001,
  expenses: [],
  expenseSeq: 1001,
  bridalPackages: DEFAULT_BRIDAL_PACKAGES,
  bridal: [],
  invoiceSeq: 1001,
  // New collections
  loyaltyTx: [],
  walletTx: [],
  memberships: DEFAULT_MEMBERSHIP_PLANS,
  customerMemberships: [],
  attendance: [],
};

export function mergeWithDefaults(incoming?: Partial<SalonData> | null): SalonData {
  if (!incoming || typeof incoming !== 'object') return DEFAULT_DATA;
  return {
    settings: {
      ...DEFAULT_DATA.settings,
      ...(incoming.settings || {}),
      payments: incoming.settings?.payments?.length ? incoming.settings.payments : DEFAULT_DATA.settings.payments,
    },
    services: Array.isArray(incoming.services) ? incoming.services : DEFAULT_DATA.services,
    staff: Array.isArray(incoming.staff) ? incoming.staff : DEFAULT_DATA.staff,
    customers: Array.isArray(incoming.customers) ? incoming.customers : DEFAULT_DATA.customers,
    appointments: Array.isArray(incoming.appointments) ? incoming.appointments : DEFAULT_DATA.appointments,
    invoices: Array.isArray(incoming.invoices) ? incoming.invoices : DEFAULT_DATA.invoices,
    inventory: Array.isArray(incoming.inventory) ? incoming.inventory : DEFAULT_DATA.inventory,
    inventoryTx: Array.isArray(incoming.inventoryTx) ? incoming.inventoryTx : DEFAULT_DATA.inventoryTx,
    adjustments: Array.isArray(incoming.adjustments) ? incoming.adjustments : DEFAULT_DATA.adjustments,
    suppliers: Array.isArray(incoming.suppliers) ? incoming.suppliers : DEFAULT_DATA.suppliers,
    purchases: Array.isArray(incoming.purchases) ? incoming.purchases : DEFAULT_DATA.purchases,
    purchaseSeq: typeof incoming.purchaseSeq === 'number' ? incoming.purchaseSeq : DEFAULT_DATA.purchaseSeq,
    vouchers: Array.isArray(incoming.vouchers) ? incoming.vouchers : DEFAULT_DATA.vouchers,
    voucherSeq: typeof incoming.voucherSeq === 'number' ? incoming.voucherSeq : DEFAULT_DATA.voucherSeq,
    expenses: Array.isArray(incoming.expenses) ? incoming.expenses : DEFAULT_DATA.expenses,
    expenseSeq: typeof incoming.expenseSeq === 'number' ? incoming.expenseSeq : DEFAULT_DATA.expenseSeq,
    bridalPackages: Array.isArray(incoming.bridalPackages) && incoming.bridalPackages.length ? incoming.bridalPackages : DEFAULT_BRIDAL_PACKAGES,
    bridal: Array.isArray(incoming.bridal) ? incoming.bridal : DEFAULT_DATA.bridal,
    invoiceSeq: typeof incoming.invoiceSeq === 'number' ? incoming.invoiceSeq : DEFAULT_DATA.invoiceSeq,
    // New collections
    loyaltyTx: Array.isArray(incoming.loyaltyTx) ? incoming.loyaltyTx : DEFAULT_DATA.loyaltyTx,
    walletTx: Array.isArray(incoming.walletTx) ? incoming.walletTx : DEFAULT_DATA.walletTx,
    memberships: Array.isArray(incoming.memberships) && incoming.memberships.length ? incoming.memberships : DEFAULT_MEMBERSHIP_PLANS,
    customerMemberships: Array.isArray(incoming.customerMemberships) ? incoming.customerMemberships : DEFAULT_DATA.customerMemberships,
    attendance: Array.isArray(incoming.attendance) ? incoming.attendance : DEFAULT_DATA.attendance,
  };
}

interface SalonStore {
  data: SalonData;
  setData: (data: Partial<SalonData>) => void;
  updateData: (updater: (d: SalonData) => SalonData) => void;
  cloudStatus: 'idle' | 'syncing' | 'saved' | 'error' | 'offline';
  setCloudStatus: (s: 'idle' | 'syncing' | 'saved' | 'error' | 'offline') => void;
  lastSynced: string | null;
  setLastSynced: (t: string) => void;
}

export const useSalonStore = create<SalonStore>()(
  persist(
    (set) => ({
      data: DEFAULT_DATA,
      setData: (incoming) => set({ data: mergeWithDefaults(incoming) }),
      updateData: (updater) => set((s) => ({ data: mergeWithDefaults(updater(s.data)) })),
      cloudStatus: 'idle',
      setCloudStatus: (s) => set({ cloudStatus: s }),
      lastSynced: null,
      setLastSynced: (t) => set({ lastSynced: t }),
    }),
    {
      name: 'shreeSalonV1',
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        data: mergeWithDefaults(persistedState?.data),
      }),
    }
  )
);
