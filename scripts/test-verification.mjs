// scripts/test-verification.mjs
async function runTests() {
  console.log('=== TEST 1: Unauthenticated /admin Request ===');
  const adminRes = await fetch('http://localhost:3000/admin', { redirect: 'manual' });
  console.log('Status Code:', adminRes.status);
  console.log('Location Header:', adminRes.headers.get('location'));
  const isRedirectToLogin = adminRes.status === 307 || adminRes.status === 302;
  const redirectTarget = adminRes.headers.get('location') || '';
  console.log('Passed Redirect Check:', isRedirectToLogin && redirectTarget.includes('/login'));

  console.log('\n=== TEST 2: /api/public-data ===');
  const dataRes = await fetch('http://localhost:3000/api/public-data');
  const dataJson = await dataRes.json();
  console.log('Status Code:', dataRes.status);
  console.log('Success:', dataJson.success);
  console.log('Salon Name:', dataJson.settings?.salon);
  console.log('Services Count:', dataJson.services?.length);
  console.log('Bridal Packages Count:', dataJson.bridalPackages?.length);

  console.log('\n=== TEST 3: /api/public-booking ===');
  const bookingPayload = {
    type: 'regular',
    appointment: {
      id: 'test-verify-' + Date.now(),
      date: '2026-09-12',
      time: '02:00 PM',
      customer: 'Ananya Verma',
      mobile: '9824183769',
      service: 'Layer Cut / Feather Haircut, Hydra Deep Cleanse Facial',
      staff: 'Senior Beautician',
      advance: 500,
      status: 'Confirmed',
      workStatus: 'Booked',
      notes: 'Automated test appointment',
    },
    customer: {
      name: 'Ananya Verma',
      mobile: '9824183769',
    },
  };

  const bookRes = await fetch('http://localhost:3000/api/public-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingPayload),
  });
  const bookJson = await bookRes.json();
  console.log('Status Code:', bookRes.status);
  console.log('Booking Success:', bookJson.success);
  console.log('Booking Message:', bookJson.message);

  console.log('\n=== TEST 4: /api/my-appointments ===');
  const myApptsRes = await fetch('http://localhost:3000/api/my-appointments?mobile=9824183769');
  const myApptsJson = await myApptsRes.json();
  console.log('Status Code:', myApptsRes.status);
  console.log('Success:', myApptsJson.success);
  console.log('Total Found:', myApptsJson.appointments?.length);
  if (myApptsJson.appointments?.length > 0) {
    const latest = myApptsJson.appointments[0];
    console.log('Latest Appointment Customer:', latest.customer);
    console.log('Latest Appointment Service:', latest.service);
    console.log('Latest Appointment Status:', latest.status);
  }

  console.log('\n=== TEST 5: Authenticated /admin Access ===');
  const authedRes = await fetch('http://localhost:3000/admin', {
    headers: {
      Cookie: 'shree_admin_token=shree%40admin.com; shree_admin_role=Admin',
    },
    redirect: 'manual',
  });
  console.log('Status Code:', authedRes.status);
  console.log('Passed Authed Admin Check:', authedRes.status === 200);

  console.log('\n=== TEST 6: Salesperson Route Restriction ===');
  const salesRestrictedRes = await fetch('http://localhost:3000/admin/settings', {
    headers: {
      Cookie: 'shree_admin_token=sales%40shree.com; shree_admin_role=Salesperson',
    },
    redirect: 'manual',
  });
  console.log('Status Code:', salesRestrictedRes.status);
  console.log('Salesperson Redirect Location:', salesRestrictedRes.headers.get('location'));
  console.log('Passed Salesperson Guard Check:', salesRestrictedRes.headers.get('location')?.includes('/admin/billing'));

  console.log('\n=== ALL TESTS COMPLETE ===');
}

runTests().catch(console.error);
