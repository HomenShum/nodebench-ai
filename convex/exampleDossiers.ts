/**
 * Example dossier documents for WelcomeLanding showcase
 * Creates realistic newspaper-style dossiers for each persona
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get or create example dossiers for each persona
 * Returns a map of persona -> dossier document ID
 */
export const getExampleDossiers = query({
  args: {},
  handler: async (ctx) => {
    // Find existing example dossiers by title pattern
    const investors = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), "Example: Healthcare Seed Funding Digest"))
      .first();

    const bankers = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), "Example: Biotech SEC Filings Update"))
      .first();

    const marketing = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), "Example: Competitor Intelligence Brief"))
      .first();

    const researchers = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), "Example: RAG Research Papers Digest"))
      .first();

    const healthcare = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), "Example: FDA Approvals & Diabetes Tech"))
      .first();

    const founders = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), "Example: FinTech Seed Funding Analysis"))
      .first();

    return {
      investors: investors?._id,
      bankers: bankers?._id,
      marketing: marketing?._id,
      researchers: researchers?._id,
      healthcare: healthcare?._id,
      founders: founders?._id,
    };
  },
});

/**
 * Seed all example dossiers at once
 * Creates one example for each persona if it doesn't exist
 */
export const seedExampleDossiers = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("createdBy"), args.userId))
      .filter((q) => q.eq(q.field("documentType"), "dossier"))
      .collect();

    const existingTitles = new Set(existing.map((d) => d.title));

    const examples = [
      {
        title: "Example: Healthcare Seed Funding Digest",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Healthcare AI Seed Rounds Summary" }] },
            { type: "paragraph", content: [{ type: "text", text: "Three healthcare AI companies raised $12.5M total:" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "MediScan AI - $5.2M" }, { type: "text", text: " (Khosla) - Radiology AI, 94% accuracy, FDA 510(k) Q2 2025" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "VitalWatch - $4.1M" }, { type: "text", text: " (a16z) - Remote monitoring, 40% reduction in readmissions" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "GenomePath - $3.2M" }, { type: "text", text: " (YC, Founders Fund) - Precision oncology, 500+ patient profiles" }] }] },
            ] },
            { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Key Trend:" }, { type: "text", text: " Investors prioritize FDA pathways, clinical validation, and reimbursement strategies." }] },
          ],
        },
      },
      {
        title: "Example: Biotech SEC Filings Update",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Biotech SEC Filings Summary" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Moderna (MRNA) 8-K:" }, { type: "text", text: " Phase 3 cancer vaccine results - 44% reduction in recurrence risk, stock +12%" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "BioNTech (BNTX) 10-K:" }, { type: "text", text: " $17.3B revenue, $2.5B investment in oncology pipeline" }] }] },
            ] },
          ],
        },
      },
      {
        title: "Example: Competitor Intelligence Brief",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ACME Corp Competitive Landscape" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "ACME Corp:" }, { type: "text", text: " Launched 'Project Phoenix' AI analytics dashboard - 2.4K LinkedIn reactions, 78% positive sentiment" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Competitor A:" }, { type: "text", text: " Raised $25M Series B (Sequoia) - International expansion focus, Twitter mentions +340%" }] }] },
            ] },
          ],
        },
      },
      {
        title: "Example: RAG Research Papers Digest",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "RAG Research Highlights" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Self-RAG (UW):" }, { type: "text", text: " LLMs self-correct using reflection tokens - 7.2% improvement on QA, 40% fewer retrieval calls (arXiv:2310.11511)" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "RAPTOR (Stanford):" }, { type: "text", text: " Hierarchical retrieval with recursive summarization - 20% improvement on long-document QA (arXiv:2401.18059)" }] }] },
            ] },
            { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Key Takeaway:" }, { type: "text", text: " Implement self-reflective retrieval and hierarchical indexes for better performance." }] },
          ],
        },
      },
      {
        title: "Example: FDA Approvals & Diabetes Tech",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "FDA Diabetes Tech Updates" }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Dexcom G7:" }, { type: "text", text: " FDA cleared for children 2+ - 60% smaller sensor, 30-min warmup, launch Q1 2025" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Tandem t:slim X2:" }, { type: "text", text: " Control-IQ approved for Abbott FreeStyle Libre 3 - first hybrid closed-loop compatible with both Dexcom and Abbott" }] }] },
            ] },
          ],
        },
      },
      {
        title: "Example: FinTech Seed Funding Analysis",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "FinTech Seed Funding Summary" }] },
            { type: "paragraph", content: [{ type: "text", text: "Q3 analysis shows cooling late-stage investment but robust seed activity with stricter valuation scrutiny." }] },
            { type: "bulletList", content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Investor Preference:" }, { type: "text", text: " Embedded finance and vertical SaaS with clear B2B ROI" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Key Metrics:" }, { type: "text", text: " Unit economics, high NRR (120%+), capital efficiency over hyper-growth" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Valuation Trend:" }, { type: "text", text: " Warrant structures emerging, 25% lower caps vs Q2" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "B2C Challenge:" }, { type: "text", text: " Focus on CAC/LTV ratios and organic growth - sentiment score 4.2/10" }] }] },
            ] },
            { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Action:" }, { type: "text", text: " Update models for lower valuations, prepare NRR slides showing 120%+ retention." }] },
          ],
        },
      },
    ];

    const created = [];
    for (const example of examples) {
      if (!existingTitles.has(example.title)) {
        const docId = await ctx.db.insert("documents", {
          title: example.title,
          content: JSON.stringify(example.content),
          createdBy: args.userId,
          isPublic: true,
          isArchived: false,
          isFavorite: false,
          documentType: "dossier",
          dossierType: "primary",
          lastModified: Date.now(),
        });
        created.push(docId);
      }
    }

    return { created: created.length, total: examples.length };
  },
});

