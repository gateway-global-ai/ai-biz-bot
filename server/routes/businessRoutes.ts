/**
 * Business Data REST API Routes
 *
 * Provides endpoints for fetching enriched business data and system instructions.
 */

import { Router } from 'express';
import { buildRichSystemInstruction } from '../services/systemInstructionBuilder.js';
import { enrichBusinessData } from '../services/businessDataService.js';
import { getOwnerDataByPlaceId, upsertOwnerData } from '../services/ownerDataService.js';
import { BusinessContext, AgentConfig } from '../../client/src/types/voice.js';

const router = Router();

/**
 * GET /api/business/:placeId/enriched-instruction
 * Returns a rich system instruction for the given business and agent config.
 */
router.get('/:placeId/enriched-instruction', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { businessName, address, hours, services } = req.query;

    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    const business: BusinessContext = {
      placeId,
      name: (businessName as string) || 'Business',
      address: (address as string) || '',
      hours: hours as string | undefined,
      services: services ? (services as string).split(',') : undefined,
    };

    const agent: AgentConfig = {
      role: (req.query.role as string) || 'Business Assistant',
      personality: (req.query.personality as string) || 'Helpful and professional',
      objectives: req.query.objectives
        ? (req.query.objectives as string).split('|')
        : ['Assist customers with business information'],
      constraints: req.query.constraints
        ? (req.query.constraints as string).split('|')
        : ['Be polite and professional'],
    };

    const includeIntelligence = req.query.includeIntelligence === 'true';
    const includeOwnerData = req.query.includeOwnerData === 'true';
    const includeTourNarrative = req.query.includeTourNarrative === 'true';
    const tourMode = req.query.tourMode === 'true';

    const instruction = await buildRichSystemInstruction(business, agent, {
      includeIntelligence,
      includeOwnerData,
      includeTourNarrative,
      tourMode,
    });

    res.json({ instruction });
  } catch (error: any) {
    console.error('[BusinessRoutes] Error building instruction:', error);
    res.status(500).json({ error: error.message || 'Failed to build instruction' });
  }
});

/**
 * GET /api/business/:placeId/enriched-data
 * Returns enriched business data (general + optional intelligence + owner data).
 */
router.get('/:placeId/enriched-data', async (req, res) => {
  try {
    const { placeId } = req.params;
    const includeIntelligence = req.query.includeIntelligence === 'true';
    const includeOwnerData = req.query.includeOwnerData === 'true';
    const businessName = req.query.businessName as string | undefined;

    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    const enriched = await enrichBusinessData(placeId, {
      includeIntelligence,
      includeOwnerData,
      businessName,
    });

    res.json(enriched);
  } catch (error: any) {
    console.error('[BusinessRoutes] Error enriching data:', error);
    res.status(500).json({ error: error.message || 'Failed to enrich data' });
  }
});

/**
 * GET /api/business/:placeId/owner-data
 * Returns owner-specific data for the place.
 */
router.get('/:placeId/owner-data', async (req, res) => {
  try {
    const { placeId } = req.params;
    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }
    const data = await getOwnerDataByPlaceId(placeId);
    res.json(data ?? {});
  } catch (error: any) {
    console.error('[BusinessRoutes] Error fetching owner data:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch owner data' });
  }
});

/**
 * PUT /api/business/:placeId/owner-data
 * Upsert owner-specific data (custom description, story, offers, etc.).
 * Body: { customDescription?, specialOffers?, ownerStory?, customHours?, contactPreferences?, ownerId? }
 */
router.put('/:placeId/owner-data', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { ownerId, ...data } = req.body || {};
    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }
    await upsertOwnerData(placeId, data, ownerId);
    const updated = await getOwnerDataByPlaceId(placeId);
    res.json(updated ?? {});
  } catch (error: any) {
    console.error('[BusinessRoutes] Error upserting owner data:', error);
    res.status(500).json({ error: error.message || 'Failed to upsert owner data' });
  }
});

export default router;
