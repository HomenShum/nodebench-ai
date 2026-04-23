/**
 * NodeBench Pipedream Integration
 *
 * Updated pipeline that uses the universal research.run API.
 * Replaces shallow Gemini-only processing with deep NodeBench research.
 *
 * Usage: Replace your existing Pipedream Node.js code with this.
 */

// ============================================================================
// CONFIGURATION - Set these in Pipedream environment variables
// ============================================================================
const NODEBENCH_API_BASE = process.env.NODEBENCH_API_BASE || "https://api.nodebench.com";
const NODEBENCH_API_KEY = process.env.NODEBENCH_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ============================================================================
// STEP 1: Ingress - Receive and parse email (triggered by Gmail webhook)
// ============================================================================

async function parseEmail(triggerEvent) {
  const emailData = {
    messageId: triggerEvent.id,
    threadId: triggerEvent.threadId,
    subject: triggerEvent.subject,
    from: triggerEvent.from,
    fromName: triggerEvent.fromName || triggerEvent.from?.match(/^(.*?)</)?.[1]?.trim() || triggerEvent.from,
    fromEmail: triggerEvent.from?.match(/<(.+?)>/)?.[1] || triggerEvent.from,
    date: triggerEvent.date,
    bodyText: triggerEvent.bodyText || "",
    bodyHtml: triggerEvent.bodyHtml || "",
    labels: triggerEvent.labels || [],
  };

  console.log("[Ingress] Email received:", emailData.subject);
  return emailData;
}

// ============================================================================
// STEP 2: Triage - Quick classification with Gemini
// ============================================================================

async function triageWithGemini(email) {
  const prompt = `Analyze this email and classify it:

Subject: ${email.subject}
From: ${email.from}
Body: ${email.bodyText.slice(0, 3000)}

Return JSON with:
- category: one of [INTERVIEW, JOB_OPPORTUNITY, EVENT_INVITE, INVESTOR_OUTREACH, SALES_OUTREACH, NEWSLETTER, OTHER]
- shouldEnrich: boolean - should we do deep research?
- entities: array of {type: "company|person", name: string}
- confidence: 0-1
- reason: brief explanation`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const analysis = JSON.parse(text);

  console.log("[Triage] Classification:", analysis.category, "Confidence:", analysis.confidence);
  return analysis;
}

// ============================================================================
// STEP 3: Research - Call NodeBench universal research.run API
// ============================================================================

async function researchWithNodebench(email, analysis) {
  // Determine preset and depth based on classification
  let preset = null;
  let depth = "standard";
  let decisionType = "auto";

  switch (analysis.category) {
    case "INTERVIEW":
    case "JOB_OPPORTUNITY":
      preset = "job_inbound_v1";
      depth = "comprehensive";
      decisionType = "job";
      break;
    case "EVENT_INVITE":
      preset = "event_prep_v1";
      depth = "standard";
      decisionType = "event";
      break;
    case "INVESTOR_OUTREACH":
      preset = "founder_diligence_v1";
      depth = "comprehensive";
      decisionType = "founder";
      break;
    case "SALES_OUTREACH":
      preset = "sales_account_prep_v1";
      depth = "standard";
      decisionType = "customer";
      break;
    default:
      // No preset - let NodeBench infer from content
      depth = "standard";
  }

  // Build subjects array
  const subjects = [
    {
      type: "email",
      raw: {
        subject: email.subject,
        from_name: email.fromName,
        from_email: email.fromEmail,
        date: email.date,
        body_text: email.bodyText.slice(0, 8000),
      },
    },
  ];

  // Add entities as subjects
  if (analysis.entities) {
    for (const entity of analysis.entities) {
      subjects.push({
        type: entity.type,
        name: entity.name,
      });
    }
  }

  const requestBody = {
    preset,
    goal: {
      objective: "understand and prepare",
      mode: "auto",
      decision_type: decisionType,
    },
    subjects,
    angle_strategy: "auto",
    depth,
    deliverables: ["compact_alert", "notion_markdown", "json_full"],
    constraints: {
      freshness_days: 45,
      latency_budget_ms: 15000,
      prefer_cache: true,
      max_external_calls: 15,
      evidence_min_sources_per_major_claim: 2,
    },
  };

  console.log("[Research] Calling NodeBench research.run...");
  const startTime = Date.now();

  const response = await fetch(`${NODEBENCH_API_BASE}/v1/research/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NODEBENCH_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Research] NodeBench API error:", error);
    throw new Error(`NodeBench API error: ${response.status}`);
  }

  const result = await response.json();
  const elapsed = Date.now() - startTime;

  console.log("[Research] Completed in", elapsed, "ms");
  console.log("[Research] Selected angles:", result.selected_angles?.map((a) => a.angle_id).join(", "));
  console.log("[Research] Inferred facets:", result.inferred_facets?.join(", "));
  console.log("[Research] Cache hit ratio:", result.trace?.cache_hit_ratio);

  return result;
}

// ============================================================================
// STEP 4: Notify - Send ntfy notification with compact alert
// ============================================================================

async function sendNtfyAlert(email, analysis, research) {
  const compactAlert = research.outputs?.rendered?.compact_alert || "Research completed";

  // Build rich notification
  const title = research.inferred_facets?.includes("job_prep")
    ? `Job Alert: ${email.subject.slice(0, 50)}`
    : `${analysis.category}: ${email.subject.slice(0, 50)}`;

  const notification = {
    topic: NTFY_TOPIC,
    title,
    message: compactAlert.slice(0, 1000), // ntfy limit
    priority: analysis.category === "INTERVIEW" ? 5 : 3,
    tags: ["nodebench", analysis.category.toLowerCase()],
    actions: [
      {
        action: "view",
        label: "Open Brief",
        url: `${NODEBENCH_API_BASE}/v1/research/runs/${research.run_id}`,
      },
    ],
  };

  await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notification),
  });

  console.log("[Notify] ntfy alert sent");
}

// ============================================================================
// STEP 5: Persist - Create Notion page with full brief
// ============================================================================

async function createNotionPage(email, analysis, research) {
  const notionMarkdown = research.outputs?.rendered?.notion_markdown || "";

  // Extract key talking points for the page title
  const prep = research.outputs?.prep || {};
  const entityName = research.outputs?.briefing?.act_1?.split(":").pop()?.trim() || email.subject;

  const pageData = {
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      Name: {
        title: [
          {
            text: { content: `${analysis.category}: ${entityName.slice(0, 100)}` },
          },
        ],
      },
      Category: { select: { name: analysis.category } },
      Source: { email: email.fromEmail },
      Date: { date: { start: new Date(email.date).toISOString().split("T")[0] } },
      Status: { select: { name: "Needs Review" } },
      "NodeBench Run": { url: `${NODEBENCH_API_BASE}/v1/research/runs/${research.run_id}` },
      Confidence: { number: analysis.confidence },
    },
    children: [
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ text: { content: "Executive Summary" } }],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { text: { content: research.outputs?.briefing?.act_1 || "Summary not available" } },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Why Now" } }],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: prep.why_now || "N/A" } }],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Talking Points" } }],
        },
      },
      ...(prep.talking_points || []).map((point) => ({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ text: { content: point } }],
        },
      })),
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Questions to Ask" } }],
        },
      },
      ...(prep.questions || []).map((q) => ({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [{ text: { content: q } }],
          checked: false,
        },
      })),
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Risks" } }],
        },
      },
      ...(prep.risks || []).map((risk) => ({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ text: { content: risk } }],
        },
      })),
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Next Actions" } }],
        },
      },
      ...(prep.next_actions || []).map((action) => ({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [{ text: { content: action } }],
          checked: false,
        },
      })),
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Full Brief (Markdown)" } }],
        },
      },
      {
        object: "block",
        type: "code",
        code: {
          rich_text: [{ text: { content: notionMarkdown.slice(0, 1900) } }],
          language: "markdown",
        },
      },
    ],
  };

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(pageData),
  });

  if (!response.ok) {
    console.error("[Persist] Notion API error:", await response.text());
    return null;
  }

  const notionPage = await response.json();
  console.log("[Persist] Notion page created:", notionPage.url);
  return notionPage;
}

// ============================================================================
// MAIN PIPELINE - Orchestrate all steps
// ============================================================================

async function mainPipeline(triggerEvent) {
  try {
    // Step 1: Parse ingress
    const email = await parseEmail(triggerEvent);

    // Step 2: Quick triage
    const analysis = await triageWithGemini(email);

    // Skip if low confidence or not worth enriching
    if (!analysis.shouldEnrich || analysis.confidence < 0.3) {
      console.log("[Pipeline] Skipping enrichment - low confidence or not relevant");
      return {
        status: "skipped",
        reason: "not_enrichable",
        email: email.subject,
      };
    }

    // Step 3: Deep research with NodeBench
    const research = await researchWithNodebench(email, analysis);

    // Step 4: Send notification
    await sendNtfyAlert(email, analysis, research);

    // Step 5: Persist to Notion
    const notionPage = await createNotionPage(email, analysis, research);

    return {
      status: "success",
      email: email.subject,
      category: analysis.category,
      research_run_id: research.run_id,
      inferred_facets: research.inferred_facets,
      selected_angles: research.selected_angles?.map((a) => a.angle_id),
      notion_page_url: notionPage?.url,
    };
  } catch (error) {
    console.error("[Pipeline] Error:", error);

    // Send error notification
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: NTFY_TOPIC,
        title: "Pipeline Error",
        message: error.message,
        priority: 4,
        tags: ["error", "nodebench"],
      }),
    });

    throw error;
  }
}

// ============================================================================
// PIPEDREAM EXPORT - This is what Pipedream will call
// ============================================================================

export default {
  async run({ steps, $ }) {
    // The trigger event comes from Pipedream
    const triggerEvent = steps.trigger.event;

    const result = await mainPipeline(triggerEvent);

    return result;
  },
};

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================

/**
 * 1. Create a new Pipedream workflow
 * 2. Add Gmail trigger (new email matching filters)
 * 3. Add Node.js step
 * 4. Paste this entire file as the code
 * 5. Set environment variables:
 *    - NODEBENCH_API_KEY (from NodeBench dashboard)
 *    - NODEBENCH_API_BASE (https://api.nodebench.com or your instance)
 *    - GEMINI_API_KEY (from Google AI Studio)
 *    - NTFY_TOPIC (your ntfy.sh topic)
 *    - NOTION_TOKEN (from Notion integration)
 *    - NOTION_DATABASE_ID (ID of your job tracking database)
 *
 * 6. Test with a sample job email
 * 7. Check ntfy for the alert
 * 8. Check Notion for the full brief
 *
 * TROUBLESHOOTING:
 * - If NodeBench returns 502, check your API key
 * - If research is slow, reduce depth to "standard" or increase latency_budget_ms
 * - If ntfy not working, verify topic name has no spaces
 * - If Notion not working, check database permissions
 */
