// convex/tools/secCompanySearch.ts
// Company search and disambiguation for SEC filings

import { internalAction, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Search for companies by name using SEC company tickers JSON
 * Returns multiple potential matches for disambiguation
 */
export const searchCompanies = internalAction({
  args: {
    companyName: v.string(),
  },
  returns: v.array(v.object({
    cik: v.string(),
    name: v.string(),
    ticker: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    console.log(`[searchCompanies] Searching for: ${args.companyName}`);

    try {
      const userAgent = "NodeBench AI contact@nodebench.ai";
      
      // Fetch the company tickers JSON from SEC
      const response = await fetch(
        "https://www.sec.gov/files/company_tickers.json",
        { headers: { "User-Agent": userAgent } }
      );

      if (!response.ok) {
        console.error(`[searchCompanies] Failed to fetch company tickers: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      // Convert to array and search for matches
      const companies = Object.values(data) as Array<{
        cik_str: number;
        ticker: string;
        title: string;
      }>;

      const searchTerm = args.companyName.toLowerCase();
      const matches: Array<{ cik: string; name: string; ticker?: string }> = [];

      for (const company of companies) {
        const companyName = company.title.toLowerCase();
        const ticker = company.ticker.toLowerCase();

        // Check if company name or ticker contains the search term
        if (companyName.includes(searchTerm) || ticker.includes(searchTerm)) {
          matches.push({
            cik: company.cik_str.toString().padStart(10, '0'),
            name: company.title,
            ticker: company.ticker,
          });
        }

        // Limit to 10 matches to avoid overwhelming the user
        if (matches.length >= 10) break;
      }

      console.log(`[searchCompanies] Found ${matches.length} matches for "${args.companyName}"`);
      return matches;

    } catch (error) {
      console.error("[searchCompanies] Error:", error);
      return [];
    }
  },
});

/**
 * Validate company matches using LLM judge
 * Returns PASS/FAIL for each company based on semantic similarity to user query
 */
export const validateCompanyMatches = internalAction({
  args: {
    userQuery: v.string(),
    companies: v.array(v.object({
      cik: v.string(),
      name: v.string(),
      ticker: v.optional(v.string()),
    })),
  },
  returns: v.array(v.object({
    cik: v.string(),
    name: v.string(),
    ticker: v.optional(v.string()),
    validationResult: v.union(v.literal("PASS"), v.literal("FAIL")),
    reasoning: v.string(),
  })),
  handler: async (ctx, args) => {
    console.log(`[validateCompanyMatches] Validating ${args.companies.length} companies for query: "${args.userQuery}"`);

    try {
      // Use LLM to validate each company match
      const prompt = `You are a company matching validator. Given a user's query and a list of potential company matches, determine which companies are plausible matches.

User Query: "${args.userQuery}"

Companies to validate:
${args.companies.map((c, i) => `${i + 1}. ${c.name} (${c.ticker || 'No ticker'}) - CIK: ${c.cik}`).join('\n')}

For each company, determine if it is a PASS or FAIL based on semantic similarity to the user's query.

PASS criteria:
- Company name contains the search term
- Company ticker matches the search term
- Company is semantically related to the user's intent
- Company is a plausible match given the context

FAIL criteria:
- Company name is completely unrelated
- Company is in a different industry/domain
- Company is clearly not what the user intended

Return a JSON array with this exact structure:
[
  {
    "cik": "0001234567",
    "validationResult": "PASS",
    "reasoning": "Company name contains the search term and is a direct match"
  },
  {
    "cik": "0007654321",
    "validationResult": "FAIL",
    "reasoning": "Company is in a different industry and unlikely to be the intended target"
  }
]

IMPORTANT: Return ONLY the JSON array, no other text.`;

      const result = await generateText({
        model: openai.chat("gpt-5"),
        prompt,
      });

      // Parse the LLM response
      const validationResults = JSON.parse(result.text);

      // Merge validation results with company data
      const validatedCompanies = args.companies.map(company => {
        const validation = validationResults.find((v: any) => v.cik === company.cik);
        return {
          ...company,
          validationResult: validation?.validationResult || "FAIL" as "PASS" | "FAIL",
          reasoning: validation?.reasoning || "No validation result",
        };
      });

      const passCount = validatedCompanies.filter(c => c.validationResult === "PASS").length;
      console.log(`[validateCompanyMatches] Validation complete: ${passCount} PASS, ${validatedCompanies.length - passCount} FAIL`);

      return validatedCompanies;

    } catch (error) {
      console.error("[validateCompanyMatches] Error:", error);
      // If validation fails, mark all as FAIL
      return args.companies.map(company => ({
        ...company,
        validationResult: "FAIL" as "PASS" | "FAIL",
        reasoning: "Validation error occurred",
      }));
    }
  },
});

/**
 * Check if a company has been confirmed for this thread
 */
export const getConfirmedCompany = internalQuery({
  args: {
    threadId: v.string(),
    companyName: v.string(),
  },
  returns: v.union(
    v.object({
      cik: v.string(),
      name: v.string(),
      ticker: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const confirmed = await ctx.db
      .query("confirmedCompanies")
      .withIndex("by_thread_and_name", (q) =>
        q.eq("threadId", args.threadId).eq("companyName", args.companyName.toLowerCase())
      )
      .first();

    if (!confirmed) return null;

    return {
      cik: confirmed.confirmedCik,
      name: confirmed.confirmedName,
      ticker: confirmed.confirmedTicker,
    };
  },
});

/**
 * Store a confirmed company selection
 */
export const confirmCompany = internalMutation({
  args: {
    threadId: v.string(),
    companyName: v.string(),
    cik: v.string(),
    name: v.string(),
    ticker: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`[confirmCompany] Storing confirmation: ${args.name} (CIK: ${args.cik}) for thread ${args.threadId}`);

    // Check if already confirmed
    const existing = await ctx.db
      .query("confirmedCompanies")
      .withIndex("by_thread_and_name", (q) =>
        q.eq("threadId", args.threadId).eq("companyName", args.companyName.toLowerCase())
      )
      .first();

    if (existing) {
      // Update existing confirmation
      await ctx.db.patch(existing._id, {
        confirmedCik: args.cik,
        confirmedName: args.name,
        confirmedTicker: args.ticker,
        createdAt: Date.now(),
      });
    } else {
      // Create new confirmation
      await ctx.db.insert("confirmedCompanies", {
        threadId: args.threadId,
        companyName: args.companyName.toLowerCase(),
        confirmedCik: args.cik,
        confirmedName: args.name,
        confirmedTicker: args.ticker,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

