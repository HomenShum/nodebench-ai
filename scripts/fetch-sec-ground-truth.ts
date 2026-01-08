#!/usr/bin/env npx tsx

/**
 * SEC EDGAR Ground Truth Fetcher
 * 
 * Fetches 10-K filings for public companies to use as deterministic ground truth
 * for financial evaluation scenarios.
 * 
 * Usage:
 *   npx tsx scripts/fetch-sec-ground-truth.ts --cik 0000320193 0000066740 0001652044
 *   npx tsx scripts/fetch-sec-ground-truth.ts --output docs/architecture/benchmarks/sec-ground-truth.json
 */

import dotenv from "dotenv";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config();

interface SECCompany {
  cik: string;
  name: string;
  ticker: string;
}

interface SECFilingData {
  cik: string;
  companyName: string;
  filingDate: string;
  formType: string;
  revenue?: string;
  netIncome?: string;
  totalAssets?: string;
  riskFactors?: string;
  businessDescription?: string;
}

const TEST_COMPANIES: SECCompany[] = [
  { cik: "0000320193", name: "Apple Inc.", ticker: "AAPL" },
  { cik: "0000066740", name: "Microsoft Corporation", ticker: "MSFT" },
  { cik: "0001652044", name: "Alphabet Inc.", ticker: "GOOGL" },
  { cik: "0001018293", name: "Tesla Inc.", ticker: "TSLA" },
  { cik: "0000320193", name: "NVIDIA Corporation", ticker: "NVDA" },
];

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function getMultiArg(flag: string): string[] {
  const result: string[] = [];
  let idx = process.argv.indexOf(flag);
  while (idx >= 0) {
    if (idx + 1 < process.argv.length && !process.argv[idx + 1].startsWith("-")) {
      result.push(process.argv[idx + 1]);
    }
    idx = process.argv.indexOf(flag, idx + 1);
  }
  return result;
}

function formatCik(cik: string): string {
  // SEC requires 10-digit CIK with leading zeros
  return cik.padStart(10, '0');
}

async function fetchCompanyFiling(cik: string): Promise<SECFilingData> {
  const formattedCik = formatCik(cik);
  const url = `https://data.sec.gov/submissions/CIK${formattedCik}.json`;
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "NodeBench-Eval (admin@nodebench.com)",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status} for CIK ${cik}`);
  }

  const data = await response.json() as any;
  const name = data.name || "Unknown";
  
  // Find most recent 10-K
  const filings = data.filings?.recent || {};
  const formTypes = filings.form || [];
  const dates = filings.filingDate || [];
  const indices = formTypes.map((f: string, i: number) => ({ form: f, date: dates[i], idx: i }));
  
  const tenK = indices.find((f: any) => f.form === "10-K");
  
  if (!tenK) {
    return {
      cik,
      companyName: name,
      filingDate: "",
      formType: "",
    };
  }

  const filingIndex = tenK.idx;
  
  // Get primary document for the 10-K to extract specific sections
  const accessionNumber = filings.accessionNumber?.[filingIndex] || "";
  const primaryDoc = filings.primaryDocument?.[filingIndex] || "";
  
  return {
    cik,
    companyName: name,
    filingDate: tenK.date,
    formType: "10-K",
  };
}

async function fetchRiskFactors(cik: string, companyName: string): Promise<string> {
  // For now, return a placeholder - extracting actual 10-K sections requires
  // parsing XBRL or HTML, which is complex. We can enhance this later.
  console.log(`  [INFO] Risk factors would be extracted from Item 1A for ${companyName}`);
  return `Risk factors for ${companyName} - see SEC filing`;
}

async function main() {
  const outputPath = getArg("--output") || "docs/architecture/benchmarks/sec-ground-truth.json";
  const ciksFromArgs = getMultiArg("--cik");
  const companies = ciksFromArgs.length > 0 
    ? ciksFromArgs.map(c => ({ cik: c, name: "Unknown", ticker: "" }))
    : TEST_COMPANIES;

  console.log(`Fetching SEC data for ${companies.length} companies...`);
  
  const results: Record<string, SECFilingData> = {};
  
  for (const company of companies) {
    try {
      console.log(`Fetching ${company.name} (CIK: ${company.cik})...`);
      const filingData = await fetchCompanyFiling(company.cik);
      results[company.cik] = filingData;
      
      // Rate limiting - SEC allows 10 requests per second
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      console.error(`Error fetching ${company.cik}:`, error);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "SEC EDGAR",
    sourceUrl: "https://data.sec.gov/submissions/",
    companies: results,
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${Object.keys(results).length} company records to ${outputPath}`);
}

main().catch(console.error);
