import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerVlmRoutes } from "./vlm-routes";
import { registerAgentRoutes } from "./agents/agent-routes";
import { registerWorkspaceOnboardingRoutes } from "./routes/workspace-onboarding";
import knowledgeRoutes from "./routes/knowledge-routes";
import businessRoutes from "./routes/businessRoutes";
import siteConfigRoutes from "./routes/siteConfigRoutes";
import { registerMenuRoutes } from "./routes/menu-routes";
import healthRoutes from "./routes/healthRoutes";
import { registerInquiryRoutes } from "./routes/inquiry-routes";
import { registerB2bRoutes } from "./routes/b2b-routes";
import twilio from "twilio";
import { 
  searchAvailableNumbers, 
  provisionPhoneNumber, 
  releasePhoneNumber, 
  updatePhoneNumberWebhooks,
  getIncomingPhoneNumbers,
  sendSms,
  makeCall,
  getCallLogs as getTwilioCallLogs,
  getMessageLogs,
  updateCallerIdName,
  getTwilioFromPhoneNumber,
  getTwilioClient
} from "./twilio";
import { insertTelephonyConfigSchema, insertCallLogSchema, insertAgentSchema, insertCustomerSchema, DISC_WORD_SETS, DISC_STYLE_DESCRIPTIONS, PLAN_LIMITS, type DiscRanking, type DiscAssessmentResult } from "@shared/schema";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chat, generateSmsResponse, KIMI_MODELS } from "./kimi";
import { sendOtp, verifyOtp, verifySession, logout } from "./auth";
import { customerSendOtp, customerVerifyOtp, customerVerifySession, customerLogout, customerUpdateProfile, customerGetBusinesses, customerClaimBusiness } from "./customerAuth";
import { runDemoEnrichment } from "./services/demo-enrichment";
import { generateFullReport } from "./services/reviewAnalysisService";
import { enrichBusinessData } from "./services/businessDataService";
import { buildRichSystemInstruction } from "./services/systemInstructionBuilder";
import { getFreshPlaceId, getFreshPlaceIdWithSource } from "./services/placeDiscoveryService";
import { enrichBusinessProfile } from "./services/enrichBusinessProfile";
import { getMCPTools, handleMCPToolCall, MOONSHOT_MODEL, HUGGINGFACE_KIMI_K2_MODEL, type ModelOptions } from "./mcp/kimiK2Server";
import { GoogleWorkspaceService, createGoogleWorkspaceService, type GoogleWorkspaceCredentials } from "./mcp/googleWorkspace";
import { computeInsights, generateOwnerReport, generateMarketingSearch, formatOwnerReportForSms, formatOwnerReportForChat, formatMarketingReportForSms, formatMarketingReportForChat, lookupPlaceByName, milesToMeters, type ComputeInsightsRequest, type OwnerReportRequest, type MarketingSearchRequest } from "./mcp/placesAggregate";
import { getAvailableApis, calculateCosts, analyzeWithKimi, generateRateLimits, generatePricingStrategy, compareApis, type ApiUsageScenario } from "./mcp/googleApiAnalyst";
import { placesCache, CACHE_TTL } from "./placesCache";
import crypto from "crypto";

const updateConfigSchema = z.object({
  phoneNumber: z.string().nullable().optional(),
  phoneSid: z.string().nullable().optional(),
  friendlyName: z.string().nullable().optional(),
  messagingServiceSid: z.string().nullable().optional(),
  voiceUrl: z.string().url().nullable().optional().or(z.literal('')),
  voiceFallbackUrl: z.string().url().nullable().optional().or(z.literal('')),
  statusCallbackUrl: z.string().url().nullable().optional().or(z.literal('')),
  smsUrl: z.string().url().nullable().optional().or(z.literal('')),
  smsFallbackUrl: z.string().url().nullable().optional().or(z.literal('')),
  errorUrl: z.string().url().nullable().optional().or(z.literal('')),
  firewallEnabled: z.boolean().optional(),
  allowedNumbers: z.array(z.string()).optional(),
  maxCallDuration: z.number().min(1).max(180).optional(),
  timeout: z.number().min(5).max(120).optional(),
  callerIdName: z.string().nullable().optional(),
}).partial();

const firewallUpdateSchema = z.object({
  firewallEnabled: z.boolean().optional(),
  allowedNumbers: z.array(z.string()).optional(),
  ownerPhone: z.string().nullable().optional(),
  ownerEmail: z.string().email().nullable().optional().or(z.literal('')),
});

const webhooksUpdateSchema = z.object({
  phoneSid: z.string(),
  voiceUrl: z.string().url().optional().or(z.literal('')),
  voiceFallbackUrl: z.string().url().optional().or(z.literal('')),
  statusCallback: z.string().url().optional().or(z.literal('')),
  smsUrl: z.string().url().optional().or(z.literal('')),
  smsFallbackUrl: z.string().url().optional().or(z.literal('')),
});

const SOCIAL_CRAWLER_UA = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Pinterest|Googlebot|bingbot|Discordbot|vkShare/i;

const DEFAULT_OG: Record<string, string> = {
  ogTitle: "Free Custom Websites, AI Voice and Chat Enabled",
  ogDescription: "We support small business owners with free websites, enabled with voice AI agents, AI chat bots, and beautiful modern designs. Websites are free. No Credit card required.",
  ogUrl: "http://aibizbot.gatewayglobal.ai",
  ogImage: "http://aibizbot.gatewayglobal.ai/og-image.png",
  ogType: "website",
  ogSiteName: "AI Biz Bot by Gateway Global",
  twitterCard: "summary_large_image",
};

function buildOgHtml(og: Record<string, string>): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>${og.ogTitle || DEFAULT_OG.ogTitle}</title>
<meta name="description" content="${og.ogDescription || DEFAULT_OG.ogDescription}"/>
<meta property="og:title" content="${og.ogTitle || DEFAULT_OG.ogTitle}"/>
<meta property="og:description" content="${og.ogDescription || DEFAULT_OG.ogDescription}"/>
<meta property="og:url" content="${og.ogUrl || DEFAULT_OG.ogUrl}"/>
<meta property="og:image" content="${og.ogImage || DEFAULT_OG.ogImage}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:type" content="${og.ogType || DEFAULT_OG.ogType}"/>
<meta property="og:site_name" content="${og.ogSiteName || DEFAULT_OG.ogSiteName}"/>
<meta name="twitter:card" content="${og.twitterCard || DEFAULT_OG.twitterCard}"/>
<meta name="twitter:title" content="${og.ogTitle || DEFAULT_OG.ogTitle}"/>
<meta name="twitter:description" content="${og.ogDescription || DEFAULT_OG.ogDescription}"/>
<meta name="twitter:image" content="${og.ogImage || DEFAULT_OG.ogImage}"/>
</head><body></body></html>`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  function isAdminAuthenticated(req: any): boolean {
    const adminSession = req.headers?.["x-admin-token"];
    if (adminSession) return true;
    const cookieHeader: string | undefined = req.headers?.cookie;
    const sessionCookie = cookieHeader?.split(";").find((c) => c.trim().startsWith("admin_session="));
    return !!sessionCookie;
  }

  // Health check route (public)
  app.use(healthRoutes);

  app.use(async (req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (!SOCIAL_CRAWLER_UA.test(ua)) return next();
    if (req.path.startsWith("/api/") || req.path.startsWith("/assets/") || req.path.match(/\.\w+$/)) return next();

    try {
      const pagePath = req.path === "/" ? "/" : req.path.replace(/\/$/, "");
      const dbOg = await storage.getOgSettingsByPath(pagePath);
      const og = dbOg ? {
        ogTitle: dbOg.ogTitle,
        ogDescription: dbOg.ogDescription,
        ogUrl: dbOg.ogUrl || DEFAULT_OG.ogUrl,
        ogImage: dbOg.ogImage || DEFAULT_OG.ogImage,
        ogType: dbOg.ogType || DEFAULT_OG.ogType,
        ogSiteName: dbOg.ogSiteName || DEFAULT_OG.ogSiteName,
        twitterCard: dbOg.twitterCard || DEFAULT_OG.twitterCard,
      } : DEFAULT_OG;
      res.status(200).set({ "Content-Type": "text/html" }).end(buildOgHtml(og));
    } catch (err) {
      console.error("[OG] Crawler middleware error:", err);
      res.status(200).set({ "Content-Type": "text/html" }).end(buildOgHtml(DEFAULT_OG));
    }
  });

  // Admin Auth routes
  app.post("/api/auth/send-otp", sendOtp);
  app.post("/api/auth/verify-otp", verifyOtp);
  app.get("/api/auth/session", verifySession);
  app.post("/api/auth/logout", logout);

  // Plans endpoint (public - accessible by AI agents, dashboard, and external consumers)
  app.get("/api/plans", (_req, res) => {
    res.json({ plans: PLAN_LIMITS });
  });

  // Customer Auth routes (separate from admin)
  app.post("/api/customer/send-otp", customerSendOtp);
  app.post("/api/customer/verify-otp", customerVerifyOtp);
  app.get("/api/customer/session", customerVerifySession);
  app.post("/api/customer/logout", customerLogout);
  app.patch("/api/customer/profile", customerUpdateProfile);
  app.get("/api/customer/businesses", customerGetBusinesses);
  app.post("/api/customer/claim-business", customerClaimBusiness);

  // ============ Demo Lead / Magic Link Onboarding ============

  function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  }

  const demoCreateSchema = z.object({
    phone: z.string().min(7).max(20),
    businessName: z.string().min(1).max(500),
    businessAddress: z.string().max(500).optional().nullable(),
    placeId: z.string().max(200).optional().nullable(),
    placeData: z.any().optional().nullable(),
  });

  app.post("/api/demo/create", async (req, res) => {
    try {
      const parsed = demoCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Phone number and business name are required" });
      }
      const { phone, businessName, businessAddress, placeId, placeData } = parsed.data;

      const normalizedPhone = normalizePhone(phone);
      const magicToken = crypto.randomBytes(32).toString("hex");
      const magicTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const lead = await storage.createDemoLead({
        phone: normalizedPhone,
        businessName,
        businessAddress: businessAddress || null,
        placeId: placeId || null,
        placeData: placeData || null,
        magicToken,
        magicTokenExpiresAt,
        magicTokenUsed: false,
        demoStartedAt: new Date(),
        demoReadyAt: null,
        status: "preview",
        name: null,
      });

      let existingSite: any = null;
      if (placeId) {
        existingSite = await storage.getSiteConfigByPlaceId(placeId);
      }
      if (!existingSite) {
        const customerAccount = await storage.getCustomerAccountByPhone(normalizedPhone);

        const domain = businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 50);

        const siteConfig = await storage.createSiteConfig({
          name: businessName,
          domain,
          placeId: placeId || null,
          placeData: placeData || null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "kimi",
        });
        console.log(`[Demo] Created site_config ${siteConfig.id} for "${businessName}"${customerAccount ? ` (linked to customer ${customerAccount.id})` : " (no customer account yet)"}`);
      }

      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const magicLink = `${protocol}://${host}/demo?token=${magicToken}`;

      const fromNumber = await getTwilioFromPhoneNumber();
      if (fromNumber) {
        await sendSms(
          normalizedPhone,
          `Welcome to Gateway Global AI!\n\nYour free AI-powered website for "${businessName}" is being built right now.\n\nClick here to access your site anytime:\n${magicLink}\n\nNo login needed - this link is your key.`,
          fromNumber
        );
      }

      res.json({
        success: true,
        leadId: lead.id,
        magicToken,
        magicLink,
        smsSent: !!fromNumber,
      });
    } catch (error: any) {
      console.error("[Demo] Create error:", error);
      res.status(500).json({ error: error.message || "Failed to create demo" });
    }
  });

  const requestAccessSchema = z.object({
    phone: z.string().min(7).max(20),
    businessName: z.string().min(1).max(500),
    businessAddress: z.string().max(500).optional().nullable(),
    placeId: z.string().max(200).optional().nullable(),
    placeData: z.any().optional().nullable(),
  });

  app.post("/api/demo/request-access", async (req, res) => {
    try {
      const parsed = requestAccessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Phone number and business name are required" });
      }
      const { phone, businessName, businessAddress, placeId, placeData } = parsed.data;
      const normalizedPhone = normalizePhone(phone);

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.createOtpCode({ phone: normalizedPhone, code, expiresAt });

      const magicToken = crypto.randomBytes(32).toString("hex");
      const lead = await storage.createDemoLead({
        phone: normalizedPhone,
        businessName,
        businessAddress: businessAddress || null,
        placeId: placeId || null,
        placeData: placeData || null,
        magicToken,
        magicTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        magicTokenUsed: false,
        demoStartedAt: new Date(),
        demoReadyAt: null,
        status: "preview",
        name: null,
      });

      let existingSite = placeId ? await storage.getSiteConfigByPlaceId(placeId) : null;
      if (!existingSite) {
        const customerAccount = await storage.getCustomerAccountByPhone(normalizedPhone);
        const domain = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
        await storage.createSiteConfig({
          name: businessName,
          domain,
          placeId: placeId || null,
          placeData: placeData || null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "kimi",
        });
      }

      const fromNumber = await getTwilioFromPhoneNumber();
      if (fromNumber) {
        await sendSms(
          normalizedPhone,
          `Your Gateway verification code is: ${code}\n\nThis code expires in 5 minutes.`,
          fromNumber
        );
      }

      res.json({
        success: true,
        leadId: lead.id,
        phone: normalizedPhone.slice(-4),
      });
    } catch (error: any) {
      console.error("[Demo] Request access error:", error);
      res.status(500).json({ error: error.message || "Failed to send code" });
    }
  });

  const verifyAndEnrichSchema = z.object({
    leadId: z.string(),
    phone: z.string().min(7).max(20),
    code: z.string().length(6),
  });

  app.post("/api/demo/verify-and-enrich", async (req, res) => {
    try {
      const parsed = verifyAndEnrichSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "leadId, phone, and 6-digit code are required" });
      }
      const { leadId, phone, code } = parsed.data;
      const normalizedPhone = normalizePhone(phone);

      const otpRecord = await storage.getValidOtpCode(normalizedPhone, code);
      if (!otpRecord) {
        return res.status(401).json({ error: "Invalid or expired verification code" });
      }
      await storage.markOtpUsed(otpRecord.id);

      let account = await storage.getCustomerAccountByPhone(normalizedPhone);
      if (!account) {
        account = await storage.createCustomerAccount({ phone: normalizedPhone, plan: "free" });
      }
      if (!account.isActive) {
        return res.status(403).json({ error: "Account deactivated" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createCustomerSession({ customerAccountId: account.id, token, expiresAt });
      await storage.updateCustomerAccountLastLogin(account.id);

      try {
        const claimed = await storage.claimUnlinkedSitesByPhone(account.phone, account.id);
        if (claimed > 0) console.log(`[Demo] Auto-claimed ${claimed} site(s) for customer ${account.id}`);
      } catch (_) {}

      const lead = await storage.getDemoLead(leadId);
      if (!lead) {
        return res.status(404).json({ error: "Demo not found" });
      }

      const placeData = (lead.placeData || {}) as any;
      const site = lead.placeId ? await storage.getSiteConfigByPlaceId(lead.placeId) : null;
      if (site && (placeData.name || lead.businessName)) {
        const geo = placeData.geometry;
        const primaryType =
          placeData.types && Array.isArray(placeData.types)
            ? placeData.types.filter(
                (t: string) => t && t !== "point_of_interest" && t !== "establishment"
              )[0]
            : undefined;
        const enriched = await runDemoEnrichment({
          name: placeData.name || lead.businessName,
          address: placeData.formatted_address || lead.businessAddress || undefined,
          website: placeData.website || placeData.url,
          types: placeData.types,
          reviews: placeData.reviews,
          formatted_phone_number: placeData.formatted_phone_number,
          rating: placeData.rating,
          user_ratings_total: placeData.user_ratings_total,
          latitude: typeof geo?.lat === "number" ? geo.lat : undefined,
          longitude: typeof geo?.lng === "number" ? geo.lng : undefined,
          primaryType: primaryType || undefined,
          placeId: lead.placeId || placeData.place_id || undefined,
        });
        const updatedPlaceData = { ...placeData, enriched };
        await storage.updateSiteConfig(site.id, {
          placeData: updatedPlaceData,
          systemPromptOverride: enriched.systemPromptOverride,
        } as any);
      }

      await storage.updateDemoLead(leadId, { status: "ready", demoReadyAt: new Date() } as any);

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
      console.error("[Demo] Verify-and-enrich error:", error);
      res.status(500).json({ error: error.message || "Failed to verify" });
    }
  });

  app.get("/api/demo/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const lead = await storage.getDemoLeadByToken(token);

      if (!lead) {
        return res.status(404).json({ error: "Invalid or expired link" });
      }

      if (lead.magicTokenExpiresAt < new Date()) {
        return res.status(410).json({ error: "This link has expired" });
      }

      if (!lead.magicTokenUsed) {
        await storage.updateDemoLead(lead.id, { magicTokenUsed: true } as any);
      }

      res.json({
        success: true,
        lead: {
          id: lead.id,
          businessName: lead.businessName,
          businessAddress: lead.businessAddress,
          placeId: lead.placeId,
          placeData: lead.placeData,
          status: lead.status,
          name: lead.name,
          demoStartedAt: lead.demoStartedAt,
          demoReadyAt: lead.demoReadyAt,
        },
      });
    } catch (error: any) {
      console.error("[Demo] Verify error:", error);
      res.status(500).json({ error: error.message || "Failed to verify link" });
    }
  });

  app.post("/api/admin/backfill-sites", async (req, res) => {
    try {
      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const allLeads = await storage.getAllDemoLeads();
      let created = 0;
      let skipped = 0;
      for (const lead of allLeads) {
        if (lead.placeId) {
          const existing = await storage.getSiteConfigByPlaceId(lead.placeId);
          if (existing) {
            skipped++;
            continue;
          }
        }
        const customerAccount = lead.phone ? await storage.getCustomerAccountByPhone(lead.phone) : null;
        const domain = lead.businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 50);

        await storage.createSiteConfig({
          name: lead.businessName,
          domain,
          placeId: lead.placeId || null,
          placeData: lead.placeData || null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${lead.businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "kimi",
        });
        created++;
      }
      res.json({ success: true, created, skipped, total: allLeads.length });
    } catch (error: any) {
      console.error("[Backfill] Error:", error);
      res.status(500).json({ error: error.message || "Backfill failed" });
    }
  });

  // ===================== Admin System Health Report =====================
  // Runs dependency checks and BI pipeline checks (aligned with tests/test-bi-pipeline.ts).
  app.get("/api/admin/health-report", async (req, res) => {
    try {
      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }

      const defaultPlaceId = "ChIJB4qU6oXvJIgR_2p602OaK_U";
      const placeId =
        (typeof req.query.placeId === "string" && req.query.placeId) ||
        process.env.TEST_PLACE_ID ||
        defaultPlaceId;
      const businessName =
        (typeof req.query.businessName === "string" && req.query.businessName) ||
        process.env.TEST_BUSINESS_NAME ||
        "Boardwalk Suites Lafayette";

      const serpKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
      const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;
      const hasValidPlaceId = placeId.length > 20 && !placeId.includes("...");

      const dependencyChecks: Array<{ name: string; status: "ok" | "missing" | "error"; message?: string }> = [
        { name: "SERP_API_KEY", status: serpKey ? "ok" : "missing", message: serpKey ? undefined : "Set SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY" },
        { name: "GOOGLE_MAPS_API_KEY", status: googleMapsKey ? "ok" : "missing", message: googleMapsKey ? undefined : "Set GOOGLE_MAPS_API_KEY (or GOOGLE_API_KEY)" },
        { name: "GEMINI_API_KEY", status: geminiKey ? "ok" : "missing", message: geminiKey ? undefined : "Set GEMINI_API_KEY" },
        { name: "TEST_PLACE_ID", status: hasValidPlaceId ? "ok" : "error", message: hasValidPlaceId ? undefined : `Invalid TEST_PLACE_ID format (${placeId})` },
      ];

      const pipelineChecks: Array<{
        name: string;
        status: "pass" | "fail" | "skip";
        message?: string;
        detail?: Record<string, unknown>;
      }> = [];

      const rawMessages: string[] = [];
      const log = (msg: string) => rawMessages.push(msg);

      let enrichmentFailedDueTo404 = false;
      let suggestedPlaceId: string | null = null;

      // Test 1: Review Mining & SWOT Generation (SERP API + Gemini)
      if (!serpKey) {
        pipelineChecks.push({
          name: "Review Mining & SWOT Generation",
          status: "skip",
          message: "SERP API key not set (SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY)",
        });
      } else if (!geminiKey) {
        pipelineChecks.push({
          name: "Review Mining & SWOT Generation",
          status: "skip",
          message: "GEMINI_API_KEY not set (required to analyze reviews)",
        });
      } else {
        try {
          const report = await generateFullReport(placeId, businessName);
          if (!report) throw new Error("Report is null");
          if (!report.executive_summary || report.executive_summary.length === 0) {
            throw new Error("Executive summary is missing or empty");
          }
          if (!report.cinematic_narrative || !report.cinematic_narrative.landing) {
            throw new Error("Cinematic narrative landing is missing");
          }
          const amenityCount = report.amenity_list?.length ?? 0;
          const blindSpotCount = report.owner_insights?.blind_spots?.length ?? 0;
          if (amenityCount === 0) log("WARN: Amenity list empty");
          if (blindSpotCount === 0) log("WARN: Blind spots empty");

          pipelineChecks.push({
            name: "Review Mining & SWOT Generation",
            status: "pass",
            detail: {
              executiveSummaryPreview: report.executive_summary.substring(0, 140),
              amenities: amenityCount,
              blindSpots: blindSpotCount,
            },
          });
        } catch (error: any) {
          pipelineChecks.push({
            name: "Review Mining & SWOT Generation",
            status: "fail",
            message: error?.message || "Failed to generate SWOT report",
          });
        }
      }

      // Test 2: Enriched Business Data (Places API New)
      let placesOk = false;
      if (!googleMapsKey) {
        pipelineChecks.push({
          name: "Enriched Business Data",
          status: "skip",
          message: "GOOGLE_MAPS_API_KEY not set",
        });
      } else if (!hasValidPlaceId) {
        pipelineChecks.push({
          name: "Enriched Business Data",
          status: "skip",
          message: "TEST_PLACE_ID invalid format",
        });
      } else {
        try {
          const enriched = await enrichBusinessData(placeId, {
            includeIntelligence: true,
            includeOwnerData: false,
            businessName,
          });
          if (!enriched?.general) throw new Error("Enriched data missing general section");
          if (!enriched.general.name || !enriched.general.placeId) throw new Error("General business data incomplete");
          placesOk = true;
          pipelineChecks.push({
            name: "Enriched Business Data",
            status: "pass",
            detail: {
              placeId: enriched.general.placeId,
              name: enriched.general.name,
              hasIntelligence: !!enriched.intelligence,
            },
          });
        } catch (error: any) {
          if (error?.response?.status === 404) {
            enrichmentFailedDueTo404 = true;
            suggestedPlaceId = await getFreshPlaceId(businessName);
            pipelineChecks.push({
              name: "Enriched Business Data",
              status: "fail",
              message: "Place ID is obsolete or invalid for Places API (New). Refresh the ID to fix.",
              detail: {
                placeId,
                obsoletePlaceId: true,
                suggestion: "Search for New ID",
                ...(suggestedPlaceId ? { suggestedPlaceId } : {}),
              },
            });
          } else {
            pipelineChecks.push({
              name: "Enriched Business Data",
              status: "fail",
              message: error?.message || "Failed to enrich business data",
            });
          }
        }
      }

      // Test 3: System Instruction Building (requires Places success for BI section)
      if (!googleMapsKey) {
        pipelineChecks.push({
          name: "System Instruction Building",
          status: "skip",
          message: "GOOGLE_MAPS_API_KEY not set",
        });
      } else if (!hasValidPlaceId) {
        pipelineChecks.push({
          name: "System Instruction Building",
          status: "skip",
          message: "TEST_PLACE_ID invalid format",
        });
      } else if (!placesOk) {
        if (enrichmentFailedDueTo404) {
          pipelineChecks.push({
            name: "System Instruction Building",
            status: "fail",
            message: "Enrichment failed due to obsolete Place ID (see Enriched Business Data). Refresh the ID to fix.",
            detail: {
              obsoletePlaceId: true,
              suggestion: "Search for New ID",
              ...(suggestedPlaceId ? { suggestedPlaceId } : {}),
            },
          });
        } else {
          pipelineChecks.push({
            name: "System Instruction Building",
            status: "skip",
            message: "Skipped because Places enrichment did not succeed (see Enriched Business Data)",
          });
        }
      } else {
        try {
          const instruction = await buildRichSystemInstruction(
            { placeId, name: businessName, address: "Admin health check" } as any,
            {
              role: "Business Assistant",
              personality: "Helpful and professional",
              objectives: ["Assist customers with business information"],
              constraints: ["Be polite and professional"],
            } as any,
            { includeIntelligence: true, includeTourNarrative: true }
          );
          if (!instruction || instruction.length === 0) throw new Error("Instruction is empty");
          if (!instruction.includes(businessName)) throw new Error("Instruction does not include business name");
          if (!instruction.includes("BUSINESS INTELLIGENCE")) {
            throw new Error("Instruction missing BUSINESS INTELLIGENCE section");
          }
          pipelineChecks.push({
            name: "System Instruction Building",
            status: "pass",
            detail: { length: instruction.length },
          });
        } catch (error: any) {
          pipelineChecks.push({
            name: "System Instruction Building",
            status: "fail",
            message: error?.message || "Failed to build rich system instruction",
          });
        }
      }

      const passed = pipelineChecks.filter((c) => c.status === "pass").length;
      const failed = pipelineChecks.filter((c) => c.status === "fail").length;
      const skipped = pipelineChecks.filter((c) => c.status === "skip").length;

      res.json({
        timestamp: new Date().toISOString(),
        params: { placeId, businessName },
        dependencyChecks,
        pipelineChecks,
        summary: { passed, failed, skipped },
        rawMessages,
      });
    } catch (error: any) {
      console.error("[AdminHealthReport] Error:", error);
      res.status(500).json({ error: error?.message || "Failed to run health report" });
    }
  });

  // Admin: resolve fresh Place ID for a search signature (for "Search for New ID" in System Health UI).
  app.post("/api/admin/place-discovery", async (req, res) => {
    try {
      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      const body = req.body as { searchSignature?: string };
      const searchSignature =
        typeof body?.searchSignature === "string" ? body.searchSignature.trim() : "";
      if (!searchSignature) {
        return res.status(400).json({ error: "searchSignature is required" });
      }
      const result = await getFreshPlaceIdWithSource(searchSignature);
      res.json({
        placeId: result.placeId,
        source: result.source,
      });
    } catch (error: any) {
      console.error("[AdminPlaceDiscovery] Error:", error);
      res.status(500).json({ error: error?.message || "Place discovery failed" });
    }
  });

  /**
   * Admin: manually trigger business enrichment snapshots via SerpApi.
   *
   * POST /api/admin/enrich-business
   * Body: { platformId: string; maxReviews?: number; force?: boolean }
   *
   * Stores raw SerpApi payloads to platform_business_enrichment_snapshots.
   * Admin-only; never called by voice assistant path.
   */
  // Simple in-memory rate limiter for the enrichment endpoint (expensive SerpApi calls).
  const enrichRateLimits = new Map<string, { count: number; resetTime: number }>();
  const ENRICH_RATE_LIMIT = 10; // requests per minute per IP
  const ENRICH_RATE_WINDOW = 60_000; // 1 minute in ms

  app.post("/api/admin/enrich-business", async (req, res) => {
    try {
      // Rate limiting (checked before auth to prevent brute-force)
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const rateInfo = enrichRateLimits.get(clientIp);
      if (rateInfo) {
        if (now > rateInfo.resetTime) {
          enrichRateLimits.set(clientIp, { count: 1, resetTime: now + ENRICH_RATE_WINDOW });
        } else if (rateInfo.count >= ENRICH_RATE_LIMIT) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        } else {
          rateInfo.count++;
        }
      } else {
        enrichRateLimits.set(clientIp, { count: 1, resetTime: now + ENRICH_RATE_WINDOW });
      }

      if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ error: "Admin authentication required" });
      }

      const schema = z.object({
        platformId: z.string().min(1),
        maxReviews: z.number().int().min(1).max(500).optional(),
        force: z.boolean().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const result = await enrichBusinessProfile(parsed.data);
      const httpStatus = result.status === "failed" ? 422 : 200;
      res.status(httpStatus).json(result);
    } catch (error: any) {
      console.error("[AdminEnrichBusiness] Error:", error);
      res.status(500).json({ error: error?.message || "Enrichment failed" });
    }
  });

  app.post("/api/demo/:id/update-name", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      const updated = await storage.updateDemoLead(id, { name, status: "ready" } as any);
      if (!updated) {
        return res.status(404).json({ error: "Demo not found" });
      }
      res.json({ success: true, lead: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update" });
    }
  });

  // Gemini API key endpoint (for client-side Gemini Live)
  app.get("/api/gemini-key", (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }
    res.json({ apiKey });
  });

  // ============ Google Places Details (comprehensive) ============
  app.get("/api/places/details/:placeId", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }
      const { placeId } = req.params;
      const fields = [
        'name', 'formatted_address', 'formatted_phone_number', 'international_phone_number',
        'website', 'url', 'rating', 'user_ratings_total', 'price_level', 'business_status',
        'types', 'opening_hours', 'geometry', 'vicinity', 'utc_offset',
        'address_components', 'plus_code', 'icon', 'icon_mask_base_uri', 'icon_background_color',
        'wheelchair_accessible_entrance', 'delivery', 'dine_in', 'takeout', 'curbside_pickup',
        'reservable', 'serves_beer', 'serves_wine', 'serves_breakfast', 'serves_lunch',
        'serves_dinner', 'serves_brunch', 'serves_vegetarian_food',
        'editorial_summary', 'reviews', 'photos'
      ].join(',');
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status !== 'OK') {
        return res.status(400).json({ error: data.status, reviews: [] });
      }
      const result = data.result || {};
      res.json({
        reviews: result.reviews || [],
        user_ratings_total: result.user_ratings_total || 0,
        rating: result.rating || 0,
        price_level: result.price_level,
        business_status: result.business_status,
        url: result.url,
        vicinity: result.vicinity,
        utc_offset: result.utc_offset,
        international_phone_number: result.international_phone_number,
        address_components: result.address_components,
        plus_code: result.plus_code,
        editorial_summary: result.editorial_summary?.overview || null,
        wheelchair_accessible_entrance: result.wheelchair_accessible_entrance,
        delivery: result.delivery,
        dine_in: result.dine_in,
        takeout: result.takeout,
        curbside_pickup: result.curbside_pickup,
        reservable: result.reservable,
        serves_beer: result.serves_beer,
        serves_wine: result.serves_wine,
        serves_breakfast: result.serves_breakfast,
        serves_lunch: result.serves_lunch,
        serves_dinner: result.serves_dinner,
        serves_brunch: result.serves_brunch,
        serves_vegetarian_food: result.serves_vegetarian_food,
      });
    } catch (error: any) {
      console.error("[Places Details] Error:", error.message);
      res.status(500).json({ error: error.message, reviews: [] });
    }
  });

  // Google Places Search - for business discovery (with caching)
  app.post("/api/places/search", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }

      const { query, location, radius } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Validate location and radius if provided
      if (location) {
        if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
          return res.status(400).json({ error: "Location must have valid latitude and longitude" });
        }
        if (radius !== undefined && (typeof radius !== 'number' || radius <= 0)) {
          return res.status(400).json({ error: "Radius must be a positive number" });
        }
      }

      // Use cache to reduce API calls
      const cacheParams = { query, location, radius };
      const result = await placesCache.getOrFetch(
        'places-search',
        cacheParams,
        async () => {
          // Use the new Places API (Text Search) for better results
          const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.businessStatus,places.photos,places.primaryType'
            },
            body: JSON.stringify({
              textQuery: query,
              ...(location && { locationBias: { circle: { center: location, radius: radius || 5000 } } })
            })
          });

          const data = await response.json();

          if (!response.ok) {
            console.error('[Places Search] API error:', data);
            throw new Error(data.error?.message || 'Search failed');
          }

          // Transform the new API format to be more user-friendly
          const places = (data.places || []).map((place: any) => ({
            placeId: place.id,
            name: place.displayName?.text || 'Unknown',
            address: place.formattedAddress || '',
            location: place.location,
            rating: place.rating || 0,
            userRatingCount: place.userRatingCount || 0,
            types: place.types || [],
            primaryType: place.primaryType,
            businessStatus: place.businessStatus,
            photos: place.photos?.map((p: any) => p.name) || []
          }));

          return { places, count: places.length };
        },
        CACHE_TTL.PLACE_SEARCH
      );

      res.json(result);
    } catch (error: any) {
      console.error("[Places Search] Error:", error.message);
      res.status(500).json({ error: error.message, places: [] });
    }
  });

  // Google Places Owner Report - competitive analysis (with caching)
  app.post("/api/places/owner-report", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }

      const { businessName, radiusMiles } = req.body;

      if (!businessName) {
        return res.status(400).json({ error: "Business name is required" });
      }

      // Use cache to reduce expensive report generation
      const cacheParams = { businessName, radiusMiles };
      const result = await placesCache.getOrFetch(
        'owner-report',
        cacheParams,
        async () => {
          const report = await generateOwnerReport(
            { mode: 'owner', businessName, radiusMiles },
            apiKey
          );

          return {
            report,
            formatted: {
              sms: formatOwnerReportForSms(report),
              chat: formatOwnerReportForChat(report)
            }
          };
        },
        CACHE_TTL.OWNER_REPORT
      );

      res.json(result);
    } catch (error: any) {
      console.error("[Owner Report] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Google Places Marketing Search - market research (with caching)
  app.post("/api/places/marketing-search", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }

      const { address, latitude, longitude, category, radiusMiles, minRating, maxRating, priceLevels } = req.body;

      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }

      if (!address && (!latitude || !longitude)) {
        return res.status(400).json({ error: "Either address or latitude/longitude is required" });
      }

      // Use cache to reduce API calls
      const cacheParams = { address, latitude, longitude, category, radiusMiles, minRating, maxRating, priceLevels };
      const result = await placesCache.getOrFetch(
        'marketing-search',
        cacheParams,
        async () => {
          const report = await generateMarketingSearch(
            { 
              mode: 'marketing', 
              address, 
              latitude, 
              longitude, 
              category, 
              radiusMiles,
              minRating,
              maxRating,
              priceLevels
            },
            apiKey
          );

          return {
            report,
            formatted: {
              sms: formatMarketingReportForSms(report),
              chat: formatMarketingReportForChat(report)
            }
          };
        },
        CACHE_TTL.MARKETING_SEARCH
      );

      res.json(result);
    } catch (error: any) {
      console.error("[Marketing Search] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Cache management endpoints
  app.get("/api/places/cache/stats", (req, res) => {
    const stats = placesCache.getStats();
    res.json(stats);
  });

  app.post("/api/places/cache/clear", (req, res) => {
    placesCache.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  });

  // ============ Google Workspace Integration ============
  
  // In-memory storage for Google Workspace credentials (per business)
  const googleWorkspaceCredentials = new Map<string, GoogleWorkspaceCredentials>();
  
  // Check if Google Workspace is configured
  app.get("/api/google/status", (req, res) => {
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    res.json({ 
      configured: hasClientId && hasClientSecret,
      hasClientId,
      hasClientSecret
    });
  });

  // Get Google Workspace OAuth URL
  app.get("/api/google/auth-url", (req, res) => {
    try {
      const { businessId } = req.query;
      if (!businessId || typeof businessId !== 'string') {
        return res.status(400).json({ error: "businessId is required" });
      }

      const service = createGoogleWorkspaceService();
      const authUrl = service.getAuthUrl(businessId);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Google auth URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Google OAuth callback
  app.get("/api/google/callback", async (req, res) => {
    try {
      const { code, state: businessId } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).send("Authorization code not provided");
      }
      if (!businessId || typeof businessId !== 'string') {
        return res.status(400).send("Business ID not provided");
      }

      const service = createGoogleWorkspaceService();
      const credentials = await service.exchangeCode(code);
      
      // Store credentials for this business
      googleWorkspaceCredentials.set(businessId, credentials);
      
      // Redirect back to the admin panel with success
      res.redirect(`/website-builder?google_connected=true&businessId=${businessId}`);
    } catch (error: any) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`/website-builder?google_error=${encodeURIComponent(error.message)}`);
    }
  });

  // Check if business has Google Workspace connected
  app.get("/api/google/connection/:businessId", (req, res) => {
    const { businessId } = req.params;
    const hasCredentials = googleWorkspaceCredentials.has(businessId);
    res.json({ connected: hasCredentials });
  });

  // Execute a Google Workspace tool
  app.post("/api/google/execute-tool", async (req, res) => {
    try {
      const { businessId, toolName, args } = req.body;
      
      if (!businessId) {
        return res.status(400).json({ success: false, error: "businessId is required" });
      }
      if (!toolName) {
        return res.status(400).json({ success: false, error: "toolName is required" });
      }

      const credentials = googleWorkspaceCredentials.get(businessId);
      if (!credentials) {
        return res.status(401).json({ 
          success: false, 
          error: "Google Workspace not connected for this business",
          requiresAuth: true
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

  // Disconnect Google Workspace
  app.delete("/api/google/connection/:businessId", (req, res) => {
    const { businessId } = req.params;
    const wasConnected = googleWorkspaceCredentials.delete(businessId);
    res.json({ success: true, wasConnected });
  });

  // ============ Google Drive API ============

  const multer = (await import('multer')).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  app.get("/api/google/drive/drives/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.get("/api/google/drive/files/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const { folderId = 'root', pageToken, pageSize } = req.query;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.post("/api/google/drive/folder/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const { name, parentId } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Folder name is required" });
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.post("/api/google/drive/upload/:businessId", upload.single('file'), async (req, res) => {
    try {
      const { businessId } = req.params;
      const { parentId } = req.body;
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: "No file provided" });
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.delete("/api/google/drive/files/:businessId/:fileId", async (req, res) => {
    try {
      const { businessId, fileId } = req.params;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.get("/api/google/calendar/events/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const { maxResults, timeMin } = req.query;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.post("/api/google/calendar/events/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const { summary, description, startTime, endTime, attendees } = req.body;
      if (!summary || !startTime || !endTime) {
        return res.status(400).json({ success: false, error: "summary, startTime, and endTime are required" });
      }
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.patch("/api/google/calendar/events/:businessId/:eventId", async (req, res) => {
    try {
      const { businessId, eventId } = req.params;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.delete("/api/google/calendar/events/:businessId/:eventId", async (req, res) => {
    try {
      const { businessId, eventId } = req.params;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.get("/api/google/tasks/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const { maxResults } = req.query;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.post("/api/google/tasks/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const { title, notes, dueDate } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, error: "title is required" });
      }
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.patch("/api/google/tasks/:businessId/:taskId", async (req, res) => {
    try {
      const { businessId, taskId } = req.params;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.delete("/api/google/tasks/:businessId/:taskId", async (req, res) => {
    try {
      const { businessId, taskId } = req.params;
      const credentials = googleWorkspaceCredentials.get(businessId);
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

  app.post("/api/reports/compute-insights", async (req, res) => {
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

  app.post("/api/reports/business-report", async (req, res) => {
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

  app.post("/api/reports/lookup-place", async (req, res) => {
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
  app.get("/api/google-analyst/apis", async (_req, res) => {
    res.json({ success: true, apis: getAvailableApis() });
  });

  app.post("/api/google-analyst/calculate-costs", async (req, res) => {
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

  app.post("/api/google-analyst/analyze", async (req, res) => {
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

      const analysis = await analyzeWithKimi({
        type: 'general',
        context,
        conversationHistory: conversationHistory || []
      });

      res.json({ success: true, analysis });
    } catch (error: any) {
      console.error("[Google API Analyst] Analysis error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/google-analyst/rate-limits", async (req, res) => {
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

  app.post("/api/google-analyst/pricing-strategy", async (req, res) => {
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

  app.post("/api/google-analyst/compare", async (req, res) => {
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
  app.get("/api/telephony/config", async (req, res) => {
    try {
      let config = await storage.getTelephonyConfig();
      if (!config) {
        config = await storage.createTelephonyConfig({
          phoneNumber: null,
          firewallEnabled: true,
          allowedNumbers: [],
          maxCallDuration: 60,
          timeout: 30,
          friendlyName: "AI Agent Trunk",
        });
      }
      // Never return authToken to client - add hasAuthToken indicator instead
      const { authToken, ...safeConfig } = config as any;
      res.json({
        ...safeConfig,
        hasAuthToken: !!authToken,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update telephony config by ID
  app.patch("/api/telephony/config/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = updateConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const config = await storage.updateTelephonyConfig(id, parsed.data);
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update telephony config (singleton - auto-get or create config first)
  app.patch("/api/telephony/config", async (req, res) => {
    try {
      const parsed = updateConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      // Get or create the singleton config
      let existingConfig = await storage.getTelephonyConfig();
      if (!existingConfig) {
        existingConfig = await storage.createTelephonyConfig({
          phoneNumber: null,
          firewallEnabled: true,
          allowedNumbers: [],
          maxCallDuration: 60,
          timeout: 30,
          friendlyName: "AI Agent Trunk",
        });
      }
      
      const config = await storage.updateTelephonyConfig(existingConfig.id, parsed.data);
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  async function requireActiveSubscription(): Promise<{ allowed: boolean; error?: string }> {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        return { allowed: true };
      }

      return {
        allowed: false,
        error: "A paid subscription is required to search for or provision phone numbers. Please subscribe to a plan first at the Billing page.",
      };
    } catch (err: any) {
      return {
        allowed: false,
        error: "Unable to verify subscription status. Please ensure you have an active paid plan before requesting phone numbers.",
      };
    }
  }

  // Search available phone numbers
  app.get("/api/telephony/numbers/search", async (req, res) => {
    try {
      const subCheck = await requireActiveSubscription();
      if (!subCheck.allowed) {
        return res.status(403).json({ error: subCheck.error, requiresSubscription: true });
      }

      const { areaCode, country = 'US' } = req.query;
      if (!areaCode || typeof areaCode !== 'string') {
        return res.status(400).json({ error: "Area code is required" });
      }
      const numbers = await searchAvailableNumbers(areaCode, country as string);
      res.json(numbers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Provision a phone number
  app.post("/api/telephony/numbers/provision", async (req, res) => {
    try {
      const subCheck = await requireActiveSubscription();
      if (!subCheck.allowed) {
        return res.status(403).json({ error: subCheck.error, requiresSubscription: true });
      }

      const { phoneNumber, voiceUrl, smsUrl } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      const result = await provisionPhoneNumber(phoneNumber, voiceUrl, smsUrl);
      
      let config = await storage.getTelephonyConfig();
      if (config) {
        await storage.updateTelephonyConfig(config.id, {
          phoneNumber: result.phoneNumber,
          phoneSid: result.sid,
        });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add an existing phone number with credentials
  app.post("/api/telephony/numbers/existing", async (req, res) => {
    try {
      const { accountSid, authToken, phoneNumber, phoneSid, friendlyName, isSubAccount, parentAccountSid } = req.body;
      
      // Validation
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      // Phone number format validation
      if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
        return res.status(400).json({ error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)" });
      }
      
      // If credentials provided, validate them
      let twilioClient = null;
      if (accountSid && authToken) {
        // Require both if either is provided
        if (!accountSid || !authToken) {
          return res.status(400).json({ error: "Both Account SID and Auth Token are required" });
        }
        
        try {
          twilioClient = twilio(accountSid, authToken);
          await twilioClient.api.accounts(accountSid).fetch();
        } catch (credError: any) {
          return res.status(400).json({ error: `Invalid Twilio credentials: ${credError.message}` });
        }
        
        // If phoneSid provided, verify it belongs to this account
        if (phoneSid) {
          try {
            const phoneInfo = await twilioClient.incomingPhoneNumbers(phoneSid).fetch();
            if (phoneInfo.phoneNumber !== phoneNumber) {
              return res.status(400).json({ error: "Phone SID does not match the provided phone number" });
            }
          } catch (sidError: any) {
            return res.status(400).json({ error: `Phone SID verification failed: ${sidError.message}` });
          }
        }
      }
      
      const baseUrl = process.env.WEBHOOK_BASE_URL ||
        (req.get('host') ? `https://${req.get('host')}` : 'https://twilio.gatewayglobal.ai');
      const voiceUrl = `${baseUrl}/webhook/voice`;
      const smsUrl = `${baseUrl}/webhook/sms`;
      const statusCallback = `${baseUrl}/webhook/voice/status`;

      // If we have credentials and phoneSid, configure webhooks on Twilio
      if (twilioClient && phoneSid) {
        try {
          await twilioClient.incomingPhoneNumbers(phoneSid).update({
            voiceUrl: voiceUrl,
            voiceMethod: 'POST',
            smsUrl: smsUrl,
            smsMethod: 'POST',
            statusCallback: statusCallback,
            statusCallbackMethod: 'POST',
          });
          console.log(`Configured webhooks for ${phoneNumber} on Twilio`);
        } catch (webhookError: any) {
          console.error('Failed to configure webhooks:', webhookError);
          // Continue anyway - user can manually configure webhooks
        }
      }
      
      let config = await storage.getTelephonyConfig();
      
      const updateData = {
        accountSid: accountSid || null,
        authToken: authToken || null,
        phoneNumber,
        phoneSid: phoneSid || null,
        friendlyName: friendlyName || 'AI Agent Trunk',
        isSubAccount: isSubAccount || false,
        parentAccountSid: parentAccountSid || null,
        voiceUrl,
        smsUrl,
        statusCallbackUrl: statusCallback,
      };
      
      if (config) {
        await storage.updateTelephonyConfig(config.id, updateData);
      } else {
        await storage.createTelephonyConfig(updateData);
      }
      
      res.json({ 
        success: true, 
        message: phoneSid && twilioClient 
          ? "Number added and webhooks configured on Twilio" 
          : "Number added - configure webhooks manually if needed"
      });
    } catch (error: any) {
      console.error('Error adding existing number:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Release a phone number
  app.post("/api/telephony/numbers/release", async (req, res) => {
    try {
      const { phoneSid } = req.body;
      if (!phoneSid) {
        return res.status(400).json({ error: "Phone SID is required" });
      }
      
      await releasePhoneNumber(phoneSid);
      
      let config = await storage.getTelephonyConfig();
      if (config) {
        await storage.updateTelephonyConfig(config.id, {
          phoneNumber: null,
          phoneSid: null,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Link an existing Twilio phone number to an agent
  app.post("/api/telephony/numbers/link", async (req, res) => {
    try {
      // E.164 format: starts with +, followed by 1-15 digits
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      
      const linkSchema = z.object({
        phoneNumber: z.string().min(1, "Phone number is required").transform(val => {
          // Normalize to E.164: remove everything except + and digits
          let normalized = val.replace(/[^\d+]/g, '');
          // Add + if missing and starts with a country code
          if (!normalized.startsWith('+') && normalized.length >= 10) {
            normalized = '+' + (normalized.startsWith('1') ? normalized : '1' + normalized);
          }
          return normalized;
        }).refine(val => e164Regex.test(val), {
          message: "Phone number must be in E.164 format (e.g., +17025551234)"
        }),
        phoneSid: z.string().min(1, "Phone SID is required").regex(/^PN[a-zA-Z0-9]{32}$/, "Phone SID must be in format PN followed by 32 characters"),
        agentId: z.string().min(1, "Agent ID is required"),
      });

      const parsed = linkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { phoneNumber, phoneSid, agentId } = parsed.data;

      // Verify the agent exists
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Configure webhooks for this number in Twilio
      const twilioClient = await getTwilioClient();
      
      // Use the production base URL from environment or derive from Replit
      const baseUrl = process.env.WEBHOOK_BASE_URL || 
                      process.env.REPLIT_DEPLOYMENT_URL || 
                      `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      
      try {
        // Verify the number exists and belongs to this account first
        const existingNumber = await twilioClient.incomingPhoneNumbers(phoneSid).fetch();
        if (!existingNumber) {
          return res.status(404).json({ 
            error: "Phone number not found in your Twilio account. Please verify the SID is correct." 
          });
        }

        // Update webhooks for voice and SMS
        await twilioClient.incomingPhoneNumbers(phoneSid).update({
          voiceUrl: `${baseUrl}/webhook/voice/kimi`,
          voiceMethod: 'POST',
          smsUrl: `${baseUrl}/webhook/sms`,
          smsMethod: 'POST',
          statusCallback: `${baseUrl}/webhook/status`,
          statusCallbackMethod: 'POST',
        });
      } catch (twilioError: any) {
        // Provide helpful error messages for common issues
        if (twilioError.code === 20404) {
          return res.status(404).json({ 
            error: "Phone number not found. Make sure the SID is correct and the number belongs to your Twilio account (not a sub-account)." 
          });
        }
        return res.status(400).json({ 
          error: `Failed to configure Twilio number: ${twilioError.message}` 
        });
      }

      // Update the agent with the phone number
      await storage.updateAgent(agentId, {
        phoneNumber,
        phoneSid,
      });

      res.json({ 
        success: true, 
        phoneNumber, 
        phoneSid,
        message: "Phone number linked and webhooks configured" 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update webhooks
  app.patch("/api/telephony/webhooks", async (req, res) => {
    try {
      const parsed = webhooksUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const { phoneSid, voiceUrl, voiceFallbackUrl, statusCallback, smsUrl, smsFallbackUrl } = parsed.data;
      
      await updatePhoneNumberWebhooks(phoneSid, {
        voiceUrl: voiceUrl || undefined,
        voiceFallbackUrl: voiceFallbackUrl || undefined,
        statusCallback: statusCallback || undefined,
        smsUrl: smsUrl || undefined,
        smsFallbackUrl: smsFallbackUrl || undefined,
      });
      
      let config = await storage.getTelephonyConfig();
      if (config) {
        await storage.updateTelephonyConfig(config.id, {
          voiceUrl: voiceUrl || null,
          voiceFallbackUrl: voiceFallbackUrl || null,
          statusCallbackUrl: statusCallback || null,
          smsUrl: smsUrl || null,
          smsFallbackUrl: smsFallbackUrl || null,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get incoming phone numbers from Twilio
  app.get("/api/telephony/numbers", async (req, res) => {
    try {
      const numbers = await getIncomingPhoneNumbers();
      res.json(numbers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-configure all phone numbers with Gateway Global AI webhooks
  app.post("/api/telephony/configure-webhooks", async (req, res) => {
    try {
      const baseUrl = req.body.baseUrl || 'https://twilio.gatewayglobal.ai';
      const numbers = await getIncomingPhoneNumbers();
      
      const results = [];
      for (const num of numbers) {
        try {
          await updatePhoneNumberWebhooks(num.sid, {
            voiceUrl: `${baseUrl}/webhook/voice`,
            smsUrl: `${baseUrl}/webhook/sms`,
            statusCallback: `${baseUrl}/webhook/voice/status`,
          });
          results.push({ 
            phoneNumber: num.phoneNumber, 
            success: true,
            voiceUrl: `${baseUrl}/webhook/voice`,
            smsUrl: `${baseUrl}/webhook/sms`
          });
        } catch (err: any) {
          results.push({ 
            phoneNumber: num.phoneNumber, 
            success: false, 
            error: err.message 
          });
        }
      }
      
      res.json({ 
        message: `Configured ${results.filter(r => r.success).length}/${numbers.length} phone numbers`,
        baseUrl,
        results 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get default phone number
  app.get("/api/telephony/default-number", async (req, res) => {
    try {
      const phoneNumber = await getTwilioFromPhoneNumber();
      res.json({ phoneNumber });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================================
  // Gateway Global AI Twilio Provisioning API
  // ===========================================

  // Search available US numbers by area code
  app.get("/api/twilio/numbers/available", async (req, res) => {
    try {
      const subCheck = await requireActiveSubscription();
      if (!subCheck.allowed) {
        return res.status(403).json({ error: subCheck.error, requiresSubscription: true });
      }

      const areaCode = (req.query.areaCode as string || '').replace(/\D/g, '').slice(0, 3);
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      
      if (!areaCode || areaCode.length !== 3) {
        return res.status(400).json({ error: "Valid 3-digit area code required" });
      }
      
      const numbers = await searchAvailableNumbers(areaCode, 'US');
      res.json({ 
        numbers: numbers.slice(0, limit).map(n => ({
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          locality: n.locality,
          region: n.region
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List numbers already owned by the account
  app.get("/api/twilio/numbers", async (req, res) => {
    try {
      const numbers = await getIncomingPhoneNumbers();
      res.json({ 
        numbers: numbers.map(n => ({
          sid: n.sid,
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          voiceUrl: n.voiceUrl || null,
          voiceFallbackUrl: n.voiceFallbackUrl || null,
          smsUrl: n.smsUrl || null,
          smsFallbackUrl: n.smsFallbackUrl || null,
          statusCallback: n.statusCallback || null,
          capabilities: {
            voice: n.capabilities?.voice ?? true,
            sms: n.capabilities?.sms ?? true,
            mms: n.capabilities?.mms ?? false,
          },
          dateCreated: n.dateCreated || new Date().toISOString(),
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Buy a number (E.164 or 10-digit US)
  app.post("/api/twilio/numbers", async (req, res) => {
    try {
      const subCheck = await requireActiveSubscription();
      if (!subCheck.allowed) {
        return res.status(403).json({ error: subCheck.error, requiresSubscription: true });
      }

      const { phoneNumber, friendlyName, messagingServiceSid } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "phoneNumber is required" });
      }
      
      // Normalize to E.164 if needed
      let normalizedNumber = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        normalizedNumber = '+1' + phoneNumber.replace(/\D/g, '');
      }
      
      // Use current domain for webhook URLs (auto-detected)
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const baseUrl = `https://${currentDomain}`;
      
      const result = await provisionPhoneNumber(
        normalizedNumber,
        `${baseUrl}/webhook/voice/kimi`,
        `${baseUrl}/webhook/sms`
      );
      
      // Auto-configure ALL webhook URLs including status callbacks
      const client = await getTwilioClient();
      await client.incomingPhoneNumbers(result.sid).update({
        voiceUrl: `${baseUrl}/webhook/voice/kimi`,
        voiceMethod: 'POST',
        voiceFallbackUrl: `${baseUrl}/webhook/voice`,
        voiceFallbackMethod: 'POST',
        smsUrl: `${baseUrl}/webhook/sms`,
        smsMethod: 'POST',
        smsFallbackUrl: `${baseUrl}/webhook/sms`,
        smsFallbackMethod: 'POST',
        statusCallback: `${baseUrl}/webhook/voice/status`,
        statusCallbackMethod: 'POST',
        smsStatusCallback: `${baseUrl}/webhook/sms/status`
      });
      
      // Update with friendlyName if provided
      if (friendlyName) {
        await updateCallerIdName(result.sid, friendlyName);
      }
      
      // Add to Customer Care Messaging Service if specified or use default
      const targetMsgService = messagingServiceSid || 'MGd16163508f2fcc1236a989f83664d9fb';
      try {
        await client.messaging.v1.services(targetMsgService)
          .phoneNumbers
          .create({ phoneNumberSid: result.sid });
        console.log(`[Phone Setup] Added ${normalizedNumber} to Messaging Service ${targetMsgService}`);
      } catch (msErr: any) {
        console.warn(`[Phone Setup] Could not add to Messaging Service: ${msErr.message}`);
      }
      
      res.json({
        sid: result.sid,
        phoneNumber: result.phoneNumber,
        friendlyName: friendlyName || 'AI Agent Trunk',
        webhooksConfigured: true,
        baseUrl,
        messagingServiceSid: targetMsgService
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update webhooks for an owned number
  app.patch("/api/twilio/numbers/:phoneSid", async (req, res) => {
    try {
      const { phoneSid } = req.params;
      const { voiceUrl, voiceFallbackUrl, smsUrl, smsFallbackUrl, statusCallback, friendlyName } = req.body;
      
      // Update webhooks
      await updatePhoneNumberWebhooks(phoneSid, {
        voiceUrl: voiceUrl || undefined,
        voiceFallbackUrl: voiceFallbackUrl || undefined,
        smsUrl: smsUrl || undefined,
        smsFallbackUrl: smsFallbackUrl || undefined,
        statusCallback: statusCallback || undefined
      });
      
      // Update friendly name if provided
      if (friendlyName) {
        await updateCallerIdName(phoneSid, friendlyName);
      }
      
      // Fetch updated number details
      const numbers = await getIncomingPhoneNumbers();
      const updated = numbers.find(n => n.sid === phoneSid);
      
      if (!updated) {
        return res.status(404).json({ error: "Phone number not found" });
      }
      
      res.json({
        sid: updated.sid,
        phoneNumber: updated.phoneNumber,
        friendlyName: updated.friendlyName,
        voiceUrl: updated.voiceUrl || null,
        voiceFallbackUrl: updated.voiceFallbackUrl || null,
        smsUrl: updated.smsUrl || null,
        smsFallbackUrl: updated.smsFallbackUrl || null,
        statusCallback: updated.statusCallback || null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Release (delete) an owned number
  app.delete("/api/twilio/numbers/:phoneSid", async (req, res) => {
    try {
      const { phoneSid } = req.params;
      await releasePhoneNumber(phoneSid);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===========================================
  // Twilio Account Management API
  // ===========================================

  // Get account info
  app.get("/api/twilio/account", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      res.json({
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sub-accounts
  app.get("/api/twilio/subaccounts", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const accounts = await client.api.accounts.list({ limit: 50 });
      // Filter out the main account
      const subAccounts = accounts.filter((acc: any) => acc.sid !== process.env.TWILIO_ACCOUNT_SID);
      res.json(subAccounts.map((acc: any) => ({
        sid: acc.sid,
        friendlyName: acc.friendlyName,
        status: acc.status,
        dateCreated: acc.dateCreated,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create sub-account
  app.post("/api/twilio/subaccounts", async (req, res) => {
    try {
      const { friendlyName } = req.body;
      if (!friendlyName) {
        return res.status(400).json({ error: "friendlyName is required" });
      }
      const client = await getTwilioClient();
      const account = await client.api.accounts.create({ friendlyName });
      res.json({
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        dateCreated: account.dateCreated,
        authToken: account.authToken, // Only returned on creation
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update sub-account (suspend/close)
  app.patch("/api/twilio/subaccounts/:sid", async (req, res) => {
    try {
      const { sid } = req.params;
      const { status } = req.body;
      if (!status || !['active', 'suspended', 'closed'].includes(status)) {
        return res.status(400).json({ error: "Valid status required: active, suspended, or closed" });
      }
      const client = await getTwilioClient();
      const account = await client.api.accounts(sid).update({ status });
      res.json({
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get billing/balance info
  app.get("/api/twilio/billing", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const balance = await client.balance.fetch();
      
      // Get usage records for this month
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let callCount = 0;
      let smsCount = 0;
      let totalCost = 0;
      
      try {
        const usageRecords = await client.usage.records.thisMonth.list({ limit: 100 });
        for (const record of usageRecords) {
          if (record.category === 'calls') {
            callCount = parseInt(record.count) || 0;
            totalCost += parseFloat(record.price) || 0;
          } else if (record.category === 'sms') {
            smsCount = parseInt(record.count) || 0;
            totalCost += parseFloat(record.price) || 0;
          }
        }
      } catch (usageError) {
        console.log('Usage records not available:', usageError);
      }

      res.json({
        balance: balance.balance,
        currency: balance.currency,
        usageThisMonth: {
          calls: callCount,
          sms: smsCount,
          totalCost: totalCost.toFixed(2),
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TwiML Apps - List all
  app.get("/api/twilio/twiml-apps", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const apps = await client.applications.list({ limit: 20 });
      res.json({
        apps: apps.map((app: any) => ({
          sid: app.sid,
          friendlyName: app.friendlyName,
          voiceUrl: app.voiceUrl,
          voiceMethod: app.voiceMethod,
          voiceFallbackUrl: app.voiceFallbackUrl,
          smsUrl: app.smsUrl,
          smsMethod: app.smsMethod,
          smsFallbackUrl: app.smsFallbackUrl,
          statusCallback: app.statusCallback,
          dateCreated: app.dateCreated,
          dateUpdated: app.dateUpdated
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TwiML Apps - Update webhook URLs
  app.patch("/api/twilio/twiml-apps/:sid", async (req, res) => {
    try {
      const { sid } = req.params;
      const { voiceUrl, smsUrl, voiceFallbackUrl, smsFallbackUrl, statusCallback } = req.body;
      const client = await getTwilioClient();
      
      const updateData: any = {};
      if (voiceUrl !== undefined) updateData.voiceUrl = voiceUrl;
      if (smsUrl !== undefined) updateData.smsUrl = smsUrl;
      if (voiceFallbackUrl !== undefined) updateData.voiceFallbackUrl = voiceFallbackUrl;
      if (smsFallbackUrl !== undefined) updateData.smsFallbackUrl = smsFallbackUrl;
      if (statusCallback !== undefined) updateData.statusCallback = statusCallback;
      
      const app = await client.applications(sid).update(updateData);
      
      res.json({
        success: true,
        app: {
          sid: app.sid,
          friendlyName: app.friendlyName,
          voiceUrl: app.voiceUrl,
          smsUrl: app.smsUrl,
          voiceFallbackUrl: app.voiceFallbackUrl,
          smsFallbackUrl: app.smsFallbackUrl,
          statusCallback: app.statusCallback
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TwiML Apps - Auto-fix all apps to use current domain
  app.post("/api/twilio/twiml-apps/auto-fix", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const apps = await client.applications.list({ limit: 20 });
      
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const baseUrl = `https://${currentDomain}`;
      
      const results: any[] = [];
      
      for (const app of apps) {
        const updates: any = {};
        let needsUpdate = false;
        
        // Check if URLs are outdated (not pointing to current domain)
        if (app.voiceUrl && !app.voiceUrl.includes(currentDomain)) {
          // Preserve the path, just update the domain
          const voicePath = new URL(app.voiceUrl).pathname;
          updates.voiceUrl = `${baseUrl}${voicePath}`;
          needsUpdate = true;
        }
        
        if (app.smsUrl && !app.smsUrl.includes(currentDomain)) {
          const smsPath = new URL(app.smsUrl).pathname;
          updates.smsUrl = `${baseUrl}${smsPath}`;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await client.applications(app.sid).update(updates);
          results.push({
            sid: app.sid,
            friendlyName: app.friendlyName,
            fixed: true,
            updates
          });
        } else {
          results.push({
            sid: app.sid,
            friendlyName: app.friendlyName,
            fixed: false,
            reason: 'Already up to date'
          });
        }
      }
      
      res.json({
        success: true,
        currentDomain,
        baseUrl,
        fixedCount: results.filter(r => r.fixed).length,
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Messaging Services Health Check
  app.get("/api/twilio/messaging-services/health", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const services = await client.messaging.v1.services.list({ limit: 20 });
      
      const results = await Promise.all(services.map(async (svc: any) => {
        const issues: string[] = [];
        const warnings: string[] = [];
        
        // Check inbound webhook
        if (!svc.inboundRequestUrl && !svc.useInboundWebhookOnNumber) {
          issues.push('No inbound webhook URL and useInboundWebhookOnNumber is false');
        } else if (!svc.inboundRequestUrl && svc.useInboundWebhookOnNumber) {
          warnings.push('No service-level inbound URL, using phone number webhooks');
        }
        
        // Check fallback
        if (!svc.fallbackUrl) {
          warnings.push('No fallback URL configured');
        }
        
        // Check status callback
        if (!svc.statusCallback) {
          warnings.push('No status callback configured');
        }
        
        // Test webhook reachability if URL exists
        let webhookStatus = null;
        if (svc.inboundRequestUrl) {
          try {
            const response = await fetch(svc.inboundRequestUrl, {
              method: svc.inboundMethod || 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: 'From=%2B15551234567&To=%2B15559876543&Body=HealthCheck&MessageSid=SMtest123'
            });
            webhookStatus = { reachable: true, status: response.status };
            if (response.status === 404) {
              issues.push('Webhook returns 404 Not Found');
            } else if (response.status >= 400) {
              issues.push(`Webhook returns error status ${response.status}`);
            }
          } catch (err: any) {
            webhookStatus = { reachable: false, error: err.message };
            issues.push(`Webhook unreachable: ${err.message}`);
          }
        }
        
        // Get phone numbers in service
        let phoneNumbers: string[] = [];
        try {
          const pns = await client.messaging.v1.services(svc.sid).phoneNumbers.list({ limit: 10 });
          phoneNumbers = pns.map((pn: any) => pn.phoneNumber);
        } catch (e) {}
        
        return {
          sid: svc.sid,
          friendlyName: svc.friendlyName,
          inboundRequestUrl: svc.inboundRequestUrl,
          inboundMethod: svc.inboundMethod,
          fallbackUrl: svc.fallbackUrl,
          fallbackMethod: svc.fallbackMethod,
          statusCallback: svc.statusCallback,
          useInboundWebhookOnNumber: svc.useInboundWebhookOnNumber,
          phoneNumbers,
          webhookStatus,
          issues,
          warnings,
          healthy: issues.length === 0
        };
      }));
      
      const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
      const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
      
      res.json({
        timestamp: new Date().toISOString(),
        servicesCount: services.length,
        totalIssues,
        totalWarnings,
        allHealthy: totalIssues === 0,
        services: results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Messaging Service webhooks (auto-fix)
  app.patch("/api/twilio/messaging-services/:sid", async (req, res) => {
    try {
      const { sid } = req.params;
      const { inboundRequestUrl, inboundMethod, fallbackUrl, fallbackMethod, statusCallback, useInboundWebhookOnNumber } = req.body;
      
      const client = await getTwilioClient();
      
      const updateData: any = {};
      if (inboundRequestUrl !== undefined) updateData.inboundRequestUrl = inboundRequestUrl;
      if (inboundMethod !== undefined) updateData.inboundMethod = inboundMethod;
      if (fallbackUrl !== undefined) updateData.fallbackUrl = fallbackUrl;
      if (fallbackMethod !== undefined) updateData.fallbackMethod = fallbackMethod;
      if (statusCallback !== undefined) updateData.statusCallback = statusCallback;
      if (useInboundWebhookOnNumber !== undefined) updateData.useInboundWebhookOnNumber = useInboundWebhookOnNumber;
      
      const updated = await client.messaging.v1.services(sid).update(updateData);
      
      res.json({
        success: true,
        sid: updated.sid,
        friendlyName: updated.friendlyName,
        inboundRequestUrl: updated.inboundRequestUrl,
        fallbackUrl: updated.fallbackUrl,
        statusCallback: updated.statusCallback
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // UNIFIED FIX: Update ALL Twilio webhooks to current domain
  app.post("/api/twilio/fix-all-webhooks", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const baseUrl = `https://${currentDomain}`;
      
      const smsWebhookUrl = `${baseUrl}/webhook/sms`;
      const smsStatusCallbackUrl = `${baseUrl}/webhook/sms/status`;
      const voiceWebhookUrl = `${baseUrl}/webhook/voice/kimi`;
      const voiceFallbackUrl = `${baseUrl}/webhook/voice`;
      const voiceStatusCallbackUrl = `${baseUrl}/webhook/voice/status`;
      
      const results: any = {
        domain: currentDomain,
        baseUrl,
        messagingServices: [],
        twimlApps: [],
        phoneNumbers: []
      };
      
      // 1. Fix ALL Messaging Services using SDK properly
      console.log('[Webhook Fix] Updating Messaging Services...');
      const services = await client.messaging.v1.services.list({ limit: 20 });
      for (const svc of services) {
        try {
          // Update using the Twilio SDK as documented
          const updated = await client.messaging.v1.services(svc.sid).update({
            inboundRequestUrl: smsWebhookUrl,
            inboundMethod: 'POST',
            fallbackUrl: smsWebhookUrl,
            fallbackMethod: 'POST',
            statusCallback: smsStatusCallbackUrl
          });
          results.messagingServices.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: true,
            inboundRequestUrl: updated.inboundRequestUrl
          });
        } catch (err: any) {
          results.messagingServices.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: false,
            error: err.message
          });
        }
      }
      
      // 2. Fix ALL TwiML Apps
      console.log('[Webhook Fix] Updating TwiML Apps...');
      const apps = await client.applications.list({ limit: 20 });
      for (const app of apps) {
        try {
          const updated = await client.applications(app.sid).update({
            voiceUrl: voiceWebhookUrl,
            voiceMethod: 'POST',
            voiceFallbackUrl: voiceFallbackUrl,
            voiceFallbackMethod: 'POST',
            smsUrl: smsWebhookUrl,
            smsMethod: 'POST',
            smsFallbackUrl: smsWebhookUrl,
            smsFallbackMethod: 'POST'
          });
          results.twimlApps.push({
            sid: app.sid,
            friendlyName: app.friendlyName,
            fixed: true,
            voiceUrl: updated.voiceUrl,
            smsUrl: updated.smsUrl
          });
        } catch (err: any) {
          results.twimlApps.push({
            sid: app.sid,
            friendlyName: app.friendlyName,
            fixed: false,
            error: err.message
          });
        }
      }
      
      // 3. Fix ALL Phone Numbers
      console.log('[Webhook Fix] Updating Phone Numbers...');
      const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });
      for (const num of numbers) {
        try {
          const updated = await client.incomingPhoneNumbers(num.sid).update({
            voiceUrl: voiceWebhookUrl,
            voiceMethod: 'POST',
            voiceFallbackUrl: voiceFallbackUrl,
            voiceFallbackMethod: 'POST',
            statusCallback: voiceStatusCallbackUrl,
            statusCallbackMethod: 'POST',
            smsUrl: smsWebhookUrl,
            smsMethod: 'POST',
            smsFallbackUrl: smsWebhookUrl,
            smsFallbackMethod: 'POST'
          });
          results.phoneNumbers.push({
            sid: num.sid,
            phoneNumber: num.phoneNumber,
            fixed: true,
            voiceUrl: updated.voiceUrl,
            smsUrl: updated.smsUrl
          });
        } catch (err: any) {
          results.phoneNumbers.push({
            sid: num.sid,
            phoneNumber: num.phoneNumber,
            fixed: false,
            error: err.message
          });
        }
      }
      
      const totalFixed = 
        results.messagingServices.filter((r: any) => r.fixed).length +
        results.twimlApps.filter((r: any) => r.fixed).length +
        results.phoneNumbers.filter((r: any) => r.fixed).length;
      
      console.log(`[Webhook Fix] Complete! Fixed ${totalFixed} configurations.`);
      
      res.json({
        success: true,
        summary: {
          messagingServicesFixed: results.messagingServices.filter((r: any) => r.fixed).length,
          twimlAppsFixed: results.twimlApps.filter((r: any) => r.fixed).length,
          phoneNumbersFixed: results.phoneNumbers.filter((r: any) => r.fixed).length,
          totalFixed
        },
        webhookUrls: {
          sms: smsWebhookUrl,
          voice: voiceWebhookUrl,
          voiceFallback: voiceFallbackUrl
        },
        details: results
      });
    } catch (error: any) {
      console.error('[Webhook Fix] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-fix all messaging services with current domain (legacy)
  app.post("/api/twilio/messaging-services/auto-fix", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const services = await client.messaging.v1.services.list({ limit: 20 });
      
      // Get current domain from request
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const baseUrl = `${protocol}://${host}`;
      
      const results = [];
      
      for (const svc of services) {
        // Fix ALL services, not just empty ones
        try {
          const updated = await client.messaging.v1.services(svc.sid).update({
            inboundRequestUrl: `${baseUrl}/webhook/sms`,
            inboundMethod: 'POST',
            fallbackUrl: `${baseUrl}/webhook/sms`,
            fallbackMethod: 'POST'
          });
          results.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: true,
            newInboundUrl: updated.inboundRequestUrl
          });
        } catch (err: any) {
          results.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: false,
            error: err.message
          });
        }
      }
      
      res.json({
        success: true,
        baseUrl,
        fixedCount: results.filter(r => r.fixed).length,
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy endpoint kept for backward compatibility
  app.post("/api/twilio/messaging-services/auto-fix-legacy", async (req, res) => {
    try {
      const client = await getTwilioClient();
      const services = await client.messaging.v1.services.list({ limit: 20 });
      
      // Get current domain from request
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const baseUrl = `${protocol}://${host}`;
      
      const results = [];
      
      for (const svc of services) {
        // Only fix services that have no inbound URL and useInboundWebhookOnNumber is false
        if (!svc.inboundRequestUrl && !svc.useInboundWebhookOnNumber) {
          try {
            const updated = await client.messaging.v1.services(svc.sid).update({
              inboundRequestUrl: `${baseUrl}/webhook/sms`,
              inboundMethod: 'POST',
              fallbackUrl: `${baseUrl}/webhook/sms`,
              fallbackMethod: 'POST'
            });
            results.push({
              sid: svc.sid,
              friendlyName: svc.friendlyName,
              fixed: true,
              newInboundUrl: updated.inboundRequestUrl
            });
          } catch (err: any) {
            results.push({
              sid: svc.sid,
              friendlyName: svc.friendlyName,
              fixed: false,
              error: err.message
            });
          }
        } else {
          results.push({
            sid: svc.sid,
            friendlyName: svc.friendlyName,
            fixed: false,
            reason: 'Already configured or using phone number webhooks'
          });
        }
      }
      
      res.json({
        baseUrl,
        results,
        fixedCount: results.filter(r => r.fixed).length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send SMS
  app.post("/api/telephony/sms/send", async (req, res) => {
    try {
      const { to, body, from } = req.body;
      if (!to || !body) {
        return res.status(400).json({ error: "To and body are required" });
      }
      
      const result = await sendSms(to, body, from);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Make a call
  app.post("/api/telephony/calls/make", async (req, res) => {
    try {
      const { to, twimlUrl, from } = req.body;
      if (!to || !twimlUrl) {
        return res.status(400).json({ error: "To and twimlUrl are required" });
      }
      
      const result = await makeCall(to, twimlUrl, from);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test outbound call - makes a real call with a simple greeting
  app.post("/api/telephony/test/outbound", async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to) {
        return res.status(400).json({ error: "To phone number is required" });
      }
      
      const config = await storage.getTelephonyConfig();
      if (!config?.phoneNumber) {
        return res.status(400).json({ error: "No phone number provisioned. Please provision a number first." });
      }

      // Create a simple TwiML URL that speaks a message
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://twilio.gatewayglobal.ai';
      
      const greeting = encodeURIComponent(message || "Hello! This is a test call from Gateway Global AI. Your phone system is working correctly. Goodbye!");
      const twimlUrl = `${baseUrl}/api/twiml/test?message=${greeting}`;
      
      const result = await makeCall(to, twimlUrl, config.phoneNumber);
      
      // Log the test call
      await storage.createCallLog({
        callSid: result.sid,
        phoneNumber: to,
        direction: 'outbound',
        status: 'initiated',
        duration: 0,
      });
      
      res.json({ success: true, callSid: result.sid, message: "Test call initiated" });
    } catch (error: any) {
      console.error('Test outbound call error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // TwiML endpoint for test calls
  app.all("/api/twiml/test", (req, res) => {
    const message = req.query.message as string || "This is a test call from Gateway Global AI.";
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${message}</Say>
  <Pause length="1"/>
  <Hangup/>
</Response>`;
    res.type('text/xml').send(twiml);
  });

  // Test inbound call simulation - triggers webhook locally
  app.post("/api/telephony/test/inbound", async (req, res) => {
    try {
      const { from } = req.body;
      const testFrom = from || "+15550001234";
      
      const config = await storage.getTelephonyConfig();
      if (!config?.phoneNumber) {
        return res.status(400).json({ error: "No phone number provisioned. Please provision a number first." });
      }

      // Check firewall
      if (config.firewallEnabled) {
        const isAllowed = config.allowedNumbers?.some(n => n === testFrom);
        if (!isAllowed) {
          return res.json({ 
            success: false, 
            blocked: true, 
            message: `Call from ${testFrom} blocked by firewall - not in allowed list` 
          });
        }
      }

      // Simulate an inbound call log
      const testSid = `TEST${Date.now()}`;
      await storage.createCallLog({
        callSid: testSid,
        phoneNumber: testFrom,
        direction: 'inbound',
        status: 'completed',
        duration: Math.floor(Math.random() * 60) + 5,
      });

      res.json({ 
        success: true, 
        callSid: testSid, 
        message: `Simulated inbound call from ${testFrom} processed successfully` 
      });
    } catch (error: any) {
      console.error('Test inbound call error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook simulation - generates proper X-Twilio-Signature and calls webhook server
  app.post("/api/telephony/simulate-webhook", async (req, res) => {
    try {
      const { type, from, body, callStatus } = req.body;
      const webhookType = type || 'sms';
      const testFrom = from || '+15550001234';
      
      const config = await storage.getTelephonyConfig();
      if (!config?.phoneNumber) {
        return res.status(400).json({ error: "No phone number provisioned. Please provision a number first." });
      }
      
      // Get auth token - use config's authToken if available, otherwise use env
      const authToken = (config as any).authToken || process.env.TWILIO_AUTH_TOKEN;
      const accountSid = (config as any).accountSid || process.env.TWILIO_ACCOUNT_SID;
      
      if (!authToken) {
        return res.status(400).json({ error: "No auth token available for signature generation" });
      }
      
      // Build webhook URL and params based on type
      // Use the published app URL or dev domain, NOT the old hardcoded domain
      const webhookBaseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'http://localhost:5000';
      
      console.log(`[Webhook Simulation] Using base URL: ${webhookBaseUrl}`);
      let webhookUrl: string;
      let params: Record<string, string>;
      
      if (webhookType === 'sms') {
        webhookUrl = `${webhookBaseUrl}/webhook/sms`;
        params = {
          MessageSid: `SM${Date.now()}`,
          AccountSid: accountSid || 'ACtest',
          From: testFrom,
          To: config.phoneNumber,
          Body: body || 'Test message from webhook simulator',
          NumMedia: '0',
        };
      } else if (webhookType === 'voice') {
        webhookUrl = `${webhookBaseUrl}/webhook/voice`;
        params = {
          CallSid: `CA${Date.now()}`,
          AccountSid: accountSid || 'ACtest',
          From: testFrom,
          To: config.phoneNumber,
          CallStatus: 'ringing',
          Direction: 'inbound',
          CallerName: 'Test Caller',
        };
      } else if (webhookType === 'status') {
        webhookUrl = `${webhookBaseUrl}/webhook/voice/status`;
        params = {
          CallSid: `CA${Date.now()}`,
          AccountSid: accountSid || 'ACtest',
          From: testFrom,
          To: config.phoneNumber,
          CallStatus: callStatus || 'completed',
          CallDuration: '30',
        };
      } else {
        return res.status(400).json({ error: "Invalid webhook type. Use 'sms', 'voice', or 'status'" });
      }
      
      // Generate X-Twilio-Signature using Twilio's method
      const signature = twilio.getExpectedTwilioSignature(
        authToken,
        webhookUrl,
        params
      );
      
      // Make the webhook request with proper signature
      const formBody = Object.entries(params)
        .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
        .join('&');
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature,
        },
        body: formBody,
      });
      
      const responseText = await response.text();
      
      res.json({
        success: response.ok,
        webhookUrl,
        type: webhookType,
        status: response.status,
        signature: signature.substring(0, 20) + '...',
        response: responseText.substring(0, 500),
        params,
      });
    } catch (error: any) {
      console.error('Webhook simulation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get call logs from Twilio
  app.get("/api/telephony/calls", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const calls = await getTwilioCallLogs(limit);
      res.json(calls);
    } catch (error: any) {
      console.error('Error fetching call logs:', error.message);
      // Return empty array instead of error when Twilio isn't fully configured
      if (error.message.includes('not connected') || error.message.includes('accountSid')) {
        return res.json([]);
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get message logs from Twilio
  app.get("/api/telephony/messages", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await getMessageLogs(limit);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching message logs:', error.message);
      if (error.message.includes('not connected') || error.message.includes('accountSid')) {
        return res.json([]);
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get local call logs
  app.get("/api/telephony/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getCallLogs(undefined, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create local call log
  app.post("/api/telephony/logs", async (req, res) => {
    try {
      const parsed = insertCallLogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const log = await storage.createCallLog(parsed.data);
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update call log with notes and customer info
  app.patch("/api/telephony/calls/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        notes: z.string().optional(),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const updated = await storage.updateCallLog(req.params.id, parsed.data);
      if (!updated) {
        return res.status(404).json({ error: "Call log not found" });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Unified call tracking endpoint - combines database logs
  app.get("/api/call-tracking", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getCallLogs(undefined, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update caller ID
  app.patch("/api/telephony/caller-id", async (req, res) => {
    try {
      const { phoneSid, callerIdName } = req.body;
      if (!phoneSid || !callerIdName) {
        return res.status(400).json({ error: "Phone SID and caller ID name are required" });
      }
      
      await updateCallerIdName(phoneSid, callerIdName);
      
      let config = await storage.getTelephonyConfig();
      if (config) {
        await storage.updateTelephonyConfig(config.id, {
          callerIdName,
          friendlyName: callerIdName,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update firewall settings
  app.patch("/api/telephony/firewall", async (req, res) => {
    try {
      const parsed = firewallUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      let config = await storage.getTelephonyConfig();
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }
      
      const updates: any = {};
      if (typeof parsed.data.firewallEnabled === 'boolean') {
        updates.firewallEnabled = parsed.data.firewallEnabled;
      }
      if (Array.isArray(parsed.data.allowedNumbers)) {
        updates.allowedNumbers = parsed.data.allowedNumbers;
      }
      if (typeof parsed.data.ownerPhone !== 'undefined') {
        updates.ownerPhone = parsed.data.ownerPhone || null;
      }
      if (typeof parsed.data.ownerEmail !== 'undefined') {
        updates.ownerEmail = parsed.data.ownerEmail || null;
      }
      
      const updated = await storage.updateTelephonyConfig(config.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Twilio Sub-Accounts API
  // Helper to strip sensitive fields from sub-account responses
  const sanitizeSubAccount = (account: any) => {
    const { authToken, ...safe } = account;
    return { ...safe, hasAuthToken: !!authToken };
  };

  app.get("/api/twilio/sub-accounts", async (req, res) => {
    try {
      const accounts = await storage.getTwilioSubAccounts();
      // Strip authToken from responses - never expose credentials to client
      res.json(accounts.map(sanitizeSubAccount));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/twilio/sub-accounts", async (req, res) => {
    try {
      const { friendlyName, ownerEmail } = req.body;
      
      if (!friendlyName || typeof friendlyName !== 'string') {
        return res.status(400).json({ error: 'friendlyName is required' });
      }
      
      // Create sub-account via Twilio API
      const client = await getTwilioClient();
      const subAccount = await client.api.accounts.create({
        friendlyName: friendlyName || 'Gateway Sub-Account'
      });

      // Save to database
      const saved = await storage.createTwilioSubAccount({
        accountSid: subAccount.sid,
        authToken: subAccount.authToken,
        friendlyName: subAccount.friendlyName,
        status: subAccount.status,
        ownerEmail: ownerEmail || null,
      });

      // Return sanitized response without authToken
      res.json(sanitizeSubAccount(saved));
    } catch (error: any) {
      console.error('Error creating sub-account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/twilio/sub-accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { friendlyName, ownerEmail, status } = req.body;
      
      // Only allow safe fields to be updated - never authToken/accountSid
      const allowedUpdates: any = {};
      if (friendlyName !== undefined) allowedUpdates.friendlyName = friendlyName;
      if (ownerEmail !== undefined) allowedUpdates.ownerEmail = ownerEmail;
      if (status !== undefined && ['active', 'suspended'].includes(status)) {
        allowedUpdates.status = status;
      }
      
      const updated = await storage.updateTwilioSubAccount(id, allowedUpdates);
      if (!updated) {
        return res.status(404).json({ error: "Sub-account not found" });
      }
      res.json(sanitizeSubAccount(updated));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/twilio/sub-accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const account = await storage.getTwilioSubAccount(id);
      if (!account) {
        return res.status(404).json({ error: "Sub-account not found" });
      }

      // Close sub-account in Twilio (sets to 'closed' status)
      try {
        const client = await getTwilioClient();
        await client.api.accounts(account.accountSid).update({ status: 'closed' });
      } catch (e) {
        console.log('Twilio sub-account close warning:', e);
      }

      await storage.deleteTwilioSubAccount(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy webhook handlers - redirect to new secure endpoints
  // These are kept for backwards compatibility but should be updated in Twilio config
  app.post("/api/webhooks/voice", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/voice - Please update Twilio config to use /webhook/voice');
    res.redirect(307, '/webhook/voice');
  });

  app.post("/api/webhooks/voice/recording", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/voice/recording - deprecated');
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  });

  app.post("/api/webhooks/sms", (req, res) => {
    console.log('[Legacy Webhook] /api/webhooks/sms - Please update Twilio config to use /webhook/sms');
    res.redirect(307, '/webhook/sms');
  });

  // Status callback handler
  app.post("/api/webhooks/status", async (req, res) => {
    const { CallSid, CallStatus, CallDuration, From, To, Direction } = req.body;
    
    try {
      let config = await storage.getTelephonyConfig();
      if (config && CallSid) {
        await storage.createCallLog({
          configId: config.id,
          direction: Direction === 'inbound' ? 'inbound' : 'outbound',
          phoneNumber: Direction === 'inbound' ? From : To,
          duration: parseInt(CallDuration) || 0,
          status: CallStatus === 'completed' ? 'completed' : 
                  CallStatus === 'no-answer' ? 'missed' : 
                  CallStatus === 'busy' ? 'missed' : 'failed',
          callSid: CallSid,
        });
      }
    } catch (error) {
      console.error('Error logging call status:', error);
    }
    
    res.sendStatus(200);
  });

  // ============================================
  // DISC ASSESSMENT API
  // ============================================

  // Get all DISC word sets (questions)
  app.get("/api/disc/questions", (req, res) => {
    res.json({
      instructions: "Rank each set of four words from 4 (most like you) to 1 (least like you). Use each number once per set.",
      totalSets: DISC_WORD_SETS.length,
      sets: DISC_WORD_SETS,
    });
  });

  // Get a single question set
  app.get("/api/disc/questions/:setNumber", (req, res) => {
    const setNumber = parseInt(req.params.setNumber);
    const wordSet = DISC_WORD_SETS.find(s => s.setNumber === setNumber);
    
    if (!wordSet) {
      return res.status(404).json({ error: `Set ${setNumber} not found. Valid range: 1-24` });
    }
    
    res.json(wordSet);
  });

  // Submit rankings and calculate DISC profile
  const discRankingsSchema = z.object({
    rankings: z.array(z.object({
      setNumber: z.number().min(1).max(24),
      rankings: z.tuple([
        z.number().min(1).max(4),
        z.number().min(1).max(4),
        z.number().min(1).max(4),
        z.number().min(1).max(4),
      ]).refine(
        (arr) => new Set(arr).size === 4,
        { message: "Each ranking (1-4) must be used exactly once per set" }
      ),
    })).length(24),
  });

  app.post("/api/disc/calculate", (req, res) => {
    const parsed = discRankingsSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid rankings format",
        details: parsed.error.errors,
        expectedFormat: {
          rankings: [
            { setNumber: 1, rankings: [4, 3, 2, 1] },
            { setNumber: 2, rankings: [1, 4, 3, 2] },
          ]
        }
      });
    }

    const { rankings } = parsed.data;

    let dScore = 0, iScore = 0, sScore = 0, cScore = 0;

    for (const ranking of rankings) {
      dScore += ranking.rankings[0];
      iScore += ranking.rankings[1];
      sScore += ranking.rankings[2];
      cScore += ranking.rankings[3];
    }

    const totalScore = dScore + iScore + sScore + cScore;

    const scores = {
      dominance: dScore,
      influence: iScore,
      steadiness: sScore,
      conscientiousness: cScore,
    };

    const percentages = {
      dominance: Math.round((dScore / 96) * 100),
      influence: Math.round((iScore / 96) * 100),
      steadiness: Math.round((sScore / 96) * 100),
      conscientiousness: Math.round((cScore / 96) * 100),
    };

    const styleScores: [string, number][] = [
      ['D', dScore],
      ['I', iScore],
      ['S', sScore],
      ['C', cScore],
    ];
    styleScores.sort((a, b) => b[1] - a[1]);

    const result: DiscAssessmentResult = {
      scores,
      percentages,
      primaryStyle: styleScores[0][0] as 'D' | 'I' | 'S' | 'C',
      secondaryStyle: styleScores[1][0] as 'D' | 'I' | 'S' | 'C',
      styleDescriptions: DISC_STYLE_DESCRIPTIONS,
    };

    res.json(result);
  });

  // Simple endpoint for bots - accepts array format "Set X: [4,3,2,1]"
  app.post("/api/disc/calculate-simple", (req, res) => {
    try {
      const { responses } = req.body;
      
      if (!responses || !Array.isArray(responses) || responses.length !== 24) {
        return res.status(400).json({
          error: "Expected 24 response arrays",
          expectedFormat: {
            responses: [[4,3,2,1], [1,4,3,2], "...24 total"]
          }
        });
      }

      let dScore = 0, iScore = 0, sScore = 0, cScore = 0;

      for (let i = 0; i < responses.length; i++) {
        const ranking = responses[i];
        if (!Array.isArray(ranking) || ranking.length !== 4) {
          return res.status(400).json({ error: `Set ${i + 1} must have exactly 4 rankings` });
        }
        if (new Set(ranking).size !== 4 || !ranking.every((n: number) => n >= 1 && n <= 4)) {
          return res.status(400).json({ error: `Set ${i + 1} must use each number 1-4 exactly once` });
        }
        dScore += ranking[0];
        iScore += ranking[1];
        sScore += ranking[2];
        cScore += ranking[3];
      }

      const percentages = {
        dominance: Math.round((dScore / 96) * 100),
        influence: Math.round((iScore / 96) * 100),
        steadiness: Math.round((sScore / 96) * 100),
        conscientiousness: Math.round((cScore / 96) * 100),
      };

      const styleScores: [string, number][] = [
        ['D', dScore],
        ['I', iScore],
        ['S', sScore],
        ['C', cScore],
      ];
      styleScores.sort((a, b) => b[1] - a[1]);

      res.json({
        scores: { dominance: dScore, influence: iScore, steadiness: sScore, conscientiousness: cScore },
        percentages,
        primaryStyle: styleScores[0][0],
        secondaryStyle: styleScores[1][0],
        styleDescriptions: DISC_STYLE_DESCRIPTIONS,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =====================================================
  // MVP Task Submission API
  // =====================================================
  
  // Zod schema for task submission validation
  const taskSubmitSchema = z.object({
    task: z.string().min(5, "Task must be at least 5 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    name: z.string().min(1, "Name is required"),
    agentName: z.string().min(1, "Agent name is required"),
    personality: z.object({
      id: z.enum(['achiever', 'collaborator', 'supporter', 'analyst']),
      name: z.string(),
      description: z.string(),
      icon: z.string(),
      disc: z.object({
        dominance: z.number().min(0).max(100),
        influence: z.number().min(0).max(100),
        steadiness: z.number().min(0).max(100),
        conscientiousness: z.number().min(0).max(100),
      }),
    }),
  });

  // Submit a new task (from MVP landing page)
  app.post("/api/tasks/submit", async (req, res) => {
    try {
      // Validate request body with Zod
      const validationResult = taskSubmitSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const { task, phone, name, personality, agentName } = validationResult.data;
      
      // Normalize phone number (remove formatting)
      const normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length < 10) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
      
      // Format to E.164 for Twilio
      const e164Phone = normalizedPhone.startsWith('1') 
        ? `+${normalizedPhone}` 
        : `+1${normalizedPhone}`;
      
      // Parse task using Kimi (with partial mode)
      let parsedTask = null;
      try {
        const { parseTask } = await import("./kimi");
        parsedTask = await parseTask(task);
        console.log('[Task Submit] Parsed task:', parsedTask);
      } catch (parseError) {
        console.error('[Task Submit] Task parsing error:', parseError);
      }
      
      // Calculate next update time (1 hour from now)
      const nextUpdateAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Create the task with validated DISC values
      const newTask = await storage.createTask({
        userName: name,
        userPhone: e164Phone,
        agentName,
        personalityId: personality.id,
        task,
        parsedTask,
        status: 'started',
        estimatedHours: parsedTask?.estimatedHours || 24,
        dominance: personality.disc.dominance,
        influence: personality.disc.influence,
        steadiness: personality.disc.steadiness,
        conscientiousness: personality.disc.conscientiousness,
        startedAt: new Date(),
        nextUpdateAt,
        updatesCount: 1,
      });
      
      console.log('[Task Submit] Created task:', newTask.id);
      
      // Send immediate SMS confirmation
      try {
        const { generateTaskUpdate } = await import("./kimi");
        
        const smsMessage = await generateTaskUpdate({
          agentName,
          taskDescription: task,
          hoursElapsed: 0,
          totalHours: 24,
          updateType: 'start',
        });
        
        // Send SMS via Twilio
        const config = await storage.getTelephonyConfig();
        if (config?.phoneNumber && config?.accountSid && config?.authToken) {
          const { sendSms } = await import("./twilio");
          await sendSms(e164Phone, smsMessage, config.phoneNumber);
          console.log(`[Task Submit] Sent initial SMS to ${e164Phone}`);
        } else {
          console.warn('[Task Submit] No Twilio config, skipping SMS');
        }
      } catch (smsError) {
        console.error('[Task Submit] SMS send error:', smsError);
      }
      
      res.json({ 
        success: true, 
        taskId: newTask.id,
        message: `Task created! ${agentName} will text you shortly.`
      });
      
    } catch (error: any) {
      console.error('[Task Submit] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get task status (for optional dashboard)
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get tasks by phone number
  app.get("/api/tasks/phone/:phone", async (req, res) => {
    try {
      const normalizedPhone = req.params.phone.replace(/\D/g, '');
      const e164Phone = normalizedPhone.startsWith('1') 
        ? `+${normalizedPhone}` 
        : `+1${normalizedPhone}`;
      
      const tasks = await storage.getTasksByPhone(e164Phone);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate mock conversation with Gemini TTS
  app.post("/api/conversation/generate", async (req, res) => {
    try {
      const { agentName, discProfile, scenario } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const discDescription = discProfile ? 
        `The agent has a DISC profile with: D=${discProfile.dominance}%, I=${discProfile.influence}%, S=${discProfile.steadiness}%, C=${discProfile.conscientiousness}%` :
        'The agent has a balanced DISC profile';

      const scenarioText = scenario || 'a friendly introduction and offering to help with questions';

      const conversationPrompt = `You are ${agentName || 'NEXUS'}, an AI assistant with the following personality traits based on the DISC model:
${discDescription}

Generate a brief, natural-sounding conversation response for this scenario: ${scenarioText}

Keep the response conversational, warm, and under 100 words. Speak directly as the agent.`;

      // Generate text response
      const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const textResult = await textModel.generateContent(conversationPrompt);
      const conversationText = textResult.response.text() || "Hello! I'm your AI assistant. How can I help you today?";

      // Generate TTS using direct API call (Gemini TTS model)
      const ttsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: conversationText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
              }
            }
          })
        }
      );

      let audioData = null;
      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        const audioPart = ttsData.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (audioPart) {
          audioData = {
            data: audioPart.data,
            mimeType: audioPart.mimeType
          };
        }
      }

      res.json({
        text: conversationText,
        audio: audioData,
        agentName: agentName || 'NEXUS',
        discProfile: discProfile || { dominance: 50, influence: 50, steadiness: 50, conscientiousness: 50 }
      });
    } catch (error: any) {
      console.error('Gemini TTS error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get available TTS voices
  app.get("/api/conversation/voices", async (req, res) => {
    res.json({
      voices: [
        { id: 'Kore', name: 'Kore', description: 'Warm and professional' },
        { id: 'Puck', name: 'Puck', description: 'Friendly and upbeat' },
        { id: 'Charon', name: 'Charon', description: 'Deep and authoritative' },
        { id: 'Fenrir', name: 'Fenrir', description: 'Calm and reassuring' },
        { id: 'Aoede', name: 'Aoede', description: 'Clear and articulate' },
        { id: 'Leda', name: 'Leda', description: 'Soft and gentle' }
      ]
    });
  });

  // ============================================
  // AGENT MANAGEMENT API
  // ============================================

  // Get all agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agentList = await storage.getAgents();
      res.json(agentList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single agent
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create agent
  app.post("/api/agents", async (req, res) => {
    try {
      const parsed = insertAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const agent = await storage.createAgent(parsed.data);
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update agent
  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.updateAgent(req.params.id, req.body);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete agent
  app.delete("/api/agents/:id", async (req, res) => {
    try {
      await storage.deleteAgent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AGENT BUDGET & STARTUP SCRIPT API
  // ============================================

  // Cost estimation: approximate USD per 1K tokens by model
  const MODEL_COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
    'kimi-k2.5': { input: 0.002, output: 0.006 },
    'kimi-k2-turbo-preview': { input: 0.001, output: 0.003 },
    'moonshot-v1-128k': { input: 0.0016, output: 0.0048 },
    'moonshot-v1-32k': { input: 0.0008, output: 0.0024 },
    'moonshot-v1-8k': { input: 0.0004, output: 0.0012 },
    'Qwen/Kimi-K2-Instruct': { input: 0.002, output: 0.006 },
    'default': { input: 0.002, output: 0.006 },
  };

  function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
    const rates = MODEL_COST_PER_1K_TOKENS[modelId] || MODEL_COST_PER_1K_TOKENS['default'];
    return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
  }

  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  function getNextResetDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'weekly':
        const dayOfWeek = now.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday);
      case 'monthly':
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  // Serve only the client-designated Maps key (referrer-restricted). Never expose server keys (GOOGLE_MAPS_API_KEY, GOOGLE_CLOUD_API_KEY).
  app.get("/api/config/maps-key", (_req, res) => {
    const key = process.env.GOOGLE_MAPS_JS_API || process.env.GOOGLE_MAPS_JS_KEY;
    if (!key) {
      return res.status(503).json({
        error: "Google Maps API key not configured for client. Set GOOGLE_MAPS_JS_API or GOOGLE_MAPS_JS_KEY (referrer-restricted key); do not use server key here.",
      });
    }
    res.json({ key });
  });

  // Update agent budget configuration
  app.patch("/api/agents/:id/budget", async (req, res) => {
    try {
      const schema = z.object({
        budgetAmountUsd: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "Budget must be a non-negative number" }).optional(),
        budgetPeriod: z.enum(["daily", "weekly", "monthly"]).optional(),
        startupScript: z.string().max(10000).optional().nullable(),
        startupBudgetUsd: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: "Startup budget must be a non-negative number" }).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const updates: any = {};
      if (parsed.data.budgetAmountUsd !== undefined) updates.budgetAmountUsd = parsed.data.budgetAmountUsd;
      if (parsed.data.budgetPeriod !== undefined) {
        updates.budgetPeriod = parsed.data.budgetPeriod;
        updates.budgetResetAt = getNextResetDate(parsed.data.budgetPeriod);
      }
      if (parsed.data.startupScript !== undefined) updates.startupScript = parsed.data.startupScript;
      if (parsed.data.startupBudgetUsd !== undefined) updates.startupBudgetUsd = parsed.data.startupBudgetUsd;

      const agent = await storage.updateAgent(req.params.id, updates);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get agent budget summary
  app.get("/api/agents/:id/budget", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      // Check if budget period has reset
      const now = new Date();
      let spentUsd = parseFloat(agent.budgetSpentUsd || '0');
      let resetAt = agent.budgetResetAt;

      if (resetAt && now > new Date(resetAt)) {
        spentUsd = 0;
        resetAt = getNextResetDate(agent.budgetPeriod || 'monthly');
        await storage.updateAgent(agent.id, {
          budgetSpentUsd: '0',
          budgetResetAt: resetAt,
        });
      }

      const budgetAmount = parseFloat(agent.budgetAmountUsd || '0');
      const startupBudget = parseFloat(agent.startupBudgetUsd || '0');

      res.json({
        budgetAmountUsd: budgetAmount,
        budgetPeriod: agent.budgetPeriod || 'monthly',
        budgetSpentUsd: spentUsd,
        budgetRemainingUsd: Math.max(0, budgetAmount - spentUsd),
        budgetResetAt: resetAt,
        startupScript: agent.startupScript,
        startupBudgetUsd: startupBudget,
        startupStatus: agent.startupStatus || 'pending',
        startupResultSummary: agent.startupResultSummary,
        startupLastRunAt: agent.startupLastRunAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Run agent startup script
  app.post("/api/agents/:id/startup-run", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      if (!agent.startupScript || agent.startupScript.trim().length === 0) {
        return res.status(400).json({ error: "No startup script configured for this agent" });
      }

      const startupBudget = parseFloat(agent.startupBudgetUsd || '0');
      if (startupBudget <= 0) {
        return res.status(400).json({ error: "Startup budget must be greater than $0" });
      }

      // Mark as running
      await storage.updateAgent(agent.id, { startupStatus: 'running' });

      const modelId = agent.aiModelId || 'moonshot-v1-128k';
      const temperature = (agent.aiTemperature || 60) / 100;
      const maxTokens = agent.aiMaxTokens || 4096;

      // Build research prompt
      const systemPrompt = agent.systemPrompt
        ? `${agent.systemPrompt}\n\n--- STARTUP RESEARCH TASK ---\nYou have been allocated a startup budget of $${startupBudget.toFixed(2)} for initial research. Complete the research task below thoroughly. Provide actionable findings, data points, and recommendations. Be concise but comprehensive.`
        : `You are ${agent.name}, an AI agent performing initial research. You have a budget of $${startupBudget.toFixed(2)}. Complete the research task thoroughly with actionable findings.`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `STARTUP RESEARCH TASK:\n\n${agent.startupScript}\n\nProvide a thorough research report with findings, data, and actionable recommendations.` },
      ];

      // Estimate input tokens for cost tracking
      const inputText = messages.map(m => m.content).join(' ');
      const estimatedInputTokens = estimateTokens(inputText);

      // Cap output tokens based on budget
      const modelRates = MODEL_COST_PER_1K_TOKENS[modelId] || MODEL_COST_PER_1K_TOKENS['default'];
      const inputCost = (estimatedInputTokens / 1000) * modelRates.input;
      const remainingBudget = startupBudget - inputCost;
      const maxOutputByBudget = Math.floor((remainingBudget / modelRates.output) * 1000);
      const cappedMaxTokens = Math.min(maxTokens, Math.max(500, maxOutputByBudget));

      try {
        const response = await chat({
          model: modelId as any,
          messages,
          temperature,
          max_tokens: cappedMaxTokens,
        });

        // Estimate cost
        const estimatedOutputTokens = estimateTokens(response);
        const totalCost = estimateCostUsd(modelId, estimatedInputTokens, estimatedOutputTokens);

        // Update agent with results
        const currentSpent = parseFloat(agent.budgetSpentUsd || '0');
        await storage.updateAgent(agent.id, {
          startupStatus: 'completed',
          startupResultSummary: response.slice(0, 10000),
          startupLastRunAt: new Date(),
          budgetSpentUsd: (currentSpent + totalCost).toFixed(2),
        });

        res.json({
          success: true,
          result: response,
          estimatedCostUsd: totalCost,
          tokensUsed: {
            input: estimatedInputTokens,
            output: estimatedOutputTokens,
          },
        });
      } catch (aiError: any) {
        await storage.updateAgent(agent.id, { startupStatus: 'failed' });
        res.status(500).json({ error: `AI request failed: ${aiError.message}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reset agent budget spending
  app.post("/api/agents/:id/budget-reset", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      
      await storage.updateAgent(agent.id, {
        budgetSpentUsd: '0',
        budgetResetAt: getNextResetDate(agent.budgetPeriod || 'monthly'),
      });
      
      res.json({ success: true, message: 'Budget reset successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ORGANIZATIONS, PROJECTS & TASKS API
  // ============================================

  // Organizations CRUD
  app.get("/api/organizations", async (req, res) => {
    try {
      const orgs = await storage.getOrganizations();
      res.json(orgs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.id);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const org = await storage.createOrganization(parsed.data);
      res.status(201).json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/organizations/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const org = await storage.updateOrganization(req.params.id, parsed.data);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/organizations/:id", async (req, res) => {
    try {
      await storage.deleteOrganization(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects CRUD
  app.get("/api/projects", async (req, res) => {
    try {
      const orgId = req.query.orgId as string | undefined;
      const projectsList = await storage.getProjects(orgId);
      res.json(projectsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const schema = z.object({
        orgId: z.string().min(1),
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        status: z.enum(["active", "completed", "archived"]).optional(),
        leadAgentId: z.string().optional().nullable(),
        agentIds: z.array(z.string()).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const project = await storage.createProject(parsed.data);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        status: z.enum(["active", "completed", "archived"]).optional(),
        leadAgentId: z.string().optional().nullable(),
        agentIds: z.array(z.string()).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const project = await storage.updateProject(req.params.id, parsed.data);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Project Tasks CRUD
  app.get("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const tasksList = await storage.getProjectTasks(req.params.projectId);
      res.json(tasksList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
        status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedAgentId: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const taskData = {
        ...parsed.data,
        projectId: req.params.projectId,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      };
      const task = await storage.createProjectTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/project-tasks/:id", async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedAgentId: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const updates: any = { ...parsed.data };
      if (parsed.data.dueDate) updates.dueDate = new Date(parsed.data.dueDate);
      if (parsed.data.status === 'done') updates.completedAt = new Date();
      const task = await storage.updateProjectTask(req.params.id, updates);
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/project-tasks/:id", async (req, res) => {
    try {
      await storage.deleteProjectTask(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Project context endpoint - assembles full context for chat
  app.get("/api/projects/:id/context", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const org = await storage.getOrganization(project.orgId);
      const tasksList = await storage.getProjectTasks(project.id);
      const allAgents = await storage.getAgents();
      const assignedAgents = allAgents.filter(a => 
        project.agentIds?.includes(a.id) || a.id === project.leadAgentId
      );
      res.json({
        organization: org,
        project,
        tasks: tasksList,
        agents: assignedAgents.map(a => ({ id: a.id, name: a.name })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // BOT TEMPLATES API
  // ============================================

  app.get("/api/bot-templates", async (_req, res) => {
    try {
      const templates = await storage.getBotTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/bot-templates/:id", async (req, res) => {
    try {
      const template = await storage.getBotTemplate(req.params.id);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bot-templates", async (req, res) => {
    try {
      const { insertBotTemplateSchema } = await import("@shared/schema");
      const parsed = insertBotTemplateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const template = await storage.createBotTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/bot-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateBotTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/bot-templates/:id", async (req, res) => {
    try {
      await storage.deleteBotTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AI GATEWAY INFO API
  // ============================================

  app.get("/api/gateway/providers", async (_req, res) => {
    try {
      const { getAvailableProviders } = await import('./ai-gateway');
      res.json(getAvailableProviders());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // PUBLIC BOT CONFIG & EMBED SCRIPT
  // ============================================

  app.get("/api/bots/:siteConfigId/public", async (req, res) => {
    try {
      const siteConfigId = req.params.siteConfigId;
      // Platform landing chat (BusinessPage, etc.) does not require a DB site config
      if (siteConfigId === 'platform-landing' || siteConfigId === 'platform') {
        return res.json({
          id: siteConfigId,
          name: 'Gateway AI',
          ui_config: {
            position: 'bottom-right',
            primaryColor: '#6366f1',
            greetingMessage: "Hi! I can help you learn about our free AI-powered websites, plans, and features. What would you like to know?",
            placeholderText: 'Ask about our services...',
          },
        });
      }
      const config = await storage.getSiteConfig(siteConfigId);
      if (!config || !config.chatbotEnabled) {
        return res.status(404).json({ error: "Bot not found or disabled" });
      }
      res.json({
        id: config.id,
        name: config.name,
        ui_config: {
          position: config.widgetPosition || 'bottom-right',
          primaryColor: config.widgetColor || '#2563eb',
          greetingMessage: config.greetingMessage || `Hi! How can I help you today?`,
          placeholderText: config.placeholderText || 'Type a message...',
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/embed.js", (_req, res) => {
    const baseUrl = `${_req.protocol}://${_req.get('host')}`;
    const script = `(function(){
  'use strict';
  var API=window.GATEWAY_API_URL||'${baseUrl}';
  var s=document.currentScript;
  var botId=s&&s.dataset.botId;
  if(!botId){console.error('[Gateway Bot] No bot-id');return;}
  var config=null,isOpen=false,msgs=[],loading=false;
  function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML;}
  function createHost(){
    var h=document.createElement('div');h.id='gateway-bot-'+botId;document.body.appendChild(h);
    var sh=h.attachShadow({mode:'open'});
    var st=document.createElement('style');
    st.textContent=':host{all:initial;font-family:system-ui,-apple-system,sans-serif}*{box-sizing:border-box;margin:0;padding:0}.gw{position:fixed;z-index:2147483647}.gw.br{bottom:16px;right:16px}.gw.bl{bottom:16px;left:16px}.gw.tr{top:16px;right:16px}.gw.tl{top:16px;left:16px}.gw-btn{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.15);transition:transform .2s}.gw-btn:hover{transform:scale(1.05)}.gw-chat{position:absolute;bottom:72px;right:0;width:360px;max-width:calc(100vw - 32px);max-height:calc(100vh - 100px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden;animation:gw-in .2s ease-out}@keyframes gw-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.gw-hdr{padding:16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e5e7eb}.gw-av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px}.gw-nm{font-weight:600;font-size:14px;color:#111827}.gw-st{font-size:12px;color:#10b981;display:flex;align-items:center;gap:4px}.gw-st::before{content:"";width:6px;height:6px;background:#10b981;border-radius:50%}.gw-cl{width:32px;height:32px;border:none;background:transparent;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280}.gw-cl:hover{background:#f3f4f6}.gw-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;min-height:300px;max-height:400px}.gw-msg{display:flex;gap:8px;max-width:85%}.gw-msg.u{align-self:flex-end}.gw-bbl{padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word}.gw-msg.a .gw-bbl{background:#f3f4f6;color:#111827;border-bottom-left-radius:4px}.gw-msg.u .gw-bbl{color:#fff;border-bottom-right-radius:4px}.gw-typ{display:flex;gap:4px;padding:12px 14px;background:#f3f4f6;border-radius:16px;border-bottom-left-radius:4px;width:fit-content}.gw-dot{width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:gw-b 1.4s infinite ease-in-out both}.gw-dot:nth-child(1){animation-delay:-.32s}.gw-dot:nth-child(2){animation-delay:-.16s}@keyframes gw-b{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}.gw-inp{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px}.gw-inp input{flex:1;padding:10px 14px;border:1px solid #e5e7eb;border-radius:24px;font-size:14px;outline:none}.gw-inp button{width:40px;height:40px;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}.gw-inp button:disabled{opacity:.5;cursor:not-allowed}.gw-empty{text-align:center;padding:32px 16px;color:#9ca3af}@media(max-width:480px){.gw-chat{position:fixed;bottom:80px!important;right:16px!important;left:16px!important;width:auto!important}}';
    sh.appendChild(st);return{host:h,shadow:sh};
  }
  async function fetchCfg(){
    try{var r=await fetch(API+'/api/bots/'+botId+'/public');if(!r.ok)throw 0;config=await r.json();}
    catch(e){config={name:'Bot',ui_config:{position:'bottom-right',primaryColor:'#2563eb',greetingMessage:'Hello! How can I help?',placeholderText:'Type a message...'}};}
  }
  async function send(txt,shadow){
    if(!txt.trim()||loading)return;
    msgs.push({role:'user',content:txt});loading=true;render(shadow);
    try{
      var r=await fetch(API+'/api/website-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:txt,siteConfigId:botId,visitorId:'embed-'+Date.now(),history:msgs.filter(function(m){return m.role!=='system';}).slice(-10)})});
      var d=await r.json();msgs.push({role:'assistant',content:d.response||'Sorry, I could not respond.'});
    }catch(e){msgs.push({role:'assistant',content:'Sorry, something went wrong.'});}
    loading=false;render(shadow);
  }
  function render(shadow){
    var w=shadow.querySelector('.gw')||document.createElement('div');
    var pos=config&&config.ui_config&&config.ui_config.position||'bottom-right';
    var posClass=pos==='bottom-left'?'bl':pos==='top-right'?'tr':pos==='top-left'?'tl':'br';
    w.className='gw '+posClass;w.innerHTML='';
    var pc=config&&config.ui_config&&config.ui_config.primaryColor||'#2563eb';
    if(!isOpen){
      w.innerHTML='<button class="gw-btn" style="background:'+pc+'"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>';
      w.querySelector('.gw-btn').onclick=function(){isOpen=true;render(shadow);};
    }else{
      var gm=config&&config.ui_config&&config.ui_config.greetingMessage||'Hello!';
      var ph=config&&config.ui_config&&config.ui_config.placeholderText||'Type a message...';
      var nm=config&&config.name||'Bot';
      var html='<div class="gw-chat"><div class="gw-hdr"><div class="gw-av" style="background:'+pc+'">'+nm[0].toUpperCase()+'</div><div style="flex:1"><div class="gw-nm">'+esc(nm)+'</div><div class="gw-st">Online</div></div><button class="gw-cl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div><div class="gw-msgs">';
      if(msgs.length===0){html+='<div class="gw-empty"><p>'+esc(gm)+'</p></div>';}
      else{msgs.forEach(function(m){html+='<div class="gw-msg '+(m.role==='user'?'u':'a')+'"><div class="gw-bbl" style="'+(m.role==='user'?'background:'+pc:'')+'">'+ esc(m.content)+'</div></div>';});}
      if(loading){html+='<div class="gw-msg a"><div class="gw-typ"><span class="gw-dot"></span><span class="gw-dot"></span><span class="gw-dot"></span></div></div>';}
      html+='</div><div class="gw-inp"><input type="text" placeholder="'+esc(ph)+'"/><button style="background:'+pc+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div></div>';
      w.innerHTML=html;
      w.querySelector('.gw-cl').onclick=function(){isOpen=false;render(shadow);};
      var inp=w.querySelector('.gw-inp input');var btn=w.querySelector('.gw-inp button');
      btn.onclick=function(){var v=inp.value.trim();if(v){inp.value='';send(v,shadow);}};
      inp.onkeydown=function(e){if(e.key==='Enter')btn.click();};
      var msgArea=w.querySelector('.gw-msgs');if(msgArea)msgArea.scrollTop=msgArea.scrollHeight;
    }
    if(!shadow.contains(w))shadow.appendChild(w);
  }
  async function init(){await fetchCfg();var c=createHost();render(c.shadow);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();`;
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(script);
  });

  // ============================================
  // SITE CONFIG (AI BIZ BOT ADMIN) API
  // ============================================

  app.get("/api/site-configs", async (_req, res) => {
    try {
      const configs = await storage.getSiteConfigs();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/site-configs", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200),
        domain: z.string().optional(),
        placeId: z.string().optional(),
        placeData: z.any().optional(),
        assignedAgentId: z.string().nullable().optional(),
        systemPromptOverride: z.string().optional(),
        chatbotEnabled: z.boolean().optional(),
        voiceConciergeEnabled: z.boolean().optional(),
        widgetPosition: z.string().optional(),
        widgetColor: z.string().optional(),
        greetingMessage: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const config = await storage.createSiteConfig(parsed.data);
      res.status(201).json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/site-configs/:id", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        domain: z.string().nullable().optional(),
        placeId: z.string().nullable().optional(),
        placeData: z.any().optional(),
        assignedAgentId: z.string().nullable().optional(),
        systemPromptOverride: z.string().nullable().optional(),
        chatbotEnabled: z.boolean().optional(),
        voiceConciergeEnabled: z.boolean().optional(),
        widgetPosition: z.string().optional(),
        widgetColor: z.string().optional(),
        greetingMessage: z.string().nullable().optional(),
        knowledgeLibrary: z.array(z.object({ id: z.string(), title: z.string(), content: z.string(), addedAt: z.string() })).nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const updated = await storage.updateSiteConfig(req.params.id, parsed.data as any);
      if (!updated) return res.status(404).json({ error: "Site config not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/site-configs/:id", async (req, res) => {
    try {
      await storage.deleteSiteConfig(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/site-configs/:id/chat-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getChatLogs(req.params.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/site-configs/:id/knowledge", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const lib = (site as any).knowledgeLibrary;
      res.json(Array.isArray(lib) ? lib : []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/site-configs/:id/knowledge", async (req, res) => {
    try {
      const schema = z.object({ title: z.string().min(1).max(200), content: z.string().max(500000) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const existing = Array.isArray((site as any).knowledgeLibrary) ? (site as any).knowledgeLibrary : [];
      const doc = {
        id: crypto.randomUUID(),
        title: parsed.data.title,
        content: parsed.data.content,
        addedAt: new Date().toISOString(),
      };
      const updated = await storage.updateSiteConfig(req.params.id, { knowledgeLibrary: [...existing, doc] } as any);
      res.json(updated?.knowledgeLibrary ?? [...existing, doc]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/site-configs/:id/knowledge/:docId", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const existing = Array.isArray((site as any).knowledgeLibrary) ? (site as any).knowledgeLibrary : [];
      const next = existing.filter((d: any) => d.id !== req.params.docId);
      await storage.updateSiteConfig(req.params.id, { knowledgeLibrary: next } as any);
      res.json({ success: true, knowledgeLibrary: next });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List demo leads for chat admin (new customers + demo URLs)
  app.get("/api/admin/demo-leads", async (req, res) => {
    try {
      const leads = await storage.getAllDemoLeads();
      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const baseUrl = `${protocol}://${host}`;
      const withUrls = await Promise.all(
        leads.map(async (lead) => {
          const demoUrl = `${baseUrl}/demo?token=${lead.magicToken}`;
          let siteId: string | null = null;
          if (lead.placeId) {
            const site = await storage.getSiteConfigByPlaceId(lead.placeId);
            siteId = site?.id ?? null;
          }
          return {
            id: lead.id,
            phone: lead.phone,
            name: lead.name,
            businessName: lead.businessName,
            businessAddress: lead.businessAddress,
            placeId: lead.placeId,
            status: lead.status,
            magicTokenUsed: lead.magicTokenUsed,
            demoStartedAt: lead.demoStartedAt,
            demoReadyAt: lead.demoReadyAt,
            createdAt: lead.createdAt,
            demoUrl,
            siteId,
          };
        })
      );
      res.json(withUrls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // OG META TAG MANAGEMENT API
  // ============================================

  app.get("/api/admin/og-settings", async (_req, res) => {
    try {
      const settings = await storage.getAllOgSettings();
      res.json({ settings, defaults: DEFAULT_OG });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/og-settings", async (req, res) => {
    try {
      const { pagePath, ogTitle, ogDescription, ogUrl, ogImage, ogType, ogSiteName, twitterCard } = req.body;
      if (!pagePath || !ogTitle || !ogDescription) {
        return res.status(400).json({ error: "Page path, title, and description are required" });
      }
      const result = await storage.upsertOgSettings({
        pagePath: pagePath.startsWith("/") ? pagePath : `/${pagePath}`,
        ogTitle,
        ogDescription,
        ogUrl: ogUrl || null,
        ogImage: ogImage || null,
        ogType: ogType || "website",
        ogSiteName: ogSiteName || null,
        twitterCard: twitterCard || "summary_large_image",
      });
      res.json({ success: true, settings: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/og-settings/:id", async (req, res) => {
    try {
      await storage.deleteOgSettings(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SITES & LEADS ADMIN API
  // ============================================

  app.get("/api/admin/sites/summary", async (_req, res) => {
    try {
      const sites = await storage.getSiteConfigs();
      const summaries = await Promise.all(sites.map(async (site) => {
        const logs = await storage.getChatLogs(site.id, 10000);
        const uniqueVisitors = new Set(logs.filter(l => l.visitorId).map(l => l.visitorId));
        const lastActivity = logs.length > 0 ? logs[0].createdAt : null;
        const placeData = site.placeData as any;
        return {
          id: site.id,
          name: site.name,
          domain: site.domain,
          placeId: site.placeId,
          chatbotEnabled: site.chatbotEnabled,
          voiceConciergeEnabled: site.voiceConciergeEnabled,
          createdAt: site.createdAt,
          updatedAt: site.updatedAt,
          totalVisitors: uniqueVisitors.size,
          totalMessages: logs.length,
          lastActivity,
          businessPhone: placeData?.phone || null,
          businessAddress: placeData?.address || null,
          industry: placeData?.industry || null,
          rating: placeData?.rating || null,
          reviewCount: placeData?.reviewCount || null,
        };
      }));
      summaries.sort((a, b) => (b.totalMessages || 0) - (a.totalMessages || 0));
      res.json(summaries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sites/:id/visitors", async (req, res) => {
    try {
      const logs = await storage.getChatLogs(req.params.id, 10000);
      const visitorMap = new Map<string, { visitorId: string; messageCount: number; firstSeen: Date | null; lastSeen: Date | null }>();
      for (const log of logs) {
        const vid = log.visitorId || "anonymous";
        if (!visitorMap.has(vid)) {
          visitorMap.set(vid, { visitorId: vid, messageCount: 0, firstSeen: log.createdAt, lastSeen: log.createdAt });
        }
        const v = visitorMap.get(vid)!;
        v.messageCount++;
        if (log.createdAt && (!v.firstSeen || log.createdAt < v.firstSeen)) v.firstSeen = log.createdAt;
        if (log.createdAt && (!v.lastSeen || log.createdAt > v.lastSeen)) v.lastSeen = log.createdAt;
      }
      const visitors = Array.from(visitorMap.values()).sort((a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0));
      res.json(visitors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sites/:id/chat-history", async (req, res) => {
    try {
      const visitorId = req.query.visitorId as string | undefined;
      const logs = await storage.getChatLogs(req.params.id, 10000);
      const filtered = visitorId ? logs.filter(l => l.visitorId === visitorId) : logs;
      filtered.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sites/analytics", async (_req, res) => {
    try {
      const sites = await storage.getSiteConfigs();
      let totalVisitors = 0;
      let totalMessages = 0;
      let activeSites = 0;
      for (const site of sites) {
        const logs = await storage.getChatLogs(site.id, 10000);
        const uniqueVisitors = new Set(logs.filter(l => l.visitorId).map(l => l.visitorId));
        totalVisitors += uniqueVisitors.size;
        totalMessages += logs.length;
        if (logs.length > 0) activeSites++;
      }
      res.json({ totalSites: sites.length, activeSites, totalVisitors, totalMessages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sites/leads", async (_req, res) => {
    try {
      const sites = await storage.getSiteConfigs();
      const prospects = await storage.getVlmProspects({ limit: 10000 });
      const leads = sites.map(site => {
        const placeData = site.placeData as any;
        const matchedProspect = prospects.find(p => p.googlePlaceId && p.googlePlaceId === site.placeId);
        return {
          siteId: site.id,
          siteName: site.name,
          placeId: site.placeId,
          domain: site.domain,
          chatbotEnabled: site.chatbotEnabled,
          voiceConciergeEnabled: site.voiceConciergeEnabled,
          createdAt: site.createdAt,
          businessPhone: placeData?.phone || matchedProspect?.phone || null,
          businessAddress: placeData?.address || null,
          industry: placeData?.industry || matchedProspect?.industry || null,
          rating: placeData?.rating || null,
          reviewCount: placeData?.reviewCount || null,
          prospectId: matchedProspect?.id || null,
          qualityScore: matchedProspect?.qualityScore || null,
          prospectStatus: matchedProspect?.status || null,
          smsSent: matchedProspect?.notes?.includes("SMS sent") || false,
          siteGenerated: matchedProspect?.notes?.includes("Site generated") || false,
        };
      });
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ADMIN COMMAND CHAT API
  // ============================================
  app.post("/api/admin/command-chat", async (req, res) => {
    try {
      const chatSchema = z.object({
        agentId: z.string().min(1),
        message: z.string().min(1).max(4000),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { agentId, message, history } = parsed.data;

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Gather live business context
      let businessContext = '';
      try {
        const sites = await storage.getSiteConfigs();
        const customers = await storage.getCustomers();
        const allChatLogs: any[] = [];
        for (const site of sites.slice(0, 50)) {
          const logs = await storage.getChatLogs(site.id, 200);
          allChatLogs.push(...logs);
        }
        const chatLogs = allChatLogs;
        const prospects = await storage.getVlmProspects({ limit: 10000 });
        const campaigns = await storage.getVlmCampaigns();

        const activeSites = sites.filter(s => s.chatbotEnabled || s.voiceConciergeEnabled);
        const totalVisitors = new Set(chatLogs.map((l: any) => l.visitorId).filter(Boolean)).size;
        const totalMessages = chatLogs.length;
        const wonProspects = prospects.filter(p => p.status === 'won');
        const calledProspects = prospects.filter(p => p.status === 'called');
        const newCustomers = customers.filter((c: any) => c.status === 'new');
        const activeCustomers = customers.filter((c: any) => c.status === 'active');

        businessContext = `\n\n--- ADMIN BUSINESS CONTEXT (LIVE DATA) ---
SITES: ${sites.length} total, ${activeSites.length} active (with chatbot/voice enabled)
VISITORS: ${totalVisitors} unique visitors across all sites
MESSAGES: ${totalMessages} total chat messages
CUSTOMERS: ${customers.length} total (${newCustomers.length} new, ${activeCustomers.length} active)
LEADS/PROSPECTS: ${prospects.length} total, ${calledProspects.length} called, ${wonProspects.length} converted
CAMPAIGNS: ${campaigns.length || 0} VLM campaigns

Top Sites by Activity:`;

        const sitesWithCounts = sites.map(s => {
          const siteLogs = chatLogs.filter((l: any) => l.siteConfigId === s.id);
          const visitors = new Set(siteLogs.map((l: any) => l.visitorId).filter(Boolean)).size;
          return { name: s.name, visitors, messages: siteLogs.length, chatbot: s.chatbotEnabled, voice: s.voiceConciergeEnabled };
        }).sort((a, b) => b.messages - a.messages).slice(0, 10);

        sitesWithCounts.forEach(s => {
          businessContext += `\n- ${s.name}: ${s.visitors} visitors, ${s.messages} messages${s.chatbot ? ' [Chat]' : ''}${s.voice ? ' [Voice]' : ''}`;
        });

        if (customers.length > 0) {
          businessContext += `\n\nRecent Customers:`;
          customers.slice(0, 5).forEach((c: any) => {
            businessContext += `\n- ${c.name} (${c.status})${c.phone ? ' Ph:' + c.phone : ''}${c.email ? ' ' + c.email : ''}`;
          });
        }

        if (prospects.length > 0) {
          businessContext += `\n\nRecent Prospects:`;
          prospects.slice(0, 5).forEach((p: any) => {
            businessContext += `\n- ${p.businessName} (${p.status}, score:${p.qualityScore || 'N/A'})${p.phone ? ' Ph:' + p.phone : ''}`;
          });
        }

        businessContext += `\n--- END BUSINESS CONTEXT ---`;
      } catch (contextError) {
        console.warn('Failed to gather business context:', contextError);
        businessContext = '\n\n[Business context unavailable - some data could not be loaded]';
      }

      // Build admin-enhanced system prompt
      const discProfile = `D:${agent.dominance} I:${agent.influence} S:${agent.steadiness} C:${agent.conscientiousness}`;
      const systemPrompt = (agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant with DISC profile: ${discProfile}. Voice style: ${agent.voiceName}.`) + `

You are in ADMIN COMMAND MODE. The admin is using you to manage and monitor business operations. You have access to live business data below.

Your capabilities in this mode:
- Report on site analytics, visitor activity, and chat history
- Analyze lead quality scores and conversion rates
- Summarize customer status and pipeline health
- Advise on VoiceLeadMachine campaign strategy
- Help configure agent settings and telephony
- Provide actionable business intelligence and recommendations

Be direct, data-driven, and actionable. Reference specific numbers from the live data. If the admin asks about something not in the data, say what data you do have and suggest how to get more.
${businessContext}`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-10).map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message },
      ];

      const agentModel = agent.aiModelId || 'kimi-k2-turbo-preview';
      const agentTemp = agent.aiTemperature ? agent.aiTemperature / 100 : 0.7;
      const agentMaxTokens = agent.aiMaxTokens || 4096;

      let modelToUse: string;
      if (agentModel === 'kimi-k2.5' || agentModel === 'kimi-k2-5') {
        modelToUse = KIMI_MODELS.K2_5;
      } else if (agentModel === 'kimi-k2-thinking') {
        modelToUse = KIMI_MODELS.K2_THINKING;
      } else if (agentModel.startsWith('kimi-') || agentModel.startsWith('moonshot-')) {
        modelToUse = agentModel;
      } else {
        modelToUse = KIMI_MODELS.K2_TURBO;
      }

      let response: string;
      try {
        response = await chat({
          model: modelToUse,
          messages,
          temperature: agentTemp,
          max_tokens: agentMaxTokens,
        });
      } catch (firstError: any) {
        console.warn('Admin command chat first attempt failed, retrying:', firstError.message);
        response = await chat({
          model: modelToUse,
          messages,
          temperature: agentTemp,
          max_tokens: agentMaxTokens,
        });
      }

      res.json({ response });
    } catch (error: any) {
      console.error('Admin command chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate response' });
    }
  });

  // ============================================
  // PUBLIC AGENT CHAT API
  // ============================================

  // ============ Website Preview Chat (AI Biz Bot) ============
  app.post("/api/website-chat", async (req, res) => {
    try {
      const schema = z.object({
        message: z.string().min(1).max(4000),
        businessName: z.string().optional(),
        businessAddress: z.string().optional(),
        businessPhone: z.string().optional(),
        siteConfigId: z.string().optional(),
        visitorId: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { message, businessName, businessAddress, businessPhone, siteConfigId, visitorId, history } = parsed.data;

      let siteConfig: any = null;
      let resolvedProvider: any = 'kimi';
      let resolvedModel: string | undefined;
      let customSystemPrompt: string | undefined;

      const isPlatformChat = siteConfigId === 'platform-landing';

      if (siteConfigId && !isPlatformChat) {
        siteConfig = await storage.getSiteConfig(siteConfigId);
        if (siteConfig) {
          resolvedProvider = siteConfig.modelProvider || 'kimi';
          resolvedModel = siteConfig.modelName || undefined;
          customSystemPrompt = siteConfig.systemPromptOverride || undefined;
        }
      }

      const knowledgeLibrary = Array.isArray((siteConfig as any)?.knowledgeLibrary) ? (siteConfig as any).knowledgeLibrary as Array<{ id: string; title: string; content: string }> : [];
      const KNOWLEDGE_CAP = 32000;
      let knowledgeBlock = "";
      if (knowledgeLibrary.length > 0) {
        const combined = knowledgeLibrary.map((d) => `## ${d.title}\n${d.content}`).join("\n\n---\n\n");
        knowledgeBlock = "\n\n--- KNOWLEDGE LIBRARY (use this to answer questions accurately) ---\n\n" + combined.slice(0, KNOWLEDGE_CAP) + (combined.length > KNOWLEDGE_CAP ? "\n\n[truncated]" : "");
      }

      let systemPrompt: string;
      if (isPlatformChat) {
        systemPrompt = `You are Gateway AI, the helpful assistant for AI Biz Bot by Gateway Global AI. You help visitors understand the platform and its services.

Key information about the platform:
- We create FREE professional AI-powered websites for small businesses
- Websites are generated from Google Maps/Places data automatically
- Every website comes with an AI chat concierge and voice AI assistant
- No credit card required for the free plan
- Plans: Free (1 business, static site, shared SMS, 500 voice minutes), Business ($49/mo, 5 businesses, edit content, review management, SMS admin), Business Voice ($99/mo, dedicated phone, unlimited voice, custom voice persona), Enterprise (custom pricing, API access, white-label)
- Websites are built using real Google Maps data: reviews, photos, hours, location
- Business owners can manage their sites from the My Account dashboard
- The platform uses Kimi 2.5 AI for intelligent responses

Be friendly, concise, and helpful. Encourage visitors to try it out by searching for their business. Keep responses brief since this is a chat widget. If asked about technical details you don't know, suggest they contact us.`;
      } else {
        const basePrompt = customSystemPrompt || `You are the AI Biz Bot, a friendly AI assistant for ${businessName || 'this business'}. You help website visitors with questions about the business.

Business details:
- Name: ${businessName || 'N/A'}
- Address: ${businessAddress || 'N/A'}  
- Phone: ${businessPhone || 'N/A'}

You are helpful, concise, and conversational. Answer questions about the business, help with directions, hours, and services. If you don't know something specific, suggest the visitor call or visit. Keep responses brief since this is a chat widget.`;
        systemPrompt = basePrompt + knowledgeBlock;
      }

      const gatewayMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.map(h => ({ role: h.role as 'user' | 'assistant' as const, content: h.content })),
        { role: 'user' as const, content: message },
      ];

      const { gatewayChat } = await import('./ai-gateway');
      const result = await gatewayChat({
        messages: gatewayMessages,
        provider: resolvedProvider,
        model: resolvedModel,
        temperature: 0.7,
        max_tokens: 500,
      });

      if (siteConfigId && !isPlatformChat) {
        try {
          await storage.createChatLog({ siteConfigId, visitorId: visitorId || 'anonymous', role: 'user', content: message });
          await storage.createChatLog({ siteConfigId, visitorId: visitorId || 'anonymous', role: 'assistant', content: result.response });
        } catch (logErr) {
          console.error("[Website Chat] Failed to log chat:", logErr);
        }
      }

      res.json({ response: result.response, provider: result.provider, model: result.model });
    } catch (error: any) {
      console.error("[Website Chat] Error:", error.message);
      res.status(500).json({ error: "Failed to get response" });
    }
  });

  // Simple in-memory rate limiting for public chat
  const chatRateLimits = new Map<string, { count: number; resetTime: number }>();
  const CHAT_RATE_LIMIT = 20; // requests per minute
  const CHAT_RATE_WINDOW = 60000; // 1 minute in ms

  app.post("/api/chat", async (req, res) => {
    try {
      // Rate limiting by IP
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const rateInfo = chatRateLimits.get(clientIp);
      
      if (rateInfo) {
        if (now > rateInfo.resetTime) {
          chatRateLimits.set(clientIp, { count: 1, resetTime: now + CHAT_RATE_WINDOW });
        } else if (rateInfo.count >= CHAT_RATE_LIMIT) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        } else {
          rateInfo.count++;
        }
      } else {
        chatRateLimits.set(clientIp, { count: 1, resetTime: now + CHAT_RATE_WINDOW });
      }

      // Validate request body with Zod
      const chatSchema = z.object({
        agentId: z.string().min(1),
        message: z.string().min(1).max(4000),
        projectId: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).max(20).optional().default([]),
      });

      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { agentId, message, history, projectId } = parsed.data;

      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Build system prompt based on agent personality
      const discProfile = `D:${agent.dominance} I:${agent.influence} S:${agent.steadiness} C:${agent.conscientiousness}`;
      let systemPrompt = agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant with the following DISC personality profile: ${discProfile}. 
Be conversational, helpful, and maintain a consistent personality. Your voice style is ${agent.voiceName}.
Keep responses concise and engaging. If asked personal questions, you can share that you're an AI assistant named ${agent.name}.`;

      // Inject project context if a projectId is provided
      if (projectId) {
        try {
          const project = await storage.getProject(projectId);
          if (project) {
            const org = await storage.getOrganization(project.orgId);
            const projectTasksList = await storage.getProjectTasks(project.id);
            const todoTasks = projectTasksList.filter(t => t.status === 'todo');
            const inProgressTasks = projectTasksList.filter(t => t.status === 'in_progress');
            const reviewTasks = projectTasksList.filter(t => t.status === 'review');
            const doneTasks = projectTasksList.filter(t => t.status === 'done');

            let contextBlock = `\n\n--- PROJECT CONTEXT ---`;
            if (org) contextBlock += `\nOrganization: ${org.name}${org.description ? ' - ' + org.description : ''}`;
            contextBlock += `\nProject: ${project.name} (${project.status})`;
            if (project.description) contextBlock += `\nDescription: ${project.description}`;
            contextBlock += `\nTask Summary: ${todoTasks.length} to-do, ${inProgressTasks.length} in progress, ${reviewTasks.length} in review, ${doneTasks.length} done`;
            
            if (todoTasks.length > 0 || inProgressTasks.length > 0 || reviewTasks.length > 0) {
              contextBlock += `\n\nActive Tasks:`;
              [...inProgressTasks, ...reviewTasks, ...todoTasks].slice(0, 10).forEach(t => {
                contextBlock += `\n- [${t.status.toUpperCase()}] ${t.title}${t.priority !== 'medium' ? ' (' + t.priority + ')' : ''}${t.description ? ': ' + t.description.slice(0, 100) : ''}`;
              });
            }
            contextBlock += `\n--- END PROJECT CONTEXT ---`;
            contextBlock += `\n\nYou are working on the "${project.name}" project. Reference the project tasks and context in your responses. Help the user manage, plan, and execute this project.`;
            
            systemPrompt += contextBlock;
          }
        } catch (err) {
          console.warn('Failed to load project context for chat:', err);
        }
      }

      // Build conversation messages
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-10).map((m: any) => ({ 
          role: m.role as 'user' | 'assistant', 
          content: m.content 
        })),
        { role: 'user' as const, content: message },
      ];

      // Use agent's configured model, falling back to K2_TURBO
      const agentModel = agent.aiModelId || 'kimi-k2-turbo-preview';
      const agentTemp = agent.aiTemperature ? agent.aiTemperature / 100 : 0.7;
      const agentMaxTokens = agent.aiMaxTokens || 4096;

      // Map model IDs to Kimi model constants
      let modelToUse: string;
      if (agentModel === 'kimi-k2.5' || agentModel === 'kimi-k2-5') {
        modelToUse = KIMI_MODELS.K2_5;
      } else if (agentModel === 'kimi-k2-thinking') {
        modelToUse = KIMI_MODELS.K2_THINKING;
      } else if (agentModel.startsWith('kimi-') || agentModel.startsWith('moonshot-')) {
        modelToUse = agentModel;
      } else {
        modelToUse = KIMI_MODELS.K2_TURBO;
      }

      // Retry once on transient failures
      let response: string;
      try {
        response = await chat({
          model: modelToUse,
          messages,
          temperature: agentTemp,
          max_tokens: agentMaxTokens,
        });
      } catch (firstError: any) {
        console.warn('Chat first attempt failed, retrying:', firstError.message);
        response = await chat({
          model: modelToUse,
          messages,
          temperature: agentTemp,
          max_tokens: agentMaxTokens,
        });
      }

      res.json({ response });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate response' });
    }
  });

  // ============================================
  // CALL LOGS API (alias for Gateway Admin)
  // ============================================

  // Get call logs (for Gateway Admin Usage & Logs tab)
  app.get("/api/call-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getCallLogs(undefined, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // CUSTOMER/LEAD MANAGEMENT API
  // ============================================

  // Get all customers (with optional search)
  app.get("/api/customers", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const customerList = await storage.getCustomers(search);
      res.json(customerList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create customer
  app.post("/api/customers", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const customer = await storage.createCustomer(parsed.data);
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update customer
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ Google Cloud Text-to-Speech API ============

  // Gemini TTS - Available voices (Chirp 3 HD)
  const GEMINI_TTS_VOICES = [
    { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Warm and expressive' },
    { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
    { id: 'Leda', name: 'Leda', gender: 'female', description: 'Soft and soothing' },
    { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Bright and energetic' },
    { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
    { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
    { id: 'Orus', name: 'Orus', gender: 'male', description: 'Professional and clear' },
    { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
  ];

  // List available Gemini TTS voices
  app.get("/api/tts/voices", async (req, res) => {
    res.json({ voices: GEMINI_TTS_VOICES });
  });

  // Synthesize speech using Gemini TTS
  app.post("/api/tts/synthesize", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      
      if (!text || !voiceName) {
        return res.status(400).json({ error: "text and voiceName are required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      // Use Gemini 2.5 Flash TTS model
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text }]
            }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName
                  }
                }
              }
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Gemini TTS error:", error);
        return res.status(500).json({ error: "Failed to generate speech" });
      }

      const data = await response.json();
      
      // Extract audio data from response
      const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';
      
      if (!audioData) {
        return res.status(500).json({ error: "No audio data in response" });
      }

      res.json({ 
        audio: audioData,
        contentType: mimeType
      });
    } catch (error: any) {
      console.error("TTS synthesize error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ Twilio Webhooks for Inbound Communications ============

  // Helper to escape XML entities for TwiML safety
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Twilio signature validation middleware
  const validateTwilioSignature = (req: any, res: any, next: any) => {
    // Skip validation in development or if explicitly disabled
    const skipValidation = process.env.SKIP_TWILIO_VALIDATION === 'true' || 
      process.env.NODE_ENV === 'development';
    
    if (skipValidation) {
      console.log('[Twilio Webhook] Skipping validation (development mode)');
      return next();
    }
    
    const twilioSignature = req.headers['x-twilio-signature'];
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilioSignature || !authToken) {
      console.warn('[Twilio Webhook] Missing signature or auth token');
      return res.status(403).send('Forbidden');
    }
    
    // Validate using Twilio's validateRequest
    try {
      // Handle proxy scenarios - use x-forwarded-proto if available
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.get('host');
      const url = `${protocol}://${host}${req.originalUrl}`;
      
      console.log(`[Twilio Webhook] Validating URL: ${url}`);
      
      let isValid = twilio.validateRequest(authToken, twilioSignature, url, req.body);
      
      // Try with https if http failed (common proxy issue)
      if (!isValid && protocol === 'http') {
        const httpsUrl = `https://${host}${req.originalUrl}`;
        console.log(`[Twilio Webhook] Retrying with HTTPS: ${httpsUrl}`);
        isValid = twilio.validateRequest(authToken, twilioSignature, httpsUrl, req.body);
      }
      
      if (!isValid) {
        console.warn('[Twilio Webhook] Invalid signature for all URL variants');
        return res.status(403).send('Forbidden');
      }
      
      next();
    } catch (error) {
      console.error('[Twilio Webhook] Validation error:', error);
      return res.status(403).send('Forbidden');
    }
  };

  // Inbound SMS webhook - receives SMS from Twilio with Caller ID lookup
  app.post("/webhook/sms", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, Body, MessageSid } = req.body;
      
      console.log(`[SMS Webhook] From: ${From}, To: ${To}, Body: ${Body?.substring(0, 50)}...`);
      
      // ========== AI BIZ BOT - Business Owner SMS Commands ==========
      const bodyLower = (Body || '').toLowerCase().trim();
      
      // Business owner commands for website/business management
      const bizBotKeywords = ['visitors', 'how many visitors', 'traffic', 'reviews', 'bad reviews', 'update hours', 
        'change hours', 'my website', 'website stats', 'check website', 'new reviews', 'schedule', 'calendar',
        'add task', 'create task', 'my tasks', 'create event', 'schedule meeting',
        'report', 'area report', 'business report', 'competitors', 'competition', 'nearby businesses',
        'search ', 'market '];
      const isBizBotCommand = bizBotKeywords.some(kw => bodyLower.includes(kw));
      
      if (isBizBotCommand) {
        console.log(`[SMS Biz Bot] Detected business command from: ${From}`);
        
        try {
          // Check if this phone is registered as a business owner
          const customer = await storage.getCustomerByPhone(From);
          
          let responseText = '';
          
          // Handle specific commands - MVP demo mode with sample data
          // TODO: Integrate with real analytics, Google Workspace tools, and business data
          if (bodyLower.includes('visitors') || bodyLower.includes('traffic') || bodyLower.includes('website stats')) {
            responseText = '📊 Website Stats (Last 24h) [Demo]\n\n' +
              '👥 Visitors: 142\n' +
              '💬 Chat conversations: 12\n' +
              '📞 Calls handled: 3\n' +
              '⭐ New reviews: 2\n\n' +
              'Reply "reviews" to see new reviews.';
          } else if (bodyLower.includes('bad reviews') || bodyLower.includes('negative')) {
            responseText = '⚠️ Recent Low Reviews\n\n' +
              '⭐⭐ "Service was slow" - John D. (2 days ago)\n\n' +
              'Reply "respond [your message]" to reply to this review.';
          } else if (bodyLower.includes('reviews') || bodyLower.includes('new reviews')) {
            responseText = '⭐ Recent Reviews\n\n' +
              '⭐⭐⭐⭐⭐ "Great service!" - Sarah M.\n' +
              '⭐⭐⭐⭐ "Good food, nice atmosphere" - Mike T.\n' +
              '⭐⭐ "Service was slow" - John D.\n\n' +
              'Reply "bad" to filter low ratings.';
          } else if (bodyLower.includes('update hours') || bodyLower.includes('change hours')) {
            // Parse hours from message if provided
            const hoursMatch = Body.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
            if (hoursMatch) {
              responseText = `✅ Hours Updated!\n\nNew hours: ${hoursMatch[1]} - ${hoursMatch[2]}\n\nYour website now shows the updated hours.`;
            } else {
              responseText = '⏰ Update Hours\n\nTo update, reply with the new hours like:\n"Update hours 9am to 9pm"';
            }
          } else if (bodyLower.includes('schedule') || bodyLower.includes('calendar') || bodyLower.includes('create event')) {
            // Check if Google Workspace is connected for this business
            const businessId = customer?.id || 'default';
            const credentials = googleWorkspaceCredentials.get(businessId);
            
            if (credentials) {
              // Parse event details from message
              responseText = '📅 To schedule an event, reply with:\n"Schedule [title] on [date] at [time]"\n\nExample: "Schedule Team Meeting on Monday at 3pm"';
            } else {
              responseText = '📅 Google Calendar not connected.\n\nVisit your admin panel to connect Google Workspace for calendar, tasks, and docs integration.';
            }
          } else if (bodyLower.includes('add task') || bodyLower.includes('create task') || bodyLower.includes('my tasks')) {
            if (bodyLower.includes('my tasks')) {
              responseText = '📋 Your Tasks\n\n' +
                '☐ Follow up with vendor\n' +
                '☐ Review monthly reports\n' +
                '☐ Update menu prices\n\n' +
                'Reply "add task [description]" to add new.';
            } else {
              // Parse task from message
              const taskMatch = Body.match(/(?:add task|create task)\s+(.+)/i);
              if (taskMatch) {
                responseText = `✅ Task Added: "${taskMatch[1]}"\n\nYou can view all tasks by replying "my tasks".`;
              } else {
                responseText = '📋 Add Task\n\nReply with "add task [description]"\n\nExample: "add task Call supplier about delivery"';
              }
            }
          } else if (bodyLower.includes('report') || bodyLower.includes('competitors') || bodyLower.includes('competition') || bodyLower.includes('nearby businesses') || bodyLower.startsWith('search ') || bodyLower.startsWith('market ')) {
            if (!process.env.GOOGLE_CLOUD_API_KEY) {
              responseText = 'Area Reports are not available yet. API key needs to be configured by an administrator.';
            } else {
              const customerPlace = process.env.CUSTOMER_PLACE;
              const isMarketingSearch = bodyLower.startsWith('search ') || bodyLower.startsWith('market ');

              if (isMarketingSearch) {
                const searchBody = Body.replace(/^(search|market)\s*/i, '').trim();
                const categoryMatch = searchBody.match(/^(\w[\w\s]*?)\s+(?:near|in|at|around)\s+(.+?)(?:\s+(\d+(?:\.\d+)?)\s*(?:mi(?:les?)?|km))?(?:\s+(\d(?:\.\d)?)-(\d(?:\.\d)?)\s*stars?)?$/i);
                const simpleMatch = searchBody.match(/^(\w[\w\s]*?)\s+(\d+(?:\.\d+)?)\s*(?:mi(?:les?)?)?$/i);

                if (categoryMatch) {
                  const [, cat, location, radiusStr, minR, maxR] = categoryMatch;
                  const category = cat.trim().replace(/\s+/g, '_').toLowerCase();
                  try {
                    const report = await generateMarketingSearch({
                      mode: 'marketing',
                      address: location.trim(),
                      category,
                      radiusMiles: radiusStr ? parseFloat(radiusStr) : undefined,
                      minRating: minR ? parseFloat(minR) : undefined,
                      maxRating: maxR ? parseFloat(maxR) : undefined
                    });
                    responseText = formatMarketingReportForSms(report);
                  } catch (searchErr: any) {
                    console.error('[SMS Biz Bot] Marketing search error:', searchErr.message);
                    responseText = `Search failed: ${searchErr.message}`;
                  }
                } else if (simpleMatch) {
                  const [, cat, radiusStr] = simpleMatch;
                  const category = cat.trim().replace(/\s+/g, '_').toLowerCase();
                  if (!customerPlace) {
                    responseText = 'No default business set. Use:\n"search [category] near [location]"\n\nExample: "search restaurant near Lafayette LA"';
                  } else {
                    try {
                      const report = await generateMarketingSearch({
                        mode: 'marketing',
                        address: customerPlace,
                        category,
                        radiusMiles: parseFloat(radiusStr)
                      });
                      responseText = formatMarketingReportForSms(report);
                    } catch (searchErr: any) {
                      responseText = `Search failed: ${searchErr.message}`;
                    }
                  }
                } else {
                  responseText = 'Marketing Search\n\nFormats:\n' +
                    '"search [category] near [location]"\n' +
                    '"search [category] near [location] [miles]mi"\n' +
                    '"search [category] near [location] [miles]mi [min]-[max] stars"\n\n' +
                    'Examples:\n' +
                    '"search restaurant near Lafayette LA"\n' +
                    '"search cafe near 123 Main St 5mi"\n' +
                    '"search lodging near Lafayette LA 2mi 4-5 stars"';
                }
              } else {
                const bodyAfterReport = Body.replace(/^(report|competitors|competition|nearby businesses)\s*/i, '').trim();
                const radiusMatch = bodyAfterReport.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*(?:mi(?:les?)?|km)?$/i);
                let searchName: string | undefined;
                let radiusMiles: number | undefined;

                if (radiusMatch) {
                  searchName = radiusMatch[1].trim();
                  radiusMiles = parseFloat(radiusMatch[2]);
                } else {
                  searchName = bodyAfterReport || customerPlace;
                }

                if (!searchName) {
                  responseText = 'Area Report\n\nFormats:\n' +
                    '"report [business name]"\n' +
                    '"report [business name] [miles]"\n\n' +
                    'Examples:\n' +
                    '"report Boardwalk Suites Lafayette"\n' +
                    '"report Boardwalk Suites Lafayette 5"';
                } else {
                  try {
                    const report = await generateOwnerReport({
                      mode: 'owner',
                      businessName: searchName,
                      radiusMiles
                    });
                    responseText = formatOwnerReportForSms(report);
                  } catch (reportError: any) {
                    console.error('[SMS Biz Bot] Report generation error:', reportError.message);
                    responseText = `Could not generate report: ${reportError.message}`;
                  }
                }
              }
            }
          } else {
            responseText = 'AI Biz Bot\n\nI can help with:\n' +
              '- "visitors" - Website traffic stats\n' +
              '- "reviews" - Recent customer reviews\n' +
              '- "update hours" - Change business hours\n' +
              '- "schedule" - Calendar & events\n' +
              '- "add task" - Create reminders\n' +
              '- "report [name]" - Owner area report (3mi default)\n' +
              '- "report [name] [miles]" - Custom radius\n' +
              '- "search [category] near [location]" - Market search\n' +
              '- "competitors" - Your business competition\n\n' +
              'What would you like to do?';
          }
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${responseText}</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        } catch (error: any) {
          console.error('[SMS Biz Bot] Error:', error.message);
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🤖 AI Biz Bot encountered an error. Please try again or visit your admin panel.</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        }
      }
      
      // ========== ADMIN COMMANDS (Health Check & Repair Agent) ==========
      
      // ========== CODING AGENT (Kimi K2) ==========
      const codingKeywords = ['error:', 'exception', 'traceback', 'syntaxerror', 'typeerror', 'referenceerror', 
        'undefined is not', 'cannot read property', 'is not defined', 'unexpected token',
        'fix this code', 'debug this', 'why is this error', 'code help', 'coding help',
        'fix my code', 'analyze this code', 'explain this code', 'review my code',
        '```', 'function(', 'const ', 'let ', 'var ', 'import ', 'def ', 'class '];
      const isCodingRequest = codingKeywords.some(kw => bodyLower.includes(kw)) || 
        (Body && Body.includes('```'));
      
      if (isCodingRequest) {
        console.log(`[SMS Coding Agent] Detected coding request from: ${From}`);
        
        try {
          // Determine if it's an error, code to fix, or code to explain
          const hasError = bodyLower.includes('error') || bodyLower.includes('exception') || 
            bodyLower.includes('traceback') || bodyLower.includes('undefined');
          const wantsFix = bodyLower.includes('fix') || bodyLower.includes('debug') || 
            bodyLower.includes('help') || bodyLower.includes('wrong');
          const wantsExplanation = bodyLower.includes('explain') || bodyLower.includes('what does');
          
          let toolName: string;
          let args: Record<string, any>;
          
          // Extract code block if present
          const codeMatch = Body.match(/```[\w]*\n?([\s\S]*?)```/);
          const code = codeMatch ? codeMatch[1].trim() : Body;
          
          // Detect language
          const langMatch = Body.match(/```(\w+)/);
          const language = langMatch ? langMatch[1] : 'javascript';
          
          if (hasError) {
            toolName = 'diagnose_error';
            args = { error: code, language };
          } else if (wantsFix) {
            toolName = 'fix_code';
            args = { code, language, issue: 'Fix the issues in this code' };
          } else if (wantsExplanation) {
            toolName = 'explain_code';
            args = { code, language, audience: 'beginner' };
          } else {
            toolName = 'analyze_code';
            args = { code, language };
          }
          
          // Get agent settings for AI model configuration
          // First try to get assigned agent from customer, otherwise get any agent
          let codingAgent = null;
          const codingCustomer = await storage.getCustomerByPhone(From);
          if (codingCustomer?.agentId) {
            codingAgent = await storage.getAgent(codingCustomer.agentId);
          }
          // Fallback to first available agent if no assignment
          if (!codingAgent) {
            const allAgents = await storage.getAgents();
            codingAgent = allAgents[0] || null;
          }
          
          let modelOptions: ModelOptions = {};
          if (codingAgent) {
            modelOptions = {
              hfToken: codingAgent.hfToken || undefined,
              temperature: codingAgent.aiTemperature || 60,
              maxTokens: codingAgent.aiMaxTokens || 4096,
              modelId: codingAgent.aiModelId || undefined,
            };
            console.log(`[SMS Coding Agent] Using agent settings: provider=${codingAgent.aiModelProvider}, temp=${modelOptions.temperature}`);
          }
          
          console.log(`[SMS Coding Agent] Using tool: ${toolName}`);
          const result = await handleMCPToolCall(toolName, args, modelOptions);
          
          // Truncate for SMS (keep it readable)
          let smsResponse = result;
          if (smsResponse.length > 1400) {
            smsResponse = smsResponse.substring(0, 1397) + '...';
          }
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🤖 Coding Agent (Kimi K2)\n\n${smsResponse}</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        } catch (error: any) {
          console.error('[SMS Coding Agent] Error:', error.message);
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🤖 Coding Agent couldn't process that. Try sending your code in a code block:\n\n\`\`\`javascript\nyour code here\n\`\`\`</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        }
      }
      
      // ========== ADMIN COMMANDS (Health Check & Repair) ==========
      const adminCommands = ['health check', 'run health', 'check health', 'sms health', 'fix sms', 'repair sms', 'auto fix', 'autofix', 'repair webhooks', 'fix webhooks'];
      const isAdminCommand = adminCommands.some(cmd => bodyLower.includes(cmd));
      
      if (isAdminCommand) {
        const twilioClient = await getTwilioClient();
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['host'];
        const baseUrl = `${protocol}://${host}`;
        
        // Check if this is a fix/repair command
        const isRepairCommand = ['fix', 'repair', 'autofix'].some(cmd => bodyLower.includes(cmd));
        
        if (isRepairCommand) {
          // Run auto-fix
          console.log(`[SMS Health Agent] Running auto-fix for: ${From}`);
          const services = await twilioClient.messaging.v1.services.list({ limit: 20 });
          let fixedCount = 0;
          const fixResults: string[] = [];
          
          for (const svc of services) {
            if (!svc.inboundRequestUrl && !svc.useInboundWebhookOnNumber) {
              try {
                await twilioClient.messaging.v1.services(svc.sid).update({
                  inboundRequestUrl: `${baseUrl}/webhook/sms`,
                  inboundMethod: 'POST',
                  fallbackUrl: `${baseUrl}/webhook/sms`,
                  fallbackMethod: 'POST'
                });
                fixedCount++;
                fixResults.push(`✅ Fixed: ${svc.friendlyName}`);
              } catch (err: any) {
                fixResults.push(`❌ Failed: ${svc.friendlyName}`);
              }
            }
          }
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>🔧 Repair Agent Complete!\n\nFixed ${fixedCount} messaging service(s).\n\n${fixResults.slice(0, 3).join('\n')}${fixResults.length > 3 ? `\n...and ${fixResults.length - 3} more` : ''}\n\nReply "health check" to verify.</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        } else {
          // Run health check
          console.log(`[SMS Health Agent] Running health check for: ${From}`);
          const services = await twilioClient.messaging.v1.services.list({ limit: 20 });
          
          let criticalCount = 0;
          let warningCount = 0;
          let healthyCount = 0;
          const issues: string[] = [];
          
          for (const svc of services) {
            const hasCritical = !svc.inboundRequestUrl && !svc.useInboundWebhookOnNumber;
            const hasWarning = !svc.fallbackUrl || !svc.statusCallback;
            
            if (hasCritical) {
              criticalCount++;
              issues.push(`❌ ${svc.friendlyName}: No webhook!`);
            } else if (hasWarning) {
              warningCount++;
            } else {
              healthyCount++;
            }
          }
          
          let statusEmoji = criticalCount > 0 ? '🚨' : warningCount > 0 ? '⚠️' : '✅';
          let statusText = criticalCount > 0 ? 'ISSUES FOUND' : warningCount > 0 ? 'WARNINGS' : 'ALL HEALTHY';
          
          let response = `${statusEmoji} SMS Health Check\n\n` +
            `Services: ${services.length}\n` +
            `✅ Healthy: ${healthyCount}\n` +
            `⚠️ Warnings: ${warningCount}\n` +
            `❌ Critical: ${criticalCount}\n\n`;
          
          if (criticalCount > 0) {
            response += issues.slice(0, 2).join('\n') + '\n\nReply "fix sms" to repair automatically.';
          } else {
            response += 'All messaging services are operational!';
          }
          
          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${response}</Message></Response>`;
          res.type('text/xml').send(twiml);
          return;
        }
      }
      
      // ========== CALLER ID LOOKUP ==========
      // Look up caller in customer database to personalize the response
      const customer = await storage.getCustomerByPhone(From);
      let assignedAgent = null;
      let customerTasks: any[] = [];
      
      if (customer) {
        console.log(`[SMS Webhook] Caller ID matched: ${customer.name} (${customer.id})`);
        
        // Get their assigned agent
        if (customer.agentId) {
          assignedAgent = await storage.getAgent(customer.agentId);
          console.log(`[SMS Webhook] Assigned agent: ${assignedAgent?.name || 'Unknown'}`);
        }
        
        // Get their active tasks/projects
        customerTasks = await storage.getTasksByPhone(From);
        console.log(`[SMS Webhook] Customer has ${customerTasks.length} tasks`);
      } else {
        console.log(`[SMS Webhook] No customer match for: ${From}`);
      }
      
      // Find or create conversation for this phone number
      let conversation = await storage.getConversationByPhone(From);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          phoneNumber: From,
          customerId: customer?.id || null,
          agentId: customer?.agentId || null,
          lastMessageAt: new Date(),
        });
        
        console.log(`[SMS Webhook] Created new conversation: ${conversation.id}`);
      } else {
        // Update last message time and link to customer/agent if found
        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(),
          customerId: customer?.id || conversation.customerId,
          agentId: customer?.agentId || conversation.agentId,
        });
      }
      
      // Store the message
      await storage.createMessage({
        conversationId: conversation.id,
        direction: 'inbound',
        body: Body || '',
        fromNumber: From,
        toNumber: To,
        messageSid: MessageSid,
        status: 'received',
      });
      
      // ========== BUILD CONTEXT FOR AI ==========
      // Build personalized context based on caller ID lookup
      const callerName = customer?.name || 'there';
      const agentName = assignedAgent?.name || 'Gateway';
      const agentPersonality = assignedAgent?.systemPrompt || 
        'You are a helpful AI assistant for Gateway Global. You help people complete tasks and stay updated on their progress.';
      
      // Detect if this is a first message (new customer onboarding)
      const existingMessages = await storage.getMessagesByConversation(conversation.id, 5);
      const isFirstMessage = existingMessages.length <= 1; // Only the message we just stored
      
      // Build task context
      let taskContext = '';
      const activeTasks = customerTasks.filter(t => t.status !== 'completed' && t.status !== 'failed');
      if (activeTasks.length > 0) {
        taskContext = '\n\nActive projects/tasks for this customer:\n' + 
          activeTasks.map(t => `- ${t.task} (Status: ${t.status})`).join('\n');
      }
      
      // Build customer context
      let customerContext = '';
      if (customer) {
        customerContext = `\n\nYou are speaking with ${customer.name}`;
        if (customer.company) customerContext += ` from ${customer.company}`;
        if (customer.notes) customerContext += `\nNotes about this customer: ${customer.notes}`;
      }
      
      // Special onboarding context for first-time messages
      let onboardingContext = '';
      if (isFirstMessage) {
        onboardingContext = `

THIS IS YOUR FIRST MESSAGE WITH THIS USER! Follow the 24-hour demo onboarding flow:
1. Warmly introduce yourself and confirm their number is working
2. Ask what task they'd like help with
3. Ask if they have any specific requirements or preferences to share
4. Let them know you'll complete their task within 24 hours

Be friendly and make them feel welcome! This is their first experience with Gateway.`;
      }
      
      const fullPersonality = `${agentPersonality}${customerContext}${taskContext}${onboardingContext}\n\nAddress the customer by name when appropriate. Be warm, helpful, and reference their projects if relevant to the conversation.`;
      
      // Generate AI response using Kimi (primary) or Gemini (fallback)
      let responseText = `Hi ${callerName}! Thank you for your message. An agent will respond shortly.`;
      
      // Get conversation history for context
      const messages = await storage.getMessagesByConversation(conversation.id, 10);
      const history = messages.reverse().map(m => ({
        role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
        content: m.body || '',
      }));
      
      // Try Kimi first (preferred), fallback to Gemini
      if (process.env.MOONSHOT_API_KEY) {
        try {
          responseText = await generateSmsResponse({
            agentName: agentName,
            personality: fullPersonality,
            conversationHistory: history,
            userMessage: Body || '',
          });
          
          // Trim to SMS length
          if (responseText.length > 320) {
            responseText = responseText.substring(0, 317) + '...';
          }
          console.log('[SMS Webhook] Kimi response generated successfully');
        } catch (kimiError) {
          console.error('[SMS Webhook] Kimi error, trying Gemini fallback:', kimiError);
          
          // Fallback to Gemini
          if (process.env.GEMINI_API_KEY) {
            try {
              const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
              const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
              const historyText = history.map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`).join('\n');
              const prompt = `${fullPersonality}\n\nRespond to this SMS conversation naturally and helpfully. Keep responses under 160 characters for SMS.\n\nConversation history:\n${historyText}\n\nCustomer's latest message: ${Body}\n\nRespond as ${agentName}:`;
              const result = await model.generateContent(prompt);
              responseText = result.response.text() || responseText;
              if (responseText.length > 160) {
                responseText = responseText.substring(0, 157) + '...';
              }
            } catch (geminiError) {
              console.error('[SMS Webhook] Gemini fallback error:', geminiError);
            }
          }
        }
      } else if (process.env.GEMINI_API_KEY) {
        // No Kimi key, use Gemini directly
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const historyText = history.map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`).join('\n');
          const prompt = `${fullPersonality}\n\nRespond to this SMS conversation naturally and helpfully. Keep responses under 160 characters for SMS.\n\nConversation history:\n${historyText}\n\nCustomer's latest message: ${Body}\n\nRespond as ${agentName}:`;
          const result = await model.generateContent(prompt);
          responseText = result.response.text() || responseText;
          if (responseText.length > 160) {
            responseText = responseText.substring(0, 157) + '...';
          }
        } catch (geminiError) {
          console.error('[SMS Webhook] Gemini error:', geminiError);
        }
      }
      
      // Store outbound message
      await storage.createMessage({
        conversationId: conversation.id,
        direction: 'outbound',
        body: responseText,
        fromNumber: To,
        toNumber: From,
        status: 'sent',
      });
      
      // Return TwiML response
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseText)}</Message>
</Response>`);
      
    } catch (error: any) {
      console.error('[SMS Webhook] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, we encountered an error. Please try again later.</Message>
</Response>`);
    }
  });

  // Gemini voice webhook - uses Media Streams for real-time AI voice (KIMI not used for voice)
  app.post("/webhook/voice/kimi", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, CallSid, CallStatus } = req.body;
      
      console.log(`[Voice] From: ${From}, To: ${To}, Status: ${CallStatus}`);
      
      // Log the call
      const config = await storage.getTelephonyConfig();
      await storage.createCallLog({
        configId: config?.id || null,
        direction: 'inbound',
        phoneNumber: From,
        status: CallStatus || 'ringing',
        callSid: CallSid,
        duration: 0,
      });
      
      // Check firewall
      const allowedNumbers = config?.allowedNumbers || [];
      if (config?.firewallEnabled && allowedNumbers.length > 0) {
        const isAllowed = allowedNumbers.some(num => 
          From.includes(num) || num.includes(From.slice(-10))
        );
        
        if (!isAllowed) {
          console.log(`[Voice] Blocked caller: ${From}`);
          res.set('Content-Type', 'text/xml');
          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-F">Sorry, this number is not authorized.</Say>
  <Hangup/>
</Response>`);
        }
      }
      
      // Build WebSocket URL for Media Streams
      const host = process.env.REPLIT_DEV_DOMAIN || 
        (process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'localhost:5000');
      const wsProtocol = host.includes('localhost') ? 'ws' : 'wss';
      const streamUrl = `${wsProtocol}://${host}/ws/voice-stream`;
      
      console.log(`[Voice] Stream URL: ${streamUrl}`);
      
      // Return TwiML with Media Streams (voice pipeline uses Gemini)
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-F">Welcome to Gateway Global AI. Connecting you to our AI assistant now.</Say>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="agentName" value="AI Assistant"/>
      <Parameter name="personality" value="helpful"/>
    </Stream>
  </Connect>
  <Say voice="Google.en-US-Neural2-F">The conversation has ended. Goodbye!</Say>
</Response>`);
      
    } catch (error: any) {
      console.error('[Voice] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-F">Sorry, we encountered an error. Please try again later.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Inbound Voice webhook - receives calls from Twilio
  app.post("/webhook/voice", validateTwilioSignature, async (req, res) => {
    try {
      const { From, To, CallSid, CallStatus } = req.body;
      
      console.log(`[Voice Webhook] From: ${From}, To: ${To}, Status: ${CallStatus}`);
      
      // Log the call
      const config = await storage.getTelephonyConfig();
      await storage.createCallLog({
        configId: config?.id || null,
        direction: 'inbound',
        phoneNumber: From,
        status: CallStatus || 'ringing',
        callSid: CallSid,
        duration: 0,
      });
      
      // Check firewall - is this caller allowed?
      const allowedNumbers = config?.allowedNumbers || [];
      if (config?.firewallEnabled && allowedNumbers.length > 0) {
        const isAllowed = allowedNumbers.some(num => 
          From.includes(num) || num.includes(From.slice(-10))
        );
        
        if (!isAllowed) {
          console.log(`[Voice Webhook] Blocked caller: ${From}`);
          res.set('Content-Type', 'text/xml');
          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, this number is not authorized to call this line.</Say>
  <Hangup/>
</Response>`);
        }
      }
      
      // Generate greeting with AI if available
      let greeting = "Hello, thank you for calling Gateway Global AI. How can I help you today?";
      
      // Return TwiML for voice response
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(greeting)}</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/webhook/voice/gather">
    <Say voice="alice">Please tell me how I can assist you.</Say>
  </Gather>
  <Say voice="alice">I didn't hear anything. Goodbye.</Say>
</Response>`);
      
    } catch (error: any) {
      console.error('[Voice Webhook] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we encountered an error. Please try again later.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Voice gather webhook - handles speech input
  app.post("/webhook/voice/gather", validateTwilioSignature, async (req, res) => {
    try {
      const { SpeechResult, From, CallSid } = req.body;
      
      console.log(`[Voice Gather] From: ${From}, Speech: ${SpeechResult}`);
      
      let responseText = "I understand. Let me help you with that.";
      
      // Generate AI response using Kimi (primary) or Gemini (fallback)
      if (SpeechResult) {
        if (process.env.MOONSHOT_API_KEY) {
          try {
            responseText = await chat({
              model: KIMI_MODELS.K2_TURBO,
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful AI phone assistant for Gateway Global. Respond naturally and conversationally. Keep your response under 100 words for phone readability. No markdown, no bullet points.',
                },
                {
                  role: 'user',
                  content: SpeechResult,
                },
              ],
              temperature: 0.7,
              max_tokens: 300,
            });
            console.log('[Voice Gather] Kimi response generated successfully');
          } catch (kimiError) {
            console.error('[Voice Gather] Kimi error, trying Gemini fallback:', kimiError);
            
            // Fallback to Gemini
            if (process.env.GEMINI_API_KEY) {
              try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const prompt = `You are a helpful AI phone assistant for Gateway Global. Respond naturally to this caller's request. Keep your response under 200 words for phone readability.\n\nCaller said: "${SpeechResult}"\n\nRespond helpfully:`;
                const result = await model.generateContent(prompt);
                responseText = result.response.text() || responseText;
              } catch (geminiError) {
                console.error('[Voice Gather] Gemini fallback error:', geminiError);
              }
            }
          }
        } else if (process.env.GEMINI_API_KEY) {
          try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const prompt = `You are a helpful AI phone assistant for Gateway Global. Respond naturally to this caller's request. Keep your response under 200 words for phone readability.\n\nCaller said: "${SpeechResult}"\n\nRespond helpfully:`;
            const result = await model.generateContent(prompt);
            responseText = result.response.text() || responseText;
          } catch (geminiError) {
            console.error('[Voice Gather] Gemini error:', geminiError);
          }
        }
      }
      
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(responseText)}</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/webhook/voice/gather">
    <Say voice="alice">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="alice">Thank you for calling. Goodbye.</Say>
</Response>`);
      
    } catch (error: any) {
      console.error('[Voice Gather] Error:', error);
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, I had trouble understanding. Let me transfer you to an agent.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Voice status callback - tracks call completion
  app.post("/webhook/voice/status", validateTwilioSignature, async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      
      console.log(`[Voice Status] CallSid: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}`);
      
      // Update call log with final status
      // Note: Would need to add a method to update by callSid
      
      res.sendStatus(200);
    } catch (error: any) {
      console.error('[Voice Status] Error:', error);
      res.sendStatus(500);
    }
  });

  // SMS Status Callback - for delivery status and error debugging
  app.post("/webhook/sms/status", validateTwilioSignature, async (req, res) => {
    try {
      const { 
        MessageSid, 
        MessageStatus, 
        To, 
        From,
        ErrorCode, 
        ErrorMessage 
      } = req.body;
      
      // Log all status updates
      console.log(`[SMS Status] MessageSid: ${MessageSid}, Status: ${MessageStatus}, From: ${From}, To: ${To}`);
      
      // Store delivery status in database
      try {
        const existing = await storage.getSmsDeliveryStatus(MessageSid);
        if (existing) {
          await storage.updateSmsDeliveryStatus(MessageSid, {
            status: MessageStatus,
            errorCode: ErrorCode || null,
            errorMessage: ErrorMessage || null,
          });
        } else {
          await storage.createSmsDeliveryStatus({
            messageSid: MessageSid,
            status: MessageStatus,
            errorCode: ErrorCode || null,
            errorMessage: ErrorMessage || null,
            fromNumber: From || null,
            toNumber: To || null,
          });
        }
      } catch (dbError: any) {
        console.error('[SMS Status] DB Error:', dbError.message);
      }
      
      // Log errors for debugging
      if (ErrorCode || ErrorMessage) {
        console.error(`[SMS Error] Code: ${ErrorCode}, Message: ${ErrorMessage}`);
        console.error(`[SMS Error] Details: MessageSid=${MessageSid}, From=${From}, To=${To}`);
        
        // Common error codes reference:
        // 30001 - Queue overflow
        // 30002 - Account suspended
        // 30003 - Unreachable destination
        // 30004 - Message blocked
        // 30005 - Unknown destination
        // 30006 - Landline or unreachable carrier
        // 30007 - Carrier violation
        // 30008 - Unknown error
      }
      
      // Track delivery status
      if (MessageStatus === 'delivered') {
        console.log(`[SMS Delivered] Message ${MessageSid} delivered to ${To}`);
      } else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
        console.error(`[SMS Failed] Message ${MessageSid} to ${To} - ${ErrorCode}: ${ErrorMessage}`);
      }
      
      res.sendStatus(200);
    } catch (error: any) {
      console.error('[SMS Status] Error:', error);
      res.sendStatus(500);
    }
  });

  // SMS Health Check endpoint
  app.get("/api/sms/health", async (req, res) => {
    try {
      const health: any = {
        status: 'healthy',
        checks: {},
        timestamp: new Date().toISOString(),
      };
      
      // 1. Check Twilio credentials
      try {
        const client = await getTwilioClient();
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID || '').fetch();
        health.checks.twilioCredentials = {
          status: 'ok',
          accountStatus: account.status,
          friendlyName: account.friendlyName,
        };
      } catch (twilioErr: any) {
        health.checks.twilioCredentials = {
          status: 'error',
          error: twilioErr.message,
        };
        health.status = 'unhealthy';
      }
      
      // 2. Check if at least one number is configured
      try {
        const client = await getTwilioClient();
        const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
        health.checks.phoneNumbers = {
          status: numbers.length > 0 ? 'ok' : 'warning',
          count: numbers.length,
          message: numbers.length > 0 ? 'Phone numbers available' : 'No phone numbers configured',
        };
        if (numbers.length === 0) {
          health.status = 'degraded';
        }
      } catch (numErr: any) {
        health.checks.phoneNumbers = {
          status: 'error',
          error: numErr.message,
        };
      }
      
      // 3. Check recent status callbacks (last 5 minutes)
      try {
        const recentDeliveries = await storage.getRecentSmsDeliveries(10);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentCount = recentDeliveries.filter(d => 
          d.createdAt && new Date(d.createdAt) > fiveMinutesAgo
        ).length;
        
        health.checks.statusCallbacks = {
          status: recentCount > 0 ? 'ok' : 'unknown',
          recentCallbacks: recentCount,
          message: recentCount > 0 
            ? `${recentCount} status callbacks in last 5 minutes` 
            : 'No recent status callbacks (normal if no SMS sent recently)',
        };
      } catch (cbErr: any) {
        health.checks.statusCallbacks = {
          status: 'error',
          error: cbErr.message,
        };
      }
      
      // 4. Check failed deliveries in last 24 hours
      try {
        const failedDeliveries = await storage.getFailedSmsDeliveries(100);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentFailures = failedDeliveries.filter(d => 
          d.createdAt && new Date(d.createdAt) > oneDayAgo
        );
        
        health.checks.deliveryFailures = {
          status: recentFailures.length === 0 ? 'ok' : 'warning',
          failedCount24h: recentFailures.length,
          message: recentFailures.length === 0 
            ? 'No delivery failures in last 24 hours' 
            : `${recentFailures.length} failed deliveries in last 24 hours`,
        };
        
        if (recentFailures.length > 10) {
          health.status = 'degraded';
        }
      } catch (failErr: any) {
        health.checks.deliveryFailures = {
          status: 'error',
          error: failErr.message,
        };
      }
      
      const httpStatus = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(httpStatus).json(health);
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get failed SMS deliveries
  app.get("/api/sms/failures", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const failures = await storage.getFailedSmsDeliveries(limit);
      res.json({
        count: failures.length,
        failures,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get recent SMS delivery status
  app.get("/api/sms/deliveries", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const deliveries = await storage.getRecentSmsDeliveries(limit);
      res.json({
        count: deliveries.length,
        deliveries,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== A2P 10-DLC Compliance API ==========
  
  // Get all A2P brands
  app.get("/api/a2p/brands", async (req, res) => {
    try {
      const brands = await storage.getA2pBrands();
      res.json({ brands });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single A2P brand
  app.get("/api/a2p/brands/:id", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(brand);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create A2P brand registration
  app.post("/api/a2p/brands", async (req, res) => {
    try {
      const { 
        companyName, firstName, lastName, email, phone,
        country, taxId, website, vertical,
        stockExchange, stockSymbol, customerId
      } = req.body;

      if (!companyName || !firstName || !lastName || !email || !phone) {
        return res.status(400).json({ 
          error: "Missing required fields: companyName, firstName, lastName, email, phone" 
        });
      }

      // Create brand in our database first
      const brand = await storage.createA2pBrand({
        companyName,
        firstName,
        lastName,
        email,
        phone,
        country: country || 'US',
        taxId,
        website,
        vertical,
        stockExchange,
        stockSymbol,
        customerId,
        brandStatus: 'draft',
      });

      res.json({ 
        success: true, 
        brand,
        message: "Brand registration created. Submit for review after payment."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update A2P brand
  app.patch("/api/a2p/brands/:id", async (req, res) => {
    try {
      const updated = await storage.updateA2pBrand(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit A2P brand to Twilio for registration
  app.post("/api/a2p/brands/:id/submit", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      // Get Twilio client
      const client = await getTwilioClient();
      if (!client) {
        return res.status(500).json({ error: "Twilio client not configured" });
      }

      // Create the brand in Twilio's Trust Hub
      // Note: This requires Twilio Trust Hub API setup
      try {
        const customerProfile = await client.trusthub.v1.customerProfiles.create({
          friendlyName: brand.companyName,
          email: brand.email,
          policySid: 'RN806dd6cd175f314e1f96a9727ee271f4', // A2P Messaging Policy SID
        });

        // Update brand with Twilio SID
        const updated = await storage.updateA2pBrand(brand.id, {
          brandSid: customerProfile.sid,
          brandStatus: 'pending',
        });

        res.json({
          success: true,
          brand: updated,
          customerProfileSid: customerProfile.sid,
          message: "Brand submitted to Twilio Trust Hub for review"
        });
      } catch (twilioError: any) {
        // If Trust Hub not set up, provide helpful error
        console.error('Twilio Trust Hub error:', twilioError);
        
        // Still update status to show attempt was made
        await storage.updateA2pBrand(brand.id, {
          brandStatus: 'pending',
        });

        res.json({
          success: true,
          brand: await storage.getA2pBrand(brand.id),
          warning: "Brand marked as pending. Full Twilio Trust Hub integration requires additional setup.",
          twilioError: twilioError.message
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all A2P campaigns
  app.get("/api/a2p/campaigns", async (req, res) => {
    try {
      const brandId = req.query.brandId as string;
      const campaigns = await storage.getA2pCampaigns(brandId);
      res.json({ campaigns });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single A2P campaign
  app.get("/api/a2p/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getA2pCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create A2P campaign
  app.post("/api/a2p/campaigns", async (req, res) => {
    try {
      const { 
        brandId, useCase, description, messageFlow,
        sampleMessages, optInDescription, optOutDescription,
        helpDescription, hasDirectLending,
        privacyPolicyUrl, termsOfServiceUrl
      } = req.body;

      if (!brandId || !useCase || !description) {
        return res.status(400).json({ 
          error: "Missing required fields: brandId, useCase, description" 
        });
      }

      // Verify brand exists
      const brand = await storage.getA2pBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const campaign = await storage.createA2pCampaign({
        brandId,
        useCase,
        description,
        messageFlow,
        sampleMessages: sampleMessages || [],
        optInDescription,
        optOutDescription,
        helpDescription,
        hasDirectLending: hasDirectLending || false,
        privacyPolicyUrl,
        termsOfServiceUrl,
        campaignStatus: 'draft',
      });

      res.json({ 
        success: true, 
        campaign,
        message: "Campaign created. Submit for review after brand is approved."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update A2P campaign
  app.patch("/api/a2p/campaigns/:id", async (req, res) => {
    try {
      const updated = await storage.updateA2pCampaign(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit A2P campaign for registration
  app.post("/api/a2p/campaigns/:id/submit", async (req, res) => {
    try {
      const campaign = await storage.getA2pCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const brand = await storage.getA2pBrand(campaign.brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      if (brand.brandStatus !== 'approved' && brand.brandStatus !== 'pending') {
        return res.status(400).json({ 
          error: "Brand must be approved or pending before submitting campaign" 
        });
      }

      // Get Twilio client
      const client = await getTwilioClient();
      if (!client) {
        return res.status(500).json({ error: "Twilio client not configured" });
      }

      // Create messaging service if not exists
      let messagingServiceSid = campaign.messagingServiceSid;
      if (!messagingServiceSid) {
        try {
          const messagingService = await client.messaging.v1.services.create({
            friendlyName: `${brand.companyName} - ${campaign.useCase}`,
            useInboundWebhookOnNumber: false,
          });
          messagingServiceSid = messagingService.sid;
        } catch (msError: any) {
          console.error('Error creating messaging service:', msError);
        }
      }

      // Update campaign status
      const updated = await storage.updateA2pCampaign(campaign.id, {
        campaignStatus: 'pending',
        messagingServiceSid,
      });

      res.json({
        success: true,
        campaign: updated,
        messagingServiceSid,
        message: "Campaign submitted for review. This typically takes 1-7 business days."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook for A2P payment completion
  app.post("/api/stripe/webhook/a2p", async (req, res) => {
    try {
      const { getUncachableStripeClient, getStripeSecretKey } = await import('./stripeClient');
      const Stripe = await import('stripe');
      const stripe = await getUncachableStripeClient();
      
      const sig = req.headers['stripe-signature'];
      if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      const webhookSecret = process.env.STRIPE_A2P_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.warn('STRIPE_A2P_WEBHOOK_SECRET not configured, skipping signature verification');
        const body = req.body;
        if (body?.type === 'checkout.session.completed') {
          await handleA2PCheckoutComplete(body.data.object);
        }
        return res.json({ received: true });
      }

      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(400).json({ error: 'Raw body not available' });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      if (event.type === 'checkout.session.completed') {
        await handleA2PCheckoutComplete(event.data.object);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('A2P Stripe webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  async function handleA2PCheckoutComplete(session: any) {
    const { brandId, type, vettingType } = session.metadata || {};
    
    if (type !== 'a2p_brand_registration' || !brandId) {
      console.log('Ignoring non-A2P checkout session');
      return;
    }

    const brand = await storage.getA2pBrand(brandId);
    if (!brand) {
      console.error('Brand not found for payment:', brandId);
      return;
    }

    if (brand.stripePaymentId) {
      console.log('Brand already has payment recorded:', brandId);
      return;
    }

    const totalAmount = session.amount_total || (vettingType === 'expedited' ? 13400 : 8900);

    await storage.updateA2pBrand(brandId, {
      stripePaymentId: session.payment_intent as string,
      amountPaid: totalAmount,
      vettingStatus: 'pending',
      vettingProvider: 'campaign-verify',
      brandStatus: 'pending',
    });

    console.log(`A2P brand ${brandId} payment complete: $${(totalAmount / 100).toFixed(2)}`);
  }

  // A2P Compliance payment - Create checkout session for brand registration
  app.post("/api/a2p/brands/:id/pay", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      if (brand.stripePaymentId) {
        return res.status(400).json({ error: "Payment already processed for this brand" });
      }

      const { getUncachableStripeClient, getStripePublishableKey } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const { vettingType = 'standard' } = req.body;

      const lineItems: any[] = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A2P Brand Registration',
              description: `Brand registration for ${brand.companyName}`,
            },
            unit_amount: 4900, // $49.00
          },
          quantity: 1,
        }
      ];

      if (vettingType === 'expedited') {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Expedited Vetting',
              description: 'Priority vetting (24-48 hours)',
            },
            unit_amount: 8500, // $85.00
          },
          quantity: 1,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Standard Vetting',
              description: 'Standard vetting (3-5 business days)',
            },
            unit_amount: 4000, // $40.00
          },
          quantity: 1,
        });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/agent/${req.query.agentId || ''}/telephony?a2p_payment=success&brand_id=${brand.id}`,
        cancel_url: `${baseUrl}/agent/${req.query.agentId || ''}/telephony?a2p_payment=cancelled`,
        metadata: {
          brandId: brand.id,
          type: 'a2p_brand_registration',
          vettingType,
        },
      });

      res.json({
        sessionId: session.id,
        url: session.url,
        publishableKey: await getStripePublishableKey(),
      });
    } catch (error: any) {
      console.error('A2P payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle A2P payment success callback
  app.post("/api/a2p/brands/:id/payment-complete", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const { sessionId, vettingType = 'standard' } = req.body;

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed" });
      }

      if (session.metadata?.brandId !== brand.id) {
        return res.status(400).json({ error: "Payment session mismatch" });
      }

      const totalAmount = vettingType === 'expedited' ? 13400 : 8900;

      const updated = await storage.updateA2pBrand(brand.id, {
        stripePaymentId: session.payment_intent as string,
        amountPaid: totalAmount,
        vettingStatus: 'pending',
        vettingProvider: 'campaign-verify',
        brandStatus: 'pending',
      });

      res.json({
        success: true,
        brand: updated,
        message: "Payment received. Brand submitted for review."
      });
    } catch (error: any) {
      console.error('A2P payment complete error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // A2P Compliance pricing info
  app.get("/api/a2p/pricing", async (req, res) => {
    res.json({
      brandRegistration: {
        fee: 4900, // $49.00 in cents
        description: "One-time brand registration fee"
      },
      standardVetting: {
        fee: 4000, // $40.00 in cents
        description: "Standard vetting (3-5 business days)"
      },
      expeditedVetting: {
        fee: 8500, // $85.00 in cents
        description: "Expedited vetting (24-48 hours)"
      },
      campaignRegistration: {
        fee: 1500, // $15.00 in cents
        description: "Per-campaign registration fee"
      },
      monthlyMaintenance: {
        fee: 2900, // $29.00 in cents
        description: "Monthly compliance maintenance"
      },
      setupService: {
        basic: 9900, // $99.00 in cents
        standard: 19900, // $199.00 in cents
        premium: 29900, // $299.00 in cents
        description: "Full-service setup assistance"
      }
    });
  });

  // Get conversation history API
  app.get("/api/conversations/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const conversation = await storage.getConversationByPhone(phoneNumber);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const messages = await storage.getMessagesByConversation(conversation.id, 100);
      
      res.json({
        conversation,
        messages: messages.reverse(), // Oldest first
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== MCP (Model Context Protocol) - Kimi K2 Coding Agent ==========
  
  // List available MCP tools
  app.get("/api/mcp/tools", async (req, res) => {
    try {
      const tools = getMCPTools();
      const useHuggingFace = !!process.env.HF_TOKEN;
      res.json({
        model: useHuggingFace ? HUGGINGFACE_KIMI_K2_MODEL : MOONSHOT_MODEL,
        provider: useHuggingFace ? "huggingface" : "moonshot",
        description: "Kimi K2 Coding Agent - 1T parameter MoE model for agentic coding tasks",
        tools,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute an MCP tool
  app.post("/api/mcp/tools/:toolName", async (req, res) => {
    try {
      const { toolName } = req.params;
      const { _hfToken, _temperature, _maxTokens, _modelId, ...args } = req.body;
      
      const options: ModelOptions = {
        hfToken: _hfToken,
        temperature: _temperature,
        maxTokens: _maxTokens,
        modelId: _modelId,
      };
      
      console.log(`[MCP] Executing tool: ${toolName}`, JSON.stringify(args).substring(0, 200));
      
      const result = await handleMCPToolCall(toolName, args, options);
      const useHuggingFace = !!(_hfToken || process.env.HF_TOKEN);
      
      res.json({
        tool: toolName,
        result,
        model: useHuggingFace ? HUGGINGFACE_KIMI_K2_MODEL : MOONSHOT_MODEL,
        provider: useHuggingFace ? "huggingface" : "moonshot",
      });
    } catch (error: any) {
      console.error(`[MCP] Tool error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Quick coding task - auto-selects best tool
  app.post("/api/mcp/code", async (req, res) => {
    try {
      const { task, code, language, error: errorMsg, _hfToken, _temperature, _maxTokens, _modelId } = req.body;
      
      const options: ModelOptions = {
        hfToken: _hfToken,
        temperature: _temperature,
        maxTokens: _maxTokens,
        modelId: _modelId,
      };
      
      let toolName: string;
      let args: Record<string, any>;
      
      if (errorMsg) {
        toolName = "diagnose_error";
        args = { error: errorMsg, context: code, language };
      } else if (code && task?.toLowerCase().includes("fix")) {
        toolName = "fix_code";
        args = { code, language, issue: task };
      } else if (code && task?.toLowerCase().includes("explain")) {
        toolName = "explain_code";
        args = { code, language };
      } else if (code) {
        toolName = "analyze_code";
        args = { code, language, focus: task };
      } else {
        toolName = "generate_code";
        args = { task, language: language || "typescript" };
      }
      
      console.log(`[MCP] Auto-selected tool: ${toolName}`);
      
      const result = await handleMCPToolCall(toolName, args, options);
      const useHuggingFace = !!(_hfToken || process.env.HF_TOKEN);
      
      res.json({
        tool: toolName,
        result,
        model: useHuggingFace ? HUGGINGFACE_KIMI_K2_MODEL : MOONSHOT_MODEL,
        provider: useHuggingFace ? "huggingface" : "moonshot",
      });
    } catch (error: any) {
      console.error(`[MCP] Code task error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Classroom / Micro-Learning API Routes
  const { getOrCreateLessonForTopic, generateSlideContent, recordLessonCompletion, improveLessonPlan, getPopularTopics, getLessonById } = await import("./classroom");

  app.post("/api/classroom/lesson", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: "Topic is required" });
      }
      const result = await getOrCreateLessonForTopic(topic);
      res.json(result);
    } catch (error: any) {
      console.error("[Classroom] Lesson generation error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/classroom/lesson/:id", async (req, res) => {
    try {
      const lesson = await getLessonById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classroom/slide-content", async (req, res) => {
    try {
      const { topic, slideTitle, slideDescription } = req.body;
      if (!topic || !slideTitle || !slideDescription) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const content = await generateSlideContent(topic, slideTitle, slideDescription);
      res.json(content);
    } catch (error: any) {
      console.error("[Classroom] Slide content error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classroom/complete", async (req, res) => {
    try {
      const { lessonPlanId, quizScore, slidesViewed, totalSlides, feedback, rating, userPhone } = req.body;
      if (!lessonPlanId) {
        return res.status(400).json({ error: "Lesson plan ID required" });
      }
      const result = await recordLessonCompletion(lessonPlanId, quizScore, slidesViewed, totalSlides, feedback, rating, userPhone);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[Classroom] Completion recording error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/classroom/improve/:topicId", async (req, res) => {
    try {
      const improved = await improveLessonPlan(req.params.topicId);
      res.json(improved);
    } catch (error: any) {
      console.error("[Classroom] Lesson improvement error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/classroom/popular-topics", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topics = await getPopularTopics(limit);
      res.json(topics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Classroom image generation using Replicate (Flux model)
  app.post("/api/classroom/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio = "16:9" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      const Replicate = (await import("replicate")).default;
      const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
      
      // Use Flux for high-quality educational images
      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: `Educational illustration: ${prompt}. High quality, clear, professional, suitable for teaching.`,
            aspect_ratio: aspectRatio,
            output_format: "webp",
            output_quality: 90
          }
        }
      );
      
      // Flux returns an array of URLs
      const imageUrl = Array.isArray(output) ? output[0] : output;
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("[Classroom] Image generation error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Classroom TTS using Kimi-Audio via Replicate
  app.post("/api/classroom/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      const Replicate = (await import("replicate")).default;
      const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
      
      // Use Kimi-Audio for TTS
      const output = await replicate.run(
        "zsxkib/kimi-audio-7b-instruct:40ab49e15bb65fc63a67f8207c821e592ed4a545e0e1452c34ba7268c64f7a0a",
        {
          input: {
            messages: JSON.stringify([
              { role: "user", message_type: "text", content: `Please read aloud: ${text}` }
            ]),
            output_type: "audio",
            audio_temperature: 0.7,
            text_temperature: 0.0,
          }
        }
      );
      
      // Parse Kimi-Audio response
      let audioUrl = "";
      if (Array.isArray(output)) {
        for (const item of output) {
          if (typeof item === "string" && item.startsWith("http")) {
            audioUrl = item;
            break;
          }
        }
      }
      
      res.json({ audioUrl });
    } catch (error: any) {
      console.error("[Classroom] TTS error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== BILLING / PAYMENT METHODS ====================

  app.get("/api/billing/publishable-key", async (_req, res) => {
    try {
      const { getStripePublishableKey } = await import('./stripeClient');
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/billing/setup-intent", async (req, res) => {
    try {
      const { customerId } = req.body;
      if (!customerId) return res.status(400).json({ error: "customerId is required" });

      const customer = await storage.getCustomer(customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      let stripeCustomerId = customer.stripeCustomerId;
      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          name: customer.name,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
          metadata: { gatewayCustomerId: customer.id },
        });
        stripeCustomerId = stripeCustomer.id;
        await storage.updateCustomer(customer.id, { stripeCustomerId: stripeCustomer.id });
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
      });

      res.json({ clientSecret: setupIntent.client_secret, stripeCustomerId });
    } catch (error: any) {
      console.error("[Billing] Setup intent error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/billing/payment-methods/:customerId", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      if (!customer.stripeCustomerId) return res.json({ paymentMethods: [], defaultPaymentMethodId: null });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const methods = await stripe.paymentMethods.list({
        customer: customer.stripeCustomerId,
        type: 'card',
      });

      const stripeCustomer = await stripe.customers.retrieve(customer.stripeCustomerId);
      const defaultPmId = (stripeCustomer as any).invoice_settings?.default_payment_method || null;

      res.json({
        paymentMethods: methods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: pm.id === defaultPmId,
        })),
        defaultPaymentMethodId: defaultPmId,
      });
    } catch (error: any) {
      console.error("[Billing] List methods error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/billing/payment-methods/:customerId/default", async (req, res) => {
    try {
      const { paymentMethodId } = req.body;
      if (!paymentMethodId) return res.status(400).json({ error: "paymentMethodId is required" });

      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer?.stripeCustomerId) return res.status(404).json({ error: "Customer or Stripe customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      await stripe.customers.update(customer.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Billing] Set default error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/billing/payment-methods/:customerId/:paymentMethodId", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer?.stripeCustomerId) return res.status(404).json({ error: "Customer or Stripe customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      await stripe.paymentMethods.detach(req.params.paymentMethodId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Billing] Remove method error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // VOICE ADMIN API
  // ============================================
  
  // Get voice configuration for an agent
  app.get("/api/voice/config/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      res.json({
        model: agent.voiceModel || 'gemini-2.5-flash-native-audio-preview',
        voice: agent.voiceName || 'Puck',
        role: agent.voiceRole || 'AI Business Assistant',
        companyName: agent.voiceCompanyName || 'AI Biz Bot',
        systemPrompt: agent.systemPrompt || 'You are a helpful AI assistant for small businesses.',
        voicePersona: agent.voicePersona || 'friendly',
      });
    } catch (error: any) {
      console.error("[Voice Admin] Get config error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update voice configuration for an agent
  app.post("/api/voice/config/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { model, voice, role, companyName, systemPrompt, voicePersona } = req.body;
      
      // Validate inputs
      const validModels = [
        'gemini-2.5-flash-native-audio-preview-12-2025',
        'gemini-2.5-flash-native-audio-preview',
        'gemini-2.5-flash-latest',
        'gemini-2.0-flash-native-audio',
      ];
      
      if (model && !validModels.includes(model)) {
        return res.status(400).json({ error: "Invalid model specified" });
      }
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // Update voice configuration
      const updates: any = {};
      if (model !== undefined) updates.voiceModel = model;
      if (voice !== undefined) updates.voiceName = voice;
      if (role !== undefined) updates.voiceRole = role;
      if (companyName !== undefined) updates.voiceCompanyName = companyName;
      if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
      if (voicePersona !== undefined) updates.voicePersona = voicePersona;
      
      const updatedAgent = await storage.updateAgent(agentId, updates);
      
      res.json({
        success: true,
        config: {
          model: updatedAgent.voiceModel,
          voice: updatedAgent.voiceName,
          role: updatedAgent.voiceRole,
          companyName: updatedAgent.voiceCompanyName,
          systemPrompt: updatedAgent.systemPrompt,
          voicePersona: updatedAgent.voicePersona,
        }
      });
    } catch (error: any) {
      console.error("[Voice Admin] Update config error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get available voices for a model
  app.get("/api/voice/models/:modelId/voices", (req, res) => {
    const { modelId } = req.params;
    
    const modelVoices: Record<string, Array<{ id: string; name: string; gender: string; description: string }>> = {
      'gemini-2.5-flash-native-audio-preview-12-2025': [
        { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Warm and expressive' },
        { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
        { id: 'Leda', name: 'Leda', gender: 'female', description: 'Soft and soothing' },
        { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Bright and energetic' },
        { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
        { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
        { id: 'Orus', name: 'Orus', gender: 'male', description: 'Professional and clear' },
        { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
      ],
      'gemini-2.5-flash-native-audio-preview': [
        { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Warm and expressive' },
        { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
        { id: 'Leda', name: 'Leda', gender: 'female', description: 'Soft and soothing' },
        { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Bright and energetic' },
        { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
        { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
        { id: 'Orus', name: 'Orus', gender: 'male', description: 'Professional and clear' },
        { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
      ],
      'gemini-2.5-flash-latest': [
        { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
        { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
        { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
        { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
      ],
      'gemini-2.0-flash-native-audio': [
        { id: 'Puck', name: 'Puck', gender: 'male', description: 'Friendly and approachable' },
        { id: 'Charon', name: 'Charon', gender: 'male', description: 'Deep and authoritative' },
        { id: 'Kore', name: 'Kore', gender: 'female', description: 'Clear and articulate' },
        { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong and confident' },
      ],
    };
    
    const voices = modelVoices[modelId] || modelVoices['gemini-2.5-flash-native-audio-preview-12-2025'];
    res.json({ voices });
  });
  
  // ============================================
  // PUSH-TO-TALK API
  // ============================================
  
  // Process PTT audio recording
  app.post("/api/ptt/process", async (req, res) => {
    try {
      const { audioBase64, agentId, conversationHistory } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ error: "Audio data required" });
      }
      
      // Get agent configuration
      let config: any = {
        agentId: agentId || 'default',
        model: 'gemini-2.5-flash-native-audio-preview',
        voice: 'Puck',
        systemPrompt: 'You are a helpful AI assistant for small businesses.'
      };
      
      if (agentId) {
        const agent = await storage.getAgent(agentId);
        if (agent) {
          config = {
            agentId,
            model: agent.voiceModel || config.model,
            voice: agent.voiceName || config.voice,
            systemPrompt: agent.systemPrompt || config.systemPrompt
          };
        }
      }
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      // Process with PTT service
      const { getPTTService } = await import('./pttService');
      const pttService = getPTTService();
      const result = await pttService.processPTTAudio(
        audioBuffer,
        config,
        conversationHistory || []
      );
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        success: true,
        transcript: result.transcript,
        responseText: result.responseText,
        responseAudio: result.responseAudio?.toString('base64')
      });
    } catch (error: any) {
      console.error("[PTT] Process error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Transcribe audio only (STT)
  app.post("/api/ptt/transcribe", async (req, res) => {
    try {
      const { audioBase64 } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ error: "Audio data required" });
      }
      
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      const { getPTTService } = await import('./pttService');
      const pttService = getPTTService();
      const result = await pttService.transcribeAudio(audioBuffer);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        success: true,
        transcript: result.transcript
      });
    } catch (error: any) {
      console.error("[PTT] Transcribe error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Generate speech from text (TTS)
  app.post("/api/ptt/synthesize", async (req, res) => {
    try {
      const { text, voice } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text required" });
      }
      
      const { getPTTService } = await import('./pttService');
      const pttService = getPTTService();
      const result = await pttService.generateSpeech(text, voice || 'Puck');
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        success: true,
        audio: result.audio?.toString('base64')
      });
    } catch (error: any) {
      console.error("[PTT] Synthesize error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  registerVlmRoutes(app);

  // Register Agent System routes
  registerAgentRoutes(app);

  // Register Workspace Onboarding routes
  registerWorkspaceOnboardingRoutes(app);

  // Register Knowledge Base routes
  app.use("/api/knowledge", knowledgeRoutes);
  app.use("/api/business", businessRoutes);
  app.use("/api/site-configs", siteConfigRoutes);

  // Register Menu and Cart routes
  registerMenuRoutes(app);

  // Register Site Config routes
  app.get("/api/site-configs/:id", async (req, res) => {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'A valid site configuration ID is required.' });
    }
    try {
      const config = await storage.getSiteConfigById(id);
      if (!config) return res.status(404).json({ error: "Site config not found" });
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register Inquiry routes
  registerInquiryRoutes(app);

  // B2B Travel OS: itineraries, GRN/SerpAPI leads, markups, curation events
  registerB2bRoutes(app);

  return httpServer;
}
