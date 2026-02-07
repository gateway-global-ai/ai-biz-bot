import { storage } from "../storage";
import { VlmGoogleMapsService } from "./vlm-google-maps";
import { VlmQualityScoringService } from "./vlm-quality-scoring";
import { VlmEmailEnrichmentService } from "./vlm-email-enrichment";
import { VlmOutboundCallerService } from "./vlm-outbound-caller";
import { knowledgeBaseService } from "./knowledge-base";
import type { VlmProspect, VlmCampaign, InsertVlmProspect } from "@shared/schema";

const scoringService = new VlmQualityScoringService();
const emailService = new VlmEmailEnrichmentService();
const callerService = new VlmOutboundCallerService();

export interface AutoAgentConfig {
  city: string;
  industry: string;
  maxLeads: number;
  enrichEmails: boolean;
  autoGenerateSites: boolean;
  autoCall: boolean;
  minQualityScore: number;
  callScript?: string;
  callerIdNumber?: string;
  callDelayMs: number;
  useKnowledgeBase?: boolean; // New option to enable knowledge base integration
}

export interface AutoAgentProgress {
  phase: "idle" | "discovering" | "enriching" | "scoring" | "generating_sites" | "generating_script" | "calling" | "complete" | "error";
  message: string;
  discovered: number;
  enriched: number;
  sitesGenerated: number;
  callsQueued: number;
  callsComplete: number;
  errors: string[];
  knowledgeEnhanced?: boolean; // Track if knowledge base was used
}

const DEFAULT_PITCH_TEMPLATE = `Hi, this is your Google Place AI Biz Bot calling about {businessName}. We've built a free Google-powered AI website for your business that's now available online. Would you like us to send you the link? Press 1 to receive your free website link via text message. Press 2 if you're not interested. Your basic site is already live and our AI concierge is ready to answer questions from your customers.`;

export class VlmAutoAgentService {
  private progress: AutoAgentProgress = {
    phase: "idle", message: "", discovered: 0, enriched: 0,
    sitesGenerated: 0, callsQueued: 0, callsComplete: 0, errors: [],
  };

  getProgress(): AutoAgentProgress {
    return { ...this.progress };
  }

  resetProgress(): void {
    this.progress = {
      phase: "idle", message: "", discovered: 0, enriched: 0,
      sitesGenerated: 0, callsQueued: 0, callsComplete: 0, errors: [],
    };
  }

  /**
   * Generate AI-enhanced script using knowledge base
   */
  async generateKnowledgeBasedScript(prospect: Partial<VlmProspect>, campaign?: VlmCampaign): Promise<string> {
    try {
      // If we have a full prospect object, use the enhanced method
      if (prospect.businessName && prospect.industry) {
        return await callerService.generateKnowledgeEnhancedScript(
          prospect as VlmProspect,
          campaign
        );
      }
      
      // Fallback to simple script generation
      return this.generateAiScript(prospect);
    } catch (error) {
      console.error("[VlmAutoAgent] Knowledge script generation failed:", error);
      return this.generateAiScript(prospect);
    }
  }

  generateAiScript(prospect: Partial<VlmProspect>, baseScript?: string): string {
    const template = baseScript || DEFAULT_PITCH_TEMPLATE;
    return template
      .replace(/\{businessName\}/g, prospect.businessName || "your business")
      .replace(/\{industry\}/g, prospect.industry || "your industry")
      .replace(/\{city\}/g, prospect.city || "your area")
      .replace(/\{rating\}/g, prospect.rating || "great")
      .replace(/\{reviewCount\}/g, String(prospect.reviewCount || 0));
  }

  async createSiteForProspect(prospect: VlmProspect): Promise<string | null> {
    try {
      if (!prospect.googlePlaceId) return null;

      const existing = await storage.getSiteConfigByPlaceId(prospect.googlePlaceId);
      if (existing) return existing.id;

      const greetingMessage = `Hi! Welcome to ${prospect.businessName}. I'm your AI assistant — ask me anything about our business, hours, services, or leave a message for the owner.`;

      const siteConfig = await storage.createSiteConfig({
        name: prospect.businessName,
        placeId: prospect.googlePlaceId,
        placeData: {
          name: prospect.businessName,
          address: prospect.address,
          phone: prospect.phone,
          website: prospect.website,
          rating: prospect.rating,
          reviewCount: prospect.reviewCount,
          industry: prospect.industry,
          city: prospect.city,
          state: prospect.state,
          reviews: prospect.reviews || [],
          photos: prospect.photos || [],
        },
        chatbotEnabled: true,
        voiceConciergeEnabled: true,
        widgetPosition: "bottom-right",
        widgetColor: "#2563eb",
        greetingMessage,
        placeholderText: "Ask me anything...",
        modelProvider: "kimi",
      });

      return siteConfig.id;
    } catch (error: any) {
      this.progress.errors.push(`Site gen failed for ${prospect.businessName}: ${error.message}`);
      return null;
    }
  }

  async runPipeline(config: AutoAgentConfig): Promise<{
    campaignId: string;
    stats: AutoAgentProgress;
  }> {
    this.resetProgress();
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) throw new Error("Google Cloud API key not configured");

    try {
      const mapsService = new VlmGoogleMapsService(apiKey);

      this.progress.phase = "discovering";
      this.progress.message = `Searching Google Maps for ${config.industry} in ${config.city}...`;

      const places = await mapsService.searchPlaces({
        city: config.city,
        industry: config.industry,
        maxResults: config.maxLeads,
      });
      this.progress.discovered = places.length;

      this.progress.phase = "enriching";
      this.progress.message = `Enriching ${places.length} businesses with details...`;

      let prospects = await mapsService.enrichProspects(places, config.industry);

      if (config.enrichEmails) {
        prospects = await emailService.enrichProspects(prospects);
      }

      this.progress.enriched = prospects.length;

      this.progress.phase = "scoring";
      this.progress.message = "Scoring prospect quality...";

      prospects = scoringService.scoreProspects(prospects, config.city);
      prospects = scoringService.sortByQuality(prospects);

      const savedProspects = await storage.createVlmProspects(prospects);

      const campaign = await storage.createVlmCampaign({
        name: `Auto: ${config.industry} in ${config.city}`,
        city: config.city,
        industry: config.industry,
        status: "active",
        scriptTemplate: config.callScript || DEFAULT_PITCH_TEMPLATE,
        callerIdNumber: config.callerIdNumber || null,
        totalProspects: savedProspects.length,
      });

      const qualifiedProspects = savedProspects.filter(
        (p) => p.qualityScore >= config.minQualityScore && p.phone
      );

      // Generate knowledge-enhanced script if enabled
      let enhancedScriptTemplate = config.callScript || DEFAULT_PITCH_TEMPLATE;
      if (config.useKnowledgeBase && qualifiedProspects.length > 0) {
        this.progress.phase = "generating_script";
        this.progress.message = "Generating knowledge-enhanced scripts...";
        
        try {
          // Use the first qualified prospect as a template to generate industry-specific script
          const sampleProspect = qualifiedProspects[0];
          enhancedScriptTemplate = await callerService.generateKnowledgeEnhancedScript(
            sampleProspect,
            campaign
          );
          
          this.progress.knowledgeEnhanced = true;
          
          // Update campaign with enhanced script
          await storage.updateVlmCampaign(campaign.id, {
            scriptTemplate: enhancedScriptTemplate
          });
          
          console.log("[VlmAutoAgent] Knowledge-enhanced script generated");
        } catch (error: any) {
          console.error("[VlmAutoAgent] Knowledge enhancement failed, using default:", error);
          this.progress.knowledgeEnhanced = false;
        }
      }

      if (config.autoGenerateSites) {
        this.progress.phase = "generating_sites";
        this.progress.message = `Generating AI websites for ${qualifiedProspects.length} businesses...`;

        for (const prospect of qualifiedProspects) {
          const siteId = await this.createSiteForProspect(prospect);
          if (siteId) {
            this.progress.sitesGenerated++;
            await storage.updateVlmProspect(prospect.id, {
              notes: `Site generated: ${siteId}`,
            });
          }
        }
      }

      if (config.autoCall) {
        this.progress.phase = "calling";
        this.progress.message = `Queuing ${qualifiedProspects.length} outbound calls...`;

        for (const prospect of qualifiedProspects) {
          try {
            await storage.updateVlmProspect(prospect.id, { status: "queued" });

            const existingAttempts = await storage.getVlmCallAttempts({ prospectId: prospect.id });
            const attemptNumber = existingAttempts.length + 1;

            const result = await callerService.initiateCall(prospect, campaign);

            await storage.createVlmCallAttempt(
              callerService.buildCallAttemptRecord(prospect.id, campaign.id, result.callSid, attemptNumber)
            );

            await storage.updateVlmProspect(prospect.id, { status: "called" });
            await storage.updateVlmCampaign(campaign.id, {
              totalCalled: (campaign.totalCalled || 0) + this.progress.callsQueued + 1,
            });

            this.progress.callsQueued++;

            if (config.callDelayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, config.callDelayMs));
            }
          } catch (error: any) {
            this.progress.errors.push(`Call failed for ${prospect.businessName}: ${error.message}`);
          }
        }
      }

      this.progress.phase = "complete";
      this.progress.message = "Pipeline complete!";

      return { campaignId: campaign.id, stats: this.getProgress() };
    } catch (error: any) {
      this.progress.phase = "error";
      this.progress.message = error.message;
      this.progress.errors.push(error.message);
      throw error;
    }
  }

  async sendWebsiteLink(prospectId: string): Promise<boolean> {
    try {
      const prospect = await storage.getVlmProspect(prospectId);
      if (!prospect || !prospect.phone) return false;

      let siteId: string | null = null;
      if (prospect.notes?.includes("Site generated:")) {
        siteId = prospect.notes.split("Site generated:")[1]?.trim() || null;
      }

      if (!siteId && prospect.googlePlaceId) {
        const site = await storage.getSiteConfigByPlaceId(prospect.googlePlaceId);
        if (site) siteId = site.id;
      }

      if (!siteId) {
        siteId = await this.createSiteForProspect(prospect);
      }

      if (!siteId) return false;

      const { getTwilioClient, getTwilioFromPhoneNumber } = await import("../twilio");
      const client = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();

      if (!fromNumber) return false;

      const baseUrl =
        process.env.WEBHOOK_BASE_URL ||
        process.env.REPLIT_DEPLOYMENT_URL ||
        `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

      const siteUrl = `${baseUrl}/site/${siteId}`;

      await client.messages.create({
        to: prospect.phone,
        from: fromNumber,
        body: `Hi from AI Biz Bot! Here's your free AI-powered website for ${prospect.businessName}: ${siteUrl}\n\nYour site has a live AI concierge that can answer customer questions 24/7. Reply to this number anytime to manage your website, check visitor stats, or update your business info. We're polishing it up over the next hour!`,
      });

      await storage.updateVlmProspect(prospectId, {
        status: "won",
        notes: `${prospect.notes || ""}\nSMS sent: ${new Date().toISOString()}`,
      });

      return true;
    } catch (error: any) {
      console.error(`[VLM Auto-Agent] Failed to send website link: ${error.message}`);
      return false;
    }
  }

  async getReport(campaignId: string): Promise<{
    campaign: VlmCampaign | null;
    prospects: VlmProspect[];
    callAttempts: any[];
    summary: {
      totalLeads: number;
      qualified: number;
      called: number;
      connected: number;
      interested: number;
      sitesGenerated: number;
      smsSent: number;
      conversionRate: string;
    };
  }> {
    const campaign = await storage.getVlmCampaign(campaignId);
    const prospects = await storage.getVlmProspects({ limit: 10000 });
    const callAttempts = await storage.getVlmCallAttempts({ campaignId, limit: 10000 });

    const campaignProspects = prospects.filter(
      (p) => p.industry === campaign?.industry && p.city === campaign?.city
    );

    const summary = {
      totalLeads: campaignProspects.length,
      qualified: campaignProspects.filter((p) => p.phone).length,
      called: callAttempts.length,
      connected: callAttempts.filter((a) => a.outcome === "connected" || a.outcome === "sale").length,
      interested: callAttempts.filter((a) => a.outcome === "sale").length,
      sitesGenerated: campaignProspects.filter((p) => p.notes?.includes("Site generated")).length,
      smsSent: campaignProspects.filter((p) => p.notes?.includes("SMS sent")).length,
      conversionRate: callAttempts.length
        ? `${Math.round((callAttempts.filter((a) => a.outcome === "sale").length / callAttempts.length) * 100)}%`
        : "0%",
    };

    return { campaign, prospects: campaignProspects, callAttempts, summary };
  }
}

export const autoAgentService = new VlmAutoAgentService();
