# Shree Beauty Studio — Management System

A full-stack, cloud-first salon management web application built with **Next.js 14**, **Framer Motion**, and **Supabase**.

## ✨ Features

- 📅 **Appointments** — Book, edit, manage with WhatsApp notifications
- 👥 **Customers** — Track visits, spend, birthdays & anniversaries
- 💳 **Billing** — Real-time invoice builder, print A4 / 80mm thermal
- 📦 **Inventory** — Stock management with low-stock alerts
- 💍 **Bridal Bookings** — Multi-step tabbed form with package tiers
- 👩‍💼 **Staff** — Manage team and service assignments
- 🔔 **Reminders** — Auto-computed from data, no separate setup
- 📊 **Reports** — Revenue charts, date-range filters (Recharts)
- ⚙️ **Settings** — Full configuration + cloud sync panel

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** — Download from https://nodejs.org

### 1. Install Dependencies

```bash
cd "Salon trial/shree-beauty-studio"
npm install
```

### 2. Configure Supabase (Optional — App works offline without this)

1. Create a free project at https://supabase.com
2. Run this SQL in the Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS salon_state (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salon_state_owner_id_unique UNIQUE (owner_id)
);

ALTER TABLE salon_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own state"
  ON salon_state FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owner can upsert own state"
  ON salon_state FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update own state"
  ON salon_state FOR UPDATE USING (auth.uid() = owner_id);
```

3. Edit `.env.local` with your project credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm start
```

## 🌐 Deploy to Vercel

1. Push this folder to GitHub
2. Import to [Vercel](https://vercel.com) (auto-detects Next.js)
3. Add environment variables in Vercel dashboard
4. Deploy!

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Animations | Framer Motion |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS + CSS Variables |
| State | Zustand (persisted to localStorage) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |

## 📁 Project Structure

```
shree-beauty-studio/
├── app/
│   ├── (auth)/login/          ← Login/Signup page
│   ├── (dashboard)/           ← All protected pages
│   │   ├── page.tsx           ← Dashboard
│   │   ├── appointments/
│   │   ├── customers/
│   │   ├── billing/
│   │   ├── inventory/
│   │   ├── bridal/
│   │   ├── staff/
│   │   ├── reminders/
│   │   ├── reports/
│   │   └── settings/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/                ← Sidebar, Topbar, MobileBottomNav
│   ├── ui/                    ← Modal, Toast, StatCard, Badge, Button
│   └── cloud/                 ← CloudStatusBadge
├── lib/
│   ├── store.ts               ← Zustand store + default data
│   ├── sync.ts                ← Supabase cloud sync
│   ├── reminders.ts           ← Computed reminders
│   ├── whatsapp.ts            ← WA message builders
│   └── utils.ts               ← money(), uid(), fmtDate()
├── types/salon.ts             ← All TypeScript interfaces
└── variants/index.ts          ← Framer Motion variants
```

## 💡 Keyboard Shortcuts

| Key | Action |
|---|---|
| `Escape` | Close modal |

## 📱 Mobile Support

Responsive bottom navigation bar on screens < 768px with a "More" drawer for additional pages.

## 🖨 Printing

Invoices can be printed in **A4** or **80mm thermal** format. Configure in Settings → Billing → Printer Type.
