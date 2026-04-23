/**
 * TaxPilot — Agentic 4-Phase Ingestion Pipeline
 *
 * Phase 1  CLASSIFY  — identify document type (fast model, cheap)
 * Phase 2  EXTRACT   — type-specific field extraction (deep model for official forms)
 * Phase 3  JUDGE     — LLM validates extracted values, scores each field
 * Phase 4  STORE     — persist to IndexedDB via db.js
 *
 * Runs inside the background service worker (no CORS restrictions on fetch).
 * Emits PIPELINE_PROGRESS events back to all open extension pages.
 */

import { saveDocument, saveFieldValues, saveJudgment } from './db.js';

// ── Models ────────────────────────────────────────────────────────────────────
const FAST = 'gemini-2.5-flash-lite-preview';   // classify, judge, receipts/other
const DEEP = 'gemini-2.5-flash';                // official tax forms extraction

// Document types that deserve the deep model for extraction
const DEEP_TYPES = new Set([
  '1099-NEC', '1099-MISC', '1099-R', '1099-INT', '1099-DIV',
  'W-2', '1095-A', '1098-E', '5498', 'K-1',
]);

// ── Phase 1: Classification prompt ───────────────────────────────────────────
const CLASSIFY_PROMPT = `You are a tax document classifier. Examine this PDF and respond ONLY with valid JSON (no markdown, no explanation):
{"documentType":"1099-NEC","taxYear":2025,"confidence":95,"issuer":"company name or null"}
documentType must be exactly one of:
"1099-NEC" | "1099-MISC" | "1099-R" | "1099-INT" | "1099-DIV" |
"W-2" | "1095-A" | "1098-E" | "5498" | "K-1" | "receipt" | "bank-statement" | "other"`;

// ── Phase 2: Type-specific extraction prompts ─────────────────────────────────
const EXTRACT_PROMPTS = {

'1099-NEC': `Extract ALL data from this IRS Form 1099-NEC. Respond ONLY with valid JSON:
{"formType":"1099-NEC","taxYear":2025,"payerName":"string","payerEIN":"XX-XXXXXXX","recipientName":"string","recipientSSNLast4":"1234 or null","box1_nonemployeeCompensation":0.00,"box4_federalTaxWithheld":0.00,"box5_stateIncome":0.00,"box6_stateWithheld":0.00,"state":"CA"}`,

'1099-MISC': `Extract ALL data from this IRS Form 1099-MISC. Respond ONLY with valid JSON:
{"formType":"1099-MISC","taxYear":2025,"payerName":"string","payerEIN":"XX-XXXXXXX","box3_otherIncome":0.00,"box4_federalTaxWithheld":0.00,"box6_medicalPayments":0.00}`,

'1099-R': `Extract ALL data from this IRS Form 1099-R. Respond ONLY with valid JSON:
{"formType":"1099-R","taxYear":2025,"payerName":"string","box1_grossDistribution":0.00,"box2a_taxableAmount":0.00,"box2b_taxableAmountNotDetermined":false,"box4_federalWithheld":0.00,"box7_distributionCode":"string","box7_iraIndicator":false}`,

'1099-INT': `Extract from this IRS Form 1099-INT. Respond ONLY with valid JSON:
{"formType":"1099-INT","taxYear":2025,"payerName":"string","box1_interestIncome":0.00,"box4_federalWithheld":0.00,"box3_usSavingsBondsInterest":0.00,"box11_bondPremium":0.00}`,

'1099-DIV': `Extract from this IRS Form 1099-DIV. Respond ONLY with valid JSON:
{"formType":"1099-DIV","taxYear":2025,"payerName":"string","box1a_totalOrdinaryDividends":0.00,"box1b_qualifiedDividends":0.00,"box2a_totalCapitalGain":0.00,"box4_federalWithheld":0.00}`,

'W-2': `Extract ALL data from this W-2 Wage and Tax Statement. Respond ONLY with valid JSON:
{"formType":"W-2","taxYear":2025,"employerName":"string","employerEIN":"XX-XXXXXXX","employeeSSNLast4":"1234 or null","box1_wages":0.00,"box2_federalWithheld":0.00,"box3_socialSecurityWages":0.00,"box4_socialSecurityWithheld":0.00,"box5_medicareWages":0.00,"box6_medicareWithheld":0.00,"box12":[{"code":"string","amount":0}],"box14":[{"description":"string","amount":0}],"state":"CA"}`,

'1095-A': `Extract ALL data from this Form 1095-A Health Insurance Marketplace Statement. Respond ONLY with valid JSON:
{"formType":"1095-A","taxYear":2025,"marketplaceName":"string","policyNumber":"string","coverageStartMonth":1,"coverageEndMonth":12,"monthlyDetails":[{"month":1,"enrolleePremium":0.00,"slcsp":0.00,"aptcPaid":0.00}],"annualTotals":{"enrolleePremium":0.00,"slcsp":0.00,"aptcPaid":0.00}}`,

'1098-E': `Extract from this Form 1098-E Student Loan Interest Statement. Respond ONLY with valid JSON:
{"formType":"1098-E","taxYear":2025,"lenderName":"string","recipientName":"string","box1_studentLoanInterest":0.00,"box2_originatedBeforeOct2004":false}`,

'5498': `Extract from this Form 5498 IRA Contribution Information. Respond ONLY with valid JSON:
{"formType":"5498","taxYear":2025,"trusteeName":"string","participantName":"string","accountType":"Roth","box1_iraContributions":0.00,"box2_rolloverContributions":0.00,"box3_rothConversions":0.00,"box5_fairMarketValue":0.00,"box8_sepContributions":0.00,"box9_simpleContributions":0.00,"box10_rothIRAContributions":0.00}`,

'K-1': `Extract from this Schedule K-1. Respond ONLY with valid JSON:
{"formType":"K-1","taxYear":2025,"entityName":"string","partnerName":"string","partnershipType":"partnership|S-corp|trust|estate","box1_ordinaryIncome":0.00,"box2_netRentalIncome":0.00,"box5_interest":0.00,"box6_dividends":0.00,"box9_capitalGain":0.00,"box14_selfEmploymentEarnings":0.00}`,

'receipt': `Analyze this receipt or invoice for Schedule C tax deduction purposes. Respond ONLY with valid JSON:
{"documentType":"receipt","vendor":"string","date":"YYYY-MM-DD","totalAmount":0.00,"lineItems":[{"description":"string","amount":0.00}],"category":"office_supplies|software_subscription|equipment|meals_50pct|travel|phone_internet|professional_services|home_office|other","scheduleCLine":"e.g. Line 18 Office Expense","businessPurpose":"string","isTaxDeductible":true,"deductiblePercent":100}`,

'bank-statement': `Extract tax-relevant transactions from this bank statement. Respond ONLY with valid JSON:
{"documentType":"bank-statement","institution":"string","accountLast4":"string","periodStart":"YYYY-MM-DD","periodEnd":"YYYY-MM-DD","taxRelevantTransactions":[{"date":"YYYY-MM-DD","description":"string","amount":0.00,"type":"income|expense","category":"string","isDeductible":false}],"totalIncome":0.00,"totalExpenses":0.00}`,

'other': `Analyze this document for any tax relevance. Respond ONLY with valid JSON:
{"documentType":"string","taxYear":2025,"summary":"string","isTaxRelevant":true,"taxRelevanceReason":"string","extractedFields":{},"notes":"string"}`,

};

// ── Field key mapping: docType → [ [extracted_path, globalKey] ] ──────────────
// globalKey is the stable cross-document retrieval key used by retriever.js
const FIELD_KEY_MAP = {
  '1099-NEC': [
    ['box1_nonemployeeCompensation', 'income.nec.compensation'],
    ['box4_federalTaxWithheld',      'income.nec.federalWithheld'],
    ['payerName',                    'income.nec.payerName'],
    ['payerEIN',                     'income.nec.payerEIN'],
    ['taxYear',                      'income.nec.taxYear'],
  ],
  '1099-MISC': [
    ['box3_otherIncome',             'income.misc.otherIncome'],
    ['box4_federalTaxWithheld',      'income.misc.federalWithheld'],
    ['payerName',                    'income.misc.payerName'],
  ],
  '1099-R': [
    ['box1_grossDistribution',       'income.retirement.grossDistribution'],
    ['box2a_taxableAmount',          'income.retirement.taxableAmount'],
    ['box4_federalWithheld',         'income.retirement.federalWithheld'],
    ['box7_distributionCode',        'income.retirement.distributionCode'],
    ['box7_iraIndicator',            'income.retirement.isIRA'],
  ],
  '1099-INT': [
    ['box1_interestIncome',          'income.interest'],
    ['payerName',                    'income.interestPayer'],
  ],
  '1099-DIV': [
    ['box1a_totalOrdinaryDividends', 'income.dividends.ordinary'],
    ['box1b_qualifiedDividends',     'income.dividends.qualified'],
    ['box2a_totalCapitalGain',       'income.capitalGains'],
    ['box4_federalWithheld',         'income.dividends.federalWithheld'],
  ],
  'W-2': [
    ['box1_wages',                   'income.w2.wages'],
    ['box2_federalWithheld',         'income.w2.federalWithheld'],
    ['box3_socialSecurityWages',     'income.w2.ssWages'],
    ['box4_socialSecurityWithheld',  'income.w2.ssTaxWithheld'],
    ['box5_medicareWages',           'income.w2.medicareWages'],
    ['box6_medicareWithheld',        'income.w2.medicareTaxWithheld'],
    ['employerName',                 'income.w2.employerName'],
    ['employerEIN',                  'income.w2.employerEIN'],
  ],
  '1095-A': [
    ['annualTotals.enrolleePremium', 'health.aptc.annualPremium'],
    ['annualTotals.slcsp',           'health.aptc.slcsp'],
    ['annualTotals.aptcPaid',        'health.aptc.aptcPaid'],
    ['coverageStartMonth',           'health.aptc.coverageStart'],
    ['coverageEndMonth',             'health.aptc.coverageEnd'],
  ],
  '1098-E': [
    ['box1_studentLoanInterest',     'deductions.studentLoanInterest'],
    ['lenderName',                   'deductions.studentLoanLender'],
  ],
  '5498': [
    ['box5_fairMarketValue',         'retirement.ira.fmv'],
    ['box1_iraContributions',        'retirement.ira.contributions'],
    ['box10_rothIRAContributions',   'retirement.roth.contributions'],
    ['box3_rothConversions',         'retirement.roth.conversions'],
    ['accountType',                  'retirement.ira.accountType'],
    ['trusteeName',                  'retirement.ira.trusteeName'],
  ],
  'K-1': [
    ['box1_ordinaryIncome',          'income.k1.ordinaryIncome'],
    ['box14_selfEmploymentEarnings', 'income.k1.seEarnings'],
    ['entityName',                   'income.k1.entityName'],
  ],
};

// ── Parse JSON from Gemini response ───────────────────────────────────────────
function parseGeminiJSON(text) {
  const stripped = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(stripped); } catch { /* continue */ }
  const m = stripped.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* continue */ } }
  throw new Error(`Cannot parse Gemini JSON. First 120 chars: ${text.slice(0, 120)}`);
}

// ── Gemini File API — upload PDF once, reuse URI for 48 h ────────────────────
// Caches URI in chrome.storage.local keyed by docId to avoid re-uploading.
async function uploadToFileAPI(apiKey, pdfBase64, filename, docId) {
  const cacheKey = `fileUri_${docId}`;
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) {
    const { uri, uploadedAt } = cached[cacheKey];
    if (Date.now() - uploadedAt < 47 * 3600 * 1000) return uri; // still valid
  }

  // Decode base64 → binary Uint8Array
  const binary = atob(pdfBase64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // Build multipart/related body manually (no FormData — MV3 SW compatible)
  const boundary = `taxpilot_${Date.now()}`;
  const meta      = JSON.stringify({ file: { display_name: filename } });
  const enc       = new TextEncoder();
  const prefix    = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
  );
  const suffix    = enc.encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(prefix.length + bytes.length + suffix.length);
  body.set(prefix, 0);
  body.set(bytes,  prefix.length);
  body.set(suffix, prefix.length + bytes.length);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
      signal:  AbortSignal.timeout(60000),
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`File API upload ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const uri  = data.file?.uri;
  if (!uri) throw new Error('File API returned no URI');

  await chrome.storage.local.set({ [cacheKey]: { uri, uploadedAt: Date.now() } });
  return uri;
}

// ── Gemini call — uses File API URI when available, falls back to inline b64 ──
async function callGemini(apiKey, model, prompt, pdfBase64, fileUri = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const pdfPart = fileUri
    ? { fileData: { mimeType: 'application/pdf', fileUri } }
    : { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [ pdfPart, { text: prompt } ] }],
      generationConfig: {
        temperature: 0.05,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini ${model} HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response — no candidates returned');
  return parseGeminiJSON(text);
}

// ── Emit progress to all open extension pages ─────────────────────────────────
function emit(docId, phase, status, detail) {
  chrome.runtime.sendMessage({ type: 'PIPELINE_PROGRESS', docId, phase, status, detail })
    .catch(() => { /* sidepanel may be closed — silent */ });
}

// ── Deep-get nested path from object ─────────────────────────────────────────
function deepGet(obj, path) {
  return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

// ── Build field value records from extracted JSON ─────────────────────────────
function buildFieldValues(extracted, docType, docId, filename, fieldScores, overallConf) {
  const keyMap = FIELD_KEY_MAP[docType] || [];
  const records = [];
  const now = Date.now();

  for (const [fieldPath, globalKey] of keyMap) {
    const value = deepGet(extracted, fieldPath);
    if (value === undefined || value === null || value === '') continue;

    const shortKey = fieldPath.split('.').pop();
    const confidence = Math.round(
      fieldScores?.[fieldPath] ?? fieldScores?.[shortKey] ?? overallConf
    );

    records.push({
      key:            `${docId}::${globalKey}`,
      globalKey,
      value,
      confidence,
      sourceDocId:    docId,
      sourceDocType:  docType,
      sourceFilename: filename,
      extractedAt:    now,
    });
  }

  // Receipts: unique per vendor+date so totals accumulate correctly
  if (docType === 'receipt' && extracted.vendor && extracted.totalAmount) {
    const slug  = (extracted.vendor || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 25);
    const dslug = (extracted.date || '').replace(/-/g, '') || String(now).slice(-8);
    records.push({
      key:            `${docId}::expense.receipt.${slug}.${dslug}`,
      globalKey:      `expense.receipt.${slug}.${dslug}`,
      value: {
        vendor:          extracted.vendor,
        amount:          extracted.totalAmount,
        date:            extracted.date,
        category:        extracted.category,
        scheduleCLine:   extracted.scheduleCLine,
        businessPurpose: extracted.businessPurpose,
        deductiblePct:   extracted.deductiblePercent ?? 100,
      },
      confidence:     overallConf,
      sourceDocId:    docId,
      sourceDocType:  'receipt',
      sourceFilename: filename,
      extractedAt:    now,
    });
  }

  // Bank statements: store each tax-relevant transaction individually
  if (docType === 'bank-statement' && Array.isArray(extracted.taxRelevantTransactions)) {
    for (const [i, tx] of extracted.taxRelevantTransactions.entries()) {
      records.push({
        key:            `${docId}::bank.tx.${i}`,
        globalKey:      `bank.tx.${docId}.${i}`,
        value:          tx,
        confidence:     overallConf,
        sourceDocId:    docId,
        sourceDocType:  'bank-statement',
        sourceFilename: filename,
        extractedAt:    now,
      });
    }
  }

  return records;
}

// ── MAIN: run the 4-phase pipeline ────────────────────────────────────────────
export async function runPipeline(docId, pdfBase64, filename) {
  const stored = await chrome.storage.local.get('geminiApiKey');
  const apiKey = stored.geminiApiKey;
  if (!apiKey) throw new Error('Gemini API key not configured — add it in Settings.');

  // Validate key format — AI Studio keys start with "AIza"
  if (!apiKey.startsWith('AIza')) {
    throw new Error(
      'Invalid Gemini API key. Keys from AI Studio start with "AIza". ' +
      'Get a correct key at aistudio.google.com/app/apikey'
    );
  }

  // Upload PDF once — reuse URI across all 3 generative phases (avoids re-sending base64)
  emit(docId, 'classify', 'running', 'Uploading PDF to Gemini File API...');
  let fileUri = null;
  try {
    fileUri = await uploadToFileAPI(apiKey, pdfBase64, filename, docId);
  } catch {
    // File API unavailable — pipeline continues with inline base64 (slower, more tokens)
  }

  // ── Phase 1: Classify ─────────────────────────────────────────────────────
  emit(docId, 'classify', 'running', 'Identifying document type...');

  let classification;
  try {
    classification = await callGemini(apiKey, FAST, CLASSIFY_PROMPT, pdfBase64, fileUri);
  } catch (err) {
    emit(docId, 'classify', 'error', err.message);
    await saveDocument({ id: docId, filename, uploadedAt: Date.now(), status: 'failed', error: err.message });
    throw err;
  }

  const docType         = classification.documentType || 'other';
  const taxYear         = classification.taxYear       || new Date().getFullYear();
  const classifyConf    = classification.confidence    || 70;
  const issuer          = classification.issuer        || null;

  emit(docId, 'classify', 'done', `${docType} · ${taxYear} · ${classifyConf}% confidence`);

  await saveDocument({
    id: docId, filename, uploadedAt: Date.now(),
    docType, taxYear, issuer, classifyConf, status: 'extracting',
    fieldCount: 0, overallConfidence: 0,
  });

  // ── Phase 2: Extract ──────────────────────────────────────────────────────
  emit(docId, 'extract', 'running', `Running ${DEEP_TYPES.has(docType) ? 'deep' : 'fast'} extraction for ${docType}...`);

  const extractModel  = DEEP_TYPES.has(docType) ? DEEP : FAST;
  const extractPrompt = EXTRACT_PROMPTS[docType] || EXTRACT_PROMPTS['other'];

  let extracted;
  try {
    extracted = await callGemini(apiKey, extractModel, extractPrompt, pdfBase64, fileUri);
  } catch (err) {
    emit(docId, 'extract', 'error', err.message);
    await saveDocument({ id: docId, filename, uploadedAt: Date.now(), docType, taxYear, issuer, classifyConf, status: 'failed', error: err.message, fieldCount: 0, overallConfidence: 0 });
    throw err;
  }

  emit(docId, 'extract', 'done', `${Object.keys(extracted).length} raw fields extracted`);

  // ── Phase 3: Judge ────────────────────────────────────────────────────────
  emit(docId, 'judge', 'running', 'LLM validating extracted values...');

  const judgePrompt = `You are a tax document validation expert. The following values were extracted from a ${docType} (tax year ${taxYear}):

${JSON.stringify(extracted, null, 2)}

Validate each numeric field and return a confidence score. Flag any anomalies.
Respond ONLY with valid JSON:
{"overallConfidence":90,"approved":true,"fieldScores":{"box1_nonemployeeCompensation":95,"payerName":88},"flags":[],"notes":"brief summary"}

Scoring rules:
- 90-100: clearly legible, internally consistent, realistic amount
- 70-89:  legible but has minor uncertainty (e.g., partially visible, slightly unusual)
- 50-69:  questionable — suspicious rounding, or amount inconsistent with doc type
- <50:    likely wrong — extracted value does not match expected range for field
Approved = true only if overallConfidence >= 70 and no critical flags.`;

  let judgment;
  try {
    judgment = await callGemini(apiKey, FAST, judgePrompt, pdfBase64, fileUri);
  } catch {
    judgment = {
      overallConfidence: classifyConf,
      approved: classifyConf >= 70,
      fieldScores: {},
      flags: ['Judge unavailable — using classification confidence as proxy'],
      notes: 'Judge phase failed; classification confidence used.',
    };
  }

  const label = judgment.approved ? '✓ APPROVED' : '⚠ FLAGGED';
  emit(docId, 'judge', 'done',
    `${judgment.overallConfidence}% · ${label} · ${judgment.flags?.length ?? 0} flag(s)`);

  // ── Phase 4: Store ────────────────────────────────────────────────────────
  emit(docId, 'store', 'running', 'Persisting to IndexedDB...');

  await saveJudgment({
    docId,
    overallConfidence: judgment.overallConfidence,
    approved:          judgment.approved,
    fieldScores:       judgment.fieldScores || {},
    flags:             judgment.flags       || [],
    notes:             judgment.notes       || '',
    judgedAt:          Date.now(),
  });

  const fieldValues = buildFieldValues(
    extracted, docType, docId, filename,
    judgment.fieldScores, judgment.overallConfidence
  );
  await saveFieldValues(fieldValues);

  await saveDocument({
    id: docId, filename, uploadedAt: Date.now(),
    docType, taxYear, issuer, classifyConf,
    status:            judgment.approved ? 'approved' : 'flagged',
    fieldCount:        fieldValues.length,
    overallConfidence: judgment.overallConfidence,
    extractedData:     extracted,
    flags:             judgment.flags || [],
  });

  emit(docId, 'store', 'done', `${fieldValues.length} field values stored`);

  return {
    docType,
    taxYear,
    overallConfidence: judgment.overallConfidence,
    approved:          judgment.approved,
    fieldCount:        fieldValues.length,
    flags:             judgment.flags || [],
    issuer,
  };
}
