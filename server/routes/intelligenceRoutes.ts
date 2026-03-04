/**
 * Intelligence Routes — Business Data Ingestion Pipeline
 *
 * Mounted at /api/intelligence
 * POST /resolve  — resolve data_id or placeTypes (accepts query or placeId)
 * POST /ingest   — full autonomous pipeline: resolve → harvest → analyze → store
 * POST /provision — provision 6 agents for a site from industry templates
 * GET /status/:siteConfigId — intelligence brief status
 */

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage.js';
import {
  resolve_data_id,
  ingest_serpapi_reviews,
  compile_knowledge_base,
} from '../tools/dataIngestionHandler.js';
import { fetchSerpApiReviews, type SerpApiReview, type SerpApiTopic } from '../services/serpapi-reviews.js';
import { provisionAgentsForBusiness } from '../services/agentProvisioning.js';

const router = Router();

// ── POST /resolve ─────────────────────────────────────────────────────────────
// Accepts either query (text search) or placeId (Google Place ID). When placeId
// is provided, returns placeTypes for industry detection (e.g. for provision).

router.post('/resolve', async (req, res) => {
  const schema = z.object({
    query: z.string().min(2).max(200).optional(),
    placeId: z.string().min(1).max(200).optional(),
    ll: z.string().optional(),
    siteConfigId: z.string().optional(),
  }).refine(d => d.query || d.placeId, {
    message: 'Provide either query or placeId',
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.message });
  }

  // When placeId is provided, fetch place_info from SerpAPI and return placeTypes
  if (parsed.data.placeId) {
    try {
      const apiKey = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY ?? process.env.SERP_API_KEY;
      const result = await fetchSerpApiReviews(parsed.data.placeId, apiKey, { num: 1 });
      const placeTypes: string[] = [];
      if (result?.place_info?.type) {
        const t = result.place_info.type.toLowerCase().replace(/[éèê]/g, 'e').replace(/\s+/g, '_');
        placeTypes.push(t);
      }
      return res.json({
        success: true,
        placeTypes: placeTypes.length ? placeTypes : ['establishment'],
        data_id: parsed.data.placeId,
        business_name: result?.place_info?.title ?? '',
        address: result?.place_info?.address ?? '',
      });
    } catch (err: any) {
      console.error('[IntelligenceRoutes] resolve by placeId error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    const identity = await resolve_data_id(
      parsed.data.query!,
      parsed.data.ll,
      parsed.data.siteConfigId,
    );

    return res.json({
      success: true,
      data_id: identity.data_id,
      lat: identity.lat,
      lng: identity.lng,
      business_name: identity.business_name,
      address: identity.address,
    });
  } catch (err: any) {
    console.error('[IntelligenceRoutes] resolve error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /provision ───────────────────────────────────────────────────────────
// Provision 6 industry-specific agents for a site (Concierge, Booking, Lead Qualifier, etc.).

router.post('/provision', async (req, res) => {
  const schema = z.object({
    siteConfigId: z.string().min(1),
    placeTypes: z.array(z.string()).default(['establishment']),
    businessName: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.message });
  }

  try {
    const result = await provisionAgentsForBusiness(
      parsed.data.siteConfigId,
      parsed.data.placeTypes,
      parsed.data.businessName,
    );

    return res.json({
      success: true,
      agentsCreated: result.agentsCreated,
      agentIds: result.agentIds,
      industryGroup: result.industryGroup,
      archetypesProvisioned: result.archetypesProvisioned,
    });
  } catch (err: any) {
    console.error('[IntelligenceRoutes] provision error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /ingest ───────────────────────────────────────────────────────────────

router.post('/ingest', async (req, res) => {
  const schema = z.object({
    // Either provide data_id directly, or provide query + optional ll to resolve it
    data_id: z.string().optional(),
    query: z.string().optional(),
    ll: z.string().optional(),
    // Required business context
    business_name: z.string().min(1).max(200),
    site_config_id: z.string().min(1),
    // Harvest controls
    max_reviews: z.number().int().min(1).max(500).default(100),
    sort_by: z.enum(['qualityScore', 'newestFirst', 'ratingHigh', 'ratingLow']).default('qualityScore'),
  }).refine(d => d.data_id || d.query, {
    message: 'Provide either data_id or query to resolve the business',
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.message });
  }

  const startTime = Date.now();
  const { business_name, site_config_id, max_reviews, sort_by } = parsed.data;

  try {
    // Step 1: Resolve data_id if not provided
    let data_id = parsed.data.data_id;
    let resolved_identity = null;

    if (!data_id) {
      console.log(`[Intelligence] Resolving data_id for: "${parsed.data.query}"`);
      resolved_identity = await resolve_data_id(
        parsed.data.query!,
        parsed.data.ll,
        site_config_id,
      );
      data_id = resolved_identity.data_id;
    }

    // Step 2: Harvest reviews
    console.log(`[Intelligence] Harvesting up to ${max_reviews} reviews for data_id=${data_id}`);
    const ingestResult = await ingest_serpapi_reviews(
      data_id,
      max_reviews,
      sort_by,
      site_config_id,
    );

    if (ingestResult.review_count === 0) {
      return res.status(422).json({
        error: 'No reviews found for this business',
        data_id,
        business_name,
      });
    }

    // Step 3: Fetch full review data for analysis (use cached snapshot data)
    const apiKey = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY ?? process.env.SERP_API_KEY;
    const firstPage = await fetchSerpApiReviews(data_id, apiKey, { num: 20 });
    const reviews: SerpApiReview[] = firstPage?.reviews ?? [];
    const topics: SerpApiTopic[] = firstPage?.topics ?? [];

    // If more reviews were harvested, fetch additional pages for analysis
    let nextToken = firstPage?.next_page_token;
    while (reviews.length < Math.min(ingestResult.review_count, 100) && nextToken) {
      const page = await fetchSerpApiReviews(data_id, apiKey, { num: 20, next_page_token: nextToken });
      if (!page) break;
      reviews.push(...page.reviews);
      nextToken = page.next_page_token;
    }

    // Step 4: Compile knowledge base
    console.log(`[Intelligence] Compiling knowledge base from ${reviews.length} reviews`);
    const knowledgeResult = await compile_knowledge_base(
      reviews,
      topics,
      {
        title: business_name,
        rating: ingestResult.place_info.rating,
        total_reviews: ingestResult.place_info.total_reviews,
        type: ingestResult.place_info.type,
      },
      site_config_id,
    );

    const processingMs = Date.now() - startTime;

    return res.json({
      success: true,
      data_id,
      business_name,
      knowledge_entry_id: knowledgeResult.knowledge_entry_id,
      review_count: ingestResult.review_count,
      topics_extracted: knowledgeResult.topics_extracted,
      disc_recommendation: knowledgeResult.disc_recommendation,
      snapshot_id: ingestResult.snapshot_id,
      processing_time_ms: processingMs,
      markdown_preview: knowledgeResult.markdown_preview,
    });
  } catch (err: any) {
    console.error('[IntelligenceRoutes] ingest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /status/:siteConfigId ──────────────────────────────────────────────────

router.get('/status/:siteConfigId', async (req, res) => {
  try {
    const siteConfig = await storage.getSiteConfigById(req.params.siteConfigId);
    if (!siteConfig) return res.status(404).json({ error: 'Site config not found' });

    const library = (siteConfig.knowledgeLibrary as any[] | null) ?? [];
    const intelligenceBriefs = library.filter((e: any) => e.title?.includes('Review Intelligence Brief'));

    return res.json({
      has_intelligence: intelligenceBriefs.length > 0,
      brief_count: intelligenceBriefs.length,
      briefs: intelligenceBriefs.map((b: any) => ({
        id: b.id,
        title: b.title,
        addedAt: b.addedAt,
        preview: b.content?.slice(0, 200),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
