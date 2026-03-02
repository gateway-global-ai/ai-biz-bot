import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { sendSms, getTwilioFromPhoneNumber } from "./twilio";
import crypto from "crypto";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export async function customerSendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await storage.createOtpCode({
      phone: normalizedPhone,
      code,
      expiresAt,
    });

    const fromNumber = await getTwilioFromPhoneNumber();
    if (!fromNumber) {
      res.status(500).json({ error: "SMS service not configured" });
      return;
    }

    await sendSms(
      normalizedPhone,
      `Your Gateway login code is: ${code}\n\nThis code expires in 5 minutes.`,
      fromNumber
    );

    res.json({
      success: true,
      message: "Verification code sent",
      phone: normalizedPhone.slice(-4),
    });
  } catch (error: any) {
    console.error("[CustomerAuth] Send OTP error:", error);
    res.status(500).json({ error: error.message || "Failed to send verification code" });
  }
}

export async function customerVerifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      res.status(400).json({ error: "Phone number and code are required" });
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    const otpRecord = await storage.getValidOtpCode(normalizedPhone, code);
    if (!otpRecord) {
      res.status(401).json({ error: "Invalid or expired verification code" });
      return;
    }

    await storage.markOtpUsed(otpRecord.id);

    let account = await storage.getCustomerAccountByPhone(normalizedPhone);
    if (!account) {
      account = await storage.createCustomerAccount({
        phone: normalizedPhone,
        plan: "free",
      });
    }

    if (!account.isActive) {
      res.status(403).json({ error: "This account has been deactivated" });
      return;
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await storage.createCustomerSession({
      customerAccountId: account.id,
      token,
      expiresAt,
    });

    await storage.updateCustomerAccountLastLogin(account.id);

    try {
      const claimed = await storage.claimUnlinkedSitesByPhone(account.phone, account.id);
      if (claimed > 0) {
        console.log(`[CustomerAuth] Auto-claimed ${claimed} site(s) for customer ${account.id} (phone: ${account.phone})`);
      }
    } catch (claimErr) {
      console.error("[CustomerAuth] Auto-claim error (non-fatal):", claimErr);
    }

    res.json({
      success: true,
      token,
      user: {
        id: account.id,
        phone: account.phone,
        name: account.name,
        email: account.email,
        plan: account.plan,
        planStartedAt: account.planStartedAt,
      },
    });
  } catch (error: any) {
    console.error("[CustomerAuth] Verify OTP error:", error);
    res.status(500).json({ error: error.message || "Failed to verify code" });
  }
}

export async function customerVerifySession(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "No session token provided" });
      return;
    }

    const session = await storage.getValidCustomerSession(token);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const account = await storage.getCustomerAccountById(session.customerAccountId);
    if (!account || !account.isActive) {
      res.status(401).json({ error: "Account not found or deactivated" });
      return;
    }

    res.json({
      valid: true,
      user: {
        id: account.id,
        phone: account.phone,
        name: account.name,
        email: account.email,
        plan: account.plan,
        planStartedAt: account.planStartedAt,
      },
    });
  } catch (error: any) {
    console.error("[CustomerAuth] Verify session error:", error);
    res.status(500).json({ error: error.message || "Failed to verify session" });
  }
}

export async function customerLogout(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      await storage.deleteCustomerSession(token);
    }

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    console.error("[CustomerAuth] Logout error:", error);
    res.status(500).json({ error: error.message || "Failed to logout" });
  }
}

export async function customerUpdateProfile(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const session = await storage.getValidCustomerSession(token);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const { name, email } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;

    const updated = await storage.updateCustomerAccount(session.customerAccountId, updates);
    if (!updated) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json({
      success: true,
      user: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name,
        email: updated.email,
        plan: updated.plan,
        planStartedAt: updated.planStartedAt,
      },
    });
  } catch (error: any) {
    console.error("[CustomerAuth] Update profile error:", error);
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
}

function toSerializable(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(toSerializable);
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      try {
        out[k] = toSerializable(v);
      } catch {
        out[k] = null;
      }
    }
    return out;
  }
  return obj;
}

export async function customerGetBusinesses(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const session = await storage.getValidCustomerSession(token);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const rows = await storage.getSiteConfigsByOwner(session.customerAccountId);
    const businesses = toSerializable(rows) as unknown[];
    res.json({ businesses });
  } catch (error: any) {
    console.error("[CustomerAuth] Get businesses error:", error?.message, error?.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Failed to get businesses" });
    }
  }
}

export async function customerClaimBusiness(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const session = await storage.getValidCustomerSession(token);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const account = await storage.getCustomerAccountById(session.customerAccountId);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const { siteConfigId } = req.body;
    if (!siteConfigId) {
      res.status(400).json({ error: "Business site ID is required" });
      return;
    }

    const site = await storage.getSiteConfig(siteConfigId);
    if (!site) {
      res.status(404).json({ error: "Business site not found" });
      return;
    }

    if (site.ownerId && site.ownerId !== account.id) {
      res.status(403).json({ error: "This business is already claimed by another account" });
      return;
    }

    const { PLAN_LIMITS } = await import("@shared/schema");
    const currentBusinesses = await storage.getSiteConfigsByOwner(account.id);
    const planKey = (account.plan || "free") as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[planKey]?.maxBusinesses || 1;

    if (currentBusinesses.length >= limit) {
      res.status(403).json({ 
        error: `Your ${account.plan} plan allows up to ${limit} business(es). Upgrade to add more.`,
        needsUpgrade: true,
      });
      return;
    }

    await storage.updateSiteConfig(siteConfigId, { ownerId: account.id } as any);

    res.json({ success: true });
  } catch (error: any) {
    console.error("[CustomerAuth] Claim business error:", error);
    res.status(500).json({ error: error.message || "Failed to claim business" });
  }
}

export function requireCustomerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  storage.getValidCustomerSession(token)
    .then((session) => {
      if (!session) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      (req as any).customerSession = session;
      next();
    })
    .catch((err) => {
      console.error("[CustomerAuth] Middleware error:", err);
      res.status(500).json({ error: "Authentication error" });
    });
}
