/**
 * NOVA Sovereign Identity & Billing Suite — API bridge
 * Spec: .system_design/nova_sovereign_ruleset_v1.yaml
 * Gate 1: X-Nova-Signature + replay. Gate 2: receive_id_analysis. Gate 3: push_invoice. Gate 4: dashboard session.
 */

import { Router, type Request, type Response } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { randomUUID } from "crypto";
import { db } from "../db";
import { novaIdvSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  buildCanonical,
  verifyReplayTimestamp,
  verifyNovaSignature,
  loadPublicKey,
} from "../utils/novaSignature";
import { generateInvoice } from "../services/novaInvoiceService";
import { requireAuth } from "../auth";

const router = Router();

// --- Gate 1: Security perimeter (skip for dashboard) ---
router.use((req: Request, res: Response, next) => {
  if (req.path.startsWith("/dashboard")) return next();

  const signature = req.headers["x-nova-signature"] as string | undefined;
  const timestamp = req.headers["x-nova-timestamp"] as string | undefined;
  const businessId = req.headers["x-nova-business-id"] as string | undefined;
  const protocolLevel = req.headers["x-nova-protocol-level"] as string | undefined;

  if (!timestamp || !businessId || !protocolLevel) {
    return res.status(401).json({ error: "Missing X-Nova-Timestamp, X-Nova-Business-ID, or X-Nova-Protocol-Level" });
  }

  const replay = verifyReplayTimestamp(timestamp);
  if (!replay.ok) {
    return res.status(403).json({ error: replay.error ?? "Replay check failed" });
  }

  const publicKey = loadPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: "NOVA_RSA_PUBLIC_KEY not configured" });
  }

  if (!signature) {
    return res.status(401).json({ error: "Missing X-Nova-Signature" });
  }

  const pathname = (req.baseUrl || "") + (req.path || "");
  const body = typeof req.body === "object" ? JSON.stringify(req.body) : (req.body ?? "");
  const canonical = buildCanonical(req.method, pathname, timestamp, body);

  if (!verifyNovaSignature(canonical, signature, publicKey)) {
    return res.status(403).json({ error: "Invalid X-Nova-Signature" });
  }

  (req as any).novaBusinessId = businessId;
  (req as any).novaProtocolLevel = protocolLevel;
  next();
});

// --- Gate 2: POST /api/nova/billing/receive (receive_id_analysis) ---
router.post("/billing/receive", async (req: Request, res: Response) => {
  const operation = (req.body as any)?.operation;
  if (operation === "receive_id_analysis") {
    const sessionId = (req.body as any)?.session_id;
    const payload = (req.body as any)?.payload;
    if (!sessionId || !payload || typeof payload.isVerified !== "boolean") {
      return res.status(400).json({ error: "receive_id_analysis requires session_id and payload.isVerified" });
    }
    try {
      await db
        .update(novaIdvSessions)
        .set({
          idVerified: payload.isVerified,
          updatedAt: new Date(),
        })
        .where(eq(novaIdvSessions.sessionId, sessionId));
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[NOVA] receive_id_analysis update error:", e);
      return res.status(500).json({ error: "Failed to update session" });
    }
  }
  // Other operations: 501 until implemented
  return res.status(501).json({
    error: "Not implemented",
    message: `Operation "${operation}" — see nova_sovereign_ruleset_v1.yaml`,
  });
});

// --- Gate 3: POST /api/nova/billing/push (push_invoice) ---
router.post("/billing/push", async (req: Request, res: Response) => {
  const operation = (req.body as any)?.operation;
  if (operation === "push_invoice") {
    const category = (req.body as any)?.category;
    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "push_invoice requires category" });
    }
    const invoice = generateInvoice(category);
    if (!invoice) {
      return res.status(400).json({ error: "Unknown category or no template" });
    }
    return res.status(200).json(invoice);
  }
  return res.status(501).json({
    error: "Not implemented",
    message: `Operation "${operation}" — see nova_sovereign_ruleset_v1.yaml`,
  });
});

// --- Gate 4: GET /api/nova/dashboard/session/:sessionId (requireAuth) ---
function getProtocolSteps(protocolLevel: number): string[] {
  const root = process.cwd();
  const filePath = path.join(root, ".system_design", "nova_sovereign_ruleset_v1.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  const data = yaml.load(raw) as any;
  const protocols = data?.nova_sovereign_config?.idv_protocols;
  if (!protocols) return [];
  const key = protocolLevel === 7 ? "level_7" : protocolLevel === 5 ? "level_5" : "level_1";
  return protocols[key]?.steps ?? [];
}

router.get("/dashboard/session/:sessionId", requireAuth, async (req: any, res: Response) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  try {
    const rows = await db
      .select()
      .from(novaIdvSessions)
      .where(eq(novaIdvSessions.sessionId, sessionId))
      .limit(1);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "Session not found" });
    const steps = getProtocolSteps(row.protocolLevel);
    let currentStepIndex = steps.length - 1;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s === "OTP_Verify" && !row.otpVerified) { currentStepIndex = i; break; }
      if (s === "MagicLink_Sent" && !row.magicLinkVerified) { currentStepIndex = i; break; }
      if (s === "Biometric" && !row.biometricVerified) { currentStepIndex = i; break; }
      if (s === "ID_Analysis" && !row.idVerified) { currentStepIndex = i; break; }
      if (s === "Signature" && !row.signatureUrl) { currentStepIndex = i; break; }
    }
    return res.status(200).json({
      session_id: row.sessionId,
      business_id: row.businessId,
      client_phone: row.clientPhone,
      client_email: row.clientEmail,
      protocol_level: row.protocolLevel,
      otp_verified: row.otpVerified,
      magic_link_verified: row.magicLinkVerified,
      biometric_verified: row.biometricVerified,
      id_verified: row.idVerified,
      signature_url: row.signatureUrl,
      invoice_id: row.invoiceId,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      steps,
      currentStepIndex: Math.min(currentStepIndex, steps.length - 1),
    });
  } catch (e) {
    console.error("[NOVA] dashboard session error:", e);
    return res.status(500).json({ error: "Failed to load session" });
  }
});

export default router;
