// app/api/setup-db/route.ts
// One-time database setup endpoint — call once after deployment
// Access: GET http://localhost:3000/api/setup-db

import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SQL_STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  `CREATE TABLE IF NOT EXISTS salon_state (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data        jsonb NOT NULL DEFAULT '{}',
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT salon_state_owner_id_unique UNIQUE (owner_id)
  )`,

  `ALTER TABLE salon_state ENABLE ROW LEVEL SECURITY`,

  `DO $$ BEGIN
    CREATE POLICY "Owner can read own state"
      ON salon_state FOR SELECT
      USING (auth.uid() = owner_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE POLICY "Owner can upsert own state"
      ON salon_state FOR INSERT
      WITH CHECK (auth.uid() = owner_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE POLICY "Owner can update own state"
      ON salon_state FOR UPDATE
      USING (auth.uid() = owner_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

async function execSQL(sql: string) {
  // Use Supabase's pg-meta REST API (available via service role)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, body: await res.text() };
}

export async function GET() {
  const results: { sql: string; status: number; body: string }[] = [];

  for (const sql of SQL_STATEMENTS) {
    const r = await execSQL(sql);
    results.push({ sql: sql.slice(0, 60) + '…', status: r.status, body: r.body });
  }

  // Verify table exists
  const check = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?limit=0`, {
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });

  const tableExists = check.status === 200;

  return NextResponse.json({
    success: tableExists,
    message: tableExists
      ? '✅ salon_state table is ready!'
      : '❌ Table setup failed — check results below',
    results,
  });
}
