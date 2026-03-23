/**
 * Onboarding Routes — 5-Step AI Biz Bot Business Onboarding Flow
 *
 * Mounted at /api/onboarding
 *
 * POST /start           — create or retrieve in-progress session for a siteConfigId
 * PATCH /:id/step       — save step data and advance the step counter
 * POST /:id/complete    — finalize onboarding, transition workspaceState to 'onboarding_complete'
 *
 * All routes require authentication.
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { onboardingSessions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../auth';
import { storage } from '../storage';

const router = Router();

/**
 * POST /api/onboarding/start
 * Create or retrieve an in-progress onboarding session for a siteConfigId.
 */
router.post('/start', requireAuth, async (req: any, res) => {
  const schema = z.object({ siteConfigId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const { siteConfigId } = parsed.data;

    // Return existing in-progress session if one exists
    const existing = await db
      .select()
      .from(onboardingSessions)
      .where(and(
        eq(onboardingSessions.siteConfigId, siteConfigId),
        eq(onboardingSessions.status, 'in_progress'),
      ))
      .limit(1);

    if (existing.length > 0) return res.json(existing[0]);

    const [session] = await db
      .insert(onboardingSessions)
      .values({ siteConfigId, currentStep: 1, collectedData: {}, status: 'in_progress' })
      .returning();

    return res.status(201).json(session);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/onboarding/:id/step
 * Save collected data for the current step and advance the step counter (1→5).
 * Body: { stepData: Record<string, unknown> }
 */
router.patch('/:id/step', requireAuth, async (req: any, res) => {
  const schema = z.object({ stepData: z.record(z.unknown()).optional().default({}) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [session] = await db
      .select()
      .from(onboardingSessions)
      .where(eq(onboardingSessions.id, req.params.id))
      .limit(1);

    if (!session) return res.status(404).json({ error: 'Onboarding session not found' });
    if (session.status !== 'in_progress') {
      return res.status(409).json({ error: `Session is already ${session.status}` });
    }

    const mergedData = { ...(session.collectedData as Record<string, unknown>), ...parsed.data.stepData };
    const nextStep = Math.min((session.currentStep ?? 1) + 1, 5);

    const [updated] = await db
      .update(onboardingSessions)
      .set({ collectedData: mergedData, currentStep: nextStep, updatedAt: new Date() })
      .where(eq(onboardingSessions.id, req.params.id))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/onboarding/:id/complete
 * Finalize the onboarding session. Transitions workspaceState to 'onboarding_complete'.
 * The concierge agent must already exist (created on site signup).
 */
router.post('/:id/complete', requireAuth, async (req: any, res) => {
  try {
    const [session] = await db
      .select()
      .from(onboardingSessions)
      .where(eq(onboardingSessions.id, req.params.id))
      .limit(1);

    if (!session) return res.status(404).json({ error: 'Onboarding session not found' });
    if (session.status === 'complete') {
      return res.json({ success: true, alreadyComplete: true, session });
    }

    // Mark session complete
    const [completed] = await db
      .update(onboardingSessions)
      .set({ status: 'complete', updatedAt: new Date() })
      .where(eq(onboardingSessions.id, req.params.id))
      .returning();

    // Transition workspaceState — agents already bootstrapped on signup
    await storage.updateSiteConfig(session.siteConfigId, { workspaceState: 'onboarding_complete' } as any);

    return res.json({ success: true, session: completed });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
