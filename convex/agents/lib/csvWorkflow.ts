// convex/agents/lib/csvWorkflow.ts

const OPENAI_MODEL = "gpt-5-nano";

/**
 * CSV Lead Workflow helpers: scoring and message generation.
 * Mirrors logic from aiAgents.ts while remaining self-contained.
 */
export async function scoreLeads(
  rows: Array<Record<string, string>>,
  header: string[],
  client: any,
): Promise<Array<Record<string, string>>> {
  // Heuristic fallback (fast, deterministic)
  const heuristic = (row: Record<string, string>) => {
    const title = (row["Title"] || row["Job Title"] || "").toLowerCase();
    const company = (row["Company"] || "").toLowerCase();
    let score = 50;
    if (/(ceo|founder|cto|cpo|coo|vp|head|director)/.test(title)) score += 20;
    if (company.includes("ai") || company.includes("tech")) score += 10;
    if ((row["Email"] || "").endsWith("@gmail.com")) score -= 10;
    score = Math.max(0, Math.min(100, score));
    const tier = score >= 80 ? "A" : score >= 60 ? "B" : "C";
    return {
      ...row,
      Score: String(score),
      Tier: tier,
      Notes: tier === "A" ? "High potential" : tier === "B" ? "Promising" : "Low priority",
    };
  };

  if (!client) return rows.map(heuristic);

  try {
    const sample = rows.slice(0, 20);
    const prompt = [
      "You are a sales analyst. Score the following leads 0-100, return JSON array.",
      "Fields: name, email, company, title may vary; use heuristics to infer seniority and fit.",
      "Return strictly JSON array of objects with keys: index (number by input order), score (0-100), tier ('A'|'B'|'C'), note (short).",
      "Input:",
      JSON.stringify(sample, null, 2),
    ].join("\n");

    const resp = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: "Assistant that returns only valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const content = resp.choices?.[0]?.message?.content?.trim() || "[]";
    let parsed: Array<{ index: number; score: number; tier: string; note: string }>;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = [];
    }

    const merged: Array<Record<string, string>> = rows.map(heuristic);
    for (const item of parsed) {
      if (typeof item?.index === "number" && merged[item.index]) {
        const score = Math.max(0, Math.min(100, Number(item.score)));
        const tier = score >= 80 ? "A" : score >= 60 ? "B" : "C";
        merged[item.index].Score = String(score);
        merged[item.index].Tier = tier;
        merged[item.index].Notes = item.note || merged[item.index].Notes;
      }
    }
    return merged;
  } catch {
    return rows.map(heuristic);
  }
}

export async function generateMessages(
  top: Array<Record<string, string>>,
  client: any,
): Promise<Array<{ name?: string; email?: string; company?: string; title?: string; message: string }>> {
  const basic = (r: Record<string, string>) => {
    const name = r["Name"] || r["Full Name"] || "";
    const company = r["Company"] || "";
    const title = r["Title"] || r["Job Title"] || "";
    const message = `Hi ${name || "there"},\n\nI came across ${
      company || "your company"
    } and thought our product could help ${title ? title.toLowerCase() + "s" : "teams"} like yours. Would you be open to a quick chat?\n\nBest,\nYour Name`;
    return { name, email: r["Email"], company, title, message };
  };

  if (!client) return top.map(basic);

  try {
    const prompt = [
      "Create short, friendly outreach messages for the following leads.",
      "Return ONLY a JSON array with objects: { index, message }.",
      JSON.stringify(top, null, 2),
    ].join("\n");

    const resp = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const content = resp.choices?.[0]?.message?.content?.trim() || "[]";
    let parsed: Array<{ index: number; message: string }>;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = [];
    }

    return top.map((r, i) => {
      const m = parsed.find((p) => p.index === i)?.message;
      if (m) {
        const name = r["Name"] || r["Full Name"] || "";
        return { name, email: r["Email"], company: r["Company"], title: r["Title"] || r["Job Title"], message: m };
      }
      return basic(r);
    });
  } catch {
    return top.map(basic);
  }
}

