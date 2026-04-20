import { describe, expect, it } from "vitest";

import { deriveCanonicalReportSections } from "./reportSections";

describe("deriveCanonicalReportSections", () => {
  it("maps canonical answer blocks into the four saved report sections", () => {
    const sections = deriveCanonicalReportSections({
      answer: "Stripe is a payments platform with strong enterprise reach.",
      sourceRefs: [{ id: "src_1" }, { id: "src_2" }, { id: "src_3" }],
      answerBlocks: [
        {
          id: "answer:block:summary",
          title: "What it is",
          text: "Stripe is a payments platform with strong enterprise reach.",
          sourceRefIds: ["src_1", "src_2"],
        },
        {
          id: "answer:block:why",
          title: "Why it matters",
          text: "Enterprise distribution and developer adoption keep the company strategically relevant.",
          sourceRefIds: ["src_2"],
        },
        {
          id: "answer:block:gaps",
          title: "What is missing",
          text: "The packet still needs clearer profitability proof.",
          sourceRefIds: ["src_3"],
        },
        {
          id: "answer:block:next",
          title: "What to do next",
          text: "Validate monetization quality and expansion durability.",
          sourceRefIds: ["src_2", "src_3"],
        },
      ],
    });

    expect(sections.map((section) => section.title)).toEqual([
      "What it is",
      "Why it matters",
      "What is missing",
      "What to do next",
    ]);
    expect(sections[0]?.sourceRefIds).toEqual(["src_1", "src_2"]);
    expect(sections[1]?.body).toContain("developer adoption");
    expect(sections[2]?.sourceRefIds).toEqual(["src_3"]);
    expect(sections[3]?.sourceRefIds).toEqual(["src_2", "src_3", "src_1"]);
  });

  it("falls back to source indices when packet blocks are missing", () => {
    const sections = deriveCanonicalReportSections({
      answer: "NodeBench compacts research into a reusable packet.",
      sourceRefs: [{ id: "src_1" }, { id: "src_2" }],
      variables: [{ name: "Founder-market fit", sourceIdx: 1 }],
      changes: [{ description: "Packet readability improved", sourceIdx: 0 }],
      risks: [{ title: "Proof gap", description: "More external validation needed", sourceIdx: 1 }],
      interventions: [{ action: "Publish the packet and review source depth." }],
      nextQuestions: ["Which sources best prove product pull?"],
    });

    expect(sections[1]?.body).toContain("Packet readability improved");
    expect(sections[1]?.sourceRefIds).toEqual(["src_1", "src_2"]);
    expect(sections[2]?.sourceRefIds).toEqual(["src_2"]);
    expect(sections[3]?.body).toContain("Publish the packet");
  });

  it("supports prep-brief section titles without changing canonical ids", () => {
    const sections = deriveCanonicalReportSections(
      {
        answer: "Walk in with Stripe's enterprise growth story and margin questions ready.",
        sourceRefs: [{ id: "src_1" }, { id: "src_2" }],
        answerBlocks: [
          {
            id: "answer:block:summary",
            title: "Summary",
            text: "Lead with Stripe's enterprise momentum and where the proof still feels thin.",
            sourceRefIds: ["src_1"],
          },
        ],
      },
      { mode: "prep_brief" },
    );

    expect(sections.map((section) => section.id)).toEqual([
      "what-it-is",
      "why-it-matters",
      "what-is-missing",
      "what-to-do-next",
    ]);
    expect(sections.map((section) => section.title)).toEqual([
      "What to walk in knowing",
      "Why they'll care",
      "Likely questions or objections",
      "Talk track and next move",
    ]);
  });
});
