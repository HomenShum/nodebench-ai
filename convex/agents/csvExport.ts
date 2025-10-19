// convex/agents/csvExport.ts
// CSV export functionality for bulk research results

import { crmFieldsToCSVRow } from "./crmExtraction";
import type { CRMFields } from "./crmExtraction";

/**
 * Escape CSV field value
 */
function escapeCSVField(value: string | undefined | null): string {
  if (!value) return '';
  
  const str = String(value);
  
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Convert array of CRM fields to CSV string
 */
export function generateCSV(crmFieldsArray: CRMFields[]): string {
  if (crmFieldsArray.length === 0) {
    return '';
  }
  
  // Get headers from first row
  const firstRow = crmFieldsToCSVRow(crmFieldsArray[0]);
  const headers = Object.keys(firstRow);
  
  // Build CSV
  const lines: string[] = [];
  
  // Add header row
  lines.push(headers.map(escapeCSVField).join(','));
  
  // Add data rows
  for (const crmFields of crmFieldsArray) {
    const row = crmFieldsToCSVRow(crmFields);
    const values = headers.map(header => escapeCSVField(row[header]));
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

/**
 * Generate CSV with metadata
 */
export function generateCSVWithMetadata(
  crmFieldsArray: CRMFields[],
  metadata?: {
    title?: string;
    description?: string;
    generatedAt?: Date;
    criteria?: Record<string, any>;
  }
): string {
  const lines: string[] = [];
  
  // Add metadata comments
  if (metadata?.title) {
    lines.push(`# ${metadata.title}`);
  }
  if (metadata?.description) {
    lines.push(`# ${metadata.description}`);
  }
  if (metadata?.generatedAt) {
    lines.push(`# Generated: ${metadata.generatedAt.toISOString()}`);
  }
  if (metadata?.criteria) {
    lines.push(`# Criteria: ${JSON.stringify(metadata.criteria)}`);
  }
  if (lines.length > 0) {
    lines.push(''); // Blank line before data
  }
  
  // Add CSV data
  lines.push(generateCSV(crmFieldsArray));
  
  return lines.join('\n');
}

/**
 * Generate JSON export
 */
export function generateJSON(crmFieldsArray: CRMFields[]): string {
  return JSON.stringify(crmFieldsArray, null, 2);
}

/**
 * Generate summary statistics
 */
export function generateSummary(crmFieldsArray: CRMFields[]): {
  totalCompanies: number;
  verifiedCount: number;
  partialCount: number;
  incompleteCount: number;
  averageCompleteness: number;
  byIndustry: Record<string, number>;
  byFundingStage: Record<string, number>;
  byDataQuality: Record<string, number>;
} {
  const summary = {
    totalCompanies: crmFieldsArray.length,
    verifiedCount: 0,
    partialCount: 0,
    incompleteCount: 0,
    averageCompleteness: 0,
    byIndustry: {} as Record<string, number>,
    byFundingStage: {} as Record<string, number>,
    byDataQuality: {} as Record<string, number>,
  };
  
  let totalCompleteness = 0;
  
  for (const crm of crmFieldsArray) {
    // Count by data quality
    summary[`${crm.dataQuality}Count` as keyof typeof summary]++;
    summary.byDataQuality[crm.dataQuality] = (summary.byDataQuality[crm.dataQuality] || 0) + 1;

    // Count by industry
    const industry = crm.industry || 'Unknown';
    summary.byIndustry[industry] = (summary.byIndustry[industry] || 0) + 1;

    // Count by funding stage
    summary.byFundingStage[crm.fundingStage] = (summary.byFundingStage[crm.fundingStage] || 0) + 1;

    // Accumulate completeness
    totalCompleteness += crm.completenessScore;
  }
  
  summary.averageCompleteness = crmFieldsArray.length > 0 
    ? Math.round(totalCompleteness / crmFieldsArray.length)
    : 0;
  
  return summary;
}

/**
 * Generate summary report as text
 */
export function generateSummaryReport(crmFieldsArray: CRMFields[]): string {
  const summary = generateSummary(crmFieldsArray);
  
  let report = `# Research Summary Report\n\n`;
  report += `## Overview\n`;
  report += `- Total Companies: ${summary.totalCompanies}\n`;
  report += `- Average Completeness: ${summary.averageCompleteness}%\n\n`;
  
  report += `## Data Quality\n`;
  report += `- ✅ Verified: ${summary.verifiedCount} (${Math.round((summary.verifiedCount / summary.totalCompanies) * 100)}%)\n`;
  report += `- ⚠️ Partial: ${summary.partialCount} (${Math.round((summary.partialCount / summary.totalCompanies) * 100)}%)\n`;
  report += `- ❌ Incomplete: ${summary.incompleteCount} (${Math.round((summary.incompleteCount / summary.totalCompanies) * 100)}%)\n\n`;
  
  report += `## By Industry\n`;
  for (const [industry, count] of Object.entries(summary.byIndustry)) {
    report += `- ${industry}: ${count}\n`;
  }
  report += '\n';
  
  report += `## By Funding Stage\n`;
  for (const [stage, count] of Object.entries(summary.byFundingStage)) {
    report += `- ${stage}: ${count}\n`;
  }
  
  return report;
}

