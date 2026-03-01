import { Router } from "express";
import { z } from "zod";
import {
  provisionAgentsForBusiness,
  getTemplatesForIndustry,
  getAllIndustryGroups,
} from "../services/agentProvisioning";
import { runSageIngest } from "../services/sageIngestService";

const router = Router();

/** Normalize place id for use as data_id (strip places/ prefix if present). */
function toDataId(placeId: string): string {
  return placeId.replace(/^places\//i, "").trim() || placeId;
}

/**
 * POST /api/intelligence/resolve
 * Resolve a business name (and optional placeId) to a stable data_id and place metadata
 * for use in provision and ingest. Uses Google Places when SerpAPI is not integrated.
 */
router.post("/api/intelligence/resolve", async (req, res) => {
  const schema = z.object({
    query: z.string().min(1).optional(),
    placeId: z.string().min(1).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.message });
  }
  const { query, placeId } = parsed.data;
  if (!query && !placeId) {
    return res.status(400).json({ error: "Either query or placeId is required" });
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Google API key not configured" });
  }

  try {
    if (placeId) {
      const fields = "name,types";
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status !== "OK" || !data.result) {
        return res.status(404).json({
          error: "Place not found",
          dataId: null,
          placeId: null,
          businessName: null,
          placeTypes: [],
        });
      }
      const r = data.result;
      return res.json({
        dataId: toDataId(placeId),
        placeId,
        businessName: r.name || null,
        placeTypes: Array.isArray(r.types) ? r.types : [],
      });
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.types",
        },
        body: JSON.stringify({ textQuery: query }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error("[IntelligenceRoutes] resolve search error:", data);
      return res.status(500).json({
        error: data.error?.message || "Resolve search failed",
        dataId: null,
        placeId: null,
        businessName: null,
        placeTypes: [],
      });
    }
    const places = data.places || [];
    if (places.length === 0) {
      return res.json({
        dataId: null,
        placeId: null,
        businessName: null,
        placeTypes: [],
      });
    }
    const first = places[0];
    const id = first.id || "";
    const name = first.displayName?.text || first.displayName || null;
    const types = first.types || [];
    return res.json({
      dataId: toDataId(id),
      placeId: id,
      businessName: name,
      placeTypes: types,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    console.error("[IntelligenceRoutes] resolve error:", message);
    return res.status(500).json({
      error: message,
      dataId: null,
      placeId: null,
      businessName: null,
      placeTypes: [],
    });
  }
});

// POST /api/intelligence/provision
router.post("/api/intelligence/provision", async (req, res) => {
  const schema = z.object({
    siteConfigId: z.string().min(1),
    placeTypes: z.array(z.string()).min(1),
    businessName: z.string().min(1).max(200),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: parsed.error.message,
    });
  }

  const { siteConfigId, placeTypes, businessName } = parsed.data;

  try {
    const result = await provisionAgentsForBusiness(
      siteConfigId,
      placeTypes,
      businessName
    );
    return res.json({
      success: true,
      industryGroup: result.industryGroup,
      agentsCreated: result.agentsCreated,
      archetypesProvisioned: result.archetypesProvisioned,
      agentIds: result.agentIds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Provision failed";
    console.error("[IntelligenceRoutes] provision error:", message);
    return res.status(500).json({ error: message });
  }
});

// GET /api/intelligence/templates/:industryGroup
router.get("/api/intelligence/templates/:industryGroup", async (req, res) => {
  try {
    const templates = await getTemplatesForIndustry(
      req.params.industryGroup as string
    );
    return res.json({ templates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load templates";
    return res.status(500).json({ error: message });
  }
});

// GET /api/intelligence/industry-groups
router.get("/api/intelligence/industry-groups", async (_req, res) => {
  try {
    const groups = await getAllIndustryGroups();
    return res.json({ groups });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load groups";
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/intelligence/ingest
 * Run Sage pipeline: fetch reviews (SerpAPI) → compile with Gemini → persist to siteConfigs.knowledgeLibrary.
 * Input: { siteConfigId, dataId, businessName? }. dataId is the place_id for SerpAPI.
 */
router.post("/api/intelligence/ingest", async (req, res) => {
  const schema = z.object({
    siteConfigId: z.string().min(1),
    dataId: z.string().min(1),
    businessName: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.message });
  }
  const { siteConfigId, dataId, businessName } = parsed.data;
  try {
    const result = await runSageIngest(siteConfigId, dataId, businessName ?? "");
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        reviewsHarvested: result.reviewsHarvested ?? 0,
      });
    }
    return res.json({
      success: true,
      reviewsHarvested: result.reviewsHarvested,
      knowledgeDocId: result.knowledgeDocId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    console.error("[IntelligenceRoutes] ingest error:", message);
    return res.status(500).json({ error: message });
  }
});

export default router;
