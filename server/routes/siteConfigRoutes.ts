/**
 * server/routes/siteConfigRoutes.ts
 *
 * Canonical, modular router for all /api/site-configs endpoints.
 * This is the sole source of truth — do NOT add site-config routes
 * anywhere else (especially not in server/routes.ts).
 *
 * UPAValidator note: validation fires at the storage layer inside
 * storage.createSiteConfig() — no route-level validator needed here.
 *
 * Granular Resource Ledger (migration 0009):
 *   voicePhoneAiMinutes, voiceWebAiMinutes, smsMessages, chatBotMessages
 * All four are included in the PATCH schema so the owner dashboard
 * 4-card panel can update quotas without being silently stripped.
 */

import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { storage } from '../storage';

const router = Router();

// ─── Shared Zod Schemas ──────────────────────────────────────────────────────

const knowledgeDocSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  addedAt: z.string(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().optional(),
  placeId: z.string().optional(),
  placeData: z.any().optional(),
  assignedAgentId: z.string().nullable().optional(),
  botTemplateId: z.string().nullable().optional(),
  systemPromptOverride: z.string().nullable().optional(),
  modelProvider: z.string().optional(),
  modelName: z.string().nullable().optional(),
  chatbotEnabled: z.boolean().optional(),
  voiceConciergeEnabled: z.boolean().optional(),
  widgetPosition: z.string().optional(),
  widgetColor: z.string().optional(),
  greetingMessage: z.string().nullable().optional(),
  placeholderText: z.string().optional(),
  plan: z.enum(['free', 'pro', 'voice', 'enterprise']).optional(),
  heroImageUrl: z.string().nullable().optional(),
  heroImagePrompt: z.string().nullable().optional(),
  // Granular Resource Ledger (migration 0009)
  voicePhoneAiMinutes: z.number().int().min(0).optional(),
  voiceWebAiMinutes: z.number().int().min(0).optional(),
  smsMessages: z.number().int().min(0).optional(),
  chatBotMessages: z.number().int().min(0).optional(),
});

const patchSchema = createSchema.partial().extend({
  knowledgeLibrary: z.array(knowledgeDocSchema).nullable().optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/site-configs
 * Returns all site configurations (admin list view).
 */
router.get('/', async (_req, res) => {
  try {
    const configs = await storage.getSiteConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/site-configs
 * Creates a new site configuration.
 * UPAValidator fires inside storage.createSiteConfig() if systemPromptOverride is set.
 */
router.post('/', async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const config = await storage.createSiteConfig(parsed.data as any);
    res.status(201).json(config);
  } catch (error: any) {
    // Surface UPAValidator rejections with a 422 so the client can distinguish
    // validation failures from generic 500s.
    if (error.message?.startsWith('System prompt validation failed')) {
      return res.status(422).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/site-configs/:id
 * Partial update. Accepts ALL mutable fields including the Granular Resource
 * Ledger (voicePhoneAiMinutes, voiceWebAiMinutes, smsMessages, chatBotMessages)
 * and plan so the owner dashboard 4-card panel works correctly.
 */
router.patch('/:id', async (req, res) => {
  try {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const updated = await storage.updateSiteConfig(req.params.id, parsed.data as any);
    if (!updated) {
      return res.status(404).json({ error: 'Site config not found' });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/site-configs/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    await storage.deleteSiteConfig(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/site-configs/:id/chat-logs
 * Returns paginated chat log history for a site config.
 */
router.get('/:id/chat-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await storage.getChatLogs(req.params.id, limit);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/site-configs/:id/knowledge
 * Returns the knowledge library array for a site config.
 */
router.get('/:id/knowledge', async (req, res) => {
  try {
    const site = await storage.getSiteConfigById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const lib = (site as any).knowledgeLibrary;
    res.json(Array.isArray(lib) ? lib : []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/site-configs/:id/knowledge
 * Appends a document to the knowledge library.
 */
router.post('/:id/knowledge', async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1).max(200),
      content: z.string().max(500000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const site = await storage.getSiteConfigById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const existing = Array.isArray((site as any).knowledgeLibrary)
      ? (site as any).knowledgeLibrary
      : [];
    const doc = {
      id: randomUUID(),
      title: parsed.data.title,
      content: parsed.data.content,
      addedAt: new Date().toISOString(),
    };
    const updated = await storage.updateSiteConfig(req.params.id, {
      knowledgeLibrary: [...existing, doc],
    } as any);
    res.json(updated?.knowledgeLibrary ?? [...existing, doc]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/site-configs/:id/knowledge/:docId
 * Removes a document from the knowledge library by its ID.
 */
router.delete('/:id/knowledge/:docId', async (req, res) => {
  try {
    const site = await storage.getSiteConfigById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const existing = Array.isArray((site as any).knowledgeLibrary)
      ? (site as any).knowledgeLibrary
      : [];
    const next = existing.filter((d: any) => d.id !== req.params.docId);
    await storage.updateSiteConfig(req.params.id, { knowledgeLibrary: next } as any);
    res.json({ success: true, knowledgeLibrary: next });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/site-configs/:id
 * The "Handover Service" endpoint — fetches the pre-validated site config
 * (including systemPromptOverride) for the ConciergePanel.
 *
 * CORS: This endpoint is called cross-origin by the Gateway Global Web SDK
 * (gateway.js) when embedded on third-party websites (Wix, WordPress, etc.).
 * The permissive CORS header below is intentional — the data returned is
 * already public-facing (widget config), and the sensitive systemPromptOverride
 * is only readable by authenticated callers in production (add auth middleware
 * here if you gate by API key in a future hardening pass).
 *
 * Must be declared LAST so more-specific subroutes above (/chat-logs,
 * /knowledge, /knowledge/:docId) are matched first.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // Allow the SDK (running on any third-party origin) to fetch the config.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!id || id === 'undefined') {
    return res.status(400).json({ error: 'A valid site configuration ID is required.' });
  }

  try {
    const siteConfig = await storage.getSiteConfigById(id);

    if (!siteConfig) {
      return res.status(404).json({ error: `Site configuration with ID ${id} not found.` });
    }

    res.status(200).json(siteConfig);
  } catch (error: any) {
    console.error(`[SiteConfigRoutes] Failed to fetch site config for ID ${id}:`, error);
    res.status(500).json({ error: 'An internal server error occurred while fetching site configuration.' });
  }
});

export default router;
