/**
 * Industry Funnel Routes
 *
 * Serves structured FunnelPayload JSON to the /industry/[slug] React route.
 * Payloads are sourced from shared/industryFunnelTemplates/ (typed, compile-time safe).
 *
 * Lifecycle:
 *   - All shipped payloads start as "draft".
 *   - POST /api/industry-funnels/seed — idempotent seed of all canonical payloads into knowledge_artifacts.
 *   - GET /api/industry-funnels/:slug — returns payload (any status; frontend gates on status).
 *   - GET /api/industry-funnels — lists all slugs and statuses.
 *
 * Approval flow uses the existing POST /api/knowledge/approve-artifact/:id endpoint.
 */
import { Router } from "express";
import { db } from "../db";
import { knowledgeArtifacts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import {
  ALL_FUNNELS,
  FUNNEL_BY_SLUG,
  funnelPayloadSchema,
  funnelArtifactKey,
} from "@shared/industryFunnelTemplates";

const router = Router();

// ── GET /api/industry-funnels ─────────────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const list = ALL_FUNNELS.map((f) => ({
      slug: f.slug,
      vertical: f.vertical,
      industryVertical: f.industryVertical,
      status: f.status,
      version: f.version,
    }));
    return res.json({ funnels: list });
  } catch (err) {
    console.error("[industry-funnels] GET / error:", err);
    return res.status(500).json({ error: "Failed to list funnels" });
  }
});

// ── GET /api/industry-funnels/:slug ──────────────────────────────────────────
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const payload = FUNNEL_BY_SLUG.get(slug);

  if (!payload) {
    return res.status(404).json({ error: `No funnel found for slug: ${slug}` });
  }

  // Validate against schema to catch any drift between code and contract
  const parsed = funnelPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(`[industry-funnels] Schema validation failed for ${slug}:`, parsed.error.flatten());
    return res.status(500).json({ error: "Funnel payload failed schema validation", details: parsed.error.flatten() });
  }

  return res.json({ funnel: parsed.data });
});

// ── POST /api/industry-funnels/seed ──────────────────────────────────────────
// Idempotent — safe to run multiple times. Upserts all canonical payloads.
router.post("/seed", async (_req, res) => {
  const results: { slug: string; action: "created" | "updated"; artifactKey: string }[] = [];

  try {
    for (const payload of ALL_FUNNELS) {
      const parsed = funnelPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        console.error(`[industry-funnels/seed] Schema validation failed for ${payload.slug}:`, parsed.error.flatten());
        continue;
      }

      const artifactKey = funnelArtifactKey(payload.slug, payload.version);
      const content = JSON.stringify(parsed.data, null, 2);

      const [existing] = await db
        .select({ id: knowledgeArtifacts.id })
        .from(knowledgeArtifacts)
        .where(
          and(
            eq(knowledgeArtifacts.agentAccessKey, artifactKey),
            eq(knowledgeArtifacts.scope, "platform")
          )
        )
        .limit(1);

      if (existing?.id) {
        await db
          .update(knowledgeArtifacts)
          .set({ content, updatedAt: new Date() })
          .where(eq(knowledgeArtifacts.id, existing.id));
        results.push({ slug: payload.slug, action: "updated", artifactKey });
      } else {
        await db.insert(knowledgeArtifacts).values({
          title: `${payload.vertical} Funnel Payload V${payload.version}`,
          content,
          agentAccessKey: artifactKey,
          scope: "platform",
          visibility: "private",
          trustWeight: 8,
          groupLevel: "operator",
          artifactMetadata: {
            status: "draft",
            classification: "sales_process",
            tags: ["funnel", "industry", payload.industryVertical, `v${payload.version}`],
          },
        });
        results.push({ slug: payload.slug, action: "created", artifactKey });
      }
    }

    return res.json({ seeded: results.length, results });
  } catch (err) {
    console.error("[industry-funnels/seed] Error:", err);
    return res.status(500).json({ error: "Seed failed", details: String(err) });
  }
});

export default router;
