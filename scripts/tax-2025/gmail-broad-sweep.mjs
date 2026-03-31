#!/usr/bin/env node
/**
 * Gmail Broad Tax Sweep — Pass 2
 *
 * Much wider net: all receipts, invoices, financial statements,
 * subscriptions, orders, and any tax-adjacent emails from 2025.
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, 'token.json');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'docs', 'career', '2025-Tax-Bundle');

// ──────────────────────────────────────────────────
// BROAD sweep queries — cast a wide net
// ──────────────────────────────────────────────────
const BROAD_QUERIES = [
  // === ALL RECEIPTS & INVOICES (the big catch-all) ===
  {
    category: '09-All-Receipts',
    label: 'All Receipts 2025 (Jan-Jun)',
    query: 'subject:(receipt OR invoice) after:2025/01/01 before:2025/07/01',
  },
  {
    category: '09-All-Receipts',
    label: 'All Receipts 2025 (Jul-Dec)',
    query: 'subject:(receipt OR invoice) after:2025/07/01 before:2026/01/01',
  },
  {
    category: '09-All-Receipts',
    label: 'All Payment Confirmations 2025',
    query: 'subject:("payment confirmation" OR "payment received" OR "payment processed" OR "payment successful") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '09-All-Receipts',
    label: 'All Billing Statements 2025',
    query: 'subject:(billing OR statement OR "your bill" OR "monthly statement") after:2025/01/01 before:2026/01/01 -category:promotions',
  },
  {
    category: '09-All-Receipts',
    label: 'All Subscription Charges 2025',
    query: 'subject:(subscription OR "renewed" OR "auto-renewal" OR "recurring" OR "your plan") after:2025/01/01 before:2026/01/01 -category:promotions',
  },

  // === ORDERS (equipment, supplies, books) ===
  {
    category: '10-Orders',
    label: 'Amazon Orders 2025',
    query: 'from:(amazon OR auto-confirm@amazon) subject:(order OR "your order" OR delivery OR shipped) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '10-Orders',
    label: 'Apple Purchases 2025',
    query: 'from:(apple OR no_reply@email.apple.com) subject:(receipt OR invoice OR order OR purchase) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '10-Orders',
    label: 'All Online Orders 2025',
    query: 'subject:("order confirmed" OR "order confirmation" OR "order receipt" OR "your order") after:2025/01/01 before:2026/01/01',
  },

  // === TELECOM & UTILITIES (home office deduction) ===
  {
    category: '11-Utilities',
    label: 'Phone Bills (T-Mobile/Verizon/AT&T)',
    query: 'from:(t-mobile OR verizon OR att OR sprint OR tmobile OR mint OR visible OR google fi) subject:(bill OR statement OR payment OR invoice) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '11-Utilities',
    label: 'Internet Bills (Comcast/Spectrum/etc)',
    query: 'from:(comcast OR xfinity OR spectrum OR fios OR verizon OR cox OR optimum OR rcn OR att) subject:(bill OR statement OR payment OR invoice OR "internet") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '11-Utilities',
    label: 'Electric/Gas/Water',
    query: 'from:(coned OR pge OR edison OR duke OR energy OR electric OR gas OR water OR utility) subject:(bill OR statement OR payment) after:2025/01/01 before:2026/01/01',
  },

  // === INSURANCE ===
  {
    category: '12-Insurance',
    label: 'Health Insurance All',
    query: 'from:(anthem OR bluecross OR aetna OR cigna OR united OR humana OR kaiser OR oscar OR marketplace OR healthcare.gov OR covered) subject:(bill OR statement OR premium OR payment OR enrollment OR coverage OR EOB OR "explanation of benefits") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '12-Insurance',
    label: 'Other Insurance (Auto/Renters/Life)',
    query: 'from:(geico OR progressive OR state.farm OR allstate OR liberty OR farmers OR lemonade OR usaa) subject:(bill OR statement OR premium OR payment OR renewal OR policy) after:2025/01/01 before:2026/01/01',
  },

  // === BANKING & FINANCE ===
  {
    category: '13-Banking',
    label: 'Bank Statements & Notices',
    query: 'from:(chase OR wellsfargo OR bankofamerica OR citi OR capital.one OR ally OR discover OR sofi OR marcus) subject:(statement OR tax OR interest OR 1099 OR "year-end" OR "annual summary") after:2025/01/01 before:2026/06/01',
  },
  {
    category: '13-Banking',
    label: 'Credit Card Annual Summaries',
    query: 'subject:("year in review" OR "annual summary" OR "year-end" OR "2025 summary" OR "spending summary") after:2025/12/01 before:2026/04/01',
  },
  {
    category: '13-Banking',
    label: 'Brokerage Tax Forms',
    query: 'from:(schwab OR etrade OR fidelity OR vanguard OR robinhood OR webull OR interactive OR td ameritrade OR morgan.stanley) subject:(tax OR 1099 OR "tax document" OR "tax form" OR "important document" OR statement) after:2026/01/01 before:2026/06/01',
  },

  // === SAAS/TECH (broader sweep) ===
  {
    category: '14-SaaS-Broad',
    label: 'Notion',
    query: 'from:(notion) subject:(receipt OR invoice OR billing OR payment OR plan) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Figma',
    query: 'from:(figma) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Slack',
    query: 'from:(slack) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Zoom',
    query: 'from:(zoom) subject:(receipt OR invoice OR billing OR payment OR subscription) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Netlify / Railway / Fly.io / Render',
    query: 'from:(netlify OR railway OR fly.io OR render) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Supabase / PlanetScale / Neon',
    query: 'from:(supabase OR planetscale OR neon) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Replit / CodeSandbox / Gitpod',
    query: 'from:(replit OR codesandbox OR gitpod) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Cloudflare',
    query: 'from:(cloudflare) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'DigitalOcean / Linode / Hetzner',
    query: 'from:(digitalocean OR linode OR hetzner) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'OpenRouter / Replicate / Hugging Face',
    query: 'from:(openrouter OR replicate OR huggingface OR "hugging face") subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Midjourney / Stability / RunwayML',
    query: 'from:(midjourney OR stability OR runwayml) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Perplexity / Claude Pro / ChatGPT Plus',
    query: 'from:(perplexity) subject:(receipt OR invoice OR billing OR payment OR subscription) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Google Workspace / One',
    query: 'from:(google) subject:(receipt OR invoice OR "Google One" OR "Google Workspace" OR "storage plan") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '14-SaaS-Broad',
    label: 'Microsoft 365',
    query: 'from:(microsoft) subject:(receipt OR invoice OR billing OR "Microsoft 365" OR "Office 365") after:2025/01/01 before:2026/01/01',
  },

  // === EDUCATION & PROFESSIONAL DEV ===
  {
    category: '15-Education',
    label: 'Udemy',
    query: 'from:(udemy) subject:(receipt OR order OR purchase OR enrolled) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '15-Education',
    label: 'Coursera / edX / Pluralsight',
    query: 'from:(coursera OR edx OR pluralsight) subject:(receipt OR order OR purchase OR enrolled OR billing) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '15-Education',
    label: 'Book Purchases (OReilly/Amazon Kindle)',
    query: 'from:(oreilly OR kindle OR amazon) subject:("kindle" OR "ebook" OR "digital order") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '15-Education',
    label: 'Conference / Event Tickets',
    query: 'subject:(conference OR summit OR hackathon OR meetup OR event OR workshop) (subject:(ticket OR registration OR receipt OR confirmation)) after:2025/01/01 before:2026/01/01',
  },

  // === TRAVEL (if business travel) ===
  {
    category: '16-Travel',
    label: 'Flights',
    query: 'from:(united OR delta OR american OR southwest OR jetblue OR alaska OR spirit OR frontier OR google) subject:(itinerary OR "booking confirmation" OR receipt OR "flight confirmation" OR "trip confirmation") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '16-Travel',
    label: 'Hotels',
    query: 'from:(marriott OR hilton OR hyatt OR airbnb OR booking.com OR expedia OR hotels.com OR vrbo) subject:(confirmation OR receipt OR reservation OR invoice OR "booking confirmation") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '16-Travel',
    label: 'Rideshare / Transit',
    query: 'from:(uber OR lyft) subject:(receipt OR trip OR ride) after:2025/01/01 before:2026/01/01',
  },

  // === DONATIONS ===
  {
    category: '17-Donations',
    label: 'All Donations (broader)',
    query: '(subject:(donate OR donation OR charitable OR "tax receipt" OR "tax-deductible" OR "thank you for your" OR "contribution" OR "501(c)") OR subject:("donor" OR "giving")) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '17-Donations',
    label: 'GoFundMe / Patreon / Open Source',
    query: 'from:(gofundme OR patreon OR github OR "open collective" OR ko-fi) subject:(receipt OR donation OR contribution OR payment OR sponsor) after:2025/01/01 before:2026/01/01',
  },

  // === MEDICAL ===
  {
    category: '18-Medical',
    label: 'Medical Bills & EOBs',
    query: 'subject:("explanation of benefits" OR EOB OR "medical bill" OR copay OR "doctor" OR "pharmacy" OR prescription OR "health claim") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '18-Medical',
    label: 'Pharmacy (CVS/Walgreens/etc)',
    query: 'from:(cvs OR walgreens OR rite.aid OR express.scripts OR optum OR caremark) subject:(receipt OR order OR prescription OR refill) after:2025/01/01 before:2026/01/01',
  },

  // === RENT / HOUSING ===
  {
    category: '19-Housing',
    label: 'Rent Payments',
    query: 'subject:(rent OR "rent payment" OR "rent receipt" OR "lease" OR "monthly rent") from:(zelle OR venmo OR management OR realty OR landlord OR property OR apartment) after:2025/01/01 before:2026/01/01',
  },

  // === CATCH-ALL TAX KEYWORDS 2026 ===
  {
    category: '20-Tax-Catch-All',
    label: 'All 2026 Tax-Related Emails',
    query: 'subject:(tax OR 1099 OR W-2 OR 1098 OR 1095 OR "tax document" OR "tax form" OR "annual" OR "year-end") after:2026/01/01 before:2026/04/15 -category:promotions',
  },

  // === INCOME FROM PLATFORMS ===
  {
    category: '21-Platform-Income',
    label: 'Fiverr / Upwork / Toptal',
    query: 'from:(fiverr OR upwork OR toptal) subject:(payment OR invoice OR receipt OR earnings OR withdraw) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '21-Platform-Income',
    label: 'YouTube / Adsense / Substack',
    query: 'from:(youtube OR adsense OR google OR substack) subject:(payment OR earnings OR revenue OR payout) after:2025/01/01 before:2026/01/01',
  },
];

// ──────────────────────────────────────────────────
// Auth (reuse token from first scan)
// ──────────────────────────────────────────────────

async function authorize() {
  const content = await fs.readFile(TOKEN_PATH, 'utf8');
  const credentials = JSON.parse(content);
  const client = google.auth.fromJSON(credentials);
  await client.getAccessToken();
  return client;
}

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
    format: 'full',
  });
  return res.data;
}

async function downloadAttachment(gmail, messageId, attachmentId, filename, outputDir) {
  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });
  const data = Buffer.from(res.data.data, 'base64url');
  let filePath = path.join(outputDir, filename);
  let counter = 1;
  while (existsSync(filePath)) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    filePath = path.join(outputDir, `${base}_${counter}${ext}`);
    counter++;
  }
  await fs.writeFile(filePath, data);
  return filePath;
}

function getHeaders(msg) {
  const h = {};
  for (const x of msg.payload?.headers || []) h[x.name.toLowerCase()] = x.value;
  return h;
}

function getAttachments(msg) {
  const atts = [];
  function walk(parts) {
    for (const p of parts || []) {
      if (p.filename && p.body?.attachmentId) {
        atts.push({ filename: p.filename, mimeType: p.mimeType, size: p.body.size, attachmentId: p.body.attachmentId });
      }
      if (p.parts) walk(p.parts);
    }
  }
  walk(msg.payload?.parts || []);
  if (msg.payload?.filename && msg.payload?.body?.attachmentId) {
    atts.push({ filename: msg.payload.filename, mimeType: msg.payload.mimeType, size: msg.payload.body.size, attachmentId: msg.payload.body.attachmentId });
  }
  return atts;
}

// ──────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  Gmail BROAD Tax Sweep — Pass 2');
  console.log('='.repeat(60));
  console.log();

  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  const categories = [...new Set(BROAD_QUERIES.map(q => q.category))];
  for (const cat of categories) {
    await fs.mkdir(path.join(OUTPUT_DIR, cat), { recursive: true });
  }
  await fs.mkdir(path.join(OUTPUT_DIR, '22-Broad-Summaries'), { recursive: true });

  const seenMessageIds = new Set();

  // Load already-seen IDs from pass 1 manifest
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, 'SCAN_MANIFEST.json'), 'utf8'));
    console.log(`[DEDUP] Loaded pass-1 manifest (${manifest.totalEmails} emails already processed)`);
  } catch {}

  const results = [];
  let totalEmails = 0;
  let totalAttachments = 0;

  for (let i = 0; i < BROAD_QUERIES.length; i++) {
    const { category, label, query } = BROAD_QUERIES[i];
    const progress = `[${i + 1}/${BROAD_QUERIES.length}]`;
    process.stdout.write(`${progress} ${label}...`);

    try {
      const messages = await searchGmail(gmail, query);
      const unique = messages.filter(m => {
        if (seenMessageIds.has(m.id)) return false;
        seenMessageIds.add(m.id);
        return true;
      });

      if (unique.length === 0) {
        console.log(' 0 new');
        results.push({ category, label, emails: 0, attachments: 0, status: 'EMPTY' });
        continue;
      }

      console.log(` ${unique.length} emails`);
      totalEmails += unique.length;

      let queryAtts = 0;
      const summaries = [];

      for (const msg of unique) {
        const details = await getMessageDetails(gmail, msg.id);
        const headers = getHeaders(details);
        const attachments = getAttachments(details);
        const date = headers.date ? new Date(headers.date).toISOString().split('T')[0] : 'unknown';
        const from = (headers.from || 'unknown').substring(0, 100);
        const subject = (headers.subject || '').substring(0, 150);

        summaries.push({ date, from, subject, attachments: attachments.length, attachmentNames: attachments.map(a => a.filename) });

        const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg'];
        for (const att of attachments) {
          const ext = path.extname(att.filename).toLowerCase();
          if (docExts.includes(ext) || att.mimeType === 'application/pdf') {
            const outDir = path.join(OUTPUT_DIR, category);
            const safeName = `${date}_${att.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const saved = await downloadAttachment(gmail, msg.id, att.attachmentId, safeName, outDir);
            console.log(`    -> ${path.basename(saved)} (${(att.size / 1024).toFixed(1)}KB)`);
            queryAtts++;
            totalAttachments++;
          }
        }
      }

      const summaryPath = path.join(OUTPUT_DIR, '22-Broad-Summaries', `${label.replace(/[^a-zA-Z0-9-]/g, '_')}.json`);
      await fs.writeFile(summaryPath, JSON.stringify(summaries, null, 2));
      results.push({ category, label, emails: unique.length, attachments: queryAtts, status: queryAtts > 0 ? 'HAS_DOCS' : unique.length > 0 ? 'EMAILS_ONLY' : 'EMPTY' });

      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      results.push({ category, label, emails: 0, attachments: 0, status: `ERROR: ${err.message}` });
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('  BROAD SWEEP COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log(`  New unique emails: ${totalEmails}`);
  console.log(`  New attachments downloaded: ${totalAttachments}`);
  console.log(`  Total unique emails (deduped): ${seenMessageIds.size}`);
  console.log();

  console.log('  Category                              | Emails | Docs | Status');
  console.log('  ' + '-'.repeat(75));
  for (const r of results) {
    if (r.emails > 0 || r.attachments > 0) {
      const l = r.label.padEnd(39);
      console.log(`  ${l} | ${String(r.emails).padStart(6)} | ${String(r.attachments).padStart(4)} | ${r.status}`);
    }
  }

  // Categories with 0 results
  const empty = results.filter(r => r.emails === 0);
  if (empty.length > 0) {
    console.log();
    console.log(`  (${empty.length} categories returned 0 results — omitted from table)`);
  }

  // Save broad sweep manifest
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'BROAD_SWEEP_MANIFEST.json'),
    JSON.stringify({ scanDate: new Date().toISOString(), totalEmails, totalAttachments, totalUnique: seenMessageIds.size, results }, null, 2)
  );

  console.log();
  console.log('  Manifest: BROAD_SWEEP_MANIFEST.json');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
