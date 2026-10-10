// lib/navigation.ts
import {
  LayoutDashboard, Calendar, Users, Receipt, Package,
  ShoppingBag, Building2, Heart, UserCog, Bell, BarChart3, Settings,
  Sparkles, MessageCircle, BookOpen, Instagram, MapPin, Tv, Palette, LucideIcon
} from 'lucide-react';

export interface NavItem {
  id: string;
  href: string;
  label: string;
  gujarati?: string;
  icon: LucideIcon;
  iconName: string;
  role: 'all' | 'admin';
  description: string;
  badge?: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    href: '/admin',
    label: 'Dashboard',
    gujarati: 'ડેશબોર્ડ',
    icon: LayoutDashboard,
    iconName: 'LayoutDashboard',
    role: 'all',
    description: 'Overview, today’s appointments & real-time revenue stats',
  },
  {
    id: 'appointments',
    href: '/admin/appointments',
    label: 'Appointments',
    gujarati: 'એપોઇન્ટમેન્ટ્સ',
    icon: Calendar,
    iconName: 'Calendar',
    role: 'all',
    description: 'Daily appointment scheduling, calendar view & staff allotment',
  },
  {
    id: 'bridal',
    href: '/admin/bridal',
    label: 'Bridal Bookings',
    gujarati: 'બ્રાઇડલ બુકિંગ્સ',
    icon: Heart,
    iconName: 'Heart',
    role: 'all',
    description: 'Bridal & Groom packages, multi-event schedules & advances',
    badge: '★',
  },
  {
    id: 'customers',
    href: '/admin/customers',
    label: 'Customers',
    gujarati: 'ગ્રાહક લિસ્ટ',
    icon: Users,
    iconName: 'Users',
    role: 'all',
    description: 'Customer directory, service history, loyalty points & wallet',
  },
  {
    id: 'billing',
    href: '/admin/billing',
    label: 'Billing (POS)',
    gujarati: 'બિલિંગ (POS)',
    icon: Receipt,
    iconName: 'Receipt',
    role: 'all',
    description: 'Fast counter billing, GST calculations & thermal invoice prints',
  },
  {
    id: 'whatsapp',
    href: '/admin/whatsapp',
    label: 'WhatsApp',
    gujarati: 'વોટ્સએપ ઓટોમેશન',
    icon: MessageCircle,
    iconName: 'MessageCircle',
    role: 'all',
    description: '1-Click invoice PDFs, appointment reminders & festive promos',
  },
  {
    id: 'instagram',
    href: '/admin/instagram',
    label: 'Instagram Auto',
    gujarati: 'ઇન્સ્ટાગ્રામ ઓટો',
    icon: Instagram,
    iconName: 'Instagram',
    role: 'all',
    description: 'Instagram feed sync, hashtags, reels & bridal promotions',
  },
  {
    id: 'google-maps',
    href: '/admin/google-maps',
    label: 'Google Map Auto',
    gujarati: 'ગૂગલ મેપ ઓટો',
    icon: MapPin,
    iconName: 'MapPin',
    role: 'all',
    description: 'Google Maps reviews sync, local SEO & automated 5-star replies',
  },
  {
    id: 'ai-poster',
    href: '/admin/ai-poster',
    label: 'AI Poster',
    gujarati: 'એઆઈ પોસ્ટર',
    icon: Palette,
    iconName: 'Palette',
    role: 'all',
    description: 'Luxury salon posters, festive offer flyers, Instagram stories & HD banners',
    badge: 'AI',
  },
  {
    id: 'finance',
    href: '/admin/finance',
    label: 'Finance & Rojmel',
    gujarati: 'રોજમેળ / હિસાબ',
    icon: BookOpen,
    iconName: 'BookOpen',
    role: 'admin',
    description: 'Daily cash Rojmel, salon expenses, profits & cashbook ledger',
  },
  {
    id: 'services',
    href: '/admin/services',
    label: 'Services & Menu',
    gujarati: 'સર્વિસ મેનૂ & ભાવ',
    icon: Sparkles,
    iconName: 'Sparkles',
    role: 'admin',
    description: 'Treatment price list, hair/skin categories & custom duration',
  },
  {
    id: 'inventory',
    href: '/admin/inventory',
    label: 'Inventory',
    gujarati: 'સ્ટોક / વપરાશ',
    icon: Package,
    iconName: 'Package',
    role: 'all',
    description: 'Salon products stock, consumption tracking & low-stock alerts',
  },
  {
    id: 'purchases',
    href: '/admin/purchases',
    label: 'Product Purchase',
    gujarati: 'પ્રોડક્ટ ખરીદી',
    icon: ShoppingBag,
    iconName: 'ShoppingBag',
    role: 'all',
    description: 'Vendor purchase inward bills, cosmetics orders & inventory entry',
  },
  {
    id: 'suppliers',
    href: '/admin/suppliers',
    label: 'Suppliers',
    gujarati: 'સપ્લાયર્સ / પાર્ટી',
    icon: Building2,
    iconName: 'Building2',
    role: 'admin',
    description: 'Product distributors, vendor contacts & ledger balances',
  },
  {
    id: 'staff',
    href: '/admin/staff',
    label: 'Staff & Users',
    gujarati: 'સ્ટાફ & કમિશન',
    icon: UserCog,
    iconName: 'UserCog',
    role: 'admin',
    description: 'Staff attendance, service commission calculations & login roles',
  },
  {
    id: 'reminders',
    href: '/admin/reminders',
    label: 'Reminders',
    gujarati: 'રિમાઇન્ડર્સ',
    icon: Bell,
    iconName: 'Bell',
    role: 'admin',
    description: 'Customer follow-up reminders, milestone dates & touchpoints',
  },
  {
    id: 'reports',
    href: '/admin/reports',
    label: 'Reports & GST',
    gujarati: 'રિપોર્ટ્સ & GST',
    icon: BarChart3,
    iconName: 'BarChart3',
    role: 'admin',
    description: 'Monthly business analytics, revenue charts & GST export',
  },
  {
    id: 'settings',
    href: '/admin/settings',
    label: 'Settings',
    gujarati: 'સેટિંગ્સ',
    icon: Settings,
    iconName: 'Settings',
    role: 'admin',
    description: 'Salon info, Google Calendar sync, printers, logo & security',
  },
];

export const DEFAULT_NAV_ORDER: string[] = DEFAULT_NAV_ITEMS.map((item) => item.id);

/**
 * Returns the navigation list sorted according to customOrder IDs.
 * Any missing default items are automatically appended at the bottom.
 */
export function getSortedNavItems(customOrder?: string[]): NavItem[] {
  if (!customOrder || !Array.isArray(customOrder) || customOrder.length === 0) {
    return [...DEFAULT_NAV_ITEMS];
  }

  const itemMap = new Map<string, NavItem>();
  DEFAULT_NAV_ITEMS.forEach((item) => {
    itemMap.set(item.id, item);
  });

  const sorted: NavItem[] = [];
  const visited = new Set<string>();

  // Add items according to custom order
  for (const id of customOrder) {
    const item = itemMap.get(id);
    if (item && !visited.has(id)) {
      sorted.push(item);
      visited.add(id);
    }
  }

  // Append any new or remaining default items not present in custom order
  for (const item of DEFAULT_NAV_ITEMS) {
    if (!visited.has(item.id)) {
      sorted.push(item);
      visited.add(item.id);
    }
  }

  return sorted;
}

/**
 * Move item from one index to another in an array of strings
 */
export function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

/**
 * Move item up or down by 1 step
 */
export function moveItemDirection(order: string[], index: number, direction: 'up' | 'down'): string[] {
  if (direction === 'up' && index > 0) {
    return reorderArray(order, index, index - 1);
  }
  if (direction === 'down' && index < order.length - 1) {
    return reorderArray(order, index, index + 1);
  }
  return order;
}

/**
 * Move item to top or bottom
 */
export function moveItemToEdge(order: string[], index: number, edge: 'top' | 'bottom'): string[] {
  if (edge === 'top' && index > 0) {
    return reorderArray(order, index, 0);
  }
  if (edge === 'bottom' && index < order.length - 1) {
    return reorderArray(order, index, order.length - 1);
  }
  return order;
}
