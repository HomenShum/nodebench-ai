/**
 * SEC EDGAR Search Adapter
 * 
 * Adapts SEC EDGAR API responses to unified SearchResult format.
 * 
 * @module search/fusion/adapters/secAdapter
 */

import type { SearchResult, SearchSourceAdapter, SearchAdapterOptions } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// SEC RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SecFiling {
  formType: string;
  filingDate: string;
  accessionNumber: string;
  primaryDocument: string;
  companyName?: string;
  cik?: string;
}

interface SecSubmissionsResponse {
  name: string;
  cik: string;
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export class SecAdapter implements SearchSourceAdapter {
  source = "sec" as const;
  
  private userAgent = "NodeBench AI contact@nodebench.ai";
  
  isAvailable(): boolean {
    // SEC EDGAR is always available (no API key required)
    return true;
  }
  
  async search(query: string, options: SearchAdapterOptions): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    try {
      // Extract potential ticker or company name from query
      const ticker = this.extractTicker(query);
      
      if (!ticker) {
        console.log("[SecAdapter] No ticker found in query, skipping SEC search");
        return [];
      }
      
      // Look up CIK from ticker
      const cik = await this.lookupCik(ticker);
      if (!cik) {
        console.log(`[SecAdapter] Could not find CIK for ticker: ${ticker}`);
        return [];
      }
      
      // Fetch company submissions
      const paddedCik = cik.padStart(10, "0");
      const response = await fetch(
        `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
        { headers: { "User-Agent": this.userAgent } }
      );
      
      if (!response.ok) {
        console.error(`[SecAdapter] Failed to fetch submissions: ${response.status}`);
        return [];
      }
      
      const data: SecSubmissionsResponse = await response.json();
      const elapsed = Date.now() - startTime;
      console.log(`[SecAdapter] Search completed in ${elapsed}ms for ${data.name}`);
      
      return this.normalizeResults(data, paddedCik, options.maxResults);
    } catch (error) {
      console.error("[SecAdapter] Search failed:", error);
      return [];
    }
  }
  
  private extractTicker(query: string): string | null {
    // Look for common patterns: "AAPL", "$AAPL", "ticker:AAPL"
    const patterns = [
      /\$([A-Z]{1,5})\b/,           // $AAPL
      /\bticker[:\s]+([A-Z]{1,5})\b/i, // ticker:AAPL
      /\b([A-Z]{1,5})\s+(?:stock|shares|filings?|10-?[KQ]|8-?K)/i, // AAPL stock
      /\b([A-Z]{2,5})\b/,           // Standalone uppercase (last resort)
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) return match[1].toUpperCase();
    }
    
    return null;
  }
  
  private async lookupCik(ticker: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${ticker}&output=json`,
        { headers: { "User-Agent": this.userAgent } }
      );
      
      if (!response.ok) return null;
      
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return null;
      
      const data = await response.json();
      return data?.cik || null;
    } catch {
      return null;
    }
  }
  
  private normalizeResults(data: SecSubmissionsResponse, paddedCik: string, maxResults: number): SearchResult[] {
    const { recent } = data.filings;
    const results: SearchResult[] = [];
    
    for (let i = 0; i < Math.min(recent.form.length, maxResults); i++) {
      const accession = recent.accessionNumber[i].replace(/-/g, "");
      
      results.push({
        id: `sec-${paddedCik}-${recent.accessionNumber[i]}`,
        source: "sec" as const,
        title: `${data.name} - ${recent.form[i]} (${recent.filingDate[i]})`,
        snippet: `SEC ${recent.form[i]} filing for ${data.name}`,
        url: `https://www.sec.gov/Archives/edgar/data/${parseInt(paddedCik)}/${accession}/${recent.primaryDocument[i]}`,
        score: 1 - (i / recent.form.length),
        originalRank: i + 1,
        contentType: "filing" as const,
        publishedAt: recent.filingDate[i],
        author: data.name,
        metadata: {
          formType: recent.form[i],
          cik: paddedCik,
          accessionNumber: recent.accessionNumber[i],
        },
      });
    }
    
    return results;
  }
}

export const secAdapter = new SecAdapter();

