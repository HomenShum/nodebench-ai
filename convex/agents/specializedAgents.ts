// convex/agents/specializedAgents.ts
// Specialized agents for different domains with focused tools and instructions

import { Agent, createTool, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { api, components } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { z } from "zod/v3";

// Import tools for each specialized agent
import { youtubeSearch } from "../tools/youtubeSearch";
import { linkupSearch } from "../tools/linkupSearch";
import { searchSecFilings, downloadSecFiling, getCompanyInfo } from "../tools/secFilingTools";
import { confirmCompanySelection } from "../tools/confirmCompanySelection";
import {
  findDocument,
  getDocumentContent,
  createDocument,
  updateDocument,
} from "../tools/documentTools";
import {
  searchMedia,
  analyzeMediaFile,
} from "../tools/mediaTools";

/**
 * Document Agent - Specializes in document operations
 */
export function createDocumentAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "DocumentAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a document specialist. Your ONLY job is to help users find, read, create, and manage documents.

CAPABILITIES:
- Search for documents by title or content
- Read and display document content
- Create new documents
- Update existing documents
- Organize documents in folders
- Analyze and summarize document content

CRITICAL RULES - BEST-EFFORT EXECUTION:
1. NEVER ask clarifying questions before searching - execute immediately with best interpretation
2. When user asks to "show", "read", "open", or "display" a document:
   - First call findDocument to locate it
   - Then IMMEDIATELY call getDocumentContent to retrieve the full content
   - Display the content to the user
3. When user asks to CREATE, MAKE, or NEW document:
   - IMMEDIATELY call createDocument with a clear title
   - If no specific title given, use a descriptive default like "New Document" or infer from context
   - Do NOT ask for clarification - just create it
4. When creating documents, use clear titles and organize them properly
5. Always provide the document ID when referencing documents
6. If multiple documents match, show the most relevant one first
7. If query is ambiguous, make a reasonable assumption and execute immediately
8. Include a brief note at the END if you made assumptions

DOCUMENT CREATION EXAMPLES:
- "Make new document" → createDocument with title "New Document"
- "Create a document" → createDocument with title "New Document"
- "Create a document about AI" → createDocument with title "AI Document"
- "Make a new investment thesis" → createDocument with title "Investment Thesis"
- "Create document for Q4 planning" → createDocument with title "Q4 Planning"

BEST-EFFORT DOCUMENT RESOLUTION:
- For partial titles: Search for the most likely match based on keywords
  Example: "revenue report" → search for documents containing "revenue" and "report"
- For ambiguous titles: Use the most recently modified document
- If multiple matches: Present the most relevant match first, list alternatives at the end
- ALWAYS execute the search first, present findings, then clarify if needed

RESPONSE STYLE:
- Present findings FIRST (document content, metadata)
- Be concise and focused on document operations
- Always confirm actions taken (created, updated, found)
- Provide document metadata (title, folder, creation date) when relevant
- Include clarifications/alternatives at the END, not the beginning`,
    tools: {
      findDocument,
      getDocumentContent,
      createDocument,
      updateDocument,
    },
    stopWhen: stepCountIs(5),
  });
}

/**
 * Media Agent - Specializes in YouTube videos, images, and media search
 */
export function createMediaAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "MediaAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a media specialist. Your ONLY job is to help users find and interact with videos, images, and other media.

CAPABILITIES:
- Search YouTube for videos
- Search the web for images
- Search user's internal media files
- Analyze media files
- Provide media recommendations

CRITICAL RULES - BEST-EFFORT EXECUTION:
1. NEVER ask clarifying questions before searching - execute immediately with best interpretation
2. For video searches, ALWAYS use youtubeSearch (NOT internal search)
3. For image searches:
   - First try searchMedia for internal files
   - If no results, IMMEDIATELY use linkupSearch with includeImages: true
4. Return results in gallery format for better user experience
5. Provide relevant metadata (title, channel, duration, etc.)
6. If query is ambiguous, make a reasonable assumption and search immediately
7. Include a brief note at the END if you made assumptions (e.g., "Note: I searched for [X]. If you meant something else, please clarify.")

BEST-EFFORT ENTITY RESOLUTION:
- For company/product names: Use the most prominent/well-known entity (e.g., "Ditto.ai" → search for the company at ditto.ai domain)
- For person names: Include context clues from the query (e.g., "Eric Liu founder Ditto.ai" → search for "Eric Liu Ditto.ai founder")
- For ambiguous terms: Use the most common interpretation and note alternatives at the end
- ALWAYS execute the search first, clarify later if needed

RESPONSE STYLE:
- Present findings FIRST (videos, images, metadata)
- Be enthusiastic about media content
- Provide context about videos/images (what they're about, who created them)
- Suggest related content when appropriate
- Use emojis sparingly for visual appeal (🎥 📹 🖼️)
- Include clarifications/assumptions at the END, not the beginning`,
    tools: {
      youtubeSearch,
      linkupSearch,
      searchMedia,
      analyzeMediaFile,
    },
    stopWhen: stepCountIs(5),
  });
}

/**
 * SEC Agent - Specializes in SEC filings and financial documents
 */
export function createSECAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "SECAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are an SEC filing specialist. Your ONLY job is to help users find, download, and analyze SEC EDGAR filings.

CAPABILITIES:
- Search for SEC filings by ticker symbol, CIK, or company name
- Filter by form type (10-K, 10-Q, 8-K, DEF 14A, S-1, etc.)
- Download SEC filings to user's document library
- Look up company information from SEC database
- Explain filing types and their purposes
- Handle company disambiguation when multiple matches are found

FILING TYPES:
- 10-K: Annual report with comprehensive financial information
- 10-Q: Quarterly report with unaudited financial statements
- 8-K: Current report for major events
- DEF 14A: Proxy statement for shareholder meetings
- S-1: Initial registration statement for IPOs

CRITICAL RULES - BEST-EFFORT EXECUTION:
1. NEVER ask clarifying questions before searching - execute immediately with best interpretation
2. When searching by company name (not ticker), ALWAYS include the threadId parameter
3. If multiple companies match, present the MOST LIKELY match first with findings
4. Include a note at the END if other companies matched
5. Provide filing dates and accession numbers for reference
6. When downloading, save to user's documents with clear naming
7. Explain what each filing type contains
8. Return results in gallery format for easy browsing

BEST-EFFORT COMPANY RESOLUTION:
- For well-known companies: Use the most prominent public company with that name
  Example: "Apple" → Apple Inc. (AAPL, CIK: 0000320193)
- For ambiguous names: Use context clues from the query
  Example: "Ditto.ai 10-K" → Search for "Ditto" or "Ditto Inc" in SEC database
- If multiple matches: Present the most likely match first, list alternatives at the end
- ALWAYS execute the search first, present findings, then clarify if needed

COMPANY DISAMBIGUATION WORKFLOW (PROGRESSIVE DISCLOSURE):
1. User asks: "Get Dasher's 10-K"
2. Call searchSecFilings with companyName="Dasher" and threadId
3. If multiple companies match:
   a. Select the MOST LIKELY match based on market cap, filing activity, name similarity
   b. Present findings for that company FIRST
   c. Include a note at the END: "Note: I found [Company Name] (CIK: XXX). If you meant a different company, here are other matches: [list]"
4. User gets immediate value from the best-effort match
5. If user clarifies they meant a different company, call confirmCompanySelection and search again

RESPONSE STYLE:
- Present findings FIRST (filings, company info, financial data)
- Be professional and precise with financial terminology
- Provide context about what each filing contains
- Suggest related filings when appropriate
- Use clear formatting for financial data
- Include clarifications/alternatives at the END, not the beginning`,
    tools: {
      searchSecFilings,
      downloadSecFiling,
      getCompanyInfo,
      confirmCompanySelection,
    },
    stopWhen: stepCountIs(5),
  });
}

/**
 * Web Agent - Specializes in web search and general information
 */
export function createWebAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "WebAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a web search specialist. Your ONLY job is to help users find current information from the web.

CAPABILITIES:
- Search the web for current information
- Find images from the web
- Provide up-to-date facts and data
- Summarize web search results
- Cite sources clearly
- Research companies, people, products, and topics

CRITICAL RULES - BEST-EFFORT EXECUTION:
1. NEVER ask clarifying questions before searching - execute immediately with best interpretation
2. Always use linkupSearch for web queries
3. Include images when relevant (includeImages: true)
4. Provide source URLs for all information
5. Summarize results clearly and concisely
6. Indicate when information might be time-sensitive
7. For multi-entity queries, execute ALL searches immediately in parallel
8. If query is ambiguous, make a reasonable assumption and search immediately
9. Include a brief note at the END if you made assumptions

BEST-EFFORT ENTITY RESOLUTION:
- For company names: Use the most prominent/well-known entity with that exact name or domain
  Example: "Ditto.ai" → search for "Ditto.ai company" (the company at ditto.ai domain)
- For person names with context: Include all context clues in the search
  Example: "Eric Liu founder Ditto.ai" → search for "Eric Liu founder Ditto.ai LinkedIn"
- For ambiguous terms: Use the most common interpretation and note alternatives at the end
- For multi-entity queries: Break into multiple searches and execute in parallel
  Example: "Ditto.ai, Eric Liu, fundraising, news" →
    1. Search "Ditto.ai company information"
    2. Search "Eric Liu Ditto.ai founder LinkedIn"
    3. Search "Ditto.ai fundraising funding rounds"
    4. Search "Ditto.ai recent news"
- ALWAYS execute searches first, clarify later if needed

MULTI-ENTITY RESEARCH QUERIES:
When user asks for comprehensive information about a company/person/product:
1. Execute multiple searches immediately (company info, founder, funding, news, media)
2. Use linkupSearch with includeImages: true to get visual content
3. Structure the response with clear sections:
   - Company/Entity Overview
   - Key People (founders, executives)
   - Funding/Financials (if applicable)
   - Recent News & Updates
   - Media Assets (images, videos)
   - Additional Resources (careers, social media)
4. Present ALL findings first, then include clarifications at the end

RESPONSE STYLE:
- Present findings FIRST in a structured format
- Be informative and cite sources
- Provide context and background
- Use bullet points and sections for clarity
- Include relevant images when available
- Always mention the source and date when important
- Include clarifications/assumptions at the END, not the beginning
- For comprehensive queries, organize information by category (overview, people, funding, news, media)`,
    tools: {
      linkupSearch,
    },
    stopWhen: stepCountIs(8), // Increased to allow multiple searches for comprehensive queries
  });
}

/**
 * Self-evaluation: Check data completeness and determine if retry is needed
 */
interface DataCompletenessScore {
  totalFields: number;
  populatedFields: number;
  emptyFields: number;
  completenessPercentage: number;
  criticalFieldsMissing: string[];
  isPassing: boolean;
}

function evaluateCompanyDataCompleteness(data: any, companyName: string): DataCompletenessScore {
  const criticalFields = ['summary', 'headline', 'location', 'website', 'companyType'];
  const allFields = [
    'summary', 'headline', 'location', 'website', 'companyType',
    'businessModel', 'competitiveLandscape', 'financials', 'swotAnalysis'
  ];

  let populatedCount = 0;
  let emptyCount = 0;
  const missingCritical: string[] = [];

  for (const field of allFields) {
    const value = data[field];
    const isPopulated = value &&
      (typeof value === 'string' ? value.trim() !== '' : true) &&
      value !== 'N/A' &&
      value !== 'Not specified';

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

function evaluatePersonDataCompleteness(data: any, personName: string): DataCompletenessScore {
  const criticalFields = ['summary', 'headline', 'fullName'];
  const allFields = [
    'summary', 'headline', 'fullName', 'location',
    'workExperience', 'education', 'skills'
  ];

  let populatedCount = 0;
  let emptyCount = 0;
  const missingCritical: string[] = [];

  for (const field of allFields) {
    const value = data[field];
    const isPopulated = value &&
      (typeof value === 'string' ? value.trim() !== '' :
       Array.isArray(value) ? value.length > 0 : true) &&
      value !== 'N/A';

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
 * Entity Research Agent - Researches companies and people with caching and self-evaluation
 */
export function createEntityResearchAgent(ctx: ActionCtx, userId: Id<"users">) {
  const researchCompanyArgs = z.object({
    companyName: z.string().describe("Name of the company to research"),
    forceRefresh: z.boolean().optional().describe("Force refresh even if cached data exists"),
  });
  const researchPersonArgs = z.object({
    fullName: z.string().describe("Full name of the person to research"),
    company: z.string().optional().describe("Company name to help disambiguate (optional)"),
    forceRefresh: z.boolean().optional().describe("Force refresh even if cached data exists"),
  });
  const askAboutEntityArgs = z.object({
    entityName: z.string().describe("Name of the entity"),
    entityType: z.enum(["company", "person"]).describe("Type of entity"),
    question: z.string().describe("Specific question about the entity"),
  });
  const bulkResearchFromCsvArgs = z.object({
    documentId: z.string().describe("Document ID of the CSV file"),
    entityType: z.enum(["company", "person"]).describe("Type of entities in the CSV"),
    columnName: z.string().describe("Name of the column containing entity names"),
    maxEntities: z.number().optional().describe("Maximum number of entities to research (default: 50)"),
  });
  type ResearchCompanyArgs = z.infer<typeof researchCompanyArgs>;
  type ResearchPersonArgs = z.infer<typeof researchPersonArgs>;
  type AskAboutEntityArgs = z.infer<typeof askAboutEntityArgs>;
  type BulkResearchFromCsvArgs = z.infer<typeof bulkResearchFromCsvArgs>;
  type BulkResearchResult =
    | { entityName: string; status: "cached"; ageInDays: number; summary: string }
    | { entityName: string; status: "researched"; summary: string; keyFacts: string[] }
    | { entityName: string; status: "failed"; error: string };

  const isCachedResult = (
    result: BulkResearchResult,
  ): result is Extract<BulkResearchResult, { status: "cached" }> => result.status === "cached";
  const isResearchedResult = (
    result: BulkResearchResult,
  ): result is Extract<BulkResearchResult, { status: "researched" }> => result.status === "researched";
  const isFailedResult = (
    result: BulkResearchResult,
  ): result is Extract<BulkResearchResult, { status: "failed" }> => result.status === "failed";

  return new Agent(components.agent, {
    name: "EntityResearchAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: `You are an entity research specialist with access to comprehensive company and person data.

CAPABILITIES:
- Research companies (funding, competitors, SWOT, financials, key personnel, tech stack)
- Research people (work history, skills, compensation, role suitability)
- All research is cached for 7 days for instant follow-up questions
- Compare multiple entities side-by-side
- **SELF-EVALUATION**: Automatically evaluates data completeness and retries if incomplete

RESEARCH DEPTH:
- Company: 20+ fields including SWOT analysis, competitive landscape, financials, business model
- Person: 15+ fields including work experience, education, skills, compensation analysis
- All data is sourced from LinkUp API with citations

WORKFLOW:
1. Check cache first (instant if available and fresh)
2. Call LinkUp API if not cached or stale (> 7 days)
3. **SELF-EVALUATE**: Check data completeness (pass/fail)
4. **AUTO-RETRY**: If data incomplete or missing critical fields, retry with enhanced query
5. Store structured data in cache
6. Return comprehensive analysis with quality badge (✅ VERIFIED or ⚠️ PARTIAL)

DATA QUALITY STANDARDS:
- **PASS**: ≥60% fields populated AND all critical fields present
- **CRITICAL FIELDS (Company)**: summary, headline, location, website, companyType
- **CRITICAL FIELDS (Person)**: summary, headline, fullName
- **AUTO-RETRY**: Triggered if <60% complete or missing critical fields
- **MAX ATTEMPTS**: 2 (initial + 1 retry with enhanced query)

CRITICAL RULES:
1. ALWAYS check cache before calling LinkUp API
2. When answering follow-up questions, use cached data
3. Provide sources for all information
4. Indicate cache age when using cached data
5. Offer to refresh stale data (> 7 days old)
6. **NEW**: Trust the self-evaluation system - quality badges indicate data reliability`,

    tools: {
      researchCompany: createTool({
        description: "Research a company with comprehensive structured data. Checks cache first, then calls LinkUp API if needed. Automatically retries if data is incomplete.",
        args: researchCompanyArgs,
        handler: async (_toolCtx: ActionCtx, args: ResearchCompanyArgs): Promise<string> => {
          console.log(`[researchCompany] Starting research for: ${args.companyName}`);

          // 1. Check cache
          const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
            entityName: args.companyName,
            entityType: "company",
          });

          if (cached && !cached.isStale && !args.forceRefresh) {
            // Update access count
            await ctx.runMutation(api.entityContexts.updateAccessCount, {
              id: cached._id,
            });

            console.log(`[researchCompany] Using cached data (${cached.ageInDays} days old)`);
            return `[CACHED - ${cached.ageInDays} days old, ${cached.accessCount + 1} cache hits]

**${args.companyName}**

${cached.summary}

**Key Facts:**
${cached.keyFacts.map((fact: string, i: number) => `${i + 1}. ${fact}`).join('\n')}

**Sources:**
${cached.sources.slice(0, 5).map((s: any, i: number) => `${i + 1}. [${s.name}](${s.url})`).join('\n')}

(Using cached research from ${new Date(cached.researchedAt).toLocaleDateString()})`;
          }

          // 2. Call LinkUp API with self-evaluation and retry
          const { linkupCompanyProfile } = await import("../../agents/services/linkup");
          const maxAttempts = 2;
          let result: any = null;
          let completenessScore: DataCompletenessScore | null = null;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`[researchCompany] Attempt ${attempt}/${maxAttempts}`);

            // Use more specific query on retry
            const query = attempt === 1
              ? args.companyName
              : `${args.companyName} company profile funding investors competitors business model`;

            result = await linkupCompanyProfile(query);

            if (!result || (result as any).error) {
              console.log(`[researchCompany] API error on attempt ${attempt}: ${(result as any)?.error}`);
              if (attempt === maxAttempts) {
                return `Failed to research ${args.companyName} after ${maxAttempts} attempts: ${(result as any)?.error || 'Unknown error'}`;
              }
              continue;
            }

            // Evaluate data completeness
            completenessScore = evaluateCompanyDataCompleteness(result, args.companyName);
            console.log(`[researchCompany] Attempt ${attempt} completeness: ${completenessScore.completenessPercentage}% (${completenessScore.populatedFields}/${completenessScore.totalFields} fields)`);

            if (completenessScore.criticalFieldsMissing.length > 0) {
              console.log(`[researchCompany] Missing critical fields: ${completenessScore.criticalFieldsMissing.join(', ')}`);
            }

            // If passing or last attempt, break
            if (completenessScore.isPassing || attempt === maxAttempts) {
              if (completenessScore.isPassing) {
                console.log(`[researchCompany] ✅ PASS - Data quality acceptable`);
              } else {
                console.log(`[researchCompany] ⚠️ FAIL - Max attempts reached, accepting incomplete data`);
              }
              break;
            }

            // Retry needed
            console.log(`[researchCompany] 🔄 RETRY - Completeness below threshold or missing critical fields`);
          }

          // Extract key facts from structured data
          const keyFacts: string[] = [];
          if ((result as any).headline) keyFacts.push((result as any).headline);
          if ((result as any).companyType) keyFacts.push(`Type: ${(result as any).companyType}`);
          if ((result as any).location) keyFacts.push(`Location: ${(result as any).location}`);
          if ((result as any).website) keyFacts.push(`Website: ${(result as any).website}`);
          if ((result as any).financials?.marketCap) keyFacts.push(`Market Cap: ${(result as any).financials.marketCap}`);
          if ((result as any).financials?.fundingRounds?.length > 0) {
            const latestRound = (result as any).financials.fundingRounds[0];
            keyFacts.push(`Latest Funding: ${latestRound.roundName} - ${latestRound.amount}`);
          }
          if ((result as any).competitiveLandscape?.primaryCompetitors?.length > 0) {
            keyFacts.push(`Competitors: ${(result as any).competitiveLandscape.primaryCompetitors.slice(0, 3).join(', ')}`);
          }

          // Extract CRM fields
          const { extractCRMFields } = await import("./crmExtraction");
          const crmFields = extractCRMFields(result, args.companyName);

          // 3. Store in cache
          await ctx.runMutation(api.entityContexts.storeEntityContext, {
            entityName: args.companyName,
            entityType: "company",
            linkupData: result,
            summary: (result as any).summary || `Research data for ${args.companyName}`,
            keyFacts,
            sources: ((result as any).allLinks || []).slice(0, 10).map((url: string) => ({ name: url, url })),
            crmFields,
            researchedBy: userId,
          });

          const qualityBadge = completenessScore
            ? `[${completenessScore.isPassing ? '✅ VERIFIED' : '⚠️ PARTIAL'} - ${completenessScore.completenessPercentage}% complete]`
            : '';

          return `[FRESH RESEARCH] ${qualityBadge}

**${args.companyName}**

${(result as any).summary || ''}

**Key Facts:**
${keyFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

**Business Model:**
${(result as any).businessModel?.monetizationStrategy || 'N/A'}

**Competitive Landscape:**
${(result as any).competitiveLandscape?.primaryCompetitors?.slice(0, 5).join(', ') || 'N/A'}

**Sources:**
${((result as any).allLinks || []).slice(0, 5).map((url: string, i: number) => `${i + 1}. ${url}`).join('\n')}

(Research cached for future queries)`;
        },
      }),

      researchPerson: createTool({
        description: "Research a person with comprehensive structured data. Checks cache first, then calls LinkUp API if needed. Automatically retries if data is incomplete.",
        args: researchPersonArgs,
        handler: async (_toolCtx: ActionCtx, args: ResearchPersonArgs): Promise<string> => {
          console.log(`[researchPerson] Starting research for: ${args.fullName}`);
          const searchName = args.company ? `${args.fullName} ${args.company}` : args.fullName;

          // 1. Check cache
          const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
            entityName: args.fullName,
            entityType: "person",
          });

          if (cached && !cached.isStale && !args.forceRefresh) {
            // Update access count
            await ctx.runMutation(api.entityContexts.updateAccessCount, {
              id: cached._id,
            });

            console.log(`[researchPerson] Using cached data (${cached.ageInDays} days old)`);
            return `[CACHED - ${cached.ageInDays} days old, ${cached.accessCount + 1} cache hits]

**${args.fullName}**

${cached.summary}

**Key Facts:**
${cached.keyFacts.map((fact: string, i: number) => `${i + 1}. ${fact}`).join('\n')}

**Sources:**
${cached.sources.slice(0, 5).map((s: any, i: number) => `${i + 1}. [${s.name}](${s.url})`).join('\n')}

(Using cached research from ${new Date(cached.researchedAt).toLocaleDateString()})`;
          }

          // 2. Call LinkUp API with self-evaluation and retry
          const { linkupPersonProfile } = await import("../../agents/services/linkup");
          const maxAttempts = 2;
          let result: any = null;
          let completenessScore: DataCompletenessScore | null = null;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`[researchPerson] Attempt ${attempt}/${maxAttempts}`);

            // Use more specific query on retry
            const query = attempt === 1
              ? searchName
              : `${searchName} professional profile work experience education skills`;

            result = await linkupPersonProfile(query);

            if (!result || (result as any).error) {
              console.log(`[researchPerson] API error on attempt ${attempt}: ${(result as any)?.error}`);
              if (attempt === maxAttempts) {
                return `Failed to research ${args.fullName} after ${maxAttempts} attempts: ${(result as any)?.error || 'Unknown error'}`;
              }
              continue;
            }

            // Evaluate data completeness
            completenessScore = evaluatePersonDataCompleteness(result, args.fullName);
            console.log(`[researchPerson] Attempt ${attempt} completeness: ${completenessScore.completenessPercentage}% (${completenessScore.populatedFields}/${completenessScore.totalFields} fields)`);

            if (completenessScore.criticalFieldsMissing.length > 0) {
              console.log(`[researchPerson] Missing critical fields: ${completenessScore.criticalFieldsMissing.join(', ')}`);
            }

            // If passing or last attempt, break
            if (completenessScore.isPassing || attempt === maxAttempts) {
              if (completenessScore.isPassing) {
                console.log(`[researchPerson] ✅ PASS - Data quality acceptable`);
              } else {
                console.log(`[researchPerson] ⚠️ FAIL - Max attempts reached, accepting incomplete data`);
              }
              break;
            }

            // Retry needed
            console.log(`[researchPerson] 🔄 RETRY - Completeness below threshold or missing critical fields`);
          }

          // Extract key facts
          const keyFacts: string[] = [];
          if ((result as any).headline) keyFacts.push((result as any).headline);
          if ((result as any).location?.city) keyFacts.push(`Location: ${(result as any).location.city}, ${(result as any).location.state || (result as any).location.country}`);
          if ((result as any).workExperience?.length > 0) {
            const currentJob = (result as any).workExperience[0];
            keyFacts.push(`Current: ${currentJob.jobTitle} at ${currentJob.companyName}`);
          }
          if ((result as any).education?.length > 0) {
            const edu = (result as any).education[0];
            keyFacts.push(`Education: ${edu.degree || ''} ${edu.fieldOfStudy || ''} from ${edu.institution}`);
          }
          if ((result as any).skills?.technicalSkills?.length > 0) {
            keyFacts.push(`Skills: ${(result as any).skills.technicalSkills.slice(0, 5).join(', ')}`);
          }

          // 3. Store in cache
          await ctx.runMutation(api.entityContexts.storeEntityContext, {
            entityName: args.fullName,
            entityType: "person",
            linkupData: result,
            summary: (result as any).summary || `Research data for ${args.fullName}`,
            keyFacts,
            sources: [], // Person profiles don't have allLinks
            researchedBy: userId,
          });

          const qualityBadge = completenessScore
            ? `[${completenessScore.isPassing ? '✅ VERIFIED' : '⚠️ PARTIAL'} - ${completenessScore.completenessPercentage}% complete]`
            : '';

          return `[FRESH RESEARCH] ${qualityBadge}

**${args.fullName}**

${(result as any).summary || ''}

**Key Facts:**
${keyFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

**Work Experience:**
${(result as any).workExperience?.slice(0, 3).map((job: any) => `- ${job.jobTitle} at ${job.companyName} (${job.startDate || ''} - ${job.endDate || 'Present'})`).join('\n') || 'N/A'}

**Skills:**
${(result as any).skills?.technicalSkills?.slice(0, 10).join(', ') || 'N/A'}

(Research cached for future queries)`;
        },
      }),

      askAboutEntity: createTool({
        description: "Answer questions about a previously researched entity using cached data. Much faster than re-researching.",
        args: askAboutEntityArgs,
        handler: async (_toolCtx: ActionCtx, args: AskAboutEntityArgs): Promise<string> => {
          const context = await ctx.runQuery(api.entityContexts.getEntityContext, {
            entityName: args.entityName,
            entityType: args.entityType,
          });

          if (!context) {
            return `No cached data for ${args.entityName}. Would you like me to research this ${args.entityType}?`;
          }

          // Update access count
          await ctx.runMutation(api.entityContexts.updateAccessCount, {
            id: context._id,
          });

          // Find relevant facts based on question keywords
          const questionLower = args.question.toLowerCase();
          const relevantFacts = context.keyFacts.filter((fact: string) =>
            questionLower.split(' ').some((word: string) => fact.toLowerCase().includes(word))
          );

          const answer = relevantFacts.length > 0
            ? relevantFacts.join('\n')
            : context.summary;

          return `Based on my research on ${args.entityName} (cached ${context.ageInDays} days ago):

${answer}

${context.sources.length > 0 ? `**Sources:** ${context.sources.slice(0, 3).map((s: any) => s.url).join(', ')}` : ''}

(Cache hit #${context.accessCount + 1}${context.isStale ? ' - Data is stale, consider refreshing' : ''})`;
        },
      }),

      bulkResearchFromCSV: createTool({
        description: "Research multiple entities from a CSV file in parallel. Supports companies and people.",
        args: bulkResearchFromCsvArgs,
        handler: async (_toolCtx: ActionCtx, args: BulkResearchFromCsvArgs): Promise<string> => {
          const fileDoc = await ctx.runQuery(api.fileDocuments.getFileDocument, {
            documentId: args.documentId as Id<"documents">,
          });

          if (!fileDoc?.storageUrl) {
            return "File not found or no storage URL";
          }

          const response = await fetch(fileDoc.storageUrl);
          const csvText = await response.text();

          const lines = csvText.split("\n").filter((line) => line.trim().length > 0);
          if (lines.length < 2) {
            return "CSV file is empty or has no data rows";
          }

          const headers = lines[0]
            .split(",")
            .map((header) => header.trim().replace(/^"|"$/g, ""));
          const rows = lines.slice(1).map((line) =>
            line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
          );

          const columnIndex = headers.indexOf(args.columnName);
          if (columnIndex === -1) {
            return `Column "${args.columnName}" not found. Available columns: ${headers.join(', ')}`;
          }

          const entityNames = rows
            .map((row) => row[columnIndex] ?? "")
            .filter((name) => name.trim().length > 0)
            .slice(0, args.maxEntities ?? 50);

          if (entityNames.length === 0) {
            return `No entities found in column "${args.columnName}"`;
          }

          console.log(`[bulkResearchFromCSV] Researching ${entityNames.length} ${args.entityType}s in parallel...`);

          const { linkupCompanyProfile, linkupPersonProfile } = await import("../../agents/services/linkup");

          const researchPromises: Promise<BulkResearchResult>[] = entityNames.map(async (entityName, index) => {
            try {
              const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
                entityName,
                entityType: args.entityType,
              });

              if (cached && !cached.isStale) {
                await ctx.runMutation(api.entityContexts.updateAccessCount, {
                  id: cached._id,
                });
                return {
                  entityName,
                  status: "cached",
                  ageInDays: cached.ageInDays,
                  summary: cached.summary,
                } as BulkResearchResult;
              }

              const result = args.entityType === "company"
                ? await linkupCompanyProfile(entityName)
                : await linkupPersonProfile(entityName);
              const data = result as Record<string, any> | null;

              if (!data || data.error) {
                return {
                  entityName,
                  status: "failed",
                  error: String(data?.error ?? "Unknown error"),
                } as BulkResearchResult;
              }

              const keyFacts: string[] = [];
              if (data.headline) keyFacts.push(String(data.headline));
              if (args.entityType === "company") {
                if (data.companyType) keyFacts.push(`Type: ${String(data.companyType)}`);
                if (data.location) keyFacts.push(`Location: ${String(data.location)}`);
                if (data.financials?.marketCap) keyFacts.push(`Market Cap: ${String(data.financials.marketCap)}`);
              } else {
                if (data.location?.city) keyFacts.push(`Location: ${String(data.location.city)}`);
                if (Array.isArray(data.workExperience) && data.workExperience[0]) {
                  const job = data.workExperience[0] as Record<string, any>;
                  keyFacts.push(`Current: ${String(job.jobTitle)} at ${String(job.companyName)}`);
                }
              }

              await ctx.runMutation(api.entityContexts.storeEntityContext, {
                entityName,
                entityType: args.entityType,
                linkupData: data,
                summary: String(data.summary ?? `Research data for ${entityName}`),
                keyFacts,
                sources: ((data.allLinks as string[] | undefined) ?? []).slice(0, 10).map((url) => ({ name: url, url })),
                spreadsheetId: args.documentId as Id<"documents">,
                rowIndex: index,
                researchedBy: userId,
              });

              return {
                entityName,
                status: "researched",
                summary: String(data.summary ?? ""),
                keyFacts: keyFacts.slice(0, 3),
              } as BulkResearchResult;
            } catch (error) {
              return {
                entityName,
                status: "failed",
                error: String(error),
              } as BulkResearchResult;
            }
          });

          const results = await Promise.all(researchPromises);

          // 4. Generate summary report
          const cachedResults = results.filter(isCachedResult);
          const researchedResults = results.filter(isResearchedResult);
          const failedResults = results.filter(isFailedResult);

          let report = `**Bulk Research Complete**\n\n`;
          report += `📊 **Summary:**\n`;
          report += `- Total entities: ${entityNames.length}\n`;
          report += `- ✅ Researched: ${researchedResults.length}\n`;
          report += `- 💾 From cache: ${cachedResults.length}\n`;
          report += `- ❌ Failed: ${failedResults.length}\n\n`;

          if (researchedResults.length > 0) {
            report += `**Newly Researched ${args.entityType}s:**\n`;
            researchedResults
              .slice(0, 10)
              .forEach((item) => {
                report += `\n**${item.entityName}**\n`;
                report += `${item.summary.substring(0, 150)}...\n`;
              });

            if (researchedResults.length > 10) {
              report += `\n... and ${researchedResults.length - 10} more\n`;
            }
          }

          if (failedResults.length > 0) {
            report += `\n**Failed:**\n`;
            failedResults
              .forEach((item) => {
                report += `- ${item.entityName}: ${item.error}\n`;
              });
          }

          report += `\n✅ All data cached for instant follow-up questions!`;

          return report;
        },
      }),
      searchCompaniesByCriteria: createTool({
        description: "Search for companies matching specific criteria (funding, industry, founding year, founder experience)",
        args: z.object({
          minFunding: z.string().optional().describe("Minimum funding amount (e.g., '$2M', '$500K')"),
          maxFunding: z.string().optional().describe("Maximum funding amount (e.g., '$100M')"),
          industry: z.string().optional().describe("Industry/sector (e.g., 'healthcare', 'fintech')"),
          minFoundingYear: z.number().optional().describe("Minimum founding year (e.g., 2022)"),
          maxFoundingYear: z.number().optional().describe("Maximum founding year (e.g., 2024)"),
          requireFounderExperience: z.boolean().optional().describe("Require founders to have previous founding experience"),
          maxResults: z.number().optional().describe("Maximum number of results to return (default: 10)"),
        }),
        handler: async (_toolCtx: ActionCtx, args): Promise<string> => {
          console.log(`[searchCompaniesByCriteria] Starting criteria search:`, args);

          const { matchesCriteria } = await import("./criteriaSearch");
          const { linkupStructuredSearch, comprehensiveCompanySchema } = await import("../../agents/services/linkup");
          const { extractCRMFields } = await import("./crmExtraction");

          // Build search query based on criteria
          const queryParts: string[] = [];
          if (args.industry) queryParts.push(args.industry);
          if (args.minFoundingYear) queryParts.push(`founded after ${args.minFoundingYear}`);
          if (args.minFunding) queryParts.push(`funded ${args.minFunding} or more`);

          const searchQuery = queryParts.length > 0
            ? `${queryParts.join(' ')} companies`
            : 'companies';

          console.log(`[searchCompaniesByCriteria] Search query: ${searchQuery}`);

          try {
            // Search for companies using structured output
            const searchResults = await linkupStructuredSearch(searchQuery, comprehensiveCompanySchema, "deep");

            if (!searchResults || (searchResults as any).error) {
              return `Failed to search companies: ${(searchResults as any)?.error || 'Unknown error'}`;
            }

            // Handle both single result and array of results
            let companies = Array.isArray(searchResults) ? searchResults : [searchResults];

            // Filter out error responses and ensure they have companyName
            companies = companies.filter((c: any) => !c.error && c.companyName && typeof c.companyName === 'string');

            // Filter results by criteria
            const matchedCompanies = companies.filter((company: any) =>
              matchesCriteria(company, args)
            ).slice(0, args.maxResults || 10);

            if (matchedCompanies.length === 0) {
              return `No companies found matching criteria:\n${JSON.stringify(args, null, 2)}`;
            }

            // Extract CRM fields and store in cache
            const results: string[] = [];
            for (const company of matchedCompanies) {
              try {
                // Type the company data safely
                const companyData = company as any;
                const companyName = (companyData?.companyName || 'Unknown') as string;
                const crmFields = extractCRMFields(companyData, companyName);

                // Store in cache
                await ctx.runMutation(api.entityContexts.storeEntityContext, {
                  entityName: companyName,
                  entityType: "company",
                  linkupData: companyData,
                  summary: (companyData?.summary as string) || `Research data for ${companyName}`,
                  keyFacts: [
                    (companyData?.headline as string) || '',
                    `Industry: ${crmFields.industry}`,
                    `Funding: ${crmFields.totalFunding}`,
                    `Founded: ${crmFields.foundingYear || 'Unknown'}`,
                  ].filter(Boolean),
                  sources: ((companyData?.allLinks as string[]) || []).slice(0, 5).map((url: string) => ({ name: url, url })),
                  crmFields,
                  researchedBy: userId,
                });

                results.push(`✅ **${companyName}**
- Industry: ${crmFields.industry}
- Founded: ${crmFields.foundingYear || 'Unknown'}
- Funding: ${crmFields.totalFunding}
- Founders: ${crmFields.founders.join(', ') || 'Unknown'}
- Location: ${crmFields.hqLocation}
- Product: ${crmFields.product}`);
              } catch (error) {
                console.error(`[searchCompaniesByCriteria] Error processing company:`, error);
                results.push(`⚠️ **Unknown Company** - Error processing data`);
              }
            }

            return `**Criteria Search Results** (${matchedCompanies.length} companies found)\n\n${results.join('\n\n')}\n\n✅ All companies cached for instant follow-up questions!`;
          } catch (error) {
            console.error(`[searchCompaniesByCriteria] Error:`, error);
            return `Search failed: ${String(error)}`;
          }
        },
      }),
      exportToCSV: createTool({
        description: "Export researched companies to CSV format with all CRM fields",
        args: z.object({
          companyNames: z.array(z.string()).describe("List of company names to export"),
          format: z.enum(['csv', 'json']).optional().describe("Export format (default: csv)"),
        }),
        handler: async (_toolCtx: ActionCtx, args): Promise<string> => {
          console.log(`[exportToCSV] Exporting ${args.companyNames.length} companies`);

          const { generateCSVWithMetadata, generateJSON, generateSummaryReport } = await import("./csvExport");

          try {
            // Fetch CRM fields for each company from cache
            const crmFieldsArray = [];
            const notFound = [];

            for (const companyName of args.companyNames) {
              const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
                entityName: companyName,
                entityType: "company",
              });

              if (cached?.crmFields) {
                crmFieldsArray.push(cached.crmFields);
              } else {
                notFound.push(companyName);
              }
            }

            if (crmFieldsArray.length === 0) {
              return `No cached research found for companies: ${args.companyNames.join(', ')}`;
            }

            // Generate export
            let exportData: string;
            // Type cast to ensure proper CRMFields array type
            const typedCrmArray = crmFieldsArray as any[];
            if (args.format === 'json') {
              exportData = generateJSON(typedCrmArray);
            } else {
              exportData = generateCSVWithMetadata(typedCrmArray, {
                title: 'Company Research Export',
                description: `Research data for ${typedCrmArray.length} companies`,
                generatedAt: new Date(),
              });
            }

            // Generate summary
            const summary = generateSummaryReport(typedCrmArray);

            let response = `**Export Complete**\n\n`;
            response += `✅ Exported: ${crmFieldsArray.length} companies\n`;
            if (notFound.length > 0) {
              response += `⚠️ Not found: ${notFound.join(', ')}\n`;
            }
            response += `\n${summary}\n\n`;
            response += `**Export Data (${args.format || 'csv'}):**\n\`\`\`\n${exportData.substring(0, 500)}...\n\`\`\``;

            return response;
          } catch (error) {
            console.error(`[exportToCSV] Error:`, error);
            return `Export failed: ${String(error)}`;
          }
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });
}

/**
 * Document Generation Agent - Generates document content without using tools
 * Returns structured content that the UI can extract and save
 */
export function createDocumentGenerationAgent(_ctx: ActionCtx, _userId: Id<"users"> | null) {
  return new Agent(components.agent, {
    name: "DocumentGenerationAgent",
    languageModel: openai.chat("gpt-5-chat-latest"),
    instructions: `You are a document content generator. When the user asks you to create a document, you should:

1. Generate comprehensive, well-structured content about the requested topic
2. Format the content using markdown with clear headings and sections
3. Return the content in this EXACT format:

<!-- DOCUMENT_METADATA
{
  "title": "Document Title Here",
  "summary": "Brief summary of the document"
}
-->

# Main Title

## Section 1
Content for section 1...

## Section 2
Content for section 2...

The UI will extract the metadata and content to create the actual document.

IMPORTANT:
- Always include the <!-- DOCUMENT_METADATA --> comment at the start
- Use markdown formatting (# for h1, ## for h2, etc.)
- Generate substantial, useful content (not just placeholders)
- Be comprehensive and detailed
- DO NOT use any tools - just generate the content as text`,
    tools: {}, // No tools - just generate text
    stopWhen: stepCountIs(3),
  });
}

/**
 * Coordinator Agent - Routes requests to specialized agents
 */
export function createCoordinatorAgent(_ctx: ActionCtx, userId: Id<"users">) {
  return new Agent(components.agent, {
    name: "CoordinatorAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: `You are a coordinator agent that IMMEDIATELY delegates user requests to specialized agents.

CRITICAL: DO NOT ask clarifying questions. DO NOT try to answer directly. IMMEDIATELY call the appropriate delegation tool(s).

AVAILABLE SPECIALIZED AGENTS:
1. DocumentAgent - For finding, reading, creating, and managing documents
2. MediaAgent - For YouTube videos, images, and media search
3. SECAgent - For SEC filings and financial documents
4. WebAgent - For web search and general information
5. EntityResearchAgent - For researching companies and people (funding, competitors, work history, etc.)

IMMEDIATE DELEGATION RULES:
1. Analyze the user's request
2. IMMEDIATELY call the appropriate delegation tool(s) - NO QUESTIONS
3. You can call MULTIPLE delegation tools in parallel if needed
4. Pass the user's EXACT query to the delegation tool
5. Return the results from the specialized agent(s)

EXAMPLES - IMMEDIATE DELEGATION:
- "Find me documents and videos about Google" → IMMEDIATELY call delegateToDocumentAgent("Find me documents about Google") AND delegateToMediaAgent("Find me videos about Google")
- "Get Apple's 10-K filing" → IMMEDIATELY call delegateToSECAgent("Get Apple's 10-K filing")
- "Search for cat images" → IMMEDIATELY call delegateToMediaAgent("Search for cat images")
- "What's the latest news on AI?" → IMMEDIATELY call delegateToWebAgent("What's the latest news on AI?")
- "Show me the revenue report" → IMMEDIATELY call delegateToDocumentAgent("Show me the revenue report")
- "Find YouTube videos about Python programming" → IMMEDIATELY call delegateToMediaAgent("Find YouTube videos about Python programming")
- "Find videos about Python" → IMMEDIATELY call delegateToMediaAgent("Find videos about Python")
- "Find the revenue report" → IMMEDIATELY call delegateToDocumentAgent("Find the revenue report")
- "Make new document" → IMMEDIATELY call delegateToDocumentAgent("Make new document")
- "Create a document" → IMMEDIATELY call delegateToDocumentAgent("Create a document")
- "Create a new document about X" → IMMEDIATELY call delegateToDocumentAgent("Create a new document about X")
- "Research Anthropic" → IMMEDIATELY call delegateToEntityResearchAgent("Research Anthropic")
- "Tell me about Sam Altman" → IMMEDIATELY call delegateToEntityResearchAgent("Tell me about Sam Altman")
- "Compare Anthropic and OpenAI" → IMMEDIATELY call delegateToEntityResearchAgent("Compare Anthropic and OpenAI")
- "What's Anthropic's funding?" → IMMEDIATELY call delegateToEntityResearchAgent("What's Anthropic's funding?")

CRITICAL RULES:
1. NEVER ask clarifying questions - delegate immediately
2. NEVER try to answer directly - always use delegation tools
3. Use parallel delegation when multiple agents are needed
4. Pass the user's query directly to the specialized agent
5. The specialized agents will handle any clarifications needed

RESPONSE STYLE:
- Return the specialized agent's response directly
- If multiple agents were called, combine their responses
- Don't mention the delegation process to the user`,
    tools: {
      delegateToDocumentAgent: createTool({
        description: "Delegate document-related queries to the Document Agent",
        args: z.object({
          query: z.string().describe("The user's query about documents"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          console.log('[delegateToDocumentAgent] Delegating query:', args.query);
          console.log('[delegateToDocumentAgent] toolCtx.evaluationUserId:', (toolCtx as any).evaluationUserId);

          const documentAgent = createDocumentAgent(toolCtx, userId);
          const threadId = (toolCtx as any).threadId;

          // toolCtx should already have evaluationUserId from parent agent's streamText call
          // Just pass it through directly to the specialized agent
          const result = await documentAgent.streamText(
            toolCtx,
            { threadId },
            { prompt: args.query }
          );

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToDocumentAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
      delegateToMediaAgent: createTool({
        description: "Delegate media-related queries (YouTube, images, videos) to the Media Agent",
        args: z.object({
          query: z.string().describe("The user's query about media/videos/images"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          console.log('[delegateToMediaAgent] Delegating query:', args.query);
          const mediaAgent = createMediaAgent(toolCtx, userId);
          const threadId = (toolCtx as any).threadId;

          // toolCtx should already have evaluationUserId from parent agent's streamText call
          const result = await mediaAgent.streamText(
            toolCtx,
            { threadId },
            { prompt: args.query }
          );

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToMediaAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
      delegateToSECAgent: createTool({
        description: "Delegate SEC filing queries to the SEC Agent",
        args: z.object({
          query: z.string().describe("The user's query about SEC filings"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          console.log('[delegateToSECAgent] Delegating query:', args.query);
          const secAgent = createSECAgent(toolCtx, userId);
          const threadId = (toolCtx as any).threadId;

          // toolCtx should already have evaluationUserId from parent agent's streamText call
          const result = await secAgent.streamText(
            toolCtx,
            { threadId },
            { prompt: args.query }
          );

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToSECAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
      delegateToWebAgent: createTool({
        description: "Delegate web search queries to the Web Agent",
        args: z.object({
          query: z.string().describe("The user's query about web information"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          console.log('[delegateToWebAgent] Delegating query:', args.query);
          const webAgent = createWebAgent(toolCtx, userId);
          const threadId = (toolCtx as any).threadId;

          // toolCtx should already have evaluationUserId from parent agent's streamText call
          const result = await webAgent.streamText(
            toolCtx,
            { threadId },
            { prompt: args.query }
          );

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToWebAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
      delegateToEntityResearchAgent: createTool({
        description: "Delegate entity research queries (companies, people) to the Entity Research Agent",
        args: z.object({
          query: z.string().describe("The user's query about companies or people"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          console.log('[delegateToEntityResearchAgent] Delegating query:', args.query);
          const entityResearchAgent = createEntityResearchAgent(toolCtx, userId);
          const threadId = (toolCtx as any).threadId;

          // toolCtx should already have evaluationUserId from parent agent's streamText call
          const result = await entityResearchAgent.streamText(
            toolCtx,
            { threadId },
            { prompt: args.query }
          );

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToEntityResearchAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
    },
    stopWhen: stepCountIs(10), // Allow multiple delegations
  });
}


