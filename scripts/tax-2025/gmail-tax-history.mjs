#!/usr/bin/env node
/**
 * Find past tax services + Chase statements
 */
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function authorize() {
  const content = await fs.readFile(TOKEN_PATH, 'utf8');
  const credentials = JSON.parse(content);
  const client = google.auth.fromJSON(credentials);
  await client.getAccessToken();
  return client;
}

async function searchAndPrint(gmail, label, query) {
  const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 50 });
  const messages = res.data.messages || [];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label} — ${messages.length} results`);
  console.log('='.repeat(60));

  for (const msg of messages.slice(0, 30)) {
    const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
    const headers = {};
    for (const h of detail.data.payload.headers) headers[h.name] = h.value;
    const date = headers.Date ? new Date(headers.Date).toISOString().split('T')[0] : '?';
    console.log(`  ${date} | ${(headers.From || '').substring(0, 50).padEnd(50)} | ${(headers.Subject || '').substring(0, 80)}`);
  }
}

async function main() {
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  // === FIND TAX PREPARATION SERVICES 2023-2024 ===
  await searchAndPrint(gmail, 'Tax Services (TurboTax/H&R Block/TaxAct/etc) 2023-2024',
    'from:(turbotax OR intuit OR hrblock OR "h&r block" OR taxact OR taxslayer OR "jackson hewitt" OR freetaxusa OR creditkarma) subject:(return OR filing OR refund OR payment OR receipt OR "tax prep" OR completed OR submitted) after:2023/01/01 before:2025/01/01');

  await searchAndPrint(gmail, 'Any "tax" payment/receipt 2023-2024',
    'subject:(tax) (subject:(payment OR receipt OR charge OR paid OR invoice OR filing)) after:2023/01/01 before:2025/01/01');

  await searchAndPrint(gmail, 'CPA / Accountant / Tax Professional',
    '(subject:(CPA OR accountant OR "tax return" OR "tax preparation" OR "tax filing") OR from:(cpa OR accountant OR tax)) (subject:(invoice OR receipt OR payment OR return OR filed)) after:2023/01/01 before:2025/01/01');

  await searchAndPrint(gmail, 'Expensive subscriptions with "tax" keyword',
    'subject:(tax) (subject:($99 OR $149 OR $199 OR $249 OR $299 OR $349 OR $399 OR upgrade OR premium OR "plus" OR deluxe OR "live" OR expert)) after:2023/01/01 before:2025/01/01');

  // === CHASE BANK ===
  await searchAndPrint(gmail, 'Chase Bank — All emails 2025',
    'from:(chase OR chase.com OR jpmorgan) after:2025/01/01 before:2026/01/01');

  await searchAndPrint(gmail, 'Chase — Statements & Tax docs 2025-2026',
    'from:(chase) subject:(statement OR tax OR 1099 OR "year-end" OR "annual" OR "document" OR "important") after:2025/01/01 before:2026/06/01');

  await searchAndPrint(gmail, 'Chase — Any payment/transfer notifications',
    'from:(chase) subject:(payment OR transfer OR deposit OR direct OR zelle OR "autopay") after:2025/01/01 before:2026/01/01');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
