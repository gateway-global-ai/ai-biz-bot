/**
 * Generate a business hero image via Flux (Replicate) when Google Places has no photo.
 * Used by the BusinessPage overlay to brand the card.
 */
import { Router, type Request, type Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const businessName = typeof req.body?.businessName === 'string' ? req.body.businessName.trim() : '';
    const types = Array.isArray(req.body?.types) ? req.body.types.filter((t: unknown) => typeof t === 'string').slice(0, 5) : [];

    if (!businessName) {
      return res.status(400).json({ error: 'businessName is required' });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return res.status(503).json({ error: 'Image generation not configured (REPLICATE_API_TOKEN)' });
    }

    const typePhrase = types.length ? ` (${types.join(', ').replace(/_/g, ' ')})` : '';
    const prompt = `Professional, inviting storefront or business exterior for "${businessName}"${typePhrase}. Clean, well-lit, high quality photo style, suitable for a business website hero. No text, no logos.`;

    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({ auth: token });

    const output = await replicate.run('black-forest-labs/flux-schnell', {
      input: {
        prompt,
        aspect_ratio: '16:9',
        output_format: 'webp',
        output_quality: 85,
      },
    });

    const imageUrl = Array.isArray(output) ? output[0] : (output as string);
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(502).json({ error: 'No image URL from model' });
    }

    res.json({ imageUrl });
  } catch (e: any) {
    console.error('[Places] Flux hero generation error:', e?.message ?? e);
    res.status(500).json({ error: e?.message || 'Image generation failed' });
  }
});

export default router;
