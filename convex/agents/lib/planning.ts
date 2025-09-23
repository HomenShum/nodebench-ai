import { z } from "zod";

// Step and Plan schemas used for structured planning
export const StepSchema = z.object({
  id: z.string().nullable().optional(),
  kind: z.enum([
    "web.search",
    "rag.search",
    "doc.create",
    "doc.readFirstChunk",
    "doc.edit",
    "answer",
  ]),
  label: z.string().nullable().optional(),
  args: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .nullable()
    .optional(),
});

export const PlanSchema = z.object({
  intent: z.enum(["edit_doc", "code_change", "answer", "search", "file_ops"]),
  explain: z.string().nullable().optional(),
  groups: z.array(z.array(StepSchema)),
  final: z.enum(["answer_only", "apply_edit", "both"]).nullable().optional(),
});

export type Plan = z.infer<typeof PlanSchema>;
export type StepKind = z.infer<typeof StepSchema>["kind"];

// Strict arg schemas per step kind
export const StepArgSchemas: Record<StepKind, z.ZodTypeAny> = {
  // Allow query to be optional so callers can fall back to context.message safely
  "web.search": z.object({ query: z.string().min(1).max(500).optional() }).strict(),
  "rag.search": z
    .object({ query: z.string().min(1).max(500).optional(), namespace: z.string().optional() })
    .strict(),
  "doc.create": z
    .object({ title: z.string().max(200).optional(), topic: z.string().max(200).optional() })
    .strict()
    .refine((o) => !!(o.title || o.topic), { message: "title or topic required" }),
  "doc.readFirstChunk": z.object({ maxChars: z.number().int().min(200).max(5000).optional() }).strict(),
  "doc.edit": z
    .object({
      strategy: z.enum(["pmOps", "heuristic"]).optional(),
      anchors: z.array(z.string()).optional(),
      propose: z.boolean().optional(),
    })
    .strict(),
  "answer": z.object({ style: z.enum(["concise", "detailed"]).optional() }).strict(),
};

export function validateStepArgs(kind: StepKind, args: unknown) {
  const schema = StepArgSchemas[kind];
  if (!schema) return {} as any;
  try {
    return schema.parse(args ?? {});
  } catch (e: any) {
    throw new Error(`Invalid args for ${kind}: ${String(e?.message || e)}`);
  }
}

// Variable substitution: ${step:<id>} or ${step:<id>.data.key}
export function substituteTemplates(
  value: any,
  outputs: Record<string, { text?: string; data?: any }>,
): any {
  const accessPath = (obj: any, path: string[]): any =>
    path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  if (typeof value === "string") {
    return value.replace(/\$\{\s*step:([^}.\s]+)(?:\.([^}]+))?\s*\}/g, (_m, id, path) => {
      const out = outputs[id];
      if (!out) return "";
      if (!path) return out.text ?? "";
      const parts = path.split(".");
      const root = parts[0] === "data" ? out.data : (out as any);
      const v = accessPath(root, parts[0] === "data" ? parts.slice(1) : parts);
      return v == null ? "" : String(v);
    });
  } else if (Array.isArray(value)) {
    return value.map((v) => substituteTemplates(v, outputs));
  } else if (value && typeof value === "object") {
    const next: any = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value)) next[k] = substituteTemplates(v, outputs);
    return next;
  }
  return value;
}

