/**
 * Self-Evaluating Entity Research with Automatic Retry
 * Agent evaluates data completeness and pursues additional research if needed
 */

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

interface DataCompletenessScore {
  totalFields: number;
  populatedFields: number;
  emptyFields: number;
  completenessPercentage: number;
  criticalFieldsMissing: string[];
  isPassing: boolean; // Pass if >= 60% complete AND all critical fields present
}

interface ResearchAttempt {
  attemptNumber: number;
  duration: number;
  completenessScore: DataCompletenessScore;
  data: any;
  needsRetry: boolean;
  retryReason?: string;
}

interface SelfEvaluatingResult {
  companyName: string;
  finalSuccess: boolean;
  attempts: ResearchAttempt[];
  finalCompletenessScore: DataCompletenessScore;
  totalDuration: number;
  improvementAchieved: boolean;
}

/**
 * Evaluate data completeness and determine if retry is needed
 */
function evaluateDataCompleteness(data: any, companyName: string): DataCompletenessScore {
  // Define critical fields that MUST be present
  const criticalFields = [
    'description',
    'headline',
    'hqLocation',
    'website',
    'companyType',
    'businessModel',
    'targetMarket',
  ];

  // Define all expected fields
  const allFields = [
    'description', 'headline', 'hqLocation', 'city', 'state', 'country',
    'website', 'companyType', 'targetMarket', 'businessModel',
    'totalFunding', 'lastFundingDate', 'investors',
    'competitors', 'competitorAnalysis',
  ];

  let populatedCount = 0;
  let emptyCount = 0;
  const missingCritical: string[] = [];

  for (const field of allFields) {
    const value = data[field];
    const isPopulated = value && value !== '' && value !== 'N/A' && value !== 'Not specified';
    
    if (isPopulated) {
      populatedCount++;
    } else {
      emptyCount++;
      if (criticalFields.includes(field)) {
        missingCritical.push(field);
      }
    }
  }

  const completenessPercentage = Math.round((populatedCount / allFields.length) * 100);
  
  // Pass criteria: >= 60% complete AND all critical fields present
  const isPassing = completenessPercentage >= 60 && missingCritical.length === 0;

  return {
    totalFields: allFields.length,
    populatedFields: populatedCount,
    emptyFields: emptyCount,
    completenessPercentage,
    criticalFieldsMissing: missingCritical,
    isPassing,
  };
}

/**
 * Parse location string into components
 */
function parseLocation(location: string) {
  if (!location) return { city: "", state: "", country: "" };
  
  const primaryLocation = location.split(" and ")[0];
  const parts = primaryLocation.split(",").map(p => p.trim());
  
  if (parts.length >= 3) {
    return { city: parts[0], state: parts[1], country: parts[2] };
  } else if (parts.length === 2) {
    return { city: parts[0], state: "", country: parts[1] };
  } else {
    return { city: parts[0] || "", state: "", country: "" };
  }
}

/**
 * Research company with detailed extraction
 */
async function researchCompanyDetailed(companyName: string, attemptNumber: number) {
  const { linkupCompanyProfile } = await import("../agents/services/linkup");

  // For retry attempts, use more specific queries
  const query = attemptNumber === 1
    ? companyName
    : `${companyName} company profile funding investors competitors`;

  const rawData = await linkupCompanyProfile(query);
  const raw = rawData as any;
  const loc = parseLocation(raw.location || "");
  
  return {
    companyName: raw.companyName || companyName,
    description: raw.summary || "",
    headline: raw.headline || "",
    hqLocation: raw.location || "",
    city: loc.city,
    state: loc.state,
    country: loc.country,
    website: raw.website || "",
    companyType: raw.companyType || "",
    targetMarket: (raw.businessModel as any)?.targetAudience || "",
    businessModel: raw.businessModel
      ? `Monetization: ${(raw.businessModel as any).monetizationStrategy || 'N/A'}; GTM: ${(raw.businessModel as any).goToMarketStrategy || 'N/A'}`
      : "",
    totalFunding: (raw.financials as any)?.fundingRounds
      ?.reduce((sum: number, round: any) => {
        const amount = parseFloat(round.amount?.replace(/[^0-9.]/g, '') || '0');
        return sum + amount;
      }, 0)
      .toString() || "",
    lastFundingDate: (raw.financials as any)?.fundingRounds?.[(raw.financials as any).fundingRounds.length - 1]?.date || "",
    investors: Array.isArray((raw.financials as any)?.investors)
      ? (raw.financials as any).investors.join("; ")
      : "",
    competitors: Array.isArray((raw.competitiveLandscape as any)?.primaryCompetitors)
      ? (raw.competitiveLandscape as any).primaryCompetitors.join("; ")
      : "",
    competitorAnalysis: Array.isArray((raw.competitiveLandscape as any)?.economicMoat)
      ? `Economic Moat: ${(raw.competitiveLandscape as any).economicMoat.join(", ")}`
      : "",
  };
}

/**
 * Test: Self-evaluating research with automatic retry
 */
export const testSelfEvaluatingResearch = action({
  args: {},
  handler: async (ctx) => {
    console.log("🧪 TEST: Self-Evaluating Entity Research with Automatic Retry");
    console.log("================================================================================");
    
    const companies = [
      "Stripe",
      "Anthropic",
      "OpenAI",
    ];
    
    const results: SelfEvaluatingResult[] = [];
    
    for (const companyName of companies) {
      console.log(`\n🔍 Researching: ${companyName}`);
      console.log("--------------------------------------------------------------------------------");
      
      const companyStartTime = Date.now();
      const attempts: ResearchAttempt[] = [];
      let currentData: any = null;
      let maxAttempts = 2; // Initial research + 1 retry
      
      for (let attemptNum = 1; attemptNum <= maxAttempts; attemptNum++) {
        console.log(`\n📊 Attempt ${attemptNum}/${maxAttempts}`);
        
        const attemptStartTime = Date.now();
        
        try {
          // Research the company
          currentData = await researchCompanyDetailed(companyName, attemptNum);
          const attemptDuration = Date.now() - attemptStartTime;
          
          // Evaluate completeness
          const score = evaluateDataCompleteness(currentData, companyName);
          
          console.log(`⏱️  Duration: ${attemptDuration}ms`);
          console.log(`📈 Completeness: ${score.completenessPercentage}% (${score.populatedFields}/${score.totalFields} fields)`);
          console.log(`✅ Populated: ${score.populatedFields} fields`);
          console.log(`❌ Empty: ${score.emptyFields} fields`);
          
          if (score.criticalFieldsMissing.length > 0) {
            console.log(`⚠️  Missing critical fields: ${score.criticalFieldsMissing.join(", ")}`);
          }
          
          // Determine if retry is needed
          const needsRetry = !score.isPassing && attemptNum < maxAttempts;
          let retryReason: string | undefined;
          
          if (needsRetry) {
            if (score.criticalFieldsMissing.length > 0) {
              retryReason = `Missing critical fields: ${score.criticalFieldsMissing.join(", ")}`;
            } else {
              retryReason = `Completeness below threshold: ${score.completenessPercentage}% < 60%`;
            }
            console.log(`🔄 RETRY NEEDED: ${retryReason}`);
          } else if (score.isPassing) {
            console.log(`✅ PASS: Data quality acceptable`);
          } else {
            console.log(`⚠️  FAIL: Max attempts reached, accepting incomplete data`);
          }
          
          attempts.push({
            attemptNumber: attemptNum,
            duration: attemptDuration,
            completenessScore: score,
            data: currentData,
            needsRetry,
            retryReason,
          });
          
          // Break if passing or max attempts reached
          if (!needsRetry) {
            break;
          }
          
        } catch (error: any) {
          console.log(`❌ ERROR: ${error.message}`);
          attempts.push({
            attemptNumber: attemptNum,
            duration: Date.now() - attemptStartTime,
            completenessScore: {
              totalFields: 0,
              populatedFields: 0,
              emptyFields: 0,
              completenessPercentage: 0,
              criticalFieldsMissing: [],
              isPassing: false,
            },
            data: null,
            needsRetry: attemptNum < maxAttempts,
            retryReason: `Error: ${error.message}`,
          });
        }
      }
      
      const totalDuration = Date.now() - companyStartTime;
      const finalScore = attempts[attempts.length - 1].completenessScore;
      const firstScore = attempts[0].completenessScore;
      const improvementAchieved = attempts.length > 1 && 
        finalScore.completenessPercentage > firstScore.completenessPercentage;
      
      console.log(`\n📊 FINAL RESULT for ${companyName}:`);
      console.log(`   Total attempts: ${attempts.length}`);
      console.log(`   Total duration: ${totalDuration}ms`);
      console.log(`   Final completeness: ${finalScore.completenessPercentage}%`);
      console.log(`   Status: ${finalScore.isPassing ? '✅ PASS' : '⚠️  FAIL'}`);
      
      if (improvementAchieved) {
        const improvement = finalScore.completenessPercentage - firstScore.completenessPercentage;
        console.log(`   📈 Improvement: +${improvement}% (${firstScore.completenessPercentage}% → ${finalScore.completenessPercentage}%)`);
      }
      
      results.push({
        companyName,
        finalSuccess: finalScore.isPassing,
        attempts,
        finalCompletenessScore: finalScore,
        totalDuration,
        improvementAchieved,
      });
    }
    
    // Summary
    console.log("\n\n================================================================================");
    console.log("📊 SUMMARY");
    console.log("================================================================================");
    
    const passCount = results.filter(r => r.finalSuccess).length;
    const failCount = results.filter(r => !r.finalSuccess).length;
    const retryCount = results.filter(r => r.attempts.length > 1).length;
    const improvementCount = results.filter(r => r.improvementAchieved).length;
    const avgCompleteness = Math.round(
      results.reduce((sum, r) => sum + r.finalCompletenessScore.completenessPercentage, 0) / results.length
    );
    
    console.log(`Total companies: ${results.length}`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`⚠️  Failed: ${failCount}`);
    console.log(`🔄 Retried: ${retryCount}`);
    console.log(`📈 Improved: ${improvementCount}`);
    console.log(`📊 Avg completeness: ${avgCompleteness}%`);
    
    console.log("\n📋 Individual Results:");
    for (const result of results) {
      const status = result.finalSuccess ? '✅' : '⚠️ ';
      const attempts = result.attempts.length > 1 ? ` (${result.attempts.length} attempts)` : '';
      const improvement = result.improvementAchieved 
        ? ` [+${result.finalCompletenessScore.completenessPercentage - result.attempts[0].completenessScore.completenessPercentage}%]`
        : '';
      console.log(`   ${status} ${result.companyName}: ${result.finalCompletenessScore.completenessPercentage}%${attempts}${improvement}`);
    }
    
    return {
      summary: {
        totalCompanies: results.length,
        passed: passCount,
        failed: failCount,
        retried: retryCount,
        improved: improvementCount,
        avgCompleteness,
      },
      results,
    };
  },
});

