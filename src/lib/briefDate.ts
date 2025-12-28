/**
 * Standard date formatting for Daily Brief surfaces.
 *
 * Canonical UI format:
 * - DateTime: "Dec 11, 2025, 1:38 PM"
 * - Date only: "Dec 11, 2025"
 * - Month/Year: "Dec 2025"
 */

export function formatBriefDateTime(
  ms: number,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(ms);
}

export function formatBriefDate(dateString: string): string {
  // Treat incoming YYYY-MM-DD as UTC date.
  const d = new Date(`${dateString}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatBriefMonthYear(input: string | number): string {
  const d =
    typeof input === "number"
      ? new Date(input)
      : new Date(`1 ${input} 00:00:00Z`);
  if (isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isBriefDateToday(dateString?: string | null): boolean {
  if (!dateString) return false;
  const normalized = dateString.trim().slice(0, 10);
  return normalized === getTodayDateString();
}
