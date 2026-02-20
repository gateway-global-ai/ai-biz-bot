import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * GET /api/site-configs/:id
 * The public-facing endpoint for the "Handover Service".
 * It fetches the pre-validated site configuration, including the crucial
 * `systemPromptOverride`, and passes it to the ConciergePanel.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // Guard against 'undefined' or empty IDs
  if (!id || id === 'undefined') {
    return res.status(400).json({ error: 'A valid site configuration ID is required.' });
  }

  try {
    const siteConfig = await storage.getSiteConfigById(id);

    if (!siteConfig) {
      return res.status(404).json({ error: `Site configuration with ID ${id} not found.` });
    }

    // Return the full, validated artifact to the client.
    res.status(200).json(siteConfig);

  } catch (error) {
    console.error(`[API] Failed to fetch site config for ID ${id}:`, error);
    res.status(500).json({ error: 'An internal server error occurred while fetching site configuration.' });
  }
});

export default router;