# NodeBench 100-Scenario Evaluation Framework

## Overview

This document describes the expanded NodeBench evaluation suite that has grown from 24 to 100 scenarios using **deterministic Ground Truth** derived from verifiable, open-source datasets. The framework replaces expensive, slow manual verification with automated, API-driven ground truth extraction.

## Architecture

### Domain Distribution

| Domain | Target Personas | Data Source | Scenario Count | Primary Metric |
|--------|-----------------|-------------|----------------|----------------|
| **Financial** | `JPM_STARTUP_BANKER`, `ENTERPRISE_EXEC`, `QUANT_ANALYST` | **SEC EDGAR** | 30 | Accuracy of revenue/risk extraction |
| **Security** | `SECURITY_ENGINEER`, `CTO_TECH_LEAD` | **NVD (NIST)** | 25 | Correct CVE scoring & remediation |
| **Academic** | `ACADEMIC_RD`, `RESEARCHER` | **PubMed / ArXiv** | 25 | Hallucination-free summarization |
| **Market** | `FOUNDER_STRATEGY`, `PRODUCT_MANAGER`, `CTO_TECH_LEAD` | **GitHub** | 20 | Trend identification & comparison |

## Data Sources

### 1. Financial: SEC EDGAR

**Personas:** `JPM_STARTUP_BANKER`, `ENTERPRISE_EXEC`, `QUANT_ANALYST`

**Why:** Provides legally binding financial figures. Agents often hallucinate "Revenue" for private startups; public data is the perfect control group.

**Source:** `data.sec.gov` (REST API)

**Implementation:**

```bash
# GET https://data.sec.gov/submissions/CIK{10_DIGIT_CIK}.json
# Header: "User-Agent: NodeBench-Eval (admin@nodebench.com)" <-- MANDATORY
```

**Scenario Categories:**
- Revenue Extraction (10 scenarios) - Tesla, Apple, Microsoft, Google, NVIDIA, Amazon, Meta, AMD, Intel, Qualcomm
- Risk Factors (10 scenarios) - Top 3 risk factors from each company's 10-K
- Business Description (5 scenarios) - Company overview and segments
- Market Comparison (5 scenarios) - Cross-company comparisons

### 2. Security: NVD CVE API

**Personas:** `SECURITY_ENGINEER`, `CTO_TECH_LEAD`

**Why:** Security agents must be exact. Getting a CVE score wrong (e.g., 9.8 vs 5.4) is a critical failure.

**Source:** NIST National Vulnerability Database API 2.0

**Implementation:**

```bash
# GET https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-XXXX
# Header: "apiKey: {YOUR_NIST_KEY}"
```

**Scenario Categories:**
- CVE Scoring (10 scenarios) - Extract CVSS v3.1 scores and vector strings
- Remediation (10 scenarios) - Patch availability and mitigation steps
- Impact Analysis (5 scenarios) - Business continuity and risk assessment

### 3. Academic: PubMed E-utilities

**Personas:** `ACADEMIC_RD`, `RESEARCHER`

**Why:** Tests the agent's ability to summarize complex text without "drifting" (making up citations).

**Source:** NCBI E-utilities (`ESearch`, `EFetch`)

**Implementation:**

```bash
# Step 1 (Find IDs): https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=CRISPR+2024
# Step 2 (Get Content): https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={ID}&retmode=json
```

**Scenario Categories:**
- Paper Summarization (15 scenarios) - Key findings from recent papers
- Methodology Validation (10 scenarios) - Controls, statistics, reproducibility

### 4. Market: GitHub API

**Personas:** `FOUNDER_STRATEGY`, `PRODUCT_MANAGER`, `CTO_TECH_LEAD`

**Why:** Tests "Live Web" capabilities. Can the agent distinguish between "All time popular" and "Trending today"?

**Source:** GitHub API (REST)

**Implementation:**

```bash
# GET https://api.github.com/search/repositories?q=created:>2025-01-01&sort=stars&order=desc
# Header: "Authorization: Bearer {GITHUB_TOKEN}"
```

**Scenario Categories:**
- Trending Repos (10 scenarios) - Top repositories by language/topic
- Competitive Analysis (10 scenarios) - Framework/library comparisons

## Schema Definition

### Evaluation Scenario Interface

```typescript
interface GroundTruthSource {
  source: "static" | "sec_api" | "nvd_api" | "pubmed_api" | "github_api";
  lookupId: string;           // e.g., "CVE-2024-1234" or "0001318605"
  extractionField: string;    // e.g., "baseScore" or "revenue"
  expectedValue?: string;     // Cached during build phase
  sourceUrl?: string;         // Link to source document
}

interface EvaluationScenario {
  id: string;                 // Unique identifier
  name: string;               // Human-readable name
  persona: string;            // Target persona
  input: string;              // User query
  groundTruth: GroundTruthSource;
  checks?: {
    minToolCalls?: number;    // Enforce tool usage
    requireTools?: string[];  // Required tool names
    verificationStep?: boolean; // Expect output verification
    maxToolCalls?: number;
    maxCostUsd?: number;
    maxClarifyingQuestions?: number;
  };
  domain: "financial" | "security" | "academic" | "market";
}
```

## Build Pipeline

### Phase 1: Fetch Ground Truth

Run the individual fetcher scripts to populate ground truth caches:

```bash
# Fetch SEC data
npx tsx scripts/fetch-sec-ground-truth.ts --output docs/architecture/benchmarks/sec-ground-truth.json

# Fetch NVD CVE data
npx tsx scripts/fetch-nvd-ground-truth.ts --output docs/architecture/benchmarks/nvd-ground-truth.json

# Fetch PubMed data
npx tsx scripts/fetch-pubmed-ground-truth.ts --output docs/architecture/benchmarks/pubmed-ground-truth.json

# Fetch GitHub data
npx tsx scripts/fetch-github-ground-truth.ts --output docs/architecture/benchmarks/github-ground-truth.json
```

### Phase 2: Build Evaluation Pack

Generate the complete 100-scenario pack:

```bash
npx tsx scripts/build-eval-pack.ts \
  --output docs/architecture/benchmarks/persona-episode-eval-pack-v2.json
```

### Phase 3: Run Evaluation

Execute the evaluation suite:

```bash
# Run full benchmark
npx tsx scripts/run-persona-episode-eval.ts \
  --pack docs/architecture/benchmarks/persona-episode-eval-pack-v2.json

# Run specific domain
npx tsx scripts/run-persona-episode-eval.ts \
  --pack docs/architecture/benchmarks/persona-episode-eval-pack-v2.json \
  --domain security
```

## Pitfalls & Mitigations

### 1. The "Lazy Agent" Trap

**Issue:** Cheaper models (Haiku/Flash) might try to guess the CVE score instead of using their tools to look it up.

**Fix:** In your evaluation runner, enforce a **Tool Usage Check**:

```typescript
function validateToolUsage(scenario: EvaluationScenario, toolCalls: ToolCall[]) {
  if (scenario.checks?.requireTools) {
    const hasRequiredTools = scenario.checks.requireTools.every(
      tool => toolCalls.some(call => call.name === tool)
    );
    if (!hasRequiredTools) {
      throw new Error(`Missing required tools for ${scenario.id}`);
    }
  }
}
```

### 2. Date Hallucinations

**Issue:** If you ask for "Trending repos this week," models might return data from their training cut-off (e.g., 2024).

**Fix:** Inject the current date into the System Prompt:

```
Current Date: ${new Date().toISOString()}
```

Verify the agent uses this date in its search query.

### 3. JSON Structure Variance

**Issue:** Models might omit fields or use different structures.

**Fix:** Use **Zod** schema validation on the agent's output:

```typescript
const CveResponseSchema = z.object({
  id: z.string(),
  baseScore: z.number(),
  vectorString: z.string(),
});
```

If the structure is wrong, use a "Repair Agent" to fix the JSON format before scoring.

## Evaluation Metrics

### Primary Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Accuracy** | Ground truth match rate | > 90% |
| **Tool Usage** | Percentage using required tools | > 85% |
| **Hallucination Rate** | Made-up citations/facts | < 5% |
| **Latency** | Time to complete scenario | < 60s |

### Domain-Specific Metrics

| Domain | Metric | Target |
|--------|--------|--------|
| Financial | Revenue figure accuracy | ±1% |
| Security | CVSS score exact match | 100% |
| Academic | Citation preservation | > 90% |
| Market | Repo name accuracy | > 95% |

## Generated Files

| File | Description |
|------|-------------|
| `docs/architecture/benchmarks/persona-episode-eval-pack-v2.json` | Complete 100-scenario evaluation pack |
| `docs/architecture/benchmarks/sec-ground-truth.json` | Cached SEC EDGAR data |
| `docs/architecture/benchmarks/nvd-ground-truth.json` | Cached NVD CVE data |
| `docs/architecture/benchmarks/pubmed-ground-truth.json` | Cached PubMed abstracts |
| `docs/architecture/benchmarks/github-ground-truth.json` | Cached GitHub trending data |

## CI/CD Integration

### Daily Build

```yaml
# .github/workflows/daily-ground-truth.yml
name: Daily Ground Truth Update
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  update-ground-truth:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Evaluation Pack
        run: npx tsx scripts/build-eval-pack.ts
      - name: Commit Updates
        run: |
          git config user.name "github-actions[bot]"
          git add docs/architecture/benchmarks/
          git commit -m "Update ground truth - $(date +%Y-%m-%d)" || echo "No changes"
          git push
```

### Evaluation Run

```yaml
# .github/workflows/run-evaluation.yml
name: Run Evaluation
on:
  workflow_dispatch:
    inputs:
      pack:
        description: 'Evaluation pack path'
        required: false
        default: 'docs/architecture/benchmarks/persona-episode-eval-pack-v2.json'

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Dependencies
        run: npm ci
      - name: Run Evaluation
        run: npx tsx scripts/run-persona-episode-eval.ts --pack ${{ github.event.inputs.pack }}
      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: evaluation-results
          path: test-results/
```

## Contributing New Scenarios

### 1. Add Scenario to Generator

Edit `scripts/build-eval-pack.ts` and add to the appropriate domain generator:

```typescript
{
  id: "mkt_new_scenario_001",
  name: "Domain: New Scenario",
  persona: "TARGET_PERSONA",
  input: "Your evaluation query here",
  groundTruth: {
    source: "github_api",  // or sec_api, nvd_api, pubmed_api
    lookupId: "search-query",
    extractionField: "field",
  },
  domain: "market",  // or financial, security, academic
}
```

### 2. Test the Scenario

```bash
npx tsx scripts/build-eval-pack.ts
npx tsx scripts/run-persona-episode-eval.ts --scenario mkt_new_scenario_001
```

### 3. Add to Documentation

Update this README with the new scenario description and metrics.

## License

This evaluation framework is part of the NodeBench project and follows its licensing terms.
