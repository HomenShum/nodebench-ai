# PRD: Automated Email Intelligence & Research Pipeline

**Product**: Gmail-to-Research Dossier Automation
**Version**: 1.0
**Date**: 2025-12-07
**Status**: Design Phase
**Owner**: NodeBench AI Team

---

## Executive Summary

Build an automated pipeline that **ingests inbound Gmail emails, extracts company/people mentions, conducts deep research using existing Deep Agents 2.0 infrastructure, and generates comprehensive dossiers** delivered back via email or stored as documents.

**Use Case Example**:
Email from `john@voltai.com` → System extracts "VoltAI" company → Researches:
- Company: VoltAI.com (semiconductor design AI)
- Team: IOI/IPhO olympiad gold medalists, Stanford professors, ex-IC9 Meta, Cadence/Synopsys execs
- Investors: $36M Series A led by Sequoia Capital
- Your Value Add: Agent/reasoning models for semiconductor design
- Action Items: Meeting prep, partnership proposal, demo strategy

→ **Delivers research dossier within 5 minutes**

---

## Problem Statement

### Current Pain Points
1. **Manual Email Triage**: Hours spent reading emails, identifying important contacts
2. **Research Overhead**: Each new company/investor requires 30-60 minutes of research
3. **Context Switching**: Jumping between LinkedIn, Crunchbase, SEC filings, news sites
4. **Lost Opportunities**: Missing high-value connections due to lack of preparation
5. **Repetitive Work**: Same research patterns for every inbound business email

### Target User
- **VCs, Angel Investors**: Research deal flow automatically
- **Sales/BD Teams**: Prepare for cold outreach, inbound leads
- **Executives**: Prep for networking events, investor meetings
- **Recruiters**: Background check on candidates, companies

---

## Goals & Success Metrics

### Primary Goals
1. **Automate 95% of email research tasks**
2. **Reduce research time from 30-60 min → 2-5 min** (automated)
3. **Achieve >90% accuracy** in company/investor identification
4. **Generate investment-grade dossiers** with citations

### Success Metrics
- **Processing Time**: <5 minutes from email receipt to dossier delivery
- **Accuracy**: >90% correct company/person identification
- **Completeness**: >80% of dossiers include funding, founders, and thesis
- **User Satisfaction**: >4.5/5 star rating on dossier quality
- **Adoption**: >70% of inbound business emails processed automatically

---

## Core Features

### Phase 1: MVP (Weeks 1-2)

#### 1.1 Gmail Email Parser
**Component**: `convex/tools/email/emailIntelligenceParser.ts`

**Functionality**:
```typescript
parseEmailForIntelligence({
  maxEmails: 20,
  unreadOnly: true,
  filterSenders: ["*@voltai.com", "*@sequoiacap.com"], // VIP list
  keywords: ["investment", "partnership", "demo", "meeting"]
})
```

**Extraction Logic**:
- **Company Mentions**: Email domain → Company lookup (voltai.com → "VoltAI")
- **People**: Sender name, email signature parsing
- **Context Keywords**: "raised $36M", "Series A", "led by Sequoia", "IOI gold medalist"
- **Intent Detection**: Meeting request, investment inquiry, partnership proposal
- **Urgency**: Calendar invite, "urgent", "this week"

**Output**:
```typescript
{
  emailId: "msg_123",
  from: "john@voltai.com",
  subject: "Partnership Opportunity - AI for Semiconductor Design",
  entities: {
    companies: ["VoltAI"],
    people: ["John Doe"],
    investors: ["Sequoia Capital"],
    keywords: ["IOI gold medalist", "$36M Series A", "semiconductor AI"]
  },
  intent: "partnership_inquiry",
  urgency: "high",
  snippets: ["We're a team of IOI/IPhO olympiad gold medalists..."]
}
```

#### 1.2 Entity Research Orchestrator
**Component**: `convex/workflows/emailResearchOrchestrator.ts`

**Flow**:
```typescript
orchestrateEmailResearch(emailId: string) {
  1. Parse email → Extract entities
  2. Check memory: queryMemory(company) → Skip if recent
  3. Parallel delegation:
     - delegateToEntityResearchAgent (company deep dive)
     - enrichFounderInfo (team members)
     - enrichInvestmentThesis (why funded, market positioning)
     - linkupSearch (recent news, "past week")
     - searchSecFilings (if public)
  4. Aggregate results → Structured dossier
  5. Generate action items (your unique value proposition)
  6. Persist to GAM memory
  7. Create dossier document + email
}
```

**Parallel Research Tracks**:

**Track 1: Company Research**
- Tool: `enrichCompanyDossier` (all-in-one)
- Data: HQ, industry, employee count, website, founding date
- Data: Product description, tech stack, competitors
- Data: Patents/IP (if applicable)

**Track 2: Founder/Team Research**
- Tool: `enrichFounderInfo`
- For each person mentioned:
  - LinkedIn profile (via LLM-powered search + verification)
  - Previous companies, exits
  - Education (Stanford, MIT, etc.)
  - Achievements (olympiad medals, publications)
  - Social media presence

**Track 3: Investor Intelligence**
- Tool: `smartFundingSearch` + `linkupSearch`
- Funding rounds (Seed, Series A, B, C)
- Lead investors + check size
- Investment thesis (from Sequoia blog, press releases)
- Valuation, cap table (if public via SEC)
- Co-investors, syndicate analysis

**Track 4: Market Context**
- Tool: `linkupSearch` (temporal filtering)
- Recent news (past 7 days, 30 days)
- Product launches, partnerships
- Competitor landscape (other semiconductor AI companies)
- Industry trends (AI in EDA, reasoning models)

**Track 5: Action Items Generator**
- **Input**: Your profile ("building agents for semiconductor design, working with largest semi companies")
- **Analysis**: Overlap detection (their need vs your expertise)
- **Output**:
  - Highest value-add: "Offer to demo reasoning models for verification"
  - Partnership angle: "Co-develop agents for DRC/LVS"
  - Meeting prep: "Ask about current verification challenges"
  - Follow-up: "Share case study from TSMC/Intel project"

**Track 6: Deep Agent PRD Composition** (NEW - Phase 1.5)
- **Trigger**: Email contains partnership/demo request with technical details
- **Tool**: `delegateToCoordinatorAgent` (Deep Agents 2.0 with full tool access)
- **Prompt Template**:
  ```
  Based on the following partnership request, research deeply and compose a comprehensive PRD:

  Company: {company_name}
  Their Product: {product_description}
  Their Request: {email_body}

  Our Expertise: Building agents and reasoning models for semiconductor design/verification,
  working with the largest semiconductor companies around the world (TSMC, Intel, Samsung, etc.)

  Research and create a PRD that includes:
  1. Executive Summary (1-2 paragraphs)
  2. Problem Statement (their pain points we can solve)
  3. Proposed Solution Architecture (how our agents/reasoning models integrate)
  4. Technical Specifications (APIs, data models, integration points)
  5. Success Metrics (KPIs, benchmarks)
  6. Implementation Timeline (phased rollout)
  7. Risk Assessment (technical, business, competitive)
  8. Pricing & Business Model (pilot, enterprise, licensing)

  Use all available tools: web search, SEC filings, technical documentation, competitor analysis.
  Output should be investment-grade, 10-15 pages, ready to share with their engineering team.
  ```
- **Tools Available to Deep Agent**:
  - `linkupSearch` (technical documentation, competitor products)
  - `searchSecFilings` (if public, understand their IP/tech stack)
  - `searchHashtag` (industry trends: #semiconductor #EDA #AI)
  - `createHashtagDossier` (aggregate all research into dossier)
  - `sequentialThinking` (break down complex PRD into steps)
  - `createPlan` + `updatePlanStep` (MCP planning tools)
- **Output Format**:
  - Markdown document (20-30 KB)
  - Stored as Convex document with type: "prd"
  - Linked to original email thread
  - Exported as PDF for sharing
- **Delivery**:
  - Email subject: "Partnership PRD: {Company} x NodeBench AI"
  - Body: Executive summary + link to full PRD document
  - Attachment: PDF export (optional)
  - In-app: Dossier document with "View PRD" button
- **Example Output Sections**:
  ```markdown
  # Partnership PRD: VoltAI x NodeBench AI
  ## Reasoning Models for Semiconductor Verification

  ### 1. Executive Summary
  VoltAI is building AI-first semiconductor design tools. NodeBench AI's reasoning models
  for DRC/LVS verification can integrate as a core module, providing 10x faster constraint
  solving. This PRD outlines a 3-phase pilot...

  ### 2. Problem Statement
  - VoltAI's current heuristic-based verification has 40% false positive rate
  - Manual review costs $2M/year in engineering time
  - NodeBench reasoning models reduce false positives to <5%

  ### 3. Proposed Solution Architecture
  ┌─────────────────────────────────────┐
  │   VoltAI Cloud Platform             │
  │   ├─ Design Entry (existing)        │
  │   ├─ Layout Optimization (existing) │
  │   └─ Verification Module (NEW)      │
  │       ├─ DRC Engine (heuristic)     │
  │       └─ Reasoning Model API ←──────┼─── NodeBench AI
  └─────────────────────────────────────┘

  API Integration:
  - RESTful API: POST /verify with GDSII file
  - Returns: Constraint violations with confidence scores
  - Latency: <500ms for 1M transistor designs

  ### 4. Technical Specifications
  [Deep agent researches VoltAI's tech stack, proposes data models]

  ### 5. Success Metrics
  - False positive rate: 40% → <5% (8x improvement)
  - Verification time: 4 hours → 30 minutes (8x speedup)
  - Cost savings: $2M/year → pilot ROI in 3 months

  ### 6. Implementation Timeline
  Phase 1 (Month 1-2): Pilot with 5 RISC-V designs
  Phase 2 (Month 3-4): Production integration, 100 designs/month
  Phase 3 (Month 5-6): Enterprise rollout to VoltAI customers

  ### 7. Risk Assessment
  Technical Risks:
  - Integration complexity with existing EDA tools (Medium)
  - Model accuracy on advanced nodes <7nm (Low - benchmarked)
  Mitigation: 30-day pilot with side-by-side comparison

  ### 8. Pricing & Business Model
  Pilot: Free (30 days, 100 designs)
  Enterprise: $50K/year + $5/design API call
  Licensing: 20% revenue share on VoltAI customer deals
  ```
- **Processing Time**: 10-15 minutes (deep research + PRD composition)
- **Confidence Score**: Agent self-rates PRD quality (1-100) based on:
  - Research depth (how many sources cited)
  - Technical accuracy (validated against public docs)
  - Completeness (all 8 sections present)
  - Actionability (clear next steps, timelines)

#### 1.3 Dossier Generator
**Component**: `convex/lib/dossierGenerator.ts`

**Template Structure** (extends existing `DossierEmailData`):
```typescript
interface EmailIntelligenceDossier {
  // Core Company Data
  company: {
    name: string;
    domain: string;
    description: string;
    headquarters: string;
    founded: string;
    industry: string;
    employeeCount: string;
    website: string;
    productDescription: string;
    stage: "Pre-Seed" | "Seed" | "Series A" | "Series B+" | "Public";
  };

  // Team & People
  team: Array<{
    name: string;
    role: string;
    education: string[];      // ["Stanford PhD", "IOI Gold"]
    previousCompanies: string[];
    achievements: string[];
    linkedin: string;
    twitter: string;
    bio: string;
  }>;

  // Funding & Investors
  funding: {
    totalRaised: string;      // "$36M"
    latestRound: {
      round: "Series A";
      amount: "$36M";
      date: "2024-Q3";
      leadInvestor: "Sequoia Capital";
      participants: string[];
      valuation?: string;
    };
    rounds: FundingRound[];
    investorProfiles: Array<{
      name: string;
      type: "VC" | "Angel" | "Corporate";
      thesis: string;         // Why they invested
      portfolioFit: string[]; // Similar companies
    }>;
  };

  // Market & Competition
  market: {
    industry: "Semiconductor Design Automation";
    marketSize: string;
    competitors: string[];
    differentiators: string[];
    technicalMoat: string;
  };

  // Research Links & Citations
  sources: Array<{
    title: string;
    url: string;
    type: "news" | "filing" | "blog" | "linkedin" | "crunchbase";
    date: string;
    snippet: string;
    credibility: "verified" | "secondary";
  }>;

  // Action Items (CUSTOM)
  actionItems: {
    valueProposition: string[];  // How you can help
    meetingTopics: string[];     // What to discuss
    partnerships: string[];      // Potential collaboration areas
    followUp: string[];          // Next steps
    risks: string[];             // Red flags to probe
  };

  // Metadata
  metadata: {
    generatedAt: number;
    emailSource: string;
    researchDurationMs: number;
    confidenceScore: number;     // 0-100
    freshnessDate: string;       // Latest data point timestamp
  };
}
```

**Output Formats**:
1. **Email HTML**: Newsletter-style (existing template)
2. **Document**: Markdown with citations (store in Convex)
3. **JSON API**: For programmatic access

#### 1.4 Delivery Mechanisms

**Option A: Email Digest** (Default)
- Send to user's email daily at 8am
- Subject: "Daily Email Intelligence: 3 New Companies Researched"
- Body: 3-5 company dossiers with rich HTML
- CTA: "View Full Dossier in App"

**Option B: Real-Time Push** (Premium)
- Trigger on VIP sender (Sequoia partner emails you)
- Instant notification + dossier within 5 min
- Slack/SMS integration

**Option C: In-App Dashboard**
- Sidebar widget: "Email Intelligence Feed"
- Shows recent dossiers as cards
- Click to expand full research

---

### Phase 1.5: Deep Agent PRD Composer (Week 2.5-3)

**Priority**: HIGH - Core differentiator for technical partnerships

#### 1.6 Automated PRD Generation
**Component**: `convex/workflows/prdComposerWorkflow.ts`

**Trigger Conditions**:
- Email intent classified as "partnership_inquiry" or "demo_request"
- Email body contains technical keywords (API, integration, pilot, verification, etc.)
- Company is in target industry (semiconductor, EDA, hardware)
- User profile matches partnership opportunity (your expertise)

**Deep Agent Delegation**:
```typescript
const prd = await delegateToCoordinatorAgent(ctx, {
  prompt: `Research ${companyName} deeply and compose a comprehensive partnership PRD...`,
  tools: "all", // Full tool access (35+ tools)
  maxSteps: 15, // Allow multi-step research
  outputFormat: "markdown", // Structured PRD document
  targetLength: "10-15 pages"
});
```

**Research Workflow** (Deep Agent 2.0):
1. **Plan Creation**: Agent calls `createPlan` (MCP tool) to break down PRD into sections
2. **Parallel Research**:
   - `linkupSearch`: Company's technical blog, documentation, GitHub
   - `searchSecFilings`: S-1 for tech stack details, IP portfolio
   - `searchHashtag`: Industry trends (#semiconductor #EDA #AI)
   - `delegateToSECAgent`: Deep dive on patents, competitive moats
3. **Sequential Composition**:
   - Section 1 (Exec Summary): 2-3 tool calls
   - Section 2 (Problem Statement): 3-5 tool calls (research their pain points)
   - Section 3 (Solution Architecture): Technical design based on your capabilities
   - Section 4-8: Iterative research + writing
4. **Quality Check**:
   - Agent self-reviews PRD for completeness
   - Validates all claims have citations
   - Ensures technical accuracy
5. **Delivery**:
   - Store as Convex document (type: "prd")
   - Generate PDF export
   - Send email with executive summary + link

**Example PRD Structure** (VoltAI Case):
```markdown
# Partnership PRD: VoltAI x NodeBench AI
**Date**: 2024-12-07
**Version**: 1.0
**Status**: Proposal

## Executive Summary
VoltAI is a Series A semiconductor AI startup ($36M from Sequoia) building reasoning
models for chip verification. NodeBench AI's expertise in agents for semiconductor
design/verification presents a strategic partnership opportunity...

[Agent researches and fills in 10-15 pages with technical depth]

## Appendix A: Competitive Analysis
[Agent researches Cadence, Synopsys, compares capabilities]

## Appendix B: Reference Architecture
[Agent designs API integration points]
```

**Quality Metrics**:
- Research depth: Minimum 10 cited sources
- Technical accuracy: Cross-validated against 2+ sources
- Completeness: All 8 required sections present
- Actionability: Clear timeline, pricing, next steps
- Confidence score: Agent self-rates 80-100 for high-quality PRDs

**Delivery Options**:
1. **Email**: Subject "Partnership PRD: VoltAI x NodeBench AI" + PDF attachment
2. **In-App**: Dossier document with "Download PRD" button
3. **Slack** (future): Push notification with link
4. **API**: Export as JSON for CRM integration

**Processing Time**: 10-15 minutes (deep research + composition)

---

### Phase 2: Advanced Features (Weeks 3-4)

#### 2.1 Multi-PRD Comparison
- When multiple partnership emails arrive, generate comparative PRD
- "VoltAI vs Synopsys Partnership Analysis"
- Side-by-side feature matrix, ROI comparison

#### 2.2 Relationship Graph
- Build knowledge graph: Company ↔ Founders ↔ Investors
- Visualize 2nd degree connections
- "You know John at Sequoia who knows Jane at VoltAI"

#### 2.3 Predictive Scoring
- Investment attractiveness score (1-100)
- Partnership fit score based on your expertise
- Response urgency (should you reply within 24h?)
- **PRD Auto-Generation Score**: Predict if email warrants full PRD (vs simple dossier)

#### 2.4 Smart Follow-Up with PRD Context
- Auto-draft response emails with PRD executive summary
- "Thanks for reaching out. I've researched VoltAI's verification platform and drafted a partnership PRD (attached). Key highlights: [3 bullets from PRD]"
- Calendar link integration
- PRD as meeting pre-read

#### 2.5 Competitive Intelligence
- Track when competitors get funded
- Monitor hiring trends (LinkedIn job postings)
- Patent filing alerts
- Automated PRD updates when competitor landscape changes

---

## UI/UX Design Pattern: Scrollytelling Architecture

### Overview

The Email Intelligence dashboard and PRD presentation will follow a **"Scrollytelling"** design pattern - an interactive narrative-driven interface that combines scrollable content with dynamic visualizations. This pattern is inspired by academic-style interactive storytelling (e.g., AI 2027 forecast) and provides an executive-grade reading experience.

### Core Design Principles

1. **Decoupled Scrolling**: Text narrative (left) scrolls independently while visualizations (right) remain sticky
2. **Context-Driven Updates**: Dashboard updates based on scroll position using Intersection Observers
3. **Smooth Transitions**: Framer Motion animations for all data changes (no sudden jumps)
4. **Interactive Enrichment**: Smart hover links with AI summaries, expandable deep dives
5. **JSON-Driven Content**: Agents output structured data that the UI simply renders

---

### Layout Architecture

#### Left Column (Scrollable Narrative)
- **Width**: 60-70% of viewport
- **Content**: Chronological research narrative divided into logical sections
- **Sections**: Each section has metadata (date, title), body text, deep dives, and smart links
- **Scroll Tracking**: Intersection Observer detects which section is 50%+ visible

#### Right Column (Sticky Dashboard)
- **Width**: 30-40% of viewport
- **Position**: `position: sticky; top: 12px`
- **Content**: Dynamic KPIs, charts, metrics that update as user scrolls through narrative
- **Animation**: Smooth transitions between data states (count-up numbers, bar chart tweens)

---

### Component Architecture

#### 1. Data Contract (JSON Schema)

**File**: `src/features/emailIntelligence/content/dossierStream.json`

```json
[
  {
    "id": "section-1-company-overview",
    "meta": {
      "date": "2024-12-07",
      "title": "VoltAI: Company Overview"
    },
    "content": {
      "body": [
        "VoltAI is a Series A semiconductor AI startup that raised $36M from <SmartLink id='sequoia'>Sequoia Capital</SmartLink>.",
        "Their team includes <SmartLink id='olympiad-talent'>IOI/IPhO gold medalists</SmartLink> and ex-Synopsys CTO."
      ],
      "deepDives": [
        {
          "title": "Why Sequoia Invested",
          "content": "Sequoia's thesis: AI-first semiconductor tools can 10x designer productivity by automating DRC/LVS verification..."
        }
      ]
    },
    "dashboard": {
      "phaseLabel": "Series A - Growth Stage",
      "kpis": [
        { "label": "Total Funding", "value": 36, "unit": "M", "color": "bg-blue-600", "prefix": "$" },
        { "label": "Team Size", "value": 35, "unit": "employees", "color": "bg-green-500" },
        { "label": "Market Share", "value": 2, "unit": "%", "color": "bg-amber-400" }
      ],
      "fundingChart": {
        "seed": 4,
        "seriesA": 36,
        "valuation": 150
      },
      "investorLogos": ["sequoia", "a16z", "intel-capital"]
    },
    "smartLinks": {
      "sequoia": {
        "summary": "Sequoia Capital is a VC firm with $85B AUM. Portfolio includes Apple, Google, Airbnb. Known for investing in category-defining companies.",
        "source": "Crunchbase"
      },
      "olympiad-talent": {
        "summary": "International Olympiad in Informatics (IOI) and Physics (IPhO) gold medalists represent top 0.01% of global technical talent.",
        "source": "Wikipedia"
      }
    }
  },
  {
    "id": "section-2-partnership-opportunity",
    "meta": {
      "date": "2024-12-07",
      "title": "Partnership Opportunity Analysis"
    },
    "content": {
      "body": [
        "NodeBench AI's reasoning models for <SmartLink id='drc-verification'>DRC/LVS verification</SmartLink> align perfectly with VoltAI's roadmap.",
        "Expected ROI: 8x speedup in verification time, $2M/year cost savings for enterprise customers."
      ],
      "deepDives": [
        {
          "title": "Technical Integration Path",
          "content": "RESTful API integration. VoltAI sends GDSII files → NodeBench returns constraint violations with confidence scores. Latency <500ms for 1M transistor designs."
        }
      ]
    },
    "dashboard": {
      "phaseLabel": "Partnership Potential: HIGH",
      "kpis": [
        { "label": "Verification Speedup", "value": 800, "unit": "%", "color": "bg-green-600" },
        { "label": "False Positive Reduction", "value": 87, "unit": "%", "color": "bg-blue-600" },
        { "label": "Annual Savings (per customer)", "value": 2, "unit": "M", "color": "bg-emerald-500", "prefix": "$" }
      ],
      "roiChart": {
        "currentCost": 2000000,
        "withNodeBench": 200000,
        "savingsPercent": 90
      }
    },
    "smartLinks": {
      "drc-verification": {
        "summary": "Design Rule Check (DRC) and Layout vs Schematic (LVS) are critical verification steps in semiconductor design. Current heuristic-based tools have 40% false positive rates.",
        "source": "Cadence Documentation"
      }
    }
  }
]
```

#### 2. Interactive Primitives

**A. SmartLink Component** (`src/features/emailIntelligence/components/SmartLink.tsx`)

```tsx
import * as HoverCard from '@radix-ui/react-hover-card';

interface SmartLinkProps {
  children: React.ReactNode;
  summary?: string;
  source?: string;
}

export const SmartLink = ({ children, summary, source }: SmartLinkProps) => {
  if (!summary) return <span className="font-semibold text-gray-900">{children}</span>;

  return (
    <HoverCard.Root openDelay={200} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <span className="cursor-help font-medium text-blue-700 decoration-blue-300 underline underline-offset-2 transition-colors hover:bg-blue-50 hover:text-blue-800">
          {children}
        </span>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          className="w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 z-50"
          sideOffset={5}
        >
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              AI Summary
            </h4>
            <p className="text-sm leading-relaxed text-gray-700">
              {summary}
            </p>
            {source && (
              <div className="flex items-center gap-1 border-t border-gray-100 pt-2">
                <span className="text-[10px] text-gray-400">Source: {source}</span>
              </div>
            )}
          </div>
          <HoverCard.Arrow className="fill-white stroke-gray-200" />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};
```

**B. Deep Dive Accordion** (`src/features/emailIntelligence/components/DeepDiveAccordion.tsx`)

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface DeepDiveProps {
  title: string;
  content: string;
}

export const DeepDiveAccordion = ({ title, content }: DeepDiveProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-6 overflow-hidden rounded-md border-l-4 border-indigo-500 bg-stone-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-100 transition-colors"
      >
        <span className="font-serif font-semibold text-gray-900 text-sm">
          Deep Dive: {title}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 pt-0 text-sm leading-relaxed text-gray-600">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

**C. Dashboard Panel** (`src/features/emailIntelligence/components/DashboardPanel.tsx`)

```tsx
import { motion } from 'framer-motion';

interface DashboardProps {
  data: {
    phaseLabel: string;
    kpis: Array<{ label: string; value: number; unit: string; color: string; prefix?: string }>;
    fundingChart?: { seed: number; seriesA: number; valuation: number };
  };
}

export const DashboardPanel = ({ data }: DashboardProps) => {
  return (
    <div className="flex h-full flex-col justify-between p-1">

      {/* Phase Indicator */}
      <div>
        <motion.div
          key={data.phaseLabel}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 inline-block rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow-sm"
        >
          {data.phaseLabel}
        </motion.div>

        {/* Funding Visualization (if present) */}
        {data.fundingChart && (
          <div className="mb-8">
            <h4 className="mb-2 text-xs font-bold uppercase text-gray-400">Funding Rounds</h4>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">${data.fundingChart.seriesA}M</span>
              <span className="mb-1 text-sm text-gray-500">Series A</span>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Post-money valuation: ${data.fundingChart.valuation}M
            </div>
          </div>
        )}
      </div>

      {/* Dynamic KPIs with Animation */}
      <div className="space-y-6">
        {data.kpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-600">{kpi.label}</span>
              <span className="font-mono font-medium text-gray-900">
                {kpi.prefix}{kpi.value}{kpi.unit}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-sm bg-gray-100">
              <motion.div
                className={`h-full ${kpi.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(kpi.value, 100)}%` }}
                transition={{ duration: 0.8, ease: "circOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 3. Scrollytelling Layout Engine

**File**: `src/features/emailIntelligence/components/ScrollytellingLayout.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { DashboardPanel } from './DashboardPanel';
import { SmartLink } from './SmartLink';
import { DeepDiveAccordion } from './DeepDiveAccordion';

const SectionRenderer = ({ section, onVisible }: any) => {
  const { ref, inView } = useInView({ threshold: 0.5, triggerOnce: false });

  useEffect(() => {
    if (inView) onVisible();
  }, [inView, onVisible]);

  return (
    <div ref={ref} className="mb-32 min-h-[50vh] scroll-mt-24">
      <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-indigo-600">
        {section.meta.date}
      </span>

      <h2 className="mb-6 font-serif text-3xl font-bold text-gray-900">
        {section.meta.title}
      </h2>

      <div className="prose prose-lg prose-slate text-gray-600">
        {section.content.body.map((paragraph: string, idx: number) => (
          <p key={idx} dangerouslySetInnerHTML={{ __html: paragraph }} />
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {section.content.deepDives.map((dd: any, idx: number) => (
          <DeepDiveAccordion key={idx} title={dd.title} content={dd.content} />
        ))}
      </div>
    </div>
  );
};

export const ScrollytellingLayout = ({ data }: { data: any[] }) => {
  const [activeData, setActiveData] = useState(data[0].dashboard);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">

        {/* LEFT: Narrative (Scrolls) */}
        <div className="lg:col-span-7 xl:col-span-8 pb-96">
          {data.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              onVisible={() => setActiveData(section.dashboard)}
            />
          ))}
        </div>

        {/* RIGHT: Dashboard (Sticky) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
          <div className="sticky top-12 min-h-[400px] rounded-xl border border-gray-200 bg-white shadow-sm p-6 ring-1 ring-black/5">
            <DashboardPanel data={activeData} />
          </div>
        </div>

      </div>
    </div>
  );
};
```

---

### Visual Design Guidelines

#### Typography
- **Headers**: Serif font (Merriweather, Domine, or Newsreader) for timeless elegance
- **Body**: Sans-serif (Inter, Proxima Nova) at 18px/1.125rem for readability
- **Metadata**: Font-mono for dates, KPI values (tabular numbers)

#### Color Palette
- **Background**: `#FAFAF9` (warm off-white) or `#FFFFFF`
- **Text**: `#1F2937` (dark gray, never pure black)
- **Accents**:
  - Success/Growth: Muted Green (`bg-green-500`)
  - Risks/Warnings: Muted Red (`bg-red-400`)
  - Links: Executive Blue (`text-blue-700`)
  - Highlights: Indigo (`border-indigo-500`)

#### Micro-Interactions
- **Accordion Expansion**: 300ms bounce animation
- **KPI Bar Charts**: 800ms ease-out tween
- **Number Count-Up**: Spring animation (Framer Motion)
- **Hover Cards**: 200ms fade-in with zoom-in-95 scale

---

### Agent Output Format

When the Deep Agent generates a PRD or dossier, it should output JSON conforming to the data contract above. This ensures:
1. **Separation of Concerns**: Content creation (agent) vs rendering (UI)
2. **Versioning**: Easy to update narrative without changing UI code
3. **Reusability**: Same JSON can render as email, PDF, or interactive web

**Example Agent Prompt Addition**:
```
Output your PRD in the following JSON format:

{
  "sections": [
    {
      "id": "exec-summary",
      "meta": { "date": "2024-12-07", "title": "Executive Summary" },
      "content": {
        "body": ["VoltAI is building...", "Partnership opportunity..."],
        "deepDives": [{ "title": "Market Analysis", "content": "..." }]
      },
      "dashboard": {
        "phaseLabel": "Series A",
        "kpis": [...]
      },
      "smartLinks": { "term": { "summary": "...", "source": "..." } }
    }
  ]
}

This JSON will be rendered in an interactive scrollytelling UI with sticky dashboards and smart hover links.
```

---

### Tech Stack Requirements

**Frontend**:
- **Framework**: React (Next.js for SSR)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Scroll Detection**: `react-intersection-observer`
- **UI Primitives**: Radix UI (HoverCard, Accordion)

**Data Flow**:
1. Agent outputs JSON to Convex document (type: "prd" or "dossier")
2. React component fetches JSON via `useQuery`
3. `ScrollytellingLayout` renders sections + dashboard
4. Intersection Observer triggers dashboard updates
5. Framer Motion animates transitions

---

### Implementation Priority

**Phase 1** (Week 3-4):
- Build core components (SmartLink, DeepDive, DashboardPanel)
- Implement Scrollytelling layout with Intersection Observer
- Test with static JSON data

**Phase 2** (Week 5):
- Integrate with Agent output (parse PRD markdown → JSON)
- Add real-time data fetching from Convex
- Implement PDF export (screenshot sticky dashboard at key sections)

**Phase 3** (Future):
- Multi-PRD comparison view (side-by-side scrollytelling)
- Mobile-responsive (dashboard moves to bottom accordion)
- Interactive chart drilling (click KPI → expand with time-series data)

---

## Technical Architecture

### System Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    GMAIL INBOX (OAuth)                         │
│  - Fetch unread emails via api.domains.integrations.gmail     │
│  - Filter: Business emails only (skip promotions, spam)       │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│          EMAIL INTELLIGENCE PARSER                             │
│  convex/tools/email/emailIntelligenceParser.ts                 │
│  ────────────────────────────────────────────────────────────  │
│  1. Extract entities:                                          │
│     - Companies (domain → name lookup)                         │
│     - People (sender + signature)                              │
│     - Investors (mentions in body)                             │
│     - Keywords (funding, tech stack)                           │
│  2. Classify intent:                                           │
│     - Partnership inquiry                                      │
│     - Investment pitch                                         │
│     - Meeting request                                          │
│     - Cold outreach                                            │
│  3. Urgency detection:                                         │
│     - Calendar invite → high                                   │
│     - "ASAP", "urgent" → high                                  │
│     - General inquiry → medium                                 │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│       EMAIL RESEARCH ORCHESTRATOR (Action)                     │
│  convex/workflows/emailResearchOrchestrator.ts                 │
│  ────────────────────────────────────────────────────────────  │
│  For each entity (company/person):                             │
│    1. Check GAM Memory: queryMemory()                          │
│       → Skip if fresh (within 7 days)                          │
│    2. Parallel Delegation (Deep Agents 2.0):                   │
│       ├─ delegateToEntityResearchAgent                         │
│       │   └─ enrichCompanyDossier (full pipeline)              │
│       ├─ enrichFounderInfo (team backgrounds)                  │
│       ├─ enrichInvestmentThesis (why funded)                   │
│       ├─ linkupSearch (recent news, "past week")               │
│       └─ searchSecFilings (if public company)                  │
│    3. Aggregate results → Structured dossier                   │
│    4. Generate action items (your value prop)                  │
│    5. updateMemoryFromReview (persist to GAM)                  │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│         COORDINATOR AGENT (Deep Agents 2.0)                    │
│  convex/domains/agents/core/coordinatorAgent.ts                │
│  ────────────────────────────────────────────────────────────  │
│  Receives: "Research VoltAI company from email"                │
│  Intent Classification: deep-research + build-dossier          │
│  Memory Check: queryMemory("VoltAI")                           │
│  Routing Decision: delegateToEntityResearchAgent              │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│         ENTITY RESEARCH AGENT (Subagent)                       │
│  convex/domains/agents/core/subagents/entity_subagent/...      │
│  ────────────────────────────────────────────────────────────  │
│  Tools Available:                                              │
│    • enrichCompanyDossier (PRIMARY)                            │
│      ├─ Company overview (HQ, industry, employees)             │
│      ├─ Product description                                    │
│      └─ Tech stack, patents                                    │
│    • enrichFounderInfo                                         │
│      ├─ LinkedIn profiles                                      │
│      ├─ Previous exits, education                              │
│      └─ Achievements (olympiads, publications)                 │
│    • enrichInvestmentThesis                                    │
│      ├─ Why funded (market opportunity)                        │
│      ├─ Lead investor thesis                                   │
│      └─ Competitive positioning                                │
│    • smartFundingSearch                                        │
│      └─ Funding rounds, investors, valuation                   │
│    • linkupSearch (web)                                        │
│      └─ Recent news (temporal: past 7/30 days)                 │
│    • searchSecFilings                                          │
│      └─ 10-K, 10-Q, S-1 (if public)                            │
│  Returns: Structured research data with citations              │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│         ACTION ITEMS GENERATOR (LLM-powered)                   │
│  convex/lib/actionItemsGenerator.ts                            │
│  ────────────────────────────────────────────────────────────  │
│  Input:                                                        │
│    • Company research data                                     │
│    • User profile: "Building agents for semiconductor design"  │
│    • Context: Email intent (partnership, meeting, etc.)        │
│  Analysis:                                                     │
│    • Overlap detection (their needs ∩ your expertise)          │
│    • Partnership opportunities                                 │
│    • Meeting prep talking points                               │
│  Output:                                                       │
│    • Value proposition (how you help)                          │
│    • Meeting topics (what to discuss)                          │
│    • Follow-up actions (demos, case studies)                   │
│    • Risks/red flags (probe points)                            │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│         DOSSIER GENERATOR                                      │
│  convex/lib/dossierGenerator.ts                                │
│  ────────────────────────────────────────────────────────────  │
│  1. Map research results → EmailIntelligenceDossier            │
│  2. Add metadata (confidence, freshness, duration)             │
│  3. Generate outputs:                                          │
│     ├─ Email HTML (newsletter template)                        │
│     ├─ Markdown document (store in Convex)                     │
│     └─ JSON API response                                       │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│         DELIVERY LAYER                                         │
│  ────────────────────────────────────────────────────────────  │
│  Option 1: EMAIL (Default)                                     │
│    • api.domains.integrations.email.sendEmail                  │
│    • Subject: "Dossier: VoltAI ($36M Series A)"                │
│    • Body: Rich HTML with sections                             │
│  Option 2: IN-APP DOCUMENT                                     │
│    • Create document via api.domains.documents.create          │
│    • Type: "dossier"                                           │
│    • Linked to email thread                                    │
│  Option 3: SLACK/SMS (Future)                                  │
│    • Push notification                                         │
│    • "New research: VoltAI - View Dossier"                     │
└────────────────────────────────────────────────────────────────┘
```

---

### Data Flow: Example Walkthrough

**Scenario**: Email from `john@voltai.com` arrives in inbox

**Step 1: Gmail Fetch** (Scheduled: Every 15 minutes)
```typescript
const inbox = await ctx.runAction(api.domains.integrations.gmail.fetchInbox, {
  maxResults: 20,
  unreadOnly: true
});
// Returns: { success: true, messages: [{ id, subject, from, snippet, ... }] }
```

**Step 2: Parse Email**
```typescript
const intelligence = await parseEmailForIntelligence(inbox.messages[0]);
// Output:
{
  emailId: "msg_abc123",
  from: "john@voltai.com",
  subject: "Partnership: AI for Semiconductor Verification",
  entities: {
    companies: ["VoltAI"],
    people: ["John Doe", "Jane Smith"],
    investors: ["Sequoia Capital"],
    keywords: ["IOI gold", "$36M Series A", "reasoning models"]
  },
  intent: "partnership_inquiry",
  urgency: "high"
}
```

**Step 3: Check Memory**
```typescript
const memory = await ctx.runQuery(api.tools.knowledge.unifiedMemoryTools.queryMemory, {
  query: "VoltAI",
  entityType: "company"
});
if (memory.facts.length > 0 && memory.lastUpdated > Date.now() - 7*24*60*60*1000) {
  // Fresh data exists, skip research
  return memory;
}
```

**Step 4: Orchestrate Research** (Parallel)
```typescript
const [company, founders, thesis, news, filings] = await Promise.all([
  ctx.runAction(api.tools.financial.enhancedFundingTools.enrichCompanyDossier, {
    companyName: "VoltAI",
    includeFounders: true,
    includeThesis: true,
    includeIP: true
  }),
  ctx.runAction(api.tools.financial.enhancedFundingTools.enrichFounderInfo, {
    founderNames: ["John Doe", "Jane Smith"],
    companyName: "VoltAI"
  }),
  ctx.runAction(api.tools.financial.enhancedFundingTools.enrichInvestmentThesis, {
    companyName: "VoltAI",
    investors: ["Sequoia Capital"]
  }),
  ctx.runAction(api.tools.media.linkupSearch.linkupSearch, {
    query: "VoltAI semiconductor AI",
    fromDate: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
    includeImages: false
  }),
  ctx.runAction(api.tools.sec.secFilingTools.searchSecFilings, {
    companyName: "VoltAI",
    formTypes: ["S-1", "10-K"]
  })
]);
```

**Step 5: Generate Action Items**
```typescript
const actionItems = await generateActionItems({
  companyData: company,
  userProfile: "Building agents and reasoning models for semiconductor design/verification, working with largest semi companies",
  emailIntent: "partnership_inquiry",
  context: {
    teamBackground: "IOI/IPhO olympiad gold medalists, Stanford professors",
    fundingStage: "Series A, $36M led by Sequoia",
    productFocus: "AI for semiconductor design/verification"
  }
});
// Output:
{
  valueProposition: [
    "Demo reasoning models for DRC/LVS verification",
    "Share case studies from TSMC/Intel verification workflows",
    "Co-develop agents for analog layout verification"
  ],
  meetingTopics: [
    "Current verification bottlenecks at VoltAI",
    "How reasoning models improve over heuristic DRC",
    "Integration with existing EDA toolchains (Cadence, Synopsys)"
  ],
  partnerships: [
    "Joint research on LLM-based constraint solving",
    "Pilot project: Verify VoltAI's own chip designs",
    "Co-marketing to shared semiconductor customers"
  ],
  followUp: [
    "Send white paper: 'Reasoning Models for Semiconductor Verification'",
    "Offer technical deep-dive call with engineering team",
    "Propose 30-day pilot with TSMC case study"
  ],
  risks: [
    "Ask about current AI/ML team capabilities (hiring needs?)",
    "Probe: What verification methods are they using now?",
    "Understand: IP ownership for co-developed agents"
  ]
}
```

**Step 6: Create Dossier Document**
```typescript
const dossier: EmailIntelligenceDossier = {
  company: {
    name: "VoltAI",
    domain: "voltai.com",
    description: "AI-powered semiconductor design and verification platform",
    headquarters: "Palo Alto, CA",
    founded: "2022",
    industry: "Semiconductor Design Automation (EDA)",
    employeeCount: "15-50",
    website: "https://voltai.com",
    productDescription: "Reasoning models for chip verification, layout optimization",
    stage: "Series A"
  },
  team: [
    {
      name: "John Doe",
      role: "CEO & Co-Founder",
      education: ["Stanford PhD Computer Science", "IOI Gold Medalist 2015"],
      previousCompanies: ["Meta (IC9)", "Google Brain"],
      achievements: ["Published 15 papers on ML for EDA", "IOI Gold 2015"],
      linkedin: "linkedin.com/in/johndoe",
      bio: "Former IC9 at Meta, led AI infrastructure team..."
    },
    {
      name: "Jane Smith",
      role: "CTO & Co-Founder",
      education: ["MIT PhD EECS", "IPhO Gold Medalist 2014"],
      previousCompanies: ["Synopsys (CTO)", "Cadence"],
      achievements: ["Ex-CTO of Synopsys", "30 patents in EDA"],
      linkedin: "linkedin.com/in/janesmith",
      bio: "Led Synopsys EDA tool development for 10 years..."
    }
  ],
  funding: {
    totalRaised: "$36M",
    latestRound: {
      round: "Series A",
      amount: "$36M",
      date: "2024-Q3",
      leadInvestor: "Sequoia Capital",
      participants: ["a16z", "Intel Capital"],
      valuation: "$150M post-money"
    },
    rounds: [...],
    investorProfiles: [
      {
        name: "Sequoia Capital",
        type: "VC",
        thesis: "Thesis: AI-first semiconductor tools to 10x designer productivity",
        portfolioFit: ["Cadence", "Synopsys competitors in portfolio"]
      }
    ]
  },
  market: {
    industry: "Semiconductor Design Automation (EDA)",
    marketSize: "$12B global EDA market",
    competitors: ["Cadence", "Synopsys", "Siemens EDA", "Ansys"],
    differentiators: ["AI-first", "Reasoning models vs heuristics", "10x faster verification"],
    technicalMoat: "Proprietary reasoning model for constraint solving"
  },
  sources: [...],
  actionItems: actionItems,
  metadata: {
    generatedAt: Date.now(),
    emailSource: "john@voltai.com",
    researchDurationMs: 180000, // 3 minutes
    confidenceScore: 92,
    freshnessDate: "2024-12-07"
  }
};
```

**Step 7: Generate Email HTML**
```typescript
const emailHTML = generateDossierEmail(dossier);
await ctx.runAction(api.domains.integrations.email.sendEmail, {
  to: "user@example.com",
  subject: "Email Intelligence: VoltAI ($36M Series A led by Sequoia)",
  body: emailHTML
});
```

**Step 8: Persist to Memory**
```typescript
await ctx.runMutation(api.tools.knowledge.unifiedMemoryTools.updateMemoryFromReview, {
  entityId: "voltai",
  entityType: "company",
  facts: [
    { text: "Raised $36M Series A led by Sequoia Capital in Q3 2024", confidence: 95 },
    { text: "Team includes IOI/IPhO gold medalists and ex-Synopsys CTO", confidence: 100 },
    { text: "Building AI reasoning models for semiconductor verification", confidence: 90 }
  ],
  narratives: [...],
  heuristics: [...]
});
```

---

## Implementation Plan

### Week 1: Core Pipeline

**Day 1-2: Email Parser**
- [ ] Create `emailIntelligenceParser.ts`
- [ ] Implement entity extraction (company, people, investors)
- [ ] Add intent classification (partnership, investment, meeting)
- [ ] Add urgency detection
- [ ] Unit tests

**Day 3-4: Research Orchestrator**
- [ ] Create `emailResearchOrchestrator.ts`
- [ ] Integrate with existing `delegateToEntityResearchAgent`
- [ ] Add parallel delegation for founder/investor research
- [ ] Implement result aggregation
- [ ] Add GAM memory integration

**Day 5-7: Dossier Generator**
- [ ] Extend `DossierEmailData` type with action items
- [ ] Create `dossierGenerator.ts` (map research → structured dossier)
- [ ] Add action items generator (LLM-powered)
- [ ] Update email template with new sections
- [ ] Test end-to-end pipeline

### Week 2: Delivery & Automation

**Day 8-9: Scheduled Workflow**
- [ ] Create cron job: Every 15 min, fetch Gmail
- [ ] Filter business emails (skip promotions)
- [ ] Trigger research orchestrator for new emails
- [ ] Add deduplication (don't research same company twice in 7 days)

**Day 10-11: Delivery Mechanisms**
- [ ] Email delivery (daily digest at 8am)
- [ ] In-app document creation
- [ ] Add dossier list view in sidebar
- [ ] Click to expand full dossier

**Day 12-14: Testing & Polish**
- [ ] End-to-end testing with 20 sample emails
- [ ] Measure accuracy (company identification, funding data)
- [ ] Optimize performance (<5 min research time)
- [ ] Add error handling, logging
- [ ] Documentation

### Week 2.5-3: Deep Agent PRD Composer (HIGH PRIORITY)

**Day 15-17: PRD Composer Workflow**
- [ ] Create `prdComposerWorkflow.ts`
- [ ] Implement partnership email detection (intent + keywords)
- [ ] Build prompt template for PRD generation
- [ ] Integrate `delegateToCoordinatorAgent` with full tool access
- [ ] Configure max steps = 15 for deep research

**Day 18-19: PRD Quality & Formatting**
- [ ] Add PRD structure validator (8 required sections)
- [ ] Implement citation extractor (minimum 10 sources)
- [ ] Create confidence scoring algorithm
- [ ] Add markdown → PDF export (via Puppeteer or similar)
- [ ] Test with VoltAI example email

**Day 20-21: Delivery & Integration**
- [ ] Store PRD as Convex document (type: "prd")
- [ ] Email delivery: Executive summary + PDF attachment
- [ ] In-app: "View PRD" button in dossier
- [ ] Link PRD to original email thread
- [ ] Add PRD to GAM memory for future reference

### Week 3-4: Advanced Features (Optional)

**Week 3: Relationship Graph**
- [ ] Build knowledge graph (Company ↔ Founders ↔ Investors)
- [ ] 2nd degree connection detection
- [ ] Visualize in UI (D3.js)

**Week 4: Predictive Scoring**
- [ ] Investment attractiveness score (1-100)
- [ ] Partnership fit score
- [ ] Response urgency predictor
- [ ] Smart follow-up email drafts

---

## Technical Specifications

### New Files to Create

1. **`convex/tools/email/emailIntelligenceParser.ts`**
   - `parseEmailForIntelligence(email)`
   - `extractCompanyMentions(text)`
   - `extractPeopleMentions(text)`
   - `classifyIntent(email)`
   - `detectUrgency(email)`
   - `detectPartnershipRequest(email)` (NEW - for PRD trigger)

2. **`convex/workflows/emailResearchOrchestrator.ts`**
   - `orchestrateEmailResearch(emailId)`
   - `parallelResearchTracks(entities)`
   - `aggregateResults(trackResults)`

3. **`convex/lib/dossierGenerator.ts`**
   - `generateDossier(researchData): EmailIntelligenceDossier`
   - `mapCompanyData(companyResult)`
   - `mapFounderData(founderResults)`
   - `mapInvestorData(investorResults)`

4. **`convex/lib/actionItemsGenerator.ts`**
   - `generateActionItems(company, userProfile, emailIntent)`
   - `detectValueProposition(overlap)`
   - `generateMeetingTopics(context)`

5. **`convex/workflows/prdComposerWorkflow.ts`** (NEW - Phase 1.5)
   - `composePRDForPartnership(emailIntelligence, dossierData)`
   - `buildPRDPrompt(company, userProfile, emailBody)`
   - `validatePRDStructure(prdMarkdown)`
   - `extractCitations(prdMarkdown)`
   - `calculateConfidenceScore(prd)`
   - `exportPRDtoPDF(markdown)`

6. **`convex/crons/emailIntelligenceCron.ts`**
   - Scheduled task: Every 15 min
   - Fetch Gmail, process new emails

### Modified Files

1. **`convex/domains/integrations/email/dossierEmailTemplate.ts`**
   - Add action items section
   - Add team/people section
   - Add investor profiles section

2. **`convex/domains/agents/core/coordinatorAgent.ts`**
   - Add "email-intelligence" intent classification
   - Route to entity research agent

---

## API Specifications

### Email Intelligence Parser

```typescript
// convex/tools/email/emailIntelligenceParser.ts

export const parseEmailForIntelligence = createTool({
  description: "Parse Gmail messages to extract companies, people, investors, and intent",
  args: z.object({
    maxEmails: z.number().default(20),
    unreadOnly: z.boolean().default(true),
    filterSenders: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  }),
  handler: async (ctx, args) => {
    // 1. Fetch Gmail inbox
    const inbox = await ctx.runAction(api.domains.integrations.gmail.fetchInbox, {
      maxResults: args.maxEmails
    });

    if (!inbox.success || !inbox.messages) {
      return { success: false, error: inbox.error };
    }

    // 2. Parse each email
    const parsed = [];
    for (const email of inbox.messages) {
      const intelligence = await parseEmail(email, args);
      if (intelligence.entities.companies.length > 0 || intelligence.entities.people.length > 0) {
        parsed.push(intelligence);
      }
    }

    return { success: true, emails: parsed };
  }
});

async function parseEmail(email: GmailMessage, args: any): Promise<EmailIntelligence> {
  const text = `${email.subject || ""} ${email.snippet || ""}`;

  // Extract company from email domain
  const domain = email.from?.split('@')[1] || "";
  const company = await lookupCompanyFromDomain(domain); // Use LLM or API

  // Extract people
  const sender = email.from?.split('<')[0].trim() || "";
  const people = [sender]; // Could parse signature for more names

  // Extract investors (keyword matching + LLM validation)
  const investors = extractInvestors(text);

  // Extract keywords
  const keywords = extractKeywords(text, args.keywords);

  // Classify intent
  const intent = classifyIntent(email);

  // Detect urgency
  const urgency = detectUrgency(email);

  return {
    emailId: email.id,
    from: email.from || "",
    subject: email.subject || "",
    entities: { companies: company ? [company] : [], people, investors, keywords },
    intent,
    urgency,
    snippets: [email.snippet || ""]
  };
}

function extractInvestors(text: string): string[] {
  const knownInvestors = ["Sequoia", "a16z", "Y Combinator", "Intel Capital", ...];
  return knownInvestors.filter(inv => text.includes(inv));
}

function classifyIntent(email: GmailMessage): EmailIntent {
  const subject = email.subject?.toLowerCase() || "";
  const snippet = email.snippet?.toLowerCase() || "";

  if (subject.includes("partnership") || snippet.includes("collaborate")) {
    return "partnership_inquiry";
  }
  if (subject.includes("meeting") || snippet.includes("schedule")) {
    return "meeting_request";
  }
  if (subject.includes("investment") || snippet.includes("pitch")) {
    return "investment_pitch";
  }
  return "general_inquiry";
}

function detectUrgency(email: GmailMessage): "low" | "medium" | "high" {
  const text = `${email.subject} ${email.snippet}`.toLowerCase();

  if (text.includes("urgent") || text.includes("asap") || text.includes("today")) {
    return "high";
  }
  if (text.includes("this week") || text.includes("soon")) {
    return "medium";
  }
  return "low";
}
```

### Research Orchestrator

```typescript
// convex/workflows/emailResearchOrchestrator.ts

export const orchestrateEmailResearch = internalAction({
  args: { emailIntelligence: v.any() },
  handler: async (ctx, { emailIntelligence }) => {
    const { entities } = emailIntelligence;

    // For each company mentioned
    for (const company of entities.companies) {
      // 1. Check memory
      const memory = await ctx.runQuery(api.tools.knowledge.unifiedMemoryTools.queryMemory, {
        query: company,
        entityType: "company"
      });

      if (memory.facts.length > 0 && memory.lastUpdated > Date.now() - 7*24*60*60*1000) {
        console.log(`[Orchestrator] Skipping ${company} - fresh memory exists`);
        continue;
      }

      // 2. Parallel research tracks
      const [companyData, founderData, thesisData, newsData, filingsData] = await Promise.all([
        ctx.runAction(api.tools.financial.enhancedFundingTools.enrichCompanyDossier, {
          companyName: company,
          includeFounders: true,
          includeThesis: true,
          includeIP: true
        }),

        ctx.runAction(api.tools.financial.enhancedFundingTools.enrichFounderInfo, {
          founderNames: entities.people,
          companyName: company
        }),

        ctx.runAction(api.tools.financial.enhancedFundingTools.enrichInvestmentThesis, {
          companyName: company,
          investors: entities.investors
        }),

        ctx.runAction(api.tools.media.linkupSearch.linkupSearch, {
          query: `${company} recent news`,
          fromDate: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
          includeImages: false
        }),

        ctx.runAction(api.tools.sec.secFilingTools.searchSecFilings, {
          companyName: company,
          formTypes: ["10-K", "10-Q", "S-1"]
        })
      ]);

      // 3. Generate action items
      const actionItems = await generateActionItems({
        companyData,
        founderData,
        userProfile: getUserProfile(ctx),
        emailIntent: emailIntelligence.intent,
        context: { investors: entities.investors, keywords: entities.keywords }
      });

      // 4. Create dossier
      const dossier = generateDossier({
        company: companyData,
        founders: founderData,
        thesis: thesisData,
        news: newsData,
        filings: filingsData,
        actionItems,
        metadata: {
          emailSource: emailIntelligence.from,
          generatedAt: Date.now(),
          researchDurationMs: Date.now() - startTime
        }
      });

      // 5. Persist to memory
      await ctx.runMutation(api.tools.knowledge.unifiedMemoryTools.updateMemoryFromReview, {
        entityId: company.toLowerCase().replace(/\s+/g, '-'),
        entityType: "company",
        facts: extractFacts(dossier),
        narratives: extractNarratives(dossier),
        heuristics: []
      });

      // 6. Deliver dossier
      await deliverDossier(ctx, dossier, emailIntelligence);
    }
  }
});

function getUserProfile(ctx: any): string {
  // Fetch from user preferences or hardcode
  return "Building agents and reasoning models for semiconductor design/verification, working with largest semiconductor companies";
}

async function deliverDossier(ctx: any, dossier: EmailIntelligenceDossier, emailIntel: any) {
  // Option 1: Email
  const emailHTML = generateDossierEmail(dossier);
  await ctx.runAction(api.domains.integrations.email.sendEmail, {
    to: getUserEmail(ctx),
    subject: `Dossier: ${dossier.company.name} (${dossier.funding.latestRound?.amount || ""})`,
    body: emailHTML
  });

  // Option 2: Create document
  await ctx.runMutation(api.domains.documents.documents.create, {
    title: `Dossier: ${dossier.company.name}`,
    content: JSON.stringify(dossier),
    documentType: "dossier",
    tags: ["email-intelligence", dossier.company.name]
  });
}
```

### PRD Composer Workflow (NEW - Phase 1.5)

```typescript
// convex/workflows/prdComposerWorkflow.ts

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";

export const composePRDForPartnership = internalAction({
  args: {
    emailIntelligence: v.any(),
    dossierData: v.any(),
  },
  handler: async (ctx, { emailIntelligence, dossierData }) => {
    const { entities, intent, emailBody } = emailIntelligence;
    const company = dossierData.company;

    // 1. Check if PRD generation is warranted
    if (intent !== "partnership_inquiry" && intent !== "demo_request") {
      console.log("[PRD Composer] Skipping - not a partnership email");
      return { success: false, reason: "Not a partnership email" };
    }

    // 2. Build comprehensive PRD prompt
    const prdPrompt = buildPRDPrompt(company, dossierData, emailBody);

    // 3. Delegate to Coordinator Agent (Deep Agents 2.0)
    const { createCoordinatorAgent } = await import("../agents/core/coordinatorAgent");
    const agent = createCoordinatorAgent("gpt-4o"); // Use GPT-4 for quality

    console.log("[PRD Composer] Starting deep research + PRD composition...");
    const startTime = Date.now();

    const result = await agent.generateText(ctx, {}, {
      prompt: prdPrompt,
      maxSteps: 15, // Allow multi-step research
      temperature: 0.3, // Lower for factual output
    });

    const prdMarkdown = result.text;
    const durationMs = Date.now() - startTime;

    // 4. Validate PRD structure
    const validation = validatePRDStructure(prdMarkdown);
    if (!validation.valid) {
      console.warn("[PRD Composer] Invalid structure:", validation.missing);
      // Optionally retry with corrective prompt
    }

    // 5. Extract citations
    const citations = extractCitations(prdMarkdown);
    console.log(`[PRD Composer] Found ${citations.length} citations`);

    // 6. Calculate confidence score
    const confidenceScore = calculateConfidenceScore({
      citationCount: citations.length,
      sectionsComplete: validation.sectionsFound,
      researchDuration: durationMs,
    });

    // 7. Store PRD as Convex document
    const prdDocId = await ctx.runMutation(api.domains.documents.documents.create, {
      title: `Partnership PRD: ${company.name} x NodeBench AI`,
      content: prdMarkdown,
      documentType: "prd",
      tags: ["prd", "partnership", company.name, emailIntelligence.emailId],
    });

    // 8. Export to PDF (optional)
    let pdfUrl;
    try {
      pdfUrl = await exportPRDtoPDF(prdMarkdown, company.name);
    } catch (err) {
      console.error("[PRD Composer] PDF export failed:", err);
    }

    // 9. Send email with PRD
    const executiveSummary = extractExecutiveSummary(prdMarkdown);
    await ctx.runAction(api.domains.integrations.email.sendEmail, {
      to: getUserEmail(ctx),
      subject: `Partnership PRD: ${company.name} x NodeBench AI`,
      body: `
        <h2>Partnership PRD Generated</h2>
        <p><strong>Company:</strong> ${company.name}</p>
        <p><strong>Research Duration:</strong> ${Math.round(durationMs / 1000)}s</p>
        <p><strong>Confidence Score:</strong> ${confidenceScore}/100</p>

        <h3>Executive Summary</h3>
        ${executiveSummary}

        <p><a href="${process.env.CONVEX_SITE_URL}/documents/${prdDocId}">View Full PRD</a></p>
        ${pdfUrl ? `<p><a href="${pdfUrl}">Download PDF</a></p>` : ""}
      `
    });

    // 10. Update GAM memory with PRD insights
    await ctx.runMutation(api.tools.knowledge.unifiedMemoryTools.updateMemoryFromReview, {
      entityId: company.name.toLowerCase().replace(/\s+/g, '-'),
      entityType: "company",
      facts: [
        { text: `Generated partnership PRD on ${new Date().toISOString().split('T')[0]}`, confidence: 100 },
        { text: `PRD confidence score: ${confidenceScore}/100`, confidence: confidenceScore },
      ],
      narratives: [],
      heuristics: [],
    });

    return {
      success: true,
      prdDocId,
      pdfUrl,
      confidenceScore,
      durationMs,
      citationCount: citations.length,
    };
  }
});

function buildPRDPrompt(company: any, dossier: any, emailBody: string): string {
  return `
You are a strategic partnership advisor with deep expertise in semiconductor design automation and AI.

# CONTEXT

**Inbound Email Request**:
${emailBody}

**Company Research**:
- Name: ${company.name}
- Industry: ${company.industry}
- Stage: ${company.stage}
- Funding: ${dossier.funding.totalRaised} (${dossier.funding.latestRound.leadInvestor})
- Team: ${dossier.team.map((t: any) => `${t.name} (${t.role})`).join(", ")}
- Product: ${company.productDescription}

**Our Expertise**:
Building agents and reasoning models for semiconductor design/verification, working with the largest
semiconductor companies around the world (TSMC, Intel, Samsung, NVIDIA, AMD, Qualcomm, Broadcom).

# TASK

Research deeply and compose a comprehensive 10-15 page partnership PRD that outlines how NodeBench AI
can partner with ${company.name}.

# REQUIRED SECTIONS

## 1. Executive Summary (2-3 paragraphs)
- What is ${company.name} building?
- Why is this partnership strategically valuable?
- What are the expected outcomes?

## 2. Problem Statement
- What pain points does ${company.name} have that we can solve?
- Current verification challenges, time/cost inefficiencies
- Market gaps we can fill together

## 3. Proposed Solution Architecture
- How do our agents/reasoning models integrate with their platform?
- Technical architecture diagram (ASCII art or description)
- API endpoints, data models, authentication

## 4. Technical Specifications
- Input/output formats (GDSII, Verilog, Liberty, etc.)
- Performance benchmarks (latency, throughput)
- Integration points with existing EDA tools (Cadence, Synopsys)
- Scalability considerations

## 5. Success Metrics
- KPIs: False positive rate reduction, verification time speedup
- Cost savings (engineer hours, cloud compute)
- Quality improvements (bug detection rate)
- Quantified ROI

## 6. Implementation Timeline
- Phase 1: Pilot (30-60 days, 10-50 designs)
- Phase 2: Production integration (3-6 months)
- Phase 3: Enterprise rollout (6-12 months)

## 7. Risk Assessment
- Technical risks (integration complexity, model accuracy)
- Business risks (pricing, IP ownership, competitive dynamics)
- Mitigation strategies

## 8. Pricing & Business Model
- Pilot: Free or discounted
- Enterprise: Per-design API calls, annual licensing, revenue share
- Support & SLA tiers

# RESEARCH INSTRUCTIONS

Use all available tools to research:
1. ${company.name}'s technical blog, documentation, GitHub repos
2. SEC filings (if public) for IP/tech stack details
3. Industry trends: #semiconductor, #EDA, #AI, #verification
4. Competitor analysis: Cadence, Synopsys, Siemens EDA
5. Customer case studies from TSMC, Intel, etc. (if available)

# OUTPUT REQUIREMENTS

- Length: 10-15 pages (8000-12000 words)
- Format: Markdown with proper headers (##, ###)
- Citations: Minimum 10 cited sources (web links, SEC filings, technical papers)
- Tone: Professional, technical, investment-grade
- Diagrams: Use ASCII art for architecture diagrams
- Actionable: Clear next steps, timelines, pricing

# QUALITY CHECKS

Before finalizing:
1. All 8 sections are complete
2. At least 10 citations included
3. Technical accuracy validated against public sources
4. ROI calculations are realistic (not overly optimistic)
5. Timeline is achievable

Generate the PRD now. Be thorough and research-driven.
`;
}

function validatePRDStructure(markdown: string): { valid: boolean; sectionsFound: number; missing: string[] } {
  const requiredSections = [
    "Executive Summary",
    "Problem Statement",
    "Proposed Solution Architecture",
    "Technical Specifications",
    "Success Metrics",
    "Implementation Timeline",
    "Risk Assessment",
    "Pricing & Business Model"
  ];

  const found = requiredSections.filter(section =>
    markdown.includes(`## ${section}`) || markdown.includes(`### ${section}`)
  );

  const missing = requiredSections.filter(section => !found.includes(section));

  return {
    valid: missing.length === 0,
    sectionsFound: found.length,
    missing
  };
}

function extractCitations(markdown: string): string[] {
  // Extract URLs from markdown links
  const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const citations = [];
  let match;
  while ((match = urlRegex.exec(markdown)) !== null) {
    citations.push(match[2]); // URL
  }
  return [...new Set(citations)]; // Deduplicate
}

function calculateConfidenceScore(params: {
  citationCount: number;
  sectionsComplete: number;
  researchDuration: number;
}): number {
  const { citationCount, sectionsComplete, researchDuration } = params;

  // Weighted scoring
  const citationScore = Math.min(citationCount / 10, 1) * 40; // Max 40 points
  const sectionScore = (sectionsComplete / 8) * 40; // Max 40 points
  const depthScore = Math.min(researchDuration / (10 * 60 * 1000), 1) * 20; // Max 20 points (10 min+)

  return Math.round(citationScore + sectionScore + depthScore);
}

function extractExecutiveSummary(markdown: string): string {
  // Extract content between "## 1. Executive Summary" and next "##"
  const match = markdown.match(/##\s*1\.\s*Executive Summary([\s\S]*?)(?=##|$)/);
  if (match) {
    return match[1].trim().substring(0, 500) + "..."; // First 500 chars
  }
  return "Executive summary not found.";
}

async function exportPRDtoPDF(markdown: string, companyName: string): Promise<string> {
  // TODO: Implement PDF export via Puppeteer or similar
  // For now, return placeholder
  console.log(`[PRD Composer] PDF export not yet implemented for ${companyName}`);
  return "";
}

function getUserEmail(ctx: any): string {
  // Fetch from user preferences or environment
  return process.env.USER_EMAIL || "user@example.com";
}
```

---

### Action Items Generator

```typescript
// convex/lib/actionItemsGenerator.ts

export async function generateActionItems(params: {
  companyData: any;
  founderData: any;
  userProfile: string;
  emailIntent: EmailIntent;
  context: any;
}): Promise<ActionItems> {
  const { companyData, founderData, userProfile, emailIntent, context } = params;

  // Use LLM to analyze overlap and generate recommendations
  const prompt = `
You are a strategic advisor. Analyze the following information and generate actionable recommendations.

Company: ${companyData.name}
Description: ${companyData.description}
Industry: ${companyData.industry}
Team Background: ${founderData.map((f: any) => f.bio).join(", ")}
Investors: ${context.investors.join(", ")}

User Profile: ${userProfile}

Email Intent: ${emailIntent}

Generate:
1. Value Proposition: How can the user help this company? (3-5 specific points)
2. Meeting Topics: What should be discussed in a meeting? (3-5 questions/topics)
3. Partnership Opportunities: Potential collaboration areas (2-3 ideas)
4. Follow-Up Actions: Next steps after initial contact (2-3 actions)
5. Risks/Red Flags: Things to probe or be cautious about (2-3 points)

Format as JSON:
{
  "valueProposition": ["..."],
  "meetingTopics": ["..."],
  "partnerships": ["..."],
  "followUp": ["..."],
  "risks": ["..."]
}
`;

  const result = await openai.chat("gpt-4o").generateText(prompt);
  return JSON.parse(result.text);
}
```

---

## Success Criteria & KPIs

### Functional Requirements
- [ ] Email parsing: >95% accuracy in company/person extraction
- [ ] Research quality: >90% of dossiers include funding + founders + thesis
- [ ] Processing time: <5 minutes from email → dossier delivery
- [ ] Memory integration: No duplicate research within 7 days
- [ ] Delivery: Email sent within 5 minutes of research completion

### Non-Functional Requirements
- [ ] Scalability: Handle 100+ emails/day
- [ ] Reliability: >99% uptime for cron job
- [ ] Cost: <$2 per dossier (API + LLM costs)
- [ ] Privacy: No email content stored beyond 30 days
- [ ] Security: OAuth tokens encrypted, no data leakage

### User Experience
- [ ] Dossier readability: 4.5/5 star rating
- [ ] Actionable insights: >80% of action items rated "useful"
- [ ] Time savings: Users report 30-60 min saved per research task
- [ ] Adoption: >70% of business emails automatically processed

---

## Risks & Mitigation

### Technical Risks

**Risk 1: LLM Hallucination (Company/Investor Names)**
- **Impact**: High - False data in dossiers
- **Mitigation**:
  - Always use verified sources (Crunchbase API, SEC EDGAR)
  - Add confidence scores to each fact
  - Human-in-the-loop review for high-stakes dossiers

**Risk 2: API Rate Limits (Gmail, SEC, Crunchbase)**
- **Impact**: Medium - Delayed dossiers
- **Mitigation**:
  - Implement exponential backoff
  - Cache results in GAM memory (7-day freshness)
  - Prioritize VIP emails (Sequoia partner > random cold email)

**Risk 3: Email Parsing Failures (Signature Extraction)**
- **Impact**: Low - Missing people names
- **Mitigation**:
  - Fallback to LLM-based extraction
  - Allow manual corrections in UI
  - Log failures for continuous improvement

### Business Risks

**Risk 4: Privacy Concerns (Storing Email Data)**
- **Impact**: High - Legal/compliance issues
- **Mitigation**:
  - Only store metadata (sender, subject, date)
  - Auto-delete email snippets after 30 days
  - Add user consent flow
  - GDPR compliance (data export, deletion)

**Risk 5: Cost Overruns (LLM API Costs)**
- **Impact**: Medium - Unsustainable at scale
- **Mitigation**:
  - Use cheaper models for parsing (GPT-3.5, Haiku)
  - Cache aggressively (GAM memory)
  - Rate limit: Max 50 dossiers/day per user

---

## Open Questions

1. **Email Filtering**: How to distinguish "business" emails from personal/spam?
   - Proposed: Sender domain whitelist + keyword filtering

2. **Duplicate Detection**: Same company mentioned in 3 emails within a week?
   - Proposed: Check GAM memory before research, skip if fresh

3. **User Customization**: Should users configure which emails to auto-research?
   - Proposed: Settings panel: VIP senders, keyword filters, auto-research toggle

4. **Multi-User**: How to handle shared inboxes (team@company.com)?
   - Proposed: Phase 2 - Team dossiers with shared memory

5. **Fact Verification**: How to ensure 95%+ accuracy?
   - Proposed: Dual-source verification (2 APIs must agree) + confidence scores

---

## Appendix: Example Dossier Output

```json
{
  "company": {
    "name": "VoltAI",
    "domain": "voltai.com",
    "description": "AI-powered semiconductor design and verification platform using reasoning models",
    "headquarters": "Palo Alto, CA",
    "founded": "2022",
    "industry": "Semiconductor Design Automation (EDA)",
    "employeeCount": "15-50",
    "website": "https://voltai.com",
    "productDescription": "Reasoning models for chip verification (DRC/LVS), layout optimization, and constraint solving. Claims 10x faster verification vs traditional heuristics.",
    "stage": "Series A"
  },

  "team": [
    {
      "name": "John Doe",
      "role": "CEO & Co-Founder",
      "education": ["Stanford PhD Computer Science (2020)", "IOI Gold Medalist 2015"],
      "previousCompanies": ["Meta (IC9 - AI Infrastructure)", "Google Brain (Research Scientist)"],
      "achievements": [
        "Led Meta's AI compiler team (2018-2022)",
        "15 publications on ML for EDA (h-index 18)",
        "IOI Gold Medal 2015 (ranked #3 globally)"
      ],
      "linkedin": "linkedin.com/in/johndoe",
      "twitter": "@johndoe_ai",
      "bio": "Former IC9 at Meta where he led the AI infrastructure team responsible for PyTorch compiler optimizations. PhD from Stanford advised by Andrew Ng on neural architecture search. International Olympiad in Informatics gold medalist."
    },
    {
      "name": "Jane Smith",
      "role": "CTO & Co-Founder",
      "education": ["MIT PhD EECS (2019)", "IPhO Gold Medalist 2014"],
      "previousCompanies": ["Synopsys (CTO 2020-2022)", "Cadence (Senior Architect)"],
      "achievements": [
        "Ex-CTO of Synopsys (youngest ever at 28)",
        "30 patents in EDA and physical design",
        "IPhO Gold Medal 2014 (ranked #1 globally)"
      ],
      "linkedin": "linkedin.com/in/janesmith",
      "bio": "Former CTO of Synopsys where she led the development of next-gen EDA tools. 10 years at Cadence before that. MIT PhD on machine learning for chip layout optimization. Physics Olympiad gold medalist."
    }
  ],

  "funding": {
    "totalRaised": "$36M",
    "latestRound": {
      "round": "Series A",
      "amount": "$36M",
      "date": "2024-09-15",
      "leadInvestor": "Sequoia Capital",
      "participants": ["Andreessen Horowitz", "Intel Capital", "Alumni Ventures"],
      "valuation": "$150M post-money"
    },
    "rounds": [
      {
        "round": "Seed",
        "amount": "$4M",
        "date": "2023-03-10",
        "investors": ["Y Combinator", "SV Angel"]
      }
    ],
    "investorProfiles": [
      {
        "name": "Sequoia Capital",
        "type": "VC",
        "thesis": "Investing in AI-first infrastructure that 10x's engineer productivity. VoltAI's reasoning models can reduce chip design cycles from 12 months to 6 months.",
        "portfolioFit": ["Previous EDA investments: None directly, but invested in adjacent infra (Databricks, Snowflake)"]
      },
      {
        "name": "Intel Capital",
        "type": "Corporate VC",
        "thesis": "Strategic investment to integrate VoltAI's verification tools into Intel's internal chip design flow.",
        "portfolioFit": ["Semiconductor tooling companies"]
      }
    ]
  },

  "market": {
    "industry": "Semiconductor Design Automation (EDA)",
    "marketSize": "$12B global EDA market (growing 7% YoY)",
    "competitors": ["Cadence Design Systems", "Synopsys", "Siemens EDA", "Ansys"],
    "differentiators": [
      "AI-first vs rule-based heuristics",
      "Reasoning models for constraint solving (vs brute force)",
      "10x faster verification claimed (benchmarked on RISC-V cores)",
      "Cloud-native (competitors still desktop-focused)"
    ],
    "technicalMoat": "Proprietary reasoning model architecture trained on 50M+ chip designs. Patent pending on 'LLM-guided constraint propagation for DRC'."
  },

  "sources": [
    {
      "title": "VoltAI Raises $36M Series A Led by Sequoia",
      "url": "https://techcrunch.com/2024/09/15/voltai-series-a",
      "type": "news",
      "date": "2024-09-15",
      "snippet": "VoltAI, a startup building AI reasoning models for semiconductor design, announced a $36M Series A...",
      "credibility": "verified"
    },
    {
      "title": "VoltAI: Rethinking Chip Verification with LLMs",
      "url": "https://voltai.com/blog/verification-with-llms",
      "type": "blog",
      "date": "2024-08-20",
      "snippet": "Traditional DRC tools rely on hand-crafted rules. We use reasoning models to learn constraints...",
      "credibility": "primary"
    },
    {
      "title": "Jane Smith LinkedIn Profile",
      "url": "https://linkedin.com/in/janesmith",
      "type": "linkedin",
      "date": "2024-12-07",
      "snippet": "CTO & Co-Founder at VoltAI. Former CTO at Synopsys...",
      "credibility": "verified"
    }
  ],

  "actionItems": {
    "valueProposition": [
      "Demo your reasoning models for DRC/LVS verification - VoltAI is building exactly this, potential white-label partnership",
      "Share TSMC/Intel case studies showing 10x speedup in verification - validates their thesis",
      "Offer to co-develop agents for analog layout verification (gap in their current product)",
      "Provide access to your semiconductor company network (they're selling to TSMC/Intel/Samsung - you already work with them)"
    ],
    "meetingTopics": [
      "What are VoltAI's current verification bottlenecks? (DRC, LVS, timing?)",
      "How do their reasoning models compare to your approach? (technical deep-dive)",
      "Integration path: Can your agents plug into their platform?",
      "Discuss IP ownership for co-developed verification agents",
      "Ask about their GTM strategy - are they selling to fabs or fabless designers?"
    ],
    "partnerships": [
      "Joint research: LLM-based constraint solving for advanced nodes (3nm/2nm)",
      "Pilot project: Use your agents to verify VoltAI's own chip designs (eat your own dog food)",
      "Co-marketing: Joint webinar for semiconductor customers on 'AI-Native Verification'",
      "Technology integration: Embed your agents into VoltAI's cloud platform"
    ],
    "followUp": [
      "Send white paper: 'Reasoning Models for Semiconductor Verification' (within 24h)",
      "Offer technical deep-dive call with your engineering team (propose 3 time slots)",
      "Propose 30-day pilot: Verify a RISC-V core using both tools, compare results",
      "Intro to TSMC contact (if they're interested in enterprise pilot)"
    ],
    "risks": [
      "Ask about their current AI/ML team size - are they hiring? (potential acqui-hire target?)",
      "Probe: What verification methods are they using internally? (do they trust their own tool?)",
      "Understand: IP ownership for co-developed agents (who owns the model weights?)",
      "Competitive risk: Could they build your agent capabilities in-house? (assess technical depth)",
      "Customer overlap: Are they already talking to your semiconductor customers? (conflict?)"
    ]
  },

  "metadata": {
    "generatedAt": 1733591234000,
    "emailSource": "john@voltai.com",
    "researchDurationMs": 187000,
    "confidenceScore": 92,
    "freshnessDate": "2024-12-07"
  }
}
```

---

## Conclusion

This PRD outlines a comprehensive **Email Intelligence & Research Pipeline** that leverages your existing Deep Agents 2.0 infrastructure to automate 95% of email research tasks. The system is designed to be **production-ready in 2 weeks** with your current tech stack.

**Key Differentiators**:
1. **Reuses existing infrastructure**: Deep Agents, GAM Memory, Tool ecosystem
2. **End-to-end automation**: Gmail → Research → Dossier → Email delivery
3. **Investment-grade output**: Comprehensive dossiers with citations and action items
4. **Fast time-to-value**: <5 min research, <2 weeks to production

**Next Steps**:
1. Review and approve PRD
2. Allocate engineering resources (1-2 developers for 2 weeks)
3. Start with Week 1 implementation plan
4. Iterate based on user feedback

---

**Document Version**: 1.0
**Last Updated**: 2025-12-07
**Status**: Ready for Implementation
