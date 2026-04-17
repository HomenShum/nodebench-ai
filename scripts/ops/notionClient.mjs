/**
 * notionClient.mjs — minimal Notion API wrapper for solo-ops daily summaries.
 *
 * Contract:
 *  - Fail-open: if NOTION_API_KEY or NOTION_DATABASE_ID is unset, every call
 *    is a silent no-op returning { ok: false, skipped: true }.
 *  - Never throws. An API failure surfaces as { ok: false, error } and
 *    callers should treat it as best-effort, not required.
 *  - Zero dependencies beyond Node's built-in fetch.
 *
 * Setup (one-time):
 *  1. Create a Notion internal integration: https://www.notion.so/my-integrations
 *  2. Copy the "Internal Integration Token" -> NOTION_API_KEY
 *  3. Create a Notion DATABASE (not page) to hold daily entries. Share the
 *     database with your integration.
 *  4. Copy the database id from the URL -> NOTION_DATABASE_ID
 *  5. The database needs at minimum these properties:
 *        Name     : Title
 *        Date     : Date
 *        Status   : Select (green, yellow, red)
 *        P95      : Number
 *        Errors   : Number
 */

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function getConfig() {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !databaseId) return null;
  return { apiKey, databaseId };
}

export function isNotionConfigured() {
  return getConfig() !== null;
}

/**
 * Create a new database row with today's summary.
 *
 * @param {object} summary
 * @param {string} summary.title              — page title
 * @param {"green"|"yellow"|"red"} summary.status
 * @param {number} summary.p95Ms              — worst p95 across scenarios
 * @param {number} summary.errorCount
 * @param {string} summary.bodyMarkdown       — long-form detail, appended as blocks
 * @returns {Promise<{ok: boolean, pageId?: string, skipped?: boolean, error?: string}>}
 */
export async function appendDailySummary(summary) {
  const config = getConfig();
  if (!config) return { ok: false, skipped: true };

  try {
    const today = new Date().toISOString().slice(0, 10);
    const createRes = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: config.databaseId },
        properties: {
          Name: {
            title: [{ text: { content: summary.title } }],
          },
          Date: {
            date: { start: today },
          },
          Status: {
            select: { name: summary.status },
          },
          P95: {
            number: summary.p95Ms,
          },
          Errors: {
            number: summary.errorCount,
          },
        },
        children: markdownToBlocks(summary.bodyMarkdown),
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return { ok: false, error: `Notion API ${createRes.status}: ${text.slice(0, 200)}` };
    }

    const result = await createRes.json();
    return { ok: true, pageId: result.id };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

// Very small markdown-to-Notion-blocks converter. Handles:
//  - Headings (# / ## / ###)
//  - Code fences (```)
//  - Bullet lists (- / *)
//  - Paragraphs
// Anything fancier (tables, images) should be added when a use case appears.
function markdownToBlocks(md) {
  if (!md) return [];
  const blocks = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      blocks.push(headingBlock(line.slice(4), 3));
      i++;
    } else if (line.startsWith("## ")) {
      blocks.push(headingBlock(line.slice(3), 2));
      i++;
    } else if (line.startsWith("# ")) {
      blocks.push(headingBlock(line.slice(2), 1));
      i++;
    } else if (line.startsWith("```")) {
      // Code fence — collect until the next ```
      const lang = line.slice(3).trim() || "plain text";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({
        object: "block",
        type: "code",
        code: {
          rich_text: [{ type: "text", text: { content: codeLines.join("\n") } }],
          language: lang,
        },
      });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content: line.slice(2) } }],
        },
      });
      i++;
    } else if (line.trim() === "") {
      i++;
    } else {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: line } }],
        },
      });
      i++;
    }
  }
  return blocks;
}

function headingBlock(text, level) {
  const key = `heading_${level}`;
  return {
    object: "block",
    type: key,
    [key]: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}
