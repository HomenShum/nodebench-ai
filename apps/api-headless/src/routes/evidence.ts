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

// ── In-memory fallback store ───────────────────────────────────────────────

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

router.post("/", async (req: Request, res: Response) => {
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

  inMemoryPacks.set(packKey, pack);

  res.status(201).json(pack);
});

// ── GET /v1/evidence — List proof packs ───────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
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
});

// ── GET /v1/evidence/:packKey — Get proof pack ────────────────────────────

router.get("/:packKey", async (req: Request, res: Response) => {
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
});

// ── GET /v1/evidence/:packKey/export — Export as PDF-ready JSON ───────────

router.get("/:packKey/export", async (req: Request, res: Response) => {
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
});

export default router;
