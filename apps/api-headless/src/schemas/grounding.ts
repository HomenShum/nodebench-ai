import { z } from "zod";

export const searchModeSchema = z.enum(["fast", "balanced", "comprehensive"]);
export const searchDepthSchema = z.enum(["standard", "deep", "temporal"]);
export const searchOutputTypeSchema = z.enum([
  "searchResults",
  "sourcedAnswer",
  "temporalBrief",
  "enterpriseInvestigation",
  "structured",
]);

export const searchSourceSchema = z.enum([
  "brave",
  "serper",
  "tavily",
  "linkup",
  "sec",
  "rag",
  "documents",
  "news",
  "youtube",
  "arxiv",
]);

export const contentTypeSchema = z.enum([
  "text",
  "pdf",
  "video",
  "image",
  "filing",
  "news",
]);

export const searchRequestSchema = z
  .object({
    q: z.string().min(2).max(500).optional(),
    query: z.string().min(2).max(500).optional(),
    mode: searchModeSchema.optional(),
    depth: searchDepthSchema.optional().default("standard"),
    outputType: searchOutputTypeSchema.optional().default("searchResults"),
    sources: z.array(searchSourceSchema).max(10).optional(),
    maxResults: z.number().int().min(1).max(25).optional().default(10),
    maxPerSource: z.number().int().min(1).max(25).optional(),
    enableReranking: z.boolean().optional(),
    contentTypes: z.array(contentTypeSchema).max(6).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    includeDomains: z.array(z.string().min(1).max(255)).max(25).optional(),
    excludeDomains: z.array(z.string().min(1).max(255)).max(25).optional(),
    includeSources: z.boolean().optional().default(true),
    includeInlineCitations: z.boolean().optional().default(true),
    structuredOutputSchema: z.record(z.any()).optional(),
    skipCache: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.q && !value.query) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either q or query",
        path: ["query"],
      });
    }
    if (value.outputType === "structured" && !value.structuredOutputSchema) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "structuredOutputSchema is required when outputType=structured",
        path: ["structuredOutputSchema"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    query: value.query ?? value.q!,
  }));

export const fetchRequestSchema = z.object({
  url: z.string().url(),
  includeExtraction: z.boolean().optional().default(true),
  includeHtml: z.boolean().optional().default(false),
  includeRawHtml: z.boolean().optional(),
  renderJs: z.boolean().optional().default(false),
  includeImages: z.boolean().optional().default(false),
  maxChars: z.number().int().min(500).max(100_000).optional().default(20_000),
  referenceDateIso: z.string().datetime().optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type FetchRequest = z.infer<typeof fetchRequestSchema>;
