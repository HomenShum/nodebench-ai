/** Bounded HTTP I/O for this Telegram integration, including streamed bodies. */
export const TELEGRAM_HTTP_TIMEOUT_MS = 10_000;
export const TELEGRAM_UPDATE_MAX_BYTES = 64 * 1024;
export const TELEGRAM_RESPONSE_MAX_BYTES = 1024 * 1024;

export class TelegramHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "TelegramHttpError";
  }
}

export function getTelegramWebhookSecret(): string {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  // Telegram's setWebhook secret_token alphabet and length contract.
  if (!secret || !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    throw new TelegramHttpError(503, "Telegram webhook is not configured");
  }
  return secret;
}

export async function withTelegramDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TelegramHttpError(408, "Telegram HTTP operation timed out"));
    }, TELEGRAM_HTTP_TIMEOUT_MS);
  });
  try {
    // The explicit race also settles if a transport never rejects on abort.
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function readTelegramJson(
  message: Request | Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<unknown> {
  if (signal.aborted) {
    void message.body?.cancel().catch(() => {});
    throw new TelegramHttpError(408, "Telegram body read timed out");
  }
  const reader = message.body?.getReader();
  if (!reader) throw new TelegramHttpError(400, "JSON body is required");
  let complete = false;
  let cancelled = false;
  const cancel = () => {
    if (!cancelled) {
      cancelled = true;
      void reader.cancel().catch(() => {});
    }
  };
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => {
      cancel();
      reject(new TelegramHttpError(408, "Telegram body read timed out"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
  try {
    const declaredLength = message.headers.get("content-length");
    if (declaredLength !== null &&
        (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBytes)) {
      throw new TelegramHttpError(413, "Telegram body exceeds the byte limit");
    }
    const bytes = new Uint8Array(maxBytes);
    let length = 0;
    while (true) {
      const chunk = await Promise.race([reader.read(), aborted]);
      if (chunk.done) { complete = true; break; }
      if (length + chunk.value.byteLength > maxBytes) {
        throw new TelegramHttpError(413, "Telegram body exceeds the byte limit");
      }
      bytes.set(chunk.value, length);
      length += chunk.value.byteLength;
    }
    try {
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length)));
    } catch {
      throw new TelegramHttpError(400, "Invalid JSON body");
    }
  } finally {
    signal.removeEventListener("abort", onAbort);
    if (!complete) cancel();
    reader.releaseLock();
  }
}
