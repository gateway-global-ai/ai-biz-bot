import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { registerWorkspaceOnboardingRoutes } from "./routes/workspace-onboarding";
import knowledgeRoutes from "./routes/knowledge-routes";
import businessRoutes from "./routes/businessRoutes";
import siteConfigRoutes from "./routes/siteConfigRoutes";
import cloudbedsRoutes from "./routes/cloudbedsRoutes";
import { claimRoutes, handleClaimCheckoutCompleted } from "./routes/claimRoutes";
import ingestPlanRoutes from "./routes/ingestPlanRoutes";
import bailRescueRoutes from "./routes/bailRescueRoutes";
import shareRoutes from "./routes/shareRoutes";
import agentResearchRoutes from "./routes/agentResearch";
import novaSovereignRouter from "./routes/novaSovereignRoutes";
import novaGuestVerifyRouter from "./routes/novaGuestVerifyRoutes";
import verificationApiV1Routes from "./routes/verificationApiV1Routes";
import verificationSessionHeartbeatRoutes from "./routes/verificationSessionHeartbeatRoutes";
import verificationInstallationKeysRoutes from "./routes/verificationInstallationKeysRoutes";
import onboardingRoutes from "./routes/onboardingRoutes";
import customerOnboardingRoutes from "./routes/customerOnboardingRoutes";
import { registerMenuRoutes } from "./routes/menu-routes";
import healthRoutes from "./routes/healthRoutes";
import platformMetricsRoutes from "./routes/platformMetricsRoutes";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes";
import knowledgeGapRoutes from "./routes/knowledgeGapRoutes";
import analyticsHintRoutes from "./routes/analyticsHintRoutes";
import secureVaultRoutes from "./routes/secureVaultRoutes";
import a2pPreflightRoutes from "./routes/a2pPreflightRoutes";
import twilioWebhooks from "./routes/twilioWebhooks";
import demoEligibilityRoutes from "./routes/demoEligibilityRoutes";
import placesImageRoutes from "./routes/placesImageRoutes";
import { registerInquiryRoutes } from "./routes/inquiry-routes";
import { registerB2bRoutes } from "./routes/b2b-routes";
import telephonyRoutes from "./routes/telephonyRoutes"; // Platinum Core: Telephony, Voice, SMS, Webhooks, TTS, PTT
import billingRoutes from "./routes/billingRoutes";       // Support Spine: Reseller, Stripe, Subscription, Billing
import platformLicenseRoutes from "./routes/platformLicenseRoutes"; // Platform software license keys (admin + customer redeem)
import a2pRoutes from "./routes/a2pRoutes";             // Support Spine: A2P 10-DLC Compliance
import workspaceRoutes from "./routes/workspaceRoutes"; // Google Workspace + Drive + Calendar + Tasks + Analyst
import intelligenceRoutes from "./routes/intelligenceRoutes"; // Business Intelligence: SerpAPI data mining pipeline
import agentSystemRoutes from "./routes/agentSystemRoutes"; // DISC + Agents + Orgs + Projects + BotTemplates
import chatRoutes from "./routes/chatRoutes";           // Website Chat + Chat + Conversations
import localLlmBatchRoutes from "./routes/localLlmBatchRoutes";
import gptActionsOpenApiRoutes from "./routes/gptActionsOpenApiRoutes";
import investorDemoRoutes from "./routes/investorDemoRoutes"; // Investor report SMS gate + view tracking
import aiStudioRoutes from "./routes/aiStudioRoutes"; // AI Studio OAuth/Webhook + PTT session initiation
import affiliateRoutes from "./routes/affiliateRoutes"; // Reseller & Affiliate program signup (phone → registration link)
import pitchDeckRoutes from "./routes/pitchDeckRoutes"; // Pitch decks — deep research / market-fit (The Joint, etc.) (phone → registration link)
import qrCodeRoutes from "./routes/qrCodeRoutes"; // QR code generation (logo center), search businesses, serve image
import { qrAdminRouter, qrRedirectRouter } from "./routes/qrManagementRoutes"; // QR Routes shadow telecom
import storefrontRoutes from "./routes/storefrontRoutes"; // Storefronts: industry landing pages, reports, images, demo
import brandingRoutes from "./routes/brandingRoutes";
import businessTelephonyRoutes from "./routes/businessTelephonyRoutes"; // Per-business sub-account + number provisioning
import platformProductRoutes from "./routes/platformProductRoutes"; // Platform products/services catalog with Stripe sync
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
  getTwilioClient,
  createSubAccountAndProvisionNumber,
  sendVerification,
  checkVerification,
} from "./twilio";
import { insertTelephonyConfigSchema, insertCallLogSchema, insertAgentSchema, insertCustomerSchema, DISC_WORD_SETS, DISC_STYLE_DESCRIPTIONS, PLAN_LIMITS, type DiscRanking, type DiscAssessmentResult } from "@shared/schema";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { gatewayChat } from "./ai-gateway"; // Sovereign: Gemini sole provider
import { sendOtp, verifyOtp, verifySession, logout, requireAuth } from "./auth";
import { customerSendOtp, customerVerifyOtp, customerVerifySession, customerLogout, customerUpdateProfile, customerGetBusinesses, customerClaimBusiness } from "./customerAuth";
import { runDemoEnrichment } from "./services/demo-enrichment";
import { generateFullReport } from "./services/reviewAnalysisService";
import { enrichBusinessData } from "./services/businessDataService";
import { buildRichSystemInstruction } from "./services/systemInstructionBuilder";
import { getFreshPlaceId, getFreshPlaceIdWithSource } from "./services/placeDiscoveryService";
import { enrichBusinessProfile } from "./services/enrichBusinessProfile";
import { provisionAgentsForBusiness } from "./services/agentProvisioning";
import { handleAdminToolCall, ADMIN_TOOL_DEFINITIONS } from "./tools/adminToolHandlers";
// MCP K2 routes decommissioned; use Gemini.
import { GoogleWorkspaceService, createGoogleWorkspaceService, type GoogleWorkspaceCredentials } from "./mcp/googleWorkspace";
import { computeInsights, generateOwnerReport, generateMarketingSearch, formatOwnerReportForSms, formatOwnerReportForChat, formatMarketingReportForSms, formatMarketingReportForChat, lookupPlaceByName, milesToMeters, type ComputeInsightsRequest, type OwnerReportRequest, type MarketingSearchRequest } from "./mcp/placesAggregate";
import { getAvailableApis, calculateCosts, generateRateLimits, generatePricingStrategy, compareApis, type ApiUsageScenario } from "./mcp/googleApiAnalyst";
import { placesCache, CACHE_TTL } from "./placesCache";
import crypto from "crypto";
import { db } from "./db";
import { workspaceConfigurations, analyticsLogs } from "@shared/schema";
import { logVoiceUsage, hasEnergyBalance, getEnergyBalance, getVoiceUsageLogs } from "./services/energy-monitor";
import { eq } from "drizzle-orm";
import { getServerMapsApiKey } from "./config/mapsApiKey";

// schemas moved to telephonyRoutes.ts

const SOCIAL_CRAWLER_UA = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Pinterest|Googlebot|bingbot|Discordbot|vkShare/i;

function getDefaultOg(): Record<string, string> {
  const baseUrl = process.env.APP_URL || "https://aibizbot-dev.gatewayglobal.ai";
  return {
    ogTitle: "CLAIM YOUR BUSINESS PROFILE — GET ACCESS TO YOUR AI AGENTS AND WEBSITE",
    ogDescription: "AI-powered business websites with voice concierge and chat. Free 30 day trial, instant delivery.",
    ogUrl: baseUrl,
    ogImage: `${baseUrl}/og-preview.png`,
    ogType: "website",
    ogSiteName: "Gateway Global AI",
    twitterCard: "summary_large_image",
  };
}
const DEFAULT_OG = getDefaultOg();

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
  // ChatGPT Custom GPT — OpenAPI schema for Actions ("Import from URL")
  app.use(gptActionsOpenApiRoutes);
  app.use(platformMetricsRoutes);
  app.use(adminAnalyticsRoutes);
  app.use(knowledgeGapRoutes);
  app.use(analyticsHintRoutes);
  app.use(secureVaultRoutes);

  // Platinum Core: Telephony, Voice, SMS, Webhooks, TTS, PTT
  app.use(telephonyRoutes);
  app.use(twilioWebhooks); // A2P opt-out compliance — TCPA/CTIA STOP keyword receiver

  // Support Spine: Billing, Reseller, Stripe, Subscription
  app.use(billingRoutes);
  app.use(platformLicenseRoutes);

  // Support Spine: A2P 10-DLC Compliance
  app.use(a2pRoutes);
  app.use('/api/a2p/preflight', a2pPreflightRoutes);

  // Demo eligibility gate + Places image stub
  app.use('/api/demo/check-eligibility', demoEligibilityRoutes);
  app.use('/api/places/generate-image', placesImageRoutes);

  // Google Workspace, Drive, Calendar, Tasks, Analyst
  app.use(workspaceRoutes);

  // Business Intelligence: SerpAPI data mining pipeline (Sage / Data Miner)
  app.use('/api/intelligence', intelligenceRoutes);

  app.use('/api/investor-demo', investorDemoRoutes);

  app.use('/api/ai-studio', aiStudioRoutes);
  app.use('/api/affiliate', affiliateRoutes);
  app.use('/api/pitch-decks', pitchDeckRoutes);
  app.use('/api/qr', qrCodeRoutes);
  app.use("/api/qr-routes", qrAdminRouter);
  app.use("/qr", qrRedirectRouter);
  app.use("/api/storefronts", storefrontRoutes);
  app.use("/api/branding", brandingRoutes);
  app.use("/api/telephony/business", businessTelephonyRoutes);
  app.use("/api/platform-products", platformProductRoutes);

  // Agent System: DISC, Agents, Organizations, Projects, BotTemplates
  app.use(agentSystemRoutes);

  // AI Chat: website-chat, chat, conversations
  app.use(chatRoutes);
  app.use("/api/local-llm-batch", localLlmBatchRoutes);

  app.use(async (req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (!SOCIAL_CRAWLER_UA.test(ua)) return next();
    if (req.path.startsWith("/api/") || req.path.startsWith("/assets/") || req.path.match(/\.\w+$/)) return next();

    try {
      const pagePath = req.path === "/" ? "/" : req.path.replace(/\/$/, "");
      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const baseUrl = `${protocol}://${host}`;

      // Per-site OG for public business pages: /biz/:slug
      const bizMatch = pagePath.match(/^\/biz\/([^/]+)$/);
      if (bizMatch) {
        const slug = bizMatch[1];
        const site = await storage.getSiteConfigBySlug(slug);
        if (site) {
          const placeData = (site as any).placeData as { editorial_summary?: string | { overview?: string }; name?: string } | undefined;
          const summary = placeData?.editorial_summary && typeof placeData.editorial_summary === "object"
            ? (placeData.editorial_summary as { overview?: string }).overview
            : (placeData?.editorial_summary as string | undefined);
          const stored = ((site as any).socialSharing as Record<string, string>) || {};
          const heroUrl = (site as any).heroImageUrl as string | undefined;
          const imageAbs = (url: string) => (url && url.startsWith("http") ? url : `${baseUrl}${url?.startsWith("/") ? "" : "/"}${url || ""}`);
          const og = {
            ogTitle: stored.ogTitle ?? site.name ?? DEFAULT_OG.ogTitle,
            ogDescription: stored.ogDescription ?? summary ?? `Visit ${site.name} — AI-powered voice and chat.` ?? DEFAULT_OG.ogDescription,
            ogUrl: stored.ogUrl ?? `${baseUrl}/biz/${slug}`,
            ogImage: stored.ogImage ? imageAbs(stored.ogImage) : (heroUrl ? imageAbs(heroUrl) : DEFAULT_OG.ogImage),
            ogType: (stored.ogType as "website" | "article") ?? DEFAULT_OG.ogType,
            ogSiteName: stored.ogSiteName ?? site.name ?? DEFAULT_OG.ogSiteName,
            twitterCard: stored.twitterCard ?? DEFAULT_OG.twitterCard,
          };
          return res.status(200).set({ "Content-Type": "text/html" }).end(buildOgHtml(og));
        }
      }

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

  // ← extracted to server/routes/billingRoutes.ts or a2pRoutes.ts

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
          heroImageUrl: placeId ? `/api/places/photo-proxy/${placeId}?maxWidth=1200` : null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "gemini",
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
          heroImageUrl: placeId ? `/api/places/photo-proxy/${placeId}?maxWidth=1200` : null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "gemini",
        });
      }

      await sendVerification(normalizedPhone);

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

      const verifyResult = await checkVerification(normalizedPhone, code);
      if (!verifyResult.valid) {
        return res.status(401).json({ error: "Invalid or expired verification code" });
      }

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

  // Error Navigator & recovery analytics (bounce prevention, VOICE_TIER_INTEREST)
  app.post("/api/analytics/recovery-success", async (req, res) => {
    try {
      const body = req.body || {};
      const eventType = body.eventType || "RECOVERY_SUCCESS";
      const siteConfigId = body.siteConfigId ?? null;
      const metadata =
        eventType === "RECOVERY_SUCCESS"
          ? {
              errorCode: body.errorCode,
              recoveredPath: body.recoveredPath,
              timeInError: body.timeInError,
            }
          : body.metadata || {};
      await db.insert(analyticsLogs).values({
        siteConfigId,
        eventType,
        metadata,
      });
      res.json({ success: true, message: "Recovery logged." });
    } catch (error: any) {
      console.error("[Analytics] recovery-success error:", error);
      res.status(500).json({ error: "Failed to log recovery" });
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
          heroImageUrl: lead.placeId ? `/api/places/photo-proxy/${lead.placeId}?maxWidth=1200` : null,
          ownerId: customerAccount?.id || null,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          widgetPosition: "bottom-right",
          widgetColor: "#2563eb",
          greetingMessage: `Welcome to ${lead.businessName}! How can we help you today?`,
          placeholderText: "Type a message...",
          modelProvider: "gemini",
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
      const { getServerMapsApiKey } = await import("./config/mapsApiKey");
      const googleMapsKey = getServerMapsApiKey();
      const geminiKey = process.env.GEMINI_API_KEY;
      const hasValidPlaceId = placeId.length > 20 && !placeId.includes("...");

      const dependencyChecks: Array<{ name: string; status: "ok" | "missing" | "error"; message?: string }> = [
        { name: "SERP_API_KEY", status: serpKey ? "ok" : "missing", message: serpKey ? undefined : "Set SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY" },
        { name: "Google Maps/Places key", status: googleMapsKey ? "ok" : "missing", message: googleMapsKey ? undefined : "Set GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY" },
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
          message: "Google Maps/Places API key not set (GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY)",
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
          message: "Google Maps/Places API key not set (GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY)",
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

  /**
   * Admin: generic admin tool-call endpoint.
   *
   * GET  /api/admin/tool-definitions  – list available admin tools (OpenAI-compatible schema)
   * POST /api/admin/tool-call         – execute a named admin tool
   *   Body: { tool: string; args?: Record<string, unknown> }
   *
   * Admin-only. Rate-limited (shares the enrichment rate-limiter).
   */
  app.get("/api/admin/tool-definitions", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return res.status(401).json({ error: "Admin authentication required" });
    }
    res.json(ADMIN_TOOL_DEFINITIONS);
  });

  app.post("/api/admin/tool-call", async (req, res) => {
    try {
      // Rate limiting (reuses enrichment limits — same cost boundary)
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
        tool: z.string().min(1),
        args: z.record(z.unknown()).optional().default({}),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await handleAdminToolCall(parsed.data.tool, parsed.data.args, {
        adminId: String(req.headers?.["x-admin-token"] ?? "session"),
        ip: req.ip || req.socket.remoteAddress || "unknown",
      });
      res.json(result);
    } catch (error: any) {
      if (error?.message?.startsWith("Unknown admin tool:")) {
        return res.status(404).json({ error: error.message });
      }
      console.error("[AdminToolCall] Error:", error);
      res.status(500).json({ error: error?.message || "Tool call failed" });
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

  // ============ Google Places Details (Places API (New) v1 — same key as Doppler) ============
  app.get("/api/places/details/:placeId", async (req, res) => {
    try {
      const apiKey = getServerMapsApiKey() || process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }
      const placeId = (req.params.placeId || "").replace(/^places\//i, "").trim();
      if (!placeId) {
        return res.status(400).json({ error: "placeId required", reviews: [] });
      }
      // Use Places API (New) so Doppler key (e.g. Grounding Lite) restricted to places.googleapis.com works
      const fieldMask = [
        "id", "displayName", "formattedAddress", "shortFormattedAddress", "location",
        "rating", "userRatingCount", "regularOpeningHours", "websiteUri",
        "internationalPhoneNumber", "nationalPhoneNumber", "photos", "reviews",
        "addressComponents", "plusCode", "priceLevel", "businessStatus", "types",
        "googleMapsUri",
      ].join(",");
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const errMsg = data?.error?.message || data?.status || String(response.status);
        console.error("[Places Details] Google API error:", response.status, errMsg);
        return res.status(response.status >= 500 ? 502 : 400).json({ error: errMsg, reviews: [] });
      }
      const p = data;
      const openingHours = p.regularOpeningHours
        ? { weekday_text: p.regularOpeningHours.weekdayDescriptions || [] }
        : undefined;
      const geometry = p.location
        ? { location: { lat: p.location.latitude, lng: p.location.longitude } }
        : undefined;
      const reviews = (p.reviews || []).map((r: any) => ({
        id: r.name || undefined,
        author_name: r.authorAttribution?.displayName || undefined,
        profile_photo_url: r.authorAttribution?.photoUri || undefined,
        rating: r.rating,
        text: r.text?.text || r.originalText?.text,
        time: r.publishTime,
        relative_time_description: r.relativePublishTimeDescription,
      }));
      res.json({
        name: p.displayName?.text ?? p.displayName ?? "",
        formatted_address: p.formattedAddress ?? p.shortFormattedAddress ?? "",
        geometry,
        types: p.types || [],
        opening_hours: openingHours,
        photos: p.photos || [],
        reviews,
        user_ratings_total: p.userRatingCount ?? 0,
        rating: p.rating ?? 0,
        price_level: p.priceLevel,
        business_status: p.businessStatus,
        url: p.googleMapsUri ?? undefined,
        vicinity: p.shortFormattedAddress ?? undefined,
        utc_offset: undefined,
        international_phone_number: p.internationalPhoneNumber ?? undefined,
        formatted_phone_number: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? undefined,
        website: p.websiteUri ?? undefined,
        address_components: p.addressComponents,
        plus_code: p.plusCode ? { global_code: p.plusCode.globalCode, compound_code: p.plusCode.compoundCode } : undefined,
        editorial_summary: undefined,
        wheelchair_accessible_entrance: undefined,
        delivery: undefined,
        dine_in: undefined,
        takeout: undefined,
        curbside_pickup: undefined,
        reservable: undefined,
        serves_beer: undefined,
        serves_wine: undefined,
        serves_breakfast: undefined,
        serves_lunch: undefined,
        serves_dinner: undefined,
        serves_brunch: undefined,
        serves_vegetarian_food: undefined,
      });
    } catch (error: any) {
      console.error("[Places Details] Error:", error.message);
      res.status(500).json({ error: error.message, reviews: [] });
    }
  });

  // Photo proxy: fetch a business hero image by placeId (keeps API key server-side)
  app.get("/api/places/photo-proxy/:placeId", async (req, res) => {
    const apiKey = getServerMapsApiKey() || process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) return res.status(500).send("API key not configured");
    const { placeId } = req.params;
    const maxWidth = Math.min(Number(req.query.maxWidth) || 800, 1200);

    const servePhoto = async (photoUrl: string): Promise<boolean> => {
      const photoRes = await fetch(photoUrl);
      if (!photoRes.ok) return false;
      res.setHeader("Content-Type", photoRes.headers.get("content-type") || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(Buffer.from(await photoRes.arrayBuffer()));
      return true;
    };

    try {
      // ── Primary: New Places API v1 (places.googleapis.com) ──────────────────
      let served = false;
      try {
        const newApiUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=photos&key=${apiKey}`;
        const newDetailsRes = await fetch(newApiUrl, {
          headers: { "X-Goog-FieldMask": "photos" },
        });
        if (newDetailsRes.ok) {
          const newData = await newDetailsRes.json() as any;
          const photoName: string | undefined = newData?.photos?.[0]?.name;
          if (photoName) {
            const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
            served = await servePhoto(mediaUrl);
          }
        }
      } catch (newApiErr: any) {
        console.error("[photo-proxy] New Places API failed:", newApiErr?.message);
      }

      if (served) return;

      // ── Fallback: Legacy Places Details + Photo API ──────────────────────────
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = await detailsRes.json() as any;
      const photoRef = detailsData?.result?.photos?.[0]?.photo_reference;
      if (!photoRef) {
        console.error(`[photo-proxy] No photo available for placeId=${placeId}. Status: ${detailsData?.status}`);
        return res.status(404).send("No photo available");
      }

      const legacyPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}&key=${apiKey}`;
      const ok = await servePhoto(legacyPhotoUrl);
      if (!ok) {
        console.error(`[photo-proxy] Legacy photo fetch failed for placeId=${placeId}`);
        res.status(502).send("Photo fetch failed");
      }
    } catch (err: any) {
      console.error("[photo-proxy] Unhandled error:", err?.message);
      res.status(500).send(err.message);
    }
  });

  // Google Places Search - for business discovery (with caching). Uses platform key (Grounding Lite / Places).
  app.post("/api/places/search", async (req, res) => {
    try {
      const apiKey = getServerMapsApiKey() || process.env.GOOGLE_CLOUD_API_KEY;
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

          // Transform the new API format to match platform (placeId + place_id for home/storefront)
          const places = (data.places || []).map((place: any) => {
            const id = place.id?.replace(/^places\//i, '') || place.id;
            return {
              placeId: id,
              place_id: id,
              name: place.displayName?.text || 'Unknown',
              address: place.formattedAddress || '',
              location: place.location,
              rating: place.rating || 0,
              userRatingCount: place.userRatingCount || 0,
              types: place.types || [],
              primaryType: place.primaryType,
              businessStatus: place.businessStatus,
              photos: place.photos?.map((p: any) => p.name) || []
            };
          });

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

  // ← extracted to server/routes/{workspaceRoutes,agentSystemRoutes,chatRoutes}.ts
  // ============================================
  // DISC ASSESSMENT API
  // ============================================

  // Get all DISC word sets (questions)
  // ← extracted to server/routes/{workspaceRoutes,agentSystemRoutes,chatRoutes}.ts
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
        heroImageUrl: z.string().optional(),
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
      const payload = parsed.data;
      const heroImageUrl =
        payload.heroImageUrl ?? (payload.placeId ? `/api/places/photo-proxy/${payload.placeId}?maxWidth=1200` : undefined);
      const config = await storage.createSiteConfig({ ...payload, heroImageUrl });
      try {
        const placeTypes = (config.placeData as { types?: string[] } | null)?.types ?? ['establishment'];
        await provisionAgentsForBusiness(config.id, placeTypes, config.name);
      } catch (provisionErr: any) {
        console.error('[SiteConfig] Agent provisioning failed (site created):', provisionErr?.message ?? provisionErr);
      }
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
        heroImageUrl: z.string().nullable().optional(),
        heroImagePrompt: z.string().nullable().optional(),
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

  // Sub-Account CID Provisioning Engine
  // Automatically creates a Twilio sub-account for a new AI Partner, purchases a
  // local phone number in that sub-account, and wires the Voice URL webhook so the
  // number is live in a single API call (< 10 s target).
  app.post("/api/site-configs/:id/provision-number", async (req, res) => {
    try {
      const siteConfig = await storage.getSiteConfig(req.params.id);
      if (!siteConfig) return res.status(404).json({ error: "AI Partner not found" });

      if (siteConfig.provisionedPhoneNumber) {
        return res.status(409).json({
          error: "A phone number is already provisioned for this AI Partner",
          phoneNumber: siteConfig.provisionedPhoneNumber,
        });
      }

      const schema = z.object({
        areaCode: z.string().regex(/^\d{3}$/, "Area code must be exactly 3 digits"),
        country: z.string().length(2).optional().default("US"),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const { areaCode, country } = parsed.data;

      // Build the Voice webhook URL pointing to the AI voice concierge endpoint.
      // Voice webhook is /webhook/voice/stream registered in routes.ts.
      const host = process.env.REPLIT_DEV_DOMAIN || req.get("host");
      const voiceWebhookUrl = `https://${host}/webhook/voice/stream`;

      const result = await createSubAccountAndProvisionNumber(
        siteConfig.name,
        areaCode,
        voiceWebhookUrl,
        country,
      );

      // Persist the sub-account and provisioned number on the site config
      // Note: authToken is saved in the twilioSubAccounts table for security
      const savedSubAccount = await storage.createTwilioSubAccount({
        accountSid: result.subAccountSid,
        authToken: result.subAccountAuthToken,
        friendlyName: result.subAccountFriendlyName,
        status: "active",
        ownerEmail: null,
      });

      await storage.updateSiteConfig(req.params.id, {
        twilioSubAccountSid: result.subAccountSid,
        provisionedPhoneNumber: result.phoneNumber,
        provisionedPhoneSid: result.phoneSid,
      });

      console.log(`[Provision] AI Partner "${siteConfig.name}" (${req.params.id}) provisioned number ${result.phoneNumber} via sub-account ${result.subAccountSid}`);

      res.status(201).json({
        subAccountSid: result.subAccountSid,
        subAccountId: savedSubAccount.id,
        phoneNumber: result.phoneNumber,
        phoneSid: result.phoneSid,
        voiceWebhookUrl,
      });
    } catch (error: any) {
      console.error("[Provision] Error provisioning number:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Hero Image — handled by siteConfigRoutes (POST /:id/generate-hero-image)

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

  // ── Energy / Usage Ledger endpoints ─────────────────────────────────────────

  /** GET /api/site-configs/:id/energy – current balance + lifetime totals */
  app.get("/api/site-configs/:id/energy", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const balance = await getEnergyBalance(req.params.id);
      res.json(balance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** GET /api/site-configs/:id/energy/logs – paginated usage log */
  app.get("/api/site-configs/:id/energy/logs", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
      const logs = await getVoiceUsageLogs(req.params.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** POST /api/site-configs/:id/energy/top-up – add prepaid minutes */
  app.post("/api/site-configs/:id/energy/top-up", async (req, res) => {
    try {
      const site = await storage.getSiteConfigById(req.params.id);
      if (!site) return res.status(404).json({ error: "Site not found" });

      const schema = z.object({ minutes: z.number().int().positive() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "minutes must be a positive integer" });

      const current = site.voicePhoneAiMinutes ?? 0;
      const newBalance = current + parsed.data.minutes;
      await storage.updateSiteConfig(req.params.id, { voicePhoneAiMinutes: newBalance });
      res.json({ success: true, minuteBalance: newBalance, added: parsed.data.minutes });
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

      const agentTemp = agent.aiTemperature ? agent.aiTemperature / 100 : 0.7;
      const agentMaxTokens = agent.aiMaxTokens || 4096;
      // Sovereign: Gemini is the sole AI provider. Model from Doppler.
      const modelToUse = process.env.GEMINI_MODEL_FALLBACK;

      let response: string;
      try {
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
      } catch (firstError: any) {
        console.warn('Admin command chat first attempt failed, retrying:', firstError.message);
        ({ response } = await gatewayChat({ messages, model: modelToUse, temperature: agentTemp, max_tokens: agentMaxTokens }));
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
  // ← extracted to server/routes/{workspaceRoutes,agentSystemRoutes,chatRoutes}.ts

  // ========== MCP (Model Context Protocol) — DECOMMISSIONED ==========
  // Legacy MCP server removed. These routes return 410 Gone.
  // Future: Gemini-native tool calling replaces this pattern.

  app.get("/api/mcp/tools", (_req, res) => {
    res.status(410).json({ error: "Legacy MCP server decommissioned. Use Gemini tool declarations." });
  });

  app.post("/api/mcp/tools/:toolName", (_req, res) => {
    res.status(410).json({ error: "Legacy MCP server decommissioned. Use Gemini tool declarations." });
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
      
      // Legacy MCP decommissioned — return 410
      res.status(410).json({ error: "Legacy MCP code tasks decommissioned.", tool: toolName });
      return;
    } catch (error: any) {
      console.error(`[MCP] Code task error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // ← extracted to server/routes/billingRoutes.ts or a2pRoutes.ts

  // ← extracted to server/routes/telephonyRoutes.ts


  // Register Workspace Onboarding routes
  registerWorkspaceOnboardingRoutes(app);

  // Register Knowledge Base routes
  app.use("/api/knowledge", knowledgeRoutes);
  app.use("/api/business", businessRoutes);
  // Remote OS: installation API keys + v1 guest verification (mount keys router before siteConfigRoutes)
  app.use("/api/v1/verification", verificationApiV1Routes);
  app.use("/api/v1/verification", verificationSessionHeartbeatRoutes);
  app.use("/api/site-configs", verificationInstallationKeysRoutes);
  app.use("/api/site-configs", siteConfigRoutes);
  app.use("/api/share", shareRoutes);
  app.use("/api/cloudbeds", cloudbedsRoutes);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/customer/onboarding", customerOnboardingRoutes);

  // Register Site Claim / Assignment routes (assign + preview + OTP + Stripe checkout)
  app.use(claimRoutes);

  // Intelligence Ingestion: POST /api/ingest-plan
  app.use(ingestPlanRoutes);

  // Bail Rescue public API: GET /api/bail-rescue/:token, POST /api/bail-rescue/:token/checkout
  app.use(bailRescueRoutes);

  // Agent Deep Research: POST /api/generate-agent-persona
  app.use(agentResearchRoutes);

  // NOVA Sovereign Billing: POST /api/nova/billing/push, POST /api/nova/billing/receive
  app.use("/api/nova", novaSovereignRouter);
  // NOVA guest verification: POST /api/nova/guest/verify/start|complete
  app.use("/api/nova", novaGuestVerifyRouter);

  // Register Menu and Cart routes
  registerMenuRoutes(app);

  // Register Inquiry routes
  registerInquiryRoutes(app);

  // B2B Travel OS: itineraries, GRN/SerpAPI leads, markups, curation events
  registerB2bRoutes(app);

  // SPA catch-all is registered in server/index.ts AFTER serveStatic() so that
  // express.static handles /assets/* before the wildcard can intercept them.

  return httpServer;
}
