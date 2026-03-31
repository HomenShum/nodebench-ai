#!/usr/bin/env node
/**
 * Gmail Chase Food/Gas/Amazon Scanner — 2025 Tax Year
 *
 * Searches for:
 * 1. Chase gas station transaction alerts
 * 2. Chase restaurant/food transaction alerts
 * 3. Uber Eats / DoorDash / Grubhub receipts
 * 4. Amazon equipment purchases (monitors, keyboards, webcams, etc.)
 *
 * Usage:
 *   node scripts/tax-2025/gmail-chase-food-gas.mjs
 *
 * Output:
 *   scripts/tax-2025/chase-food-gas-results.json  (full data)
 *   Console: formatted table of all transactions found
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, 'token.json');
const OUTPUT_PATH = path.join(__dirname, 'chase-food-gas-results.json');

// ──────────────────────────────────────────────────
// Search queries
// ──────────────────────────────────────────────────
const QUERIES = [
  // --- CHASE GAS STATIONS ---
  {
    category: 'Chase-Gas',
    label: 'Chase Gas Station Alerts (broad)',
    query: 'from:chase after:2025/01/01 before:2026/01/01 (gas OR fuel OR shell OR chevron OR arco OR "76" OR mobil OR exxon OR valero OR marathon OR "circle k" OR "speedway" OR "wawa" OR "casey" OR "kwik trip" OR "loves" OR "pilot")',
  },
  {
    category: 'Chase-Gas',
    label: 'Chase Costco Gas',
    query: 'from:chase after:2025/01/01 before:2026/01/01 costco',
  },
  {
    category: 'Chase-Gas',
    label: 'Chase Subject: Gas/Fuel Alerts',
    query: 'from:chase subject:(gas OR fuel OR shell OR chevron OR arco OR mobil OR exxon OR valero) after:2025/01/01 before:2026/01/01',
  },

  // --- CHASE RESTAURANTS / FOOD ---
  {
    category: 'Chase-Food',
    label: 'Chase Restaurant Alerts',
    query: 'from:chase after:2025/01/01 before:2026/01/01 (restaurant OR "dining" OR "food" OR "cafe" OR "coffee" OR "pizza" OR "burger" OR "sushi" OR "taco" OR "grill" OR "bistro" OR "kitchen" OR "bakery")',
  },
  {
    category: 'Chase-Food',
    label: 'Chase Fast Food Chains',
    query: 'from:chase after:2025/01/01 before:2026/01/01 (mcdonalds OR "mcdonald\'s" OR starbucks OR chipotle OR "taco bell" OR "chick-fil-a" OR subway OR "panda express" OR "in-n-out" OR "jack in the box" OR "del taco" OR "five guys" OR "shake shack" OR dominos OR "pizza hut" OR "papa johns")',
  },
  {
    category: 'Chase-Food',
    label: 'Chase Transaction Alerts (all) — Jan–Jun 2025',
    query: 'from:chase subject:(transaction OR purchase OR charge OR "you made a purchase" OR "a transaction was made") after:2025/01/01 before:2025/07/01',
  },
  {
    category: 'Chase-Food',
    label: 'Chase Transaction Alerts (all) — Jul–Dec 2025',
    query: 'from:chase subject:(transaction OR purchase OR charge OR "you made a purchase" OR "a transaction was made") after:2025/07/01 before:2026/01/01',
  },

  // --- DELIVERY APPS ---
  {
    category: 'Delivery',
    label: 'Uber Eats Receipts 2025',
    query: 'from:(uber OR ubereats OR uber.com) subject:(receipt OR order OR "your order" OR "order confirmation") after:2025/01/01 before:2026/01/01',
  },
  {
    category: 'Delivery',
    label: 'DoorDash Receipts 2025',
    query: 'from:(doordash OR "door dash") subject:(receipt OR order OR "your order" OR "order confirmation" OR "order delivered") after:2025/01/01 before:2026/01/01',
  },
  {
    category: 'Delivery',
    label: 'Grubhub Receipts 2025',
    query: 'from:(grubhub) subject:(receipt OR order OR "your order" OR "order confirmation") after:2025/01/01 before:2026/01/01',
  },
  {
    category: 'Delivery',
    label: 'Instacart / Postmates / Seamless',
    query: 'from:(instacart OR postmates OR seamless OR caviar) subject:(receipt OR order OR "your order") after:2025/01/01 before:2026/01/01',
  },

  // --- AMAZON EQUIPMENT ---
  {
    category: 'Amazon-Equipment',
    label: 'Amazon Orders 2025 (all)',
    query: 'from:(amazon.com OR auto-confirm@amazon.com OR shipment-tracking@amazon.com) subject:("Your Amazon.com order" OR "order confirmation" OR "order shipped" OR "delivered") after:2025/01/01 before:2026/01/01',
  },
  {
    category: 'Amazon-Equipment',
    label: 'Amazon Equipment Keywords',
    query: 'from:amazon after:2025/01/01 before:2026/01/01 (monitor OR keyboard OR webcam OR "web cam" OR desk OR chair OR cable OR adapter OR hub OR headset OR microphone OR "hard drive" OR SSD OR laptop OR mouse OR trackpad OR "usb-c" OR "standing desk" OR ergonomic)',
  },
];

// ──────────────────────────────────────────────────
// Amount extraction helpers
// ──────────────────────────────────────────────────

/**
 * Extract dollar amounts from text.
 * Patterns: $12.34, $1,234.56
 */
function extractAmounts(text) {
  if (!text) return [];
  const matches = text.match(/\$[\d,]+\.?\d{0,2}/g) || [];
  return matches
    .map(m => parseFloat(m.replace(/[$,]/g, '')))
    .filter(n => !isNaN(n) && n > 0 && n < 50000);
}

/**
 * Extract merchant/vendor name from Chase alert subject lines.
 * Chase format examples:
 *   "A transaction of $12.34 has been made at STARBUCKS"
 *   "You made a $45.00 purchase at CHEVRON"
 *   "Chase: $23.45 purchase at SHELL OIL"
 */
function extractMerchant(subject, snippet) {
  const text = subject + ' ' + (snippet || '');

  // Pattern: "at MERCHANT NAME"
  const atMatch = text.match(/\bat\s+([A-Z][A-Z0-9*#&'\s\-\.]+?)(?:\s+on|\s+\d|\.|,|$)/i);
  if (atMatch) return atMatch[1].trim();

  // Pattern: "purchase at", "charged at", "transaction at"
  const purchaseAt = text.match(/(?:purchase|charged|transaction)\s+at\s+(.+?)(?:\s+for|\s+\$|\s+on|\.|,|$)/i);
  if (purchaseAt) return purchaseAt[1].trim();

  return null;
}

/**
 * Classify transaction as gas/food/delivery/equipment
 */
function classifyMerchant(merchant, subject, snippet) {
  const text = (merchant || '') + ' ' + subject + ' ' + (snippet || '');
  const lower = text.toLowerCase();

  const GAS = ['shell', 'chevron', 'arco', 'exxon', 'mobil', 'valero', 'marathon', '76', 'circle k',
    'speedway', 'wawa', 'pilot', 'loves', 'casey', 'kwik', 'fuel', 'gas station', 'gasoline', 'costco gas'];
  const DELIVERY = ['uber eats', 'ubereats', 'doordash', 'door dash', 'grubhub', 'instacart', 'postmates', 'seamless', 'caviar'];
  const FAST_FOOD = ['mcdonald', 'starbucks', 'chipotle', 'taco bell', 'chick-fil-a', 'subway', 'panda express',
    'in-n-out', 'jack in the box', 'del taco', 'five guys', 'shake shack', 'domino', 'pizza hut', 'papa john',
    'whataburger', 'culvers', 'sonic', 'dairy queen', 'wendys', "wendy's", 'popeyes', 'kfc'];
  const EQUIPMENT = ['amazon', 'monitor', 'keyboard', 'webcam', 'standing desk', 'usb', 'adapter', 'hub',
    'headset', 'microphone', 'hard drive', 'ssd', 'laptop', 'mouse', 'trackpad', 'ergonomic', 'cable'];

  if (GAS.some(k => lower.includes(k))) return 'GAS';
  if (DELIVERY.some(k => lower.includes(k))) return 'DELIVERY';
  if (FAST_FOOD.some(k => lower.includes(k))) return 'RESTAURANT';
  if (EQUIPMENT.some(k => lower.includes(k))) return 'EQUIPMENT';
  if (lower.includes('restaurant') || lower.includes('dining') || lower.includes('cafe') ||
      lower.includes('coffee') || lower.includes('pizza') || lower.includes('burger') ||
      lower.includes('sushi') || lower.includes('grill') || lower.includes('bistro') ||
      lower.includes('kitchen') || lower.includes('bakery') || lower.includes('food')) return 'RESTAURANT';
  return 'OTHER';
}

// ──────────────────────────────────────────────────
// Gmail auth
// ──────────────────────────────────────────────────

async function authorize() {
  const content = await fs.readFile(TOKEN_PATH, 'utf8');
  const credentials = JSON.parse(content);
  const client = google.auth.fromJSON(credentials);
  await client.getAccessToken(); // Triggers refresh if needed
  return client;
}

// ──────────────────────────────────────────────────
// Gmail search + message fetch
// ──────────────────────────────────────────────────

async function searchGmail(gmail, query) {
  const messages = [];
  let pageToken;
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
      pageToken,
    });
    if (res.data.messages) messages.push(...res.data.messages);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return messages;
}

async function getMessageDetails(gmail, messageId) {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'Date'],
  });
  return res.data;
}

function getHeader(msg, name) {
  const h = msg.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

// ──────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70));
  console.log('  Chase Food/Gas/Amazon Gmail Scanner — 2025 Tax Year');
  console.log('='.repeat(70));
  console.log();

  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  const seenIds = new Set();
  const allTransactions = [];
  const categoryTotals = {};
  const queryResults = [];

  for (let i = 0; i < QUERIES.length; i++) {
    const { category, label, query } = QUERIES[i];
    process.stdout.write(`[${i + 1}/${QUERIES.length}] ${label}... `);

    try {
      const messages = await searchGmail(gmail, query);
      const unique = messages.filter(m => {
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
      });

      if (unique.length === 0) {
        console.log('0 results');
        queryResults.push({ category, label, count: 0, transactions: [] });
        continue;
      }

      console.log(`${unique.length} emails — fetching details...`);

      const transactions = [];

      for (const msg of unique) {
        try {
          const details = await getMessageDetails(gmail, msg.id);
          const subject = getHeader(details, 'Subject');
          const from = getHeader(details, 'From');
          const dateStr = getHeader(details, 'Date');
          const snippet = details.snippet || '';
          const date = dateStr ? new Date(dateStr).toISOString().split('T')[0] : 'unknown';

          const amounts = extractAmounts(subject + ' ' + snippet);
          const merchant = extractMerchant(subject, snippet);
          const type = classifyMerchant(merchant, subject, snippet);

          const tx = {
            date,
            from: from.substring(0, 80),
            subject: subject.substring(0, 150),
            snippet: snippet.substring(0, 200),
            amounts,
            primaryAmount: amounts.length > 0 ? Math.max(...amounts) : null,
            merchant: merchant || 'Unknown',
            type,
            category,
            messageId: msg.id,
          };

          transactions.push(tx);
          allTransactions.push(tx);

          if (!categoryTotals[type]) categoryTotals[type] = { count: 0, total: 0 };
          categoryTotals[type].count++;
          if (tx.primaryAmount) categoryTotals[type].total += tx.primaryAmount;
        } catch (err) {
          // Skip individual message errors silently
        }
      }

      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 150));

      queryResults.push({ category, label, count: transactions.length, transactions });
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      queryResults.push({ category, label, count: 0, error: err.message, transactions: [] });
    }
  }

  // ──────────────────────────────────────────────────
  // Sort and deduplicate all transactions by date
  // ──────────────────────────────────────────────────
  allTransactions.sort((a, b) => a.date.localeCompare(b.date));

  // ──────────────────────────────────────────────────
  // Console output — formatted table
  // ──────────────────────────────────────────────────
  console.log();
  console.log('='.repeat(70));
  console.log('  RESULTS BY CATEGORY');
  console.log('='.repeat(70));

  const categories = ['GAS', 'RESTAURANT', 'DELIVERY', 'EQUIPMENT', 'OTHER'];

  for (const cat of categories) {
    const txs = allTransactions.filter(t => t.type === cat);
    if (txs.length === 0) continue;

    console.log();
    console.log(`  ── ${cat} (${txs.length} transactions) ──────────────────`);
    console.log(`  ${'DATE'.padEnd(12)} ${'AMOUNT'.padStart(9)}  ${'MERCHANT / SUBJECT'.padEnd(45)}`);
    console.log('  ' + '-'.repeat(70));

    let catTotal = 0;
    for (const tx of txs) {
      const amt = tx.primaryAmount != null ? `$${tx.primaryAmount.toFixed(2)}`.padStart(9) : '       ??';
      const merchant = (tx.merchant !== 'Unknown' ? tx.merchant : tx.subject).substring(0, 45);
      console.log(`  ${tx.date.padEnd(12)} ${amt}  ${merchant}`);
      if (tx.primaryAmount) catTotal += tx.primaryAmount;
    }
    console.log('  ' + '-'.repeat(70));
    console.log(`  ${'SUBTOTAL'.padEnd(12)} ${'$' + catTotal.toFixed(2).padStart(8)}  (${txs.length} items)`);
  }

  // ──────────────────────────────────────────────────
  // Summary totals
  // ──────────────────────────────────────────────────
  console.log();
  console.log('='.repeat(70));
  console.log('  SUMMARY TOTALS');
  console.log('='.repeat(70));
  console.log();

  let grandTotal = 0;
  for (const cat of categories) {
    const data = categoryTotals[cat];
    if (!data) continue;
    const label = cat.padEnd(15);
    const count = String(data.count).padStart(4);
    const total = ('$' + data.total.toFixed(2)).padStart(10);
    console.log(`  ${label}  ${count} transactions   ${total}`);
    grandTotal += data.total;
  }
  console.log('  ' + '-'.repeat(50));
  console.log(`  ${'GRAND TOTAL'.padEnd(15)}               ${('$' + grandTotal.toFixed(2)).padStart(10)}`);
  console.log();
  console.log(`  Total unique emails scanned: ${seenIds.size}`);

  // ──────────────────────────────────────────────────
  // Full JSON output (all raw data for accountant)
  // ──────────────────────────────────────────────────
  const output = {
    scanDate: new Date().toISOString(),
    taxYear: 2025,
    totalEmailsScanned: seenIds.size,
    totalTransactions: allTransactions.length,
    categoryTotals,
    grandTotal,
    transactions: allTransactions,
    queryResults: queryResults.map(q => ({ ...q, transactions: q.transactions?.length || 0 })),
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`  Full results saved to: ${OUTPUT_PATH}`);
  console.log();

  // ──────────────────────────────────────────────────
  // Amazon orders — list all subjects for manual review
  // ──────────────────────────────────────────────────
  const amazonTxs = allTransactions.filter(t => t.category === 'Amazon-Equipment');
  if (amazonTxs.length > 0) {
    console.log('='.repeat(70));
    console.log('  AMAZON ORDERS (all — review for business equipment)');
    console.log('='.repeat(70));
    for (const tx of amazonTxs) {
      const amt = tx.primaryAmount != null ? `$${tx.primaryAmount.toFixed(2)}` : '?';
      console.log(`  ${tx.date}  ${amt.padStart(9)}  ${tx.subject.substring(0, 55)}`);
    }
    console.log();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
