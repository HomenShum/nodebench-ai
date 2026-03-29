/**
 * Voice session routes — Gemini 3.1 Flash Live API
 *
 * Generates ephemeral tokens for client-side WebSocket connections
 * to Gemini Live API. The browser connects directly to Gemini —
 * no server-side WebRTC proxy needed.
 *
 * Flow:
 *   1. Client calls POST /voice/session
 *   2. Server generates ephemeral token using GEMINI_API_KEY
 *   3. Client opens WebSocket to Gemini with ephemeral token
 *   4. All audio streams directly between browser and Gemini
 */

import { Router } from "express";
import { getGeminiVoiceTools, executeVoiceTool } from "../agents/voiceAgent.js";

// ── Constants ──────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-3.1-flash-live-preview";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com";

// Ephemeral token endpoint
const EPHEMERAL_TOKEN_URL = `${GEMINI_API_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent`;

// WebSocket endpoints
const WS_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage";
const WS_URL_DIRECT = `${WS_BASE}.v1beta.GenerativeService.BidiGenerateContent`;
const WS_URL_EPHEMERAL = `${WS_BASE}.v1alpha.GenerativeService.BidiGenerateContentConstrained`;

// Session tracking (in-memory, bounded)
const MAX_SESSIONS = 100;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const sessions = new Map<string, { userId: string; createdAt: number; model: string }>();

function evictStaleSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
  // Hard cap
  if (sessions.size > MAX_SESSIONS) {
    const oldest = Array.from(sessions.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (let i = 0; i < oldest.length - MAX_SESSIONS; i++) {
      sessions.delete(oldest[i][0]);
    }
  }
}

// ── Router ─────────────────────────────────────────────────────────────────

export function createSessionRouter(): Router {
  const router = Router();

  /**
   * POST /voice/session
   *
   * Creates a Gemini Live session config for the client.
   * Returns either:
   *   - ephemeral token + WebSocket URL (secure, production)
   *   - direct API key + WebSocket URL (dev mode fallback)
   *
   * Request: { userId: string, model?: string, systemInstruction?: string }
   * Response: { sessionId, wsUrl, token?, apiKey?, config, tools }
   */
  router.post("/session", async (req, res) => {
    try {
      const {
        userId,
        model = GEMINI_MODEL,
        systemInstruction,
      } = req.body as {
        userId?: string;
        model?: string;
        systemInstruction?: string;
      };

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "GEMINI_API_KEY not configured",
          fallback: "browser",
        });
      }

      evictStaleSessions();

      const sessionId = `gemini-live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Try to get ephemeral token
      let token: string | null = null;
      let wsUrl: string;

      try {
        const tokenRes = await fetch(
          `${GEMINI_API_BASE}/v1beta/models/${model}:generateEphemeralToken?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(5000),
          },
        );

        if (tokenRes.ok) {
          const tokenData = (await tokenRes.json()) as { token?: string };
          token = tokenData.token ?? null;
        }
      } catch {
        // Ephemeral token API may not be available — fall back to direct key
      }

      if (token) {
        wsUrl = `${WS_URL_EPHEMERAL}?access_token=${token}`;
      } else {
        // Dev fallback: pass API key directly (not for production)
        wsUrl = `${WS_URL_DIRECT}?key=${apiKey}`;
      }

      // Build Gemini Live config
      const tools = getGeminiVoiceTools();

      const config = {
        model: `models/${model}`,
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede", // Natural, clear voice
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text:
                systemInstruction ??
                [
                  "You are NodeBench, an AI research assistant for founders and operators.",
                  "Help users investigate companies, analyze markets, and make decisions.",
                  "Be concise and direct. Lead with the answer, not the reasoning.",
                  "When users ask about a company or market, use your tools to search for information.",
                  "Speak naturally and conversationally.",
                ].join(" "),
            },
          ],
        },
        tools,
      };

      // Track session
      sessions.set(sessionId, { userId, createdAt: Date.now(), model });

      res.json({
        sessionId,
        wsUrl,
        token: token ?? undefined,
        apiKey: token ? undefined : apiKey, // Only send raw key if no ephemeral token
        model,
        config,
      });
    } catch (error) {
      console.error("[POST /voice/session] Error:", error);
      res.status(500).json({
        error: "Failed to create session",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * DELETE /voice/session/:sessionId
   * Remove session tracking (client closes WebSocket directly)
   */
  router.delete("/session/:sessionId", (_req, res) => {
    const { sessionId } = _req.params;
    sessions.delete(sessionId);
    res.json({ status: "removed" });
  });

  /**
   * POST /voice/tool
   * Execute a tool call from the Gemini Live session.
   * Client sends tool calls here when Gemini requests function execution.
   */
  router.post("/tool", async (req, res) => {
    try {
      const { name, args, userId } = req.body as {
        name?: string;
        args?: Record<string, unknown>;
        userId?: string;
      };
      if (!name) {
        return res.status(400).json({ error: "Tool name is required" });
      }
      const result = await executeVoiceTool(name, args ?? {}, userId ?? "web-user");
      res.json(result);
    } catch (error) {
      console.error("[POST /voice/tool] Error:", error);
      res.status(500).json({
        error: "Tool execution failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /voice/health
   * Voice subsystem health check
   */
  router.get("/health", (_req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({
      status: hasKey ? "ok" : "unconfigured",
      provider: "gemini-live",
      model: GEMINI_MODEL,
      activeSessions: sessions.size,
      maxSessions: MAX_SESSIONS,
    });
  });

  return router;
}
