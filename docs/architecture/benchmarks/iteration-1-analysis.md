# Iteration 1 Benchmark Analysis

Generated: 2026-01-06T05:30:00.000Z

## Executive Summary

**Critical Finding:** Cheaper/faster models (Haiku 4.5, Gemini 3 Flash, GPT-5.2 Mini) are **completely failing** to produce structured output in the evaluation framework.

- **GPT-5.2 Baseline:** 24/24 pass (100%) @ $1.04
- **Claude Haiku 4.5:** 1/24 pass (4%) @ $? - **96% FAILURE RATE**
- **Gemini 3 Flash:** 0/24 pass (0%) @ $0.00 - **100% FAILURE RATE**
- **GPT-5.2 Mini:** Not completed

## Root Cause Analysis

### Primary Issue: Structured Output Format Compliance

All failures show the same pattern:
```
"streamStatus": "completed_no_output"
"failureReasons": ["Missing [DEBRIEF_V1_JSON] block"]
```

**What this means:**
1. Models are receiving the prompts
2. Models are completing execution
3. Models are NOT producing the required `[DEBRIEF_V1_JSON]` structured output block
4. This suggests weaker instruction-following for structured formats

### Secondary Issue: No Tool Execution

```json
{
  "toolCalls": [],
  "toolResults": [],
  "stepsCount": 0,
  "estimatedInputTokens": 0,
  "estimatedOutputTokens": 0
}
```

Models are not:
- Making tool calls (lookupGroundTruthEntity, linkupSearch, etc.)
- Producing any text output
- Consuming any tokens

This suggests the agent framework itself may have compatibility issues with these models.

## Hypotheses

### Hypothesis 1: Structured Output Mode Incompatibility
**Evidence:**
- GPT-5.2 uses structured output mode successfully
- Gemini/Haiku may not support the same structured output API

**Test:** Check if using text-based prompts instead of structured mode helps

### Hypothesis 2: Prompt Length/Complexity
**Evidence:**
- Evaluation prompts include detailed schemas, examples, tool lists
- Cheaper models may have different context handling

**Test:** Simplify prompts, reduce schema verbosity

### Hypothesis 3: Model Name Resolution Issues
**Evidence:**
- Models might not be properly resolved by the framework
- Could be hitting fallback/error paths

**Test:** Add logging to verify model resolution

### Hypothesis 4: Agent SDK Compatibility
**Evidence:**
- Using Convex Agent SDK which may have model-specific requirements
- Structured output might require specific model capabilities

**Test:** Check Agent SDK documentation for model requirements

## Impact Analysis

### Cost Impact
- **Cannot achieve cost savings** if models don't work at all
- Current state: 0% functionality at any price = infinite cost per working scenario

### Quality Impact
- **Complete failure** - no partial credit
- Need to fix fundamental compatibility before optimizing

### Latency Impact
- Gemini completed all 24 scenarios in **31 seconds** (vs ~22 minutes baseline)
- This is suspiciously fast - confirms no actual work being done

## Critical Path Forward

### MUST FIX (Iteration 2)

1. **[P0] Enable basic text output from cheaper models**
   - Switch from structured output mode to text mode
   - Use regex extraction for `[DEBRIEF_V1_JSON]` blocks
   - Add fallback parsing logic

2. **[P0] Verify tool execution works**
   - Ensure models can call tools
   - Test with simple 1-tool scenario first
   - Verify token consumption is non-zero

3. **[P0] Add model-specific prompt engineering**
   - Gemini may need different prompt format
   - Haiku may need explicit examples
   - Add model-specific system prompts

### SHOULD FIX (Iteration 3)

4. **[P1] Strengthen format compliance**
   - Add explicit JSON schema in prompt
   - Provide complete examples
   - Use few-shot prompting

5. **[P1] Add validation layers**
   - Catch empty outputs early
   - Retry with simplified prompt on failure
   - Fallback to baseline model for critical scenarios

### NICE TO HAVE (Iteration 4+)

6. **[P2] Optimize for each model's strengths**
   - Haiku: fast, good at following patterns
   - Gemini: multimodal, good at search
   - GPT-Mini: balanced, good at structured tasks

## Recommended Immediate Actions

1. ✅ **Create detailed failure analysis** (this document)

2. ⏭️ **Create test harness for single-scenario debugging**
   - Run one scenario with each model
   - Add verbose logging
   - Capture full input/output

3. ⏭️ **Implement structured output fallback**
   - Detect when structured mode fails
   - Fall back to text-based extraction
   - Add retry logic

4. ⏭️ **Add model compatibility checks**
   - Test each model before full run
   - Fail fast with clear error messages
   - Suggest compatible alternatives

5. ⏭️ **Run Iteration 2 with fixes**
   - Target: >80% pass rate for all models
   - Benchmark against baseline
   - Measure actual cost savings

## Open Questions

1. **Does the Agent SDK support all these models?**
   - Need to check SDK documentation
   - May need to use different SDKs per provider

2. **Should we use native APIs instead of Agent SDK?**
   - More control over prompting
   - Loss of agent orchestration features

3. **Is structured output mode required?**
   - Can we achieve same quality with text parsing?
   - What's the failure rate of regex extraction?

4. **Should we use different evaluation format?**
   - Current format designed for GPT-5.2
   - May need model-agnostic format

## Next Steps

1. Implement P0 fixes (structured output fallback)
2. Run single-scenario test with all models
3. Verify models can produce ANY output
4. Re-run full benchmark suite
5. Iterate until all models achieve >90% baseline quality

## Open Dataset Recommendations (for 100-scenario expansion)

### Financial/Business Datasets
- **Crunchbase Open Dataset** - startup funding, verified
- **SEC EDGAR Filings** - public company data, authoritative
- **YC Company Directory** - startup info, semi-structured

### Technical/Security Datasets
- **NVD (National Vulnerability Database)** - CVE data, ground truth
- **GitHub Archive** - repository events, verifiable
- **npm/PyPI package metadata** - versioning, downloads

### Academic/Research Datasets
- **PubMed Central** - biomedical literature, peer-reviewed
- **arXiv** - preprints with metadata
- **Semantic Scholar** - paper citations, verifiable

### Market/Pricing Datasets
- **OpenAI/Anthropic/Google pricing pages** (already using)
- **AWS/GCP/Azure pricing calculators** - verifiable costs
- **CoinGecko API** - crypto pricing, historical

### Multi-Domain Datasets
- **Wikidata** - structured knowledge, citations
- **DBpedia** - entity information, linked data
- **ORCID** - researcher IDs, publications

All of these have:
✅ Verifiable ground truth
✅ Public APIs or exports
✅ Regular updates
✅ Multi-persona relevance

