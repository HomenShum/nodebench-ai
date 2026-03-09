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
      expect(result.investigation.causal_chain.length).toBeGreaterThanOrEqual(3);
      expect(result.investigation.audit_proof_pack.source_snapshot_hashes.length).toBeGreaterThanOrEqual(3);
      expect(result.deterministic.dimensions.traceability.score).toBeGreaterThanOrEqual(80);
      expect(result.deterministic.dimensions.temporalEvidence.score).toBeGreaterThanOrEqual(70);
      expect(result.investigation.zero_friction_execution.proposed_action.length).toBeGreaterThan(20);

      const judgeText = serializeInvestigationForJudge(result.investigation);
      expect(judgeText).toContain("Causal chain:");
      expect(judgeText).toContain("Proposed action:");
    }
  });
});
