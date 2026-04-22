import { describe, expect, it } from "vitest";
import {
  classifyProductRequest,
  compileActionItems,
  compileTruthSections,
  decidePersistence,
  extractClaimsFromSections,
  resolveProductTarget,
  summarizeClaimLedger,
} from "./productAnswerControl";

describe("productAnswerControl", () => {
  it("treats generic tell-me-more prompts as conversational follow-ups", () => {
    expect(classifyProductRequest("Tell me more about the job and company")).toBe(
      "compound_research",
    );

    const resolution = resolveProductTarget({
      query: "Tell me more about the job and company",
      sources: [],
    });

    expect(resolution.state).toBe("unresolved");
  });

  it("promotes exact, corroborated claims to save-ready state", () => {
    const resolution = resolveProductTarget({
      query: "What is SoftBank and what matters most right now?",
      entitySlugHint: "softbank",
      packetEntityName: "SoftBank",
      sources: [
        { id: "src_1", label: "Official site", domain: "softbank.jp", excerpt: "SoftBank is a holding company." },
        { id: "src_2", label: "Reuters", domain: "reuters.com", excerpt: "SoftBank announced a new strategy update." },
      ],
    });

    const claims = extractClaimsFromSections({
      resolution,
      sources: [
        { id: "src_1", label: "Official site", domain: "softbank.jp", excerpt: "SoftBank is a holding company." },
        { id: "src_2", label: "Reuters", domain: "reuters.com", excerpt: "SoftBank announced a new strategy update." },
      ],
      sections: [
        {
          id: "what-it-is",
          title: "What it is",
          body: "SoftBank is a telecom and investment holding company.",
          sourceRefIds: ["src_1", "src_2"],
        },
        {
          id: "why-it-matters",
          title: "Why it matters",
          body: "Its capital allocation strategy affects AI infrastructure bets.",
          sourceRefIds: ["src_2"],
        },
      ],
    });

    const summary = summarizeClaimLedger(claims);
    const persistence = decidePersistence({
      resolution,
      claimSummary: summary,
      sourceCount: 2,
    });

    expect(resolution.state).toBe("exact");
    expect(summary.publishableClaims).toBeGreaterThanOrEqual(2);
    expect(persistence.saveEligibility).toBe("save_ready");
    expect(persistence.artifactState).toBe("saved");
  });

  it("keeps probable runs in draft-only mode", () => {
    const resolution = resolveProductTarget({
      query: "What is Vitalize and what matters right now?",
      packetEntityName: "Vitalize",
      sources: [{ id: "src_1", label: "Crunchbase", domain: "crunchbase.com" }],
    });

    const summary = summarizeClaimLedger(
      extractClaimsFromSections({
        resolution,
        sources: [{ id: "src_1", label: "Crunchbase", domain: "crunchbase.com" }],
        sections: [
          {
            id: "what-it-is",
            title: "What it is",
            body: "Vitalize is a healthcare startup.",
            sourceRefIds: ["src_1"],
          },
        ],
      }),
    );

    const persistence = decidePersistence({
      resolution,
      claimSummary: summary,
      sourceCount: 1,
    });

    expect(resolution.state).toBe("probable");
    expect(persistence.saveEligibility).toBe("draft_only");
    expect(persistence.artifactState).toBe("draft");
  });

  it("produces bounded action items from the save state", () => {
    const ambiguousActions = compileActionItems({
      resolution: {
        intentKind: "entity_lookup",
        state: "ambiguous",
        entityName: null,
        entitySlug: null,
        confidence: 0.4,
        reason: "Need clarification",
        candidates: [],
      },
      artifactState: "none",
      saveEligibility: "blocked",
    });
    expect(ambiguousActions.map((item) => item.type)).toContain("choose_candidate");

    const savedActions = compileActionItems({
      resolution: {
        intentKind: "entity_lookup",
        state: "exact",
        entityName: "SoftBank",
        entitySlug: "softbank",
        confidence: 0.98,
        reason: "Exact",
        candidates: [],
      },
      artifactState: "saved",
      saveEligibility: "save_ready",
    });
    expect(savedActions.find((item) => item.type === "open_report")?.enabled).toBe(true);
  });

  it("builds truth sections with claim bindings", () => {
    const sections = compileTruthSections({
      claims: [
        {
          claimKey: "claim-1",
          claimText: "SoftBank is a holding company.",
          claimType: "product_capability",
          slotKey: "product_capability",
          sectionId: "what-it-is",
          sourceRefIds: ["src_1"],
          supports: [],
          supportStrength: "verified",
          freshnessStatus: "fresh",
          contradictionFlag: false,
          conflictingClaimKeys: [],
          publishable: true,
          rejectionReasons: [],
        },
      ],
    });

    expect(sections[0]?.sentences[0]?.claimKeys).toEqual(["claim-1"]);
  });
});
