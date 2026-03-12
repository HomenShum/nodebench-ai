/**
 * Shared LLM client — all judges use fetch, no runtime deps.
 * Supports Gemini (default) and OpenAI-compatible endpoints.
 */
import { JudgeTimeout, LLMApiError, MalformedJudgeResponse } from "../errors.js";

// ── Endpoint resolution ──────────────────────────────────────────────

interface LLMEndpoint {
  url: string;
  headers: Record<string, string>;
  buildBody: (model: string, systemPrompt: string, userPrompt: string, imageBase64?: string, videoUrl?: string) => unknown;
}

function geminiEndpoint(model: string): LLMEndpoint {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? "";
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    headers: { "Content-Type": "application/json" },
    buildBody: (_model, systemPrompt, userPrompt, imageBase64, videoUrl) => {
      const parts: Array<Record<string, unknown>> = [];
      if (imageBase64) {
        // Strip data URI prefix if present
        const clean = imageBase64.replace(/^data:image\/[^;]+;base64,/, "");
        parts.push({ inlineData: { mimeType: "image/png", data: clean } });
      }
      if (videoUrl) {
        parts.push({ fileData: { mimeType: "video/mp4", fileUri: videoUrl } });
      }
      parts.push({ text: userPrompt });
      return {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      };
    },
  };
}

function openaiEndpoint(model: string): LLMEndpoint {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  return {
    url: `${baseUrl}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    buildBody: (_model, systemPrompt, userPrompt, imageBase64) => {
      const userContent: Array<Record<string, unknown>> = [];
      if (imageBase64) {
        const dataUri = imageBase64.startsWith("data:")
          ? imageBase64
          : `data:image/png;base64,${imageBase64}`;
        userContent.push({ type: "image_url", image_url: { url: dataUri } });
      }
      userContent.push({ type: "text", text: userPrompt });
      return {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      };
    },
  };
}

function anthropicEndpoint(model: string): LLMEndpoint {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  return {
    url: "https://api.anthropic.com/v1/messages",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    buildBody: (_model, systemPrompt, userPrompt, imageBase64) => {
      const content: Array<Record<string, unknown>> = [];
      if (imageBase64) {
        const clean = imageBase64.replace(/^data:image\/[^;]+;base64,/, "");
        content.push({
          type: "image",
          source: { type: "base64", media_type: "image/png", data: clean },
        });
      }
      content.push({ type: "text", text: userPrompt });
      return {
        model,
        system: systemPrompt,
        messages: [{ role: "user", content }],
        max_tokens: 4096,
      };
    },
  };
}

function resolveEndpoint(model: string): LLMEndpoint {
  if (model.startsWith("gemini")) return geminiEndpoint(model);
  if (model.startsWith("claude")) return anthropicEndpoint(model);
  return openaiEndpoint(model);
}

// ── JSON repair ──────────────────────────────────────────────────────

/**
 * Attempt to repair truncated/malformed JSON from LLM responses.
 * Handles common failure modes: trailing commas, unclosed brackets, markdown fences.
 */
export function repairJson(raw: string): string {
  let s = raw.trim();
  // Strip markdown code fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  s = s.trim();
  // Remove trailing commas before closing brackets
  s = s.replace(/,\s*([}\]])/g, "$1");
  // Try to close unclosed structures
  const opens = (s.match(/{/g) ?? []).length;
  const closes = (s.match(/}/g) ?? []).length;
  if (opens > closes) {
    s += "}".repeat(opens - closes);
  }
  const openBrackets = (s.match(/\[/g) ?? []).length;
  const closeBrackets = (s.match(/]/g) ?? []).length;
  if (openBrackets > closeBrackets) {
    s += "]".repeat(openBrackets - closeBrackets);
  }
  return s;
}

// ── Core call ────────────────────────────────────────────────────────

export interface LLMCallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  imageBase64?: string;
  videoUrl?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Call an LLM and parse its JSON response.
 * Handles timeouts, HTTP errors, and truncated JSON repair.
 */
export async function callLLM<T>(options: LLMCallOptions): Promise<T> {
  const {
    model,
    systemPrompt,
    userPrompt,
    imageBase64,
    videoUrl,
    timeoutMs = 60_000,
    signal,
  } = options;

  const endpoint = resolveEndpoint(model);
  const body = endpoint.buildBody(model, systemPrompt, userPrompt, imageBase64, videoUrl);

  // Compose abort: user signal + timeout
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  let response: Response;
  try {
    response = await fetch(endpoint.url, {
      method: "POST",
      headers: endpoint.headers,
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new JudgeTimeout(model, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(unreadable)");
    throw new LLMApiError(response.status, errorBody, model);
  }

  const responseBody = await response.json();

  // Extract text from different API response shapes
  let text: string;
  if (model.startsWith("gemini")) {
    text = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else if (model.startsWith("claude")) {
    const block = responseBody?.content?.find(
      (b: { type: string }) => b.type === "text",
    );
    text = block?.text ?? "";
  } else {
    text = responseBody?.choices?.[0]?.message?.content ?? "";
  }

  // Parse with repair
  try {
    return JSON.parse(text) as T;
  } catch {
    const repaired = repairJson(text);
    try {
      return JSON.parse(repaired) as T;
    } catch (e2: unknown) {
      throw new MalformedJudgeResponse(
        text,
        e2 instanceof Error ? e2.message : String(e2),
      );
    }
  }
}
