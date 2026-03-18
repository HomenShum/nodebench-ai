import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { resetControlPlaneV2DemoState } from "./control-plane-v2-store.js";

describe("control-plane v2 routes", () => {
  let server: Server | undefined;

  beforeEach(() => {
    resetControlPlaneV2DemoState();
  });

  afterEach(async () => {
    if (server) {
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
      server = undefined;
    }
  });

  async function startServer() {
    const { createApp } = await import("../app.js");
    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
    const port = (server.address() as AddressInfo).port;
    return `http://127.0.0.1:${port}`;
  }

  it("creates, fetches, and revokes a passport", async () => {
    const baseUrl = await startServer();
    const createResponse = await fetch(`${baseUrl}/v2/passports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        subject_type: "agent",
        subject_id: "agent_forensics",
        agent_id: "agent_forensics",
        scopes: [{ resource: "search", action: "read" }],
        approval_policy: { mode: "supervised", requires_human_approval: true, max_spend_usd: 25 },
      }),
    });

    const createdPassport = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createdPassport.passport_id).toMatch(/^pass_/);

    const getResponse = await fetch(`${baseUrl}/v2/passports/${createdPassport.passport_id}`, {
      headers: { Connection: "close" },
    });
    const fetchedPassport = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(fetchedPassport.agent_id).toBe("agent_forensics");

    const revokeResponse = await fetch(`${baseUrl}/v2/passports/${createdPassport.passport_id}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ reason: "Human escalation requested" }),
    });
    const revokedPassport = await revokeResponse.json();
    expect(revokeResponse.status).toBe(200);
    expect(revokedPassport.revoked).toBe(true);
    expect(revokedPassport.reason).toContain("Human escalation");
  }, 10_000);

  it("lists, fetches, and rolls back a reversible receipt", async () => {
    const baseUrl = await startServer();
    const listResponse = await fetch(`${baseUrl}/v2/receipts?agent_id=agent_research_copilot`, {
      headers: { Connection: "close" },
    });
    const listedReceipts = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listedReceipts.total).toBeGreaterThan(0);

    const reversibleReceipt = listedReceipts.receipts.find((receipt: { reversible: boolean }) => receipt.reversible);
    expect(reversibleReceipt).toBeTruthy();

    const getResponse = await fetch(`${baseUrl}/v2/receipts/${reversibleReceipt.receipt_id}`, {
      headers: { Connection: "close" },
    });
    const fetchedReceipt = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(fetchedReceipt.receipt_id).toBe(reversibleReceipt.receipt_id);

    const rollbackResponse = await fetch(`${baseUrl}/v2/receipts/${reversibleReceipt.receipt_id}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ reason: "Operator requested rollback" }),
    });
    const rollbackResult = await rollbackResponse.json();
    expect(rollbackResponse.status).toBe(200);
    expect(rollbackResult.rolled_back).toBe(true);
    expect(rollbackResult.rollback_ref).toBeTruthy();
  });

  it("returns a deterministic enterprise investigation from /v2/investigations/:id", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v2/investigations/xz-backdoor`, {
      headers: { Connection: "close" },
    });

    const investigation = await response.json();
    expect(response.status).toBe(200);
    expect(investigation.meta?.investigation_id).toBe("inv_eval_xz-backdoor");
    expect(investigation.meta?.query).toContain("XZ Utils backdoor");
    expect(investigation.traceability?.trace_id).toBe("eval_xz-backdoor");
  });

  it("creates and updates an intent ledger", async () => {
    const baseUrl = await startServer();
    const createResponse = await fetch(`${baseUrl}/v2/intent-ledgers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        subject_id: "user_demo_777",
        goals: [{ goal_id: "goal_1", text: "Keep customer data access reviewable." }],
        constraints: [{ constraint_id: "constraint_1", text: "Require approval for external side effects.", severity: "hard" }],
        thresholds: [{ key: "daily_spend", value: 100, unit: "usd" }],
        escalation_rules: [{ rule_id: "rule_1", condition: "external_side_effect", action: "ask_human" }],
      }),
    });

    const createdLedger = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createdLedger.ledger_id).toMatch(/^ledger_/);
    expect(createdLedger.version).toBe(1);

    const updateResponse = await fetch(`${baseUrl}/v2/intent-ledgers/${createdLedger.ledger_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        subject_id: "user_demo_777",
        goals: [
          { goal_id: "goal_1", text: "Keep customer data access reviewable." },
          { goal_id: "goal_2", text: "Escalate production writes to a human." },
        ],
        constraints: [{ constraint_id: "constraint_1", text: "Require approval for external side effects.", severity: "hard" }],
        thresholds: [{ key: "daily_spend", value: 75, unit: "usd" }],
        escalation_rules: [{ rule_id: "rule_1", condition: "production_write", action: "ask_human" }],
      }),
    });

    const updatedLedger = await updateResponse.json();
    expect(updateResponse.status).toBe(200);
    expect(updatedLedger.version).toBe(2);
    expect(updatedLedger.goals).toHaveLength(2);
    expect(updatedLedger.thresholds[0]?.value).toBe(75);
  });
});