#!/usr/bin/env npx tsx

/**
 * Build Evaluation Pack Script
 * 
 * Orchestrates ground truth fetching from multiple APIs and builds the
 * 100-scenario evaluation pack with deterministic ground truth values.
 * 
 * Usage:
 *   npx tsx scripts/build-eval-pack.ts --output docs/architecture/benchmarks/persona-episode-eval-pack-v2.json
 *   npx tsx scripts/build-eval-pack.ts --domains sec nvd pubmed github --output eval-pack.json
 */

import dotenv from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config();

// ============================================================================
// Types
// ============================================================================

interface GroundTruthSource {
  source: "static" | "sec_api" | "nvd_api" | "pubmed_api" | "github_api";
  lookupId: string;
  extractionField: string;
  expectedValue?: string;
  sourceUrl?: string;
}

interface EvaluationScenario {
  id: string;
  name: string;
  persona: string;
  input: string;
  groundTruth: GroundTruthSource;
  checks?: {
    minToolCalls?: number;
    requireTools?: string[];
    verificationStep?: boolean;
    maxToolCalls?: number;
    maxCostUsd?: number;
    maxClarifyingQuestions?: number;
  };
  domain: "financial" | "security" | "academic" | "market";
}

interface EvaluationPack {
  generatedAt: string;
  totalScenarios: number;
  domains: Record<string, number>;
  scenarios: EvaluationScenario[];
  groundTruthData?: Record<string, unknown>;
}

// ============================================================================
// Scenario Definitions (100 scenarios)
// ============================================================================

function generateFinancialScenarios(): EvaluationScenario[] {
  const scenarios: EvaluationScenario[] = [
    // Financial - Revenue Extraction (10 scenarios)
    {
      id: "fin_revenue_tesla_2024",
      name: "Financial: Tesla 2024 Revenue",
      persona: "JPM_STARTUP_BANKER",
      input: "Extract the total revenue from Tesla's 2024 10-K filing. What was the revenue amount and what was the year-over-year growth rate?",
      groundTruth: { source: "sec_api", lookupId: "0001318605", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_apple_2024",
      name: "Financial: Apple 2024 Revenue",
      persona: "ENTERPRISE_EXEC",
      input: "What was Apple's total revenue for fiscal year 2024 according to their 10-K filing?",
      groundTruth: { source: "sec_api", lookupId: "0000320193", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_microsoft_2024",
      name: "Financial: Microsoft 2024 Revenue",
      persona: "JPM_STARTUP_BANKER",
      input: "Extract Microsoft's FY2024 revenue from their 10-K. What were the key revenue drivers mentioned?",
      groundTruth: { source: "sec_api", lookupId: "0000066740", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_google_2024",
      name: "Financial: Alphabet 2024 Revenue",
      persona: "EARLY_STAGE_VC",
      input: "What was Alphabet's total revenue for 2024? Break down by Google Services and Google Cloud.",
      groundTruth: { source: "sec_api", lookupId: "0001652044", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_nvidia_2024",
      name: "Financial: NVIDIA 2024 Revenue",
      persona: "FOUNDER_STRATEGY",
      input: "Extract NVIDIA's FY2024 revenue. What was the Data Center revenue as a percentage of total?",
      groundTruth: { source: "sec_api", lookupId: "0001046173", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_amazon_2024",
      name: "Financial: Amazon 2024 Revenue",
      persona: "PRODUCT_MANAGER",
      input: "What was Amazon's total revenue in 2024? How much came from AWS versus retail?",
      groundTruth: { source: "sec_api", lookupId: "0001018294", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_meta_2024",
      name: "Financial: Meta 2024 Revenue",
      persona: "ENTERPRISE_EXEC",
      input: "Extract Meta's 2024 revenue. What was the advertising revenue portion?",
      groundTruth: { source: "sec_api", lookupId: "0001326801", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_amd_2024",
      name: "Financial: AMD 2024 Revenue",
      persona: "QUANT_ANALYST",
      input: "What was AMD's total revenue for 2024? What segment (Client, Data Center, Gaming) grew fastest?",
      groundTruth: { source: "sec_api", lookupId: "0000002488", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_intel_2024",
      name: "Financial: Intel 2024 Revenue",
      persona: "CTO_TECH_LEAD",
      input: "Extract Intel's 2024 revenue. What was the Client Computing revenue versus Data Center?",
      groundTruth: { source: "sec_api", lookupId: "0000050643", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_revenue_qualcomm_2024",
      name: "Financial: Qualcomm 2024 Revenue",
      persona: "JPM_STARTUP_BANKER",
      input: "What was Qualcomm's 2024 revenue? Break down by handsets versus IoT versus RF.",
      groundTruth: { source: "sec_api", lookupId: "0000804284", extractionField: "revenue" },
      domain: "financial",
    },
    // Financial - Risk Factors (10 scenarios)
    {
      id: "fin_risk_google_2024",
      name: "Financial: Google 2024 Risk Factors",
      persona: "ENTERPRISE_EXEC",
      input: "What are the top 3 risk factors disclosed in Alphabet's 2024 10-K filing?",
      groundTruth: { source: "sec_api", lookupId: "0001652044", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_nvidia_2024",
      name: "Financial: NVIDIA 2024 Risk Factors",
      persona: "CTO_TECH_LEAD",
      input: "Extract the key risk factors from NVIDIA's 2024 10-K related to semiconductor supply chain.",
      groundTruth: { source: "sec_api", lookupId: "0001046173", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_apple_2024",
      name: "Financial: Apple 2024 Risk Factors",
      persona: "ENTERPRISE_EXEC",
      input: "What are the main risk factors in Apple's 2024 10-K regarding supply chain and China?",
      groundTruth: { source: "sec_api", lookupId: "0000320193", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_microsoft_2024",
      name: "Financial: Microsoft 2024 Risk Factors",
      persona: "SECURITY_ENGINEER",
      input: "What cybersecurity risks are disclosed in Microsoft's 2024 10-K?",
      groundTruth: { source: "sec_api", lookupId: "0000066740", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_tesla_2024",
      name: "Financial: Tesla 2024 Risk Factors",
      persona: "EARLY_STAGE_VC",
      input: "What are the key risks related to Elon Musk's involvement disclosed in Tesla's 2024 10-K?",
      groundTruth: { source: "sec_api", lookupId: "0001318605", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_amazon_2024",
      name: "Financial: Amazon 2024 Risk Factors",
      persona: "ECOSYSTEM_PARTNER",
      input: "What regulatory risks are disclosed in Amazon's 2024 10-K?",
      groundTruth: { source: "sec_api", lookupId: "0001018294", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_meta_2024",
      name: "Financial: Meta 2024 Risk Factors",
      persona: "FOUNDER_STRATEGY",
      input: "What content moderation and privacy risks are disclosed in Meta's 2024 10-K?",
      groundTruth: { source: "sec_api", lookupId: "0001326801", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_amd_2024",
      name: "Financial: AMD 2024 Risk Factors",
      persona: "PRODUCT_MANAGER",
      input: "What competitive risks are disclosed in AMD's 2024 10-K?",
      groundTruth: { source: "sec_api", lookupId: "0000002488", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_intel_2024",
      name: "Financial: Intel 2024 Risk Factors",
      persona: "QUANT_ANALYST",
      input: "What manufacturing and execution risks are disclosed in Intel's 2024 10-K?",
      groundTruth: { source: "sec_api", lookupId: "0000050643", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    {
      id: "fin_risk_qualcomm_2024",
      name: "Financial: Qualcomm 2024 Risk Factors",
      persona: "SALES_ENGINEER",
      input: "What patent and licensing risks are disclosed in Qualcomm's 2024 10-K?",
      groundTruth: { source: "sec_api", lookupId: "0000804284", extractionField: "item1a.riskFactors" },
      domain: "financial",
    },
    // Financial - Business Description (5 scenarios)
    {
      id: "fin_business_amd_2024",
      name: "Financial: AMD Business Description",
      persona: "PRODUCT_DESIGNER",
      input: "Summarize AMD's business description from their 2024 10-K. What are their main product categories?",
      groundTruth: { source: "sec_api", lookupId: "0000002488", extractionField: "item1.business" },
      domain: "financial",
    },
    {
      id: "fin_business_nvidia_2024",
      name: "Financial: NVIDIA Business Description",
      persona: "FOUNDER_STRATEGY",
      input: "Describe NVIDIA's business segments from their 2024 10-K.",
      groundTruth: { source: "sec_api", lookupId: "0001046173", extractionField: "item1.business" },
      domain: "financial",
    },
    {
      id: "fin_business_cloud_2024",
      name: "Financial: Cloud Business Models",
      persona: "EARLY_STAGE_VC",
      input: "Compare the cloud business models of AWS, Azure, and Google Cloud based on 10-K descriptions.",
      groundTruth: { source: "sec_api", lookupId: "cloud_providers", extractionField: "item1.business" },
      domain: "financial",
    },
    {
      id: "fin_business_semiconductor_2024",
      name: "Financial: Semiconductor Business Models",
      persona: "CTO_TECH_LEAD",
      input: "Compare the fabless vs foundry business models of NVIDIA, AMD, and Intel.",
      groundTruth: { source: "sec_api", lookupId: "semiconductor_comparison", extractionField: "item1.business" },
      domain: "financial",
    },
    {
      id: "fin_business_social_2024",
      name: "Financial: Social Media Business Models",
      persona: "PRODUCT_MANAGER",
      input: "Describe the advertising business models of Meta, Snap, and Pinterest.",
      groundTruth: { source: "sec_api", lookupId: "social_media", extractionField: "item1.business" },
      domain: "financial",
    },
    // Financial - Market Comparison (5 scenarios)
    {
      id: "fin_compare_cloud_2024",
      name: "Financial: Cloud Market Comparison",
      persona: "EARLY_STAGE_VC",
      input: "Compare the cloud revenue of AWS, Azure, and Google Cloud based on 2024 10-K filings.",
      groundTruth: { source: "sec_api", lookupId: "AMZN_MSFT_GOOGL", extractionField: "cloudRevenue" },
      domain: "financial",
    },
    {
      id: "fin_compare_ai_chips_2024",
      name: "Financial: AI Chip Market",
      persona: "QUANT_ANALYST",
      input: "Compare the AI chip strategies and revenues of NVIDIA, AMD, and Intel.",
      groundTruth: { source: "sec_api", lookupId: "ai_chips", extractionField: "revenue" },
      domain: "financial",
    },
    {
      id: "fin_compare_social_2024",
      name: "Financial: Social Media Comparison",
      persona: "FOUNDER_STRATEGY",
      input: "Compare the user metrics and revenue per user of Meta, Snap, and Pinterest.",
      groundTruth: { source: "sec_api", lookupId: "social_comparison", extractionField: "metrics" },
      domain: "financial",
    },
    {
      id: "fin_compare_cloud_growth_2024",
      name: "Financial: Cloud Growth Rates",
      persona: "JPM_STARTUP_BANKER",
      input: "Which cloud provider had the highest YoY growth rate in 2024?",
      groundTruth: { source: "sec_api", lookupId: "cloud_growth", extractionField: "growthRate" },
      domain: "financial",
    },
    {
      id: "fin_compare_semiconductor_2024",
      name: "Financial: Semiconductor Market Share",
      persona: "ECOSYSTEM_PARTNER",
      input: "Compare the market share and margins of major semiconductor companies.",
      groundTruth: { source: "sec_api", lookupId: "semiconductor_share", extractionField: "marketShare" },
      domain: "financial",
    },
  ];
  
  return scenarios;
}

function generateSecurityScenarios(): EvaluationScenario[] {
  const scenarios: EvaluationScenario[] = [
    // Security - CVE Scoring (10 scenarios)
    {
      id: "sec_cve_2024_21887",
      name: "Security: CVE-2024-21887 Scoring",
      persona: "SECURITY_ENGINEER",
      input: "What is the CVSS v3.1 score for CVE-2024-21887 (Ivanti Connect Secure)? What is the attack vector?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-21887", extractionField: "cvssData.baseScore" },
      domain: "security",
    },
    {
      id: "sec_cve_2024_23897",
      name: "Security: CVE-2024-23897 Scoring",
      persona: "CTO_TECH_LEAD",
      input: "Extract the CVSS score and vector string for CVE-2024-23897 (Jenkins). What is the severity?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-23897", extractionField: "cvssData" },
      domain: "security",
    },
    {
      id: "sec_cve_2023_44487",
      name: "Security: HTTP/2 Rapid Reset",
      persona: "SECURITY_ENGINEER",
      input: "What is the CVSS score for CVE-2023-44487 (HTTP/2 Rapid Reset)? What attack vector does it use?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2023-44487", extractionField: "cvssData" },
      domain: "security",
    },
    {
      id: "sec_cve_2023_36025",
      name: "Security: Windows SmartScreen CVE",
      persona: "ENTERPRISE_EXEC",
      input: "What is the CVSS v3.1 score for CVE-2023-36025? What is the attack complexity?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2023-36025", extractionField: "cvssData" },
      domain: "security",
    },
    {
      id: "sec_cve_2023_27997",
      name: "Security: FortiOS CVE",
      persona: "CTO_TECH_LEAD",
      input: "Extract the CVSS score for CVE-2023-27997. What is the confidentiality impact?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2023-27997", extractionField: "cvssData" },
      domain: "security",
    },
    {
      id: "sec_cve_2024_12345",
      name: "Security: Critical Vulnerability Scoring",
      persona: "SECURITY_ENGINEER",
      input: "What is the CVSS score and severity rating for CVE-2024-12345? Is it critical?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-12345", extractionField: "cvssData.baseScore" },
      domain: "security",
    },
    {
      id: "sec_cve_2024_54321",
      name: "Security: SQL Injection CVE",
      persona: "SECURITY_ENGINEER",
      input: "Extract the CVSS details for CVE-2024-54321. What is the attack vector and privileges required?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-54321", extractionField: "cvssData" },
      domain: "security",
    },
    {
      id: "sec_cve_2024_11111",
      name: "Security: RCE Vulnerability",
      persona: "CTO_TECH_LEAD",
      input: "What is the CVSS score for CVE-2024-11111 (RCE)? What is the scope change?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-11111", extractionField: "cvssData" },
      domain: "security",
    },
    {
      id: "sec_cve_2024_22222",
      name: "Security: Authentication Bypass",
      persona: "ENTERPRISE_EXEC",
      input: "Extract the CVSS vector and severity for CVE-2024-22222. How critical is this?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-22222", extractionField: "cvssData" },
      domain: "security",
    },
    {
      id: "sec_cve_2024_33333",
      name: "Security: Path Traversal CVE",
      persona: "SECURITY_ENGINEER",
      input: "What is the CVSS score for CVE-2024-33333? What is the availability impact?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-33333", extractionField: "cvssData" },
      domain: "security",
    },
    // Security - Remediation (10 scenarios)
    {
      id: "sec_remediate_cve_2024_21887",
      name: "Security: CVE-2024-21887 Remediation",
      persona: "CTO_TECH_LEAD",
      input: "What remediation steps are recommended for CVE-2024-21887? Is there a patch available?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-21887", extractionField: "references" },
      domain: "security",
    },
    {
      id: "sec_remediate_cve_2023_36025",
      name: "Security: CVE-2023-36025 Remediation",
      persona: "SECURITY_ENGINEER",
      input: "What are the remediation steps for CVE-2023-36025 (Windows SmartScreen)?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2023-36025", extractionField: "remediation" },
      domain: "security",
    },
    {
      id: "sec_remediate_cve_2024_23897",
      name: "Security: Jenkins CVE Remediation",
      persona: "CTO_TECH_LEAD",
      input: "What are the mitigation steps for CVE-2024-23897? How do you verify the fix?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-23897", extractionField: "references" },
      domain: "security",
    },
    {
      id: "sec_remediate_http2",
      name: "Security: HTTP/2 Rapid Reset Mitigation",
      persona: "SECURITY_ENGINEER",
      input: "What mitigation strategies are recommended for CVE-2023-44487?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2023-44487", extractionField: "remediation" },
      domain: "security",
    },
    {
      id: "sec_remediate_fortios",
      name: "Security: FortiOS Patching",
      persona: "ENTERPRISE_EXEC",
      input: "What is the remediation timeline for CVE-2023-27997? What versions are affected?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2023-27997", extractionField: "references" },
      domain: "security",
    },
    {
      id: "sec_remediate_critical",
      name: "Security: Critical RCE Remediation",
      persona: "CTO_TECH_LEAD",
      input: "Develop a remediation plan for a critical RCE vulnerability. What are the immediate steps?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-12345", extractionField: "remediation" },
      domain: "security",
    },
    {
      id: "sec_remediate_sql_injection",
      name: "Security: SQL Injection Response",
      persona: "SECURITY_ENGINEER",
      input: "What is the emergency response procedure for CVE-2024-54321?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-54321", extractionField: "remediation" },
      domain: "security",
    },
    {
      id: "sec_remediate_auth_bypass",
      name: "Security: Auth Bypass Remediation",
      persona: "ENTERPRISE_EXEC",
      input: "What are the remediation steps for an authentication bypass vulnerability?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-22222", extractionField: "remediation" },
      domain: "security",
    },
    {
      id: "sec_remediate_path_traversal",
      name: "Security: Path Traversal Mitigation",
      persona: "SECURITY_ENGINEER",
      input: "What are the short-term mitigations for CVE-2024-33333 while patching?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-33333", extractionField: "remediation" },
      domain: "security",
    },
    {
      id: "sec_remediate_supply_chain",
      name: "Security: Supply Chain Response",
      persona: "CTO_TECH_LEAD",
      input: "What is the incident response process for a supply chain vulnerability?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-11111", extractionField: "remediation" },
      domain: "security",
    },
    // Security - Impact Analysis (5 scenarios)
    {
      id: "sec_impact_2023_27997",
      name: "Security: FortiOS Impact Analysis",
      persona: "ENTERPRISE_EXEC",
      input: "Analyze the business impact of CVE-2023-27997 (FortiOS). What systems are affected?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2023-27997", extractionField: "description" },
      domain: "security",
    },
    {
      id: "sec_impact_ransomware",
      name: "Security: Ransomware Impact Assessment",
      persona: "ENTERPRISE_EXEC",
      input: "What is the business continuity impact of a ransomware attack on critical systems?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-12345", extractionField: "impact" },
      domain: "security",
    },
    {
      id: "sec_impact_data_breach",
      name: "Security: Data Breach Analysis",
      persona: "QUANT_ANALYST",
      input: "What is the estimated cost and regulatory impact of a data breach vulnerability?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-22222", extractionField: "impact" },
      domain: "security",
    },
    {
      id: "sec_impact_cloud",
      name: "Security: Cloud Vulnerability Impact",
      persona: "FOUNDER_STRATEGY",
      input: "What is the business impact of a cloud infrastructure vulnerability?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-33333", extractionField: "impact" },
      domain: "security",
    },
    {
      id: "sec_impact_3rd_party",
      name: "Security: Third-Party Risk",
      persona: "ECOSYSTEM_PARTNER",
      input: "How does a third-party software vulnerability impact your organization?",
      groundTruth: { source: "nvd_api", lookupId: "CVE-2024-11111", extractionField: "impact" },
      domain: "security",
    },
  ];
  
  return scenarios;
}

function generateAcademicScenarios(): EvaluationScenario[] {
  const scenarios: EvaluationScenario[] = [
    // Academic - Paper Summarization (15 scenarios)
    {
      id: "acad_crispr_2024",
      name: "Academic: CRISPR Paper Summary",
      persona: "ACADEMIC_RD",
      input: "Summarize the key findings of the most recent CRISPR gene editing paper from 2024.",
      groundTruth: { source: "pubmed_api", lookupId: "CRISPR gene editing 2024", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_mrna_2024",
      name: "Academic: mRNA Vaccine Paper",
      persona: "ACADEMIC_RD",
      input: "What are the key findings in the most recent mRNA vaccine technology paper from 2024?",
      groundTruth: { source: "pubmed_api", lookupId: "mRNA vaccine technology", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_cart_2024",
      name: "Academic: CAR-T Therapy Paper",
      persona: "RESEARCHER",
      input: "Summarize the clinical trial results from the most recent CAR-T cell therapy paper.",
      groundTruth: { source: "pubmed_api", lookupId: "CAR-T cell therapy", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_alzheimer_2024",
      name: "Academic: Alzheimer's Mechanism",
      persona: "ACADEMIC_RD",
      input: "What are the key mechanisms described in recent Alzheimer's disease research papers?",
      groundTruth: { source: "pubmed_api", lookupId: "Alzheimer's disease mechanism", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_immunotherapy_2024",
      name: "Academic: Cancer Immunotherapy",
      persona: "RESEARCHER",
      input: "Summarize the checkpoint inhibitor findings from recent cancer immunotherapy research.",
      groundTruth: { source: "pubmed_api", lookupId: "cancer immunotherapy checkpoint", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_pdl1_2024",
      name: "Academic: PD-L1 Research",
      persona: "ACADEMIC_RD",
      input: "What are the latest findings on PD-L1 expression and cancer treatment response?",
      groundTruth: { source: "pubmed_api", lookupId: "PD-L1 cancer immunotherapy", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_gene_therapy_2024",
      name: "Academic: Gene Therapy Advances",
      persona: "RESEARCHER",
      input: "Summarize the recent advances in adeno-associated virus (AAV) gene therapy.",
      groundTruth: { source: "pubmed_api", lookupId: "AAV gene therapy", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_neuro_2024",
      name: "Academic: Neurodegeneration Research",
      persona: "ACADEMIC_RD",
      input: "What are the key findings in recent neurogenesis and neurodegeneration research?",
      groundTruth: { source: "pubmed_api", lookupId: "neurodegeneration neurogenesis", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_stem_cell_2024",
      name: "Academic: Stem Cell Therapy",
      persona: "RESEARCHER",
      input: "What are the latest clinical trial results for mesenchymal stem cell therapy?",
      groundTruth: { source: "pubmed_api", lookupId: "mesenchymal stem cell therapy", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_microbiome_2024",
      name: "Academic: Microbiome Research",
      persona: "ACADEMIC_RD",
      input: "Summarize the recent findings on gut microbiome and immune response.",
      groundTruth: { source: "pubmed_api", lookupId: "gut microbiome immune response", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_protein_2024",
      name: "Academic: Protein Folding",
      persona: "RESEARCHER",
      input: "What are the latest advances in protein structure prediction using AI?",
      groundTruth: { source: "pubmed_api", lookupId: "protein structure prediction AI", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_covid_2024",
      name: "Academic: Long COVID Research",
      persona: "ACADEMIC_RD",
      input: "What are the key findings in recent long COVID pathophysiology research?",
      groundTruth: { source: "pubmed_api", lookupId: "long COVID pathophysiology", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_aging_2024",
      name: "Academic: Senolytics Research",
      persona: "RESEARCHER",
      input: "Summarize the recent clinical results for senolytic therapies in aging.",
      groundTruth: { source: "pubmed_api", lookupId: "senolytic therapy aging", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_cardiomyopathy_2024",
      name: "Academic: Cardiomyopathy Treatment",
      persona: "ACADEMIC_RD",
      input: "What are the latest findings in heart failure with preserved ejection fraction?",
      groundTruth: { source: "pubmed_api", lookupId: "heart failure preserved ejection fraction", extractionField: "abstract" },
      domain: "academic",
    },
    {
      id: "acad_antibiotic_2024",
      name: "Academic: Antibiotic Resistance",
      persona: "RESEARCHER",
      input: "What are the new mechanisms of antibiotic resistance discovered in 2024?",
      groundTruth: { source: "pubmed_api", lookupId: "antibiotic resistance mechanisms", extractionField: "abstract" },
      domain: "academic",
    },
    // Academic - Methodology Validation (10 scenarios)
    {
      id: "acad_method_crispr",
      name: "Academic: CRISPR Methodology",
      persona: "ACADEMIC_RD",
      input: "What experimental methods were used in the CRISPR paper? Are the controls appropriate?",
      groundTruth: { source: "pubmed_api", lookupId: "CRISPR gene editing 2024", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_clinical",
      name: "Academic: Clinical Trial Design",
      persona: "RESEARCHER",
      input: "Evaluate the clinical trial design and statistical methods in the immunotherapy paper.",
      groundTruth: { source: "pubmed_api", lookupId: "cancer immunotherapy checkpoint", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_animal",
      name: "Academic: Animal Model Validation",
      persona: "ACADEMIC_RD",
      input: "What animal models were used in the Alzheimer's study? Are they appropriate?",
      groundTruth: { source: "pubmed_api", lookupId: "Alzheimer's disease mechanism", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_biomarker",
      name: "Academic: Biomarker Discovery",
      persona: "RESEARCHER",
      input: "What validation methods were used for the proposed biomarkers?",
      groundTruth: { source: "pubmed_api", lookupId: "PD-L1 cancer immunotherapy", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_genomics",
      name: "Academic: Genomic Analysis",
      persona: "ACADEMIC_RD",
      input: "What bioinformatics methods were used for the genomics analysis?",
      groundTruth: { source: "pubmed_api", lookupId: "CRISPR gene editing 2024", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_imaging",
      name: "Academic: Medical Imaging Analysis",
      persona: "RESEARCHER",
      input: "What imaging analysis methods were validated in the clinical study?",
      groundTruth: { source: "pubmed_api", lookupId: "CAR-T cell therapy", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_metaanalysis",
      name: "Academic: Meta-Analysis Quality",
      persona: "ACADEMIC_RD",
      input: "Evaluate the quality and bias assessment in the systematic review.",
      groundTruth: { source: "pubmed_api", lookupId: "mRNA vaccine technology", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_rna_seq",
      name: "Academic: RNA-Seq Validation",
      persona: "RESEARCHER",
      input: "What validation was done for the RNA-seq differential expression results?",
      groundTruth: { source: "pubmed_api", lookupId: "gene expression RNA-seq", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_flow_cytometry",
      name: "Academic: Flow Cytometry Standards",
      persona: "ACADEMIC_RD",
      input: "What flow cytometry controls and standards were used in the immunology study?",
      groundTruth: { source: "pubmed_api", lookupId: "immune response flow cytometry", extractionField: "methods" },
      domain: "academic",
    },
    {
      id: "acad_method_replication",
      name: "Academic: Replication Study",
      persona: "RESEARCHER",
      input: "Does the paper include replication studies? What is the reproducibility assessment?",
      groundTruth: { source: "pubmed_api", lookupId: "CRISPR gene editing 2024", extractionField: "replication" },
      domain: "academic",
    },
  ];
  
  return scenarios;
}

function generateMarketScenarios(): EvaluationScenario[] {
  const scenarios: EvaluationScenario[] = [
    // Market - Trending Repos (10 scenarios)
    {
      id: "mkt_trending_ai_javascript",
      name: "Market: Trending AI JavaScript Repos",
      persona: "FOUNDER_STRATEGY",
      input: "What are the top 5 trending JavaScript AI/ML repositories created this month?",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-01 language:javascript topic:AI", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_python_ai",
      name: "Market: Trending Python AI Repos",
      persona: "PRODUCT_MANAGER",
      input: "List the top 5 trending Python repositories for AI/ML created in the last 30 days.",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-01 language:python topic:machine-learning", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_rust_systems",
      name: "Market: Trending Rust Systems Repos",
      persona: "CTO_TECH_LEAD",
      input: "What are the top trending Rust systems programming repositories from this week?",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-20 language:rust topic:systems", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_go_cloud",
      name: "Market: Trending Go Cloud Repos",
      persona: "SECURITY_ENGINEER",
      input: "List the top 5 trending Go repositories for cloud infrastructure from this month.",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-01 language:go topic:cloud", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_typescript_frontend",
      name: "Market: Trending TypeScript Frontend",
      persona: "PRODUCT_DESIGNER",
      input: "What are the top trending TypeScript frontend frameworks/libraries from this week?",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-20 language:typescript topic:frontend", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_deno_bun",
      name: "Market: Trending Runtime Repos",
      persona: "CTO_TECH_LEAD",
      input: "What are the top trending JavaScript runtime/compiler repositories this month?",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-01 runtime OR compiler", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_database",
      name: "Market: Trending Database Repos",
      persona: "FOUNDER_STRATEGY",
      input: "List the top 5 trending database projects created in the last 30 days.",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-01 database", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_devops",
      name: "Market: Trending DevOps Tools",
      persona: "SECURITY_ENGINEER",
      input: "What are the top trending DevOps/CI-CD repositories from this week?",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-20 devops OR cicd", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_blockchain",
      name: "Market: Trending Blockchain Repos",
      persona: "QUANT_ANALYST",
      input: "What are the top trending blockchain/crypto repositories created this month?",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-01 blockchain OR cryptocurrency", extractionField: "repos" },
      domain: "market",
    },
    {
      id: "mkt_trending_mobile",
      name: "Market: Trending Mobile Dev Repos",
      persona: "PRODUCT_MANAGER",
      input: "List the top 5 trending mobile development repositories (iOS/Android) this week.",
      groundTruth: { source: "github_api", lookupId: "created:>2025-12-20 mobile OR ios OR android", extractionField: "repos" },
      domain: "market",
    },
    // Market - Competitive Analysis (10 scenarios)
    {
      id: "mkt_compare_react_vue",
      name: "Market: React vs Vue Comparison",
      persona: "PRODUCT_MANAGER",
      input: "Compare the star counts and recent activity of top React and Vue ecosystem repositories.",
      groundTruth: { source: "github_api", lookupId: "topic:react topic:vue", extractionField: "stars" },
      domain: "market",
    },
    {
      id: "mkt_compare_tensorflow_pytorch",
      name: "Market: TensorFlow vs PyTorch",
      persona: "FOUNDER_STRATEGY",
      input: "Analyze the ecosystem size and community activity of TensorFlow vs PyTorch repositories.",
      groundTruth: { source: "github_api", lookupId: "topic tensorflow topic:pytorch", extractionField: "metrics" },
      domain: "market",
    },
    {
      id: "mkt_compare_angular_vue",
      name: "Market: Angular vs Vue Comparison",
      persona: "PRODUCT_DESIGNER",
      input: "Compare the community activity and recent commits of Angular and Vue repositories.",
      groundTruth: { source: "github_api", lookupId: "topic:angular topic:vue", extractionField: "activity" },
      domain: "market",
    },
    {
      id: "mkt_compare_nextjs_nuxt",
      name: "Market: Next.js vs Nuxt Comparison",
      persona: "CTO_TECH_LEAD",
      input: "Analyze the star growth and issue response time of Next.js vs Nuxt.",
      groundTruth: { source: "github_api", lookupId: "topic:nextjs topic:nuxt", extractionField: "metrics" },
      domain: "market",
    },
    {
      id: "mkt_compare_docker_podman",
      name: "Market: Docker vs Podman Comparison",
      persona: "SECURITY_ENGINEER",
      input: "Compare the security features and community adoption of Docker vs Podman.",
      groundTruth: { source: "github_api", lookupId: "docker podman", extractionField: "adoption" },
      domain: "market",
    },
    {
      id: "mkt_compare_kubernetes_docker_swarm",
      name: "Market: Container Orchestration Comparison",
      persona: "ENTERPRISE_EXEC",
      input: "Compare the adoption trends of Kubernetes, Docker Swarm, and Nomad.",
      groundTruth: { source: "github_api", lookupId: "kubernetes docker-swarm nomad", extractionField: "trends" },
      domain: "market",
    },
    {
      id: "mkt_compare_postgresql_mysql",
      name: "Market: PostgreSQL vs MySQL Comparison",
      persona: "QUANT_ANALYST",
      input: "Analyze the performance benchmarks and feature sets of PostgreSQL vs MySQL ecosystems.",
      groundTruth: { source: "github_api", lookupId: "postgresql mysql", extractionField: "features" },
      domain: "market",
    },
    {
      id: "mkt_compare_mongodb_postgresql",
      name: "Market: MongoDB vs PostgreSQL Comparison",
      persona: "FOUNDER_STRATEGY",
      input: "Compare the developer adoption and enterprise features of MongoDB vs PostgreSQL.",
      groundTruth: { source: "github_api", lookupId: "mongodb postgresql", extractionField: "adoption" },
      domain: "market",
    },
    {
      id: "mkt_compare_graphql_rest",
      name: "Market: GraphQL vs REST API Frameworks",
      persona: "PRODUCT_MANAGER",
      input: "Compare the ecosystem size of popular GraphQL vs REST API frameworks.",
      groundTruth: { source: "github_api", lookupId: "graphql rest api", extractionField: "ecosystem" },
      domain: "market",
    },
    {
      id: "mkt_compare_electron_tauri",
      name: "Market: Electron vs Tauri Comparison",
      persona: "PRODUCT_DESIGNER",
      input: "Compare the performance, bundle size, and community activity of Electron vs Tauri.",
      groundTruth: { source: "github_api", lookupId: "electron tauri", extractionField: "metrics" },
      domain: "market",
    },
  ];
  
  return scenarios;
}

// ============================================================================
// Main Build Logic
// ============================================================================

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

async function main() {
  const outputPath = getArg("--output") || "docs/architecture/benchmarks/persona-episode-eval-pack-v2.json";
  const domainsFromArgs = getMultiArg("--domains");
  
  // Determine which domains to include
  const includeAll = domainsFromArgs.length === 0;
  const includeSec = includeAll || domainsFromArgs.includes("sec");
  const includeNvd = includeAll || domainsFromArgs.includes("nvd");
  const includePubmed = includeAll || domainsFromArgs.includes("pubmed");
  const includeGithub = includeAll || domainsFromArgs.includes("github");
  
  console.log("Building NodeBench 100-Scenario Evaluation Pack...");
  console.log(`Domains: ${includeAll ? "all" : domainsFromArgs.join(", ")}`);
  
  const allScenarios: EvaluationScenario[] = [];
  const domains: Record<string, number> = {};
  
  if (includeSec) {
    console.log("Generating Financial scenarios (SEC EDGAR)...");
    const financialScenarios = generateFinancialScenarios();
    allScenarios.push(...financialScenarios);
    domains.financial = financialScenarios.length;
  }
  
  if (includeNvd) {
    console.log("Generating Security scenarios (NVD CVE)...");
    const securityScenarios = generateSecurityScenarios();
    allScenarios.push(...securityScenarios);
    domains.security = securityScenarios.length;
  }
  
  if (includePubmed) {
    console.log("Generating Academic scenarios (PubMed)...");
    const academicScenarios = generateAcademicScenarios();
    allScenarios.push(...academicScenarios);
    domains.academic = academicScenarios.length;
  }
  
  if (includeGithub) {
    console.log("Generating Market scenarios (GitHub)...");
    const marketScenarios = generateMarketScenarios();
    allScenarios.push(...marketScenarios);
    domains.market = marketScenarios.length;
  }
  
  const pack: EvaluationPack = {
    generatedAt: new Date().toISOString(),
    totalScenarios: allScenarios.length,
    domains,
    scenarios: allScenarios,
  };
  
  // Ensure output directory exists
  const outDir = join(process.cwd(), "docs", "architecture", "benchmarks");
  mkdirSync(outDir, { recursive: true });
  
  writeFileSync(outputPath, JSON.stringify(pack, null, 2));
  console.log(`\nWrote ${allScenarios.length} scenarios to ${outputPath}`);
  console.log(`\nDomain breakdown:`);
  for (const [domain, count] of Object.entries(domains)) {
    console.log(`  ${domain}: ${count} scenarios`);
  }
  console.log(`\nTotal: ${allScenarios.length} scenarios`);
}

main().catch(console.error);
