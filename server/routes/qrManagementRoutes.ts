/**
 * QR Routes (shadow telecom): admin API and redirect handler.
 * - qrAdminRouter: /api/qr-routes — CRUD, image serve, regenerate, access log, firewall rules
 * - qrRedirectRouter: /qr — GET /:id → firewall check, log, 302 to destination
 */
import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { storage } from "../storage";
import {
  getQrBaseUrl,
  buildRouteUrl,
  generateQrForRoute,
  getRouteQrFilePath,
  checkFirewall,
  logQrAccess,
} from "../services/qrRoutingService";

const qrAdminRouter = Router();
const qrRedirectRouter = Router();

// ─── Admin: list routes (paginated, optional search, with routeUrl) ───────
qrAdminRouter.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const search = typeof req.query.search === "string" ? req.query.search.trim() || undefined : undefined;
    const { routes, total } = await storage.getQrRoutes(page, limit, search);
    const baseUrl = getQrBaseUrl();
    const items = routes.map((r) => ({
      ...r,
      routeUrl: `${baseUrl.replace(/\/$/, "")}/qr/${r.id}`,
    }));
    res.json({ routes: items, total });
  } catch (e: unknown) {
    console.error("[QR Routes] list error:", e);
    res.status(500).json({ error: "Failed to list routes" });
  }
});

// ─── Admin: create route (auto UUID, generate QR) ──────────────────────────
qrAdminRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as { label?: string; destination?: string; siteConfigId?: string };
    const created = await storage.createQrRoute({
      label: body.label ?? null,
      destination: body.destination ?? null,
      siteConfigId: body.siteConfigId ?? null,
    });
    const routeUrl = buildRouteUrl(created.id);
    await generateQrForRoute(created.id);
    const outPath = getRouteQrFilePath(created.id);
    await storage.updateQrRoute(created.id, { qrCodePath: outPath });
    const updated = await storage.getQrRoute(created.id);
    const baseUrl = getQrBaseUrl();
    res.status(201).json({
      ...updated,
      routeUrl: `${baseUrl.replace(/\/$/, "")}/qr/${updated!.id}`,
    });
  } catch (e: unknown) {
    console.error("[QR Routes] create error:", e);
    res.status(500).json({ error: "Failed to create route" });
  }
});

// ─── Admin: firewall rules (must be before /:id) ───────────────────────────
qrAdminRouter.get("/firewall/rules", async (req: Request, res: Response) => {
  try {
    const routeId = req.query.routeId !== undefined ? parseInt(String(req.query.routeId), 10) : undefined;
    if (req.query.routeId !== undefined && Number.isNaN(routeId)) {
      res.status(400).json({ error: "Invalid routeId" });
      return;
    }
    const rules = await storage.getQrFirewallRules(routeId);
    res.json({ rules });
  } catch (e: unknown) {
    console.error("[QR Routes] firewall list error:", e);
    res.status(500).json({ error: "Failed to list firewall rules" });
  }
});

qrAdminRouter.post("/firewall/rules", async (req: Request, res: Response) => {
  try {
    const body = req.body as { qrRouteId?: number; ruleType: string; value: string };
    if (!body.ruleType || !body.value) {
      res.status(400).json({ error: "ruleType and value required" });
      return;
    }
    const rule = await storage.createQrFirewallRule({
      qrRouteId: body.qrRouteId ?? null,
      ruleType: body.ruleType,
      value: body.value,
    });
    res.status(201).json(rule);
  } catch (e: unknown) {
    console.error("[QR Routes] firewall create error:", e);
    res.status(500).json({ error: "Failed to create firewall rule" });
  }
});

qrAdminRouter.delete("/firewall/rules/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid rule id" });
      return;
    }
    await storage.deleteQrFirewallRule(id);
    res.status(204).send();
  } catch (e: unknown) {
    console.error("[QR Routes] firewall delete error:", e);
    res.status(500).json({ error: "Failed to delete firewall rule" });
  }
});

// ─── Admin: single route ───────────────────────────────────────────────────
qrAdminRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid route id" });
      return;
    }
    const route = await storage.getQrRoute(id);
    if (!route) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    const baseUrl = getQrBaseUrl();
    res.json({
      ...route,
      routeUrl: `${baseUrl.replace(/\/$/, "")}/qr/${route.id}`,
    });
  } catch (e: unknown) {
    console.error("[QR Routes] get error:", e);
    res.status(500).json({ error: "Failed to get route" });
  }
});

qrAdminRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid route id" });
      return;
    }
    const body = req.body as {
      destination?: string | null;
      siteConfigId?: string | null;
      label?: string | null;
      isActive?: boolean;
      variable?: string;
    };
    const updates: Record<string, unknown> = {};
    if (body.destination !== undefined) updates.destination = body.destination;
    if (body.siteConfigId !== undefined) updates.siteConfigId = body.siteConfigId;
    if (body.label !== undefined) updates.label = body.label;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.variable !== undefined) updates.variable = body.variable;
    const updated = await storage.updateQrRoute(id, updates as Parameters<typeof storage.updateQrRoute>[1]);
    if (!updated) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    const baseUrl = getQrBaseUrl();
    res.json({
      ...updated,
      routeUrl: `${baseUrl.replace(/\/$/, "")}/qr/${updated.id}`,
    });
  } catch (e: unknown) {
    console.error("[QR Routes] patch error:", e);
    res.status(500).json({ error: "Failed to update route" });
  }
});

qrAdminRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid route id" });
      return;
    }
    const route = await storage.getQrRoute(id);
    if (route?.qrCodePath && fs.existsSync(route.qrCodePath)) {
      try {
        fs.unlinkSync(route.qrCodePath);
      } catch (_) {
        // ignore
      }
    }
    await storage.deleteQrRoute(id);
    res.status(204).send();
  } catch (e: unknown) {
    console.error("[QR Routes] delete error:", e);
    res.status(500).json({ error: "Failed to delete route" });
  }
});

// ─── Admin: serve QR image ──────────────────────────────────────────────────
qrAdminRouter.get("/:id/image", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid route id" });
      return;
    }
    const route = await storage.getQrRoute(id);
    if (!route) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    const filePath = getRouteQrFilePath(id);
    if (!fs.existsSync(filePath)) {
      await generateQrForRoute(id);
      await storage.updateQrRoute(id, { qrCodePath: getRouteQrFilePath(id) });
    }
    const finalPath = getRouteQrFilePath(id);
    if (!fs.existsSync(finalPath)) {
      res.status(500).json({ error: "QR image not found" });
      return;
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(path.resolve(finalPath));
  } catch (e: unknown) {
    console.error("[QR Routes] image error:", e);
    res.status(500).json({ error: "Failed to serve QR image" });
  }
});

// ─── Admin: regenerate QR (re-encode same route URL) ────────────────────────
qrAdminRouter.post("/:id/regenerate", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid route id" });
      return;
    }
    const route = await storage.getQrRoute(id);
    if (!route) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    await generateQrForRoute(id);
    await storage.updateQrRoute(id, { qrCodePath: getRouteQrFilePath(id) });
    const updated = await storage.getQrRoute(id);
    const baseUrl = getQrBaseUrl();
    res.json({
      ...updated,
      routeUrl: `${baseUrl.replace(/\/$/, "")}/qr/${updated!.id}`,
    });
  } catch (e: unknown) {
    console.error("[QR Routes] regenerate error:", e);
    res.status(500).json({ error: "Failed to regenerate QR" });
  }
});

// ─── Admin: access log for route ───────────────────────────────────────────
qrAdminRouter.get("/:id/access-log", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid route id" });
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const { logs, total } = await storage.getQrAccessLog(id, page, limit);
    res.json({ logs, total });
  } catch (e: unknown) {
    console.error("[QR Routes] access-log error:", e);
    res.status(500).json({ error: "Failed to get access log" });
  }
});

// ─── Redirect: GET /qr/:id → firewall, log, 302 ──────────────────────────
qrRedirectRouter.get("/:id", async (req: Request, res: Response) => {
  const start = Date.now();
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(404).send("Not found");
    return;
  }
  const route = await storage.getQrRoute(id);
  if (!route) {
    res.status(404).send("Not found");
    return;
  }
  if (!route.isActive) {
    const responseMs = Date.now() - start;
    await logQrAccess({
      qrRouteId: id,
      ipAddress: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.get("user-agent") ?? undefined,
      referrer: req.get("referrer") ?? undefined,
      destination: route.destination ?? undefined,
      wasBlocked: true,
      responseMs,
    });
    res.status(404).send("Not found");
    return;
  }
  const ip = req.ip ?? req.socket?.remoteAddress;
  const ua = req.get("user-agent") ?? undefined;
  const firewall = await checkFirewall(id, ip, ua);
  if (firewall.blocked) {
    const responseMs = Date.now() - start;
    await logQrAccess({
      qrRouteId: id,
      ipAddress: ip,
      userAgent: ua,
      referrer: req.get("referrer") ?? undefined,
      destination: route.destination ?? undefined,
      wasBlocked: true,
      responseMs,
    });
    res.status(403).send("Forbidden");
    return;
  }
  const destination = route.destination?.trim() || null;
  if (!destination) {
    const responseMs = Date.now() - start;
    await logQrAccess({
      qrRouteId: id,
      ipAddress: ip,
      userAgent: ua,
      referrer: req.get("referrer") ?? undefined,
      destination: null,
      wasBlocked: false,
      responseMs,
    });
    res.status(404).send("No destination assigned");
    return;
  }
  await storage.incrementQrScanCount(id);
  const responseMs = Date.now() - start;
  await logQrAccess({
    qrRouteId: id,
    ipAddress: ip,
    userAgent: ua,
    referrer: req.get("referrer") ?? undefined,
    destination,
    wasBlocked: false,
    responseMs,
  });
  res.redirect(302, destination);
});

export { qrAdminRouter, qrRedirectRouter };
