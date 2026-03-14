/**
 * QR code API: generate and store business QR codes (with G AI logo), search businesses, serve QR image.
 * GET /api/qr/search?q=... — search businesses by name/slug, return list with publicUrl and qrCodeUrl
 * GET /api/qr/image/:slug — serve QR PNG (generates and saves if missing)
 * POST /api/qr/generate/:siteConfigId — ensure QR is generated for a site (idempotent)
 */
import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { storage } from "../storage";
import { generateBusinessQR, getQRFilePath } from "../services/qrCodeService";

const router = Router();

function getBaseUrl(req: Request): string {
  return (
    process.env.APP_URL ||
    (req.protocol && req.get("host") ? `${req.protocol}://${req.get("host")}` : "https://aibizbot-dev.gatewayglobal.ai")
  );
}

/** Search businesses (with slug) by name or slug; return public URL and QR code URL */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(parseInt(String(req.query.limit), 10) || 50, 100);
    const configs = await storage.searchSiteConfigsWithSlug(q, limit);
    const baseUrl = getBaseUrl(req);
    const results = configs.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      publicUrl: c.slug ? `${baseUrl}/biz/${c.slug}` : null,
      qrCodeUrl: c.qrCodeUrl ? (c.qrCodeUrl.startsWith("http") ? c.qrCodeUrl : `${baseUrl}${c.qrCodeUrl}`) : null,
    }));
    res.json({ results });
  } catch (e: any) {
    console.error("[QR] search error:", e?.message);
    res.status(500).json({ error: "Search failed" });
  }
});

/** Serve QR code image for a business by slug. Redirects to public /qr/img/:slug so image is never behind API auth. */
router.get("/image/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      res.status(400).json({ error: "Slug required" });
      return;
    }
    const config = await storage.getSiteConfigBySlug(slug);
    if (!config) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const baseUrl = getBaseUrl(req);
    res.redirect(302, `${baseUrl}/qr/img/${encodeURIComponent(slug)}`);
  } catch (e: any) {
    console.error("[QR] image redirect error:", e?.message);
    res.status(500).json({ error: "Failed to redirect" });
  }
});

/** Ensure QR is generated for a site (by ID). Idempotent. */
router.post("/generate/:siteConfigId", async (req: Request, res: Response) => {
  try {
    const { siteConfigId } = req.params;
    const config = await storage.getSiteConfigById(siteConfigId);
    if (!config) {
      res.status(404).json({ error: "Site not found" });
      return;
    }
    if (!config.slug) {
      res.status(400).json({ error: "Site has no slug; cannot generate QR" });
      return;
    }
    const baseUrl = getBaseUrl(req);
    const publicUrl = `${baseUrl}/biz/${config.slug}`;
    await generateBusinessQR(publicUrl, config.slug);
    const qrCodeUrl = `/qr/img/${config.slug}`; // public path (no auth)
    await storage.updateSiteConfig(config.id, { qrCodeUrl });
    res.json({
      slug: config.slug,
      publicUrl,
      qrCodeUrl: `${baseUrl}${qrCodeUrl}`,
    });
  } catch (e: any) {
    console.error("[QR] generate error:", e?.message);
    res.status(500).json({ error: "QR generation failed" });
  }
});

export default router;
