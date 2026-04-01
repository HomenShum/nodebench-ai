#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCifxqZ8Gg9_EeCa6-T-Q717vRKOUOlF1U';
const BUNDLE = 'C:\\Users\\hshum\\Downloads\\2025-Tax-Bundle';

const ERROR_FILES = [
  '1-Income\\Gusto_US_1099_2025.pdf',
  '2-Business-Expenses\\2025-05-13_Receipt-2644-8982.pdf',
  '2-Business-Expenses\\2025-06-13_Receipt-2082-7522.pdf',
  '2-Business-Expenses\\2025-06-22_Receipt-2355-7614.pdf',
  '2-Business-Expenses\\2025-06-29_Invoice-JCVPKC-00005.pdf',
  '2-Business-Expenses\\2025-07-05_Invoice-JCVPKC-00009.pdf',
  '2-Business-Expenses\\2025-08-14_Invoice-JCVPKC-00011.pdf',
  '2-Business-Expenses\\2025-08-28_Invoice-JCVPKC-00012.pdf',
  '2-Business-Expenses\\2025-08-29_Invoice-JCVPKC-00014.pdf',
  '2-Business-Expenses\\2025-08-29_Receipt-JCVPKC-00013.pdf',
  '2-Business-Expenses\\2025-08-30_Invoice-JCVPKC-00015.pdf',
  '2-Business-Expenses\\2025-08-31_Receipt-JCVPKC-00016.pdf',
  '2-Business-Expenses\\2025-10-14_Invoice-JCVPKC-00018.pdf',
  '2-Business-Expenses\\2025-10-14_Receipt-JCVPKC-00018.pdf',
  '2-Business-Expenses\\2025-10-22_Invoice-E6B1892D-0008.pdf',
  '2-Business-Expenses\\2025-10-22_Receipt-2606-3880-9438.pdf',
  '2-Business-Expenses\\2025-12-22_Receipt-2206-1826-6559.pdf',
  '3-Health-Insurance\\Explanation of Benefits (EOB) (1).pdf',
  '3-Health-Insurance\\Explanation of Benefits (EOB) (2).pdf',
  '3-Health-Insurance\\Your 2026 rate and benefit update letter.pdf',
  '5-Prior-Returns\\Tax_Return_2023_Homen.pdf',
];

const UTILITY_FILES = fs.readdirSync(path.join(BUNDLE, '2-Business-Expenses'))
  .filter(f => f.includes('UtilityBillingStatement'))
  .map(f => '2-Business-Expenses\\' + f);

async function callGemini(pdfBase64, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        { text: prompt }
      ]}],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: 'application/json' }
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).substring(0, 100)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const results = { errors_reextracted: [], utilities: [], summary: {} };
  let ok = 0, fail = 0;

  console.log(`Re-extracting ${ERROR_FILES.length} error files + ${UTILITY_FILES.length} utility bills...\n`);

  for (const rel of ERROR_FILES) {
    const fp = path.join(BUNDLE, rel);
    if (!fs.existsSync(fp)) { console.log(`  [SKIP] ${rel} — not found`); continue; }
    try {
      const b64 = fs.readFileSync(fp).toString('base64');
      const raw = await callGemini(b64,
        'Extract from this tax document: vendor name, date (YYYY-MM-DD), total dollar amount, document type (invoice/receipt/1099/W-2/1098/EOB/statement/other), and a one-line summary. Return JSON: {"vendor":"","date":"","amount":0,"type":"","summary":""}');
      const parsed = JSON.parse(raw);
      results.errors_reextracted.push({ file: rel, ...parsed, status: 'ok' });
      console.log(`  [OK] ${rel} — ${parsed.vendor || '?'} $${parsed.amount || '?'}`);
      ok++;
    } catch (e) {
      results.errors_reextracted.push({ file: rel, status: 'fail', error: e.message.substring(0, 80) });
      console.log(`  [FAIL] ${rel} — ${e.message.substring(0, 60)}`);
      fail++;
    }
    await sleep(4000);
  }

  console.log(`\nRe-extracting ${UTILITY_FILES.length} utility bills...\n`);

  for (const rel of UTILITY_FILES) {
    const fp = path.join(BUNDLE, rel);
    if (!fs.existsSync(fp)) continue;
    try {
      const b64 = fs.readFileSync(fp).toString('base64');
      const raw = await callGemini(b64,
        'This is a utility billing statement for a home office. Extract: billing period (start and end dates), total amount due, and if visible separate the rent portion from the utility-only portion (electric/gas/water/trash). Return JSON: {"billingPeriod":"","totalAmount":0,"rentPortion":0,"utilityPortion":0,"summary":""}');
      const parsed = JSON.parse(raw);
      results.utilities.push({ file: rel, ...parsed, status: 'ok' });
      console.log(`  [OK] ${rel} — $${parsed.totalAmount || '?'} (rent: $${parsed.rentPortion || '?'}, util: $${parsed.utilityPortion || '?'})`);
      ok++;
    } catch (e) {
      results.utilities.push({ file: rel, status: 'fail', error: e.message.substring(0, 80) });
      console.log(`  [FAIL] ${rel} — ${e.message.substring(0, 60)}`);
      fail++;
    }
    await sleep(4000);
  }

  // Summary
  const errAmts = results.errors_reextracted.filter(r => r.status === 'ok').map(r => r.amount || 0);
  const utilAmts = results.utilities.filter(r => r.status === 'ok');
  const totalRent = utilAmts.reduce((s, r) => s + (r.rentPortion || 0), 0);
  const totalUtil = utilAmts.reduce((s, r) => s + (r.utilityPortion || 0), 0);

  results.summary = {
    total_reextracted: ERROR_FILES.length + UTILITY_FILES.length,
    success: ok, failures: fail,
    error_files_total_amount: errAmts.reduce((a, b) => a + b, 0),
    utility_total_rent: totalRent,
    utility_total_utilities: totalUtil,
    utility_total_combined: totalRent + totalUtil,
  };

  console.log('\n' + '='.repeat(50));
  console.log(`  OK: ${ok} | FAIL: ${fail}`);
  console.log(`  Error files recovered amount: $${results.summary.error_files_total_amount}`);
  console.log(`  Utility rent total: $${totalRent}`);
  console.log(`  Utility-only total: $${totalUtil}`);

  fs.writeFileSync(path.join(BUNDLE, 'REEXTRACTION_RESULTS.json'), JSON.stringify(results, null, 2));
  console.log('  Saved: REEXTRACTION_RESULTS.json');
}

main().catch(e => { console.error(e); process.exit(1); });
