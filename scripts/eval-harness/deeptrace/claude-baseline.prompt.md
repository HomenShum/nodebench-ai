You are working in this repository using Claude Code with built-in tools only.

Task:
Analyze the target company, product, repository, or world-event scenario and produce:

1. observed facts
2. key relationships
3. strongest hypothesis
4. counter-hypothesis
5. recommended next action
6. limitations

Rules:

- use only repository files, built-in web capabilities if available, and the explicit task inputs
- do not use custom MCP servers
- do not use any custom NodeBench CLI tool
- clearly separate verified facts from inferred claims
- do not invent hidden relationships
- if evidence is weak, say so

Output contract:

- write `./artifacts/baseline_report.md`
- write `./artifacts/baseline_result.json`

`baseline_result.json` must contain:

```json
{
  "observed_facts": [],
  "relationships": [],
  "hypothesis": "",
  "counter_hypothesis": "",
  "recommendation": "",
  "limitations": []
}
```
