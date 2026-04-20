import { describe, expect, it } from "vitest";

import { buildSystemEntityNodes, extractArchiveMentions } from "./systemIntelligence";

describe("system intelligence extraction", () => {
  it("extracts multiple funding companies from one funding tracker post", () => {
    const mentions = extractArchiveMentions({
      content: [
        "SoftBank just raised $3.6 Billion in an undisclosed round.",
        "",
        "1. SoftBank -- $3.6 Billion [Undisclosed]",
        "2. Parasail -- $32M [Series A]",
      ].join("\n"),
      postType: "funding_tracker",
      persona: "FUNDING",
      postedAt: Date.now(),
    });

    expect(mentions.map((mention) => mention.slug)).toEqual(
      expect.arrayContaining(["softbank", "parasail"]),
    );
    expect(mentions.every((mention) => mention.entityType === "company")).toBe(true);
  });

  it("builds backlink relations from co-mentioned entities", () => {
    const nodes = buildSystemEntityNodes([
      {
        _id: "post-1",
        content: [
          "Cliffside Ventures founder packet",
          "",
          "Founder LinkedIn",
          "https://www.linkedin.com/in/xudirk/",
          "Co-founder",
          "https://www.linkedin.com/in/shae-wang/",
          "Firm site",
          "https://cliffside.ventures/",
        ].join("\n"),
        postType: "daily_digest",
        persona: "GENERAL",
        postedAt: Date.now(),
      },
    ]);

    const cliffside = nodes.find((node) => node.slug === "cliffside-ventures");
    expect(cliffside).toBeTruthy();
    expect(cliffside?.relatedEntities.map((entity) => entity.slug)).toEqual(
      expect.arrayContaining(["xudirk", "shae-wang"]),
    );
  });
});
