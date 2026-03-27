/**
 * Storefront routes: industry landing pages, reports, images, demo creation.
 * Mount at /api/storefronts
 */
import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { storefrontCategories, storefrontReports, storefrontCategoryImages, storefrontDemoClaims } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateIndustryReport } from '../services/storefrontReportService.js';
import { generateCategoryImages, getCategoryImageUrls } from '../services/storefrontImageService.js';
import { storage } from '../storage.js';
import { runAgentSwarmProvisionOrchestrated } from '../services/agentOrchestration.js';
import { getPlaceDetails } from '../tools/placesHandler.js';

function paramString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

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

function getBaseUrl(req: Request): string {
  return process.env.APP_URL || (req.protocol && req.get('host') ? `${req.protocol}://${req.get('host')}` : 'https://aibizbot-dev.gatewayglobal.ai');
}

const router = Router();

/** GET /api/storefronts — list all categories */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await db.select().from(storefrontCategories);
    res.json(categories.map((c) => ({ slug: c.slug, displayName: c.displayName, location: c.location })));
  } catch (e: unknown) {
    console.error('[Storefronts] list error:', (e as Error)?.message);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

/** GET /api/storefronts/place-details/:placeId — fetch place details (phone, website) for demo (define before :categorySlug) */
router.get('/place-details/:placeId', async (req: Request, res: Response) => {
  try {
    const raw = paramString(req.params.placeId);
    const placeId = raw?.replace(/^places\//i, '') || raw;
    if (!placeId) return res.status(400).json({ error: 'placeId required' });
    const details = await getPlaceDetails(placeId);
    res.json(details);
  } catch (e: unknown) {
    console.error('[Storefronts] place-details error:', (e as Error)?.message);
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

/** POST /api/storefronts/demo/claim — send OTP / link to phone, then verify and associate demo (define before :categorySlug) */
router.post('/demo/claim', async (req: Request, res: Response) => {
  try {
    const { phone, siteConfigId, code } = req.body as { phone?: string; siteConfigId?: string; code?: string };
    if (!phone || !siteConfigId) return res.status(400).json({ error: 'phone and siteConfigId required' });

    const site = await storage.getSiteConfigById(siteConfigId);
    if (!site) return res.status(404).json({ error: 'Demo not found' });

    if (!code) {
      const normalized = phone.replace(/\D/g, '');
      if (normalized.length < 10) return res.status(400).json({ error: 'Invalid phone number' });
      const [existing] = await db.select().from(storefrontDemoClaims).where(eq(storefrontDemoClaims.siteConfigId, siteConfigId)).limit(1);
      if (existing) {
        await db.update(storefrontDemoClaims).set({ phone: normalized, verifiedAt: null }).where(eq(storefrontDemoClaims.id, existing.id));
      } else {
        await db.insert(storefrontDemoClaims).values({ phone: normalized, siteConfigId });
      }
      res.json({ success: true, message: 'Verification code sent (stub — implement OTP)' });
      return;
    }

    const [claim] = await db.select().from(storefrontDemoClaims).where(eq(storefrontDemoClaims.siteConfigId, siteConfigId)).limit(1);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    await db.update(storefrontDemoClaims).set({ verifiedAt: new Date() }).where(eq(storefrontDemoClaims.id, claim.id));
    const baseUrl = getBaseUrl(req);
    res.json({ success: true, publicUrl: `${baseUrl}/biz/${site.slug}`, slug: site.slug });
  } catch (e: unknown) {
    console.error('[Storefronts] claim error:', (e as Error)?.message);
    res.status(500).json({ error: 'Claim failed' });
  }
});

/** PATCH /api/storefronts/demo/:siteConfigId — update static routes for a demo (define before :categorySlug) */
router.patch('/demo/:siteConfigId', async (req: Request, res: Response) => {
  try {
    const siteConfigId = paramString(req.params.siteConfigId);
    if (!siteConfigId) return res.status(400).json({ error: 'siteConfigId required' });
    const { staticRoutes } = req.body as { staticRoutes?: Record<string, { enabled: boolean; value?: string }> };
    if (!staticRoutes) return res.status(400).json({ error: 'staticRoutes required' });
    const updated = await storage.updateSiteConfig(siteConfigId, { staticRoutes } as any);
    if (!updated) return res.status(404).json({ error: 'Site not found' });
    res.json(updated);
  } catch (e: unknown) {
    console.error('[Storefronts] demo patch error:', (e as Error)?.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

/** GET /api/storefronts/:categorySlug — category config + report + image URLs */
router.get('/:categorySlug', async (req: Request, res: Response) => {
  try {
    const categorySlug = paramString(req.params.categorySlug);
    if (!categorySlug) return res.status(400).json({ error: 'categorySlug required' });
    const [cat] = await db.select().from(storefrontCategories).where(eq(storefrontCategories.slug, categorySlug)).limit(1);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const [reportRow] = await db.select().from(storefrontReports).where(eq(storefrontReports.categorySlug, categorySlug)).limit(1);
    const images = await getCategoryImageUrls(categorySlug);

    res.json({
      slug: cat.slug,
      displayName: cat.displayName,
      location: cat.location,
      searchQuery: cat.searchQuery,
      industryGroup: cat.industryGroup,
      report: reportRow
        ? {
            summary: reportRow.summary,
            whatsWorking: reportRow.whatsWorking ?? [],
            whatsNotWorking: reportRow.whatsNotWorking ?? [],
          }
        : null,
      imageUrls: images,
      heroImageUrl: cat.heroImageUrl ?? null,
    });
  } catch (e: unknown) {
    console.error('[Storefronts] get category error:', (e as Error)?.message);
    res.status(500).json({ error: 'Failed to load category' });
  }
});

/** POST /api/storefronts/:categorySlug/report — generate or refresh industry report */
router.post('/:categorySlug/report', async (req: Request, res: Response) => {
  try {
    const categorySlug = paramString(req.params.categorySlug);
    if (!categorySlug) return res.status(400).json({ error: 'categorySlug required' });
    const report = await generateIndustryReport(categorySlug);
    res.json(report);
  } catch (e: unknown) {
    console.error('[Storefronts] report error:', (e as Error)?.message);
    res.status(500).json({ error: (e as Error)?.message ?? 'Report generation failed' });
  }
});

/** POST /api/storefronts/:categorySlug/generate-images — generate 5 Flux images for category */
router.post('/:categorySlug/generate-images', async (req: Request, res: Response) => {
  try {
    const categorySlug = paramString(req.params.categorySlug);
    if (!categorySlug) return res.status(400).json({ error: 'categorySlug required' });
    const urls = await generateCategoryImages(categorySlug);
    res.json({ imageUrls: urls });
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? '';
    if (msg.includes('not configured')) return res.status(503).json({ error: msg });
    console.error('[Storefronts] generate-images error:', msg);
    res.status(500).json({ error: msg || 'Image generation failed' });
  }
});

/** POST /api/storefronts/:categorySlug/demo — create or get demo (place data + static routes) */
router.post('/:categorySlug/demo', async (req: Request, res: Response) => {
  try {
    const categorySlug = paramString(req.params.categorySlug);
    if (!categorySlug) return res.status(400).json({ error: 'categorySlug required' });
    const body = req.body as {
      placeId?: string;
      name?: string;
      formattedAddress?: string;
      internationalPhoneNumber?: string;
      websiteUri?: string;
      placeData?: Record<string, unknown>;
      staticRoutes?: { call?: { enabled: boolean; value?: string }; text?: { enabled: boolean; value?: string }; email?: { enabled: boolean; value?: string }; website?: { enabled: boolean; value?: string } };
    };

    const [cat] = await db.select().from(storefrontCategories).where(eq(storefrontCategories.slug, categorySlug)).limit(1);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const placeTypes = cat.industryGroup === 'health_wellness' ? ['beauty_salon'] : ['establishment'];
    const name = body.name ?? 'Demo Business';
    const slug = generateSlug(name);

    const config = await storage.createSiteConfig({
      name,
      placeId: body.placeId ?? undefined,
      placeData: body.placeData ?? {
        formatted_address: body.formattedAddress,
        international_phone_number: body.internationalPhoneNumber,
        website_uri: body.websiteUri,
        types: placeTypes,
      },
      workspaceState: 'demo',
      slug,
      staticRoutes: body.staticRoutes ?? {
        call: { enabled: true, value: body.internationalPhoneNumber },
        text: { enabled: true, value: body.internationalPhoneNumber },
        email: { enabled: false, value: '' },
        website: { enabled: true, value: body.websiteUri },
      },
    } as any);

    try {
      await runAgentSwarmProvisionOrchestrated({
        siteConfigId: config.id,
        placeTypes,
        businessName: name,
        source: 'storefront_demo',
      });
    } catch (provisionErr: unknown) {
      console.warn('[Storefronts] Orchestrated provision failed (demo created):', (provisionErr as Error)?.message);
    }

    const baseUrl = getBaseUrl(req);
    const publicUrl = `${baseUrl}/biz/${config.slug}`;
    res.status(201).json({ siteConfigId: config.id, slug: config.slug, publicUrl });
  } catch (e: unknown) {
    console.error('[Storefronts] demo create error:', (e as Error)?.message);
    res.status(500).json({ error: (e as Error)?.message ?? 'Demo creation failed' });
  }
});

export default router;
