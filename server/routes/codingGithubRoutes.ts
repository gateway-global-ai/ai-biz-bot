import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../auth";
import {
  createOrUpdateGithubPullRequest,
  getGithubPullRequestLink,
} from "../services/githubPrService";

const router = Router();

function firstRouteParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const upsertPrSchema = z.object({
  intentExecutionId: z.string().uuid(),
  repo: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  draft: z.boolean().optional(),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = upsertPrSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const prLink = await createOrUpdateGithubPullRequest(parsed.data);
    return res.json({ ok: true, pullRequest: prLink });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: message });
  }
});

router.get("/:intentExecutionId", requireAuth, async (req, res) => {
  const intentExecutionId = firstRouteParam(req.params.intentExecutionId);
  if (!intentExecutionId) {
    return res.status(400).json({ error: "intent_execution_id_required" });
  }

  const prLink = await getGithubPullRequestLink(intentExecutionId);
  if (!prLink) {
    return res.status(404).json({ error: "pull_request_link_not_found" });
  }
  return res.json({ ok: true, pullRequest: prLink });
});

export default router;
