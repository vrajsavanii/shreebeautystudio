// scripts/create-owner.mjs
// Creates the single owner account in Supabase Auth using the Admin API

const SUPABASE_URL = 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';

const EMAIL    = 'shree@admin.com';
const PASSWORD = 'shree1234';

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   Shree Beauty Studio — Create Owner Account  ');
  console.log('═══════════════════════════════════════════════');
  console.log(`Email   : ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);

  // Use Supabase Admin Auth API (service role key has access to this)
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,   // auto-confirm — no email verification needed
      user_metadata: { role: 'owner', name: 'Shree' },
    }),
  });

  const json = await res.json();

  if (res.ok) {
    console.log('\n✅ Owner account created successfully!');
    console.log(`   User ID: ${json.id}`);
    console.log(`   Email  : ${json.email}`);
    console.log(`   Status : email_confirmed = ${json.email_confirmed_at ? 'YES' : 'NO'}`);
    console.log('\n🔐 You can now log in at http://localhost:3000/login');
    console.log(`   Email   : ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}`);
  } else if (json.message?.includes('already') || json.code === 'email_exists' || res.status === 422) {
    console.log('\n⚠️  Account already exists — that is fine!');
    console.log('   Just go to http://localhost:3000 and sign in.');
  } else {
    console.log('\n❌ Error creating account:');
    console.log(JSON.stringify(json, null, 2));
  }
}

main().catch(console.error);
