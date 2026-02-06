import { getTwilioClient, getTwilioFromPhoneNumber } from "../twilio";
import type { VlmProspect, VlmCampaign, InsertVlmCallAttempt } from "@shared/schema";

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

  generateTwiml(campaign: VlmCampaign, prospect: VlmProspect): string {
    const script =
      campaign.scriptTemplate ||
      `Hello, this is a call regarding AI-powered business solutions for ${prospect.industry} businesses. ` +
        `We noticed ${prospect.businessName} and wanted to share how our platform can help. ` +
        `If you're interested, please press 1 to learn more, or press 2 to be removed from our list. Thank you.`;

    const personalizedScript = script
      .replace(/\{businessName\}/g, prospect.businessName)
      .replace(/\{industry\}/g, prospect.industry)
      .replace(/\{city\}/g, prospect.city || "your area");

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" action="/api/vlm/gather-response" method="POST" timeout="10">
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
