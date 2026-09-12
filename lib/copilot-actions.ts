// lib/copilot-actions.ts
//
// AI Copilot Action Dispatcher for Shree Beauty Studio
// Executes actual tasks in salon store & UI across all modules

import { useSalonStore } from './store';
import { scheduleSave, cloudSave } from './sync';
import { uid, todayISO, money } from './utils';
import { sendBridalRateCardPDFViaWhatsApp } from './bridal-pdf';
import { sendInvoicePDFViaWhatsApp } from './invoice-pdf';
import { Appointment, Invoice, InventoryItem, BridalBooking, Expense, Customer, Service } from '@/types/salon';

export interface CopilotActionResult {
  executed: boolean;
  message: string;
  navigatePath?: string;
  data?: any;
}

export async function executeCopilotAction(
  action: string,
  payload: any,
  toast: (msg: string, type?: 'info' | 'error' | 'success') => void
): Promise<CopilotActionResult> {
  const store = useSalonStore.getState();
  const data = store.data;

  switch (action) {
    // ─────────────────────────────────────────────────────────────
    // 1. APPOINTMENTS
    // ─────────────────────────────────────────────────────────────
    case 'CREATE_APPOINTMENT': {
      const { customer, mobile, service, date, time, staff, notes, advance } = payload;
      if (!customer) {
        return { executed: false, message: 'ગ્રાહકનું નામ ખૂટે છે.' };
      }

      const newAppt: Appointment = {
        id: uid(),
        customer: String(customer).trim(),
        mobile: mobile ? String(mobile).trim() : '',
        service: service ? String(service).trim() : 'Hair Cut & Style',
        date: date || todayISO(),
        time: time || '04:00 PM',
        staff: staff ? String(staff).trim() : (data.staff?.[0]?.name || 'Amita'),
        advance: Number(advance || 0),
        status: 'Confirmed',
        notes: notes || 'Booked via AI Voice Copilot',
      };

      store.updateData((d) => ({
        ...d,
        appointments: [newAppt, ...(d.appointments || [])],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: એપોઇન્ટમેન્ટ બુક થઈ ગઈ — ${newAppt.customer} (${newAppt.date} ${newAppt.time})!`, 'success');
      return { executed: true, message: `${newAppt.customer} માટે એપોઇન્ટમેન્ટ બુક થઈ (${newAppt.service})`, navigatePath: '/admin/appointments', data: newAppt };
    }

    case 'UPDATE_APPOINTMENT_STATUS': {
      const { customer, status, time, date } = payload;
      if (!customer) return { executed: false, message: 'ગ્રાહકનું નામ ખૂટે છે.' };

      let updatedCount = 0;
      store.updateData((d) => {
        const appts = (d.appointments || []).map((a) => {
          if (a.customer.toLowerCase().includes(String(customer).toLowerCase())) {
            updatedCount++;
            return {
              ...a,
              ...(status ? { status: status as any } : {}),
              ...(time ? { time } : {}),
              ...(date ? { date } : {}),
            };
          }
          return a;
        });
        return { ...d, appointments: appts };
      });

      if (updatedCount === 0) {
        return { executed: false, message: `"${customer}" નામે કોઈ એપોઇન્ટમેન્ટ મળી નથી.` };
      }

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: ${customer} ની એપોઇન્ટમેન્ટ અપડેટ થઈ ગઈ (${status || 'Updated'})!`, 'success');
      return { executed: true, message: `${customer} ની એપોઇન્ટમેન્ટ અપડેટ થઈ`, navigatePath: '/admin/appointments' };
    }

    // ─────────────────────────────────────────────────────────────
    // 2. BILLING & INVOICES
    // ─────────────────────────────────────────────────────────────
    case 'CREATE_INVOICE': {
      const { customer, mobile, lines, paymentMode, discount, paid } = payload;
      const custName = customer ? String(customer).trim() : 'Walk-in Client';
      const custMobile = mobile ? String(mobile).trim() : '9898012345';
      const rawLines = Array.isArray(lines) && lines.length > 0
        ? lines
        : [{ name: 'Salon Service', price: 1000, qty: 1 }];

      const subtotal = rawLines.reduce((s: number, l: any) => s + (Number(l.price || 0) * Number(l.qty || 1)), 0);
      const discAmt = Number(discount || 0);
      const total = Math.max(0, subtotal - discAmt);
      const paidAmt = paid !== undefined ? Number(paid) : total;
      const balance = Math.max(0, total - paidAmt);

      const seq = data.invoiceSeq || 1001;
      const invNo = `INV-${seq}`;

      const newInv: Invoice = {
        id: uid(),
        no: invNo,
        date: todayISO(),
        customer: custName,
        mobile: custMobile,
        lines: rawLines.map((l: any) => ({
          name: l.name || 'Service',
          qty: Number(l.qty || 1),
          price: Number(l.price || 0),
          type: 'S',
        })),
        subtotal,
        discount: discAmt,
        total,
        advance: 0,
        paid: paidAmt,
        balance,
        mode: paymentMode || 'GPay UPI',
      };

      store.updateData((d) => ({
        ...d,
        invoiceSeq: seq + 1,
        invoices: [newInv, ...(d.invoices || [])],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: બિલ જનરેટ થઈ ગયું — ${newInv.no} (${money(newInv.total)})!`, 'success');
      return { executed: true, message: `બિલ ${newInv.no} બનાવ્યું (${custName} - ${money(newInv.total)})`, navigatePath: '/admin/billing', data: newInv };
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CUSTOMERS
    // ─────────────────────────────────────────────────────────────
    case 'ADD_CUSTOMER': {
      const { name, mobile, address, birthday, anniversary, notes, openingBalance } = payload;
      if (!name) return { executed: false, message: 'ગ્રાહકનું નામ જરૂરી છે.' };

      const newCust: Customer = {
        id: uid(),
        name: String(name).trim(),
        mobile: mobile ? String(mobile).trim() : '',
        address: address || '',
        birthday: birthday || '',
        anniversary: anniversary || '',
        notes: notes || 'Added via AI Copilot',
        openingBalance: Number(openingBalance || 0),
        openingBalanceType: Number(openingBalance || 0) > 0 ? 'To Receive' : undefined,
        loyaltyPoints: 0,
        walletBalance: 0,
      };

      store.updateData((d) => ({
        ...d,
        customers: [newCust, ...(d.customers || [])],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: નવો ગ્રાહક "${newCust.name}" સેવ થયો!`, 'success');
      return { executed: true, message: `ગ્રાહક ${newCust.name} સેવ થયો`, navigatePath: '/admin/customers', data: newCust };
    }

    // ─────────────────────────────────────────────────────────────
    // 4. EXPENSES
    // ─────────────────────────────────────────────────────────────
    case 'RECORD_EXPENSE': {
      const { category, amount, mode, paidTo, notes } = payload;
      if (!amount || Number(amount) <= 0) {
        return { executed: false, message: 'ખર્ચની રકમ યોગ્ય નથી.' };
      }

      const validCategories: Expense['category'][] = [
        'Rent',
        'Electricity & Utilities',
        'Staff Tea & Refreshments',
        'Laundry & Towels',
        'Housekeeping & Cleaning',
        'Marketing & Ads',
        'Salon Maintenance',
        'Staff Bonus / Incentives',
        'Other Expense',
      ];

      let chosenCategory: Expense['category'] = 'Other Expense';
      if (category) {
        const catStr = String(category).toLowerCase();
        if (catStr.includes('tea') || catStr.includes('ચા') || catStr.includes('નાસ્તો') || catStr.includes('refreshment')) {
          chosenCategory = 'Staff Tea & Refreshments';
        } else if (catStr.includes('rent') || catStr.includes('ભાડું')) {
          chosenCategory = 'Rent';
        } else if (catStr.includes('light') || catStr.includes('લાઈટ') || catStr.includes('power') || catStr.includes('electric')) {
          chosenCategory = 'Electricity & Utilities';
        } else if (catStr.includes('clean') || catStr.includes('સફાઈ')) {
          chosenCategory = 'Housekeeping & Cleaning';
        } else if (catStr.includes('bonus') || catStr.includes('salary') || catStr.includes('પગાર')) {
          chosenCategory = 'Staff Bonus / Incentives';
        } else {
          const match = validCategories.find((c) => c.toLowerCase().includes(catStr));
          if (match) chosenCategory = match;
        }
      }

      const expSeq = (data.expenses?.length || 0) + 101;
      const newExp: Expense = {
        id: uid(),
        expenseNo: `EXP-${expSeq}`,
        date: todayISO(),
        category: chosenCategory,
        amount: Number(amount),
        mode: mode || 'Cash',
        paidTo: paidTo || '',
        notes: notes || 'Recorded via AI Voice Assistant',
      };

      store.updateData((d) => ({
        ...d,
        expenses: [newExp, ...(d.expenses || [])],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: ખર્ચ નોંધાયો — ${chosenCategory}: ${money(newExp.amount)}!`, 'success');
      return { executed: true, message: `ખર્ચ ${money(newExp.amount)} નોંધાયો (${chosenCategory})`, navigatePath: '/admin/expenses', data: newExp };
    }

    // ─────────────────────────────────────────────────────────────
    // 5. INVENTORY & STOCK
    // ─────────────────────────────────────────────────────────────
    case 'ADD_INVENTORY': {
      const { name, category, brand, stock, buy, sell, barcode } = payload;
      if (!name) return { executed: false, message: 'પ્રોડક્ટનું નામ ખૂટે છે.' };

      const newProd: InventoryItem = {
        id: uid(),
        barcode: barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        name: String(name).trim(),
        brand: brand || "L'Oreal Professionnel",
        category: category || 'Hair Care & Shampoo',
        stock: Number(stock !== undefined ? stock : 10),
        buy: Number(buy || 500),
        sell: Number(sell || 750),
        mrp: Math.round(Number(sell || 750) * 1.15),
        buyDate: todayISO(),
        unit: 'Pcs',
        low: 3,
      };

      store.updateData((d) => ({
        ...d,
        inventory: [newProd, ...(d.inventory || [])],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: પ્રોડક્ટ "${newProd.name}" સ્ટોકમાં ઉમેરાઈ (સ્ટોક: ${newProd.stock})!`, 'success');
      return { executed: true, message: `પ્રોડક્ટ ${newProd.name} સ્ટોકમાં ઉમેરી`, navigatePath: '/admin/inventory', data: newProd };
    }

    case 'UPDATE_STOCK': {
      const { productName, qty, type } = payload;
      if (!productName || qty === undefined) {
        return { executed: false, message: 'પ્રોડક્ટ નામ અને સ્ટોક સંખ્યા જરૂરી છે.' };
      }

      let found = false;
      let newStock = 0;
      store.updateData((d) => {
        const inv = (d.inventory || []).map((p) => {
          if (p.name.toLowerCase().includes(String(productName).toLowerCase())) {
            found = true;
            const diff = Number(qty);
            const updated = type === 'Reduce' ? Math.max(0, p.stock - diff) : p.stock + diff;
            newStock = updated;
            return { ...p, stock: updated };
          }
          return p;
        });
        return { ...d, inventory: inv };
      });

      if (!found) {
        return { executed: false, message: `પ્રોડક્ટ "${productName}" સ્ટોકમાં મળી નથી.` };
      }

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: ${productName} નો સ્ટોક હવે ${newStock} છે!`, 'success');
      return { executed: true, message: `${productName} સ્ટોક અપડેટ કર્યો (હવે: ${newStock})`, navigatePath: '/admin/inventory' };
    }

    // ─────────────────────────────────────────────────────────────
    // 6. BRIDAL STUDIO
    // ─────────────────────────────────────────────────────────────
    case 'CREATE_BRIDAL_BOOKING': {
      const { name, mobile, weddingDate, sagaiDate, packageName, price, advance, venue, notes } = payload;
      if (!name) return { executed: false, message: 'દુલ્હન / ક્લાયન્ટનું નામ ખૂટે છે.' };

      const pkgPrice = Number(price || 15000);
      const adv = Number(advance || 0);

      const newBridal: BridalBooking = {
        id: uid(),
        name: String(name).trim(),
        mobile: mobile ? String(mobile).trim() : '9898012345',
        weddingDate: weddingDate || todayISO(),
        sagaiDate: sagaiDate || '',
        date: todayISO(),
        packageName: packageName || 'Royal HD Bridal',
        package: pkgPrice,
        advance: adv,
        balance: Math.max(0, pkgPrice - adv),
        venue: venue || 'Surat',
        status: 'Confirmed',
        notes: notes || 'Booked via AI Voice Copilot',
      };

      store.updateData((d) => ({
        ...d,
        bridal: [newBridal, ...(d.bridal || [])],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: બ્રાઇડલ બુકિંગ સેવ થઈ — ${newBridal.name} (${newBridal.packageName})!`, 'success');
      return { executed: true, message: `બ્રાઇડલ બુકિંગ ${newBridal.name} સેવ થઈ`, navigatePath: '/admin/bridal', data: newBridal };
    }

    case 'UPDATE_BRIDAL_PRICE': {
      const { packageName, price } = payload;
      if (!packageName || !price) return { executed: false, message: 'પેકેજ નામ અને નવો ભાવ જરૂરી છે.' };

      let found = false;
      store.updateData((d) => {
        const pkgs = [...(d.bridalPackages || [])];
        const idx = pkgs.findIndex((p) => p.name.toLowerCase().includes(String(packageName).toLowerCase()));
        if (idx >= 0) {
          pkgs[idx] = { ...pkgs[idx], price: Number(price) };
          found = true;
        }
        return { ...d, bridalPackages: pkgs };
      });

      if (!found) {
        return { executed: false, message: `પેકેજ "${packageName}" મળ્યું નથી.` };
      }

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: ${packageName} નો ભાવ ${money(price)} કર્યો!`, 'success');
      return { executed: true, message: `${packageName} ભાવ ${money(price)} કર્યો`, navigatePath: '/admin/bridal' };
    }

    // ─────────────────────────────────────────────────────────────
    // 7. SERVICES CATALOG
    // ─────────────────────────────────────────────────────────────
    case 'ADD_SERVICE': {
      const { name, price, duration, category, description } = payload;
      if (!name || !price) return { executed: false, message: 'સર્વિસનું નામ અને ભાવ જરૂરી છે.' };

      const newSvc: Service = {
        id: uid(),
        name: String(name).trim(),
        price: Number(price),
        duration: Number(duration || 45),
        category: category || 'Hair Care & Styling',
        description: description || 'Professional salon service',
      };

      store.updateData((d) => ({
        ...d,
        services: [...(d.services || []), newSvc],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: નવી સર્વિસ "${newSvc.name}" ઉમેરી (${money(newSvc.price)})!`, 'success');
      return { executed: true, message: `સર્વિસ ${newSvc.name} ઉમેરી`, navigatePath: '/admin/services', data: newSvc };
    }

    case 'UPDATE_SERVICE_PRICE': {
      const { serviceName, price } = payload;
      if (!serviceName || !price) return { executed: false, message: 'સર્વિસનું નામ અને નવો ભાવ જરૂરી છે.' };

      let found = false;
      store.updateData((d) => {
        const svcs = (d.services || []).map((s) => {
          if (s.name.toLowerCase().includes(String(serviceName).toLowerCase())) {
            found = true;
            return { ...s, price: Number(price) };
          }
          return s;
        });
        return { ...d, services: svcs };
      });

      if (!found) {
        return { executed: false, message: `સર્વિસ "${serviceName}" મળી નથી.` };
      }

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: ${serviceName} નો નવો ભાવ ${money(price)} કર્યો!`, 'success');
      return { executed: true, message: `${serviceName} ભાવ અપડેટ કર્યો`, navigatePath: '/admin/services' };
    }

    // ─────────────────────────────────────────────────────────────
    // 8. WHATSAPP INTEGRATION
    // ─────────────────────────────────────────────────────────────
    case 'SEND_WHATSAPP_PDF': {
      const { recipientMobile, recipientName, documentType } = payload;
      const targetMob = recipientMobile ? String(recipientMobile).trim() : '9898012345';
      const targetName = recipientName || 'Valued Client';

      if (documentType === 'bridal_rate_card') {
        toast(`⏳ AI Copilot: બ્રાઇડલ રેટ કાર્ડ PDF મોકલી રહ્યું છું ${targetMob} પર…`);
        const res = await sendBridalRateCardPDFViaWhatsApp(data.bridalPackages || [], targetMob, targetName, data);
        if (res.success) {
          toast(`✅ AI Copilot: બ્રાઇડલ રેટ કાર્ડ PDF ${targetMob} ને મોકલાઈ ગયું!`, 'success');
        } else {
          toast(`⚠️ WhatsApp વેબ ફોલબેક વિન્ડો ખોલી`);
        }
        return { executed: true, message: `બ્રાઇડલ રેટ કાર્ડ ${targetMob} ને મોકલ્યું`, navigatePath: '/admin/whatsapp' };
      } else {
        const inv = data.invoices?.[0];
        if (inv) {
          toast(`⏳ AI Copilot: બિલ PDF ${inv.no} મોકલી રહ્યું છું ${targetMob} પર…`);
          await sendInvoicePDFViaWhatsApp(inv, data);
        }
        return { executed: true, message: `બિલ PDF ${targetMob} પર મોકલ્યું`, navigatePath: '/admin/billing' };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 9. NAVIGATION & CLOUD SYNC
    // ─────────────────────────────────────────────────────────────
    case 'NAVIGATE': {
      const { path } = payload;
      const target = path || '/admin';
      return { executed: true, message: `${target} પર જઈ રહ્યા છીએ`, navigatePath: target };
    }

    case 'TRIGGER_CLOUD_SYNC': {
      cloudSave();
      toast('☁️ AI Copilot: ક્લાઉડ સિંક સફળતાપૂર્વક શરૂ થયું!', 'success');
      return { executed: true, message: 'ક્લાઉડ ડેટા સિંક થઈ ગયો.' };
    }

    default:
      return { executed: false, message: 'કોઈ એક્શન અમલમાં મુકાયું નથી.' };
  }
}
