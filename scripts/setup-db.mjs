// scripts/setup-db.mjs
// Runs the full Supabase schema setup using the service role key

const PROJECT_URL = 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';

const SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies if re-running
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner can read own state" ON salon_state;
  DROP POLICY IF EXISTS "Owner can upsert own state" ON salon_state;
  DROP POLICY IF EXISTS "Owner can update own state" ON salon_state;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Create salon_state table (single-row per owner, stores full JSON blob)
CREATE TABLE IF NOT EXISTS salon_state (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salon_state_owner_id_unique UNIQUE (owner_id)
);

-- Enable Row Level Security
ALTER TABLE salon_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owner can read own state"
  ON salon_state FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner can upsert own state"
  ON salon_state FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update own state"
  ON salon_state FOR UPDATE
  USING (auth.uid() = owner_id);
`;

async function runSQL(sql) {
  // Try Supabase pg-meta API (used internally by the Supabase Dashboard)
  const endpoints = [
    `${PROJECT_URL}/pg-meta/v1/query`,
    `https://api.supabase.com/v1/projects/eqwfbcouxozwfwkzqano/database/query`,
  ];

  for (const url of endpoints) {
    try {
      console.log(`\nTrying endpoint: ${url}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'x-connection-encrypted': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ query: sql }),
      });

      const text = await res.text();
      console.log(`Status: ${res.status}`);

      if (res.ok) {
        console.log('✅ SQL executed successfully!');
        console.log(text.slice(0, 500));
        return true;
      } else {
        console.log(`❌ Failed: ${text.slice(0, 300)}`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }
  return false;
}

// Also try creating via Supabase REST API directly (verifying connection)
async function testConnection() {
  console.log('\n🔍 Testing Supabase connection...');
  try {
    const res = await fetch(`${PROJECT_URL}/rest/v1/salon_state?limit=1`, {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
    });
    const text = await res.text();
    console.log(`Connection test: HTTP ${res.status}`);
    if (res.status === 200) {
      console.log('✅ Table already exists and is accessible!');
      return 'exists';
    } else if (res.status === 404 || text.includes('does not exist') || text.includes('relation')) {
      console.log('ℹ️  Table does not exist yet — need to create it.');
      return 'missing';
    } else {
      console.log('Response:', text.slice(0, 300));
      return 'unknown';
    }
  } catch (err) {
    console.log('Connection error:', err.message);
    return 'error';
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Shree Beauty Studio — Supabase Setup Script  ');
  console.log('═══════════════════════════════════════════════');
  console.log(`Project: ${PROJECT_URL}`);

  const status = await testConnection();

  if (status === 'exists') {
    console.log('\n🎉 Database is already set up! Nothing to do.');
    return;
  }

  console.log('\n📦 Running SQL schema creation...');
  const success = await runSQL(SQL);

  if (!success) {
    console.log('\n⚠️  Direct API methods failed. Trying alternative...');
    
    // Try individual statement execution via PostgREST RPC workaround
    // Create a simple bootstrap via fetch to /rest/v1/rpc
    console.log('\nℹ️  The pg-meta API requires the Supabase Management Token.');
    console.log('\n📋 MANUAL STEPS (copy and run in Supabase SQL Editor):');
    console.log('   https://supabase.com/dashboard/project/eqwfbcouxozwfwkzqano/editor');
    console.log('\n' + SQL);
  }

  // Verify the table now exists
  const finalStatus = await testConnection();
  if (finalStatus === 'exists') {
    console.log('\n🎉 Setup complete! You can now use cloud sync.');
  } else {
    console.log('\n⚠️  Please run the SQL manually in the Supabase Dashboard SQL Editor.');
  }
}

main().catch(console.error);
