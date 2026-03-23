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
import multer from 'multer';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { storage } from '../storage';
import { requireAuth } from '../auth';
import { assertSiteScopedAccess, type SitePolicyKey } from '../utils/siteScopedAccess';
import { preloadBusinessAndReviews } from '../services/preloadBusinessKnowledge';
import { handleGetHotelInventory } from '../tools/hotelInventoryHandler';
import { classifyKnowledgeDocument } from '../services/knowledgeClassificationService';
import { frontDeskOutcomeEventRequestSchema } from '../contracts/frontDeskSessionContract';
import { db } from '../db';
import {
  consentRecords,
  intakeChangeRequests,
  patientVendorRelationships,
  vendors,
  siteConfigs, 
  users, 
  agents
} from '@shared/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getSensitiveInputPolicyById } from '../config/sensitiveInputPolicy';
import { getIntakeIndustryPack } from '../config/intakeTemplateLibrary';
import {
  DEFAULT_INTAKE_POLICY,
  intakePolicySchema,
  resolveFieldWriteMode,
  resolveIntakePolicyConfig,
} from '../services/intakePolicyService';
import {
  verificationPolicySchema,
  resolveVerificationPolicyConfig,
} from '../services/verificationPolicyService';

/** Converts a business name into a URL-safe slug with a 4-char random suffix. */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/-$/, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'biz'}-${suffix}`;
}

/** Normalize user input to a URL-safe slug (lowercase, hyphens, no leading/trailing dash). */
function normalizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
    .replace(/^-|-$/g, '') || '';
}

const router = Router();

const OUTCOME_EVENT_POLICIES: Record<
  'frontdesk.assist_joined' | 'frontdesk.assist_ended' | 'frontdesk.outcome_captured',
  SitePolicyKey
> = {
  'frontdesk.assist_joined': 'frontdesk.assist.write',
  'frontdesk.assist_ended': 'frontdesk.assist.write',
  'frontdesk.outcome_captured': 'frontdesk.outcome.write',
};

// ─── Shared Zod Schemas ──────────────────────────────────────────────────────

const knowledgeDocSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  addedAt: z.string(),
  category: z.string().optional(),
  topic: z.string().optional(),
  documentDate: z.string().optional(),
});

// Mixing Board config schemas (migration 0012)
const agentConfigSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  discProfile: z.string().optional(),
  basePrompt: z.string().optional(),
}).nullable().optional();

const voiceConfigSchema = z.object({
  voiceName: z.string().optional(),
  language: z.string().optional(),
  isPushToTalk: z.boolean().optional(),
  analysis: z.object({
    detectEmotion: z.boolean().optional(),
    detectSentiment: z.boolean().optional(),
    detectDISC: z.boolean().optional(),
  }).optional(),
}).nullable().optional();

const themeConfigSchema = z.object({
  primaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  borderRadius: z.string().optional(),
}).nullable().optional();

const socialSharingSchema = z.object({
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(500).optional(),
  ogImage: z.string().max(2000).optional().nullable(),
  ogUrl: z.string().max(2000).optional().nullable(),
  ogSiteName: z.string().max(200).optional().nullable(),
  ogType: z.enum(['website', 'article']).optional(),
  twitterCard: z.enum(['summary', 'summary_large_image', 'player', 'app']).optional(),
}).nullable().optional();

const serviceMenuSchema = z.array(z.object({
  name: z.string(),
  price: z.string().optional(),
  duration: z.number().optional(),
  description: z.string().optional()
})).nullable().optional();

const faqsSchema = z.array(z.object({
  question: z.string(),
  answer: z.string()
})).nullable().optional();

const crmConfigSchema = z.object({
  statuses: z.array(z.string()).optional(),
  defaultStatus: z.string().optional()
}).nullable().optional();

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
  // Non-Google-Maps / custom business support (migration 0046)
  businessType: z.enum(['google_maps', 'custom']).optional().default('google_maps'),
  businessDescription: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
});

const patchSchema = createSchema.partial().extend({
  slug: z.union([z.string().min(1).max(100), z.literal('')]).optional(),
  knowledgeLibrary: z.array(knowledgeDocSchema).nullable().optional(),
  // Mixing Board JSONB fields (migration 0012)
  agentConfig: agentConfigSchema,
  voiceConfig: voiceConfigSchema,
  themeConfig: themeConfigSchema,
  socialSharing: socialSharingSchema,
  serviceMenu: serviceMenuSchema,
  faqs: faqsSchema,
  crmConfig: crmConfigSchema,
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
    const data: any = { ...parsed.data };
    if (data.placeId && !data.heroImageUrl) {
      data.heroImageUrl = `/api/places/photo-proxy/${data.placeId}?maxWidth=1200`;
    }
    // Generate a unique URL slug for the public business page
    data.slug = generateSlug(data.name);
    const config = await storage.createSiteConfig(data as any);
    try {
      // Bootstrap a single Voice Concierge in strict safe mode.
      // Additional agents are created only via the AI Bot Builder flow after
      // the owner completes all 5 onboarding steps and approves deployment.
      const concierge = await storage.createAgent({
        siteConfigId: config.id,
        name: `${config.name} Concierge`,
        roleType: 'concierge',
        safeMode: 'strict',
        dominance: '20', influence: '45', steadiness: '80', conscientiousness: '75',
        acknowledge: '30', reflect: '30', context: '60', handoff: '20',
        responseWindowSeconds: 10,
        isActive: true,
      } as any);
      // Set this concierge as the assigned agent for the site
      await storage.updateSiteConfig(config.id, { assignedAgentId: concierge.id });
    } catch (provisionErr: any) {
      console.error('[SiteConfig] Concierge bootstrap failed (site created):', provisionErr?.message ?? provisionErr);
    }
    if (config.placeId || config.placeData) {
      preloadBusinessAndReviews(config.id).catch((err) =>
        console.warn('[SiteConfig] Preload business/reviews failed (async):', err?.message ?? err)
      );
    }
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
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const data: any = { ...parsed.data };
    if ('slug' in data) {
      data.slug = (data.slug && normalizeSlugInput(String(data.slug))) || null;
    }
    const updated = await storage.updateSiteConfig(req.params.id, data);
    if (!updated) {
      return res.status(404).json({ error: 'Site config not found' });
    }
    const hasPlace = parsed.data && ('placeId' in parsed.data || 'placeData' in parsed.data);
    if (hasPlace && (parsed.data.placeId || parsed.data.placeData)) {
      preloadBusinessAndReviews(req.params.id).catch((err) =>
        console.warn('[SiteConfig] Preload business/reviews failed (async):', err?.message ?? err)
      );
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/site-configs/:id/domain/verify-ownership
 * Proxies to Hostinger API to verify domain ownership. Body: { domain: string }.
 * On success (is_accessible: true), updates site_configs.domain and domain_verified_at.
 * Requires HOSTINGER_API_TOKEN in env.
 */
const verifyOwnershipSchema = z.object({ domain: z.string().min(1).max(253) });
router.post('/:id/domain/verify-ownership', async (req, res) => {
  try {
    const parsed = verifyOwnershipSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const siteId = req.params.id;
    const site = await storage.getSiteConfigById(siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site config not found' });
    }
    const token = process.env.HOSTINGER_API_TOKEN;
    if (!token) {
      return res.status(503).json({ error: 'Domain verification not configured (HOSTINGER_API_TOKEN)' });
    }
    const domain = parsed.data.domain.replace(/^www\./i, '').trim();
    const hostingerRes = await fetch('https://developers.hostinger.com/api/hosting/v1/domains/verify-ownership', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ domain }),
    });
    const data = await hostingerRes.json().catch(() => ({}));
    if (!hostingerRes.ok) {
      return res.status(hostingerRes.status >= 500 ? 502 : hostingerRes.status).json({
        error: data?.error ?? 'Hostinger verification failed',
        hostinger: data,
      });
    }
    const isAccessible = data?.is_accessible === true;
    if (isAccessible) {
      await storage.updateSiteConfig(siteId, {
        domain: domain || undefined,
        domainVerifiedAt: new Date(),
      } as any);
    }
    res.json({
      domain: data?.domain ?? domain,
      is_accessible: isAccessible,
      txt_to_verify: data?.txt_to_verify ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/site-configs/refresh-all-hero-images
 * Sets heroImageUrl to the Google Places photo proxy URL for every site that has a placeId.
 * Use this to pull images from Google Maps again so list and profiles show the correct business photo.
 */
router.post('/refresh-all-hero-images', async (_req, res) => {
  try {
    const configs = await storage.getSiteConfigs();
    let updated = 0;
    for (const site of configs) {
      const placeId = (site as { placeId?: string | null }).placeId;
      if (!placeId || placeId.length < 20) continue;
      const proxyUrl = `/api/places/photo-proxy/${encodeURIComponent(placeId)}?maxWidth=1200`;
      await storage.updateSiteConfig(site.id, { heroImageUrl: proxyUrl } as any);
      updated++;
    }
    res.json({ updated, total: configs.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/site-configs/:id/refresh-hero-image
 * Sets heroImageUrl to the Google Places photo proxy URL for this site when it has a placeId.
 */
router.post('/:id/refresh-hero-image', async (req, res) => {
  try {
    const site = await storage.getSiteConfigById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const placeId = (site as { placeId?: string | null }).placeId;
    if (!placeId || placeId.length < 20) {
      return res.status(400).json({ error: 'Site has no Google Place ID; cannot refresh hero image' });
    }
    const proxyUrl = `/api/places/photo-proxy/${encodeURIComponent(placeId)}?maxWidth=1200`;
    await storage.updateSiteConfig(req.params.id, { heroImageUrl: proxyUrl } as any);
    res.json({ heroImageUrl: proxyUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/site-configs/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await storage.deleteSiteConfig(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/site-configs/:id/hotel-availability
 * Returns live room availability and rates for a site linked to GRN (platform_business_map + b2b_hotels).
 * Query: checkIn (YYYY-MM-DD), checkOut (YYYY-MM-DD), guests (optional).
 * Used by the hospitality booking block below the hero on WebsitePreview.
 */
router.get('/:id/hotel-availability', async (req, res) => {
  try {
    const siteConfigId = req.params.id;
    const checkIn = (req.query.checkIn as string) || new Date().toISOString().slice(0, 10);
    const checkOut = (req.query.checkOut as string) || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
    const guests = req.query.guests ? parseInt(req.query.guests as string, 10) : 2;
    const result = await handleGetHotelInventory({
      _sessionSiteConfigId: siteConfigId,
      checkIn,
      checkOut,
      guests,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? 'Failed to fetch hotel availability.' });
  }
});

/**
 * GET /api/site-configs/:id/chat-logs
 * Returns paginated chat log history for a site config.
 */
router.get('/:id/chat-logs', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'frontdesk.transcript.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await storage.getChatLogs(id, limit);
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
 * Appends a document to the knowledge library. Content only; LLM classifies as api_docs | hotel | platform_economics and sets title/topic.
 */
router.post('/:id/knowledge', async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1).max(500000),
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
    const now = new Date().toISOString();
    const documentDate = now.slice(0, 10);
    const classified = await classifyKnowledgeDocument('Pasted content', parsed.data.content);
    const doc = {
      id: randomUUID(),
      title: classified.title,
      content: parsed.data.content,
      addedAt: now,
      category: classified.category,
      topic: classified.topic,
      documentDate,
    };
    const next = [...existing, doc];
    await storage.updateSiteConfig(req.params.id, { knowledgeLibrary: next } as any);
    res.json(next);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/site-configs/:id/knowledge/upload
 * Upload one or more documents; extract text, then LLM classifies each as api_docs | hotel | platform_economics (no manual tags).
 */
const knowledgeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB per file
router.post('/:id/knowledge/upload', knowledgeUpload.array('files', 20), async (req, res) => {
  try {
    const site = await storage.getSiteConfigById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const documentDate = new Date().toISOString().slice(0, 10);
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const existing = Array.isArray((site as any).knowledgeLibrary) ? (site as any).knowledgeLibrary : [];
    const added: any[] = [];

    for (const file of files) {
      const ext = (file.originalname || '').split('.').pop()?.toLowerCase() ?? '';
      let text = '';
      if (ext === 'txt' || ext === 'md' || ext === 'yaml' || ext === 'yml' || ext === 'csv' || file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
        text = file.buffer.toString('utf8');
      } else if (ext === 'pdf' || file.mimetype === 'application/pdf') {
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const data = await pdfParse(file.buffer);
          text = data?.text ?? '';
        } catch (e) {
          console.warn('[Knowledge upload] PDF parse failed:', (e as Error).message);
          text = `[PDF: ${file.originalname} — text extraction failed.]`;
        }
      } else {
        text = file.buffer.toString('utf8');
      }
      const classified = await classifyKnowledgeDocument(file.originalname || 'document', text);
      const doc = {
        id: randomUUID(),
        title: classified.title,
        content: text,
        addedAt: new Date().toISOString(),
        category: classified.category,
        topic: classified.topic,
        documentDate,
      };
      existing.push(doc);
      added.push(doc);
    }

    await storage.updateSiteConfig(req.params.id, { knowledgeLibrary: existing } as any);
    res.json({ added: added.length, knowledgeLibrary: existing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/site-configs/:id/knowledge/search?q=...&limit=5
 * Searches the knowledge library by query; returns ranked results with snippets (category, topic, date indexed).
 */
router.get('/:id/knowledge/search', async (req, res) => {
  try {
    const site = await storage.getSiteConfigById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit), 10) || 5));
    const results = await storage.searchKnowledgeLibrary(req.params.id, q, limit);
    res.json({ results });
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
 * GET /api/site-configs/by-slug/:slug
 * Public endpoint — fetches a site config by its URL slug.
 * No auth required (used by PublicBusinessPage).
 */
router.get('/by-slug/:slug', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const config = await storage.getSiteConfigBySlug(req.params.slug);
    if (!config) return res.status(404).json({ error: 'Business not found.' });
    if (req.query.from === 'qr') {
      storage.recordSlugLanding(config.id, 'qr').catch((err) =>
        console.warn('[SiteConfig] Slug landing record failed:', err?.message ?? err)
      );
    }
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/site-configs/:id/share
 * Records a share event (platform + optional referrer UUID) and increments share_count.
 * Body: { platform: string, referrerUserId?: string }
 */
router.post('/:id/share', async (req, res) => {
  const shareSchema = z.object({
    platform: z.enum(['facebook', 'twitter', 'linkedin', 'whatsapp', 'sms', 'email', 'copy']),
    referrerUserId: z.string().optional(),
  });
  try {
    const parsed = shareSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const updated = await storage.recordShareEvent(
      req.params.id,
      parsed.data.platform,
      parsed.data.referrerUserId,
    );
    res.json({ success: true, shareCount: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/site-configs/:id/agents
 * Returns agents for this site (site_config_id). Used by Agent Dashboard when opened with ?siteConfigId=...
 */
router.get('/:id/agents', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    }
    const agents = await storage.getAgentsBySiteConfigId(id);
    res.json({ agents });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load agents for site.' });
  }
});

/**
 * GET /api/site-configs/:id/qr-stats
 * Returns QR scan stats for this site (routes with this site_config_id).
 * Used by owner dashboard QR widget.
 */
router.get('/:id/qr-stats', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    }
    const site = await storage.getSiteConfigById(id);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const stats = await storage.getQrScanStatsBySite(id);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load QR scan stats.' });
  }
});

/**
 * GET /api/site-configs/:id/conversation-events/summary
 * Cash Board: counts by event type for this site. Query: from, to (ISO dates).
 */
router.get('/:id/conversation-events/summary', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'frontdesk.session.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const summary = await storage.getConversationEventsSummary(id, { from, to });
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load conversation events summary.' });
  }
});

/**
 * GET /api/site-configs/:id/conversation-events
 * Cash Board: paginated conversation events for this site.
 * Query: page, limit, from (ISO date), to (ISO date), eventType.
 */
router.get('/:id/conversation-events', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'frontdesk.session.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : undefined;
    const { events, total } = await storage.getConversationEvents(id, { page, limit, from, to, eventType });
    res.json({ events, total });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load conversation events.' });
  }
});

/**
 * GET /api/site-configs/:id/frontdesk/sessions
 * Materialized front desk session projection derived from conversation events.
 * Query: includeResolved=true|false, limit=1..1000
 */
router.get('/:id/frontdesk/sessions', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'frontdesk.session.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const includeResolved =
      typeof req.query.includeResolved === 'string'
        ? req.query.includeResolved.toLowerCase() === 'true'
        : false;
    const limit = Math.min(1000, Math.max(1, parseInt(String(req.query.limit), 10) || 300));

    const projection = await storage.getFrontDeskSessions(id, {
      includeResolved,
      limit,
    });

    res.json({
      sessions: projection.sessions,
      total: projection.sessions.length,
      includeResolved,
      updatedAt: projection.updatedAt,
      projectionVersion: projection.projectionVersion,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load front desk sessions.' });
  }
});

/**
 * GET /api/site-configs/:id/intake-policy
 * Returns owner-selectable intake write policy matrix.
 */
router.get('/:id/intake-policy', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.policy.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const policy = resolveIntakePolicyConfig(access.context.siteConfig);
    res.json({ policy });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load intake policy.' });
  }
});

/**
 * PATCH /api/site-configs/:id/intake-policy
 * Updates owner-selectable intake write policy matrix.
 */
router.patch('/:id/intake-policy', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.policy.write',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const parsed = intakePolicySchema.safeParse(req.body?.policy ?? req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const existingAgentConfig =
      access.context.siteConfig && typeof (access.context.siteConfig as any).agentConfig === 'object'
        ? ((access.context.siteConfig as any).agentConfig as Record<string, unknown>)
        : {};

    const nextAgentConfig = {
      ...existingAgentConfig,
      intakePolicy: parsed.data,
    };

    const updated = await storage.updateSiteConfig(id, {
      agentConfig: nextAgentConfig as any,
    } as any);
    if (!updated) return res.status(404).json({ error: 'Site config not found' });

    const resolved = resolveIntakePolicyConfig(updated);
    res.json({ policy: resolved ?? DEFAULT_INTAKE_POLICY });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to update intake policy.' });
  }
});

/**
 * GET /api/site-configs/:id/verification-policy
 */
router.get('/:id/verification-policy', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'verification.policy.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const policy = resolveVerificationPolicyConfig(access.context.siteConfig);
    res.json({ policy });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load verification policy.' });
  }
});

/**
 * PATCH /api/site-configs/:id/verification-policy
 */
router.patch('/:id/verification-policy', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'verification.policy.write',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const parsed = verificationPolicySchema.safeParse(req.body?.policy ?? req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const existingAgentConfig =
      access.context.siteConfig && typeof (access.context.siteConfig as any).agentConfig === 'object'
        ? ((access.context.siteConfig as any).agentConfig as Record<string, unknown>)
        : {};

    const nextAgentConfig = {
      ...existingAgentConfig,
      verificationPolicy: parsed.data,
    };

    const updated = await storage.updateSiteConfig(id, { agentConfig: nextAgentConfig as any } as any);
    if (!updated) return res.status(404).json({ error: 'Site config not found' });

    const policy = resolveVerificationPolicyConfig(updated);
    res.json({ policy });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to update verification policy.' });
  }
});

/**
 * GET /api/site-configs/:id/intake/library?industry=chiropractic
 * Returns governed workflow modules for the selected industry intake pack.
 */
router.get('/:id/intake/library', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.policy.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const siteName = String((access.context.siteConfig as any)?.name ?? '').toLowerCase();
    const industry =
      (typeof req.query.industry === 'string' && req.query.industry) ||
      (siteName.includes('dental') || siteName.includes('dentist')
        ? 'dental'
        : siteName.includes('chiropractic')
        ? 'chiropractic'
        : 'chiropractic');
    const pack = getIntakeIndustryPack(industry);
    if (!pack) return res.status(404).json({ error: `No intake pack found for industry: ${industry}` });

    res.json({
      industryPackId: pack.industryPackId,
      industry: pack.industry,
      version: pack.version,
      modules: pack.modules.map((module) => ({
        workflowId: module.workflowId,
        title: module.title,
        description: module.description,
        secureFields: module.secureFields,
        reviewQueueFields: module.reviewQueueFields,
        requiredConsents: module.requiredConsents,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load intake template library.' });
  }
});

/**
 * GET /api/site-configs/:id/intake/library/:workflowId
 * Returns one full governed intake workflow module.
 */
router.get('/:id/intake/library/:workflowId', requireAuth, async (req: any, res) => {
  try {
    const { id, workflowId } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.policy.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const siteName = String((access.context.siteConfig as any)?.name ?? '').toLowerCase();
    const industry =
      (typeof req.query.industry === 'string' && req.query.industry) ||
      (siteName.includes('dental') || siteName.includes('dentist')
        ? 'dental'
        : siteName.includes('chiropractic')
        ? 'chiropractic'
        : 'chiropractic');
    const pack = getIntakeIndustryPack(industry);
    if (!pack) return res.status(404).json({ error: `No intake pack found for industry: ${industry}` });

    const module = pack.modules.find((entry) => entry.workflowId === workflowId);
    if (!module) return res.status(404).json({ error: `Workflow module not found: ${workflowId}` });

    res.json({
      industryPackId: pack.industryPackId,
      industry: pack.industry,
      version: pack.version,
      module,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load intake workflow module.' });
  }
});

/**
 * GET /api/site-configs/:id/intake/secure-form/:policyId
 * Returns governed secure form schema contract for a sensitive policy.
 */
router.get('/:id/intake/secure-form/:policyId', requireAuth, async (req: any, res) => {
  try {
    const { id, policyId } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.submit.write',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const policy = getSensitiveInputPolicyById(String(policyId));
    if (!policy) return res.status(404).json({ error: 'Sensitive input policy not found.' });

    return res.json({
      policyId: policy.policyId,
      fieldName: policy.fieldName,
      classification: policy.classification,
      allowedChannels: policy.allowedChannels,
      redactInTranscript: policy.redactInTranscript,
      storeMode: policy.storeMode,
      displayMode: policy.displayMode,
      fields: policy.secureFormFields,
      submitEndpoint: `/api/site-configs/${id}/intake/secure-submit`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? 'Failed to load secure form schema.' });
  }
});

/**
 * POST /api/site-configs/:id/intake/secure-submit
 * Secure intake channel for optional vendor relationships + consent-aware data handling.
 */
router.post('/:id/intake/secure-submit', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.submit.write',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const parsed = z
      .object({
        patientId: z.string().min(1),
        fieldName: z.string().min(1),
        policyId: z.string().optional(),
        sessionId: z.string().optional(),
        value: z.record(z.unknown()).or(z.string().min(1)),
        channel: z.enum(['secure_form', 'staff_assisted']).default('secure_form'),
        vendor: z
          .object({
            vendorType: z.enum(['INSURANCE', 'ATTORNEY', 'REFERRING_PROVIDER']),
            name: z.string().min(1),
            relationshipType: z.string().min(1),
          })
          .optional(),
        consent: z
          .object({
            consentType: z.string().min(1),
            signature: z.string().min(1),
            documentId: z.string().optional(),
            expirationDate: z.string().optional(),
          })
          .optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const sensitivePolicy = parsed.data.policyId
      ? getSensitiveInputPolicyById(parsed.data.policyId)
      : undefined;
    if (parsed.data.policyId && !sensitivePolicy) {
      return res.status(400).json({ error: 'Unknown secure-input policyId.' });
    }
    if (
      sensitivePolicy &&
      parsed.data.fieldName &&
      parsed.data.fieldName !== sensitivePolicy.fieldName
    ) {
      return res.status(400).json({
        error:
          'secure-submit rejected: fieldName does not match the governed field for provided policyId.',
      });
    }

    const intakePolicy = resolveIntakePolicyConfig(access.context.siteConfig);
    const writeMode = resolveFieldWriteMode(intakePolicy, parsed.data.fieldName);

    if (writeMode === 'denied') {
      return res.status(403).json({
        error: 'This intake field is denied for customer/staff write in this workflow.',
      });
    }

    let vendorId: string | undefined;
    if (parsed.data.vendor) {
      const normalizedKey = `${parsed.data.vendor.vendorType}:${parsed.data.vendor.name}`.toLowerCase().trim();
      const [existingVendor] = await db
        .select()
        .from(vendors)
        .where(
          and(eq(vendors.siteConfigId, id), eq(vendors.normalizedKey, normalizedKey))
        )
        .limit(1);
      const vendorRow =
        existingVendor ??
        (
          await db
            .insert(vendors)
            .values({
              siteConfigId: id,
              vendorType: parsed.data.vendor.vendorType,
              name: parsed.data.vendor.name,
              normalizedKey,
              metadata: {},
            })
            .returning()
        )[0];
      vendorId = vendorRow.id;
    }

    let consentId: string | undefined;
    if (parsed.data.consent) {
      const signatureHash = createHash('sha256').update(parsed.data.consent.signature).digest('hex');
      const [consent] = await db
        .insert(consentRecords)
        .values({
          siteConfigId: id,
          patientId: parsed.data.patientId,
          vendorId: vendorId ?? null,
          consentType: parsed.data.consent.consentType,
          signatureHash,
          documentId: parsed.data.consent.documentId ?? null,
          expirationDate: parsed.data.consent.expirationDate
            ? new Date(parsed.data.consent.expirationDate)
            : null,
          metadata: {
            collectedVia: parsed.data.channel,
          },
        })
        .returning();
      consentId = consent.id;
    }

    if (vendorId && parsed.data.vendor) {
      await db.insert(patientVendorRelationships).values({
        siteConfigId: id,
        patientId: parsed.data.patientId,
        vendorId,
        vendorType: parsed.data.vendor.vendorType,
        relationshipType: parsed.data.vendor.relationshipType,
        consentGranted: Boolean(consentId),
        consentDocumentId: consentId ?? null,
      });
    }

    const requestedValue =
      typeof parsed.data.value === 'string'
        ? { maskedValue: '[SECURE_CAPTURED]', valueProvided: true }
        : {
            ...parsed.data.value,
            rawValueCaptured: '[SECURE_CAPTURED]',
          };

    const status = writeMode === 'direct' ? 'applied' : 'pending';
    const reviewerRole =
      intakePolicy.fields[parsed.data.fieldName]?.reviewerRole ??
      (writeMode === 'review' ? 'receptionist' : null);

    const [request] = await db
      .insert(intakeChangeRequests)
      .values({
        siteConfigId: id,
        patientId: parsed.data.patientId,
        fieldName: parsed.data.fieldName,
        requestedValue,
        writeMode,
        status,
        reviewerRole,
        reviewedBy: status === 'applied' ? access.context.adminUserId : null,
        reviewedAt: status === 'applied' ? new Date() : null,
      })
      .returning();

    const tokenizedResult = createHash('sha256')
      .update(`${id}:${parsed.data.patientId}:${parsed.data.fieldName}:${request.id}`)
      .digest('hex')
      .slice(0, 24);

    const statusState: Record<string, unknown> = {
      rawValueStoredInConversation: false,
      secureInputCompleted: true,
    };
    if (
      parsed.data.fieldName.toLowerCase().includes('ssn') ||
      parsed.data.fieldName.toLowerCase().includes('identity')
    ) {
      statusState.identityVerified = true;
    }
    if (parsed.data.vendor?.vendorType === 'INSURANCE') statusState.insuranceCaptured = true;
    if (parsed.data.vendor?.vendorType === 'ATTORNEY') statusState.attorneyCaptured = true;
    if (consentId) statusState.consentSigned = true;

    await storage.logConversationEvent({
      siteConfigId: id,
      sessionId: parsed.data.sessionId ?? null,
      eventType: 'intake.secure_submission',
      metadata: {
        fieldName: parsed.data.fieldName,
        writeMode,
        status,
        patientId: parsed.data.patientId,
        policyId: sensitivePolicy?.policyId ?? null,
        vendorLinked: Boolean(vendorId),
        consentSigned: Boolean(consentId),
        tokenizedResult,
        ...statusState,
      },
    });

    await storage.logConversationEvent({
      siteConfigId: id,
      sessionId: parsed.data.sessionId ?? null,
      eventType: 'intake.secure_status_updated',
      metadata: {
        fieldName: parsed.data.fieldName,
        tokenizedResult,
        ...statusState,
      },
    });

    return res.json({
      success: true,
      writeMode,
      status,
      requestId: request.id,
      vendorId,
      consentId,
      tokenizedResult,
      resultState: {
        ...statusState,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? 'Failed to submit secure intake payload.' });
  }
});

/**
 * GET /api/site-configs/:id/intake/review-queue
 * Returns queued intake change requests pending human approval.
 */
router.get('/:id/intake/review-queue', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.review.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const requests = await db
      .select()
      .from(intakeChangeRequests)
      .where(and(eq(intakeChangeRequests.siteConfigId, id), eq(intakeChangeRequests.status, 'pending')))
      .orderBy(desc(intakeChangeRequests.createdAt))
      .limit(200);

    res.json({ requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load intake review queue.' });
  }
});

/**
 * PATCH /api/site-configs/:id/intake/review-queue/:requestId
 * Approve or reject queued intake requests.
 */
router.patch('/:id/intake/review-queue/:requestId', requireAuth, async (req: any, res) => {
  try {
    const { id, requestId } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.review.write',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const parsed = z
      .object({
        decision: z.enum(['approved', 'rejected']),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [updated] = await db
      .update(intakeChangeRequests)
      .set({
        status: parsed.data.decision,
        reviewedBy: access.context.adminUserId,
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(intakeChangeRequests.id, requestId),
          eq(intakeChangeRequests.siteConfigId, id)
        )
      )
      .returning();

    if (!updated) return res.status(404).json({ error: 'Intake change request not found.' });

    await storage.logConversationEvent({
      siteConfigId: id,
      sessionId: null,
      eventType: 'intake.review_decision',
      metadata: {
        requestId,
        decision: parsed.data.decision,
        reviewedBy: access.context.adminUserId,
        fieldName: updated.fieldName,
      },
    });

    res.json({ request: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to review intake request.' });
  }
});

/**
 * POST /api/site-configs/:id/intake/module-status
 * Emits a session-safe intake module status signal for front desk projection visibility.
 */
router.post('/:id/intake/module-status', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'intake.submit.write',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const parsed = z
      .object({
        sessionId: z.string().min(1),
        workflowId: z.string().min(1),
        statusKey: z.string().min(1),
        statusValue: z.boolean(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    await storage.logConversationEvent({
      siteConfigId: id,
      sessionId: parsed.data.sessionId,
      eventType: 'intake.module_status',
      metadata: {
        workflowId: parsed.data.workflowId,
        statusKey: parsed.data.statusKey,
        statusValue: parsed.data.statusValue,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to emit intake module status.' });
  }
});

/**
 * POST /api/site-configs/:id/verification/status
 * Emits state-safe verification transitions for front desk projection.
 */
router.post('/:id/verification/status', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'verification.write',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const parsed = z
      .object({
        sessionId: z.string().min(1),
        verificationState: z.enum([
          'required',
          'otp_sent',
          'verified',
          'failed',
          'bypass_allowed',
        ]),
        source: z.enum(['ai', 'operator', 'system']).default('operator'),
        checkpoints: z
          .object({
            idDocumentVerified: z.boolean().optional(),
            selfiePhotoMatchVerified: z.boolean().optional(),
            insuranceCardVerified: z.boolean().optional(),
          })
          .optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const eventType = `verification.${parsed.data.verificationState}`;
    await storage.logConversationEvent({
      siteConfigId: id,
      sessionId: parsed.data.sessionId,
      eventType,
      metadata: {
        verificationState: parsed.data.verificationState,
        source: parsed.data.source,
        actorRole: access.context.actorRole,
        ...(parsed.data.checkpoints ?? {}),
      },
    });

    res.json({ success: true, eventType });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to emit verification status.' });
  }
});

/**
 * POST /api/site-configs/:id/telephony/activate
 * Links the existing Twilio number to this paid site and marks provisionedPhoneNumber.
 */
router.post('/:id/telephony/activate', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'telephony.paid_activation.write',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const plan = String((access.context.siteConfig as any)?.plan ?? 'free').toLowerCase();
    if (plan === 'free') {
      return res.status(403).json({
        error: 'Phone activation requires a paid subscription plan.',
      });
    }

    const telephonyConfig = await storage.getTelephonyConfig();
    if (!telephonyConfig?.phoneNumber) {
      return res.status(409).json({
        error: 'No provisioned Twilio number found. Provision a number in Telephony first.',
      });
    }

    await storage.updateTelephonyConfig(telephonyConfig.id, {
      siteConfigId: id,
    } as any);
    const updatedSite = await storage.updateSiteConfig(id, {
      provisionedPhoneNumber: telephonyConfig.phoneNumber,
    } as any);
    if (!updatedSite) return res.status(404).json({ error: 'Site config not found' });

    await storage.logConversationEvent({
      siteConfigId: id,
      sessionId: null,
      eventType: 'telephony.number_assigned',
      metadata: {
        phoneAssigned: true,
        phoneNumberMasked: `${telephonyConfig.phoneNumber.slice(0, 2)}***${telephonyConfig.phoneNumber.slice(-2)}`,
        actorRole: access.context.actorRole,
      },
    });

    res.json({
      success: true,
      phoneNumber: telephonyConfig.phoneNumber,
      siteConfigId: id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to activate site telephony.' });
  }
});

/**
 * POST /api/site-configs/:id/outcomes/event
 * Persists normalized outcome ledger events emitted by governed front desk actions.
 */
router.post('/:id/outcomes/event', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });

    const parsed = frontDeskOutcomeEventRequestSchema.safeParse(req.body);

    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const existingSessionSiteConfigId = await storage.getSessionEventSiteConfigId(parsed.data.sessionId);
    if (existingSessionSiteConfigId && existingSessionSiteConfigId !== id) {
      return res.status(409).json({
        error: 'Session ownership mismatch: sessionId belongs to a different site scope.',
      });
    }
    const requiredPolicy = OUTCOME_EVENT_POLICIES[parsed.data.eventType];
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy,
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const incomingMetadata = parsed.data.metadata ?? {};
    const normalizedMetadata: Record<string, unknown> = {
      recordedAt: new Date().toISOString(),
      recordedBy: access.context.adminUserId,
      accessClass: access.context.accessClass,
      actorRole: access.context.actorRole,
      requiredPolicy,
    };
    if (parsed.data.eventType === 'frontdesk.outcome_captured') {
      const outcomeType = String(incomingMetadata.outcomeType ?? 'resolved_no_action');
      normalizedMetadata.outcomeType = outcomeType;
      if (incomingMetadata.resolvedAt) normalizedMetadata.resolvedAt = incomingMetadata.resolvedAt;
      if (incomingMetadata.resolvedBy) normalizedMetadata.resolvedBy = incomingMetadata.resolvedBy;
    }

    await storage.logConversationEvent({
      siteConfigId: id,
      sessionId: parsed.data.sessionId,
      eventType: parsed.data.eventType,
      metadata: normalizedMetadata,
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to persist outcome event.' });
  }
});

/**
 * GET /api/site-configs/:id/outcomes/summary
 * Durable outcomes summary from persisted ledger events.
 * Query: range=today | from=ISO | to=ISO
 */
router.get('/:id/outcomes/summary', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: 'frontdesk.summary.read',
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const range = typeof req.query.range === 'string' ? req.query.range : undefined;
    let from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if (range === 'today' && !from) {
      from = new Date();
      from.setHours(0, 0, 0, 0);
    }

    const summary = await storage.getOutcomeSummary(id, { from, to });
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to load outcomes summary.' });
  }
});

/**
 * POST /api/site-configs/admin/ensure-joint-site
 * Temporary admin route to ensure "The Joint Chiropractic" site exists.
 */
router.post('/admin/ensure-joint-site', async (_req, res) => {
  try {
    console.log("Checking for 'The Joint Chiropractic' site config...");
    const slug = "the-joint-chiropractic";
    const existingSite = await db.query.siteConfigs.findFirst({
      where: eq(siteConfigs.domain, slug),
    });

    if (existingSite) {
      console.log(`Site found: ${existingSite.name} (${existingSite.id})`);
      if (!existingSite.ownerId) {
        console.log("Site has no owner. Assigning default owner...");
        const defaultUser = await db.query.users.findFirst();
        if (defaultUser) {
          await db.update(siteConfigs)
            .set({ ownerId: defaultUser.id })
            .where(eq(siteConfigs.id, existingSite.id));
          console.log(`Assigned owner: ${defaultUser.username} (${defaultUser.id})`);
        }
      }
      return res.json({ success: true, message: "Site already exists", siteId: existingSite.id });
    }

    console.log("Site not found. Creating...");
    let ownerId = null;
    const defaultUser = await db.query.users.findFirst();
    if (defaultUser) ownerId = defaultUser.id;

    const newSiteId = "4e1f25ba-09f0-4a69-9914-ec29b073fb75";

    await db.insert(siteConfigs).values({
      id: newSiteId,
      name: "The Joint Chiropractic",
      domain: slug,
      ownerId: ownerId,
      chatbotEnabled: true,
      voiceConciergeEnabled: true,
      modelProvider: "gemini",
      greetingMessage: "Welcome to The Joint Chiropractic. How can I help you today?",
      placeholderText: "Ask about our wellness plans...",
      voiceConfig: {
        provider: "gemini",
        voiceName: "Puck",
        mode: "clear_voice",
        analysis: {
          detectEmotion: true,
          detectSentiment: true,
          detectDISC: true
        }
      },
      agentConfig: {
        name: "The Joint Receptionist",
        role: "Front Desk Receptionist",
        basePrompt: "You are the receptionist for The Joint Chiropractic. You help patients check in, verify their identity, and manage appointments.",
        objectives: ["Verify patient identity", "Check in patients", "Answer questions about plans"],
        constraints: ["Be polite and professional", "Verify identity before sharing account details"]
      },
      placeData: {
        name: "The Joint Chiropractic",
        formatted_address: "123 Wellness Way, Health City, CA 90210",
        formatted_phone_number: "(555) 123-4567",
        opening_hours: {
          weekday_text: [
            "Monday: 10:00 AM – 7:00 PM",
            "Tuesday: 10:00 AM – 7:00 PM",
            "Wednesday: 10:00 AM – 7:00 PM",
            "Thursday: 10:00 AM – 7:00 PM",
            "Friday: 10:00 AM – 7:00 PM",
            "Saturday: 10:00 AM – 4:00 PM",
            "Sunday: Closed"
          ]
        },
        types: ["chiropractor", "health", "point_of_interest"]
      }
    });

    // Create the agent as well
    await db.insert(agents).values({
      id: randomUUID(),
      siteConfigId: newSiteId,
      name: "The Joint Receptionist",
      roleType: "receptionist",
      voiceId: "Puck",
      voiceName: "Puck",
      isActive: true,
      systemPrompt: "You are the receptionist for The Joint Chiropractic.",
      operationalMode: "RECEPTIONIST",
      structuredControls: {
        allowed_tools: ["kiosk_onboarding", "check_appointment"],
        escalation_path: "manager",
        refusal_behavior: "polite_decline"
      }
    });

    res.json({ success: true, message: "Site created", siteId: newSiteId });
  } catch (error: any) {
    console.error("Error creating site:", error);
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

  // Platform landing page — no DB record needed, return default Gateway Global AI config
  if (id === 'platform_landing' || id === 'platform-landing' || id === 'platform') {
    return res.status(200).json({
      id,
      name: 'Gateway Global AI',
      placeId: null,
      agentId: null,
      chatbotEnabled: true,
      widgetPosition: 'bottom-right',
      primaryColor: '#6366f1',
      systemPromptOverride: null,
      knowledgeLibrary: null,
      voiceConfig: null,
      agentConfig: {
        name: 'Gateway AI',
        role: 'AI Business Assistant',
        personality: 'Helpful, professional, and enthusiastic about AI-powered business solutions.',
        discProfile: 'I:75 S:65 D:50 C:60',
        objectives: ['Help visitors understand the platform', 'Answer questions about features and pricing', 'Demo Clear Voice technology'],
        constraints: ['Focus on Gateway Global AI platform topics'],
      },
      heroImageUrl: null,
      domain: null,
    });
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

/**
 * PATCH /api/site-configs/:id/task-order
 * Save the ordered interaction task list for a site config.
 * Body: { tasks: [{ id, label, description?, required }] }
 */
router.patch('/:id/task-order', async (req: any, res: Response) => {
  const { id } = req.params;
  const { tasks } = req.body;

  if (!id) return res.status(400).json({ error: 'Site config id required' });
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be an array' });

  try {
    const site = await storage.getSiteConfigById(id);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const updated = await storage.updateSiteConfig(id, { taskOrder: tasks } as any);
    res.json({ taskOrder: (updated as any).taskOrder ?? tasks });
  } catch (error: any) {
    console.error('[SiteConfigRoutes] task-order patch error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to update task order' });
  }
});

// ---------------------------------------------------------------------------
// Brand Governance Routes
// See: docs-governance/BRAND_IDENTITY_SPEC.md
// ---------------------------------------------------------------------------

/**
 * Compute preflight completeness from a site config record.
 */
function computePreflightComplete(site: any): boolean {
  const brand = site.brand_governance ?? (site as any).brandGovernance ?? {};
  const funnels: any[] = site.sales_funnels ?? (site as any).salesFunnels ?? [];
  const score = Number(brand.completionScore ?? 0);
  const approved = brand.ownerApproved === true;
  const hasRoute = funnels.length > 0 &&
    funnels[0].fallbackRoutes &&
    (funnels[0].fallbackRoutes.website || funnels[0].fallbackRoutes.booking);
  return score >= 80 && approved && hasRoute;
}

/**
 * GET /api/site-configs/:id/brand
 * Returns brand_governance + sales completion metadata.
 */
router.get('/:id/brand', async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const site = await storage.getSiteConfigById(id);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const brand = (site as any).brand_governance ?? {};
    const preflightComplete = computePreflightComplete(site);
    res.json({ brand_governance: brand, preflightComplete });
  } catch (error: any) {
    console.error('[SiteConfigRoutes] GET brand error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to fetch brand governance' });
  }
});

/**
 * PATCH /api/site-configs/:id/brand
 * Merge-update brand_governance. Recomputes completionScore.
 * Body: Partial<BrandGovernance>
 */
router.patch('/:id/brand', async (req: any, res: Response) => {
  const { id } = req.params;
  const updates = req.body ?? {};

  try {
    const site = await storage.getSiteConfigById(id);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const existing = (site as any).brand_governance ?? {};
    const merged = { ...existing, ...updates };

    // Recompute completion score
    const stringFields = [
      'brandName', 'brandSlogan', 'brandLogoUrl', 'primaryColor', 'accentColor',
      'claim', 'differentiator', 'irresistibleOffer', 'targetMarket'
    ];
    const toggleFields = ['freeTrial', 'guarantee'];
    const arrayFields = ['channelPartners', 'coreProducts', 'productUpsells', 'coreServices', 'serviceUpsells'];

    let filled = 0;
    for (const f of stringFields) {
      if (merged[f] && typeof merged[f] === 'string' && merged[f].trim().length > 2) filled++;
    }
    for (const f of toggleFields) {
      if (merged[f]?.defined === true && merged[f]?.description?.length > 5) filled++;
    }
    for (const f of arrayFields) {
      if (Array.isArray(merged[f]) && merged[f].length > 0) filled++;
    }
    merged.completionScore = Math.round((filled / 15) * 100);

    // If owner is approving, set timestamp
    if (updates.ownerApproved === true && !existing.approvedAt) {
      merged.approvedAt = new Date().toISOString();
    }

    await storage.updateSiteConfig(id, { brand_governance: merged } as any);
    const preflightComplete = computePreflightComplete({ ...site, brand_governance: merged });
    res.json({ brand_governance: merged, preflightComplete });
  } catch (error: any) {
    console.error('[SiteConfigRoutes] PATCH brand error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to update brand governance' });
  }
});

/**
 * POST /api/site-configs/:id/brand/generate
 * Auto-populate brand_governance from placeData already on the site config.
 * No external calls — uses ingested data only.
 */
router.post('/:id/brand/generate', async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const site = await storage.getSiteConfigById(id);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const place = (site as any).placeData ?? {};
    const existing = (site as any).brand_governance ?? {};

    const populated: Record<string, any> = { ...existing };

    // Auto-map from placeData
    if (!populated.brandName && place.name) populated.brandName = place.name;
    if (!populated.brandLogoUrl && place.photos?.[0]?.photo_reference) {
      populated.brandLogoUrl = `/api/place-photo?ref=${place.photos[0].photo_reference}`;
    }
    if (!populated.coreServices?.length && place.types?.length) {
      populated.coreServices = place.types
        .filter((t: string) => !['point_of_interest', 'establishment'].includes(t))
        .map((t: string) => t.replace(/_/g, ' '));
    }
    if (!populated.targetMarket && place.editorial_summary?.overview) {
      populated.targetMarket = `Customers looking for: ${place.editorial_summary.overview}`;
    }
    // Extract claim from top review themes if available
    if (!populated.claim && place.reviews?.length) {
      const topReview = place.reviews[0]?.text ?? '';
      if (topReview.length > 20) {
        populated.claim = topReview.substring(0, 120).trim();
      }
    }
    if (!populated.coreProducts?.length && place.menus) {
      populated.coreProducts = [];
    }

    // Recompute score via the PATCH endpoint logic (inline here)
    const stringFields = [
      'brandName', 'brandSlogan', 'brandLogoUrl', 'primaryColor', 'accentColor',
      'claim', 'differentiator', 'irresistibleOffer', 'targetMarket'
    ];
    const toggleFields = ['freeTrial', 'guarantee'];
    const arrayFields = ['channelPartners', 'coreProducts', 'productUpsells', 'coreServices', 'serviceUpsells'];
    let filled = 0;
    for (const f of stringFields) {
      if (populated[f] && typeof populated[f] === 'string' && populated[f].trim().length > 2) filled++;
    }
    for (const f of toggleFields) {
      if (populated[f]?.defined === true && populated[f]?.description?.length > 5) filled++;
    }
    for (const f of arrayFields) {
      if (Array.isArray(populated[f]) && populated[f].length > 0) filled++;
    }
    populated.completionScore = Math.round((filled / 15) * 100);
    populated.lastAutoPopulatedAt = new Date().toISOString();

    await storage.updateSiteConfig(id, { brand_governance: populated } as any);

    const gapFields = [
      ...stringFields.filter(f => !populated[f] || populated[f].trim().length <= 2),
      ...toggleFields.filter(f => !populated[f]?.defined),
      ...arrayFields.filter(f => !populated[f]?.length)
    ];

    res.json({
      brand_governance: populated,
      gapFields,
      filledCount: filled,
      completionScore: populated.completionScore
    });
  } catch (error: any) {
    console.error('[SiteConfigRoutes] brand/generate error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to auto-populate brand' });
  }
});

/**
 * POST /api/site-configs/:id/brand/deep-research-prompt
 * Generate a structured ChatGPT deep-research meta-prompt.
 * Requires paid plan (voicePlanActive or plan !== 'free').
 */
router.post('/:id/brand/deep-research-prompt', async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const site = await storage.getSiteConfigById(id);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    // Paid plan gate
    if ((site as any).plan === 'free' && !(site as any).voicePlanActive) {
      return res.status(403).json({
        error: 'Deep research prompt generation requires a paid plan.',
        upgradeRequired: true
      });
    }

    const brand = (site as any).brand_governance ?? {};
    const place = (site as any).placeData ?? {};
    const services = (brand.coreServices ?? []).join(', ') || 'Not specified';
    const address = place.formatted_address ?? place.vicinity ?? 'Not specified';

    const prompt = `You are a senior brand strategist. Conduct a comprehensive research analysis for the following business.

Business Name: ${brand.brandName || site.name}
Location: ${address}
Industry / Services: ${services}
Current Brand Claim: ${brand.claim || 'Not yet defined'}
Current Irresistible Offer: ${brand.irresistibleOffer || 'Not yet defined'}
Target Market (owner description): ${brand.targetMarket || 'Not yet defined'}

Please research and provide the following:

1. SWOT Analysis
   - Strengths (what the business likely does well based on reviews and market position)
   - Weaknesses (common gaps in this industry)
   - Opportunities (market trends, underserved segments)
   - Threats (competitive landscape, market risks)

2. Competitive Landscape
   - Top 3 direct competitors in the same market
   - Their positioning and key differentiators
   - Where this business has a clear advantage

3. Ideal Customer Profile (ICP)
   - Demographics (age range, income, geography)
   - Psychographics (values, pain points, motivations)
   - Buying triggers (what causes them to search for this service)

4. Messaging Recommendations
   - 3 messaging angles ranked by estimated conversion potential
   - Suggested headline for each angle

5. Irresistible Offer Improvements
   - Critique of current offer
   - 2-3 alternative offer structures with higher conversion potential

6. Guarantee Structure
   - Recommended guarantee type for this industry
   - Example guarantee language

7. Channel Partner Recommendations
   - 3-5 categories of referral partners relevant to this business

Output Format: Return as structured JSON matching this schema exactly:
{
  "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
  "competitors": [{ "name": "", "positioning": "", "ourAdvantage": "" }],
  "icp": { "demographics": "", "psychographics": "", "buyingTriggers": "" },
  "messagingAngles": [{ "angle": "", "headline": "", "conversionRank": 1 }],
  "offerImprovements": [{ "structure": "", "rationale": "" }],
  "guaranteeRecommendation": { "type": "", "exampleLanguage": "" },
  "channelPartners": []
}`;

    // Mark that the prompt was generated
    const updatedBrand = { ...brand, deepResearchPromptGenerated: true };
    await storage.updateSiteConfig(id, { brand_governance: updatedBrand } as any);

    res.json({ prompt, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('[SiteConfigRoutes] deep-research-prompt error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to generate deep research prompt' });
  }
});

/**
 * GET /api/site-configs/:id/funnels
 * Returns the sales_funnels array.
 */
router.get('/:id/funnels', async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const site = await storage.getSiteConfigById(id);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json({ sales_funnels: (site as any).sales_funnels ?? [] });
  } catch (error: any) {
    console.error('[SiteConfigRoutes] GET funnels error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to fetch funnels' });
  }
});

/**
 * PATCH /api/site-configs/:id/funnels
 * Upsert sales_funnels array. Replaces entire array.
 * Body: { funnels: SalesFunnel[] }
 */
router.patch('/:id/funnels', async (req: any, res: Response) => {
  const { id } = req.params;
  const { funnels } = req.body;

  if (!Array.isArray(funnels)) return res.status(400).json({ error: 'funnels must be an array' });

  try {
    const site = await storage.getSiteConfigById(id);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    await storage.updateSiteConfig(id, { sales_funnels: funnels } as any);
    res.json({ sales_funnels: funnels });
  } catch (error: any) {
    console.error('[SiteConfigRoutes] PATCH funnels error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to update funnels' });
  }
});

/**
 * POST /api/site-configs/:id/generate-hero-image
 *
 * Generates a hero image for a site using Imagen 3, saves it as a WebP file,
 * and updates heroImageUrl on the site config. Idempotent unless ?force=true.
 *
 * If the site already has a heroImageUrl (e.g. Google Places photo proxy),
 * returns it immediately. Pass { force: true } in the body to regenerate.
 */
router.post('/:id/generate-hero-image', async (req: any, res: any) => {
  try {
    const site = await storage.getSiteConfigById(req.params.id) as any;
    if (!site) return res.status(404).json({ error: 'Site not found' });

    // Idempotent: return existing url unless force is requested
    if (site.heroImageUrl && !req.body?.force) {
      return res.json({ heroImageUrl: site.heroImageUrl, generated: false });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    const place = site.placeData ?? {};
    const name: string = place.name ?? site.name ?? 'Business';
    const types: string = (place.types ?? []).slice(0, 3).join(', ');
    const address: string = place.formatted_address ?? place.vicinity ?? '';
    const editorialSummary: string = place.editorial_summary?.overview ?? place.editorial_summary ?? '';

    const prompt: string = site.heroImagePrompt ?? `
Photorealistic hero image for a business called "${name}".
Business type: ${types || 'local business'}.
${address ? `Located in ${address}.` : ''}
${editorialSummary ? `Description: ${editorialSummary}` : ''}
Style: Wide-format exterior or interior shot, professional photography, warm inviting atmosphere,
high quality, natural light, no text, no logos, 16:9 aspect ratio.
    `.trim();

    const imagenRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '16:9', outputMimeType: 'image/png' },
        }),
      }
    );

    if (!imagenRes.ok) {
      const errText = await imagenRes.text();
      console.error('[generate-hero-image] Imagen 3 error:', errText);
      return res.status(502).json({ error: 'Imagen 3 generation failed', detail: errText });
    }

    const imagenData = await imagenRes.json() as any;
    const base64Image: string | undefined = imagenData?.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) {
      return res.status(502).json({ error: 'No image returned from Imagen 3' });
    }

    // Optimize and save as WebP
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const optimized = await sharp(imageBuffer)
      .resize(1200, 675, { fit: 'cover', position: 'center' })
      .webp({ quality: 82 })
      .toBuffer();

    const uploadDir = path.join(process.cwd(), 'server', 'uploads', 'heroes');
    fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `${req.params.id}.webp`;
    fs.writeFileSync(path.join(uploadDir, filename), optimized);

    const heroImageUrl = `/uploads/heroes/${filename}`;
    await storage.updateSiteConfig(req.params.id, { heroImageUrl, heroImagePrompt: prompt } as any);

    res.json({ heroImageUrl, generated: true });
  } catch (error: any) {
    console.error('[generate-hero-image] Error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to generate hero image' });
  }
});

/**
 * POST /api/site-configs/:id/go-live
 * Enforces 5 preflight conditions before transitioning workspaceState to 'live'.
 */
router.post('/:id/go-live', requireAuth, async (req: any, res) => {
  try {
    const config = await storage.getSiteConfig(req.params.id);
    if (!config) return res.status(404).json({ error: 'Site config not found' });

    const agents = await storage.getAgentsBySiteConfigId(req.params.id);
    const activeAgent = agents.find((a: any) => a.isActive);
    const assignedAgent = config.assignedAgentId
      ? agents.find((a: any) => a.id === config.assignedAgentId)
      : null;

    const preflight = {
      hasActiveAgent:       !!activeAgent,
      hasAssignedAgent:     !!config.assignedAgentId,
      hasBusinessIdentity:  !!(config.name && config.businessType),
      hasSystemPrompt:      !!(assignedAgent?.systemPrompt && assignedAgent.systemPrompt.trim().length > 0),
      hasSafeMode:          assignedAgent?.safeMode != null,
    };

    const failures = Object.entries(preflight)
      .filter(([, passed]) => !passed)
      .map(([key]) => key);

    if (failures.length > 0) {
      return res.status(422).json({
        error: 'Preflight checks failed. Complete all requirements before going live.',
        failures,
        preflight,
      });
    }

    const updated = await storage.updateSiteConfig(req.params.id, { workspaceState: 'live' });
    res.json({ success: true, workspaceState: 'live', config: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

