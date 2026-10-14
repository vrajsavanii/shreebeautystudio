'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface BeautyNotification {
  id: number;
  slot: 'morning' | 'afternoon' | 'evening';
  title: string;
  body: string;
  actionUrl: string;
}

// ─── Slot 1: Morning Glow Rituals (9:00 AM – 10:30 AM) ──────────────────────
export const MORNING_NOTIFICATIONS: Omit<BeautyNotification, 'id' | 'slot'>[] = [
  {
    title: '☀️ Morning Glow Check!',
    body: 'Did you apply your SPF today? Protect your skin from Surat’s UV and check our morning hydration tips or book a weekend clean-up!',
    actionUrl: '/services',
  },
  {
    title: '✨ Good Morning Gorgeous!',
    body: 'Healthy, glossy hair starts with scalp nourishment. Treat yourself to our signature Organic Hair Spa in Katargam today.',
    actionUrl: '/book',
  },
  {
    title: '☕ Coffee & Self-Care Day',
    body: 'Start your morning with a confidence boost! Express manicure, pedicure and blowouts are open today at Shree Beauty Studio.',
    actionUrl: '/services',
  },
  {
    title: '🌿 Morning Skin Barrier Reminder',
    body: 'Hydrated skin stays younger longer. Tap to discover our hydrating O3+ and Hydra Facial packages for radiant skin.',
    actionUrl: '/services',
  },
  {
    title: '💎 Weekend Slots Filling Fast!',
    body: 'Prime Saturday & Sunday pampering hours go early. Lock in your facial or hair makeover slot on the app before they close.',
    actionUrl: '/book',
  },
  {
    title: '🌸 Gentle Morning Touch',
    body: 'Over-plucked or tired brows? Stop by for pain-free organic threading and brow mapping by our senior specialists.',
    actionUrl: '/services',
  },
  {
    title: '👰 Wedding Season Morning Prep',
    body: 'Planning an event or shaadi? Pooja Patel’s exclusive bridal trial slots are booking 3 weeks ahead. Check calendar now.',
    actionUrl: '/bridal',
  },
];

// ─── Slot 2: Mid-Day Refresh & Perks (2:00 PM – 3:30 PM) ───────────────────
export const AFTERNOON_NOTIFICATIONS: Omit<BeautyNotification, 'id' | 'slot'>[] = [
  {
    title: '💆 Mid-Day Stress Buster!',
    body: 'Screen fatigue or busy work hours? Unwind with an express 30-min head massage and hair conditioning in Katargam.',
    actionUrl: '/book',
  },
  {
    title: '💅 Quick Afternoon Treat',
    body: 'Nails looking chipped? Drop in for instant chrome art, gel extensions, or a soothing herbal hand spa this afternoon.',
    actionUrl: '/services',
  },
  {
    title: '⚡ Express Glow Hour',
    body: 'Have 40 minutes free? Step in for our rapid D-Tan glow facial and walk out refreshed for your evening plans.',
    actionUrl: '/services',
  },
  {
    title: '💖 Exclusive App Perk',
    body: 'Surprise discount alert: Check our latest seasonal combo deals and save up to 25% on head-to-toe pampering today!',
    actionUrl: '/services',
  },
  {
    title: '🧖 Beat Surat’s Humidity',
    body: 'Frizzy hair getting out of hand? Learn why Nanoplastia & Hair Botox are Surat ladies’ #1 choice for mirror-smooth hair.',
    actionUrl: '/services',
  },
  {
    title: '✨ 25 Years of Trusted Care',
    body: '100% private, ladies-only sanctuary in Katargam. Relax completely in a safe and hygienic setting this afternoon.',
    actionUrl: '/book',
  },
  {
    title: '🛍️ Mid-Week Beauty Break',
    body: 'You deserve a break! Book an express full-body wax and herbal scrub session today on your phone in under 30 seconds.',
    actionUrl: '/book',
  },
];

// ─── Slot 3: Evening Unwind & Tomorrow Booking (6:30 PM – 8:00 PM) ───────────
export const EVENING_NOTIFICATIONS: Omit<BeautyNotification, 'id' | 'slot'>[] = [
  {
    title: '🌙 Evening Unwind Ritual',
    body: 'Wash away the city stress! Book tomorrow’s salon appointment tonight and wake up with your pampering guaranteed.',
    actionUrl: '/book',
  },
  {
    title: '✨ Plan Tomorrow’s Self-Care',
    body: 'Need clean-up, threading, or waxing tomorrow? Lock in your preferred time slot tonight before morning rush.',
    actionUrl: '/book',
  },
  {
    title: '🧴 Night Repair Routine Tip',
    body: 'Always apply a hydrating night serum before bed! Need a professional pore detox? Tap to view our facial menu.',
    actionUrl: '/services',
  },
  {
    title: '🎉 Party & Celebration Ready',
    body: 'Upcoming birthday, anniversary, or family function? Book statement glam makeup and chic hairstyling on the app now.',
    actionUrl: '/bridal',
  },
  {
    title: '⭐ Your Beauty Sanctuary Awaits',
    body: 'Over 5,000 happy brides and local ladies trust Shree Beauty Studio. Open the app to view verified reviews and book.',
    actionUrl: '/about',
  },
  {
    title: '🌟 Tomorrow’s Glow Starts Tonight',
    body: 'Don’t wait until you’re in a rush. Select your favorite beauty artist and service on our app right now.',
    actionUrl: '/book',
  },
  {
    title: '💎 Luxury Bridal Touch',
    body: 'Bridal packages include pre-wedding skin prep, HD airbrush makeup, and hair styling. Browse our full bridal portfolio!',
    actionUrl: '/bridal',
  },
];

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Checks if notification permission is currently granted.
 */
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
  } catch (err) {
    console.warn('Error checking notification permission:', err);
  }
  return false;
}

/**
 * Requests notification permission from the user across mobile and web platforms.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      if (granted) {
        await scheduleDailyNotifications();
      }
      return granted;
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      const granted = res === 'granted';
      if (granted) {
        await scheduleDailyNotifications();
      }
      return granted;
    }
  } catch (err) {
    console.error('Error requesting notification permission:', err);
  }
  return false;
}

/**
 * Schedules recurring daily notifications for Morning (9:30 AM),
 * Afternoon (2:30 PM), and Evening (7:30 PM) with dynamic reasons.
 */
export async function scheduleDailyNotifications(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      // 1. Create or ensure notification channel exists for Android 8+
      await LocalNotifications.createChannel({
        id: 'shree_beauty_perks',
        name: 'Daily Beauty Perks & Reminders',
        description: 'Morning rituals, afternoon perks, and salon appointment reminders',
        importance: 4, // High importance
        visibility: 1, // Public
        sound: 'res_custom_notification',
        vibration: true,
      }).catch(() => {
        // Fallback if custom channel creation fails
      });

      // 2. Clear previous scheduled daily notifications (IDs 101, 102, 103)
      await LocalNotifications.cancel({
        notifications: [{ id: 101 }, { id: 102 }, { id: 103 }],
      }).catch(() => {});

      // 3. Pick random fresh reasons from each slot pool
      const morning = getRandomItem(MORNING_NOTIFICATIONS);
      const afternoon = getRandomItem(AFTERNOON_NOTIFICATIONS);
      const evening = getRandomItem(EVENING_NOTIFICATIONS);

      // 4. Schedule recurring notifications
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 101,
            title: morning.title,
            body: morning.body,
            channelId: 'shree_beauty_perks',
            smallIcon: 'ic_launcher_foreground',
            iconColor: '#032B30',
            schedule: {
              on: {
                hour: 9,
                minute: 30,
              },
              allowWhileIdle: true,
            },
            extra: {
              url: morning.actionUrl,
              slot: 'morning',
            },
          },
          {
            id: 102,
            title: afternoon.title,
            body: afternoon.body,
            channelId: 'shree_beauty_perks',
            smallIcon: 'ic_launcher_foreground',
            iconColor: '#032B30',
            schedule: {
              on: {
                hour: 14,
                minute: 30,
              },
              allowWhileIdle: true,
            },
            extra: {
              url: afternoon.actionUrl,
              slot: 'afternoon',
            },
          },
          {
            id: 103,
            title: evening.title,
            body: evening.body,
            channelId: 'shree_beauty_perks',
            smallIcon: 'ic_launcher_foreground',
            iconColor: '#032B30',
            schedule: {
              on: {
                hour: 19,
                minute: 30,
              },
              allowWhileIdle: true,
            },
            extra: {
              url: evening.actionUrl,
              slot: 'evening',
            },
          },
        ],
      });

      console.log('Daily beauty notifications scheduled for 9:30 AM, 2:30 PM, and 7:30 PM');
    }
  } catch (err) {
    console.warn('Could not schedule local notifications:', err);
  }
}

/**
 * Attaches a listener so that clicking a notification opens the right page inside the app.
 */
export function setupNotificationListeners(navigate: (url: string) => void) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const url = notification.notification?.extra?.url;
      if (url && typeof navigate === 'function') {
        navigate(url);
      }
    });
  } catch (err) {
    console.warn('Error setting up notification click listener:', err);
  }
}
