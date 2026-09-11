// lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SalonData, BridalPackage, MembershipPlan, UserAccount } from '@/types/salon';
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
  // Makeup Packages (Custom Sessions)
  { id: 'makeup-hd-party', type: 'Makeup Package', name: 'HD Party & Occasion Makeup', price: 3500, sessions: 1, includes: 'HD Makeup, Hairstyle, Draping & Eyelashes' },
  { id: 'makeup-engagement-sangeet', type: 'Makeup Package', name: 'Engagement & Sangeet Makeup', price: 15000, sessions: 2, includes: '2 Sessions Makeup, Hairstyle, Jewellery Setting & Draping' },
  { id: 'makeup-airbrush-bridal', type: 'Makeup Package', name: 'Airbrush HD Bridal Makeup', price: 35000, sessions: 3, includes: '3 Sessions Airbrush HD Makeup, Hairstyling, Lenses & Draping' },
  { id: 'mtvjixej1844l', type: 'Makeup Package', name: 'Make-up (Engagement / Sangeet)', price: 15000, sessions: 2, includes: 'Makeup, hairstyle, draping, eyelashes and lenses' },
  { id: 'mtvjji3ffcy49', type: 'Makeup Package', name: 'Make-up (Bridal & Reception)', price: 20000, sessions: 2, includes: 'Makeup, hairstyle, draping, eyelashes and lenses' },
];

export const DEFAULT_MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: 'mem-silver', name: 'Silver', price: 1999, validityDays: 180, discountPercent: 5, color: '#9ca3af', perks: '5% off on all services, Priority booking' },
  { id: 'mem-gold', name: 'Gold', price: 3999, validityDays: 365, discountPercent: 10, color: '#f59e0b', perks: '10% off on all services, Free birthday facial, Priority booking' },
  { id: 'mem-vip', name: 'VIP', price: 7999, validityDays: 365, discountPercent: 15, color: '#8b5cf6', perks: '15% off on all services, Free birthday + anniversary facial, Complimentary threading, Priority booking' },
];

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    name: 'Studio Owner (Admin)',
    email: 'shree@admin.com',
    password: 'shree1234',
    role: 'Admin',
    createdAt: '2026-01-01',
  },
  {
    id: 'user-sales',
    name: 'Sales Executive',
    email: 'sales@shree.com',
    password: 'sales1234',
    role: 'Salesperson',
    createdAt: '2026-01-01',
  },
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
    printer: '58',
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
    googleCalendarOwnerEmail: 'bhalanisandip@gmail.com',
  },
  services: [
    {
      id: 'mthj3pou0ktv4',
      name: 'Hair Cut & Style',
      price: 350,
      category: 'Hair Care & Styling',
      duration: 30,
      description: 'Hair wash, cut & blowdry styling',
    },
    {
      id: 'mthj3pougzpyx',
      name: 'Hair Spa Treatment',
      price: 850,
      category: 'Hair Care & Styling',
      duration: 45,
      description: 'Deep nourishing hair spa mask',
    },
    {
      id: 'mthj3pouc66cv',
      name: 'Keratin Smooth Treatment',
      price: 3500,
      category: 'Hair Care & Styling',
      duration: 120,
      description: 'Frizz control & hair smoothing',
    },
    {
      id: 'mthj3pouobl3b',
      name: 'Root Touchup / Gray Coverage',
      price: 1200,
      category: 'Hair Care & Styling',
      duration: 60,
      description: "L'Oreal professional root color",
    },
    {
      id: 'mthj3pouniuzd',
      name: 'Global Hair Coloring',
      price: 2800,
      category: 'Hair Care & Styling',
      duration: 90,
      description: 'Full length global hair color',
    },
    {
      id: 'mthj3pou6tt7h',
      name: 'Hair Rebonding / Smoothening',
      price: 4200,
      category: 'Hair Care & Styling',
      duration: 150,
      description: 'Permanent hair straightening',
    },
    {
      id: 'mthj3pou1own7',
      name: 'Herbal Deep Cleanup',
      price: 450,
      category: 'Skin Care & Facials',
      duration: 30,
      description: 'Deep cleansing & exfoliation',
    },
    {
      id: 'mthj3pouyccs0',
      name: 'Fruit Glow Facial',
      price: 850,
      category: 'Skin Care & Facials',
      duration: 45,
      description: 'Natural fruit extract facial',
    },
    {
      id: 'mthj3pou3s32d',
      name: 'Gold Radiance Facial',
      price: 1500,
      category: 'Skin Care & Facials',
      duration: 60,
      description: '24K gold foil glow facial',
    },
    {
      id: 'mthj3pou72gss',
      name: 'Diamond Insta-Glow Facial',
      price: 2200,
      category: 'Skin Care & Facials',
      duration: 60,
      description: 'Skin brightening diamond facial',
    },
    {
      id: 'mthj3pou00a7i',
      name: 'Full Face Bleach & Pack',
      price: 350,
      category: 'Skin Care & Facials',
      duration: 25,
      description: 'Insta bleach with cooling face pack',
    },
    {
      id: 'mthj3pouyzh8b',
      name: 'Eyebrow & Upper Lip Threading',
      price: 80,
      category: 'Waxing & Threading',
      duration: 15,
      description: 'Precision threading shaping',
    },
    {
      id: 'mthj3pougqclr',
      name: 'Full Arms + Underarms Rica Wax',
      price: 650,
      category: 'Waxing & Threading',
      duration: 30,
      description: 'Rica peel-off wax for sensitive skin',
    },
    {
      id: 'mthj3pouzgszl',
      name: 'Full Legs Honey Wax',
      price: 550,
      category: 'Waxing & Threading',
      duration: 30,
      description: 'Smooth legs waxing',
    },
    {
      id: 'mthj3pou3irar',
      name: 'Full Body Waxing Package',
      price: 1800,
      category: 'Waxing & Threading',
      duration: 90,
      description: 'Full body smooth waxing',
    },
    {
      id: 'mthj3pouwi341',
      name: 'Classic Pedicure',
      price: 550,
      category: 'Hands, Feet & Nails',
      duration: 40,
      description: 'Relaxing foot soak, scrub & polish',
    },
    {
      id: 'mthj3pou67ai2',
      name: 'Spa Manicure & Pedicure Combo',
      price: 1100,
      category: 'Hands, Feet & Nails',
      duration: 60,
      description: 'Deluxe spa hands & feet treatment',
    },
  ],
  staff: [
    {
      id: 'st1',
      name: 'Amita',
      mobile: '9824183769',
      role: 'Beautician',
      services: 'Skin, Hair',
      serviceCommission: 0,
      productCommission: 0,
    },
    {
      id: 'st2',
      name: 'Bhavna',
      mobile: '9824183769',
      role: 'Beautician',
      services: 'Bridal, Draping, Hair',
      serviceCommission: 0,
      productCommission: 0,
    },
  ],
  customers: [
    {
      id: 'mtol0qvjc9oqe',
      name: 'SANDIP',
      email: 'bhalanisandip@gmail.com',
      mobile: '9601014899',
      birthday: '1987-08-30',
      sagaiDate: '2006-03-26',
      anniversary: '2007-11-26',
      loyaltyPoints: 200,
      walletBalance: 0,
    },
    {
      id: 'mtr4b290502ji',
      name: 'Pooja Varma',
      mobile: '9824183769',
      lastVisit: '2026-11-20',
      anniversary: '2026-11-20',
      totalVisits: 2,
    },
    {
      id: 'mtvhhis0ynyng',
      name: 'niti',
      mobile: '9316531885',
      anniversary: '2026-12-14',
      loyaltyPoints: 0,
      walletBalance: 0,
    },
    {
      id: 'mtvhjm1udqakq',
      name: 'sneha',
      mobile: '9173421350',
      anniversary: '2026-12-12',
      loyaltyPoints: 0,
      walletBalance: 0,
    },
    {
      id: 'mtsmxi8638680',
      name: '👑 Raahi (BRIDAL)',
      mobile: '9825339924',
      lastVisit: '2026-12-23',
      anniversary: '2026-12-23',
      totalVisits: 1,
    },
    {
      id: 'mtsnuuy8arpzu',
      name: 'Vraj Savani',
      email: 'ku2407u702@karnavatiuniversity.edu.in',
      mobile: '9898253706',
      lastVisit: '2026-09-08',
      totalSpend: 0,
      totalVisits: 2,
    },
  ],
  appointments: [],
  invoices: [],
  bridal: [],
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
  invoiceSeq: 1001,
  // New collections
  loyaltyTx: [],
  walletTx: [],
  memberships: DEFAULT_MEMBERSHIP_PLANS,
  customerMemberships: [],
  attendance: [],
  users: DEFAULT_USERS,
  // Bank & Transfers
  bankAccounts: [],
  accountTransfers: [],
  transferSeq: 1001,
  // Studio Holidays & Blocked Dates
  holidays: [],
};

export function mergeWithDefaults(incoming?: Partial<SalonData> | null): SalonData {
  if (!incoming || typeof incoming !== 'object') return DEFAULT_DATA;
  return {
    settings: {
      ...DEFAULT_DATA.settings,
      ...(incoming.settings || {}),
      payments: incoming.settings?.payments?.length ? incoming.settings.payments : DEFAULT_DATA.settings.payments,
    },
    services: (() => {
      const inc = Array.isArray(incoming.services) ? incoming.services : [];
      if (inc.length === 0 || inc.some((s) => s.id === 's1' || s.id === 's2' || s.id === 's10')) {
        return DEFAULT_DATA.services;
      }
      return inc;
    })(),
    staff: (() => {
      const inc = Array.isArray(incoming.staff) ? incoming.staff : [];
      if (inc.length === 0 || inc.some((s) => s.name === 'Neha' || (s.name === 'Pooja' && s.id === 'st2'))) {
        return DEFAULT_DATA.staff;
      }
      return inc;
    })(),
    customers: Array.isArray(incoming.customers) ? incoming.customers : DEFAULT_DATA.customers,
    appointments: Array.isArray(incoming.appointments) ? incoming.appointments : [],
    invoices: Array.isArray(incoming.invoices) ? incoming.invoices : [],
    inventory: (() => {
      const incomingList = Array.isArray(incoming.inventory) ? incoming.inventory : [];
      const itemMap = new Map<string, any>();
      
      // 1. Put all default products (all 56 items) first
      DEFAULT_DATA.inventory.forEach((item) => {
        const key = (item.barcode || item.name || '').toLowerCase().trim();
        if (key) itemMap.set(key, item);
      });

      // 2. Overlay incoming list (user stock modifications or custom added products)
      incomingList.forEach((item: any) => {
        const key = (item.barcode || item.name || '').toLowerCase().trim();
        if (key) {
          const defaultItem = itemMap.get(key);
          itemMap.set(key, { ...(defaultItem || {}), ...item });
        } else if (item.id) {
          itemMap.set(item.id, item);
        }
      });

      return Array.from(itemMap.values());
    })(),
    inventoryTx: Array.isArray(incoming.inventoryTx) ? incoming.inventoryTx : [],
    adjustments: Array.isArray(incoming.adjustments) ? incoming.adjustments : [],
    suppliers: Array.isArray(incoming.suppliers) ? incoming.suppliers : [],
    purchases: Array.isArray(incoming.purchases) ? incoming.purchases : [],
    purchaseSeq: typeof incoming.purchaseSeq === 'number' ? incoming.purchaseSeq : 1001,
    vouchers: Array.isArray(incoming.vouchers) ? incoming.vouchers : [],
    voucherSeq: typeof incoming.voucherSeq === 'number' ? incoming.voucherSeq : 1001,
    expenses: Array.isArray(incoming.expenses) ? incoming.expenses : [],
    expenseSeq: typeof incoming.expenseSeq === 'number' ? incoming.expenseSeq : 1001,
    bridalPackages: Array.isArray(incoming.bridalPackages) && incoming.bridalPackages.length ? incoming.bridalPackages : DEFAULT_BRIDAL_PACKAGES,
    bridal: Array.isArray(incoming.bridal) ? incoming.bridal : [],
    invoiceSeq: typeof incoming.invoiceSeq === 'number' ? incoming.invoiceSeq : 1001,
    // New collections
    loyaltyTx: Array.isArray(incoming.loyaltyTx) ? incoming.loyaltyTx : [],
    walletTx: Array.isArray(incoming.walletTx) ? incoming.walletTx : [],
    memberships: Array.isArray(incoming.memberships) && incoming.memberships.length ? incoming.memberships : DEFAULT_MEMBERSHIP_PLANS,
    customerMemberships: Array.isArray(incoming.customerMemberships) ? incoming.customerMemberships : [],
    attendance: Array.isArray(incoming.attendance) ? incoming.attendance : [],
    users: Array.isArray(incoming.users) && incoming.users.length ? incoming.users : DEFAULT_USERS,
    // Bank & Transfers
    bankAccounts: Array.isArray(incoming.bankAccounts) ? incoming.bankAccounts : [],
    accountTransfers: Array.isArray(incoming.accountTransfers) ? incoming.accountTransfers : [],
    transferSeq: typeof incoming.transferSeq === 'number' ? incoming.transferSeq : 1001,
    // Studio Holidays & Blocked Dates
    holidays: Array.isArray(incoming.holidays) ? incoming.holidays : [],
  };
}

interface SalonStore {
  data: SalonData;
  setData: (data: Partial<SalonData>) => void;
  updateData: (updater: (d: SalonData) => SalonData) => void;
  clearAllData: (mode?: 'transactions_only' | 'factory_reset') => void;
  cloudStatus: 'idle' | 'syncing' | 'saved' | 'error' | 'offline';
  setCloudStatus: (s: 'idle' | 'syncing' | 'saved' | 'error' | 'offline') => void;
  lastSynced: string | null;
  setLastSynced: (t: string) => void;
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  logoutUser: () => void;
}

export const useSalonStore = create<SalonStore>()(
  persist(
    (set) => ({
      data: DEFAULT_DATA,
      setData: (incoming) => set({ data: mergeWithDefaults(incoming) }),
      updateData: (updater) => set((s) => ({ data: mergeWithDefaults(updater(s.data)) })),
      clearAllData: (mode = 'transactions_only') => {
        if (mode === 'factory_reset') {
          set({ data: DEFAULT_DATA });
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('shreeSalonV1');
            } catch (e) {
              console.error(e);
            }
          }
        } else {
          set((state) => {
            const cleanInventory = (state.data.inventory || DEFAULT_DATA.inventory).map((item) => ({
              ...item,
              stock: 10,
            }));

            const cleanData: SalonData = {
              ...state.data,
              customers: [],
              appointments: [],
              invoices: [],
              invoiceSeq: 1001,
              bridal: [],
              vouchers: [],
              voucherSeq: 1001,
              expenses: [],
              expenseSeq: 1001,
              purchases: [],
              purchaseSeq: 1001,
              inventory: cleanInventory,
              inventoryTx: [],
              adjustments: [],
              loyaltyTx: [],
              walletTx: [],
              customerMemberships: [],
              attendance: [],
              bankAccounts: [],
              accountTransfers: [],
              transferSeq: 1001,
              holidays: [],
            };
            return { data: cleanData };
          });
        }
      },
      cloudStatus: 'idle',
      setCloudStatus: (s) => set({ cloudStatus: s }),
      lastSynced: null,
      setLastSynced: (t) => set({ lastSynced: t }),
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      logoutUser: () => set({ currentUser: null }),
    }),
    {
      name: 'shreeSalonV1',
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        data: mergeWithDefaults(persistedState?.data),
        currentUser: persistedState?.currentUser ?? null,
      }),
    }
  )
);
