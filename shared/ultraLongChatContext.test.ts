import { describe, expect, it } from "vitest";
import {
  buildUltraLongChatWorkingSet,
  renderUltraLongChatWorkingSetMarkdown,
  shouldLoadDailyBriefForWorkingSet,
  shouldLoadUserContextForWorkingSet,
  type EntityFastLaneCache,
  type UltraLongChatMessage,
} from "./ultraLongChatContext";

const ENTITY_CACHE: EntityFastLaneCache = {
  entity: {
    slug: "stripe",
    name: "Stripe",
    entityType: "company",
    summary: "Stripe builds payments and finance tooling.",
    updatedAt: Date.now(),
  },
  acceptedBlocks: [
    {
      kind: "summary",
      authorKind: "agent",
      text: "Stripe is expanding from payments into finance automation and revenue tooling.",
      updatedAt: Date.now(),
    },
  ],
  latestPulse: {
    summary: "Recent signals emphasize revenue tooling and enterprise finance automation.",
    body: "Recent signals emphasize revenue tooling and enterprise finance automation.",
    updatedAt: Date.now(),
  },
};

function buildMessages(...items: Array<[UltraLongChatMessage["role"], string]>): UltraLongChatMessage[] {
  return items.map(([role, content], index) => ({
    role,
    content,
    createdAt: Date.now() + index,
  }));
}

describe("ultraLongChatContext", () => {
  it("activates offer and people/financial angles for negotiation prompts", () => {
    const workingSet = buildUltraLongChatWorkingSet({
      prompt: "I got an offer from Stripe. What should I negotiate and what should I ask the CFO?",
      messages: buildMessages(
        ["user", "I'm interviewing at Stripe next week."],
        ["assistant", "Let's look at the company and the role."],
      ),
      entitySlug: "stripe",
      entityFastLaneCache: ENTITY_CACHE,
      knownEntityStateMarkdown: "[KNOWN STATE] Stripe already cached.",
      userContext: "Today's tasks: compare compensation bands",
      dailyBrief: null,
    });

    expect(workingSet.activeAngles).toContain("people_graph");
    expect(workingSet.activeAngles).toContain("financial_health");
    expect(workingSet.jitSlices.some((slice) => slice.source === "user_context")).toBe(true);
  });

  it("preserves prior angles on recap instead of dropping context", () => {
    const firstWorkingSet = buildUltraLongChatWorkingSet({
      prompt: "How does Stripe compare to Adyen and Block?",
      messages: buildMessages(
        ["user", "I'm interviewing at Stripe next week."],
        ["assistant", "Let's look at the company and role."],
        ["user", "How does Stripe compare to Adyen and Block?"],
      ),
      entitySlug: "stripe",
      entityFastLaneCache: ENTITY_CACHE,
      knownEntityStateMarkdown: "[KNOWN STATE] Stripe already cached.",
    });

    const recapWorkingSet = buildUltraLongChatWorkingSet({
      prompt: "Remind me what we learned about Stripe's competitive position.",
      messages: buildMessages(
        ["user", "I'm interviewing at Stripe next week."],
        ["assistant", "Let's look at the company and role."],
        ["user", "How does Stripe compare to Adyen and Block?"],
        ["assistant", "Competitive posture is stronger in payments distribution."],
        ["user", "Remind me what we learned about Stripe's competitive position."],
      ),
      previousWorkingSet: firstWorkingSet,
      entitySlug: "stripe",
      entityFastLaneCache: ENTITY_CACHE,
      knownEntityStateMarkdown: "[KNOWN STATE] Stripe already cached.",
    });

    expect(firstWorkingSet.activeAngles).toContain("competitive_intelligence");
    expect(recapWorkingSet.activeAngles).toContain("competitive_intelligence");
    expect(recapWorkingSet.summary).toMatch(/competitive|context/i);
  });

  it("loads user context and daily brief only when the prompt calls for them", () => {
    expect(shouldLoadUserContextForWorkingSet("What should I negotiate in my offer?", null)).toBe(true);
    expect(shouldLoadUserContextForWorkingSet("Compare Stripe and Adyen", null)).toBe(false);
    expect(shouldLoadDailyBriefForWorkingSet("What changed today at Stripe?", null)).toBe(true);
    expect(shouldLoadDailyBriefForWorkingSet("Compare Stripe and Adyen", null)).toBe(false);
  });

  it("renders a compact markdown working set with required sections", () => {
    const workingSet = buildUltraLongChatWorkingSet({
      prompt: "Tell me the latest about Stripe's finance tooling.",
      messages: buildMessages(
        ["user", "I'm interviewing at Stripe next week."],
        ["assistant", "Let's look at the company and role."],
        ["user", "Tell me the latest about Stripe's finance tooling."],
      ),
      previousWorkingSet: null,
      entitySlug: "stripe",
      entityFastLaneCache: ENTITY_CACHE,
      knownEntityStateMarkdown: "[KNOWN STATE] Stripe already cached.",
      dailyBrief: "Daily brief 2026-04-23: Stripe finance tooling expansion",
    });

    const markdown = renderUltraLongChatWorkingSetMarkdown(workingSet);
    expect(markdown).toContain("[ULTRA-LONG CHAT WORKING SET]");
    expect(markdown).toContain("activeAngles:");
    expect(markdown).toContain("jitRetrieval:");
    expect(markdown).toContain("hotWindow:");
  });
});
