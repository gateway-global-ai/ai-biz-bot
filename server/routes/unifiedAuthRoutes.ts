/**
 * Unified OTP Auth Routes
 *
 * Single phone-first auth flow:
 *   POST /api/auth/unified-otp/send    — send OTP to any phone (no pre-check)
 *   POST /api/auth/unified-otp/verify  — verify OTP, return matched accounts
 *
 * After verify the client receives an `options` array.
 * The client picks which session to activate and stores the token.
 */
import { Router } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';
import { sendVerification, checkVerification } from '../twilio';

const router = Router();

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/unified-otp/send
router.post('/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    await sendVerification(normalizedPhone);

    res.json({
      success: true,
      message: 'Verification code sent',
      phoneLast4: normalizedPhone.slice(-4),
    });
  } catch (error: any) {
    console.error('[UnifiedAuth] Send OTP error:', error);
    res.status(500).json({ error: error.message || 'Failed to send verification code' });
  }
});

// POST /api/auth/unified-otp/verify
router.post('/verify', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      res.status(400).json({ error: 'Phone number and code are required' });
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    const result = await checkVerification(normalizedPhone, code);
    if (!result.valid) {
      res.status(401).json({ error: 'Invalid or expired verification code' });
      return;
    }

    const options: Array<{
      type: 'admin' | 'customer';
      token: string;
      user: Record<string, any>;
      businesses?: Array<{ id: string; name: string; slug: string | null }>;
    }> = [];

    // ── Admin lookup ────────────────────────────────────────────────────────
    const adminUser = await storage.getAdminUserByPhone(normalizedPhone);
    if (adminUser?.isActive) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createAuthSession({ adminUserId: adminUser.id, token, expiresAt });
      await storage.updateAdminUserLastLogin(adminUser.id);
      options.push({
        type: 'admin',
        token,
        user: {
          id: adminUser.id,
          phone: adminUser.phone,
          name: adminUser.name,
          role: adminUser.role,
        },
      });
    }

    // ── Customer lookup ─────────────────────────────────────────────────────
    let customerAccount = await storage.getCustomerAccountByPhone(normalizedPhone);
    if (!customerAccount) {
      // First-time customer — create account
      customerAccount = await storage.createCustomerAccount({
        phone: normalizedPhone,
        plan: 'free',
      });
    }

    if (customerAccount?.isActive) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createCustomerSession({ customerAccountId: customerAccount.id, token, expiresAt });
      await storage.updateCustomerAccountLastLogin(customerAccount.id);

      // Auto-claim unlinked sites assigned to this phone
      try {
        const claimed = await storage.claimUnlinkedSitesByPhone(customerAccount.phone, customerAccount.id);
        if (claimed > 0) {
          console.log(`[UnifiedAuth] Auto-claimed ${claimed} site(s) for ${customerAccount.id}`);
        }
      } catch (err) {
        console.error('[UnifiedAuth] Auto-claim error (non-fatal):', err);
      }

      // Fetch businesses linked to this account
      let businesses: Array<{ id: string; name: string; slug: string | null }> = [];
      try {
        const sites = await storage.getSiteConfigsByOwner(customerAccount.id);
        businesses = (sites as any[]).map((s: any) => ({
          id: s.id,
          name: s.name,
          slug: s.slug ?? null,
        }));
      } catch {
        // non-fatal
      }

      options.push({
        type: 'customer',
        token,
        user: {
          id: customerAccount.id,
          phone: customerAccount.phone,
          name: customerAccount.name,
          email: customerAccount.email,
          plan: customerAccount.plan,
        },
        businesses,
      });
    }

    res.json({ success: true, options });
  } catch (error: any) {
    console.error('[UnifiedAuth] Verify OTP error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify code' });
  }
});

export default router;
