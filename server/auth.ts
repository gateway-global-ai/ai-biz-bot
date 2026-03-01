import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { dispatchSms, SmsIntent } from "./services/smsRouter";
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

export async function sendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    
    const adminUser = await storage.getAdminUserByPhone(normalizedPhone);
    if (!adminUser) {
      res.status(403).json({ error: "This phone number is not authorized for admin access" });
      return;
    }

    if (!adminUser.isActive) {
      res.status(403).json({ error: "This account has been deactivated" });
      return;
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await storage.createOtpCode({
      phone: normalizedPhone,
      code,
      expiresAt,
    });

    const result = await dispatchSms({
      to: normalizedPhone,
      body: `Your Gateway Global AI verification code is: ${code}\n\nThis code expires in 5 minutes.`,
      intent: SmsIntent.PLATFORM_OTP,
      siteConfigId: "SYSTEM",
    });

    if (!result.ok) {
      res.status(500).json({ error: result.message || "Failed to send verification code" });
      return;
    }

    res.json({ 
      success: true, 
      message: "Verification code sent",
      phone: normalizedPhone.slice(-4),
    });
  } catch (error: any) {
    console.error("[Auth] Send OTP error:", error);
    res.status(500).json({ error: error.message || "Failed to send verification code" });
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
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

    const adminUser = await storage.getAdminUserByPhone(normalizedPhone);
    if (!adminUser) {
      res.status(403).json({ error: "Admin user not found" });
      return;
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await storage.createAuthSession({
      adminUserId: adminUser.id,
      token,
      expiresAt,
    });

    await storage.updateAdminUserLastLogin(adminUser.id);

    res.json({
      success: true,
      token,
      user: {
        id: adminUser.id,
        phone: adminUser.phone,
        name: adminUser.name,
        role: adminUser.role,
        resellerId: (adminUser as any).resellerId ?? null,
      },
    });
  } catch (error: any) {
    console.error("[Auth] Verify OTP error:", error);
    res.status(500).json({ error: error.message || "Failed to verify code" });
  }
}

export async function verifySession(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "No session token provided" });
      return;
    }

    const session = await storage.getValidAuthSession(token);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const adminUser = await storage.getAdminUserById(session.adminUserId);
    if (!adminUser || !adminUser.isActive) {
      res.status(401).json({ error: "User account not found or deactivated" });
      return;
    }

    res.json({
      valid: true,
      user: {
        id: adminUser.id,
        phone: adminUser.phone,
        name: adminUser.name,
        role: adminUser.role,
        resellerId: (adminUser as any).resellerId ?? null,
      },
    });
  } catch (error: any) {
    console.error("[Auth] Verify session error:", error);
    res.status(500).json({ error: error.message || "Failed to verify session" });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      await storage.deleteAuthSession(token);
    }

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    console.error("[Auth] Logout error:", error);
    res.status(500).json({ error: error.message || "Failed to logout" });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  storage.getValidAuthSession(token)
    .then((session) => {
      if (!session) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      (req as any).session = session;
      next();
    })
    .catch((error) => {
      console.error("[Auth] Middleware error:", error);
      res.status(500).json({ error: "Authentication check failed" });
    });
}
