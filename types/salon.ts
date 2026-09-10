// types/salon.ts

export interface SalonSettings {
  salon: string;
  whatsapp: string;
  open: string;
  close: string;
  address: string;
  custR1: number;
  custR2: number;
  staffR: number;
  printer: 'both' | '80' | '58' | 'a4';
  payments: string[];
  // Loyalty
  loyaltyEnabled?: boolean;
  loyaltyEarnRate?: number;   // ₹ spent per 1 point earned (e.g. 100 → spend ₹100 earn 1 pt)
  loyaltyRedeemRate?: number; // points per ₹1 discount (e.g. 10 → 10 pts = ₹1)
  loyaltyMinRedeem?: number;  // minimum points to redeem at once
  // Wallet
  walletEnabled?: boolean;
  // WhatsApp Settings
  whatsappMode?: 'web' | 'app'; // 'web' for web.whatsapp.com, 'app' for wa.me
  googleReviewLink?: string;
  whatsappAccessToken?: string; // Meta Cloud API Bearer Token
  whatsappPhoneId?: string;     // Meta Cloud API Phone Number ID
  whatsappBusinessAccountId?: string;
  autoSendPdfWhatsApp?: boolean; // Auto-send PDF when bill is saved
  // Auto Milestone Wishing
  autoWishMilestones?: boolean; // Auto-send greetings on Birthday, Sagai & Wedding dates
  autoWishBirthdays?: boolean;
  autoWishAnniversaries?: boolean;
  autoWishSagai?: boolean;
  birthdayWishDiscount?: number; // e.g. 15 for 15% discount
  birthdayWishTemplate?: string;
  anniversaryWishTemplate?: string;
  sagaiWishTemplate?: string;
  lastAutoWishDate?: string; // YYYY-MM-DD
  whatsappTemplates?: Record<string, string>;
  // Resend Email Settings
  resendApiKey?: string;
  resendFromEmail?: string;
  emailNotificationsEnabled?: boolean;
  emailRemindersEnabled?: boolean;
  emailConfirmationsEnabled?: boolean;
  emailWishesEnabled?: boolean;
  // Security & Admin Credentials
  adminPassword?: string;
  // Google Calendar Cloud Auto-Sync (Official Google Calendar API v3)
  googleCalendarEnabled?: boolean;
  googleCalendarOwnerEmail?: string;
  googleCalendarId?: string; // Calendar ID (e.g. primary or xxx@group.calendar.google.com)
  googleCalendarWebhookUrl?: string; // Webhook (Google Apps Script / Zapier / Make)
  googleServiceAccountEmail?: string; // Service Account client_email
  googlePrivateKey?: string; // Service Account private_key PEM
  googleClientId?: string; // OAuth 2.0 Client ID
  googleClientSecret?: string; // OAuth 2.0 Client Secret
  googleRefreshToken?: string; // OAuth 2.0 Refresh Token
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string;
  description?: string;
}

export interface Staff {
  id: string;
  name: string;
  mobile: string;
  role: string;
  services: string;
  serviceCommission?: number; // % of service revenue
  productCommission?: number; // % of product revenue
  salary?: number;            // fixed monthly salary
  joiningDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  birthday?: string;
  anniversary?: string; // Wedding Date
  engagementDate?: string; // Sagai / Engagement Date
  sagaiDate?: string; // Alias
  notes?: string;
  address?: string;
  gstin?: string;
  openingBalance?: number;
  openingBalanceType?: 'To Receive' | 'To Pay';
  // Loyalty & Wallet
  loyaltyPoints?: number;
  walletBalance?: number;
  membershipId?: string;
  membershipExpiry?: string;
  lastWishedDates?: Record<string, string>; // e.g. { "birthday_2026": "2026-08-30" }
  // CRM analytics (computed, not stored)
  totalVisits?: number;
  totalSpend?: number;
  lastVisit?: string;
}

export type AppointmentStatus = 'Confirmed' | 'Pending' | 'Cancelled' | 'Completed' | 'Not Attempted';
export type WorkStatus = 'Booked' | 'In Service' | 'Completed' | 'Billed' | 'Cancelled' | 'Not Attempted';

export interface Appointment {
  id: string;
  date: string;
  time: string;
  customer: string;
  mobile: string;
  email?: string;
  service: string;
  price?: number;
  staff: string;
  advance: number;
  advanceMode?: string;
  status: AppointmentStatus;
  workStatus?: WorkStatus;
  serviceStartedAt?: string;
  serviceCompletedAt?: string;
  invoiceId?: string;
  billedAt?: string;
  notes: string;
}

export interface InvoiceLine {
  type: 'S' | 'P';
  productId?: string;
  barcode?: string;
  name: string;
  qty: number;
  price: number;
  discount?: number;
  discountType?: '₹' | '%';
  mrp?: number;
  expiry?: string;
  taxRate?: number;
  hsnCode?: string;
  staff?: string; // which staff performed this service
}

export interface Invoice {
  id: string;
  no: string;
  date: string;
  customer: string;
  mobile: string;
  appointmentId?: string;
  bridalBookingId?: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  itemDiscountTotal?: number;
  serviceDiscountTotal?: number;
  productDiscountTotal?: number;
  total: number;
  advance: number;
  advanceMode?: string;
  paid: number;
  balance: number;
  mode: string;
  splitPayment?: {
    cash?: number;
    upi?: number;
    card?: number;
    wallet?: number;
    upiMode?: string;
  };
  roundOff?: number;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  walletAmountUsed?: number;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  supplierId?: string;
  supplierName?: string;
  stock: number;
  buy: number;
  sell: number;
  mrp?: number;
  minSellPrice?: number;
  unit?: string;
  buyDate?: string;
  expiry?: string;
  low: number;
  batch?: string;
  hsnCode?: string;
  taxRate?: number;
}

export interface InventoryTx {
  id: string;
  date: string;
  product: string;
  barcode?: string;
  type: 'Buy' | 'Sell' | 'Adjust' | 'Salon Use' | 'Damage';
  qty: number;
  rate: number;
  mrp?: number;
  buyDate?: string;
  party: string;
  purchaseNo?: string;
  invoiceNo?: string;
  batch?: string;
  expiry?: string;
  gst?: number;
}

export type AdjustmentReason =
  | 'Physical Count Correction'
  | 'Salon In-House Usage'
  | 'Damaged / Broken'
  | 'Tester / Sample'
  | 'Expired';

export interface StockAdjustment {
  id: string;
  date: string;
  productId: string;
  productName: string;
  barcode?: string;
  type: 'Add' | 'Reduce';
  qty: number;
  reason: AdjustmentReason;
  staff?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  opening?: number;
  openingBalanceType?: 'To Pay' | 'To Receive';
  paymentTerms?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
  notes?: string;
}

export interface PurchaseLine {
  barcode?: string;
  name: string;
  batch?: string;
  buyDate?: string;
  expiry?: string;
  qty: number;
  rate: number;
  mrp?: number;
  gst?: number;
  hsnCode?: string;
}

export interface Purchase {
  id: string;
  no: string;
  date: string;
  supplierId: string;
  supplier: string;
  supplierInvoice?: string;
  dueDate?: string;
  lines: PurchaseLine[];
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  mode: string;
  notes?: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNo: string;
  type: 'Payment-In' | 'Payment-Out';
  partyType: 'Customer' | 'Supplier';
  partyId: string;
  partyName: string;
  partyMobile?: string;
  date: string;
  amount: number;
  mode: string;
  referenceNo?: string;
  linkedDocNo?: string; // Purchase No or Invoice No
  notes?: string;
}

export interface Expense {
  id: string;
  expenseNo: string;
  date: string;
  category:
    | 'Rent'
    | 'Electricity & Utilities'
    | 'Staff Tea & Refreshments'
    | 'Laundry & Towels'
    | 'Housekeeping & Cleaning'
    | 'Marketing & Ads'
    | 'Salon Maintenance'
    | 'Staff Bonus / Incentives'
    | 'Other Expense';
  amount: number;
  mode: string;
  paidTo?: string;
  notes?: string;
}

export interface BridalPackage {
  id: string;
  type: 'Bridal Package' | 'Siders Package' | 'Makeup Package' | string;
  name: string;
  sessions: number;
  includes: string;
  price: number;
}

export interface BridalBooking {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  venue?: string;
  event?: string;
  date: string;
  birthday?: string;
  weddingDate?: string;
  weddingTime?: string;
  sagaiDate?: string;
  sagaiTime?: string;
  mandapDate?: string;
  mandapTime?: string;
  musicDate?: string;
  musicTime?: string;
  otherEventName?: string;
  otherDate?: string;
  otherTime?: string;
  // Function selection flags for billing
  includeWedding?: boolean;
  includeSagai?: boolean;
  includeMandap?: boolean;
  includeMusic?: boolean;
  includeOther?: boolean;
  selectedEvents?: string[];
  packageType?: string;
  packageId?: string;
  packageName?: string;
  packageSessions?: number;
  packageIncludes?: string;
  package: number;
  totalAmount?: number;
  advance: number;
  advanceAccount?: string;
  advanceMode?: string;
  balance: number;
  status?: string;
  notes?: string;
}

// ── Loyalty ──────────────────────────────────────────────────────────────────
export type LoyaltyTxType = 'Earned' | 'Redeemed' | 'Adjusted' | 'Expired';

export interface LoyaltyTransaction {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  type: LoyaltyTxType;
  points: number;           // positive = credit, negative = debit
  invoiceNo?: string;
  notes?: string;
}

// ── Wallet ────────────────────────────────────────────────────────────────────
export type WalletTxType = 'Top-Up' | 'Redeemed' | 'Refund' | 'Adjusted';

export interface WalletTransaction {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  type: WalletTxType;
  amount: number;           // positive = credit, negative = debit
  balanceAfter: number;
  invoiceNo?: string;
  mode?: string;            // for top-ups: Cash / UPI / Card
  notes?: string;
}

// ── Membership ────────────────────────────────────────────────────────────────
export interface MembershipPlan {
  id: string;
  name: string;             // e.g. Silver, Gold, VIP
  price: number;            // plan cost
  validityDays: number;     // e.g. 365
  discountPercent: number;  // e.g. 10 for 10% off all services
  perks?: string;           // text description of perks
  color?: string;           // badge color
}

export interface CustomerMembership {
  id: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  startDate: string;
  expiryDate: string;
  paidAmount: number;
  mode?: string;
  notes?: string;
}

// ── Staff Attendance ───────────────────────────────────────────────────────────
export interface AttendanceLog {
  id: string;
  staffId: string;
  staffName: string;
  date: string;             // ISO date YYYY-MM-DD
  checkIn?: string;         // HH:mm
  checkOut?: string;        // HH:mm
  status: 'Present' | 'Absent' | 'Half Day' | 'Leave';
  notes?: string;
}

export type UserRole = 'Admin' | 'Salesperson';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  createdAt?: string;
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────
export interface BankAccount {
  id: string;
  name: string;           // e.g. "HDFC Bank", "SBI Savings"
  accountNo?: string;
  ifsc?: string;
  bankName?: string;
  branch?: string;
  upiId?: string;
  openingBalance?: number;
  isActive?: boolean;
}

// ── Account Transfers (Cash ↔ Bank) ──────────────────────────────────────────
export interface AccountTransfer {
  id: string;
  transferNo: string;     // e.g. "TRF-1001"
  date: string;
  from: string;           // "cash" or bank account id
  fromName: string;       // "Cash" or "HDFC Bank"
  to: string;             // "cash" or bank account id
  toName: string;         // "SBI Savings"
  amount: number;
  notes?: string;
}

// ── Studio Holidays & Blocked / Full Booking Dates ───────────────────────────
export type HolidayType = 'Holiday' | 'Full Booking' | 'Closed' | 'Maintenance';

export interface StudioHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // Optional end date for multi-day holiday
  type: HolidayType;
  reason: string;
  notes?: string;
  createdAt?: string;
}

// ── Main SalonData ────────────────────────────────────────────────────────────
export interface SalonData {
  settings: SalonSettings;
  services: Service[];
  staff: Staff[];
  customers: Customer[];
  appointments: Appointment[];
  invoices: Invoice[];
  inventory: InventoryItem[];
  inventoryTx: InventoryTx[];
  adjustments?: StockAdjustment[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseSeq: number;
  vouchers?: PaymentVoucher[];
  voucherSeq?: number;
  expenses?: Expense[];
  expenseSeq?: number;
  bridalPackages: BridalPackage[];
  bridal: BridalBooking[];
  invoiceSeq: number;
  // New collections
  loyaltyTx?: LoyaltyTransaction[];
  walletTx?: WalletTransaction[];
  memberships?: MembershipPlan[];
  customerMemberships?: CustomerMembership[];
  attendance?: AttendanceLog[];
  users?: UserAccount[];
  // Bank & Transfers
  bankAccounts?: BankAccount[];
  accountTransfers?: AccountTransfer[];
  transferSeq?: number;
  // Holidays & Blocked Dates
  holidays?: StudioHoliday[];
}
