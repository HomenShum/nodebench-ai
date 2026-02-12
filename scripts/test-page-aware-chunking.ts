/**
 * Quick verification script for page-aware chunking logic.
 * Tests: pageAwareChunks, smartChunker page splitting, pageIndex extraction from snippets.
 * Run: npx tsx scripts/test-page-aware-chunking.ts
 */

// ── pageAwareChunks (from rag.ts) ──────────────────────────────────
function pageAwareChunks(text: string): string[] {
  const pagePattern = /(?=\[PAGE\s+\d+\])/gi;
  const parts = text.split(pagePattern).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return text.split(/\n\n+/).filter((s) => s.trim().length > 0);
  }
  return parts;
}

// ── smartChunker page logic (from ragEnhanced.ts) ──────────────────
function smartChunkerPageSplit(text: string, maxChunkSize = 1000): string[] {
  const pagePattern = /(?=\[PAGE\s+\d+\])/gi;
  const pageParts = text.split(pagePattern).map((s) => s.trim()).filter(Boolean);
  if (pageParts.length <= 1) return [text]; // no page markers

  const baseChunks: string[] = [];
  for (const part of pageParts) {
    if (part.length <= maxChunkSize) {
      baseChunks.push(part);
    } else {
      const markerMatch = part.match(/^\[PAGE\s+\d+\]/i);
      const marker = markerMatch ? markerMatch[0] : "";
      const body = marker ? part.slice(marker.length).trim() : part;
      const subParts = body.split(/\n\n+/).filter((s) => s.trim().length > 0);
      let buffer = marker;
      for (const sub of subParts) {
        if (buffer.length + sub.length + 2 > maxChunkSize && buffer.length > marker.length) {
          baseChunks.push(buffer.trim());
          buffer = `${marker} (cont.) ${sub}`;
        } else {
          buffer += (buffer.length > 0 ? "\n\n" : "") + sub;
        }
      }
      if (buffer.trim().length > 0) {
        baseChunks.push(buffer.trim());
      }
    }
  }
  return baseChunks;
}

// ── pageIndex extraction (from rag.ts answerQuestionViaRAG) ────────
function extractPageIndex(snippet: string): number | undefined {
  const pageMatch = snippet.match(/\[PAGE\s+(\d+)\]/i);
  return pageMatch ? parseInt(pageMatch[1], 10) : undefined;
}

// ── Test data ──────────────────────────────────────────────────────
const samplePdfText = `[PAGE 1] Annual Report 2025
Company Overview
NodeBench AI is a financial intelligence platform.

[PAGE 2] Financial Highlights
Revenue: $42M (+35% YoY)
EBITDA: $8.2M
Net Income: $3.1M

[PAGE 3] Risk Factors
Market volatility remains a concern.
Regulatory changes in AI governance may impact operations.

[PAGE 4] Executive Compensation
CEO total comp: $2.4M
CFO total comp: $1.8M`;

const noPageText = `Annual Report 2025
Company Overview

Financial Highlights
Revenue: $42M

Risk Factors
Market volatility`;

// ── Run tests ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

console.log("\n═══ Test: pageAwareChunks ═══");
{
  const chunks = pageAwareChunks(samplePdfText);
  assert(chunks.length === 4, `splits into 4 page chunks (got ${chunks.length})`);
  assert(chunks[0].startsWith("[PAGE 1]"), `chunk 0 starts with [PAGE 1]`);
  assert(chunks[1].startsWith("[PAGE 2]"), `chunk 1 starts with [PAGE 2]`);
  assert(chunks[2].startsWith("[PAGE 3]"), `chunk 2 starts with [PAGE 3]`);
  assert(chunks[3].startsWith("[PAGE 4]"), `chunk 3 starts with [PAGE 4]`);
  assert(chunks[1].includes("Revenue: $42M"), `chunk 1 contains Revenue data`);
}

console.log("\n═══ Test: pageAwareChunks (no markers) ═══");
{
  const chunks = pageAwareChunks(noPageText);
  assert(chunks.length >= 2, `falls back to paragraph split (got ${chunks.length})`);
  assert(!chunks[0].includes("[PAGE"), `no page markers in fallback`);
}

console.log("\n═══ Test: smartChunkerPageSplit ═══");
{
  const chunks = smartChunkerPageSplit(samplePdfText);
  assert(chunks.length === 4, `splits into 4 page chunks (got ${chunks.length})`);
  assert(chunks[0].startsWith("[PAGE 1]"), `chunk 0 starts with [PAGE 1]`);
  assert(chunks[3].startsWith("[PAGE 4]"), `chunk 3 starts with [PAGE 4]`);
}

console.log("\n═══ Test: smartChunkerPageSplit (sub-chunking large page) ═══");
{
  const longPage = "[PAGE 1] " + Array(20).fill("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.").join("\n\n");
  const text = `${longPage}\n\n[PAGE 2] Short page content here.`;
  const chunks = smartChunkerPageSplit(text, 500);
  assert(chunks.length > 2, `large page sub-chunked (got ${chunks.length} chunks)`);
  assert(chunks[0].startsWith("[PAGE 1]"), `first sub-chunk has [PAGE 1] marker`);
  const contChunks = chunks.filter(c => c.includes("(cont.)"));
  assert(contChunks.length > 0, `continuation chunks have (cont.) marker`);
  const lastChunk = chunks[chunks.length - 1];
  assert(lastChunk.startsWith("[PAGE 2]"), `last chunk is [PAGE 2]`);
}

console.log("\n═══ Test: extractPageIndex from snippets ═══");
{
  assert(extractPageIndex("[PAGE 3] Revenue was $42M...") === 3, `extracts page 3`);
  assert(extractPageIndex("[PAGE 12] Risk factors include...") === 12, `extracts page 12`);
  assert(extractPageIndex("No page markers here") === undefined, `undefined for no markers`);
  assert(extractPageIndex("[page 1] lowercase works") === 1, `case-insensitive`);
  assert(extractPageIndex("Some text before [PAGE 7] and after") === 7, `mid-text marker`);
}

console.log("\n═══ Test: chunk meta.page reconstruction ═══");
{
  // Simulate what addDocumentToRag does with file chunks from chunks table
  const fileChunks = [
    { text: "Company overview and mission statement.", meta: { page: 1 } },
    { text: "Revenue: $42M, EBITDA: $8.2M, Net Income: $3.1M", meta: { page: 2 } },
    { text: "Risk factors and regulatory concerns.", meta: { page: 3 } },
    { text: "No page info chunk", meta: {} },
  ];
  const reconstructed = fileChunks
    .map((c) => {
      const pagePrefix = c.meta?.page ? `[PAGE ${c.meta.page}] ` : "";
      return `${pagePrefix}${c.text}`;
    })
    .join("\n\n");

  assert(reconstructed.includes("[PAGE 1] Company"), `page 1 prefix reconstructed`);
  assert(reconstructed.includes("[PAGE 2] Revenue"), `page 2 prefix reconstructed`);
  assert(reconstructed.includes("[PAGE 3] Risk"), `page 3 prefix reconstructed`);
  assert(!reconstructed.includes("[PAGE ] No page"), `no prefix for missing page`);

  // Now run pageAwareChunks on the reconstructed text
  const chunks = pageAwareChunks(reconstructed);
  assert(chunks.length >= 3, `page-aware chunking splits reconstructed text (got ${chunks.length})`);
  assert(extractPageIndex(chunks[0]) === 1, `first chunk pageIndex = 1`);
  assert(extractPageIndex(chunks[1]) === 2, `second chunk pageIndex = 2`);
}

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("All page-aware chunking tests passed! ✅\n");
