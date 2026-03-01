/**
 * B2B exclusivity gate: check if a phone number is allowed to receive OTP.
 * Cross-reference against referral partner database or invite token.
 * Stub returns { allowed: true } until wired to real partner/allowlist.
 */
import { Router, type Request, type Response } from 'express';

const router = Router();

// Mounted at /api/demo/check-eligibility so POST body is for eligibility check only.
router.post('/', async (req: Request, res: Response) => {
  try {
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ allowed: false, error: 'Valid phone required' });
    }
    // TODO: Check phone against verified referralPartner / invite allowlist.
    // For now allow all so flow is unchanged; set allowed: false to enable waitlist gate.
    const allowed = true;
    res.json({ allowed });
  } catch (e: any) {
    console.error('[Demo] check-eligibility error:', e);
    res.status(500).json({ allowed: false, error: e?.message || 'Server error' });
  }
});

export default router;
