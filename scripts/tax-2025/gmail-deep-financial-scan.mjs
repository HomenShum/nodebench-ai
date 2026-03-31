#!/usr/bin/env node
/**
 * Deep Financial Scan — unemployment, poverty credits, LLC expenses, full income picture
 */
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, 'token.json');
const OUTPUT_DIR = path.join('C:', 'Users', 'hshum', 'Downloads', '2025-Tax-Bundle');

async function authorize() {
  const content = await fs.readFile(TOKEN_PATH, 'utf8');
  const credentials = JSON.parse(content);
  const client = google.auth.fromJSON(credentials);
  await client.getAccessToken();
  return client;
}

async function searchAndDetail(gmail, label, query, maxShow = 40) {
  const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 100 });
  const messages = res.data.messages || [];
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${label} — ${messages.length} results`);
  console.log('='.repeat(70));

  const details = [];
  for (const msg of messages.slice(0, maxShow)) {
    const detail = await gmail.users.messages.get({
      userId: 'me', id: msg.id, format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });
    const headers = {};
    for (const h of detail.data.payload.headers) headers[h.name] = h.value;
    const date = headers.Date ? new Date(headers.Date).toISOString().split('T')[0] : '?';
    const from = (headers.From || '').substring(0, 55);
    const subject = (headers.Subject || '').substring(0, 90);
    console.log(`  ${date} | ${from.padEnd(55)} | ${subject}`);
    details.push({ date, from: headers.From, subject: headers.Subject, id: msg.id });
  }
  return details;
}

async function main() {
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  console.log('='.repeat(70));
  console.log('  DEEP FINANCIAL SCAN — Unemployment + LLC + Poverty Credits');
  console.log('='.repeat(70));

  // === UNEMPLOYMENT / EDD / GOVERNMENT BENEFITS ===
  const sections = {};

  sections.unemployment = await searchAndDetail(gmail,
    'UNEMPLOYMENT / EDD / Government Benefits',
    '(from:(edd OR unemployment OR "employment development" OR labor OR workforce OR "ui online") OR subject:(unemployment OR "UI benefit" OR EDD OR "benefit payment" OR "claim" OR "weekly certification")) after:2025/01/01 before:2026/06/01');

  sections.govt1099G = await searchAndDetail(gmail,
    '1099-G (Unemployment Income Tax Form)',
    'subject:(1099-G OR "government payments" OR "unemployment compensation") after:2026/01/01 before:2026/06/01');

  // === FOOD ASSISTANCE / SNAP / CALFRESH ===
  sections.foodAssist = await searchAndDetail(gmail,
    'Food Assistance / SNAP / CalFresh / EBT',
    '(from:(calfresh OR snap OR ebt OR "food stamps" OR "food assistance" OR benefits OR dpss OR hsa) OR subject:(calfresh OR snap OR ebt OR "food benefit" OR "benefit card")) after:2025/01/01 before:2026/01/01');

  // === HEALTHCARE / COVERED CA / MEDICAID / MEDI-CAL ===
  sections.healthcare = await searchAndDetail(gmail,
    'Healthcare Marketplace / Covered CA / Medi-Cal / Medicaid',
    '(from:(coveredca OR "covered california" OR healthcare.gov OR medicaid OR "medi-cal" OR dpss OR LA.care OR molina OR "health net") OR subject:("health coverage" OR "health plan" OR "covered california" OR medicaid OR "medi-cal" OR marketplace OR enrollment OR premium OR subsidy OR "advance premium")) after:2025/01/01 before:2026/06/01');

  sections.form1095 = await searchAndDetail(gmail,
    '1095-A / Health Insurance Marketplace Statement',
    'subject:(1095 OR "health insurance marketplace" OR "advance premium tax credit" OR "premium tax credit" OR "form 1095") after:2026/01/01 before:2026/06/01');

  // === ALL INCOME SOURCES ===
  sections.ideaflow = await searchAndDetail(gmail,
    'Ideaflow (Employment / Contract Income)',
    'from:(ideaflow) after:2025/01/01 before:2026/06/01');

  sections.allIncome = await searchAndDetail(gmail,
    'All Payment Received / Direct Deposit / Payroll',
    '(subject:(payroll OR "direct deposit" OR "pay stub" OR "pay statement" OR payday OR "payment sent" OR "you\'ve been paid" OR "funds deposited") OR from:(gusto OR adp OR paychex OR rippling OR justworks OR paylocity)) after:2025/01/01 before:2026/01/01');

  sections.zelle = await searchAndDetail(gmail,
    'Zelle Received Payments (potential income)',
    'from:(chase OR zelle) subject:("received money" OR "sent you" OR "payment from") after:2025/01/01 before:2026/01/01');

  sections.freelance = await searchAndDetail(gmail,
    'Freelance / Contract / Gig Payments',
    '(from:(upwork OR fiverr OR toptal OR deel OR remote.com OR oyster OR turing) OR subject:("contract" OR "freelance" OR "consulting fee" OR "invoice paid" OR "milestone")) after:2025/01/01 before:2026/01/01');

  // === RENT / HOUSING (CA Renter's Credit) ===
  sections.rent = await searchAndDetail(gmail,
    'Rent Payments / Lease / Housing',
    '(subject:(rent OR lease OR "monthly rent" OR "rent payment" OR "rent due" OR "rent receipt") OR from:(apartments OR zillow OR zelle OR venmo OR property OR management OR landlord OR realty)) (subject:(rent OR lease OR payment OR receipt OR due)) after:2025/01/01 before:2026/01/01');

  sections.housing2 = await searchAndDetail(gmail,
    'Housing Assistance / Section 8 / Rental Assistance',
    'subject:("rental assistance" OR "housing assistance" OR "section 8" OR "housing voucher" OR "emergency rental" OR ERAP) after:2025/01/01 before:2026/01/01');

  // === LLC FORMATION / BUSINESS ===
  sections.llc = await searchAndDetail(gmail,
    'CafeCorner LLC / Business Formation / Registration',
    '(subject:(cafecorner OR "cafe corner" OR LLC OR "articles of organization" OR "business registration" OR "franchise tax" OR "annual report" OR "business license") OR from:(legalzoom OR incfile OR northwest OR "secretary of state" OR doola OR stripe.atlas)) after:2024/01/01 before:2026/06/01');

  sections.doola = await searchAndDetail(gmail,
    'doola (LLC/Tax Service)',
    'from:(doola) after:2024/01/01 before:2026/06/01');

  // === STUDENT LOANS (income-driven repayment = $0 payments) ===
  sections.studentLoans = await searchAndDetail(gmail,
    'Student Loans / Nelnet / SAVE Plan / IDR',
    '(from:(nelnet OR studentaid OR mohela OR navient OR aidvantage OR "great lakes") OR subject:("student loan" OR "loan payment" OR "repayment plan" OR SAVE OR IDR OR "income-driven" OR forbearance OR deferment OR "interest paid")) after:2025/01/01 before:2026/06/01');

  // === MEDICAL EXPENSES ===
  sections.medical = await searchAndDetail(gmail,
    'Medical / Dental / Vision / Therapy / Rx',
    '(subject:(copay OR copayment OR "medical bill" OR "dental" OR "vision" OR "eye exam" OR prescription OR pharmacy OR "mental health" OR therapy OR counseling OR "out of pocket" OR "patient payment" OR "amount due") OR from:(zocdoc OR doctor OR dental OR optical OR cvs OR walgreens OR goodrx OR kaiser)) after:2025/01/01 before:2026/01/01');

  // === EDUCATION CREDITS ===
  sections.education = await searchAndDetail(gmail,
    'Education / Tuition / 1098-T / Student Status',
    '(subject:(tuition OR "financial aid" OR "student account" OR 1098-T OR "education credit" OR scholarship OR "course enrollment") OR from:(university OR college OR .edu OR fafsa)) after:2025/01/01 before:2026/06/01');

  // === CHARITABLE / VOLUNTEER ===
  sections.charitable = await searchAndDetail(gmail,
    'Charitable Donations / Volunteer / Church',
    '(subject:(donation OR donate OR charitable OR "thank you for your gift" OR "tax deductible" OR tithe OR "giving receipt" OR volunteer) OR from:(gofundme OR "united way" OR "red cross" OR church OR temple OR mosque OR habitat)) after:2025/01/01 before:2026/01/01');

  // === CAR / MILEAGE / VEHICLE ===
  sections.vehicle = await searchAndDetail(gmail,
    'Vehicle / Car Insurance / Registration / Gas',
    '(from:(geico OR progressive OR "state farm" OR allstate OR dmv OR AAA) OR subject:(insurance OR "auto policy" OR registration OR renewal OR "vehicle registration")) after:2025/01/01 before:2026/01/01');

  // === INTERNET / PHONE (home office) ===
  sections.internet = await searchAndDetail(gmail,
    'Internet / Phone Bills (Home Office)',
    '(from:(spectrum OR comcast OR xfinity OR att OR "t-mobile" OR tmobile OR verizon OR mint OR visible OR google.fi OR starlink) OR subject:(internet OR broadband OR wireless OR "phone bill" OR "mobile plan")) (subject:(bill OR statement OR payment OR invoice OR receipt)) after:2025/01/01 before:2026/01/01');

  // === CALIFORNIA STATE TAX ===
  sections.caState = await searchAndDetail(gmail,
    'California FTB / State Tax',
    '(from:(ftb OR "franchise tax" OR california) OR subject:(FTB OR "franchise tax" OR "state tax" OR "california tax" OR "state refund" OR "state return")) after:2025/01/01 before:2026/06/01');

  // === CRYPTO ===
  sections.crypto = await searchAndDetail(gmail,
    'Crypto (Coinbase / Binance / etc)',
    'from:(coinbase OR binance OR kraken OR gemini OR crypto.com OR phantom OR metamask) after:2025/01/01 before:2026/06/01');

  // Save all results
  await fs.mkdir(path.join(OUTPUT_DIR, '23-Deep-Scan'), { recursive: true });
  await fs.writeFile(
    path.join(OUTPUT_DIR, '23-Deep-Scan', 'full-financial-scan.json'),
    JSON.stringify(sections, null, 2)
  );

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('  SCAN SUMMARY');
  console.log('='.repeat(70));
  for (const [key, arr] of Object.entries(sections)) {
    if (arr.length > 0) {
      console.log(`  ${key.padEnd(20)} ${arr.length} emails`);
    }
  }
  const empties = Object.entries(sections).filter(([,a]) => a.length === 0).map(([k]) => k);
  if (empties.length) {
    console.log(`\n  Empty: ${empties.join(', ')}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
