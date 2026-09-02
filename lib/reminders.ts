// lib/reminders.ts
import { SalonData } from '@/types/salon';

export interface Reminder {
  date: string;
  title: string;
  text: string;
  mobile: string;
  type: 'birthday' | 'anniversary' | 'appointment' | 'bridal';
}

export function getUpcomingReminders(data: Partial<SalonData>): Reminder[] {
  if (!data) return [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const reminders: Reminder[] = [];

  // Birthday reminders (within 3 days)
  (data.customers || []).forEach((c) => {
    if (c.birthday) {
      const bday = new Date(`${now.getFullYear()}-${c.birthday.slice(5)}T00:00:00`);
      const diffD = (bday.getTime() - now.getTime()) / 86400000;
      if (diffD >= 0 && diffD <= 3) {
        reminders.push({
          date: bday.toISOString().slice(0, 10),
          title: `🎂 Birthday — ${c.name}`,
          text: `Birthday ${diffD < 1 ? 'today!' : `in ${Math.round(diffD)} days`}`,
          mobile: c.mobile,
          type: 'birthday',
        });
      }
    }
    // Anniversary reminders (within 3 days)
    if (c.anniversary) {
      const ann = new Date(`${now.getFullYear()}-${c.anniversary.slice(5)}T00:00:00`);
      const diffD = (ann.getTime() - now.getTime()) / 86400000;
      if (diffD >= 0 && diffD <= 3) {
        reminders.push({
          date: ann.toISOString().slice(0, 10),
          title: `💍 Anniversary — ${c.name}`,
          text: `Anniversary ${diffD < 1 ? 'today!' : `in ${Math.round(diffD)} days`}`,
          mobile: c.mobile,
          type: 'anniversary',
        });
      }
    }
  });

  // Appointment reminders (today + tomorrow)
  const custR1 = data.settings?.custR1 || 24;
  (data.appointments || []).forEach((a) => {
    if (a.status === 'Cancelled') return;
    const apptTime = new Date(`${a.date}T${a.time}`);
    const diffH = (apptTime.getTime() - now.getTime()) / 3600000;
    if (diffH >= 0 && diffH <= custR1) {
      reminders.push({
        date: a.date,
        title: `📅 ${a.customer}`,
        text: `${a.service} at ${a.time} with ${a.staff}`,
        mobile: a.mobile,
        type: 'appointment',
      });
    }
  });

  // Bridal event reminders (within 7 days)
  (data.bridal || []).forEach((b) => {
    const eventDates = [
      { name: 'Wedding', date: b.weddingDate },
      { name: 'Mandap Muhurat', date: b.mandapDate },
      { name: 'Music Night', date: b.musicDate },
      { name: b.otherEventName || 'Other Event', date: b.otherDate },
    ].filter((e): e is { name: string; date: string } => Boolean(e.date));

    eventDates.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const diffD = (d.getTime() - now.getTime()) / 86400000;
      if (diffD >= 0 && diffD <= 7) {
        reminders.push({
          date: e.date,
          title: `💍 Bridal — ${b.name}`,
          text: `${e.name} at ${b.venue}`,
          mobile: b.mobile,
          type: 'bridal',
        });
      }
    });
  });

  return reminders.sort((a, b) => a.date.localeCompare(b.date));
}

export function getAllUpcomingReminders(data: Partial<SalonData>, days = 30): Reminder[] {
  if (!data) return [];
  const now = new Date();
  const reminders: Reminder[] = [];

  (data.customers || []).forEach((c) => {
    if (c.birthday) {
      const bday = new Date(`${now.getFullYear()}-${c.birthday.slice(5)}T00:00:00`);
      const diffD = (bday.getTime() - now.getTime()) / 86400000;
      if (diffD >= -1 && diffD <= days) {
        reminders.push({
          date: bday.toISOString().slice(0, 10),
          title: `🎂 Birthday — ${c.name}`,
          text: `${c.name} (${c.mobile})`,
          mobile: c.mobile,
          type: 'birthday',
        });
      }
    }
    if (c.anniversary) {
      const ann = new Date(`${now.getFullYear()}-${c.anniversary.slice(5)}T00:00:00`);
      const diffD = (ann.getTime() - now.getTime()) / 86400000;
      if (diffD >= -1 && diffD <= days) {
        reminders.push({
          date: ann.toISOString().slice(0, 10),
          title: `💍 Anniversary — ${c.name}`,
          text: `${c.name} (${c.mobile})`,
          mobile: c.mobile,
          type: 'anniversary',
        });
      }
    }
  });

  (data.appointments || []).forEach((a) => {
    if (a.status === 'Cancelled') return;
    const apptTime = new Date(`${a.date}T${a.time}`);
    const diffD = (apptTime.getTime() - now.getTime()) / 86400000;
    if (diffD >= -1 && diffD <= days) {
      reminders.push({
        date: a.date,
        title: `📅 Appointment — ${a.customer}`,
        text: `${a.service} with ${a.staff} at ${a.time}`,
        mobile: a.mobile,
        type: 'appointment',
      });
    }
  });

  (data.bridal || []).forEach((b) => {
    const eventDates = [
      { name: 'Wedding', date: b.weddingDate },
      { name: 'Mandap Muhurat', date: b.mandapDate },
      { name: 'Music Night', date: b.musicDate },
      { name: b.otherEventName || 'Other Event', date: b.otherDate },
    ].filter((e): e is { name: string; date: string } => Boolean(e.date));

    eventDates.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const diffD = (d.getTime() - now.getTime()) / 86400000;
      if (diffD >= -1 && diffD <= days) {
        reminders.push({
          date: e.date,
          title: `💍 Bridal — ${b.name}`,
          text: `${e.name} at ${b.venue}`,
          mobile: b.mobile,
          type: 'bridal',
        });
      }
    });
  });

  return reminders.sort((a, b) => a.date.localeCompare(b.date));
}
