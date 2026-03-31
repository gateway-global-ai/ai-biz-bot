import { Router } from "express";

import { requireAuth } from "../auth";
import {
  BindSkillsRequestSchema,
  CreateCodingIntentRequestSchema,
  CreateExecutionPacketRequestSchema,
  OutcomePacketFragmentSchema,
} from "@shared/intentExecutionPlane/contracts";
import { assertSiteAccessForSession } from "../utils/siteScopedAccess";
import {
  bindSkills,
  buildCodingCommandCenter,
  createCodingIntent,
  createExecutionPacket,
  deriveScopes,
  evaluateReviewGates,
  getCodingIntent,
  upsertOutcomePacket,
} from "../services/intentExecutionService";

const router = Router();

function firstRouteParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateCodingIntentRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (parsed.data.siteConfigId) {
    const access = await assertSiteAccessForSession(req, parsed.data.siteConfigId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error, code: "SITE_ACCESS_DENIED" });
    }
  }

  try {
    const result = await createCodingIntent(parsed.data);
    return res.json({
      ok: true,
      workItem: result.workItem,
      intentExecution: result.intentExecution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

router.get("/:intentExecutionId", requireAuth, async (req, res) => {
  const id = firstRouteParam(req.params.intentExecutionId);
  if (!id) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const snapshot = await getCodingIntent(id);
  if (!snapshot) {
    return res.status(404).json({ error: "intent_execution_not_found" });
  }
  const commandCenter = await buildCodingCommandCenter(id);
  return res.json({ ok: true, snapshot, commandCenter });
});

router.post("/:intentExecutionId/derive-scopes", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  try {
    const scopes = await deriveScopes(intentExecutionId);
    return res.json({ ok: true, scopes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.post("/:intentExecutionId/bind-skills", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const parsed = BindSkillsRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const bindings = await bindSkills(intentExecutionId, parsed.data.replaceExisting);
    return res.json({ ok: true, bindings });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.post("/:intentExecutionId/create-execution-packet", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const parsed = CreateExecutionPacketRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const packet = await createExecutionPacket(intentExecutionId, parsed.data);
    return res.json({ ok: true, executionPacket: packet });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.post("/:intentExecutionId/outcome", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  const parsed = OutcomePacketFragmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const outcomePacket = await upsertOutcomePacket(intentExecutionId, parsed.data);
    const reviewGates = await evaluateReviewGates(intentExecutionId);
    return res.json({ ok: true, outcomePacket, reviewGates });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.post("/:intentExecutionId/review-gates/evaluate", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  try {
    const gates = await evaluateReviewGates(intentExecutionId);
    return res.json({ ok: true, reviewGates: gates });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.get("/:intentExecutionId/command-center", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }
  try {
    const payload = await buildCodingCommandCenter(intentExecutionId);
    return res.json({
      ok: true,
      canvasPayload: {
        viewId: "command_center",
        title: "Dev Execution Command Center",
        renderMode: "replace",
        data: payload,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

export default router;
