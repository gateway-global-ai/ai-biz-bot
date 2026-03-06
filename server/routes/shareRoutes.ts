/**
 * server/routes/shareRoutes.ts
 *
 * Handles platform-level share actions that require server-side processing.
 * Currently: send the business share URL via Twilio SMS (PLATFORM_MKTG pipe).
 *
 * All SMS is routed through the Sovereign SMS Router — never direct Twilio calls.
 */

import { Router } from 'express';
import { z } from 'zod';
import { dispatchSms, SmsIntent } from '../services/smsRouter';

const router = Router();

const sendSmsSchema = z.object({
  /** E.164 or domestic format — router normalises before dispatch. */
  to: z.string().min(10).max(20),
  /** The full public URL to share (e.g. https://aibizbot-dev.gatewayglobal.ai/biz/boardwalk-...) */
  shareUrl: z.string().url(),
  /** Display name of the business being shared. */
  businessName: z.string().min(1).max(200),
  /** Site config UUID — required by the SMS Router for opt-out checks and logging. */
  siteConfigId: z.string().min(1),
});

/**
 * POST /api/share/send-sms
 * Sends the business share URL to a phone number via Twilio PLATFORM_MKTG pipe.
 * Compliance footer ("Reply STOP to opt out") is appended automatically by dispatchSms.
 */
router.post('/send-sms', async (req, res) => {
  const parsed = sendSmsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input.' });
  }

  const { to, shareUrl, businessName, siteConfigId } = parsed.data;

  // Normalise to E.164: strip non-digits then prepend +1 if 10 digits (US default)
  const digits = to.replace(/\D/g, '');
  const normalised = digits.length === 10 ? `+1${digits}` : digits.startsWith('1') && digits.length === 11 ? `+${digits}` : `+${digits}`;

  const body = `Check out ${businessName} — your AI-powered concierge is ready: ${shareUrl}`;

  const result = await dispatchSms({
    to: normalised,
    body,
    intent: SmsIntent.PLATFORM_MKTG,
    siteConfigId,
  });

  if (!result.ok) {
    const status = result.reason === 'opted_out' ? 422 : 502;
    return res.status(status).json({ error: result.message ?? 'Failed to send SMS.' });
  }

  res.json({ success: true });
});

export default router;
