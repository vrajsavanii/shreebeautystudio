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
  {
    "id": "prod_1",
    "barcode": "8436542368308",
    "name": "Jeannot Advanced Hydrating Soothing Programme 6 treat.",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3310,
    "sell": 3310,
    "mrp": 3310,
    "low": 3
  },
  {
    "id": "prod_2",
    "barcode": "8436542368193",
    "name": "Jeannot Anti-Pollution Calming Mist 100 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1230,
    "sell": 1230,
    "mrp": 1230,
    "low": 3
  },
  {
    "id": "prod_3",
    "barcode": "8435618900381",
    "name": "Jeannot Brightening Algae Mask 5 sachets",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 2690,
    "sell": 2690,
    "mrp": 2690,
    "low": 3
  },
  {
    "id": "prod_4",
    "barcode": "8436542368216",
    "name": "Jeannot Cellular Repair Night Cream 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1300,
    "sell": 1300,
    "mrp": 1550,
    "low": 3
  },
  {
    "id": "prod_5",
    "barcode": "8435618905010",
    "name": "Jeannot Daily Detoxifying Serum",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1950,
    "sell": 1950,
    "mrp": 1950,
    "low": 3
  },
  {
    "id": "prod_6",
    "barcode": "S131",
    "name": "Jeannot Deep Whitening Detox Mask 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1330,
    "sell": 1330,
    "mrp": 1330,
    "low": 3
  },
  {
    "id": "prod_7",
    "barcode": "8435618905027",
    "name": "Jeannot Detoxifying Anty-Pollution Programme 6 treat.",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3540,
    "sell": 3540,
    "mrp": 3540,
    "low": 3
  },
  {
    "id": "prod_8",
    "barcode": "8436542368292",
    "name": "Jeannot Dry Touch Protective Emulsion SPF50 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1530,
    "sell": 1530,
    "mrp": 1530,
    "low": 3
  },
  {
    "id": "prod_9",
    "barcode": "8435618903009",
    "name": "Jeannot Energizing & Antioxidant Programme 6 treat.",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3660,
    "sell": 3660,
    "mrp": 3660,
    "low": 3
  },
  {
    "id": "prod_10",
    "barcode": "8435618900466",
    "name": "Jeannot Hydrating Cleansing Milk 1000 ml",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3150,
    "sell": 3150,
    "mrp": 3150,
    "low": 3
  },
  {
    "id": "prod_11",
    "barcode": "8436542368131",
    "name": "Jeannot Hydrating Cleansing Milk 200 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1450,
    "sell": 1450,
    "mrp": 1450,
    "low": 3
  },
  {
    "id": "prod_12",
    "barcode": "8436542368179",
    "name": "Jeannot Instant Hydrating Cream 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1660,
    "sell": 1660,
    "mrp": 1660,
    "low": 3
  },
  {
    "id": "prod_13",
    "barcode": "8436542368339",
    "name": "Jeannot Instant Whitening Detox Programme 6 treat.",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3920,
    "sell": 3920,
    "mrp": 3920,
    "low": 3
  },
  {
    "id": "prod_14",
    "barcode": "8435618903962",
    "name": "Jeannot Intense Firming Ampoule 7 x 2 ml",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1340,
    "sell": 1340,
    "mrp": 1340,
    "low": 3
  },
  {
    "id": "prod_15",
    "barcode": "S128",
    "name": "Jeannot Intense Hydrating Serum 30 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1930,
    "sell": 1930,
    "mrp": 1930,
    "low": 3
  },
  {
    "id": "prod_16",
    "barcode": "8436542368254",
    "name": "Jeannot Intense Renewal Brightening Serum 30 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 2190,
    "sell": 2190,
    "mrp": 2190,
    "low": 3
  },
  {
    "id": "prod_17",
    "barcode": "8436542368155",
    "name": "Jeannot Micellar Water 5 in 1 200 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1350,
    "sell": 1350,
    "mrp": 1350,
    "low": 3
  },
  {
    "id": "prod_18",
    "barcode": "8435618900503",
    "name": "Jeannot Pore Refining Serum 30 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1950,
    "sell": 1950,
    "mrp": 1950,
    "low": 3
  },
  {
    "id": "prod_19",
    "barcode": "S117",
    "name": "Jeannot Pro-Collagen Concentrate Serum 30 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1950,
    "sell": 1950,
    "mrp": 1950,
    "low": 3
  },
  {
    "id": "prod_20",
    "barcode": "S115",
    "name": "Jeannot Pro-Collagen Firming Cream SPF20 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1550,
    "sell": 1550,
    "mrp": 1550,
    "low": 3
  },
  {
    "id": "prod_21",
    "barcode": "8436542368315",
    "name": "Jeannot Pro-Collagen Firming Programme 6 treat.",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3370,
    "sell": 3370,
    "mrp": 3370,
    "low": 3
  },
  {
    "id": "prod_22",
    "barcode": "8436542368148",
    "name": "Jeannot Radiance Glow Tonic 200 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1390,
    "sell": 1390,
    "mrp": 1390,
    "low": 3
  },
  {
    "id": "prod_23",
    "barcode": "8435618900459",
    "name": "Jeannot Radiance Glow Tonic 1000 ml",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 2490,
    "sell": 2490,
    "mrp": 2490,
    "low": 3
  },
  {
    "id": "prod_24",
    "barcode": "8436542368261",
    "name": "Jeannot Radiance Whitening Cream SPF30 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1570,
    "sell": 1570,
    "mrp": 1570,
    "low": 3
  },
  {
    "id": "prod_25",
    "barcode": "8435618900398",
    "name": "Jeannot Rebalancing Algae Mask 5 sachets",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 2690,
    "sell": 2690,
    "mrp": 2690,
    "low": 3
  },
  {
    "id": "prod_26",
    "barcode": "8435618900404",
    "name": "Jeannot Rejuvenating Algae Mask 5 sachets",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 2830,
    "sell": 2830,
    "mrp": 2830,
    "low": 3
  },
  {
    "id": "prod_27",
    "barcode": "S121",
    "name": "Jeannot Renewal Radiance Mask 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1260,
    "sell": 1260,
    "mrp": 1260,
    "low": 3
  },
  {
    "id": "prod_28",
    "barcode": "8436542368278",
    "name": "Jeannot Revitalizing Whitening Serum 30 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 2260,
    "sell": 2260,
    "mrp": 2260,
    "low": 3
  },
  {
    "id": "prod_29",
    "barcode": "8435618900497",
    "name": "Jeannot Shine Control Rebalancing Purifying Programme 6 treat.",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3670,
    "sell": 3670,
    "mrp": 3670,
    "low": 3
  },
  {
    "id": "prod_30",
    "barcode": "8436542368230",
    "name": "Jeannot Skin Brightening Cream SPF20 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1550,
    "sell": 1550,
    "mrp": 1550,
    "low": 3
  },
  {
    "id": "prod_31",
    "barcode": "8435618906055",
    "name": "Jeannot Skin Lightenung Firming Ampoule 7 x 2 ml",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1490,
    "sell": 1490,
    "mrp": 1490,
    "low": 3
  },
  {
    "id": "prod_32",
    "barcode": "8435618905003",
    "name": "Jeannot Skin Protecting Cream 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1840,
    "sell": 1840,
    "mrp": 1840,
    "low": 3
  },
  {
    "id": "prod_33",
    "barcode": "8436542368124",
    "name": "Jeannot Skin Purifying Foam 200 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1530,
    "sell": 1530,
    "mrp": 1390,
    "low": 3
  },
  {
    "id": "prod_34",
    "barcode": "8435618900510",
    "name": "Jeannot Skin Rebalancing Gel Cream SPF15",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1510,
    "sell": 1510,
    "mrp": 1510,
    "low": 3
  },
  {
    "id": "prod_35",
    "barcode": "8435618906185",
    "name": "Jeannot Skin Reviving Cream 200 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 2500,
    "sell": 2500,
    "mrp": 2500,
    "low": 3
  },
  {
    "id": "prod_36",
    "barcode": "8435618900473",
    "name": "Jeannot Soft Cleansing Gel 1000 ml",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3150,
    "sell": 3150,
    "mrp": 3150,
    "low": 3
  },
  {
    "id": "prod_37",
    "barcode": "8435618900480",
    "name": "Jeannot Soft Cleansing Gel 200 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1450,
    "sell": 1450,
    "mrp": 1450,
    "low": 3
  },
  {
    "id": "prod_38",
    "barcode": "8436542368162",
    "name": "Jeannot Triple Concentrate Peel 30 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1910,
    "sell": 1910,
    "mrp": 1910,
    "low": 3
  },
  {
    "id": "prod_39",
    "barcode": "S123",
    "name": "Jeannot Ultra Bright Eye Contour 15 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1530,
    "sell": 1530,
    "mrp": 1530,
    "low": 3
  },
  {
    "id": "prod_40",
    "barcode": "8436542368186",
    "name": "Jeannot Ultra Soothing Mask 50 ml",
    "brand": "Jeannot",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 1260,
    "sell": 1260,
    "mrp": 1260,
    "low": 3
  },
  {
    "id": "prod_41",
    "barcode": "8436542368322",
    "name": "Jeannot Vitamin C Brightening Programme 6 treat.",
    "brand": "jeannot professional",
    "category": "Skin Care & Facials",
    "stock": 10,
    "buy": 3650,
    "sell": 3650,
    "mrp": 3650,
    "low": 3
  },
  {
    "id": "prod_42",
    "barcode": "8901526509355",
    "name": "LP Absolut Repair mask 250 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 990,
    "sell": 990,
    "mrp": 990,
    "low": 3
  },
  {
    "id": "prod_43",
    "barcode": "8901526509362",
    "name": "LP Absolut Repair mask 490 g",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 1590,
    "sell": 1590,
    "mrp": 1590,
    "low": 3
  },
  {
    "id": "prod_44",
    "name": "LP Absolut Repair Molecular Mask 490G",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 0,
    "sell": 0,
    "mrp": 0,
    "low": 3
  },
  {
    "id": "prod_45",
    "barcode": "3474637188207",
    "name": "LP Absolut Repair Molecular Shampoo 1500 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 4500,
    "sell": 4500,
    "mrp": 4500,
    "low": 3
  },
  {
    "id": "prod_46",
    "barcode": "8901526509379",
    "name": "LP Absolut Repair shampoo 1500 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 2350,
    "sell": 2350,
    "mrp": 2350,
    "low": 3
  },
  {
    "id": "prod_47",
    "barcode": "8901526509386",
    "name": "LP Absolut Repair shampoo 300 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 750,
    "sell": 750,
    "mrp": 750,
    "low": 3
  },
  {
    "id": "prod_48",
    "barcode": "8901526509195",
    "name": "LP Vitamino Colour Mask 250 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 990,
    "sell": 990,
    "mrp": 990,
    "low": 3
  },
  {
    "id": "prod_49",
    "name": "LP Vitamino Colour Mask 490 g",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 0,
    "sell": 0,
    "mrp": 0,
    "low": 3
  },
  {
    "id": "prod_50",
    "barcode": "8901526509218",
    "name": "LP Vitamino Colour Shampoo 1500 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 2350,
    "sell": 2350,
    "mrp": 2350,
    "low": 3
  },
  {
    "id": "prod_51",
    "barcode": "8901526509225",
    "name": "LP Vitamino Colour Shampoo 300 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 845,
    "sell": 845,
    "mrp": 845,
    "low": 3
  },
  {
    "id": "prod_52",
    "name": "LP Vitamino Colour Spectrum Mask",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 2500,
    "sell": 2500,
    "mrp": 2500,
    "low": 3
  },
  {
    "id": "prod_53",
    "barcode": "3474637268459",
    "name": "LP Vitamino Colour Spectrum Mask 250 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 1600,
    "sell": 1600,
    "mrp": 1600,
    "low": 3
  },
  {
    "id": "prod_54",
    "name": "LP Vitamino Colour Spectrum Mask 750 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 0,
    "sell": 0,
    "mrp": 0,
    "low": 3
  },
  {
    "id": "prod_55",
    "barcode": "3474637268510",
    "name": "LP Vitamino Colour Spectrum Shampoo 300 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 1490,
    "sell": 1490,
    "mrp": 1490,
    "low": 3
  },
  {
    "id": "prod_56",
    "barcode": "3474637268497",
    "name": "LP Vitamino Colour Spectrum Shampoo 1500 ml",
    "brand": "LP",
    "category": "Hair Care & Shampoo",
    "stock": 10,
    "buy": 4500,
    "sell": 4500,
    "mrp": 4500,
    "low": 3
  }
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
    inventory: (() => {
      const incomingList = Array.isArray(incoming.inventory) ? incoming.inventory : [];
      if (incomingList.length === 0) return DEFAULT_DATA.inventory;
      const existingKeys = new Set(incomingList.map((item: any) => (item.barcode || item.name || '').toLowerCase().trim()));
      const missingDefaults = DEFAULT_DATA.inventory.filter((item: any) => {
        const key = (item.barcode || item.name || '').toLowerCase().trim();
        return key && !existingKeys.has(key);
      });
      return [...incomingList, ...missingDefaults];
    })(),
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
