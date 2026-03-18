You are working in this repository with NodeBench / DeepTrace MCP and CLI access enabled.

Task:
Analyze the target company, product, repository, or world-event scenario and produce:

1. observed facts
2. relationship graph summary
3. dimension profile summary
4. strongest hypothesis
5. counter-hypothesis
6. recommended next action
7. limitations
8. receipts and evidence bundle

Requirements:

- use NodeBench graph, trace, evidence, dimension, and world-monitor tools where helpful
- record receipts for major steps
- attach evidence for material claims
- clearly label verified, estimated, inferred, and unavailable dimensions
- export:
  - `./artifacts/tool_report.md`
  - `./artifacts/tool_result.json`
  - `./artifacts/tool_trace_bundle.json`

`tool_result.json` must contain:

```json
{
  "observed_facts": [],
  "relationships": [],
  "dimension_profile": {},
  "hypothesis": "",
  "counter_hypothesis": "",
  "recommendation": "",
  "limitations": [],
  "receipts": [],
  "evidence": []
}
```
