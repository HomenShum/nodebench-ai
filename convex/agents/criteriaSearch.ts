// convex/agents/criteriaSearch.ts
// Criteria-based company search with filtering for funding, industry, founding year, and founder experience

import { z } from "zod/v3";

/**
 * Parse funding amount string (e.g., "$2M", "$500K") to number in dollars
 */
export function parseFundingAmount(fundingStr: string): number {
  if (!fundingStr) return 0;
  
  const cleaned = fundingStr.replace(/[$,\s]/g, '').toUpperCase();
  const match = cleaned.match(/^([\d.]+)([KMB])?$/);
  
  if (!match) return 0;
  
  const amount = parseFloat(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'K': return amount * 1_000;
    case 'M': return amount * 1_000_000;
    case 'B': return amount * 1_000_000_000;
    default: return amount;
  }
}

/**
 * Format funding amount to human-readable string
 */
export function formatFundingAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  } else if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount}`;
}

/**
 * Check if founder has previous founding experience
 */
export function checkFounderExperience(
  keyPersonnel: Array<{ name: string; title: string }> | undefined,
  workExperience: Array<{ jobTitle: string; companyName: string }> | undefined,
  summary: string | undefined
): boolean {
  if (!keyPersonnel && !workExperience && !summary) return false;
  
  const experienceKeywords = [
    'founder', 'co-founder', 'ceo', 'startup', 'entrepreneur',
    'serial entrepreneur', 'founded', 'launched', 'created',
    'established', 'built', 'scaled'
  ];
  
  const text = [
    ...(keyPersonnel?.map(p => `${p.name} ${p.title}`) || []),
    ...(workExperience?.map(w => `${w.jobTitle} at ${w.companyName}`) || []),
    summary || ''
  ].join(' ').toLowerCase();
  
  return experienceKeywords.some(keyword => text.includes(keyword));
}

/**
 * Extract founding year from company data
 */
export function extractFoundingYear(
  summary: string | undefined,
  headline: string | undefined,
  allLinks: string[] | undefined
): number | null {
  const text = `${summary || ''} ${headline || ''}`.toLowerCase();
  
  // Look for patterns like "founded in 2022", "established 2023", etc.
  const patterns = [
    /founded\s+(?:in\s+)?(\d{4})/i,
    /established\s+(?:in\s+)?(\d{4})/i,
    /launched\s+(?:in\s+)?(\d{4})/i,
    /created\s+(?:in\s+)?(\d{4})/i,
    /since\s+(\d{4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        return year;
      }
    }
  }
  
  return null;
}

/**
 * Extract industry/sector from company data
 */
export function extractIndustry(
  summary: string | undefined,
  headline: string | undefined,
  primaryServicesOrProducts: string[] | undefined
): string | null {
  const healthcareKeywords = [
    'healthcare', 'health', 'medical', 'biotech', 'pharma', 'pharmaceutical',
    'clinical', 'hospital', 'patient', 'disease', 'treatment', 'therapy',
    'drug', 'medicine', 'wellness', 'fitness', 'nutrition', 'mental health',
    'telemedicine', 'diagnostics', 'lab', 'genetic', 'dna', 'vaccine',
    'life science', 'biology', 'research', 'development', 'fda'
  ];
  
  const text = [
    summary || '',
    headline || '',
    ...(primaryServicesOrProducts || [])
  ].join(' ').toLowerCase();
  
  if (healthcareKeywords.some(keyword => text.includes(keyword))) {
    return 'healthcare';
  }
  
  // Add more industry detection as needed
  return null;
}

/**
 * Criteria for company search
 */
export const searchCriteria = z.object({
  minFunding: z.string().optional().describe("Minimum funding amount (e.g., '$2M', '$500K')"),
  maxFunding: z.string().optional().describe("Maximum funding amount (e.g., '$100M')"),
  industry: z.string().optional().describe("Industry/sector (e.g., 'healthcare', 'fintech')"),
  minFoundingYear: z.number().optional().describe("Minimum founding year (e.g., 2022)"),
  maxFoundingYear: z.number().optional().describe("Maximum founding year (e.g., 2024)"),
  requireFounderExperience: z.boolean().optional().describe("Require founders to have previous founding experience"),
  fundingStage: z.enum(['seed', 'series-a', 'series-b', 'series-c', 'growth', 'late-stage']).optional().describe("Funding stage"),
});

export type SearchCriteria = z.infer<typeof searchCriteria>;

/**
 * Check if company matches search criteria
 */
export function matchesCriteria(
  company: any,
  criteria: SearchCriteria
): boolean {
  // Check funding
  if (criteria.minFunding || criteria.maxFunding) {
    const totalFunding = company.financials?.fundingRounds?.reduce(
      (sum: number, round: any) => sum + parseFundingAmount(round.amount || '0'),
      0
    ) || 0;
    
    if (criteria.minFunding) {
      const minAmount = parseFundingAmount(criteria.minFunding);
      if (totalFunding < minAmount) return false;
    }
    
    if (criteria.maxFunding) {
      const maxAmount = parseFundingAmount(criteria.maxFunding);
      if (totalFunding > maxAmount) return false;
    }
  }
  
  // Check industry
  if (criteria.industry) {
    const detectedIndustry = extractIndustry(
      company.summary,
      company.headline,
      company.primaryServicesOrProducts
    );
    if (!detectedIndustry || !detectedIndustry.toLowerCase().includes(criteria.industry.toLowerCase())) {
      return false;
    }
  }
  
  // Check founding year
  const foundingYear = extractFoundingYear(company.summary, company.headline, company.allLinks);
  if (criteria.minFoundingYear && foundingYear && foundingYear < criteria.minFoundingYear) {
    return false;
  }
  if (criteria.maxFoundingYear && foundingYear && foundingYear > criteria.maxFoundingYear) {
    return false;
  }
  
  // Check founder experience
  if (criteria.requireFounderExperience) {
    const hasExperience = checkFounderExperience(
      company.keyPersonnel,
      undefined,
      company.summary
    );
    if (!hasExperience) return false;
  }
  
  return true;
}

