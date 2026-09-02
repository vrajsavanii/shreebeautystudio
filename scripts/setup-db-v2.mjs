// scripts/setup-db-v2.mjs
// Uses Supabase's direct database REST endpoint with service role key
// to create tables via SQL function calls

const SUPABASE_URL = 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';

const headers = {
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

console.log('═══════════════════════════════════════════════════');
console.log('  Shree Beauty Studio — Supabase Table Setup v2   ');
console.log('═══════════════════════════════════════════════════');

// Step 1: Check if salon_state table exists
async function checkTable() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?limit=0`, { headers });
  return res.status === 200;
}

// Step 2: Use Supabase's built-in query via rpc
// We'll create a helper SQL function first, then use it
async function createViaRPC() {
  // Supabase allows calling stored procedures via /rest/v1/rpc/{function_name}
  // We need to first create a setup function using a different approach
  
  // Try the Supabase pg-meta proxy (newer versions expose this)  
  const endpoints = [
    { url: `${SUPABASE_URL}/pg-meta/v1/query`, body: { query: '' } },
  ];

  // Try posting directly to the database via the SQL endpoint
  const sqlEndpoints = [
    `${SUPABASE_URL}/sql`,
    `${SUPABASE_URL}/api/sql`, 
    `${SUPABASE_URL}/v1/sql`,
  ];

  for (const url of sqlEndpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: 'SELECT 1' }),
      });
      console.log(`${url}: ${res.status}`);
    } catch(e) {
      console.log(`${url}: error - ${e.message}`);
    }
  }
}

// Step 3: Use PostgREST to check if we can access schema info
async function getSchemaInfo() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
  const body = await res.text();
  console.log('\nAvailable tables via PostgREST:');
  try {
    const json = JSON.parse(body);
    const paths = Object.keys(json.paths || {}).filter(p => !p.includes('rpc'));
    console.log(paths.join(', ') || '(none yet)');
    return paths;
  } catch {
    console.log(body.slice(0, 400));
    return [];
  }
}

// Step 4: Try Management API with service role as bearer
async function tryManagementAPI() {
  const PROJECT_REF = 'eqwfbcouxozwfwkzqano';
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  
  const sql = `
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
      CREATE POLICY "Owner can read own state" ON salon_state FOR SELECT USING (auth.uid() = owner_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE POLICY "Owner can upsert own state" ON salon_state FOR INSERT WITH CHECK (auth.uid() = owner_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE POLICY "Owner can update own state" ON salon_state FOR UPDATE USING (auth.uid() = owner_id);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  console.log(`\nManagement API status: ${res.status}`);
  console.log('Response:', body.slice(0, 500));
  return res.status === 200;
}

async function main() {
  // First check if table already exists
  console.log('\n🔍 Checking if salon_state table exists...');
  const exists = await checkTable();
  if (exists) {
    console.log('✅ Table already exists! Database is set up.');
    process.exit(0);
  }
  console.log('Table not found, proceeding with setup...');

  // Get current schema
  await getSchemaInfo();

  // Try management API
  console.log('\n🔧 Attempting Management API...');
  const mgmtSuccess = await tryManagementAPI();
  
  if (mgmtSuccess) {
    const check = await checkTable();
    if (check) {
      console.log('\n🎉 Database setup complete!');
      process.exit(0);
    }
  }

  // Final: print Supabase direct link
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚡ FASTEST METHOD: Use the App Setup Endpoint');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nThe dev server is running. Open this URL in your browser:');
  console.log('\n  ➤  http://localhost:3000/api/setup-db\n');
  console.log('This will attempt to create the table using the Next.js API route.');
}

main().catch(console.error);
