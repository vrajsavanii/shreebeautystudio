// scripts/create-tables.mjs
// Creates salon_state table via Supabase SQL API (requires service role)

const SUPABASE_URL = 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';
const PROJECT_REF  = 'eqwfbcouxozwfwkzqano';

const SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS salon_state (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salon_state_owner_id_unique UNIQUE (owner_id)
);

ALTER TABLE salon_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner can read own state"
    ON salon_state FOR SELECT USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner can upsert own state"
    ON salon_state FOR INSERT WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owner can update own state"
    ON salon_state FOR UPDATE USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   Shree Beauty Studio — Create DB Tables      ');
  console.log('═══════════════════════════════════════════════');

  // Try Supabase Management REST API
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  console.log(`\nCalling: ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  });

  const body = await res.text();
  console.log(`Status: ${res.status}`);

  if (res.ok) {
    console.log('\n✅ Tables created!');
  } else {
    console.log('Response:', body.slice(0, 400));

    // Try /rest/v1/ table check
    console.log('\nVerifying table directly...');
    const check = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?limit=0`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
    });
    if (check.status === 200) {
      console.log('✅ salon_state table EXISTS — already set up!');
    } else {
      console.log(`Table check: HTTP ${check.status}`);
      console.log('\n⚠️  Please create the table manually in Supabase SQL Editor:');
      console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
      console.log('\nPaste this SQL and press Run:\n');
      console.log(SQL);
    }
  }
}

main().catch(console.error);
