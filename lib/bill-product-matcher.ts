import { InventoryItem } from '@/types/salon';

// Known vendor / brand abbreviations common in salon invoices
const BRAND_ABBREVIATIONS: Record<string, string> = {
  jc: 'jeannot',
  lp: 'loreal',
  sk: 'schwarzkopf',
  mx: 'matrix',
  o3: 'o3plus',
  ch: 'cheryls',
  vl: 'vlcc',
  ra: 'raaga',
};

/**
 * Normalizes a product name into core search tokens:
 * - Expands abbreviations like 'JC-' to 'jeannot'
 * - Removes noise like (HBL), (SC), (BWL)
 * - Removes size/pack suffixes like '7 x 2 ml', '30 ml', '50 ml', 'SPF15'
 */
export function normalizeProductTokens(name: string): Set<string> {
  if (!name) return new Set();
  let s = name.toLowerCase().trim();

  // 1. Expand brand prefix (e.g. 'jc-instant' or 'jc instant' -> 'jeannot instant')
  for (const [abbr, full] of Object.entries(BRAND_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr}[-_\\s]+`, 'g');
    s = s.replace(regex, `${full} `);
  }

  // 2. Remove text inside parentheses like '(HBL)', '(SC)', '(BWL)'
  s = s.replace(/\(.*?\)/g, ' ');

  // 3. Normalize common spelling/shortening variations
  s = s.replace(/\bre[-]?bal(\.|\b)/g, 'rebalancing ');
  s = s.replace(/\blightenung\b/g, 'lightening');
  s = s.replace(/\banti[-]?poll\b/g, 'anti-pollution');

  // 4. Strip packaging, volume, and size numbers (e.g. '7 x 2 ml', '50 ml', '30ml', 'spf15')
  s = s.replace(/\b\d+\s*x\s*\d+\s*(ml|g)?\b/g, ' ');
  s = s.replace(/\b\d+\s*(ml|g|kg|l|sachets|treat\.?|pcs)\b/g, ' ');
  s = s.replace(/\bspf\s*\d+\b/g, ' ');

  // 5. Clean punctuation to spaces
  s = s.replace(/[^a-z0-9\s]/g, ' ');

  // 6. Tokenize & filter out trivial words
  const stopWords = new Set(['in', 'and', 'with', 'for', 'the', 'of', 'treat', 'pack']);
  const tokens = new Set<string>();
  for (const word of s.split(/\s+/)) {
    const cleanWord = word.trim();
    if (cleanWord.length > 1 && !stopWords.has(cleanWord)) {
      tokens.add(cleanWord);
    }
  }

  return tokens;
}

export interface MatchResult {
  item: InventoryItem;
  score: number;
  method: 'exact' | 'alias' | 'fuzzy';
  isConfident: boolean; // true if score >= 0.75
}

/**
 * Matches a line item from a vendor bill against the current inventory items.
 * Order of resolution:
 * 1. Exact Name match (case-insensitive) -> Score 1.0 (Method: exact)
 * 2. Stored Alias match (from past bills confirmed by user) -> Score 1.0 (Method: alias)
 * 3. Smart Fuzzy Token Matching with MRP proximity -> Score 0.0 - 1.0 (Method: fuzzy)
 */
export function matchBillItemToInventory(
  billItem: { name: string; mrp?: number; rate?: number },
  inventory: InventoryItem[]
): MatchResult | null {
  if (!billItem.name || !inventory || inventory.length === 0) return null;

  const rawBillName = billItem.name.trim().toLowerCase();

  // ─── TIER 1: Exact Name Match ───
  for (const item of inventory) {
    if (item.name.trim().toLowerCase() === rawBillName) {
      return { item, score: 1.0, method: 'exact', isConfident: true };
    }
  }

  // ─── TIER 2: Saved Vendor Alias Match (Zero Future Issues!) ───
  for (const item of inventory) {
    if (item.aliases && item.aliases.length > 0) {
      const hasAlias = item.aliases.some(
        (a) => a.trim().toLowerCase() === rawBillName
      );
      if (hasAlias) {
        return { item, score: 1.0, method: 'alias', isConfident: true };
      }
    }
  }

  // ─── TIER 3: Fuzzy Token Normalization Matching ───
  const billTokens = normalizeProductTokens(billItem.name);
  if (billTokens.size === 0) return null;

  let bestItem: InventoryItem | null = null;
  let bestScore = 0;

  for (const item of inventory) {
    const itemTokens = normalizeProductTokens(item.name);
    if (itemTokens.size === 0) continue;

    // Calculate intersection
    let commonCount = 0;
    billTokens.forEach((token) => {
      if (itemTokens.has(token)) {
        commonCount++;
      }
    });

    if (commonCount === 0) continue;

    const precision = commonCount / billTokens.size;
    const recall = commonCount / itemTokens.size;
    let f1 = (2 * precision * recall) / (precision + recall);

    // Boost score if MRP is within 15%
    if (billItem.mrp && item.mrp && item.mrp > 0) {
      const diff = Math.abs(billItem.mrp - item.mrp) / Math.max(billItem.mrp, item.mrp);
      if (diff < 0.15) {
        f1 += 0.08;
      }
    }

    if (f1 > bestScore) {
      bestScore = f1;
      bestItem = item;
    }
  }

  if (bestItem && bestScore >= 0.65) {
    return {
      item: bestItem,
      score: Math.min(1.0, Number(bestScore.toFixed(2))),
      method: 'fuzzy',
      isConfident: bestScore >= 0.75,
    };
  }

  return null;
}

/**
 * Records a bill product name as an alias for an existing inventory item.
 * Ensures that this exact bill name will ALWAYS match instantly in all future bills!
 */
export function addAliasToInventoryItem(
  inventory: InventoryItem[],
  itemId: string,
  aliasName: string
): InventoryItem[] {
  const cleanAlias = aliasName.trim();
  if (!cleanAlias) return inventory;

  return inventory.map((item) => {
    if (item.id === itemId) {
      const existingAliases = item.aliases || [];
      const alreadyExists = existingAliases.some(
        (a) => a.trim().toLowerCase() === cleanAlias.toLowerCase()
      );
      if (alreadyExists) return item;
      return {
        ...item,
        aliases: [...existingAliases, cleanAlias],
      };
    }
    return item;
  });
}
