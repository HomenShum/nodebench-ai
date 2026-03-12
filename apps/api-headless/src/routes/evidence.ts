import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import {
  ComplianceFramework,
  proofPackCreateSchema,
  type ProofPack,
} from "../schemas/specDoc.js";
import {
  createProofPack,
  getProofPack,
  listProofPacks,
  exportProofPack,
} from "../lib/convex-client.js";
import {
  getIntQueryValue,
  getSinglePathValue,
  getSingleQueryValue,
} from "../lib/request-values.js";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err) => {
      if (!res.headersSent) {
        res.status(500).json({
          error: "internal_error",
          message: err instanceof Error ? err.message : "Unexpected error",
          requestId: req.requestId,
        });
      }
    });
  };
}

// ── In-memory fallback store ───────────────────────────────────────────────

const MAX_IN_MEMORY_PACKS = 500;
const inMemoryPacks = new Map<string, ProofPack>();

function computeHash(pack: Omit<ProofPack, "hash">): string {
  const content = JSON.stringify({
    packKey: pack.packKey,
    specKey: pack.specKey,
    runId: pack.runId,
    title: pack.title,
    artifacts: pack.artifacts,
    createdAt: pack.createdAt,
  });
  return createHash("sha256").update(content).digest("hex");
}

// ── POST /v1/evidence — Create a proof pack ───────────────────────────────

router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const parsed = proofPackCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  const convexResult = await createProofPack(parsed.data);
  if (convexResult.ok && convexResult.data) {
    res.status(201).json(convexResult.data);
    return;
  }

  // Fallback: in-memory
  const packKey = `pack_${nanoid(16)}`;
  const now = new Date().toISOString();

  const packData: Omit<ProofPack, "hash"> = {
    packKey,
    specKey: parsed.data.specKey,
    runId: parsed.data.runId,
    title: parsed.data.title,
    compliance: parsed.data.compliance,
    artifacts: parsed.data.artifacts,
    signedBy: parsed.data.signedBy,
    createdAt: now,
    immutable: true,
  };

  const pack: ProofPack = {
    ...packData,
    hash: computeHash(packData),
  };

  if (inMemoryPacks.size >= MAX_IN_MEMORY_PACKS) {
    const oldest = inMemoryPacks.keys().next().value;
    if (oldest !== undefined) inMemoryPacks.delete(oldest);
  }
  inMemoryPacks.set(packKey, pack);

  res.status(201).json(pack);
}));

// ── GET /v1/evidence — List proof packs ───────────────────────────────────

router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const specKey = getSingleQueryValue(req.query.specKey);
  const compliance = getSingleQueryValue(req.query.compliance);
  const limit = getIntQueryValue(req.query.limit, 50);

  const convexResult = await listProofPacks({
    specKey,
    compliance,
    limit,
  });

  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback
  let packs = Array.from(inMemoryPacks.values());
  if (specKey) packs = packs.filter((p) => p.specKey === specKey);
  if (compliance) {
    const parsedCompliance = ComplianceFramework.safeParse(compliance);
    if (parsedCompliance.success) {
      packs = packs.filter((p) => p.compliance.includes(parsedCompliance.data));
    }
  }

  res.json({
    packs: packs.slice(0, limit),
    total: packs.length,
  });
}));

// ── GET /v1/evidence/:packKey — Get proof pack ────────────────────────────

router.get("/:packKey", asyncHandler(async (req: Request, res: Response) => {
  const packKey = getSinglePathValue(req.params.packKey);
  if (!packKey) {
    res.status(400).json({ error: "validation_error", message: "packKey is required" });
    return;
  }

  const convexResult = await getProofPack(packKey);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback
  const pack = inMemoryPacks.get(packKey);
  if (!pack) {
    res.status(404).json({ error: "not_found", message: `Proof pack ${packKey} not found` });
    return;
  }

  res.json(pack);
}));

// ── GET /v1/evidence/:packKey/export — Export as PDF-ready JSON ───────────

router.get("/:packKey/export", asyncHandler(async (req: Request, res: Response) => {
  const packKey = getSinglePathValue(req.params.packKey);
  if (!packKey) {
    res.status(400).json({ error: "validation_error", message: "packKey is required" });
    return;
  }

  const convexResult = await exportProofPack(packKey);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback
  const pack = inMemoryPacks.get(packKey);
  if (!pack) {
    res.status(404).json({ error: "not_found", message: `Proof pack ${packKey} not found` });
    return;
  }

  // Build PDF-ready export structure
  const sections = [
    {
      title: "Overview",
      content: `Proof Pack: ${pack.title}\nSpec: ${pack.specKey}\nCreated: ${pack.createdAt}\nHash: ${pack.hash}\nImmutable: ${pack.immutable}`,
      artifacts: [],
    },
    {
      title: "Compliance Frameworks",
      content: pack.compliance.length > 0 ? pack.compliance.join(", ") : "None specified",
      artifacts: [],
    },
    {
      title: "Evidence Artifacts",
      content: `${pack.artifacts.length} artifact(s) collected`,
      artifacts: pack.artifacts.map((a) => ({
        type: a.type,
        label: a.label,
        url: a.url,
      })),
    },
  ];

  if (pack.signedBy) {
    sections.push({
      title: "Attestation",
      content: `Signed by: ${pack.signedBy}`,
      artifacts: [],
    });
  }

  res.json({
    pack,
    exportFormat: "pdf_ready",
    sections,
  });
}));

export default router;
