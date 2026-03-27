/**
 * Platform software license keys — admin deploy + customer redeem.
 *
 * POST /api/v1/admin/platform-licenses/generate
 * GET  /api/v1/admin/platform-licenses
 * POST /api/v1/admin/platform-licenses/:id/revoke
 * POST /api/customer/platform-licenses/redeem
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { requireCustomerAuth } from "../customerAuth";
import { storage } from "../storage";
import {
  createPlatformLicenseKeys,
  listPlatformLicenseKeys,
  redeemPlatformLicenseKey,
  revokePlatformLicenseKey,
} from "../services/platformLicenseService";
import { firstRouteParam } from "../utils/expressParams";

const router = Router();

const PLATFORM_ROLES = new Set(["admin", "superadmin", "owner"]);

async function requirePlatformAdmin(req: Request, res: Response, next: () => void) {
  const session = (req as any).session as { adminUserId?: string } | undefined;
  const adminUserId = session?.adminUserId;
  if (!adminUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await storage.getAdminUserById(adminUserId);
  if (!user?.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }
  if (!PLATFORM_ROLES.has(user.role || "")) {
    res.status(403).json({ error: "Platform admin access required." });
    return;
  }
  next();
}

const generateSchema = z.object({
  count: z.number().int().min(1).max(50).optional().default(1),
  sku: z.enum([
    "platform_core",
    "platform_pro",
    "voice_addon",
    "enterprise",
    "custom",
  ]),
  maxActivations: z.number().int().min(1).max(10000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  label: z.string().max(200).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

router.post(
  "/api/v1/admin/platform-licenses/generate",
  requireAuth,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = generateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const session = (req as any).session as { adminUserId?: string };
      const adminUserId = session?.adminUserId;
      if (!adminUserId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { count, sku, maxActivations, expiresAt, label, metadata } = parsed.data;
      const keys = await createPlatformLicenseKeys({
        sku,
        count,
        maxActivations: maxActivations ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        label: label ?? null,
        metadata: metadata as Record<string, unknown>,
        createdByAdminId: adminUserId,
      });

      return res.status(201).json({
        ok: true,
        keys: keys.map((k) => ({
          id: k.id,
          fullKey: k.fullKey,
          keyPrefix: k.keyPrefix,
          warning: k.warning,
        })),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate";
      return res.status(500).json({ error: msg });
    }
  },
);

router.get(
  "/api/v1/admin/platform-licenses",
  requireAuth,
  requirePlatformAdmin,
  async (_req: Request, res: Response) => {
    try {
      const rows = await listPlatformLicenseKeys(200);
      return res.json({ ok: true, keys: rows });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to list";
      return res.status(500).json({ error: msg });
    }
  },
);

router.post(
  "/api/v1/admin/platform-licenses/:id/revoke",
  requireAuth,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = firstRouteParam(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      const ok = await revokePlatformLicenseKey(id);
      if (!ok) {
        return res.status(404).json({ error: "License key not found" });
      }
      return res.json({ ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to revoke";
      return res.status(500).json({ error: msg });
    }
  },
);

const redeemSchema = z.object({
  licenseKey: z.string().min(10).max(120),
  siteConfigId: z.string().min(1),
});

router.post("/api/customer/platform-licenses/redeem", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const parsed = redeemSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const session = (req as any).customerSession as { customerAccountId: string };
    const customerAccountId = session?.customerAccountId;
    if (!customerAccountId) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const result = await redeemPlatformLicenseKey({
      fullKey: parsed.data.licenseKey,
      siteConfigId: parsed.data.siteConfigId,
      customerAccountId,
    });

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({
      ok: true,
      sku: result.sku,
      activationId: result.activationId,
      entitlements: result.entitlements,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Redeem failed";
    return res.status(500).json({ error: msg });
  }
});

export default router;
