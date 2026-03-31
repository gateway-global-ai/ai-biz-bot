import { Router } from "express";
import multer from "multer";
import { storage } from "../storage";
import { firstRouteParam } from "../utils/expressParams";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { GoogleWorkspaceService, createGoogleWorkspaceService, type GoogleWorkspaceCredentials } from "../mcp/googleWorkspace";
import {
  computeInsights, generateOwnerReport, generateMarketingSearch,
  formatOwnerReportForSms, formatOwnerReportForChat,
  formatMarketingReportForSms, formatMarketingReportForChat,
  lookupPlaceByName, milesToMeters,
  type ComputeInsightsRequest, type OwnerReportRequest, type MarketingSearchRequest
} from "../mcp/placesAggregate";
import {
  getAvailableApis, calculateCosts, generateRateLimits,
  generatePricingStrategy, compareApis, type ApiUsageScenario
} from "../mcp/googleApiAnalyst";
import { gatewayChat } from "../ai-gateway";
import { placesCache, CACHE_TTL } from "../placesCache";
import { workspaceConfigurations } from "@shared/schema";
import { getFreshPlaceId, getFreshPlaceIdWithSource } from "../services/placeDiscoveryService";
import { enrichBusinessData } from "../services/businessDataService";
import { enrichBusinessProfile } from "../services/enrichBusinessProfile";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── Google Workspace + Drive + Calendar + Tasks + Analyst ──────────────────────────────────────────────────────

  // ============ Google Workspace Integration (DB-backed by siteConfigId) ============

  async function getWorkspaceCredentialsBySiteConfigId(siteConfigId: string): Promise<GoogleWorkspaceCredentials | null> {
    const row = await db.query.workspaceConfigurations.findFirst({
      where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      columns: { accessToken: true, refreshToken: true, tokenExpiry: true },
    });
    if (!row?.accessToken) return null;
    return {
      accessToken: row.accessToken,
      refreshToken: row.refreshToken ?? undefined,
      expiryDate: row.tokenExpiry ? new Date(row.tokenExpiry).getTime() : undefined,
    };
  }

  // Check if Google Workspace is configured (env)
  router.get("/api/google/status", (req, res) => {
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    res.json({
      configured: hasClientId && hasClientSecret,
      hasClientId,
      hasClientSecret,
    });
  });

  // Workspace status for a site (DB)
  router.get("/api/workspace/status/:siteConfigId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const row = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });
      if (!row) {
        return res.json({ status: "disconnected", googleEmail: null, enabledApps: {} });
      }
      const enabledApps = (row.enabledApps as Record<string, boolean>) ?? {};
      res.json({
        status: row.status ?? "disconnected",
        googleEmail: row.googleEmail ?? null,
        enabledApps,
      });
    } catch (error: any) {
      console.error("Workspace status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // OAuth URL for connecting workspace (state = siteConfigId)
  router.get("/api/workspace/connect/:siteConfigId", (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const service = createGoogleWorkspaceService();
      const authUrl = service.getAuthUrl(siteConfigId);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Workspace connect URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy: Get Google Workspace OAuth URL (query siteConfigId)
  router.get("/api/google/auth-url", (req, res) => {
    try {
      const siteConfigId = (req.query.businessId ?? req.query.siteConfigId) as string | undefined;
      if (!siteConfigId || typeof siteConfigId !== "string") {
        return res.status(400).json({ error: "siteConfigId or businessId is required" });
      }
      const service = createGoogleWorkspaceService();
      const authUrl = service.getAuthUrl(siteConfigId);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Google auth URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Google OAuth callback (state = siteConfigId); persist tokens to DB
  router.get("/api/google/callback", async (req, res) => {
    try {
      const { code, state: siteConfigId } = req.query;
      if (!code || typeof code !== "string") {
        return res.status(400).send("Authorization code not provided");
      }
      if (!siteConfigId || typeof siteConfigId !== "string") {
        return res.status(400).send("State (siteConfigId) not provided");
      }
      const service = createGoogleWorkspaceService();
      const credentials = await service.exchangeCode(code);
      const tokenExpiry = credentials.expiryDate ? new Date(credentials.expiryDate) : null;
      const existing = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });
      if (existing) {
        await db.update(workspaceConfigurations)
          .set({
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken ?? null,
            tokenExpiry,
            authState: "valid",
            authErrorCode: null,
            authErrorDetail: null,
            degradedReason: null,
            lastAuthCheckedAt: new Date(),
            lastAuthRefreshSucceededAt: new Date(),
            status: "connected",
            statusMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
      } else {
        await db.insert(workspaceConfigurations).values({
          siteConfigId,
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken ?? null,
          tokenExpiry,
          authState: "valid",
          authErrorCode: null,
          authErrorDetail: null,
          degradedReason: null,
          lastAuthCheckedAt: new Date(),
          lastAuthRefreshSucceededAt: new Date(),
          status: "connected",
          updatedAt: new Date(),
        });
      }
      res.redirect(`/website-builder?google_connected=true&siteConfigId=${siteConfigId}`);
    } catch (error: any) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`/website-builder?google_error=${encodeURIComponent(error.message)}`);
    }
  });

  // Save workspace preferences (enabledApps, etc.)
  router.patch("/api/workspace/save/:siteConfigId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const { enabledApps, status } = req.body as { enabledApps?: Record<string, boolean>; status?: string };
      const existing = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (enabledApps !== undefined) updates.enabledApps = enabledApps;
      if (status !== undefined) updates.status = status;
      if (existing) {
        await db.update(workspaceConfigurations).set(updates as any).where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
      } else {
        await db.insert(workspaceConfigurations).values({
          siteConfigId,
          ...(enabledApps && { enabledApps }),
          ...(status && { status }),
          updatedAt: new Date(),
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Workspace save error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check if site has Google Workspace connected
  router.get("/api/workspace/connection/:siteConfigId", async (req, res) => {
    const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
    const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
    res.json({ connected: !!credentials });
  });

  router.get("/api/google/connection/:siteConfigId", async (req, res) => {
    const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
    const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
    res.json({ connected: !!credentials });
  });

  // Execute a Google Workspace tool
  router.post("/api/google/execute-tool", async (req, res) => {
    try {
      const { siteConfigId, toolName, args } = req.body as { siteConfigId?: string; businessId?: string; toolName: string; args?: Record<string, unknown> };
      const id = siteConfigId ?? (req.body as any).businessId;
      if (!id) {
        return res.status(400).json({ success: false, error: "siteConfigId is required" });
      }
      if (!toolName) {
        return res.status(400).json({ success: false, error: "toolName is required" });
      }
      const credentials = await getWorkspaceCredentialsBySiteConfigId(id);
      if (!credentials) {
        return res.status(401).json({
          success: false,
          error: "Google Workspace not connected for this site",
          requiresAuth: true,
        });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.executeTool(toolName, args || {});
      res.json(result);
    } catch (error: any) {
      console.error("Google tool execution error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Disconnect Google Workspace (clear tokens, keep row)
  router.delete("/api/workspace/connection/:siteConfigId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const existing = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });
      if (!existing) {
        return res.json({ success: true, wasConnected: false });
      }
      await db.update(workspaceConfigurations)
        .set({
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          authState: "missing_credentials",
          authErrorCode: null,
          authErrorDetail: null,
          degradedReason: "workspace_disconnected",
          lastAuthCheckedAt: new Date(),
          status: "disconnected",
          googleEmail: null,
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
      res.json({ success: true, wasConnected: true });
    } catch (error: any) {
      console.error("Workspace disconnect error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/google/connection/:siteConfigId", async (req, res) => {
    const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
    const existing = await db.query.workspaceConfigurations.findFirst({
      where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
    });
    if (!existing) return res.json({ success: true, wasConnected: false });
    await db.update(workspaceConfigurations)
      .set({
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        authState: "missing_credentials",
        authErrorCode: null,
        authErrorDetail: null,
        degradedReason: "workspace_disconnected",
        lastAuthCheckedAt: new Date(),
        status: "disconnected",
        googleEmail: null,
        updatedAt: new Date(),
      })
      .where(eq(workspaceConfigurations.siteConfigId, siteConfigId));
    res.json({ success: true, wasConnected: true });
  });

  // ============ Google Drive API ============

  router.get("/api/google/drive/drives/:siteConfigId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.listDrives();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get("/api/google/drive/files/:siteConfigId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const { folderId = 'root', pageToken, pageSize } = req.query;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.listDriveFiles(
        folderId as string,
        pageToken as string | undefined,
        pageSize ? parseInt(pageSize as string) : undefined
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/google/drive/folder/:siteConfigId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const { name, parentId } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Folder name is required" });
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.createDriveFolder(name, parentId || 'root');
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/google/drive/upload/:siteConfigId", upload.single('file'), async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const { parentId } = req.body;
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: "No file provided" });
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.uploadDriveFile(file.originalname, file.buffer, file.mimetype, parentId || 'root');
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete("/api/google/drive/files/:siteConfigId/:fileId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const fileId = firstRouteParam(req.params.fileId)!;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.deleteDriveFile(fileId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============ Google Calendar API ============

  router.get("/api/google/calendar/events/:siteConfigId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const { maxResults, timeMin } = req.query;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.listCalendarEvents(
        maxResults ? parseInt(maxResults as string) : 20,
        timeMin as string | undefined
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/google/calendar/events/:siteConfigId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const { summary, description, startTime, endTime, attendees } = req.body;
      if (!summary || !startTime || !endTime) {
        return res.status(400).json({ success: false, error: "summary, startTime, and endTime are required" });
      }
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.createCalendarEvent({ summary, description, startTime, endTime, attendees });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.patch("/api/google/calendar/events/:siteConfigId/:eventId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const eventId = firstRouteParam(req.params.eventId)!;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.updateCalendarEvent(eventId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete("/api/google/calendar/events/:siteConfigId/:eventId", async (req, res) => {
    try {
      const siteConfigId = firstRouteParam(req.params.siteConfigId)!;
      const eventId = firstRouteParam(req.params.eventId)!;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(siteConfigId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.deleteCalendarEvent(eventId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============ Google Tasks API ============

  router.get("/api/google/tasks/:businessId", async (req, res) => {
    try {
      const businessId = firstRouteParam(req.params.businessId)!;
      const { maxResults } = req.query;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(businessId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.listTasks(maxResults ? parseInt(maxResults as string) : 20);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/google/tasks/:businessId", async (req, res) => {
    try {
      const businessId = firstRouteParam(req.params.businessId)!;
      const { title, notes, dueDate } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, error: "title is required" });
      }
      const credentials = await getWorkspaceCredentialsBySiteConfigId(businessId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.createTask({ title, notes, dueDate });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.patch("/api/google/tasks/:businessId/:taskId", async (req, res) => {
    try {
      const businessId = firstRouteParam(req.params.businessId)!;
      const taskId = firstRouteParam(req.params.taskId)!;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(businessId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.updateTask(taskId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete("/api/google/tasks/:businessId/:taskId", async (req, res) => {
    try {
      const businessId = firstRouteParam(req.params.businessId)!;
      const taskId = firstRouteParam(req.params.taskId)!;
      const credentials = await getWorkspaceCredentialsBySiteConfigId(businessId);
      if (!credentials) {
        return res.status(401).json({ success: false, error: "Google Workspace not connected", requiresAuth: true });
      }
      const service = createGoogleWorkspaceService(credentials);
      const result = await service.deleteTask(taskId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============ Places Aggregate API - Business Reports ============

  router.post("/api/reports/compute-insights", async (req, res) => {
    try {
      const { request: insightRequest } = req.body;

      if (!insightRequest || !insightRequest.filter) {
        return res.status(400).json({ success: false, error: "request with filter is required" });
      }

      const result = await computeInsights(insightRequest);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("[Places Aggregate] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/reports/business-report", async (req, res) => {
    try {
      const { mode, businessName, address, category, radiusMiles, latitude, longitude, minRating, maxRating, priceLevels } = req.body;

      if (mode === 'marketing') {
        if (!category) {
          return res.status(400).json({ success: false, error: "category is required for marketing search" });
        }
        const report = await generateMarketingSearch({
          mode: 'marketing',
          address: address || businessName,
          latitude,
          longitude,
          category,
          radiusMiles,
          minRating,
          maxRating,
          priceLevels
        });
        res.json({
          success: true,
          report,
          formatted: {
            chat: formatMarketingReportForChat(report),
            sms: formatMarketingReportForSms(report)
          }
        });
      } else {
        const name = businessName || address;
        if (!name) {
          return res.status(400).json({ success: false, error: "businessName is required" });
        }
        const report = await generateOwnerReport({
          mode: 'owner',
          businessName: name,
          radiusMiles
        });
        res.json({
          success: true,
          report,
          formatted: {
            chat: formatOwnerReportForChat(report),
            sms: formatOwnerReportForSms(report)
          }
        });
      }
    } catch (error: any) {
      console.error("[Business Report] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/reports/lookup-place", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: "name is required" });
      }
      const place = await lookupPlaceByName(name);
      if (!place) {
        return res.status(404).json({ success: false, error: `No place found for "${name}"` });
      }
      res.json({ success: true, place });
    } catch (error: any) {
      console.error("[Place Lookup] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Google API Analyst routes
  router.get("/api/google-analyst/apis", async (_req, res) => {
    res.json({ success: true, apis: getAvailableApis() });
  });

  router.post("/api/google-analyst/calculate-costs", async (req, res) => {
    try {
      const { scenarios } = req.body as { scenarios: ApiUsageScenario[] };
      if (!scenarios || !Array.isArray(scenarios)) {
        return res.status(400).json({ success: false, error: "scenarios array is required" });
      }
      const result = calculateCosts(scenarios);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/google-analyst/analyze", async (req, res) => {
    try {
      const { question, scenarios, conversationHistory } = req.body;
      if (!question) {
        return res.status(400).json({ success: false, error: "question is required" });
      }

      let context = question;
      if (scenarios && Array.isArray(scenarios)) {
        const costs = calculateCosts(scenarios);
        context += `\n\nCurrent usage data:\n${JSON.stringify(costs, null, 2)}`;
      }

      // Sovereign: Use gatewayChat instead of analyzeWithKimi (Kimi decommissioned)
      const { response: analysis } = await gatewayChat({
        messages: [
          { role: 'system', content: 'You are a Google API cost optimization expert. Provide detailed analysis.' },
          { role: 'user', content: context }
        ],
      });

      res.json({ success: true, analysis });
    } catch (error: any) {
      console.error("[Google API Analyst] Analysis error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/google-analyst/rate-limits", async (req, res) => {
    try {
      const { scenarios, monthlyBudget } = req.body;
      if (!scenarios || !monthlyBudget) {
        return res.status(400).json({ success: false, error: "scenarios and monthlyBudget are required" });
      }
      const recommendations = await generateRateLimits(scenarios, monthlyBudget);
      res.json({ success: true, recommendations });
    } catch (error: any) {
      console.error("[Google API Analyst] Rate limits error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/google-analyst/pricing-strategy", async (req, res) => {
    try {
      const { services, targetMargin } = req.body;
      if (!services || !Array.isArray(services)) {
        return res.status(400).json({ success: false, error: "services array is required" });
      }
      const strategy = await generatePricingStrategy(services, targetMargin || 60);
      res.json({ success: true, strategy });
    } catch (error: any) {
      console.error("[Google API Analyst] Pricing strategy error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/api/google-analyst/compare", async (req, res) => {
    try {
      const { useCase, apiIds } = req.body;
      if (!useCase || !apiIds || !Array.isArray(apiIds)) {
        return res.status(400).json({ success: false, error: "useCase and apiIds array are required" });
      }
      const comparison = await compareApis(useCase, apiIds);
      res.json({ success: true, comparison });
    } catch (error: any) {
      console.error("[Google API Analyst] Compare error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get telephony config
  // ← extracted to server/routes/telephonyRoutes.ts


export default router;
