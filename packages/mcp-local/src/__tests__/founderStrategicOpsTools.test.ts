import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { founderStrategicOpsTools } from "../tools/founderStrategicOpsTools.js";
import { sharedContextTools } from "../tools/sharedContextTools.js";

function getFounderTool(name: string) {
  const tool = founderStrategicOpsTools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Founder strategic ops tool not found: ${name}`);
  return tool;
}

function getSharedContextTool(name: string) {
  const tool = sharedContextTools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Shared context tool not found: ${name}`);
  return tool;
}

describe("founderStrategicOpsTools", () => {
  it("publishes, lists, delegates, and resolves founder issue packets", async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const workspaceId = `workspace:${suffix}`;
    const producerPeerId = `peer:founder:${suffix}`;
    const assigneePeerId = `peer:judge:${suffix}`;

    const registerPeer = getSharedContextTool("register_shared_context_peer");
    await registerPeer.handler({
      peerId: assigneePeerId,
      product: "nodebench",
      workspaceId,
      surface: "runner",
      role: "judge",
      capabilities: ["can-judge"],
      contextScopes: ["workspace", "packet"],
    });

    const publishTool = getFounderTool("publish_founder_issue_packet");
    const listTool = getFounderTool("list_founder_issue_packets");
    const resourceTool = getFounderTool("get_founder_packet_resource");
    const delegateTool = getFounderTool("delegate_founder_issue");
    const resolveTool = getFounderTool("resolve_founder_issue");

    const published = await publishTool.handler({
      producerPeerId,
      workspaceId,
      query: "We are building a local-first MCP tool for founders but need to prove installability and investor credibility fast.",
      marketWorkflow: ["Claude Code", "MCP"],
      constraints: ["solo founder", "specific skillset"],
      userSkillset: ["TypeScript", "MCP"],
    }) as { contextId: string; strategicAngle: { id: string } };

    expect(published.contextId).toBeTruthy();
    expect(published.strategicAngle.id).toBeTruthy();

    const listed = await listTool.handler({
      requestingPeerId: producerPeerId,
      workspaceId,
      limit: 10,
    }) as { count: number; packets: Array<{ contextId: string }> };
    expect(listed.count).toBeGreaterThan(0);
    expect(listed.packets.some((packet) => packet.contextId === published.contextId)).toBe(true);

    const resource = await resourceTool.handler({
      contextId: published.contextId,
      peerId: producerPeerId,
    }) as { found: boolean; resourceUri: string | null };
    expect(resource.found).toBe(true);
    expect(resource.resourceUri).toContain(encodeURIComponent(published.contextId));

    const delegated = await delegateTool.handler({
      contextId: published.contextId,
      proposerPeerId: producerPeerId,
      assigneePeerId,
      instructions: "Pressure-test the install and adoption path, then return a bounded follow-up packet.",
    }) as { taskId: string };
    expect(delegated.taskId).toBeTruthy();

    const resolved = await resolveTool.handler({
      contextId: published.contextId,
      producerPeerId,
      resolverPeerId: producerPeerId,
      resolutionSummary: "We narrowed the first wedge to Claude Code + MCP and removed the broader dashboard promise from v1.",
    }) as { invalidatedContextId: string; resolutionContextId: string | null };
    expect(resolved.invalidatedContextId).toBe(published.contextId);
    expect(resolved.resolutionContextId).toBeTruthy();
  });

  it("compares directions and returns workflow/distribution guidance", async () => {
    const compareTool = getFounderTool("compare_founder_directions");
    const adoptionTool = getFounderTool("workflow_adoption_scan");
    const serviceTool = getFounderTool("service_to_dashboard_path");
    const distributionTool = getFounderTool("get_distribution_surfaces");
    const installPlanTool = getFounderTool("generate_team_install_plan");
    const readinessTool = getFounderTool("check_plugin_update_readiness");

    const compared = await compareTool.handler({
      directions: [
        {
          name: "NodeBench MCP for Claude Code",
          query: "Build a local-first MCP companion for founders using Claude Code and shared context packets.",
          marketWorkflow: ["Claude Code", "MCP"],
          userSkillset: ["TypeScript", "MCP"],
        },
        {
          name: "Generic AI peace dashboard",
          query: "Build a broad anti-AI collaboration dashboard with no model integrations.",
          constraints: ["no ai", "anti ai"],
        },
      ],
    }) as { recommendation: { direction: string }; comparisons: Array<{ name: string }> };
    expect(compared.comparisons).toHaveLength(2);
    expect(compared.recommendation.direction).toBeTruthy();

    const adoption = await adoptionTool.handler({
      query: "We should lead with Claude Code and MCP for developer founders, then add a dashboard later.",
      marketWorkflow: ["Claude Code", "MCP"],
      installSurface: ["local", "dashboard"],
    }) as { fitScore: number; recommendedSurface: string };
    expect(adoption.fitScore).toBeGreaterThan(60);
    expect(adoption.recommendedSurface).toContain("claude");

    const servicePath = await serviceTool.handler({
      concept: "retention.sh style QA plus NodeBench founder packet review",
      currentAssets: ["local MCP", "shared context", "ledger UI"],
      seatCount: 4,
      workflowAnchor: ["Claude Code", "MCP"],
    }) as { recommendedPath: string; pathScores: { hybrid: number } };
    expect(servicePath.recommendedPath).toBeTruthy();
    expect(servicePath.pathScores.hybrid).toBeGreaterThan(0);

    const surfaces = await distributionTool.handler({}) as { surfaces: Array<{ id: string }> };
    expect(surfaces.surfaces.some((surface) => surface.id === "install_script")).toBe(true);

    const installPlan = await installPlanTool.handler({
      teamType: "founder",
      targetWorkflow: "Claude Code",
      seatCount: 3,
      requiresOffline: true,
    }) as { installCommand: string; steps: string[] };
    expect(installPlan.installCommand).toContain("nodebench-mcp");
    expect(installPlan.steps.length).toBeGreaterThan(2);

    const readiness = await readinessTool.handler({}) as { version: string | null; readinessChecks: { installer: boolean } };
    expect(readiness.version).toBeTruthy();
    expect(readiness.readinessChecks.installer).toBe(true);
  });

  it("supports install plan write, watchlist, share links, and retention parity tools", async () => {
    const installTool = getFounderTool("install_nodebench_plugin");
    const addWatchTool = getFounderTool("watchlist_add_entity");
    const listWatchTool = getFounderTool("watchlist_list_entities");
    const refreshWatchTool = getFounderTool("watchlist_refresh_entities");
    const alertWatchTool = getFounderTool("watchlist_get_alerts");
    const createShareTool = getFounderTool("share_create_packet_link");
    const getShareTool = getFounderTool("share_get_packet_link");
    const revokeShareTool = getFounderTool("share_revoke_packet_link");
    const retentionRegisterTool = getFounderTool("retention_register_connection");
    const retentionSyncTool = getFounderTool("retention_sync_findings");
    const retentionStatusTool = getFounderTool("retention_get_status");

    const installDir = mkdtempSync(join(tmpdir(), "nodebench-mcp-install-"));
    const installResult = await installTool.handler({
      targetDir: installDir,
      preset: "founder",
      dryRun: false,
    }) as { configPath: string };
    expect(existsSync(installResult.configPath)).toBe(true);
    expect(readFileSync(installResult.configPath, "utf-8")).toContain("\"nodebench\"");

    const added = await addWatchTool.handler({
      entityName: "Anthropic",
      strategicAngleId: "installability",
    }) as { status: string };
    expect(["added", "already_watching"]).toContain(added.status);

    const listed = await listWatchTool.handler({}) as { count: number; entities: Array<{ entityName: string }> };
    expect(listed.count).toBeGreaterThan(0);
    expect(listed.entities.some((entity) => entity.entityName === "Anthropic")).toBe(true);

    await refreshWatchTool.handler({
      changes: [{ entityName: "Anthropic", summary: "New Claude Code workflow launch increased developer adoption." }],
    });
    const alerts = await alertWatchTool.handler({}) as { alerts: Array<{ entityName: string }> };
    expect(alerts.alerts.some((alert) => alert.entityName === "Anthropic")).toBe(true);

    const share = await createShareTool.handler({
      packetId: "packet:test",
      packetType: "founder_issue",
      subject: "Founder installability memo",
      summary: "Narrow the first install surface to Claude Code + MCP.",
      payload: { recommendedSurface: "claude_code_mcp" },
      baseUrl: "https://example.com",
    }) as { shareId: string; shareUrl: string };
    expect(share.shareUrl).toContain(share.shareId);
    const retrievedShare = await getShareTool.handler({ shareId: share.shareId }) as { found: boolean; subject: string };
    expect(retrievedShare.found).toBe(true);
    expect(retrievedShare.subject).toContain("Founder installability memo");
    const revokedShare = await revokeShareTool.handler({ shareId: share.shareId }) as { revoked: boolean };
    expect(revokedShare.revoked).toBe(true);

    const retention = await retentionRegisterTool.handler({
      teamCode: "team-123",
      version: "1.2.3",
      memberCount: 5,
    }) as { status: string; peerId: string };
    expect(retention.status).toBe("connected");
    expect(retention.peerId).toContain("retention");

    const synced = await retentionSyncTool.handler({
      teamCode: "team-123",
      qaFindings: [{ page: "/", score: 92, issues: [] }],
      qaScore: 92,
      tokensSaved: 1400,
      teamMembers: 5,
    }) as { status: string; findingsReceived: number };
    expect(synced.status).toBe("synced");
    expect(synced.findingsReceived).toBe(1);

    const retentionStatus = await retentionStatusTool.handler({
      teamCode: "team-123",
    }) as { connected: boolean; qaScore: number | null; recentEvents: unknown[] };
    expect(retentionStatus.connected).toBe(true);
    expect(retentionStatus.qaScore).toBe(92);
    expect(retentionStatus.recentEvents.length).toBeGreaterThan(0);
  });
});
