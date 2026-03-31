#!/usr/bin/env node
/**
 * Tax Document Bulk Processor — Gemini 3.1 Flash + Flash Lite
 *
 * Reads every PDF in the tax bundle, extracts structured data via Gemini vision,
 * and produces a master spreadsheet + summary for the accountant.
 *
 * Architecture:
 *   - Flash Lite: Fast triage (is this a tax doc? what type?)
 *   - Flash: Deep extraction (amounts, dates, parties, line items)
 *   - Parallel processing with concurrency control
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = 'C:\\Users\\hshum\\Downloads\\2025-Tax-Bundle';
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCifxqZ8Gg9_EeCa6-T-Q717vRKOUOlF1U';
const CONCURRENCY = 8;

// ──────────────────────────────────────────────────
// Gemini API client
// ──────────────────────────────────────────────────
class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.requestCount = 0;
    this.tokenCount = 0;
  }

  async callModel(model, contents, config = {}) {
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    const body = {
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        ...config,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini ${res.status}: ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    this.requestCount++;
    if (data.usageMetadata) {
      this.tokenCount += data.usageMetadata.totalTokenCount || 0;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    return text;
  }

  async triageDoc(pdfBase64, filename) {
    return this.callModel('gemini-3.1-flash-lite-preview', [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        { text: `Analyze this document "${filename}" for tax filing purposes. Return JSON:
{
  "isTaxRelevant": true/false,
  "documentType": "invoice|receipt|1099|W-2|1098|1095|paystub|medical_bill|EOB|insurance|utility|contract|statement|other",
  "vendor": "company name",
  "date": "YYYY-MM-DD or null",
  "totalAmount": number or null,
  "currency": "USD",
  "category": "income|business_expense|health_insurance|deduction|prior_return|other",
  "summary": "one line description"
}` }
      ]
    }]);
  }

  async deepExtract(pdfBase64, filename, docType) {
    return this.callModel('gemini-2.5-flash', [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        { text: `Extract all tax-relevant data from this ${docType} document "${filename}". Return JSON:
{
  "documentType": "${docType}",
  "vendor": "full legal name",
  "vendorTIN": "if visible",
  "recipientName": "if visible",
  "recipientTIN": "last 4 digits only if visible",
  "date": "YYYY-MM-DD",
  "periodStart": "YYYY-MM-DD or null",
  "periodEnd": "YYYY-MM-DD or null",
  "amounts": {
    "total": number,
    "subtotal": number or null,
    "tax": number or null,
    "fees": number or null
  },
  "taxFormData": {
    "box1": "value if tax form",
    "box2": "value if tax form",
    "box4": "federal withheld if tax form"
  },
  "lineItems": [{"description": "...", "amount": number}],
  "scheduleC_category": "advertising|car_expenses|commissions|contract_labor|depreciation|insurance|interest|legal|office_expense|rent|repairs|supplies|taxes|travel|meals|utilities|wages|other",
  "deductionType": "business_expense|home_office|health_insurance|student_loan|charitable|medical|vehicle|education|none",
  "notes": "anything else the accountant should know"
}` }
      ]
    }]);
  }
}

// ──────────────────────────────────────────────────
// Parallel processor with semaphore
// ──────────────────────────────────────────────────
class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }
  async acquire() {
    if (this.count < this.max) { this.count++; return; }
    await new Promise(resolve => this.queue.push(resolve));
  }
  release() {
    this.count--;
    if (this.queue.length > 0) { this.count++; this.queue.shift()(); }
  }
}

async function processFile(gemini, filePath, sem, results, errors) {
  await sem.acquire();
  const rel = filePath.replace(BUNDLE + path.sep, '');
  try {
    const data = await fs.readFile(filePath);
    const base64 = data.toString('base64');
    const filename = path.basename(filePath);

    // Skip files > 10MB (Gemini limit)
    if (data.length > 10 * 1024 * 1024) {
      console.log(`  [SKIP] ${rel} (${(data.length / 1024 / 1024).toFixed(1)}MB — too large)`);
      sem.release();
      return;
    }

    // Phase 1: Triage with Flash Lite
    const triageRaw = await gemini.triageDoc(base64, filename);
    let triage;
    try {
      triage = JSON.parse(triageRaw);
    } catch {
      // Try to extract JSON from markdown code block
      const match = triageRaw.match(/\{[\s\S]*\}/);
      triage = match ? JSON.parse(match[0]) : { isTaxRelevant: false, summary: 'parse error' };
    }

    if (!triage.isTaxRelevant) {
      console.log(`  [SKIP] ${rel} — not tax relevant`);
      results.push({ file: rel, ...triage, phase: 'triage_only' });
      sem.release();
      return;
    }

    // Phase 2: Deep extract with Flash
    const extractRaw = await gemini.deepExtract(base64, filename, triage.documentType);
    let extracted;
    try {
      extracted = JSON.parse(extractRaw);
    } catch {
      const match = extractRaw.match(/\{[\s\S]*\}/);
      extracted = match ? JSON.parse(match[0]) : { notes: 'parse error' };
    }

    const result = {
      file: rel,
      folder: rel.split(path.sep)[0] || 'root',
      triage,
      extracted,
      phase: 'fully_processed',
    };

    results.push(result);
    const amt = extracted.amounts?.total ? ` $${extracted.amounts.total}` : '';
    console.log(`  [OK] ${rel} — ${triage.documentType}${amt}`);

  } catch (err) {
    console.log(`  [ERR] ${rel} — ${err.message.substring(0, 80)}`);
    errors.push({ file: rel, error: err.message });
  }
  sem.release();
}

// ──────────────────────────────────────────────────
// Summary generator
// ──────────────────────────────────────────────────
function generateSummary(results) {
  const income = [];
  const expenses = [];
  const health = [];
  const deductions = [];
  const other = [];

  for (const r of results) {
    if (r.phase === 'triage_only' && !r.isTaxRelevant) continue;
    const cat = r.triage?.category || r.extracted?.deductionType || 'other';
    const amt = r.extracted?.amounts?.total || r.triage?.totalAmount || 0;
    const entry = {
      file: r.file,
      vendor: r.extracted?.vendor || r.triage?.vendor || 'unknown',
      date: r.extracted?.date || r.triage?.date || 'unknown',
      amount: amt,
      type: r.triage?.documentType || 'unknown',
      scheduleC: r.extracted?.scheduleC_category || null,
      summary: r.triage?.summary || '',
    };

    if (cat === 'income') income.push(entry);
    else if (cat === 'business_expense') expenses.push(entry);
    else if (cat === 'health_insurance') health.push(entry);
    else if (cat === 'deduction') deductions.push(entry);
    else other.push(entry);
  }

  // Sort by date
  const byDate = (a, b) => (a.date || '').localeCompare(b.date || '');
  income.sort(byDate);
  expenses.sort(byDate);

  // Aggregate expenses by vendor
  const byVendor = {};
  for (const e of expenses) {
    const v = e.vendor;
    if (!byVendor[v]) byVendor[v] = { vendor: v, count: 0, total: 0, category: e.scheduleC };
    byVendor[v].count++;
    byVendor[v].total += e.amount || 0;
  }

  // Aggregate by Schedule C category
  const byCategory = {};
  for (const e of expenses) {
    const c = e.scheduleC || 'other';
    if (!byCategory[c]) byCategory[c] = { category: c, count: 0, total: 0 };
    byCategory[c].count++;
    byCategory[c].total += e.amount || 0;
  }

  return {
    totalProcessed: results.length,
    income: { items: income, total: income.reduce((s, e) => s + (e.amount || 0), 0) },
    businessExpenses: {
      items: expenses,
      total: expenses.reduce((s, e) => s + (e.amount || 0), 0),
      byVendor: Object.values(byVendor).sort((a, b) => b.total - a.total),
      byScheduleC: Object.values(byCategory).sort((a, b) => b.total - a.total),
    },
    healthInsurance: { items: health, total: health.reduce((s, e) => s + (e.amount || 0), 0) },
    deductions: { items: deductions, total: deductions.reduce((s, e) => s + (e.amount || 0), 0) },
    other: { items: other, count: other.length },
  };
}

function summaryToMarkdown(summary) {
  let md = `# 2025 Tax Document Analysis — Gemini AI Extraction\n\n`;
  md += `**Processed:** ${summary.totalProcessed} documents\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += `## Income\n`;
  md += `**Total:** $${summary.income.total.toLocaleString()}\n\n`;
  md += `| Date | Vendor | Type | Amount |\n|------|--------|------|--------|\n`;
  for (const i of summary.income.items) {
    md += `| ${i.date} | ${i.vendor} | ${i.type} | $${(i.amount || 0).toLocaleString()} |\n`;
  }

  md += `\n## Business Expenses (Schedule C)\n`;
  md += `**Total:** $${summary.businessExpenses.total.toLocaleString()}\n\n`;
  md += `### By Vendor\n`;
  md += `| Vendor | # Docs | Total |\n|--------|--------|-------|\n`;
  for (const v of summary.businessExpenses.byVendor) {
    md += `| ${v.vendor} | ${v.count} | $${v.total.toLocaleString()} |\n`;
  }
  md += `\n### By Schedule C Category\n`;
  md += `| Category | # Docs | Total |\n|----------|--------|-------|\n`;
  for (const c of summary.businessExpenses.byScheduleC) {
    md += `| ${c.category} | ${c.count} | $${c.total.toLocaleString()} |\n`;
  }

  md += `\n## Health Insurance\n`;
  md += `**Total:** $${summary.healthInsurance.total.toLocaleString()}\n\n`;
  for (const h of summary.healthInsurance.items) {
    md += `- ${h.date}: ${h.vendor} — ${h.summary} ($${(h.amount || 0).toLocaleString()})\n`;
  }

  md += `\n## Deductions\n`;
  md += `**Total:** $${summary.deductions.total.toLocaleString()}\n\n`;
  for (const d of summary.deductions.items) {
    md += `- ${d.date}: ${d.vendor} — ${d.summary} ($${(d.amount || 0).toLocaleString()})\n`;
  }

  md += `\n## Other Documents: ${summary.other.count}\n`;
  return md;
}

// ──────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('  Tax Document Bulk Processor — Gemini Flash');
  console.log('='.repeat(60));
  console.log(`  Bundle: ${BUNDLE}`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log(`  Models: gemini-3.1-flash-lite-preview (triage) → gemini-2.5-flash (extract)`);
  console.log();

  const gemini = new GeminiClient(API_KEY);
  const sem = new Semaphore(CONCURRENCY);

  // Discover all PDFs (skip 6-Reference and xlsx)
  const folders = ['1-Income', '2-Business-Expenses', '3-Health-Insurance', '4-Deductions', '5-Prior-Returns'];
  const allFiles = [];

  for (const folder of folders) {
    const dirPath = path.join(BUNDLE, folder);
    if (!existsSync(dirPath)) continue;
    const files = await fs.readdir(dirPath);
    for (const f of files) {
      if (f.toLowerCase().endsWith('.pdf')) {
        allFiles.push(path.join(dirPath, f));
      }
    }
  }

  // Also check root PDFs
  const rootFiles = await fs.readdir(BUNDLE);
  for (const f of rootFiles) {
    const fp = path.join(BUNDLE, f);
    const stat = await fs.stat(fp);
    if (!stat.isDirectory() && f.toLowerCase().endsWith('.pdf')) {
      // skip — no root PDFs after reorg
    }
  }

  console.log(`  Found ${allFiles.length} PDFs to process\n`);

  // Process in parallel
  const results = [];
  const errors = [];
  const startTime = Date.now();

  // Process by folder for organized output
  for (const folder of folders) {
    const folderFiles = allFiles.filter(f => f.includes(path.sep + folder + path.sep));
    if (folderFiles.length === 0) continue;

    console.log(`\n[${folder}] Processing ${folderFiles.length} files...`);

    const batch = folderFiles.map(f => processFile(gemini, f, sem, results, errors));
    await Promise.all(batch);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('  PROCESSING COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Time: ${elapsed}s`);
  console.log(`  Processed: ${results.length} docs`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  API calls: ${gemini.requestCount}`);
  console.log(`  Tokens used: ${gemini.tokenCount.toLocaleString()}`);

  // Generate summary
  const summary = generateSummary(results);
  const markdown = summaryToMarkdown(summary);

  // Save results
  await fs.writeFile(path.join(BUNDLE, 'GEMINI_EXTRACTION.json'), JSON.stringify({ results, errors, summary }, null, 2));
  await fs.writeFile(path.join(BUNDLE, 'GEMINI_EXTRACTION_SUMMARY.md'), markdown);

  console.log(`\n  Saved: GEMINI_EXTRACTION.json`);
  console.log(`  Saved: GEMINI_EXTRACTION_SUMMARY.md`);
  console.log();

  // Print quick summary
  console.log(`  INCOME: $${summary.income.total.toLocaleString()} (${summary.income.items.length} docs)`);
  console.log(`  BUSINESS EXPENSES: $${summary.businessExpenses.total.toLocaleString()} (${summary.businessExpenses.items.length} docs)`);
  console.log(`  HEALTH: $${summary.healthInsurance.total.toLocaleString()} (${summary.healthInsurance.items.length} docs)`);
  console.log(`  DEDUCTIONS: $${summary.deductions.total.toLocaleString()} (${summary.deductions.items.length} docs)`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
