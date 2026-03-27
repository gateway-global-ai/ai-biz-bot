/**
 * Visitor Session Routes — Buyer Journey Payload Node
 *
 * Persists cross-session buyer context keyed to (visitorId, siteConfigId).
 * `site_config_id` is FK to `site_configs.id` — marketing sentinel `platform_landing` must exist
 * (see migrations/0070_platform_landing_site_config.sql or `npm run db:seed-platform-landing`).
 *
 * Used by the CGR builder on session start and by journey_agent after session ends.
 *
 * Endpoints:
 *   GET    /api/visitor-session/:visitorId/:siteConfigId         — upsert-on-read, returns BuyerJourney
 *   PATCH  /api/visitor-session/:visitorId/:siteConfigId         — deep-merge partial BuyerJourney update
 *   POST   /api/visitor-session/:visitorId/:siteConfigId/event   — append a single signal
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { visitorSessions } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import type { BuyerJourney } from "@shared/conversationGrounding";
import { DEFAULT_BUYER_JOURNEY } from "@shared/conversationGrounding";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Merge incoming partial BuyerJourney on top of stored journey, accumulating arrays. */
function mergeJourney(stored: BuyerJourney, incoming: Partial<BuyerJourney>): BuyerJourney {
  return {
    ...stored,
    ...incoming,
    // Arrays are accumulated, not replaced
    painPointsExpressed: dedupe([
      ...(stored.painPointsExpressed ?? []),
      ...(incoming.painPointsExpressed ?? []),
    ]),
    pricingObjectionsRaised: dedupe([
      ...(stored.pricingObjectionsRaised ?? []),
      ...(incoming.pricingObjectionsRaised ?? []),
    ]),
    needsExpressed: dedupe([
      ...(stored.needsExpressed ?? []),
      ...(incoming.needsExpressed ?? []),
    ]),
    lastSessionAt: incoming.lastSessionAt ?? new Date().toISOString(),
    sessionCount: (stored.sessionCount ?? 0) + (incoming.sessionCount ?? 0),
  };
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].slice(0, 20);
}

function parseStoredJourney(raw: Record<string, unknown> | null | undefined): BuyerJourney {
  if (!raw || typeof raw !== 'object' || !('phase' in raw)) {
    return { ...DEFAULT_BUYER_JOURNEY };
  }
  return {
    phase: (raw.phase as BuyerJourney['phase']) ?? 'awareness',
    industry: raw.industry as string | undefined,
    painPointsExpressed: (raw.painPointsExpressed as string[]) ?? [],
    pricingObjectionsRaised: (raw.pricingObjectionsRaised as string[]) ?? [],
    needsExpressed: (raw.needsExpressed as string[]) ?? [],
    demoViewedAt: raw.demoViewedAt as string | undefined,
    trialStartedAt: raw.trialStartedAt as string | undefined,
    activatedAt: raw.activatedAt as string | undefined,
    lastAgentId: raw.lastAgentId as string | undefined,
    lastSessionAt: raw.lastSessionAt as string | undefined,
    sessionCount: (raw.sessionCount as number) ?? 0,
  };
}

// ── GET /:visitorId/:siteConfigId — upsert-on-read ───────────────────────────
router.get("/:visitorId/:siteConfigId", async (req, res) => {
  const { visitorId, siteConfigId } = req.params;
  if (!visitorId || !siteConfigId) {
    return res.status(400).json({ error: "visitorId and siteConfigId are required" });
  }

  try {
    // Try to find existing session
    const [existing] = await db
      .select()
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.visitorId, visitorId),
          eq(visitorSessions.siteConfigId, siteConfigId),
        )
      )
      .limit(1);

    if (existing) {
      // Touch last_seen_at on every load
      await db
        .update(visitorSessions)
        .set({ lastSeenAt: new Date() })
        .where(eq(visitorSessions.id, existing.id));

      return res.json({ buyerJourney: parseStoredJourney(existing.buyerJourney) });
    }

    // First visit — create with default journey
      const [created] = await db
        .insert(visitorSessions)
        .values({
          visitorId,
          siteConfigId: siteConfigId as string,
          buyerJourney: { ...DEFAULT_BUYER_JOURNEY } as Record<string, unknown>,
        })
        .onConflictDoNothing()
        .returning();

    return res.json({ buyerJourney: parseStoredJourney(created?.buyerJourney) });
  } catch (err) {
    console.error("[visitorSessionRoutes] GET error:", err);
    return res.status(500).json({ error: "Failed to load visitor session" });
  }
});

// ── PATCH /:visitorId/:siteConfigId — deep-merge update ─────────────────────
const patchSchema = z.object({
  buyerJourney: z.record(z.unknown()),
});

router.patch("/:visitorId/:siteConfigId", async (req, res) => {
  const { visitorId, siteConfigId } = req.params;
  if (!visitorId || !siteConfigId) {
    return res.status(400).json({ error: "visitorId and siteConfigId are required" });
  }

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  try {
    const [existing] = await db
      .select()
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.visitorId, visitorId),
          eq(visitorSessions.siteConfigId, siteConfigId),
        )
      )
      .limit(1);

    const storedJourney = parseStoredJourney(existing?.buyerJourney);
    const incomingJourney = parsed.data.buyerJourney as Partial<BuyerJourney>;
    const merged = mergeJourney(storedJourney, incomingJourney);

    if (existing) {
      await db
        .update(visitorSessions)
        .set({ buyerJourney: merged as unknown as Record<string, unknown>, lastSeenAt: new Date() })
        .where(eq(visitorSessions.id, existing.id));
    } else {
      await db
        .insert(visitorSessions)
        .values({
          visitorId,
          siteConfigId,
          buyerJourney: merged as unknown as Record<string, unknown>,
        })
        .onConflictDoNothing();
    }

    return res.json({ buyerJourney: merged });
  } catch (err) {
    console.error("[visitorSessionRoutes] PATCH error:", err);
    return res.status(500).json({ error: "Failed to update visitor session" });
  }
});

// ── POST /:visitorId/:siteConfigId/event — append single signal ──────────────
const eventSchema = z.object({
  type: z.enum(["painPoint", "objection", "need", "demoView", "trialStart", "activation", "phaseTransition"]),
  value: z.string().max(500).optional(),
  phase: z.enum(["awareness", "consideration", "demo", "trial", "activation", "retention"]).optional(),
  agentId: z.string().optional(),
});

router.post("/:visitorId/:siteConfigId/event", async (req, res) => {
  const { visitorId, siteConfigId } = req.params;
  if (!visitorId || !siteConfigId) {
    return res.status(400).json({ error: "visitorId and siteConfigId are required" });
  }

  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const event = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.visitorId, visitorId),
          eq(visitorSessions.siteConfigId, siteConfigId),
        )
      )
      .limit(1);

    const stored = parseStoredJourney(existing?.buyerJourney);

    // Apply event as a targeted mutation
    const update: Partial<BuyerJourney> = {};
    if (event.type === "painPoint" && event.value) {
      update.painPointsExpressed = dedupe([...stored.painPointsExpressed, event.value]);
    }
    if (event.type === "objection" && event.value) {
      update.pricingObjectionsRaised = dedupe([...stored.pricingObjectionsRaised, event.value]);
    }
    if (event.type === "need" && event.value) {
      update.needsExpressed = dedupe([...stored.needsExpressed, event.value]);
    }
    if (event.type === "demoView") {
      update.demoViewedAt = new Date().toISOString();
      update.phase = 'demo';
    }
    if (event.type === "trialStart") {
      update.trialStartedAt = new Date().toISOString();
      update.phase = 'trial';
    }
    if (event.type === "activation") {
      update.activatedAt = new Date().toISOString();
      update.phase = 'activation';
    }
    if (event.type === "phaseTransition" && event.phase) {
      update.phase = event.phase;
    }
    if (event.agentId) {
      update.lastAgentId = event.agentId;
    }

    const merged = mergeJourney(stored, { ...update, sessionCount: 0 });

    if (existing) {
      await db
        .update(visitorSessions)
        .set({ buyerJourney: merged as unknown as Record<string, unknown>, lastSeenAt: new Date() })
        .where(eq(visitorSessions.id, existing.id));
    } else {
      await db
        .insert(visitorSessions)
        .values({
          visitorId,
          siteConfigId,
          buyerJourney: merged as unknown as Record<string, unknown>,
        })
        .onConflictDoNothing();
    }

    return res.json({ ok: true, buyerJourney: merged });
  } catch (err) {
    console.error("[visitorSessionRoutes] POST event error:", err);
    return res.status(500).json({ error: "Failed to record visitor event" });
  }
});

// ── PATCH /:visitorId/:siteConfigId/security — elevate security level ────────
// Called after OTP verification succeeds on the client.
// Allows upgrading from anonymous → phone_verified or admin.
const securityLevelSchema = z.object({
  securityLevel: z.enum(["anonymous", "phone_verified", "admin"]),
  verifiedPhone: z.string().optional(),
});

router.patch("/:visitorId/:siteConfigId/security", async (req, res) => {
  const { visitorId, siteConfigId } = req.params;
  if (!visitorId || !siteConfigId) {
    return res.status(400).json({ error: "visitorId and siteConfigId are required" });
  }

  const parsed = securityLevelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  try {
    await db
      .update(visitorSessions)
      .set({
        securityLevel: parsed.data.securityLevel,
        ...(parsed.data.verifiedPhone ? { verifiedPhone: parsed.data.verifiedPhone } : {}),
        lastSeenAt: new Date(),
      })
      .where(
        and(
          eq(visitorSessions.visitorId, visitorId),
          eq(visitorSessions.siteConfigId, siteConfigId)
        )
      );

    return res.json({ ok: true, securityLevel: parsed.data.securityLevel });
  } catch (err) {
    console.error("[visitorSessionRoutes] PATCH security error:", err);
    return res.status(500).json({ error: "Failed to update security level" });
  }
});

export default router;
