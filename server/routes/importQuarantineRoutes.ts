/**
 * Import Quarantine Routes — governed API surface for the zero-trust import pipeline.
 *
 * All endpoints require admin auth. No public access to quarantine operations.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";

import { requireAuth } from "../auth";
import { db } from "../db";
import { importQuarantineRuns } from "@shared/schema";
import {
  CreateQuarantineRunRequestSchema,
  PromotionDecisionSchema,
} from "@shared/importQuarantineContract";
import {
  createQuarantineRun,
  scanQuarantine,
  extractArtifacts,
  generateExtractionReport,
  certifyAsKnowledge,
  applyPromotionDecision,
  incinerateQuarantine,
  runFullQuarantinePipeline,
} from "../services/importQuarantineService";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateQuarantineRunRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await createQuarantineRun(parsed.data);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.post("/pipeline", requireAuth, async (req, res) => {
  const parsed = CreateQuarantineRunRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await runFullQuarantinePipeline(parsed.data);
    const httpStatus = result.state === "blocked" ? 409
      : result.state === "failed" ? 500
      : 200;

    return res.status(httpStatus).json({ ok: result.state === "incinerated", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.get("/:runId", requireAuth, async (req, res) => {
  const runId = req.params.runId as string;
  if (!runId) return res.status(400).json({ error: "run_id_required" });

  const [run] = await db
    .select()
    .from(importQuarantineRuns)
    .where(eq(importQuarantineRuns.id, runId))
    .limit(1);

  if (!run) return res.status(404).json({ error: "run_not_found" });
  return res.json({ ok: true, run });
});

router.post("/:runId/scan", requireAuth, async (req, res) => {
  const runId = req.params.runId as string;
  if (!runId) return res.status(400).json({ error: "run_id_required" });

  try {
    const scanResult = await scanQuarantine(runId);
    return res.json({ ok: true, scanResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.post("/:runId/extract", requireAuth, async (req, res) => {
  const runId = req.params.runId as string;
  if (!runId) return res.status(400).json({ error: "run_id_required" });

  try {
    const artifacts = await extractArtifacts(runId);
    return res.json({ ok: true, artifactCount: artifacts.length, artifacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.post("/:runId/report", requireAuth, async (req, res) => {
  const runId = req.params.runId as string;
  if (!runId) return res.status(400).json({ error: "run_id_required" });

  try {
    const reportPath = await generateExtractionReport(runId);
    return res.json({ ok: true, reportPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.post("/:runId/certify", requireAuth, async (req, res) => {
  const runId = req.params.runId as string;
  if (!runId) return res.status(400).json({ error: "run_id_required" });

  try {
    await certifyAsKnowledge(runId);
    return res.json({ ok: true, certificationLevel: "unverified" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.post("/:runId/promote", requireAuth, async (req, res) => {
  const runId = req.params.runId as string;
  if (!runId) return res.status(400).json({ error: "run_id_required" });

  const parsed = PromotionDecisionSchema.safeParse({
    ...req.body,
    quarantineRunId: runId,
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    await applyPromotionDecision(parsed.data);
    return res.json({ ok: true, decision: parsed.data.decision });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.post("/:runId/incinerate", requireAuth, async (req, res) => {
  const runId = req.params.runId as string;
  if (!runId) return res.status(400).json({ error: "run_id_required" });

  try {
    await incinerateQuarantine(runId);
    return res.json({ ok: true, message: "Quarantine burned. No external code persists." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

export default router;
