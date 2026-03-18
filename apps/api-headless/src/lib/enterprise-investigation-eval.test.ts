import { describe, expect, it } from "vitest";

import {
  ENTERPRISE_INVESTIGATION_EVAL_CASES,
  runEnterpriseInvestigationCase,
  serializeInvestigationForJudge,
} from "./enterprise-investigation-eval.js";

describe("enterprise investigation eval fixtures", () => {
  it("produces traceable investigations for every public fixture case", async () => {
    const results = await Promise.all(
      ENTERPRISE_INVESTIGATION_EVAL_CASES.map((testCase) => runEnterpriseInvestigationCase(testCase)),
    );

    expect(results).toHaveLength(4);

    for (const result of results) {
      expect(result.investigation.observed_facts.length).toBeGreaterThanOrEqual(3);
      expect(result.investigation.evidence_catalog.length).toBeGreaterThanOrEqual(3);
      expect(result.deterministic.dimensions.traceability.score).toBeGreaterThanOrEqual(80);
      expect(result.deterministic.dimensions.temporalEvidence.score).toBeGreaterThanOrEqual(70);
      expect(result.investigation.recommended_actions.length).toBeGreaterThan(0);
      expect(result.investigation.recommended_actions[0]?.action.length ?? 0).toBeGreaterThan(20);

      const judgeText = serializeInvestigationForJudge(result.investigation);
      expect(judgeText).toContain("Observed facts:");
      expect(judgeText).toContain("Recommended actions:");
    }
  });
});
