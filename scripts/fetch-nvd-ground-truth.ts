#!/usr/bin/env npx tsx

/**
 * NVD CVE Ground Truth Fetcher
 * 
 * Fetches CVE data from NIST National Vulnerability Database for security
 * evaluation scenarios.
 * 
 * Usage:
 *   npx tsx scripts/fetch-nvd-ground-truth.ts --apiKey YOUR_NIST_KEY
 *   npx tsx scripts/fetch-nvd-ground-truth.ts --cve CVE-2024-1234 CVE-2024-5678
 *   npx tsx scripts/fetch-nvd-ground-truth.ts --output docs/architecture/benchmarks/nvd-ground-truth.json
 */

import dotenv from "dotenv";
import { writeFileSync } from "node:fs";

dotenv.config();

interface CVSSData {
  baseScore: number;
  baseSeverity: string;
  vectorString: string;
  attackVector: string;
  attackComplexity: string;
  privilegesRequired: string;
  userInteraction: string;
  scope: string;
  confidentiality: string;
  integrity: string;
  availability: string;
}

interface CVEData {
  id: string;
  published: string;
  modified: string;
  status: string;
  description: string;
  cvssData: CVSSData;
  references: string[];
  affectedVendors?: string[];
  affectedProducts?: string[];
}

const SAMPLE_CVES = [
  "CVE-2024-21887",  // Ivanti Connect Secure
  "CVE-2024-23897",  // Jenkins
  "CVE-2023-44487",  // HTTP/2 Rapid Reset
  "CVE-2023-36025",  // Windows SmartScreen
  "CVE-2023-27997",  // FortiOS
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

function extractCVSSData(metrics: any): CVSSData | null {
  if (!metrics) return null;
  
  // Try CVSS v3.1 first, then v3.0, then v2
  const cvss31 = metrics.cvssMetricV31?.[0]?.cvssData;
  if (cvss31) {
    return {
      baseScore: cvss31.baseScore || 0,
      baseSeverity: cvss31.baseSeverity || "UNKNOWN",
      vectorString: cvss31.vectorString || "",
      attackVector: cvss31.attackVector || "",
      attackComplexity: cvss31.attackComplexity || "",
      privilegesRequired: cvss31.privilegesRequired || "",
      userInteraction: cvss31.userInteraction || "",
      scope: cvss31.scope || "",
      confidentiality: cvss31.confidentiality || "",
      integrity: cvss31.integrity || "",
      availability: cvss31.availability || "",
    };
  }
  
  const cvss30 = metrics.cvssMetricV30?.[0]?.cvssData;
  if (cvss30) {
    return {
      baseScore: cvss30.baseScore || 0,
      baseSeverity: cvss30.baseSeverity || "UNKNOWN",
      vectorString: cvss30.vectorString || "",
      attackVector: cvss30.attackVector || "",
      attackComplexity: cvss30.attackComplexity || "",
      privilegesRequired: cvss30.privilegesRequired || "",
      userInteraction: cvss30.userInteraction || "",
      scope: cvss30.scope || "",
      confidentiality: cvss30.confidentiality || "",
      integrity: cvss30.integrity || "",
      availability: cvss30.availability || "",
    };
  }
  
  const cvss2 = metrics.cvssMetricV2?.[0]?.cvssData;
  if (cvss2) {
    return {
      baseScore: cvss2.baseScore || 0,
      baseSeverity: cvss2.baseSeverity || "UNKNOWN",
      vectorString: cvss2.vectorString || "",
      attackVector: cvss2.attackVector || "",
      attackComplexity: cvss2.attackComplexity || "",
      privilegesRequired: cvss2.privilegesRequired || "",
      userInteraction: cvss2.userInteraction || "",
      scope: cvss2.scope || "",
      confidentiality: cvss2.confidentiality || "",
      integrity: cvss2.integrity || "",
      availability: cvss2.availability || "",
    };
  }
  
  return null;
}

async function fetchCVE(cveId: string, apiKey?: string): Promise<CVEData | null> {
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`;
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  
  if (apiKey) {
    headers["apiKey"] = apiKey;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 404) {
      console.log(`  [WARN] CVE not found: ${cveId}`);
      return null;
    }
    throw new Error(`NVD API error: ${response.status} for ${cveId}`);
  }
  
  const data = await response.json() as any;
  const vulns = data.vulnerabilities || [];
  
  if (vulns.length === 0) {
    return null;
  }
  
  const vuln = vulns[0].cve;
  const metrics = vuln.metrics || {};
  
  return {
    id: vuln.id,
    published: vuln.published || "",
    modified: vuln.modified || "",
    status: vuln.vulnStatus || "UNKNOWN",
    description: vuln.descriptions?.[0]?.value || "",
    cvssData: extractCVSSData(metrics) || {
      baseScore: 0,
      baseSeverity: "UNKNOWN",
      vectorString: "",
      attackVector: "",
      attackComplexity: "",
      privilegesRequired: "",
      userInteraction: "",
      scope: "",
      confidentiality: "",
      integrity: "",
      availability: "",
    },
    references: vuln.references?.map((r: any) => r.url) || [],
  };
}

async function fetchRecentCVEs(days: number = 30, apiKey?: string): Promise<CVEData[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${startStr}T00:00:00.000&pubEndDate=${endStr}T23:59:59.999&resultsPerPage=25`;
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  
  if (apiKey) {
    headers["apiKey"] = apiKey;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`NVD API error: ${response.status}`);
  }
  
  const data = await response.json() as any;
  const vulns = data.vulnerabilities || [];
  
  return vulns.map((v: any) => {
    const vuln = v.cve;
    const metrics = vuln.metrics || {};
    
    return {
      id: vuln.id,
      published: vuln.published || "",
      modified: vuln.modified || "",
      status: vuln.vulnStatus || "UNKNOWN",
      description: vuln.descriptions?.[0]?.value || "",
      cvssData: extractCVSSData(metrics) || {
        baseScore: 0,
        baseSeverity: "UNKNOWN",
        vectorString: "",
        attackVector: "",
        attackComplexity: "",
        privilegesRequired: "",
        userInteraction: "",
        scope: "",
        confidentiality: "",
        integrity: "",
        availability: "",
      },
      references: vuln.references?.map((r: any) => r.url) || [],
    };
  });
}

async function main() {
  const outputPath = getArg("--output") || "docs/architecture/benchmarks/nvd-ground-truth.json";
  const cvesFromArgs = getMultiArg("--cve");
  const apiKey = process.env.NIST_API_KEY || getArg("--apiKey");
  const fetchRecent = process.argv.includes("--recent");
  const days = parseInt(getArg("--days") || "30", 10);
  
  const results: Record<string, CVEData> = {};
  
  if (cvesFromArgs.length > 0) {
    console.log(`Fetching ${cvesFromArgs.length} specific CVEs...`);
    for (const cveId of cvesFromArgs) {
      console.log(`  Fetching ${cveId}...`);
      const data = await fetchCVE(cveId, apiKey);
      if (data) {
        results[cveId] = data;
      }
      // Rate limiting - be nice to the NVD API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } else if (fetchRecent) {
    console.log(`Fetching CVEs from the last ${days} days...`);
    const recentCVEs = await fetchRecentCVEs(days, apiKey);
    for (const cve of recentCVEs) {
      results[cve.id] = cve;
    }
    console.log(`  Found ${recentCVEs.length} CVEs`);
  } else {
    console.log(`Fetching sample CVEs...`);
    for (const cveId of SAMPLE_CVES) {
      console.log(`  Fetching ${cveId}...`);
      const data = await fetchCVE(cveId, apiKey);
      if (data) {
        results[cveId] = data;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const output = {
    generatedAt: new Date().toISOString(),
    source: "NIST NVD",
    sourceUrl: "https://services.nvd.nist.gov/rest/json/cves/2.0",
    cves: results,
  };
  
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${Object.keys(results).length} CVE records to ${outputPath}`);
}

main().catch(console.error);
