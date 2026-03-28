/**
 * Dynamic OG image for shareable Decision Memos.
 * Returns an SVG rendered as image/svg+xml — works on all Vercel runtimes.
 * Social platforms that don't render SVG will fall back to the default OG image.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const BG = "#151413";
const TERRACOTTA = "#d97757";
const CARD_BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRIMARY = "rgba(255,255,255,0.90)";
const TEXT_SECONDARY = "rgba(255,255,255,0.60)";
const TEXT_MUTED = "rgba(255,255,255,0.45)";

function confidenceColor(c: number): string {
  if (c >= 75) return "#10b981";
  if (c >= 50) return "#06b6d4";
  if (c >= 25) return "#f59e0b";
  return "#f43f5e";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "\u2026";
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url ?? "/", "https://nodebenchai.com");
  const company = esc(truncate(url.searchParams.get("company") ?? "NodeBench", 40));
  const question = esc(truncate(url.searchParams.get("question") ?? "Decision Memo", 90));
  const confidence = Math.min(100, Math.max(0, Number(url.searchParams.get("confidence") ?? "50")));
  const verdict = esc(truncate(url.searchParams.get("verdict") ?? "", 160));
  const signals = [
    url.searchParams.get("s1"),
    url.searchParams.get("s2"),
    url.searchParams.get("s3"),
  ].filter(Boolean).map(s => esc(truncate(s!, 60)));

  const confColor = confidenceColor(confidence);

  const signalsSvg = signals.map((sig, i) => `
    <g transform="translate(56, ${verdict ? 380 : 320})" >
      <rect x="0" y="${i * 32}" width="20" height="20" rx="6" fill="rgba(217,119,87,0.12)" />
      <text x="10" y="${i * 32 + 15}" text-anchor="middle" font-size="11" font-weight="700" fill="${TERRACOTTA}">${i + 1}</text>
      <text x="34" y="${i * 32 + 15}" font-size="15" fill="${TEXT_SECONDARY}">${sig}</text>
    </g>
  `).join("");

  const verdictSvg = verdict ? `
    <rect x="56" y="280" width="1088" height="80" rx="12" fill="rgba(217,119,87,0.06)" stroke="rgba(217,119,87,0.25)" />
    <text x="76" y="308" font-size="11" font-weight="700" fill="rgba(217,119,87,0.7)" letter-spacing="3" text-transform="uppercase">RECOMMENDATION</text>
    <text x="76" y="338" font-size="16" fill="${TEXT_PRIMARY}">${verdict}</text>
  ` : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${BG}" />

    <!-- Logo -->
    <circle cx="72" cy="56" r="16" fill="none" stroke="${TERRACOTTA}" stroke-width="2" />
    <circle cx="72" cy="56" r="6" fill="${TERRACOTTA}" />
    <text x="100" y="62" font-size="14" font-weight="600" fill="${TEXT_SECONDARY}" letter-spacing="2">DECISION MEMO</text>

    <!-- Confidence badge -->
    <rect x="980" y="36" width="164" height="40" rx="20" fill="rgba(255,255,255,0.04)" stroke="${CARD_BORDER}" />
    <circle cx="1004" cy="56" r="5" fill="${confColor}" />
    <text x="1018" y="62" font-size="18" font-weight="700" fill="${TEXT_PRIMARY}">${confidence}%</text>
    <text x="1068" y="62" font-size="13" fill="${TEXT_MUTED}">confidence</text>

    <!-- Company name -->
    <text x="56" y="140" font-size="42" font-weight="800" fill="${TEXT_PRIMARY}">${company}</text>

    <!-- Question -->
    <text x="56" y="180" font-size="20" fill="${TEXT_SECONDARY}">${question}</text>

    ${verdictSvg}
    ${signalsSvg}

    <!-- Footer -->
    <line x1="56" y1="580" x2="1144" y2="580" stroke="${CARD_BORDER}" />
    <circle cx="72" cy="606" r="9" fill="none" stroke="${TERRACOTTA}" stroke-width="1.5" />
    <circle cx="72" cy="606" r="3.5" fill="${TERRACOTTA}" />
    <text x="90" y="612" font-size="13" font-weight="600" fill="${TEXT_SECONDARY}">NodeBench</text>
    <text x="1080" y="612" font-size="12" fill="${TEXT_MUTED}" text-anchor="end">nodebenchai.com</text>
  </svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.status(200).send(svg);
}
