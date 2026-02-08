import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertVlmProspectSchema, insertVlmCampaignSchema, insertVlmCallAttemptSchema } from "@shared/schema";
import { VlmGoogleMapsService } from "./services/vlm-google-maps";
import { VlmQualityScoringService } from "./services/vlm-quality-scoring";
import { VlmEmailEnrichmentService } from "./services/vlm-email-enrichment";
import { VlmCsvExportService } from "./services/vlm-csv-export";
import { VlmOutboundCallerService } from "./services/vlm-outbound-caller";
import { VlmWebsiteAnalyzerService } from "./services/vlm-website-analyzer";
import { autoAgentService } from "./services/vlm-auto-agent";
import { z } from "zod";
import path from "path";

const scoringService = new VlmQualityScoringService();
const emailService = new VlmEmailEnrichmentService();
const csvService = new VlmCsvExportService();
const callerService = new VlmOutboundCallerService();
const websiteAnalyzer = new VlmWebsiteAnalyzerService();

export function registerVlmRoutes(app: Express) {
  // ==========================================
  // Lead Discovery
  // ==========================================

  app.post("/api/vlm/discover", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        city: z.string().min(1),
        industry: z.string().min(1),
        maxResults: z.number().int().min(1).max(200).optional().default(20),
        enrichEmail: z.boolean().optional().default(false),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const { city, industry, maxResults, enrichEmail } = parsed.data;
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google Cloud API key not configured" });

      const mapsService = new VlmGoogleMapsService(apiKey);

      const places = await mapsService.searchPlaces({ city, industry, maxResults });
      let prospects = await mapsService.enrichProspects(places, industry);

      if (enrichEmail) {
        prospects = await emailService.enrichProspects(prospects);
      }

      prospects = scoringService.scoreProspects(prospects, city);
      prospects = scoringService.sortByQuality(prospects);

      const saved = await storage.createVlmProspects(prospects);

      res.json({
        discovered: places.length,
        enriched: prospects.length,
        saved: saved.length,
        prospects: saved,
      });
    } catch (error: any) {
      console.error("[VLM] Discovery error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Prospects CRUD
  // ==========================================

  app.get("/api/vlm/prospects", async (req: Request, res: Response) => {
    try {
      const { industry, city, status, limit } = req.query;
      const prospects = await storage.getVlmProspects({
        industry: industry as string,
        city: city as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(prospects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vlm/prospects/:id", async (req: Request, res: Response) => {
    try {
      const prospect = await storage.getVlmProspect(req.params.id);
      if (!prospect) return res.status(404).json({ error: "Prospect not found" });
      res.json(prospect);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vlm/prospects", async (req: Request, res: Response) => {
    try {
      const parsed = insertVlmProspectSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const prospect = await storage.createVlmProspect(parsed.data);
      res.json(prospect);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/vlm/prospects/:id", async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateVlmProspect(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Prospect not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/vlm/prospects/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteVlmProspect(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Email Enrichment
  // ==========================================

  app.post("/api/vlm/enrich-emails", async (req: Request, res: Response) => {
    try {
      const { prospectIds } = req.body;
      if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
        return res.status(400).json({ error: "prospectIds array required" });
      }

      let enrichedCount = 0;
      for (const id of prospectIds) {
        const prospect = await storage.getVlmProspect(id);
        if (prospect?.website && !prospect.email) {
          const email = await emailService.findEmailFromWebsite(prospect.website);
          if (email) {
            await storage.updateVlmProspect(id, { email });
            enrichedCount++;
          }
        }
      }

      res.json({ enrichedCount, total: prospectIds.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Website Analysis
  // ==========================================

  app.post("/api/vlm/analyze-website", async (req: Request, res: Response) => {
    try {
      const { prospectId, url } = req.body;
      const targetUrl = url || (prospectId ? (await storage.getVlmProspect(prospectId))?.website : null);
      if (!targetUrl) return res.status(400).json({ error: "URL or prospectId with website required" });

      const report = await websiteAnalyzer.analyzeWebsite(targetUrl);
      const grade = websiteAnalyzer.getGrade(report.score);

      if (prospectId) {
        await storage.updateVlmProspect(prospectId, {
          websiteQualityScore: report.score,
          websiteQualityReport: report as any,
        });
      }

      res.json({ ...report, grade });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // CSV Export
  // ==========================================

  app.post("/api/vlm/export-csv", async (req: Request, res: Response) => {
    try {
      const { industry, city, status } = req.body;
      const prospects = await storage.getVlmProspects({ industry, city, status });

      if (prospects.length === 0) {
        return res.status(400).json({ error: "No prospects to export" });
      }

      const result = await csvService.exportProspects(prospects);
      res.download(result.filePath, path.basename(result.filePath));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Campaigns CRUD
  // ==========================================

  app.get("/api/vlm/campaigns", async (_req: Request, res: Response) => {
    try {
      const campaigns = await storage.getVlmCampaigns();
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vlm/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getVlmCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vlm/campaigns", async (req: Request, res: Response) => {
    try {
      const parsed = insertVlmCampaignSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const campaign = await storage.createVlmCampaign(parsed.data);
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/vlm/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateVlmCampaign(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Campaign not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/vlm/campaigns/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteVlmCampaign(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Outbound Calling
  // ==========================================

  app.post("/api/vlm/call", async (req: Request, res: Response) => {
    try {
      const { prospectId, campaignId } = req.body;
      if (!prospectId) return res.status(400).json({ error: "prospectId required" });

      const prospect = await storage.getVlmProspect(prospectId);
      if (!prospect) return res.status(404).json({ error: "Prospect not found" });
      if (!prospect.phone) return res.status(400).json({ error: "Prospect has no phone number" });

      let campaign = null;
      if (campaignId) {
        campaign = await storage.getVlmCampaign(campaignId);
        if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      }

      const existingAttempts = await storage.getVlmCallAttempts({ prospectId });
      const attemptNumber = existingAttempts.length + 1;

      const dummyCampaign = campaign || {
        id: null, callerIdNumber: null, scriptTemplate: null,
        industry: prospect.industry, city: prospect.city || "", name: "Manual Call",
      } as any;

      const result = await callerService.initiateCall(prospect, dummyCampaign);
      const attempt = await storage.createVlmCallAttempt(
        callerService.buildCallAttemptRecord(prospectId, campaignId || null, result.callSid, attemptNumber)
      );

      await storage.updateVlmProspect(prospectId, { status: "called" });

      if (campaign) {
        await storage.updateVlmCampaign(campaign.id, {
          totalCalled: (campaign.totalCalled || 0) + 1,
        });
      }

      res.json({ attempt, callSid: result.callSid });
    } catch (error: any) {
      console.error("[VLM] Call error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Twilio Webhooks for VLM
  // ==========================================

  app.post("/api/vlm/twiml/:campaignId", async (req: Request, res: Response) => {
    try {
      const baseUrl =
        process.env.WEBHOOK_BASE_URL ||
        process.env.REPLIT_DEPLOYMENT_URL ||
        (process.env.REPL_SLUG && process.env.REPL_OWNER
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : undefined) ||
        (req.protocol && req.get("host") ? `${req.protocol}://${req.get("host")}` : undefined);

      if (!baseUrl) {
        console.warn("[VLM] No base URL configured; Gather action may fail. Set WEBHOOK_BASE_URL.");
      }

      const campaign = await storage.getVlmCampaign(req.params.campaignId);
      const callSid = req.body.CallSid;
      let prospect = null;

      if (callSid) {
        const attempt = await storage.getVlmCallAttemptByCallSid(callSid);
        if (attempt) prospect = await storage.getVlmProspect(attempt.prospectId);
      }

      const dummyProspect = prospect || {
        businessName: "Business", industry: campaign?.industry || "general", city: campaign?.city || "",
      } as any;

      const twiml = callerService.generateTwiml(
        campaign || { scriptTemplate: null, industry: "general", city: "" } as any,
        dummyProspect,
        baseUrl || ""
      );

      res.type("text/xml").send(twiml);
    } catch (error: any) {
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred. Goodbye.</Say><Hangup/></Response>`);
    }
  });

  app.post("/api/vlm/gather-response", async (req: Request, res: Response) => {
    const digit = req.body.Digits;
    const callSid = req.body.CallSid;

    if (callSid) {
      const attempt = await storage.getVlmCallAttemptByCallSid(callSid);
      if (attempt) {
        const outcome = digit === "1" ? "sale" : "rejected";
        await storage.updateVlmCallAttempt(attempt.id, { outcome, notes: `Pressed ${digit}` });

        if (digit === "1") {
          await storage.updateVlmProspect(attempt.prospectId, { status: "won" });
          if (attempt.campaignId) {
            const campaign = await storage.getVlmCampaign(attempt.campaignId);
            if (campaign) {
              await storage.updateVlmCampaign(campaign.id, { totalSales: (campaign.totalSales || 0) + 1 });
            }
          }
          autoAgentService.sendWebsiteLink(attempt.prospectId).catch((err) => {
            console.error(`[VLM] Auto-SMS failed for prospect ${attempt.prospectId}:`, err.message);
          });
        } else if (digit === "2") {
          await storage.updateVlmProspect(attempt.prospectId, { status: "lost" });
        }
      }
    }

    const twiml = callerService.generateGatherResponse(digit);
    res.type("text/xml").send(twiml);
  });

  app.post("/api/vlm/call-status", async (req: Request, res: Response) => {
    try {
      const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;

      if (CallSid) {
        const attempt = await storage.getVlmCallAttemptByCallSid(CallSid);
        if (attempt) {
          const updates: any = { status: CallStatus };
          if (CallDuration) updates.duration = parseInt(CallDuration);
          if (RecordingUrl) updates.recordingUrl = RecordingUrl;

          if (CallStatus === "completed" && !attempt.outcome) {
            updates.outcome = "connected";
            if (attempt.campaignId) {
              const campaign = await storage.getVlmCampaign(attempt.campaignId);
              if (campaign) {
                await storage.updateVlmCampaign(campaign.id, {
                  totalConnected: (campaign.totalConnected || 0) + 1,
                });
              }
            }
          } else if (["no-answer", "busy", "failed", "canceled"].includes(CallStatus)) {
            updates.outcome = CallStatus === "no-answer" ? "no_answer" : CallStatus;
          }

          await storage.updateVlmCallAttempt(attempt.id, updates);
        }
      }

      res.sendStatus(200);
    } catch (error: any) {
      console.error("[VLM] Status callback error:", error.message);
      res.sendStatus(200);
    }
  });

  // ==========================================
  // Call Attempts
  // ==========================================

  app.get("/api/vlm/call-attempts", async (req: Request, res: Response) => {
    try {
      const { campaignId, prospectId, limit } = req.query;
      const attempts = await storage.getVlmCallAttempts({
        campaignId: campaignId as string,
        prospectId: prospectId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Stats / Dashboard
  // ==========================================

  // ==========================================
  // Auto-Agent Pipeline
  // ==========================================

  app.post("/api/vlm/auto-agent/run", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        city: z.string().min(1),
        industry: z.string().min(1),
        maxLeads: z.number().int().min(1).max(200).optional().default(20),
        enrichEmails: z.boolean().optional().default(false),
        autoGenerateSites: z.boolean().optional().default(true),
        autoCall: z.boolean().optional().default(false),
        minQualityScore: z.number().int().min(0).max(100).optional().default(40),
        callScript: z.string().optional(),
        callerIdNumber: z.string().optional(),
        callDelayMs: z.number().int().min(0).optional().default(3000),
        useKnowledgeBase: z.boolean().optional().default(true), // Enable by default
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const result = await autoAgentService.runPipeline(parsed.data);
      res.json(result);
    } catch (error: any) {
      console.error("[VLM Auto-Agent] Pipeline error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vlm/auto-agent/progress", async (_req: Request, res: Response) => {
    res.json(autoAgentService.getProgress());
  });

  app.post("/api/vlm/auto-agent/send-link", async (req: Request, res: Response) => {
    try {
      const { prospectId } = req.body;
      if (!prospectId) return res.status(400).json({ error: "prospectId required" });

      const sent = await autoAgentService.sendWebsiteLink(prospectId);
      res.json({ success: sent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vlm/auto-agent/report/:campaignId", async (req: Request, res: Response) => {
    try {
      const report = await autoAgentService.getReport(req.params.campaignId);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vlm/auto-agent/generate-script", async (req: Request, res: Response) => {
    try {
      const { businessName, industry, city, rating, reviewCount, baseScript } = req.body;
      const script = autoAgentService.generateAiScript(
        { businessName, industry, city, rating, reviewCount },
        baseScript
      );
      res.json({ script });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vlm/auto-agent/generate-knowledge-script", async (req: Request, res: Response) => {
    try {
      const { prospectId, campaignId } = req.body;
      
      if (!prospectId) {
        return res.status(400).json({ error: "prospectId required" });
      }

      const prospect = await storage.getVlmProspect(prospectId);
      if (!prospect) {
        return res.status(404).json({ error: "Prospect not found" });
      }

      let campaign = null;
      if (campaignId) {
        campaign = await storage.getVlmCampaign(campaignId);
      }

      const script = await callerService.generateKnowledgeEnhancedScript(prospect, campaign || undefined);
      
      res.json({ 
        script,
        prospect: {
          businessName: prospect.businessName,
          industry: prospect.industry,
          city: prospect.city
        }
      });
    } catch (error: any) {
      console.error("[VLM] Knowledge script generation error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Stats / Dashboard
  // ==========================================

  app.get("/api/vlm/stats", async (_req: Request, res: Response) => {
    try {
      const prospects = await storage.getVlmProspects({ limit: 10000 });
      const campaigns = await storage.getVlmCampaigns();
      const callAttempts = await storage.getVlmCallAttempts({ limit: 10000 });

      const stats = {
        totalProspects: prospects.length,
        prospectsWithPhone: prospects.filter((p) => p.phone).length,
        prospectsWithEmail: prospects.filter((p) => p.email).length,
        avgQualityScore: prospects.length ? Math.round(prospects.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / prospects.length) : 0,
        statusBreakdown: {
          new: prospects.filter((p) => p.status === "new").length,
          queued: prospects.filter((p) => p.status === "queued").length,
          called: prospects.filter((p) => p.status === "called").length,
          won: prospects.filter((p) => p.status === "won").length,
          lost: prospects.filter((p) => p.status === "lost").length,
        },
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        totalCalls: callAttempts.length,
        totalConnected: callAttempts.filter((a) => a.outcome === "connected" || a.outcome === "sale").length,
        totalSales: callAttempts.filter((a) => a.outcome === "sale").length,
        connectionRate: callAttempts.length ? Math.round(
          (callAttempts.filter((a) => a.outcome === "connected" || a.outcome === "sale").length / callAttempts.length) * 100
        ) : 0,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
