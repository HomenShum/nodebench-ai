// convex/agents/crmExtraction.ts
// Extract CRM-ready fields from LinkUp company research data

import { extractFoundingYear, extractIndustry, parseFundingAmount } from "./criteriaSearch";

/**
 * CRM Fields for company research
 */
export interface CRMFields {
  // Basic Info
  companyName: string;
  description: string;
  headline: string;
  
  // Location
  hqLocation: string;
  city: string;
  state: string;
  country: string;
  
  // Contact
  website: string;
  email: string;
  phone: string;
  
  // People
  founders: string[];
  foundersBackground: string;
  keyPeople: Array<{ name: string; title: string }>;
  
  // Business
  industry: string | null;
  companyType: string;
  foundingYear: number | null;
  product: string;
  targetMarket: string;
  businessModel: string;
  
  // Funding
  fundingStage: string;
  totalFunding: string;
  lastFundingDate: string;
  investors: string[];
  investorBackground: string;
  
  // Competitive
  competitors: string[];
  competitorAnalysis: string;
  
  // Regulatory
  fdaApprovalStatus: string;
  fdaTimeline: string;
  
  // News & Timeline
  newsTimeline: Array<{ date: string; headline: string; source: string }>;
  recentNews: string;
  
  // Additional
  keyEntities: string[];
  researchPapers: string[];
  partnerships: string[];
  
  // Metadata
  completenessScore: number;
  dataQuality: 'verified' | 'partial' | 'incomplete';
}

/**
 * Extract CRM fields from LinkUp company data
 */
export function extractCRMFields(linkupData: any, companyName: string): CRMFields {
  const data = linkupData || {};
  
  // Extract founders from key personnel
  const founders = (data.keyPersonnel || [])
    .filter((p: any) => p.title?.toLowerCase().includes('founder') || p.title?.toLowerCase().includes('ceo'))
    .map((p: any) => p.name);
  
  // Extract founding year
  const foundingYear = extractFoundingYear(data.summary, data.headline, data.allLinks);
  
  // Extract industry
  const industry = extractIndustry(data.summary, data.headline, data.primaryServicesOrProducts);
  
  // Extract total funding
  const totalFunding = (data.financials?.fundingRounds || [])
    .reduce((sum: number, round: any) => sum + parseFundingAmount(round.amount || '0'), 0);
  
  // Extract last funding date
  const lastFundingDate = (data.financials?.fundingRounds || [])
    .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    [0]?.date || '';
  
  // Extract location components
  const locationStr = data.location || '';
  const locationParts = locationStr.split(',').map((s: string) => s.trim());
  const city = locationParts[0] || '';
  const state = locationParts[1] || '';
  const country = locationParts[2] || '';
  
  // Extract product description
  const product = (data.primaryServicesOrProducts || []).join(', ');
  
  // Extract business model
  const businessModel = data.businessModel?.monetizationStrategy || '';
  
  // Extract target market
  const targetMarket = data.businessModel?.targetAudience || '';
  
  // Extract competitors
  const competitors = data.competitiveLandscape?.primaryCompetitors || [];
  
  // Extract investor background
  const investorBackground = (data.financials?.investors || [])
    .slice(0, 3)
    .join(', ');
  
  // Extract news timeline (if available)
  const newsTimeline: Array<{ date: string; headline: string; source: string }> = [];
  
  // Calculate completeness score
  const fields = [
    data.companyName,
    data.summary,
    data.headline,
    data.location,
    data.website,
    founders.length > 0,
    data.keyPersonnel?.length > 0,
    industry,
    data.companyType,
    foundingYear,
    product,
    targetMarket,
    businessModel,
    totalFunding > 0,
    competitors.length > 0,
    data.financials?.investors?.length > 0,
  ];
  
  const completenessScore = (fields.filter(Boolean).length / fields.length) * 100;
  
  const dataQuality: 'verified' | 'partial' | 'incomplete' = 
    completenessScore >= 80 ? 'verified' :
    completenessScore >= 50 ? 'partial' :
    'incomplete';
  
  return {
    companyName,
    description: data.summary || '',
    headline: data.headline || '',
    hqLocation: data.location || '',
    city,
    state,
    country,
    website: data.website || '',
    email: '', // Not typically available from LinkUp
    phone: '', // Not typically available from LinkUp
    founders,
    foundersBackground: founders.join(', '),
    keyPeople: data.keyPersonnel || [],
    industry: industry || 'Unknown',
    companyType: data.companyType || '',
    foundingYear,
    product,
    targetMarket,
    businessModel,
    fundingStage: determineFundingStage(totalFunding),
    totalFunding: formatFundingAmount(totalFunding),
    lastFundingDate,
    investors: data.financials?.investors || [],
    investorBackground,
    competitors,
    competitorAnalysis: data.competitiveLandscape?.economicMoat?.join('; ') || '',
    fdaApprovalStatus: '', // Would need specialized search
    fdaTimeline: '', // Would need specialized search
    newsTimeline,
    recentNews: '', // Would need news search
    keyEntities: [], // Would need NER
    researchPapers: [], // Would need academic search
    partnerships: data.financials?.subsidiaries || [],
    completenessScore: Math.round(completenessScore),
    dataQuality,
  };
}

/**
 * Determine funding stage based on total funding amount
 */
function determineFundingStage(totalFunding: number): string {
  if (totalFunding === 0) return 'pre-seed';
  if (totalFunding < 2_000_000) return 'seed';
  if (totalFunding < 10_000_000) return 'series-a';
  if (totalFunding < 50_000_000) return 'series-b';
  if (totalFunding < 200_000_000) return 'series-c';
  return 'late-stage';
}

/**
 * Format funding amount to human-readable string
 */
function formatFundingAmount(amount: number): string {
  if (amount === 0) return 'Not disclosed';
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
 * Convert CRM fields to CSV row
 */
export function crmFieldsToCSVRow(crmFields: CRMFields): Record<string, string> {
  return {
    'Company Name': crmFields.companyName,
    'Description': crmFields.description,
    'Headline': crmFields.headline,
    'HQ Location': crmFields.hqLocation,
    'City': crmFields.city,
    'State': crmFields.state,
    'Country': crmFields.country,
    'Website': crmFields.website,
    'Email': crmFields.email,
    'Phone': crmFields.phone,
    'Founders': crmFields.founders.join('; '),
    'Founders Background': crmFields.foundersBackground,
    'Key People': crmFields.keyPeople.map(p => `${p.name} (${p.title})`).join('; '),
    'Industry': crmFields.industry || 'Unknown',
    'Company Type': crmFields.companyType,
    'Founding Year': crmFields.foundingYear?.toString() || 'Unknown',
    'Product': crmFields.product,
    'Target Market': crmFields.targetMarket,
    'Business Model': crmFields.businessModel,
    'Funding Stage': crmFields.fundingStage,
    'Total Funding': crmFields.totalFunding,
    'Last Funding Date': crmFields.lastFundingDate,
    'Investors': crmFields.investors.join('; '),
    'Investor Background': crmFields.investorBackground,
    'Competitors': crmFields.competitors.join('; '),
    'Competitor Analysis': crmFields.competitorAnalysis,
    'FDA Approval Status': crmFields.fdaApprovalStatus,
    'FDA Timeline': crmFields.fdaTimeline,
    'Recent News': crmFields.recentNews,
    'Partnerships': crmFields.partnerships.join('; '),
    'Data Quality': crmFields.dataQuality,
    'Completeness Score': `${crmFields.completenessScore}%`,
  };
}

