/**
 * useSharedContextActions — Typed action dispatchers for shared context.
 *
 * Uses existing POST endpoints:
 *   - POST /api/shared-context/publish  (publish context packet)
 *   - POST /api/shared-context/delegate (hand off to Claude Code / OpenClaw)
 */

import { useCallback } from "react";
import {
  getSharedContextPublishUrl,
  getSharedContextDelegateUrl,
} from "@/lib/syncBridgeApi";

export type DelegateTarget = "claude_code" | "openclaw";

interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

async function postJson(url: string, body: unknown): Promise<ActionResult> {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { success: false, error: `${resp.status}: ${text || resp.statusText}` };
    }

    const data = await resp.json().catch(() => ({}));
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export interface UseSharedContextActionsReturn {
  publishPacket: (packet: Record<string, unknown>) => Promise<ActionResult>;
  delegateToAgent: (
    packet: Record<string, unknown>,
    targetAgent: DelegateTarget,
    goal: string,
  ) => Promise<ActionResult>;
}

export function useSharedContextActions(): UseSharedContextActionsReturn {
  const publishPacket = useCallback(
    (packet: Record<string, unknown>) =>
      postJson(getSharedContextPublishUrl(), { packet }),
    [],
  );

  const delegateToAgent = useCallback(
    (packet: Record<string, unknown>, targetAgent: DelegateTarget, goal: string) =>
      postJson(getSharedContextDelegateUrl(), { packet, targetAgent, goal }),
    [],
  );

  return { publishPacket, delegateToAgent };
}
