import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import {
  specDocCreateSchema,
  checkResultUpdateSchema,
  finalizeSchema,
  type SpecDoc,
  type Check,
} from "../schemas/specDoc.js";
import {
  createSpecDoc,
  getSpecDoc,
  listSpecDocs,
  updateCheck,
  finalizeSpec,
  getDashboardStats,
} from "../lib/convex-client.js";
import {
  getCursorQueryValue,
  getIntQueryValue,
  getSinglePathValue,
  getSingleQueryValue,
} from "../lib/request-values.js";

const router = Router();

// ── POST /v1/specs — Create a new SpecDoc ──────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const parsed = specDocCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  const specKey = `spec_${nanoid(16)}`;
  const now = new Date().toISOString();

  // Assign IDs to checks
  const checks: Check[] = parsed.data.checks.map((c, i) => ({
    ...c,
    id: `chk_${nanoid(10)}`,
    result: "pending" as const,
    executedAt: undefined,
    durationMs: undefined,
    evidence: undefined,
  }));

  const specDoc: SpecDoc = {
    specKey,
    title: parsed.data.title,
    description: parsed.data.description,
    status: "draft",
    clientOrg: parsed.data.clientOrg || req.clientOrg,
    clientId: req.clientId,
    repo: parsed.data.repo,
    branch: parsed.data.branch,
    commitSha: parsed.data.commitSha,
    compliance: parsed.data.compliance,
    checks,
    metadata: parsed.data.metadata,
    createdAt: now,
    updatedAt: now,
  };

  // Try Convex first, fall back to in-memory
  const convexResult = await createSpecDoc(parsed.data, req.clientId, req.clientOrg);
  if (convexResult.ok && convexResult.data) {
    res.status(201).json(convexResult.data);
    return;
  }

  // Fallback: store in-memory (dev mode)
  inMemorySpecs.set(specKey, specDoc);

  res.status(201).json(specDoc);
});

// ── GET /v1/specs/dashboard — Aggregate stats (must be before :specKey) ────

router.get("/dashboard", async (req: Request, res: Response) => {
  const convexResult = await getDashboardStats(req.clientOrg);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback: compute from in-memory
  const clientOrgFilter = getSingleQueryValue(req.query.clientOrg);
  const specs = Array.from(inMemorySpecs.values()).filter(
    (s) => !clientOrgFilter || s.clientOrg === clientOrgFilter
  );

  const byStatus: Record<string, number> = {};
  const byCompliance: Record<string, number> = {};
  let totalChecks = 0;
  let passedChecks = 0;

  for (const spec of specs) {
    byStatus[spec.status] = (byStatus[spec.status] || 0) + 1;
    totalChecks += spec.checks.length;
    passedChecks += spec.checks.filter((c) => c.result === "pass").length;
    for (const cf of spec.compliance) {
      byCompliance[cf] = (byCompliance[cf] || 0) + 1;
    }
  }

  res.json({
    total: specs.length,
    byStatus,
    byCompliance,
    passRate: totalChecks > 0 ? passedChecks / totalChecks : 0,
    avgChecksPerSpec: specs.length > 0 ? totalChecks / specs.length : 0,
    recentSpecs: specs
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10)
      .map((s) => ({
        specKey: s.specKey,
        title: s.title,
        status: s.status,
        updatedAt: s.updatedAt,
      })),
  });
});

// ── GET /v1/specs — List SpecDocs ──────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  const status = getSingleQueryValue(req.query.status);
  const clientOrg = getSingleQueryValue(req.query.clientOrg);
  const limit = getIntQueryValue(req.query.limit, 50);
  const cursor = getCursorQueryValue(req.query.cursor);

  const convexResult = await listSpecDocs({
    status,
    clientOrg: clientOrg || req.clientOrg,
    limit,
    cursor,
  });

  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback: filter in-memory
  let specs = Array.from(inMemorySpecs.values());
  if (status) specs = specs.filter((s) => s.status === status);
  if (clientOrg) specs = specs.filter((s) => s.clientOrg === clientOrg);

  res.json({
    specs: specs.slice(0, limit),
    total: specs.length,
  });
});

// ── GET /v1/specs/:specKey — Get specific SpecDoc ──────────────────────────

router.get("/:specKey", async (req: Request, res: Response) => {
  const specKey = getSinglePathValue(req.params.specKey);
  if (!specKey) {
    res.status(400).json({ error: "validation_error", message: "specKey is required" });
    return;
  }

  const convexResult = await getSpecDoc(specKey);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback
  const spec = inMemorySpecs.get(specKey);
  if (!spec) {
    res.status(404).json({ error: "not_found", message: `SpecDoc ${specKey} not found` });
    return;
  }

  res.json(spec);
});

// ── PATCH /v1/specs/:specKey/checks/:checkId — Update check result ─────────

router.patch("/:specKey/checks/:checkId", async (req: Request, res: Response) => {
  const specKey = getSinglePathValue(req.params.specKey);
  const checkId = getSinglePathValue(req.params.checkId);
  if (!specKey || !checkId) {
    res.status(400).json({
      error: "validation_error",
      message: "specKey and checkId are required",
    });
    return;
  }

  const parsed = checkResultUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  const convexResult = await updateCheck(specKey, checkId, parsed.data);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback
  const spec = inMemorySpecs.get(specKey);
  if (!spec) {
    res.status(404).json({ error: "not_found", message: `SpecDoc ${specKey} not found` });
    return;
  }

  if (spec.status === "finalized") {
    res.status(409).json({ error: "conflict", message: "Cannot update checks on a finalized SpecDoc" });
    return;
  }

  const check = spec.checks.find((c) => c.id === checkId);
  if (!check) {
    res.status(404).json({ error: "not_found", message: `Check ${checkId} not found` });
    return;
  }

  check.result = parsed.data.result;
  check.evidence = parsed.data.evidence || check.evidence;
  check.durationMs = parsed.data.durationMs ?? check.durationMs;
  check.executedAt = new Date().toISOString();
  spec.updatedAt = new Date().toISOString();

  // Auto-update spec status
  const allDone = spec.checks.every((c) => c.result !== "pending");
  const anyFailed = spec.checks.some((c) => c.result === "fail" || c.result === "error");
  if (allDone) {
    spec.status = anyFailed ? "failed" : "passed";
  } else {
    spec.status = "active";
  }

  res.json(spec);
});

// ── POST /v1/specs/:specKey/finalize — Finalize with proof pack ────────────

router.post("/:specKey/finalize", async (req: Request, res: Response) => {
  const specKey = getSinglePathValue(req.params.specKey);
  if (!specKey) {
    res.status(400).json({ error: "validation_error", message: "specKey is required" });
    return;
  }

  const parsed = finalizeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  const convexResult = await finalizeSpec(specKey, parsed.data);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback
  const spec = inMemorySpecs.get(specKey);
  if (!spec) {
    res.status(404).json({ error: "not_found", message: `SpecDoc ${specKey} not found` });
    return;
  }

  if (spec.status === "finalized") {
    res.status(409).json({ error: "conflict", message: "SpecDoc already finalized" });
    return;
  }

  spec.status = "finalized";
  spec.proofPackKey = parsed.data.proofPackKey;
  spec.finalizedAt = new Date().toISOString();
  spec.updatedAt = new Date().toISOString();

  res.json(spec);
});

// ── In-memory fallback store ───────────────────────────────────────────────

const inMemorySpecs = new Map<string, SpecDoc>();

export default router;
