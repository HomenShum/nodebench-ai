import { describe, expect, it } from "vitest";

import {
  buildEntityAliasKey,
  buildPrepBriefPrompt,
  buildPrepBriefTitle,
  chooseEntityDisplayName,
  deriveCanonicalEntityName,
  deriveReportArtifactMode,
  extractEntitySubjectFromQuery,
  getArtifactSectionTitles,
  getReportArtifactLabel,
  isLegacyPromptArtifact,
} from "./reportArtifacts";

describe("reportArtifacts", () => {
  it("detects prep-oriented queries", () => {
    expect(deriveReportArtifactMode("Prep me for tomorrow's call with Stripe.")).toBe("prep_brief");
    expect(deriveReportArtifactMode("What changed at Stripe?")).toBe("report");
  });

  it("builds prep titles and prompts around the entity subject", () => {
    expect(buildPrepBriefTitle({ entityName: "Stripe" })).toBe("Prep brief — Stripe");
    expect(buildPrepBriefPrompt({ entityName: "Stripe" })).toBe(
      "Stripe prep brief. Include the most important facts, likely questions, likely objections or risks, and the opening I should use.",
    );
  });

  it("extracts canonical subjects from recruiter-style prep prompts", () => {
    const query =
      "Create a prep brief for Stripe. Include the most important facts, likely questions, likely objections or risks, and the opening I should use.";
    expect(extractEntitySubjectFromQuery(query)).toBe("Stripe");
    expect(
      deriveCanonicalEntityName({
        primaryEntity: "Create B.V.",
        query,
        type: "prep_brief",
      }),
    ).toBe("Stripe");
    expect(
      isLegacyPromptArtifact({
        primaryEntity: "Create B.V.",
        query,
        type: "prep_brief",
      }),
    ).toBe(true);
  });

  it("drops instruction tails after the real person subject", () => {
    const query =
      "Translate the notes, verify what is public, and prepare me for a meeting with Dirk. Need: role thesis, fit gaps, diligence questions, and a prep brief.";
    expect(extractEntitySubjectFromQuery(query)).toBe("Dirk");
    expect(
      isLegacyPromptArtifact({
        primaryEntity: "Dirk. Need",
        query,
        type: "prep_brief",
      }),
    ).toBe(true);
  });

  it("detects question-shaped entity names as legacy prompt artifacts", () => {
    expect(
      isLegacyPromptArtifact({
        primaryEntity: "What does Ramp do and what matters most right now?",
        query: "What does Ramp do and what matters most right now?",
        type: "report",
      }),
    ).toBe(true);
  });

  it("extracts entities from follow-up style question prompts", () => {
    expect(
      extractEntitySubjectFromQuery("What is SoftBank and what matters most right now?"),
    ).toBe("SoftBank");
  });

  it("returns prep-specific labels and section titles", () => {
    expect(getReportArtifactLabel("prep_brief")).toBe("Prep brief");
    expect(getArtifactSectionTitles("prep_brief")["what-to-do-next"]).toBe("Talk track and next move");
  });

  it("builds stable alias keys for company suffix variants", () => {
    expect(
      buildEntityAliasKey({
        primaryEntity: "SoftBank Group Corp.",
        entityType: "company",
      }),
    ).toBe("softbank");
    expect(
      buildEntityAliasKey({
        primaryEntity: "SoftBank",
        entityType: "company",
      }),
    ).toBe("softbank");
    expect(
      buildEntityAliasKey({
        primaryEntity: "SoftBank Group Corp.",
        entityType: "report",
      }),
    ).toBe("softbank");
  });

  it("prefers cleaner company display names over legal-suffix variants", () => {
    expect(
      chooseEntityDisplayName(["SoftBank Group Corp.", "SoftBank"], "company"),
    ).toBe("SoftBank");
    expect(
      chooseEntityDisplayName(["softbank", "SoftBank"], "company"),
    ).toBe("SoftBank");
  });
});
