#!/usr/bin/env node
/**
 * Gmail Tax Document Scanner — 2025 Tax Year
 *
 * Scans Gmail for tax-related documents, downloads attachments,
 * and organizes them into a structured folder for the accountant.
 *
 * Usage:
 *   1. Set up Google Cloud OAuth (see SETUP.md)
 *   2. Place credentials.json in this directory
 *   3. Run: node scripts/tax-2025/gmail-tax-scanner.mjs
 */

import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'docs', 'career', '2025-Tax-Bundle');

// ──────────────────────────────────────────────────
// Gmail search queries for 2025 tax documents
// ──────────────────────────────────────────────────
const TAX_QUERIES = [
  // === INCOME DOCUMENTS ===
  {
    category: '01-Income/W2s',
    label: 'W-2 Forms',
    query: 'subject:(W-2 OR W2 OR "wage and tax" OR "wage tax statement") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '01-Income/1099s',
    label: '1099-NEC/MISC (Freelance)',
    query: 'subject:(1099-NEC OR 1099-MISC OR "non-employee compensation" OR "miscellaneous income") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '01-Income/1099s',
    label: '1099-K (Payment Processors)',
    query: '(from:(stripe OR paypal OR venmo OR square OR cashapp) OR subject:(1099-K)) subject:(tax OR 1099 OR "annual") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '01-Income/1099s',
    label: '1099-INT (Bank Interest)',
    query: 'subject:(1099-INT OR "interest income" OR "interest earned") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '01-Income/1099s',
    label: '1099-DIV (Dividends)',
    query: 'subject:(1099-DIV OR "dividend" OR "capital gains distribution") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '01-Income/1099s',
    label: '1099-B (Brokerage)',
    query: '(from:(schwab OR fidelity OR vanguard OR robinhood OR etrade OR tdameritrade OR webull OR coinbase OR interactive) OR subject:(1099-B OR "proceeds from broker" OR "consolidated 1099")) after:2026/01/01 before:2026/06/01',
  },
  {
    category: '01-Income/1099s',
    label: '1099-R (Retirement)',
    query: 'subject:(1099-R OR "retirement distribution" OR "IRA distribution") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '01-Income/K1s',
    label: 'K-1 (Partnership)',
    query: 'subject:(K-1 OR "schedule K" OR "partnership income" OR "S corporation") after:2026/01/01 before:2026/06/01',
  },

  // === DEDUCTION DOCUMENTS ===
  {
    category: '02-Deductions/Mortgage',
    label: '1098 (Mortgage Interest)',
    query: 'subject:(1098 OR "mortgage interest statement") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '02-Deductions/Education',
    label: '1098-T (Tuition)',
    query: 'subject:(1098-T OR "tuition statement" OR "tuition paid") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '02-Deductions/Education',
    label: '1098-E (Student Loan Interest)',
    query: 'subject:(1098-E OR "student loan interest") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '02-Deductions/Charitable',
    label: 'Charitable Donations',
    query: 'subject:(donation OR charitable OR "tax receipt" OR "tax-deductible" OR "contribution receipt" OR "donor receipt") after:2025/01/01 before:2026/01/01',
  },
  {
    category: '02-Deductions/Health',
    label: 'HSA (5498-SA / 1099-SA)',
    query: 'subject:(HSA OR "health savings" OR 5498-SA OR 1099-SA) after:2026/01/01 before:2026/06/01',
  },
  {
    category: '02-Deductions/Health',
    label: 'Health Insurance (1095)',
    query: 'subject:(1095 OR "health coverage" OR "health insurance" OR "marketplace") (subject:(tax OR form OR statement OR coverage)) after:2026/01/01 before:2026/06/01',
  },
  {
    category: '02-Deductions/Property',
    label: 'Property Tax Statements',
    query: 'subject:("property tax" OR "real estate tax" OR "tax assessment" OR "tax bill") after:2025/01/01 before:2026/06/01',
  },

  // === BUSINESS EXPENSES (Schedule C) ===
  {
    category: '03-Business-Expenses/SaaS',
    label: 'Anthropic/Claude API',
    query: 'from:(anthropic OR claude) subject:(receipt OR invoice OR billing OR payment OR charge) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'OpenAI API',
    query: 'from:(openai) subject:(receipt OR invoice OR billing OR payment OR charge) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'Google Cloud / Gemini',
    query: 'from:(google-cloud OR googlecloud OR cloud.google) subject:(invoice OR receipt OR billing OR statement) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'Vercel Hosting',
    query: 'from:(vercel) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'Convex Database',
    query: 'from:(convex) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'GitHub / Copilot',
    query: 'from:(github OR noreply@github.com) subject:(receipt OR invoice OR billing OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'AWS',
    query: 'from:(aws OR amazon.com) subject:(invoice OR billing OR statement OR receipt) (subject:(web services OR AWS)) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'Cursor / JetBrains / IDE',
    query: 'from:(cursor OR jetbrains OR cursor.sh OR jetbrains.com) subject:(receipt OR invoice OR license OR subscription OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'Domain Registrations',
    query: 'from:(namecheap OR godaddy OR cloudflare OR google domains OR squarespace) subject:(receipt OR invoice OR renewal OR registration) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'Stripe Fees',
    query: 'from:(stripe) subject:(payout OR invoice OR receipt OR fee) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/SaaS',
    label: 'LinkedIn Premium',
    query: 'from:(linkedin) subject:(receipt OR invoice OR premium OR subscription OR payment) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/Equipment',
    label: 'Computer/Equipment Purchases',
    query: 'from:(apple OR amazon OR bestbuy OR newegg OR b&h) subject:(order OR receipt OR invoice) (subject:(macbook OR laptop OR monitor OR keyboard OR mouse OR computer OR ipad OR desk)) after:2025/01/01 before:2026/01/01',
  },
  {
    category: '03-Business-Expenses/Education',
    label: 'Courses & Books',
    query: 'from:(udemy OR coursera OR oreilly OR pluralsight OR educative OR amazon) subject:(receipt OR order OR enrollment OR purchase) (subject:(course OR book OR learning OR training)) after:2025/01/01 before:2026/01/01',
  },

  // === ESTIMATED TAX PAYMENTS ===
  {
    category: '04-Estimated-Payments',
    label: 'IRS Estimated Payments',
    query: 'from:(irs OR treasury) subject:(estimated OR payment OR "confirmation" OR "accepted") after:2025/01/01 before:2026/06/01',
  },
  {
    category: '04-Estimated-Payments',
    label: 'State Tax Payments',
    query: 'subject:("state tax" OR "estimated tax" OR "quarterly payment") from:(tax OR franchise OR revenue) after:2025/01/01 before:2026/06/01',
  },

  // === CATCH-ALL ===
  {
    category: '05-General-Tax',
    label: 'Generic Tax Documents',
    query: 'subject:("tax document" OR "tax form" OR "tax statement" OR "tax return" OR "annual tax" OR "tax summary") after:2026/01/01 before:2026/06/01',
  },
  {
    category: '05-General-Tax',
    label: 'IRS Correspondence',
    query: 'from:(irs.gov OR irs OR "internal revenue") after:2025/01/01 before:2026/06/01',
  },

  // === CRYPTO ===
  {
    category: '06-Crypto',
    label: 'Crypto Exchange Tax Docs',
    query: 'from:(coinbase OR binance OR kraken OR gemini OR crypto.com) subject:(tax OR 1099 OR statement OR year OR annual) after:2026/01/01 before:2026/06/01',
  },

  // === RETIREMENT ===
  {
    category: '07-Retirement',
    label: 'IRA/401k Contributions (5498)',
    query: 'subject:(5498 OR "IRA contribution" OR "401k" OR "retirement contribution") after:2026/01/01 before:2026/06/01',
  },
];

// ──────────────────────────────────────────────────
// Auth helpers
// ──────────────────────────────────────────────────

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH, 'utf8');
    const credentials = JSON.parse(content);
    const client = google.auth.fromJSON(credentials);
    // Force token refresh — fromJSON doesn't auto-fetch an access token
    await client.getAccessToken();
    return client;
  } catch {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH, 'utf8');
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    console.log('[AUTH] Using saved credentials');
    return client;
  }
  console.log('[AUTH] Opening browser for Google OAuth consent...');
  client = await authenticate({
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
    console.log('[AUTH] Credentials saved for future runs');
  }
  return client;
}

// ──────────────────────────────────────────────────
// Gmail helpers
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
    if (res.data.messages) {
      messages.push(...res.data.messages);
    }
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
  const filePath = path.join(outputDir, filename);

  // Avoid overwriting — append counter if exists
  let finalPath = filePath;
  let counter = 1;
  while (existsSync(finalPath)) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    finalPath = path.join(outputDir, `${base}_${counter}${ext}`);
    counter++;
  }

  await fs.writeFile(finalPath, data);
  return finalPath;
}

function getHeaders(message) {
  const headers = {};
  for (const h of message.payload?.headers || []) {
    headers[h.name.toLowerCase()] = h.value;
  }
  return headers;
}

function getAttachments(message) {
  const attachments = [];

  function walkParts(parts) {
    for (const part of parts || []) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) walkParts(part.parts);
    }
  }

  walkParts(message.payload?.parts || []);
  // Check top-level body too
  if (message.payload?.filename && message.payload?.body?.attachmentId) {
    attachments.push({
      filename: message.payload.filename,
      mimeType: message.payload.mimeType,
      size: message.payload.body.size,
      attachmentId: message.payload.body.attachmentId,
    });
  }

  return attachments;
}

// ──────────────────────────────────────────────────
// Main scanner
// ──────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  Gmail Tax Document Scanner — 2025 Tax Year');
  console.log('='.repeat(60));
  console.log();

  // Check credentials exist
  if (!existsSync(CREDENTIALS_PATH)) {
    console.error('[ERROR] credentials.json not found!');
    console.error('  Place your Google OAuth credentials.json in:');
    console.error(`  ${CREDENTIALS_PATH}`);
    console.error();
    console.error('  See SETUP.md for instructions.');
    process.exit(1);
  }

  // Authorize
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  // Create output directory structure
  const categories = [...new Set(TAX_QUERIES.map(q => q.category))];
  for (const cat of categories) {
    await fs.mkdir(path.join(OUTPUT_DIR, cat), { recursive: true });
  }
  await fs.mkdir(path.join(OUTPUT_DIR, '08-Email-Summaries'), { recursive: true });

  console.log(`[OUTPUT] Saving to: ${OUTPUT_DIR}`);
  console.log();

  // Results tracking
  const results = [];
  let totalEmails = 0;
  let totalAttachments = 0;
  const seenMessageIds = new Set();

  // Run each query
  for (let i = 0; i < TAX_QUERIES.length; i++) {
    const { category, label, query } = TAX_QUERIES[i];
    const progress = `[${i + 1}/${TAX_QUERIES.length}]`;

    process.stdout.write(`${progress} Searching: ${label}...`);

    try {
      const messages = await searchGmail(gmail, query);
      const uniqueMessages = messages.filter(m => {
        if (seenMessageIds.has(m.id)) return false;
        seenMessageIds.add(m.id);
        return true;
      });

      if (uniqueMessages.length === 0) {
        console.log(' 0 results');
        results.push({ category, label, emails: 0, attachments: 0, status: 'EMPTY' });
        continue;
      }

      console.log(` ${uniqueMessages.length} emails found`);
      totalEmails += uniqueMessages.length;

      let queryAttachments = 0;
      const emailSummaries = [];

      for (const msg of uniqueMessages) {
        const details = await getMessageDetails(gmail, msg.id);
        const headers = getHeaders(details);
        const attachments = getAttachments(details);
        const date = headers.date ? new Date(headers.date).toISOString().split('T')[0] : 'unknown-date';
        const from = headers.from || 'unknown';
        const subject = headers.subject || 'no-subject';

        emailSummaries.push({
          date,
          from: from.substring(0, 80),
          subject: subject.substring(0, 120),
          attachments: attachments.length,
          attachmentNames: attachments.map(a => a.filename),
        });

        // Download PDF and document attachments
        const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg'];
        for (const att of attachments) {
          const ext = path.extname(att.filename).toLowerCase();
          if (docExtensions.includes(ext) || att.mimeType === 'application/pdf') {
            const outputDir = path.join(OUTPUT_DIR, category);
            const safeName = `${date}_${att.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const saved = await downloadAttachment(gmail, msg.id, att.attachmentId, safeName, outputDir);
            console.log(`    -> Downloaded: ${path.basename(saved)} (${(att.size / 1024).toFixed(1)}KB)`);
            queryAttachments++;
            totalAttachments++;
          }
        }
      }

      // Save email summary for this category
      const summaryPath = path.join(OUTPUT_DIR, '08-Email-Summaries', `${label.replace(/[^a-zA-Z0-9-]/g, '_')}.json`);
      await fs.writeFile(summaryPath, JSON.stringify(emailSummaries, null, 2));

      results.push({
        category,
        label,
        emails: uniqueMessages.length,
        attachments: queryAttachments,
        status: queryAttachments > 0 ? 'HAS_DOCS' : 'EMAILS_ONLY',
      });

      // Rate limiting — be gentle with Gmail API
      await new Promise(r => setTimeout(r, 250));

    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      results.push({ category, label, emails: 0, attachments: 0, status: `ERROR: ${err.message}` });
    }
  }

  // ──────────────────────────────────────────────────
  // Generate summary report
  // ──────────────────────────────────────────────────
  console.log();
  console.log('='.repeat(60));
  console.log('  SCAN COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log(`  Total unique emails found: ${totalEmails}`);
  console.log(`  Total attachments downloaded: ${totalAttachments}`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log();

  // Print results table
  console.log('  Category                         | Emails | Docs | Status');
  console.log('  ' + '-'.repeat(70));
  for (const r of results) {
    const label = r.label.padEnd(34);
    const emails = String(r.emails).padStart(6);
    const docs = String(r.attachments).padStart(4);
    console.log(`  ${label} | ${emails} | ${docs} | ${r.status}`);
  }

  // Write manifest
  const manifest = {
    scanDate: new Date().toISOString(),
    taxYear: 2025,
    totalEmails,
    totalAttachments,
    results,
    outputDirectory: OUTPUT_DIR,
    queriesRun: TAX_QUERIES.length,
    missingCategories: results.filter(r => r.status === 'EMPTY').map(r => r.label),
    actionRequired: results.filter(r => r.status === 'EMPTY').map(r => ({
      label: r.label,
      action: `Check manually — may need to download from provider portal`,
    })),
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'SCAN_MANIFEST.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Write human-readable summary
  const summaryMd = `# 2025 Tax Document Scan Results

**Scan Date:** ${manifest.scanDate}
**Tax Year:** 2025
**Total Emails Found:** ${totalEmails}
**Total Attachments Downloaded:** ${totalAttachments}

## Results by Category

| Category | Emails | Docs Downloaded | Status |
|----------|--------|-----------------|--------|
${results.map(r => `| ${r.label} | ${r.emails} | ${r.attachments} | ${r.status} |`).join('\n')}

## Missing Documents (Action Required)

These categories returned 0 results — you may need to download directly from provider portals:

${manifest.missingCategories.map(c => `- [ ] **${c}** — check provider portal`).join('\n') || '(none — all categories found!)'}

## Folder Structure

\`\`\`
${OUTPUT_DIR}/
${categories.map(c => `  ${c}/`).join('\n')}
  08-Email-Summaries/
  SCAN_MANIFEST.json
  SUMMARY.md
\`\`\`

## Next Steps

1. Review downloaded documents in each folder
2. Download missing documents from provider portals (see checklist above)
3. Add prior year return to \`05-General-Tax/\`
4. Send entire \`2025-Tax-Bundle/\` folder to accountant
`;

  await fs.writeFile(path.join(OUTPUT_DIR, 'SUMMARY.md'), summaryMd);

  console.log();
  console.log('  Manifest saved: SCAN_MANIFEST.json');
  console.log('  Summary saved: SUMMARY.md');
  console.log();
  console.log('  MISSING DOCUMENTS (need manual download):');
  for (const m of manifest.missingCategories) {
    console.log(`    - ${m}`);
  }
  console.log();
  console.log('  Done! Send the 2025-Tax-Bundle folder to your accountant.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
