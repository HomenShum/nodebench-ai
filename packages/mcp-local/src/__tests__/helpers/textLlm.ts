export type TextLlmProviderName = "gemini" | "openai" | "anthropic" | "none";

export type TextLlmClient = {
  provider: TextLlmProviderName;
  model: string;
  generateText: (args: { prompt: string; temperature?: number; maxOutputTokens?: number }) => Promise<string>;
};

export type TextLlmHistoryMessage = { role: "user" | "model"; parts: Array<{ text: string }> };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableLlmError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? "").toLowerCase();
  if (!msg) return false;

  // Network/transient errors
  if (msg.includes("fetch failed")) return true;
  if (msg.includes("sending request")) return true;
  if (msg.includes("etimedout") || msg.includes("timeout")) return true;
  if (msg.includes("econnreset") || msg.includes("socket hang up")) return true;
  if (msg.includes("enotfound") || msg.includes("eai_again")) return true;

  // Provider-side throttling/overload
  if (msg.includes("429")) return true;
  if (msg.includes("rate limit")) return true;
  if (msg.includes("resource exhausted")) return true;
  if (msg.includes("overloaded") || msg.includes("temporarily unavailable")) return true;

  return false;
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const maxRetries = Number.parseInt(process.env.NODEBENCH_LLM_MAX_RETRIES ?? "4", 10);
  const baseMs = Number.parseInt(process.env.NODEBENCH_LLM_RETRY_BASE_MS ?? "500", 10);
  const retries = Number.isFinite(maxRetries) ? Math.max(0, Math.min(maxRetries, 10)) : 4;
  const base = Number.isFinite(baseMs) ? Math.max(100, Math.min(baseMs, 10_000)) : 500;

  let attempt = 0;
  // attempt=0 is the first call; retry attempts are 1..retries
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const canRetry = attempt < retries && isRetryableLlmError(err);
      if (!canRetry) throw err;
      const backoff = base * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 100);
      // eslint-disable-next-line no-console
      console.warn(`[llm:${label}] retrying after error (attempt=${attempt + 1}/${retries}): ${String((err as any)?.message ?? err)}`);
      await sleep(backoff + jitter);
      attempt++;
    }
  }
}

export function historyToPrompt(history: TextLlmHistoryMessage[]): string {
  // Provider-neutral: we serialize the chat into a single prompt string.
  return history
    .map((m) => {
      const body = m.parts.map((p) => p.text).join("");
      return `${m.role.toUpperCase()}:\n${body}`;
    })
    .join("\n\n");
}

export async function generateTextFromHistory(
  llm: TextLlmClient,
  history: TextLlmHistoryMessage[],
  opts?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  return llm.generateText({
    prompt: historyToPrompt(history),
    temperature: opts?.temperature,
    maxOutputTokens: opts?.maxOutputTokens,
  });
}

function parseProvider(raw: string | undefined): TextLlmProviderName | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v === "gemini" || v === "google") return "gemini";
  if (v === "openai") return "openai";
  if (v === "anthropic" || v === "claude") return "anthropic";
  return null;
}

function splitProviderFromModel(rawModel: string): { providerHint: TextLlmProviderName | null; model: string } {
  const match = String(rawModel).trim().match(/^([a-zA-Z]+)\s*:\s*(.+)$/);
  if (!match) return { providerHint: null, model: rawModel };
  const provider = parseProvider(match[1]);
  return { providerHint: provider, model: match[2] };
}

function inferProviderFromModelName(model: string): TextLlmProviderName | null {
  const m = String(model).trim().toLowerCase();
  if (!m) return null;
  if (m.startsWith("gemini")) return "gemini";
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3")) return "openai";
  if (m.startsWith("claude")) return "anthropic";
  return null;
}

async function tryCreateGeminiClient(model: string): Promise<TextLlmClient | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
  if (!apiKey) return null;
  try {
    const mod = await import("@google/genai");
    const { GoogleGenAI } = mod as any;
    const ai = new GoogleGenAI({ apiKey });
    return {
      provider: "gemini",
      model,
      generateText: async ({ prompt, temperature, maxOutputTokens }) => {
        const response = await withRetry(`gemini:${model}`, async () =>
          ai.models.generateContent({
            model,
            contents: [{ role: "user" as const, parts: [{ text: prompt }] }],
            config: {
              temperature: typeof temperature === "number" ? temperature : 0,
              maxOutputTokens: typeof maxOutputTokens === "number" ? maxOutputTokens : 1024,
            },
          })
        );
        const parts = (response as any)?.candidates?.[0]?.content?.parts ?? [];
        return parts.map((p: any) => p?.text ?? "").join("").trim();
      },
    };
  } catch {
    return null;
  }
}

async function tryCreateOpenAIClient(model: string): Promise<TextLlmClient | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const OpenAI = (await import("openai")).default as any;
    const client = new OpenAI();
    return {
      provider: "openai",
      model,
      generateText: async ({ prompt, temperature, maxOutputTokens }) => {
        const result = await withRetry(`openai:${model}`, async () =>
          client.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: typeof temperature === "number" ? temperature : 0,
            max_tokens: typeof maxOutputTokens === "number" ? maxOutputTokens : 1024,
          })
        );
        return String(result.choices?.[0]?.message?.content ?? "").trim();
      },
    };
  } catch {
    return null;
  }
}

async function tryCreateAnthropicClient(model: string): Promise<TextLlmClient | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default as any;
    const client = new Anthropic();
    return {
      provider: "anthropic",
      model,
      generateText: async ({ prompt, temperature, maxOutputTokens }) => {
        const result = await withRetry(`anthropic:${model}`, async () =>
          client.messages.create({
            model,
            max_tokens: typeof maxOutputTokens === "number" ? maxOutputTokens : 1024,
            temperature: typeof temperature === "number" ? temperature : 0,
            messages: [{ role: "user", content: prompt }],
          })
        );
        const text = (result.content ?? [])
          .filter((b: any) => b?.type === "text")
          .map((b: any) => String(b?.text ?? ""))
          .join("");
        return text.trim();
      },
    };
  } catch {
    return null;
  }
}

export async function createTextLlmClient(opts: {
  model: string;
  preferredProvider?: string;
}): Promise<TextLlmClient> {
  const split = splitProviderFromModel(opts.model);
  const model = split.model;
  const preferred =
    parseProvider(opts.preferredProvider) ??
    parseProvider(process.env.NODEBENCH_LLM_PROVIDER) ??
    split.providerHint;
  const hint = split.providerHint ?? inferProviderFromModelName(model);

  const factories: Array<{
    name: TextLlmProviderName;
    create: (model: string) => Promise<TextLlmClient | null>;
  }> = [
    { name: "gemini", create: tryCreateGeminiClient },
    { name: "openai", create: tryCreateOpenAIClient },
    { name: "anthropic", create: tryCreateAnthropicClient },
  ];

  if (preferred) {
    const factory = factories.find((f) => f.name === preferred);
    const client = factory ? await factory.create(model) : null;
    if (!client) {
      throw new Error(
        `Preferred LLM provider \"${preferred}\" is not available. Set the corresponding API key env var (GEMINI_API_KEY/GOOGLE_AI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY).`
      );
    }
    return client;
  }

  const ordered = hint ? [hint, ...factories.map((f) => f.name).filter((n) => n !== hint)] : factories.map((f) => f.name);
  const factoryByName = new Map(factories.map((f) => [f.name, f] as const));

  for (const name of ordered) {
    const f = factoryByName.get(name);
    if (!f) continue;
    const client = await f.create(model);
    if (client) return client;
  }

  throw new Error(
    "No LLM provider available. Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY), OPENAI_API_KEY, or ANTHROPIC_API_KEY."
  );
}
