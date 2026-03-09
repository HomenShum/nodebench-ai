import type { ParsedQs } from "qs";

export function getSinglePathValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

export function getSingleQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

export function getIntQueryValue(value: unknown, fallback: number): number {
  const raw = getSingleQueryValue(value);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getCursorQueryValue(value: unknown): string | undefined {
  return getSingleQueryValue(value);
}

export function getOptionalQueryRecord(
  query: ParsedQs
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    result[key] = getSingleQueryValue(value);
  }
  return result;
}
