import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const INDEXNOW_KEY = 'd862c90e0c0341c385c7f8a7e5bf3a17';
const HOST = 'shreebeauty.studio';
const BASE_URL = `https://${HOST}`;

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJwt(header, payload, privateKey) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  const signature = sign.sign(privateKey);
  const encodedSignature = signature
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${encodedSignature}`;
}

async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const jwt = createJwt(header, payload, serviceAccount.private_key);

  const res = await fetch(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to obtain Google access token: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function submitToGoogleIndexingApi(urls, serviceAccount) {
  try {
    console.log(`🔐 Authenticating service account: ${serviceAccount.client_email}...`);
    const accessToken = await getGoogleAccessToken(serviceAccount);
    console.log('✅ Google OAuth2 token received successfully.');

    console.log(`📡 Sending URLs to Google Indexing API (URL_UPDATED)...`);
    let successCount = 0;
    let failedCount = 0;

    for (const url of urls) {
      try {
        const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            url: url,
            type: 'URL_UPDATED',
          }),
        });

        if (res.ok) {
          successCount++;
          process.stdout.write('.');
        } else {
          failedCount++;
          const text = await res.text().catch(() => '');
          console.warn(`\n⚠️ Google Indexing API failed for ${url}: ${res.status} ${text}`);
        }
      } catch (err) {
        failedCount++;
      }
    }
    console.log(`\n✅ Google Indexing API complete: ${successCount} succeeded, ${failedCount} failed.`);
  } catch (err) {
    console.error('❌ Google Indexing API error:', err.message);
  }
}

async function runAutonomousIndexing() {
  console.log('=====================================================');
  console.log('🚀 SHREE BEAUTY STUDIO AUTONOMOUS MULTI-ENGINE INDEXING');
  console.log('=====================================================');

  // 1. Read URL list
  const urlsFilePath = path.join(process.cwd(), 'public', 'all-indexed-urls.txt');
  if (!fs.existsSync(urlsFilePath)) {
    console.error('❌ public/all-indexed-urls.txt not found.');
    process.exit(1);
  }

  const urls = fs
    .readFileSync(urlsFilePath, 'utf8')
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && !u.includes('/my-appointments'));

  console.log(`📋 Total Verified Indexable URLs: ${urls.length}\n`);

  // 2. Submit to IndexNow clearinghouse & search engines
  const indexNowPayload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  const indexNowEndpoints = [
    { name: 'IndexNow Central Clearinghouse', url: 'https://api.indexnow.org/indexnow' },
    { name: 'Microsoft Bing', url: 'https://www.bing.com/indexnow' },
    { name: 'Yandex', url: 'https://yandex.com/indexnow' },
  ];

  for (const endpoint of indexNowEndpoints) {
    try {
      console.log(`📡 Pinging ${endpoint.name} (${endpoint.url})...`);
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(indexNowPayload),
      });

      if (res.ok || res.status === 200 || res.status === 202) {
        console.log(`✅ ${endpoint.name}: SUCCESS (HTTP ${res.status}). All ${urls.length} URLs submitted.\n`);
      } else {
        const text = await res.text().catch(() => '');
        console.warn(`⚠️ ${endpoint.name}: Responded with HTTP ${res.status}: ${text}\n`);
      }
    } catch (err) {
      console.error(`❌ ${endpoint.name} Error:`, err.message, '\n');
    }
  }

  // 3. Ping Google WebSub Hub (pubsubhubbub) for instant RSS discovery
  try {
    console.log(`📡 Pinging Google WebSub Hub (pubsubhubbub.appspot.com)...`);
    const hubUrl = 'https://pubsubhubbub.appspot.com/publish';
    const params = new URLSearchParams();
    params.append('hub.mode', 'publish');
    params.append('hub.url', `${BASE_URL}/rss.xml`);

    const res = await fetch(hubUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (res.ok || res.status === 204) {
      console.log(`✅ Google WebSub Hub: SUCCESS. Instant RSS crawl pinged for ${BASE_URL}/rss.xml\n`);
    } else {
      console.log(`ℹ️ Google WebSub Hub status: ${res.status}\n`);
    }
  } catch (err) {
    console.warn(`⚠️ Google WebSub ping note:`, err.message, '\n');
  }

  // 4. Check for Google Service Account credentials
  const possibleKeyFiles = [
    'service_account.json',
    'google-service-account.json',
    'google-indexing.json',
    'service-account.json',
  ];

  let googleKeyPath = null;
  for (const f of possibleKeyFiles) {
    const full = path.join(process.cwd(), f);
    if (fs.existsSync(full)) {
      googleKeyPath = full;
      break;
    }
  }

  if (googleKeyPath) {
    console.log(`🔑 Found Google Service Account key at: ${path.basename(googleKeyPath)}`);
    try {
      const sa = JSON.parse(fs.readFileSync(googleKeyPath, 'utf8'));
      await submitToGoogleIndexingApi(urls, sa);
    } catch (err) {
      console.error('❌ Failed to parse or use service account file:', err.message);
    }
  } else {
    console.log('ℹ️ Google Indexing API:');
    console.log('   IndexNow covers Bing, Copilot, ChatGPT Search, and Yandex autonomously.');
    console.log('   For Google, you can either submit your sitemap (https://shreebeauty.studio/sitemap.xml)');
    console.log('   in Google Search Console, or place `service_account.json` here to auto-publish.');
  }

  console.log('\n=====================================================');
  console.log('🎉 Autonomous multi-engine indexing run completed!');
  console.log('=====================================================\n');
}

runAutonomousIndexing();
