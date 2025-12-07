# Email Intelligence PRD - Deep Agent PRD Composer Addition

**Date**: 2025-12-07
**Update**: Added Phase 1.5 - Automated PRD Generation for Partnership Emails

---

## What Was Added

### New Feature: Deep Agent PRD Composer

**Purpose**: Automatically generate comprehensive 10-15 page partnership PRDs when partnership/demo request emails are received.

**Trigger**: Email classified as "partnership_inquiry" or "demo_request" with technical keywords

**Processing Time**: 10-15 minutes (deep research + PRD composition)

**Output**: Investment-grade PRD with 8 required sections, minimum 10 citations, confidence scoring

---

## Key Components Added

### 1. Track 6: Deep Agent PRD Composition (Lines 165-268)

**What It Does**:
- Delegates to Coordinator Agent (Deep Agents 2.0) with full tool access (35+ tools)
- Uses all available research tools: `linkupSearch`, `searchSecFilings`, `searchHashtag`, `createHashtagDossier`, `sequentialThinking`, planning tools
- Generates structured PRD with 8 sections: Executive Summary, Problem Statement, Solution Architecture, Technical Specs, Success Metrics, Timeline, Risk Assessment, Pricing
- Self-validates structure, extracts citations, calculates confidence score
- Stores as Convex document (type: "prd") + optional PDF export
- Emails executive summary with link to full PRD

**Example Prompt**:
```
Research VoltAI deeply and compose a comprehensive partnership PRD...

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

### 2. Phase 1.5: Deep Agent PRD Composer (Lines 386-467)

**Implementation Details**:
- Component: `convex/workflows/prdComposerWorkflow.ts`
- Trigger conditions clearly defined
- Deep Agent delegation with 15 max steps
- Research workflow: Plan → Parallel Research → Sequential Composition → Quality Check → Delivery
- Quality metrics: Research depth (10+ sources), technical accuracy, completeness, actionability, confidence score

**Example PRD Output** (VoltAI case):
```markdown
# Partnership PRD: VoltAI x NodeBench AI
## Reasoning Models for Semiconductor Verification

### 1. Executive Summary
VoltAI is a Series A semiconductor AI startup ($36M from Sequoia) building reasoning
models for chip verification. NodeBench AI's expertise in agents for semiconductor
design/verification presents a strategic partnership opportunity...

[10-15 pages of deep research and technical specifications]

### 8. Pricing & Business Model
Pilot: Free (30 days, 100 designs)
Enterprise: $50K/year + $5/design API call
Licensing: 20% revenue share on VoltAI customer deals
```

### 3. Updated Phase 2 Features (Lines 469-497)

**Enhanced with PRD Context**:
- 2.1 Multi-PRD Comparison: Comparative analysis when multiple partnership emails arrive
- 2.3 Predictive Scoring: Added "PRD Auto-Generation Score" to predict if email warrants full PRD
- 2.4 Smart Follow-Up: Auto-draft responses with PRD executive summary embedded
- 2.5 Competitive Intelligence: Automated PRD updates when competitor landscape changes

### 4. Updated Implementation Timeline (Lines 906-927)

**Week 2.5-3: Deep Agent PRD Composer (HIGH PRIORITY)**

**Day 15-17: PRD Composer Workflow**
- Create `prdComposerWorkflow.ts`
- Implement partnership email detection
- Build prompt template for PRD generation
- Integrate `delegateToCoordinatorAgent` with full tool access
- Configure max steps = 15

**Day 18-19: PRD Quality & Formatting**
- Add PRD structure validator (8 required sections)
- Implement citation extractor (minimum 10 sources)
- Create confidence scoring algorithm
- Add markdown → PDF export
- Test with VoltAI example email

**Day 20-21: Delivery & Integration**
- Store PRD as Convex document (type: "prd")
- Email delivery: Executive summary + PDF attachment
- In-app: "View PRD" button in dossier
- Link PRD to original email thread
- Add PRD to GAM memory

### 5. New File Created (Lines 972-978)

**`convex/workflows/prdComposerWorkflow.ts`**:
- `composePRDForPartnership(emailIntelligence, dossierData)`
- `buildPRDPrompt(company, userProfile, emailBody)`
- `validatePRDStructure(prdMarkdown)`
- `extractCitations(prdMarkdown)`
- `calculateConfidenceScore(prd)`
- `exportPRDtoPDF(markdown)`

### 6. Complete Implementation Code (Lines 1220-1511)

**Full TypeScript implementation** of PRD Composer Workflow with:
- Email intent validation
- Comprehensive PRD prompt generation
- Deep Agent delegation (GPT-4o with 15 max steps)
- Structure validation (8 required sections)
- Citation extraction (10+ sources)
- Confidence scoring (weighted: citations 40%, sections 40%, depth 20%)
- Convex document storage
- PDF export (placeholder)
- Email delivery with executive summary
- GAM memory integration

**Key Functions**:
```typescript
buildPRDPrompt(company, dossier, emailBody): string
validatePRDStructure(markdown): { valid, sectionsFound, missing }
extractCitations(markdown): string[]
calculateConfidenceScore({ citationCount, sectionsComplete, researchDuration }): number
extractExecutiveSummary(markdown): string
exportPRDtoPDF(markdown, companyName): Promise<string>
```

---

## Business Impact

### Value Proposition

**For VoltAI Partnership Email Example**:
1. **Email Received**: "Partnership Opportunity - AI for Semiconductor Design"
2. **System Processes**:
   - Parses email → Extracts company, people, investors
   - Researches VoltAI → Company dossier (5 min)
   - **Detects partnership request → Generates PRD (10-15 min)**
3. **Delivers**:
   - Company dossier (standard)
   - **Partnership PRD (10-15 pages, investment-grade)**
   - Action items + meeting prep
4. **User Gets**:
   - Complete research on VoltAI
   - **Ready-to-share partnership proposal**
   - Technical integration architecture
   - Pricing, timeline, risk assessment
   - **Total time: 15-20 minutes automated vs 4-6 hours manual**

### ROI

**Manual Process**:
- Email triage: 10 min
- Company research: 30-60 min
- **Partnership PRD composition: 3-5 hours** (technical research, competitive analysis, solution design)
- **Total: 4-6 hours per partnership email**

**Automated Process**:
- Email parsed: Instant
- Company research: 5 min
- **PRD composition: 10-15 min** (Deep Agent with 35+ tools)
- **Total: 15-20 minutes**

**Time Savings**: 80-90% reduction (4-6 hours → 15-20 min)

### Competitive Advantage

**Unique Differentiator**:
- No other email intelligence tool generates full PRDs automatically
- Leverages Deep Agents 2.0 for investment-grade output
- Domain-specific expertise (semiconductor AI) embedded in prompts
- Self-validating quality (confidence scores, citation requirements)

**Target Users**:
- Technical founders (respond to partnership inquiries)
- BD/Sales teams (prepare for enterprise deals)
- VCs (evaluate partnership opportunities in portfolio)
- Consultants (client proposal generation)

---

## Technical Highlights

### Deep Agent Integration

**Reuses Existing Infrastructure** (80%):
- Coordinator Agent (35+ tools, hierarchical delegation)
- Entity Research Agent (company/founder/investor research)
- GAM Memory (deduplication, persistence)
- Tool ecosystem (LinkUp, SEC, hashtag search, planning)

**New Components** (20%):
- PRD prompt template (semiconductor-specific)
- Structure validator (8 sections)
- Citation extractor (10+ sources)
- Confidence scorer (weighted algorithm)
- PDF export (future)

### Quality Assurance

**Multi-Layer Validation**:
1. **Intent Classification**: Only trigger for partnership emails
2. **Structure Validation**: Ensure all 8 sections present
3. **Citation Count**: Minimum 10 cited sources
4. **Confidence Score**: 0-100 based on citations, completeness, research depth
5. **Human-in-Loop** (optional): Flag PRDs with <80 confidence for review

**Self-Improving**:
- GAM memory stores PRD insights
- Future emails benefit from previous research
- Confidence scores improve over time

---

## Example Flow: VoltAI Email → PRD

### Input Email
```
From: john@voltai.com
Subject: Partnership Opportunity - AI for Semiconductor Design

Hi,

We're VoltAI, a Series A startup building AI reasoning models for chip verification.
We raised $36M led by Sequoia Capital. Our team includes IOI/IPhO gold medalists,
ex-Meta IC9, and ex-Synopsys CTO.

We're looking to partner on advanced verification for 3nm nodes. Would love to discuss
how your agents could integrate with our platform.

Best,
John
```

### Processing Pipeline

**1. Email Parser** (1 sec):
```json
{
  "company": "VoltAI",
  "people": ["John"],
  "investors": ["Sequoia Capital"],
  "intent": "partnership_inquiry",
  "urgency": "medium"
}
```

**2. Company Research** (5 min):
```json
{
  "company": { "name": "VoltAI", "stage": "Series A", "funding": "$36M" },
  "team": [{ "name": "John Doe", "role": "CEO", "background": "IOI Gold, ex-Meta IC9" }],
  "investors": [{ "name": "Sequoia", "thesis": "AI-first semiconductor tools" }]
}
```

**3. PRD Composer** (12 min):
- Deep Agent calls 10+ tools (LinkUp, SEC, hashtag search)
- Researches: VoltAI tech blog, competitor landscape, industry trends
- Composes: 12-page PRD with solution architecture, pricing, timeline
- Validates: 8 sections ✓, 15 citations ✓, confidence 94/100 ✓

### Output PRD (12 Pages)

```markdown
# Partnership PRD: VoltAI x NodeBench AI
**Confidence Score**: 94/100
**Generated**: 2024-12-07
**Research Duration**: 12 minutes

## 1. Executive Summary

VoltAI is a Series A semiconductor AI startup ($36M from Sequoia Capital) focused on
AI-powered chip verification. They are targeting the $12B EDA market with reasoning
models that claim 10x faster DRC/LVS verification vs traditional heuristics.

NodeBench AI's expertise in agents and reasoning models for semiconductor
design/verification presents a strategic partnership opportunity. Our reasoning models
can integrate as a core module within VoltAI's platform, providing:
- 8x reduction in false positive rate (40% → <5%)
- 8x speedup in verification time (4 hours → 30 minutes)
- $2M/year cost savings for VoltAI customers

This PRD outlines a 3-phase pilot (30 days) → production (6 months) → enterprise (12 months)
rollout with clear ROI, technical integration, and risk mitigation.

## 2. Problem Statement

**VoltAI's Current Challenges** (researched from technical blog + competitor analysis):
1. Heuristic-based DRC engines have 40% false positive rate
2. Manual review costs $2M/year in engineering time for typical fabs
3. Integration with existing EDA tools (Cadence, Synopsys) is complex
4. Scaling to advanced nodes (<7nm) requires new constraint solving approaches

**Market Gap**:
- Cadence/Synopsys dominate EDA but lack AI-first verification
- VoltAI has AI reasoning models but needs deeper verification capabilities
- NodeBench AI has proven agents for TSMC/Intel but lacks cloud platform

**Partnership Value**:
- VoltAI gets: Best-in-class reasoning models for verification
- NodeBench AI gets: Cloud platform, enterprise sales channel, Sequoia backing
- Customers get: End-to-end AI-native EDA toolchain

## 3. Proposed Solution Architecture

```
┌─────────────────────────────────────┐
│   VoltAI Cloud Platform             │
│   ├─ Design Entry (existing)        │
│   ├─ Layout Optimization (existing) │
│   └─ Verification Module (NEW)      │
│       ├─ DRC Engine (heuristic)     │
│       └─ Reasoning Model API ←──────┼─── NodeBench AI API
│           ├─ Constraint Solver      │     (hosted on AWS/GCP)
│           ├─ LVS Verification       │
│           └─ Timing Analysis        │
└─────────────────────────────────────┘

API Integration Points:
1. POST /api/verify/drc
   - Input: GDSII file (binary), design rules (JSON)
   - Output: Violations (JSON) with confidence scores
   - Latency: <500ms for 1M transistor designs

2. POST /api/verify/lvs
   - Input: GDSII + netlist (SPICE)
   - Output: Matching report with suggestions
   - Latency: <2 seconds

3. GET /api/models/status
   - Health check, model versions, uptime
```

## 4. Technical Specifications

[Deep Agent researches VoltAI's tech stack from public sources]

**Input Formats Supported**:
- GDSII Stream (binary layout files)
- Verilog, VHDL (RTL netlists)
- SPICE (analog netlists)
- Liberty (.lib files for timing)

**Output Formats**:
- JSON API (primary)
- YAML (for CI/CD pipelines)
- HTML reports (for human review)

**Performance Benchmarks** (validated on RISC-V cores):
- DRC throughput: 1M transistors in <500ms
- LVS throughput: 100K transistors in <2 seconds
- Accuracy: 95% precision, 98% recall on TSMC 5nm designs

**Integration with Existing EDA Tools**:
- Cadence Virtuoso: Python plugin for export
- Synopsys IC Compiler: TCL scripts
- Open-source (KLayout, Magic): Direct API calls

## 5. Success Metrics

**Phase 1 Pilot (30 days, 10 RISC-V designs)**:
- Target: 8x false positive reduction (40% → <5%)
- Target: 8x verification speedup (4 hours → 30 min)
- Deliverable: Side-by-side comparison report

**Phase 2 Production (6 months, 100 designs/month)**:
- Target: $500K cost savings for pilot customer (TSMC or Intel)
- Target: 99.5% uptime SLA
- Deliverable: Enterprise-ready API, SOC2 compliance

**Phase 3 Enterprise (12 months, 1000+ designs/month)**:
- Target: $5M ARR from VoltAI customer deals
- Target: 10+ enterprise customers (fabs + fabless)
- Deliverable: Multi-region deployment (US, APAC, EU)

**ROI Calculation** (for typical fab customer):
- Current cost: $2M/year (engineer hours for manual DRC review)
- With NodeBench AI: $200K/year (automated, 10% manual review)
- Savings: $1.8M/year per customer
- Payback period: 3 months (at $50K/year licensing)

## 6. Implementation Timeline

**Phase 1: Pilot (Month 1-2)**
- Week 1-2: API integration, auth setup, test harness
- Week 3-4: Run 10 RISC-V designs (VoltAI internal + open-source)
- Week 5-6: Side-by-side comparison report, iterate on feedback
- Week 7-8: Customer pilot prep (TSMC or Intel)

**Phase 2: Production (Month 3-8)**
- Month 3-4: SOC2 Type 1 audit, security hardening
- Month 5-6: Scale to 100 designs/month, 99.5% uptime SLA
- Month 7-8: Multi-region deployment (AWS US, APAC)

**Phase 3: Enterprise (Month 9-18)**
- Month 9-12: Onboard 5 enterprise customers
- Month 13-18: Scale to 1000+ designs/month, revenue ramp

## 7. Risk Assessment

**Technical Risks**:
1. Integration complexity with VoltAI's existing platform
   - Mitigation: 30-day pilot to validate API compatibility
2. Model accuracy on advanced nodes (<7nm)
   - Mitigation: Already benchmarked on TSMC 5nm (95% precision)
3. Latency requirements (<500ms for 1M transistors)
   - Mitigation: GPU acceleration, model quantization

**Business Risks**:
1. IP ownership for co-developed features
   - Mitigation: Clear licensing agreement (NodeBench owns models, VoltAI owns UI)
2. Pricing: $50K/year may be too high for startups
   - Mitigation: Freemium tier (100 designs/month free), enterprise pricing for fabs
3. Competitive dynamics: Cadence/Synopsys may build similar AI tools
   - Mitigation: First-mover advantage, TSMC/Intel customer lock-in

**Mitigation Strategies**:
- 30-day pilot with clear success criteria (< 5% false positives, <30 min verification)
- Mutual NDA + licensing agreement drafted before pilot
- Quarterly business reviews to track metrics

## 8. Pricing & Business Model

**Pilot Pricing (Month 1-2)**:
- Free for VoltAI internal testing (10 designs)
- $10K for customer pilot (TSMC/Intel, 50 designs)

**Production Pricing (Month 3+)**:
- Freemium: 100 designs/month free (startups, academic)
- Pro: $5K/month (1000 designs/month, 99.5% SLA)
- Enterprise: $50K/year + $5/design API call (unlimited, multi-region)

**Revenue Share**:
- NodeBench AI gets 20% of VoltAI's revenue from customers using reasoning models
- Example: VoltAI charges customer $250K/year → NodeBench gets $50K/year

**Support & SLA Tiers**:
- Community (free): Best-effort, GitHub issues
- Pro: Email support, 24-hour response
- Enterprise: Dedicated Slack channel, 1-hour P0 response, on-call

## Appendix A: Competitive Analysis

[Deep Agent researches Cadence, Synopsys, Siemens EDA]

**Cadence Virtuoso**:
- Market leader in analog EDA ($3.5B revenue)
- Heuristic-based DRC (40% false positive rate)
- No AI reasoning models
- **Gap**: NodeBench AI can provide 8x better accuracy

**Synopsys IC Compiler**:
- Market leader in digital EDA ($5.8B revenue)
- Rule-based verification (slow on advanced nodes)
- Recently acquired AI startup for timing optimization
- **Gap**: Focused on timing, not constraint solving

**VoltAI Positioning**:
- AI-first (differentiator vs incumbents)
- Cloud-native (vs desktop-focused Cadence/Synopsys)
- With NodeBench AI partnership: Best reasoning models + cloud platform

## Appendix B: Reference Architecture

[Deep Agent designs detailed API integration]

**Authentication Flow** (OAuth 2.0):
```
VoltAI Platform → GET /oauth/authorize → NodeBench AI
NodeBench AI → Returns access_token (JWT, 1-hour expiry)
VoltAI → POST /api/verify/drc (Bearer token)
```

**Data Flow** (GDSII Verification):
```
1. VoltAI user uploads GDSII file (100 MB)
2. VoltAI platform streams to NodeBench API
3. NodeBench AI:
   - Parses GDSII (10 seconds)
   - Runs reasoning model (500ms)
   - Returns violations (JSON, <1 MB)
4. VoltAI displays results in UI
```

**Monitoring & Observability**:
- Prometheus metrics (API latency, error rate, throughput)
- Grafana dashboards (shared with VoltAI ops team)
- PagerDuty integration for P0 incidents

---

**Generated by**: NodeBench AI Deep Agent
**Research Duration**: 12 minutes
**Citations**: 15 sources
- [1] VoltAI Blog: "Reasoning Models for Chip Verification"
- [2] TechCrunch: "VoltAI Raises $36M Series A"
- [3] Sequoia Blog: "Why We Invested in VoltAI"
- [4] Cadence 2024 10-K (SEC Edgar)
- [5] Synopsys 2024 10-K (SEC Edgar)
- [6] TSMC 5nm Design Rules (public)
- [7] IEEE Paper: "LLMs for Constraint Solving in EDA"
- ... (15 total)
```

---

## Next Steps

1. **Review PRD Addition**: Ensure business logic aligns with product strategy
2. **Approve Implementation**: Week 2.5-3 timeline (Days 15-21)
3. **Test with Real Email**: Send VoltAI partnership email to staging
4. **Iterate Prompt**: Refine PRD prompt based on output quality
5. **Deploy to Production**: After successful testing

---

**Status**: ✅ Ready for Implementation
**Priority**: HIGH (Core differentiator for technical partnerships)
**Estimated Effort**: 1 week (7 days)
