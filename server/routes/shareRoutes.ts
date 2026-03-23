/**
 * server/routes/shareRoutes.ts
 *
 * Handles platform-level share actions that require server-side processing.
 * - Public: send the business share URL via Twilio SMS (PLATFORM_MKTG pipe).
 * - Authenticated: send a Cloudbeds / PMS payment URL via CUSTOMER_CARE (transactional A2P) so
 *   high-value links are not trapped in email spam filters.
 *
 * All SMS is routed through the Sovereign SMS Router — never direct Twilio calls.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth';
import { dispatchSms, SmsIntent } from '../services/smsRouter';
import { assertSiteScopedAccess } from '../utils/siteScopedAccess';

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

const sendPaymentLinkSchema = z.object({
  to: z.string().min(10).max(20),
  /** HTTPS payment URL from Cloudbeds (or other PMS) — never construct from model output alone. */
  paymentUrl: z.string().url(),
  siteConfigId: z.string().min(1),
  /** e.g. property or guest context — shown in SMS body. */
  contextLabel: z.string().min(1).max(160).optional(),
});

function normalizeToE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

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

  const normalised = normalizeToE164(to);

  const body = `Check out ${businessName} — your AI-powered concierge is ready: ${shareUrl}`;

  const result = await dispatchSms({
    to: normalised,
    body,
    intent: SmsIntent.PLATFORM_MKTG,
    siteConfigId,
  });

  if (!result.ok) {
    const status = result.reason === 'compliance_block' ? 422 : 502;
    return res.status(status).json({ error: result.message ?? 'Failed to send SMS.' });
  }

  res.json({ success: true });
});

/**
 * POST /api/share/send-payment-link
 * Sends a **transactional** payment URL (e.g. from Cloudbeds) over **CUSTOMER_CARE** A2P — higher
 * deliverability than email for mission-critical checkout. Requires admin Bearer session + site scope.
 * Does not append marketing STOP footer (non-marketing intent).
 */
router.post('/send-payment-link', requireAuth, async (req, res) => {
  const parsed = sendPaymentLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input.' });
  }

  const { to, paymentUrl, siteConfigId, contextLabel } = parsed.data;

  const access = await assertSiteScopedAccess({ req, siteConfigId });
  if (!access.ok) {
    return res.status(access.status).json({ error: access.error });
  }

  if (!paymentUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'paymentUrl must use https.' });
  }

  const normalised = normalizeToE164(to);
  const label = contextLabel?.trim() || 'Your property';
  const body = `${label} — complete your secure payment: ${paymentUrl}`;

  const result = await dispatchSms({
    to: normalised,
    body,
    intent: SmsIntent.CUSTOMER_CARE,
    siteConfigId,
  });

  if (!result.ok) {
    const status = result.reason === 'compliance_block' ? 422 : 502;
    return res.status(status).json({ error: result.message ?? 'Failed to send SMS.' });
  }

  res.json({ success: true, messageSid: result.sid });
});

export default router;
