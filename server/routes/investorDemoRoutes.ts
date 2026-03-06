/**
 * Investor report access gate and view tracking.
 * POST /unlock — name + fixed code (16400); no SMS.
 * GET /access, GET /views (admin only).
 * Session cookie: investor_report_token (HttpOnly, 24h).
 */
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { requireAuth } from "../auth";

const COOKIE_NAME = "investor_report_token";
const SESSION_MAX_AGE_SEC = 24 * 60 * 60; // 24h
const ACCESS_CODE = process.env.TWILIO_TEST_DEFAULT_OPT ?? "16400";

function getTokenFromCookie(req: Request): string | null {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  return match.split("=")[1]?.trim() ?? null;
}

function setSessionCookie(res: Response, token: string): void {
  res.setHeader("Set-Cookie", [
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  ]);
}

const router = Router();

router.post("/unlock", async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : String(req.body?.name ?? "").trim();
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : String(req.body?.code ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (code !== ACCESS_CODE) {
      res.status(401).json({ error: "Invalid access code" });
      return;
    }

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? null;
    const userAgent = (req.headers["user-agent"] as string) ?? null;

    await storage.createInvestorReportView({
      phone: name,
      ipAddress: ip ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
    await storage.createInvestorReportSession({ token, phone: name, expiresAt });

    setSessionCookie(res, token);
    res.json({ success: true, message: "Access granted" });
  } catch (error: unknown) {
    console.error("[InvestorDemo] Unlock error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to grant access",
    });
  }
});

router.get("/access", async (req: Request, res: Response) => {
  try {
    const token = getTokenFromCookie(req);
    if (!token) {
      res.status(401).json({ ok: false });
      return;
    }
    const session = await storage.getValidInvestorReportSession(token);
    if (!session) {
      res.status(401).json({ ok: false });
      return;
    }
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error("[InvestorDemo] Access check error:", error);
    res.status(401).json({ ok: false });
  }
});

router.get("/views", requireAuth, async (_req: Request, res: Response) => {
  try {
    const views = await storage.listInvestorReportViews(200);
    res.json(views);
  } catch (error: unknown) {
    console.error("[InvestorDemo] List views error:", error);
    res.status(500).json({ error: "Failed to list report views" });
  }
});

export default router;
