import { describe, expect, it } from "vitest";

import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import {
  buildEntityPrepChatPath,
  buildEntityRefreshChatPath,
  buildEntityReopenChatPath,
  getSectionSources,
  getSourceSupportingSections,
} from "./EntityPage";

describe("EntityPage route helpers", () => {
  it("builds a deterministic reopen path from the saved report query and lens", () => {
    expect(
      buildEntityReopenChatPath(
        { query: "What does Ramp do and why does it matter?", lens: "founder" },
        { slug: "ramp", name: "Ramp" },
      ),
    ).toBe(
      buildCockpitPath({
        surfaceId: "workspace",
        entity: "ramp",
        extra: {
          q: "What does Ramp do and why does it matter?",
          lens: "founder",
        },
      }),
    );
  });

  it("prefers the refresh contract returned from Reports when routing back into Chat", () => {
    expect(
      buildEntityRefreshChatPath(
        {
          reportId: "report_123",
          entitySlug: "ramp",
          lens: "investor",
          refreshPrompt: "Update Ramp and show me what changed from the saved report.",
        },
        {
          _id: "fallback_report",
          query: "Fallback query",
          lens: "founder",
        },
        { slug: "ramp", name: "Ramp" },
      ),
    ).toBe(
      buildCockpitPath({
        surfaceId: "workspace",
        entity: "ramp",
        extra: {
          q: "Update Ramp and show me what changed from the saved report.",
          lens: "investor",
          report: "report_123",
        },
      }),
    );
  });

  it("builds a prep-brief path for the current entity", () => {
    expect(
      buildEntityPrepChatPath(
        { query: "What changed at Ramp?", lens: "investor" },
        { slug: "ramp", name: "Ramp" },
      ),
    ).toBe(
      buildCockpitPath({
        surfaceId: "workspace",
        entity: "ramp",
        extra: {
          q: "Ramp prep brief. Include the most important facts, likely questions, likely objections or risks, and the opening I should use.",
          lens: "investor",
        },
      }),
    );
  });

  it("falls back to a generated refresh prompt when the refresh result is sparse", () => {
    expect(
      buildEntityRefreshChatPath(
        null,
        {
          _id: "report_456",
          query: "What changed at Ramp?",
          lens: "founder",
        },
        { slug: "ramp", name: "Ramp" },
      ),
    ).toBe(
      buildCockpitPath({
        surfaceId: "workspace",
        entity: "ramp",
        extra: {
          q: "Update Ramp and show me what changed from the saved report.",
          lens: "founder",
          report: "report_456",
        },
      }),
    );
  });

  it("resolves section sources by id or label and preserves their full order", () => {
    expect(
      getSectionSources(
        {
          id: "signals",
          title: "Signals",
          body: "Important signals.",
          sourceRefIds: ["src_1", "The Information"],
        },
        [
          { id: "src_1", label: "Crunchbase", href: "https://www.crunchbase.com" },
          { id: "src_2", label: "The Information", href: "https://www.theinformation.com" },
          { id: "src_3", label: "TechCrunch", href: "https://techcrunch.com" },
        ],
      ).map((source) => source.label),
    ).toEqual(["Crunchbase", "The Information"]);
  });

  it("lists every saved section supported by a given source", () => {
    expect(
      getSourceSupportingSections(
        { id: "src_2", label: "The Information", href: "https://www.theinformation.com" },
        [
          {
            id: "signals",
            title: "Signals",
            body: "Important signals.",
            sourceRefIds: ["src_2"],
          },
          {
            id: "why-it-matters",
            title: "Why it matters",
            body: "Why this matters.",
            sourceRefIds: ["The Information"],
          },
          {
            id: "next-step",
            title: "What to do next",
            body: "Call the founder.",
            sourceRefIds: ["src_9"],
          },
        ],
      ),
    ).toEqual(["Signals", "Why it matters"]);
  });
});
