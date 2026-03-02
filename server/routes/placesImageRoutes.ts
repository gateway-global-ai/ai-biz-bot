/**
 * Business hero image placeholder. Image generation is not configured.
 * Used by the BusinessPage overlay when no Google Places photo is available.
 */
import { Router, type Request, type Response } from 'express';

const router = Router();

router.post('/', async (_req: Request, res: Response) => {
  res.status(503).json({ error: 'Image generation not configured' });
});

export default router;
