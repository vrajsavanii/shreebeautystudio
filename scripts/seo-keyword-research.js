/**
 * scripts/seo-keyword-research.js
 * Open-Source Keyword Research & SERP Suggestion Harvester
 * Queries Google & Bing Autocomplete engines to discover real high-intent beauty & salon searches.
 */

const fs = require('fs');
const path = require('path');

const SEED_TOPICS = [
  // High-Volume Commercial Keywords (Surat / Gujarat)
  'best parlour in surat with price list',
  'best beauty parlour in surat',
  'best beauty salon in katargam',
  'ladies parlour katargam surat',
  'bridal makeup price in surat',
  'bridal makeup artist in surat',
  'gujarati bride look in saree',
  'panetar saree for bride surat',
  'hair botox treatment price in surat',
  'hair botox vs nanoplastia vs keratin',
  'nanoplastia hair treatment surat price',
  'hydra facial price in surat',
  'best hydra facial in surat',
  'korean hair spa surat',
  'japanese head spa in surat',
  'hair color salon in surat price',
  'rica wax price in parlour',
  'laser hair removal surat price',
  'lip pigmentation treatment in surat',
  'hair smoothening price in surat',
  'pre bridal package price in surat',
  'nail extensions price in surat',
];

async function fetchGoogleSuggestions(query) {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data[1]) ? data[1] : [];
  } catch (e) {
    return [];
  }
}

async function fetchBingSuggestions(query) {
  try {
    const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}&market=en-IN`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data[1]) ? data[1] : [];
  } catch (e) {
    return [];
  }
}

async function runResearch() {
  console.log('🔍 Harvesting Open-Source Autocomplete Search Data for Surat Beauty Intent...\n');
  const results = {};

  for (const topic of SEED_TOPICS) {
    const [googleKeywords, bingKeywords] = await Promise.all([
      fetchGoogleSuggestions(topic),
      fetchBingSuggestions(topic),
    ]);

    const combined = Array.from(new Set([...googleKeywords, ...bingKeywords]));
    results[topic] = combined;
    console.log(`[+] Seed: "${topic}" -> Found ${combined.length} validated search terms`);
  }

  const outputPath = path.join(__dirname, 'keyword-research-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✅ Saved comprehensive report to: ${outputPath}`);
}

runResearch();
