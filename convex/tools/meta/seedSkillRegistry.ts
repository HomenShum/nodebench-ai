"use node";

/**
 * Skill Registry Seeding
 *
 * Seeds the skills table with core workflow definitions.
 * Based on Anthropic's Skills specification (v1.0, October 2025).
 */

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

// ═══════════════════════════════════════════════════════════════════════════
// SKILL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

interface SkillDefinition {
  name: string;
  description: string;
  fullInstructions: string;
  category: string;
  categoryName: string;
  keywords: string[];
  allowedTools?: string[];
  license?: string;
}

const CORE_SKILLS: SkillDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // SKILL 1: Company Research
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "company-research",
    description: "Research a company comprehensively including SEC filings, news, media, and create a dossier document",
    category: "research",
    categoryName: "Research Workflows",
    keywords: ["company", "research", "dossier", "SEC", "filings", "news", "analysis", "due diligence"],
    allowedTools: ["searchAvailableTools", "describeTools", "invokeTool", "delegateToAgent"],
    license: "Apache-2.0",
    fullInstructions: `## Company Research Workflow

### Overview
This skill guides you through comprehensive company research, combining SEC filings, news, media, and web data into a structured dossier.

### Step 1: Identify the Company
1. Confirm the company name and ticker symbol
2. If ambiguous, search SEC EDGAR to find the correct CIK
3. Note any subsidiaries or related entities

### Step 2: Gather SEC Filings
1. Use \`delegateToAgent({ agentType: "sec" })\` to:
   - Fetch recent 10-K (annual) and 10-Q (quarterly) filings
   - Extract key financial metrics
   - Identify risk factors and management discussion
2. Summarize findings in structured format

### Step 3: Collect News & Media
1. Use \`delegateToAgent({ agentType: "media" })\` to:
   - Search for recent news articles
   - Find relevant YouTube videos and interviews
   - Gather analyst reports if available
2. Prioritize sources by recency and credibility

### Step 4: Research Founders & Leadership
1. Use \`delegateToAgent({ agentType: "entity" })\` to:
   - Research key executives and founders
   - Find LinkedIn profiles and backgrounds
   - Identify board members and advisors

### Step 5: Competitive Analysis
1. Identify 3-5 key competitors
2. Compare market positioning
3. Note competitive advantages and threats

### Step 6: Create Dossier Document
1. Use \`invokeTool({ toolName: "createDocument" })\` to create a new dossier
2. Structure the document with sections:
   - Executive Summary
   - Company Overview
   - Financial Highlights
   - Leadership Team
   - Recent News & Developments
   - Competitive Landscape
   - Key Risks
   - Sources & References

### Output Format
Return a summary of findings and the created dossier document ID.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SKILL 2: Document Creation
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "document-creation",
    description: "Create well-structured documents with proper formatting, sections, and content organization",
    category: "document",
    categoryName: "Document Management",
    keywords: ["document", "create", "write", "format", "structure", "template", "report", "memo"],
    allowedTools: ["createDocument", "updateDocument", "searchDocuments"],
    license: "Apache-2.0",
    fullInstructions: `## Document Creation Workflow

### Overview
This skill guides you through creating well-structured documents with proper formatting and organization.

### Step 1: Understand Requirements
1. Clarify the document type (report, memo, analysis, notes)
2. Identify the target audience
3. Determine required sections and length

### Step 2: Create Document Structure
1. Use \`invokeTool({ toolName: "createDocument" })\` with:
   - Descriptive title
   - Appropriate document type
2. Plan the section hierarchy:
   - Main headings (H1)
   - Subheadings (H2, H3)
   - Bullet points for lists

### Step 3: Draft Content
1. Write clear, concise content for each section
2. Use formatting appropriately:
   - **Bold** for emphasis
   - *Italics* for terms
   - \`Code\` for technical content
   - > Blockquotes for citations

### Step 4: Add Supporting Elements
1. Include relevant links and references
2. Add tables for structured data
3. Reference related documents if applicable

### Step 5: Review and Polish
1. Check for logical flow
2. Verify formatting consistency
3. Ensure all sections are complete

### Document Types
- **Dossier**: Research compilation with sources
- **Report**: Formal analysis with conclusions
- **Notes**: Quick capture of information
- **Memo**: Brief communication
- **Template**: Reusable structure

### Output Format
Return the document ID and a brief summary of what was created.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SKILL 3: Media Research
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "media-research",
    description: "Discover and analyze media content including videos, news articles, and images for a topic",
    category: "media",
    categoryName: "Media Discovery",
    keywords: ["media", "video", "youtube", "news", "images", "search", "discover", "content"],
    allowedTools: ["delegateToAgent", "searchAvailableTools", "invokeTool"],
    license: "Apache-2.0",
    fullInstructions: `## Media Research Workflow

### Overview
This skill guides you through discovering and analyzing media content across multiple sources.

### Step 1: Define Search Scope
1. Clarify the topic or entity to research
2. Determine media types needed:
   - Videos (YouTube, interviews)
   - News articles
   - Images and infographics
   - Podcasts or audio content

### Step 2: Video Discovery
1. Use \`delegateToAgent({ agentType: "media" })\` to:
   - Search YouTube for relevant videos
   - Find interviews and presentations
   - Identify educational content
2. Prioritize by:
   - View count and engagement
   - Recency
   - Source credibility

### Step 3: News Collection
1. Search for recent news articles
2. Include multiple sources for balance
3. Note publication dates and authors

### Step 4: Image Search
1. Find relevant images and infographics
2. Verify image sources and rights
3. Prioritize high-quality visuals

### Step 5: Organize Findings
1. Group media by type and relevance
2. Create summaries for key pieces
3. Note any conflicting information

### Step 6: Create Media Summary
1. Compile findings into a structured format:
   - Top Videos (with links and descriptions)
   - Key News Articles (with summaries)
   - Notable Images (with context)
   - Recommended Content (prioritized list)

### Output Format
Return a structured media summary with links, descriptions, and recommendations.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SKILL 4: Financial Analysis
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "financial-analysis",
    description: "Analyze financial data from SEC filings, market data, and create financial summaries",
    category: "financial",
    categoryName: "Financial Analysis",
    keywords: ["financial", "SEC", "10-K", "10-Q", "earnings", "revenue", "analysis", "metrics", "stocks"],
    allowedTools: ["delegateToAgent", "searchAvailableTools", "invokeTool"],
    license: "Apache-2.0",
    fullInstructions: `## Financial Analysis Workflow

### Overview
This skill guides you through comprehensive financial analysis using SEC filings and market data.

### Step 1: Identify the Company
1. Confirm company name and ticker symbol
2. Find the CIK number for SEC lookups
3. Note the fiscal year end date

### Step 2: Gather SEC Filings
1. Use \`delegateToAgent({ agentType: "sec" })\` to:
   - Fetch most recent 10-K (annual report)
   - Fetch recent 10-Q (quarterly reports)
   - Get 8-K filings for material events
2. Extract key sections:
   - Financial statements
   - Management Discussion & Analysis (MD&A)
   - Risk factors

### Step 3: Extract Key Metrics
1. Revenue and revenue growth
2. Net income and margins
3. Cash flow from operations
4. Debt levels and ratios
5. Key performance indicators (KPIs)

### Step 4: Market Data (if available)
1. Use \`delegateToAgent({ agentType: "openbb" })\` for:
   - Current stock price and market cap
   - Historical price performance
   - Analyst ratings and price targets
   - Peer comparisons

### Step 5: Trend Analysis
1. Compare metrics across periods
2. Identify growth or decline patterns
3. Note any significant changes

### Step 6: Create Financial Summary
1. Structure the analysis:
   - Company Overview
   - Key Financial Metrics (table format)
   - Revenue & Profitability Trends
   - Balance Sheet Highlights
   - Cash Flow Analysis
   - Risk Factors
   - Outlook & Recommendations

### Output Format
Return a structured financial summary with key metrics, trends, and analysis.`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SKILL 5: Bulk Entity Research
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "bulk-entity-research",
    description: "Research multiple companies or entities in parallel with criteria-based filtering and CSV export",
    category: "research",
    categoryName: "Research Workflows",
    keywords: ["bulk", "batch", "multiple", "companies", "entities", "list", "CSV", "export", "parallel"],
    allowedTools: ["delegateToAgent", "searchAvailableTools", "invokeTool"],
    license: "Apache-2.0",
    fullInstructions: `## Bulk Entity Research Workflow

### Overview
This skill guides you through researching multiple companies or entities efficiently with parallel processing.

### Step 1: Define Entity List
1. Get the list of companies/entities to research
2. Options for input:
   - Named list (e.g., "Apple, Google, Microsoft")
   - Criteria-based (e.g., "healthcare startups, seed stage, founded after 2022")
3. Confirm the list before proceeding

### Step 2: Define Research Fields
1. Standard CRM fields:
   - Company name and HQ location
   - Founders and key executives
   - Contact information (phones, emails)
   - Company description and product
   - Industry and stage
2. Optional fields:
   - FDA timeline (for healthcare)
   - News timeline with sources
   - Investors and their backgrounds
   - Competitors with rationale
   - Research papers

### Step 3: Parallel Research Execution
1. For each entity in the list:
   - Use \`delegateToAgent({ agentType: "entity" })\` for basic info
   - Use \`delegateToAgent({ agentType: "media" })\` for news
   - Use \`delegateToAgent({ agentType: "sec" })\` for public companies
2. Execute in parallel batches (3-5 at a time)
3. Collect and normalize results

### Step 4: Apply Filters (if criteria-based)
1. Filter by funding stage
2. Filter by industry/sector
3. Filter by founding year
4. Filter by founder experience
5. Remove entities that don't match criteria

### Step 5: Compile Results
1. Aggregate all research into structured format
2. Normalize field names and values
3. Handle missing data gracefully

### Step 6: Export to CSV
1. Create CSV with columns for each field
2. Include source URLs where available
3. Add timestamp and research date

### Output Format
Return:
- Summary of entities researched
- Count of matches (if filtered)
- CSV file or structured data for export`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SEEDING ACTION
// ═══════════════════════════════════════════════════════════════════════════

export const seedSkillRegistry = internalAction({
  args: {
    generateEmbeddings: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    seeded: number;
    updated: number;
    errors: string[];
  }> => {
    const { generateEmbeddings = true } = args;
    let seeded = 0;
    let updated = 0;
    const errors: string[] = [];

    console.log(`[seedSkillRegistry] Seeding ${CORE_SKILLS.length} skills...`);

    for (const skill of CORE_SKILLS) {
      try {
        // Generate embedding if requested
        let embedding: number[] | undefined;
        if (generateEmbeddings) {
          try {
            embedding = await ctx.runAction(
              internal.tools.meta.skillDiscovery.generateSkillEmbedding,
              {
                skillName: skill.name,
                description: skill.description,
                keywords: skill.keywords,
                fullInstructions: skill.fullInstructions,
              }
            );
          } catch (embError: any) {
            console.warn(`[seedSkillRegistry] Embedding failed for ${skill.name}:`, embError.message);
          }
        }

        // Upsert the skill (mutation is in seedSkillRegistryQueries.ts)
        const result = await ctx.runMutation(
          internal.tools.meta.seedSkillRegistryQueries.upsertSkill,
          {
            name: skill.name,
            description: skill.description,
            fullInstructions: skill.fullInstructions,
            category: skill.category,
            categoryName: skill.categoryName,
            keywords: skill.keywords,
            keywordsText: skill.keywords.join(" "),
            embedding,
            allowedTools: skill.allowedTools,
            license: skill.license,
          }
        );

        if (result.action === "created") {
          seeded++;
          console.log(`[seedSkillRegistry] Created skill: ${skill.name}`);
        } else {
          updated++;
          console.log(`[seedSkillRegistry] Updated skill: ${skill.name}`);
        }
      } catch (error: any) {
        errors.push(`${skill.name}: ${error.message}`);
        console.error(`[seedSkillRegistry] Error seeding ${skill.name}:`, error);
      }
    }

    console.log(`[seedSkillRegistry] Complete: ${seeded} created, ${updated} updated, ${errors.length} errors`);

    return { seeded, updated, errors };
  },
});

