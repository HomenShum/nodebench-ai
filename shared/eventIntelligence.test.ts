import { describe, expect, it } from "vitest";

import {
  buildEventServingStatus,
  formatEventCaptureAck,
  getDefaultEventSearchPolicy,
} from "./eventIntelligence";

describe("eventIntelligence", () => {
  it("keeps at-event capture on the active event session with no paid search", () => {
    const policy = getDefaultEventSearchPolicy("member", "at_event_capture");

    expect(policy).toMatchObject({
      scenario: "at_event_capture",
      freshness: "cached_ok",
      maxCostCents: 0,
      allowPaidSearch: false,
      requiresApproval: false,
      persist: true,
      persistenceScope: "private",
      preferredOrder: ["event_corpus", "tenant_memory", "source_cache"],
    });
  });

  it("requires approval for investment-grade diligence and gates paid search by role", () => {
    const memberPolicy = getDefaultEventSearchPolicy("member", "investment_grade_diligence");
    const leadPolicy = getDefaultEventSearchPolicy("research_lead", "investment_grade_diligence");

    expect(memberPolicy).toMatchObject({
      allowPaidSearch: false,
      maxCostCents: 0,
      requiresApproval: true,
      persistenceScope: "team",
    });
    expect(leadPolicy).toMatchObject({
      allowPaidSearch: true,
      maxCostCents: 500,
      requiresApproval: true,
    });
  });

  it("returns product-level status copy without provider names", () => {
    const policy = getDefaultEventSearchPolicy("member", "investment_grade_diligence");
    const status = buildEventServingStatus(policy, {
      eventCorpusHit: true,
      tenantMemoryHit: true,
    });

    expect(status).toMatchObject({
      label: "Using event corpus",
      detail: "No paid search used",
      paidCallsUsed: 0,
      persisted: true,
    });
    expect(`${status.label} ${status.detail}`).not.toMatch(/Brave|Serper|Tavily|Linkup/i);
  });

  it("formats event capture ack with active session target and budget status", () => {
    const policy = getDefaultEventSearchPolicy("event_guest", "at_event_capture");
    const status = buildEventServingStatus(policy, { eventCorpusHit: true });

    expect(formatEventCaptureAck({
      targetLabel: "Ship Demo Day session",
      status: "attached",
      personCount: 1,
      companyCount: 1,
      claimCount: 2,
      followUpCount: 1,
      servingStatus: status,
    })).toBe([
      "Saved to Ship Demo Day session",
      "Detected 1 person | 1 company | 2 claims | 1 follow-up",
      "Using event corpus | No paid search used | 0 paid calls",
    ].join("\n"));
  });
});
