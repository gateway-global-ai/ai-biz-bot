import { getTwilioClient, getTwilioFromPhoneNumber } from "../twilio";
import type { VlmProspect, VlmCampaign, InsertVlmCallAttempt } from "@shared/schema";
import { knowledgeBaseService } from "./knowledge-base";

export class VlmOutboundCallerService {
  async initiateCall(
    prospect: VlmProspect,
    campaign: VlmCampaign,
    options?: { statusCallbackUrl?: string; twimlUrl?: string }
  ): Promise<{ callSid: string; status: string }> {
    if (!prospect.phone) {
      throw new Error(`No phone number for prospect ${prospect.businessName}`);
    }

    const client = await getTwilioClient();
    const fromNumber = campaign.callerIdNumber || (await getTwilioFromPhoneNumber());

    if (!fromNumber) {
      throw new Error("No caller ID number configured");
    }

    const baseUrl =
      process.env.WEBHOOK_BASE_URL ||
      process.env.REPLIT_DEPLOYMENT_URL ||
      `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

    const twimlUrl = options?.twimlUrl || `${baseUrl}/api/vlm/twiml/${campaign.id}`;
    const statusCallback = options?.statusCallbackUrl || `${baseUrl}/api/vlm/call-status`;

    const call = await client.calls.create({
      url: twimlUrl,
      from: fromNumber,
      to: prospect.phone,
      statusCallback,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      timeout: 30,
      machineDetection: "Enable",
    });

    return { callSid: call.sid, status: call.status };
  }

  /**
   * Generate knowledge-enhanced script for a campaign
   * Uses knowledge base to create industry-specific, intelligent scripts
   */
  async generateKnowledgeEnhancedScript(
    prospect: VlmProspect,
    campaign?: VlmCampaign
  ): Promise<string> {
    try {
      // Search for industry-specific knowledge
      const industryKnowledge = await knowledgeBaseService.searchKnowledge({
        query: prospect.industry,
        category: "business_intelligence",
        status: "active"
      });

      // Search for general outbound calling best practices
      const callingKnowledge = await knowledgeBaseService.searchKnowledge({
        query: "outbound calling scripts",
        category: "sales_intelligence",
        status: "active"
      });

      // Build context from knowledge base
      let scriptContext = "";
      
      if (industryKnowledge.length > 0) {
        const knowledge = industryKnowledge[0];
        scriptContext += `Industry insights: ${knowledge.summary || knowledge.title}\n`;
      }

      // Generate industry-tailored value proposition
      const valueProps = this.generateIndustryValueProposition(prospect.industry);
      
      // Create enhanced script template
      const baseTemplate = campaign?.scriptTemplate || this.getDefaultTemplate(prospect.industry);
      
      // Enhance with knowledge-based insights
      let enhancedScript = baseTemplate;
      
      // Add industry-specific pain points if available
      if (scriptContext) {
        enhancedScript = this.incorporateKnowledgeIntoScript(enhancedScript, scriptContext, valueProps);
      }

      return enhancedScript;
    } catch (error) {
      console.error("[VlmOutboundCaller] Knowledge enhancement failed:", error);
      // Fallback to standard script generation
      return campaign?.scriptTemplate || this.getDefaultTemplate(prospect.industry);
    }
  }

  /**
   * Generate industry-specific value propositions
   */
  private generateIndustryValueProposition(industry: string): string {
    const valuePropMap: Record<string, string> = {
      restaurant: "increase reservations and streamline online ordering",
      retail: "boost foot traffic and manage customer inquiries 24/7",
      healthcare: "reduce appointment no-shows and improve patient communication",
      legal: "capture more client leads and automate intake processes",
      "real estate": "generate qualified buyer leads and schedule property viewings",
      automotive: "increase test drive bookings and service appointments",
      salon: "fill appointment slots and reduce cancellations",
      fitness: "grow membership sign-ups and class bookings",
      plumber: "capture emergency calls and schedule service appointments",
      electrician: "respond faster to service requests and book more jobs",
      hvac: "schedule seasonal maintenance and emergency repairs",
      default: "attract more customers and automate your business communications"
    };

    return valuePropMap[industry.toLowerCase()] || valuePropMap.default;
  }

  /**
   * Get default script template based on industry
   */
  private getDefaultTemplate(industry: string): string {
    const valueProposition = this.generateIndustryValueProposition(industry);
    
    return `Hi, this is your AI Biz Bot calling about {businessName}. ` +
      `We've created a free, Google-powered AI website for your ${industry} business that can help you ${valueProposition}. ` +
      `Your basic site is already live with an AI concierge ready to answer customer questions 24/7. ` +
      `Would you like us to send you the link? Press 1 to receive your free website via text, or press 2 if you're not interested.`;
  }

  /**
   * Incorporate knowledge insights into script
   */
  private incorporateKnowledgeIntoScript(
    baseScript: string,
    knowledge: string,
    valueProps: string
  ): string {
    // This is a placeholder for more sophisticated script enhancement
    // In a production system, you might use AI to intelligently weave in knowledge
    return baseScript;
  }

  /**
   * Generate TwiML for the outbound call. Twilio requires absolute URLs for Gather action;
   * relative URLs cause Twilio to fail silently when POSTing gathered digits.
   * @param baseUrl - Public base URL of the server (e.g. https://yourserver.com). Required.
   */
  generateTwiml(campaign: VlmCampaign, prospect: VlmProspect, baseUrl: string): string {
    const base = (baseUrl || "").trim();
    if (!base) {
      throw new Error(
        "baseUrl is required for Twilio Gather action. Set WEBHOOK_BASE_URL or ensure the request has protocol and host."
      );
    }

    const script =
      campaign.scriptTemplate ||
      `Hello, this is a call regarding AI-powered business solutions for ${prospect.industry} businesses. ` +
        `We noticed ${prospect.businessName} and wanted to share how our platform can help. ` +
        `If you're interested, please press 1 to learn more, or press 2 to be removed from our list. Thank you.`;

    const personalizedScript = script
      .replace(/\{businessName\}/g, prospect.businessName)
      .replace(/\{industry\}/g, prospect.industry)
      .replace(/\{city\}/g, prospect.city || "your area");

    const gatherAction = `${base.replace(/\/$/, "")}/api/vlm/gather-response`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" action="${this.escapeXml(gatherAction)}" method="POST" timeout="10">
    <Say voice="Polly.Matthew">${this.escapeXml(personalizedScript)}</Say>
  </Gather>
  <Say voice="Polly.Matthew">We didn't receive a response. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  generateGatherResponse(digit: string): string {
    if (digit === "1") {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Awesome! We're sending your free website link to this phone number right now via text message. Your AI concierge is already live and ready to answer customer questions. We'll polish the site up over the next hour. Reply to that text anytime to manage your business through our AI Biz Bot. Have a great day!</Say>
  <Hangup/>
</Response>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">No problem at all. If you change your mind, your free AI website will still be available. Have a great day. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  buildCallAttemptRecord(
    prospectId: string,
    campaignId: string | null,
    callSid: string,
    attemptNumber: number
  ): InsertVlmCallAttempt {
    return {
      prospectId,
      campaignId,
      callSid,
      attemptNumber,
      status: "queued",
      calledAt: new Date(),
    };
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
