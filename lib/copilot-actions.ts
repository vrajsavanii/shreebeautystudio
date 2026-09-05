// lib/copilot-actions.ts
//
// AI Copilot Action Dispatcher for Shree Beauty Studio
// Executes actual tasks in salon store & UI

import { useSalonStore } from './store';
import { scheduleSave, cloudSave } from './sync';
import { uid, todayISO, money } from './utils';
import { sendBridalRateCardPDFViaWhatsApp } from './bridal-pdf';
import { sendInvoicePDFViaWhatsApp, downloadInvoicePDF } from './invoice-pdf';
import { Appointment, Invoice, InventoryItem, BridalBooking } from '@/types/salon';

export interface CopilotActionResult {
  executed: boolean;
  message: string;
  navigatePath?: string;
}

export async function executeCopilotAction(
  action: string,
  payload: any,
  toast: (msg: string, type?: 'info' | 'error' | 'success') => void
): Promise<CopilotActionResult> {
  const store = useSalonStore.getState();
  const data = store.data;

  switch (action) {
    case 'CREATE_APPOINTMENT': {
      const { customer, mobile, service, date, time, staff, notes } = payload;
      if (!customer || !mobile) {
        return { executed: false, message: 'Missing customer name or mobile number.' };
      }

      const newAppt: Appointment = {
        id: uid(),
        customer: customer.trim(),
        mobile: mobile.trim(),
        service: service || 'Hydra Deep Cleanse Facial',
        date: date || todayISO(),
        time: time || '04:00 PM',
        staff: staff || 'Pooja',
        advance: 0,
        status: 'Confirmed',
        notes: notes || 'Booked via AI Copilot',
      };

      store.updateData((d) => ({
        ...d,
        appointments: [newAppt, ...(d.appointments || [])],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: Appointment booked for ${newAppt.customer} on ${newAppt.date} at ${newAppt.time}!`);
      return { executed: true, message: `Appointment created for ${newAppt.customer}`, navigatePath: '/appointments' };
    }

    case 'CREATE_INVOICE': {
      const { customer, mobile, lines, paymentMode, discount } = payload;
      const custName = customer || 'Walk-in Client';
      const custMobile = mobile || '9898012345';
      const rawLines = lines && lines.length ? lines : [{ name: 'Hydra Deep Cleanse Facial', price: 2500, qty: 1 }];

      const subtotal = rawLines.reduce((s: number, l: any) => s + (Number(l.price) * Number(l.qty || 1)), 0);
      const discAmt = Number(discount || 0);
      const total = Math.max(0, subtotal - discAmt);

      const seq = data.invoiceSeq || 1001;
      const invNo = `INV-${seq}`;

      const newInv: Invoice = {
        id: uid(),
        no: invNo,
        date: todayISO(),
        customer: custName,
        mobile: custMobile,
        lines: rawLines.map((l: any) => ({
          name: l.name,
          qty: Number(l.qty || 1),
          price: Number(l.price || 0),
          type: 'S',
        })),
        subtotal,
        discount: discAmt,
        total,
        advance: 0,
        paid: total,
        balance: 0,
        mode: paymentMode || 'GPay UPI',
      };

      store.updateData((d) => ({
        ...d,
        invoiceSeq: seq + 1,
        invoices: [newInv, ...(d.invoices || [])],
      }));

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: Created Invoice ${newInv.no} for ${newInv.customer} (${money(newInv.total)})!`);
      return { executed: true, message: `Invoice ${newInv.no} created`, navigatePath: '/billing' };
    }

    case 'ADD_INVENTORY': {
      const { name, category, brand, stock, buy, sell, barcode } = payload;
      if (!name) return { executed: false, message: 'Missing product name.' };

      const newProd: InventoryItem = {
        id: uid(),
        barcode: barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        name: name.trim(),
        brand: brand || 'L\'Oreal Professionnel',
        category: category || 'Hair Care & Shampoo',
        stock: Number(stock || 10),
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
      toast(`✅ AI Copilot: Product "${newProd.name}" added to inventory (Stock: ${newProd.stock})!`);
      return { executed: true, message: `Product ${newProd.name} added`, navigatePath: '/inventory' };
    }

    case 'UPDATE_BRIDAL_PRICE': {
      const { packageName, price, type } = payload;
      if (!packageName || !price) return { executed: false, message: 'Missing package name or price.' };

      let found = false;
      store.updateData((d) => {
        const pkgs = [...(d.bridalPackages || [])];
        const idx = pkgs.findIndex((p) => p.name.toLowerCase().includes(packageName.toLowerCase()));
        if (idx >= 0) {
          pkgs[idx] = { ...pkgs[idx], price: Number(price) };
          found = true;
        }
        return { ...d, bridalPackages: pkgs };
      });

      if (!found) {
        return { executed: false, message: `Package "${packageName}" not found.` };
      }

      scheduleSave();
      cloudSave();
      toast(`✅ AI Copilot: Updated ${packageName} price to ${money(price)}!`);
      return { executed: true, message: `Price updated for ${packageName}`, navigatePath: '/bridal' };
    }

    case 'SEND_WHATSAPP_PDF': {
      const { recipientMobile, recipientName, documentType } = payload;
      const targetMob = recipientMobile || '9898012345';
      const targetName = recipientName || 'Valued Client';

      if (documentType === 'bridal_rate_card') {
        toast(`⏳ AI Copilot: Sending Bridal Rate Card PDF to ${targetMob}…`);
        const res = await sendBridalRateCardPDFViaWhatsApp(data.bridalPackages || [], targetMob, targetName, data);
        if (res.success) {
          toast(`✅ AI Copilot: Bridal Rate Card PDF sent to ${targetMob}!`);
        } else {
          toast(`⚠️ WhatsApp Web Fallback opened for ${targetMob}`);
        }
        return { executed: true, message: `Bridal Rate Card PDF sent to ${targetMob}`, navigatePath: '/whatsapp' };
      } else {
        const inv = data.invoices?.[0];
        if (inv) {
          toast(`⏳ AI Copilot: Sending Invoice PDF ${inv.no} to ${targetMob}…`);
          await sendInvoicePDFViaWhatsApp(inv, data);
        }
        return { executed: true, message: `Invoice PDF sent to ${targetMob}`, navigatePath: '/billing' };
      }
    }

    case 'NAVIGATE': {
      const { path } = payload;
      return { executed: true, message: `Navigating to ${path}`, navigatePath: path || '/' };
    }

    case 'FILTER_CUSTOMERS': {
      return { executed: true, message: 'Filtering customer list', navigatePath: '/customers' };
    }

    default:
      return { executed: false, message: 'No action performed.' };
  }
}
