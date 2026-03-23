/**
 * toolHandler.ts - Server-side tool execution for Gemini Multimodal Live
 * Location: /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/server/services/voice/toolHandler.ts
 */
import { getBusinessDetails, getBusinessReviews } from "./mapsService";
import { generateBusinessIntelligence } from "./intelligenceService";
import { storage } from "../storage";
import { sendPlatformEmail } from "./emailService";
import { db } from "../db";
import { workspaceConfigurations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createGoogleWorkspaceService, type GoogleWorkspaceCredentials } from "../mcp/googleWorkspace";
import { isKnowledgeWorkerPlan } from "../prompts/knowledgeWorkerPrompt";
import { handleGetHotelInventory } from "../tools/hotelInventoryHandler";
import { handleFetchCityWarrants } from "../tools/fetchCityWarrantsHandler";
import { handleVineLookupAndDispatch } from "../tools/vineDispatchHandler";
import { getPlaceDetails } from "../tools/placesHandler";

/**
 * Interface for the tool call structure received from the Gemini v1beta protocol
 */
interface ToolCall {
  name: string;
  args: any;
  id?: string;
}

export interface ToolCallContext {
  siteConfigId?: string | null;
}

// ── Lead Qualifier tool handlers ─────────────────────────────────────────────

async function handleSearchCrm(args: any) {
  const callerId: string = args.caller_id || '';
  const email: string = args.email || '';

  // Search by phone (primary) then email (secondary)
  let account = null;
  if (callerId) {
    account = await storage.getCustomerAccountByPhone(callerId).catch(() => null);
  }
  if (!account && email) {
    account = await storage.getCustomerAccountByEmail?.(email).catch(() => null);
  }

  if (account) {
    return {
      exists: true,
      leadId: account.id,
      name: account.name || '',
      email: account.email || '',
      phone: account.phone || '',
      note: 'Existing contact found in CRM.',
    };
  }
  return { exists: false, note: 'New contact — not previously in CRM.' };
}

function handleQualifyLead(args: any) {
  const signals = args.nbat_signals || {};
  let score = 0;

  if (signals.need && signals.need.length > 5) score += 2.5;
  if (signals.budget && signals.budget.length > 2) score += 2.5;
  if (signals.authority && /yes|i am|decision|owner|manager/i.test(signals.authority)) score += 2.5;
  if (signals.timeline && signals.timeline.length > 2) score += 2.5;

  // Bonus for urgency signals
  if (/asap|urgent|this week|q[1-4]|by [a-z]/i.test(JSON.stringify(signals))) score = Math.min(10, score + 1);

  const rounded = Math.round(score * 10) / 10;
  let recommendation: string;
  if (rounded >= 8) recommendation = 'book_meeting';
  else if (rounded >= 5) recommendation = 'send_resources';
  else recommendation = 'graceful_close';

  return {
    score: rounded,
    recommendation,
    signals_captured: Object.keys(signals).filter(k => signals[k]?.length > 0),
  };
}

async function handleBookMeeting(args: any) {
  // Stub: returns next available mock slot. Replace with Cal.com / Google Calendar integration.
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(10, 0, 0, 0); // Default: next day at 10 AM

  const slot = now.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  return {
    booked: true,
    slot,
    lead_name: args.lead_name,
    lead_contact: args.lead_contact,
    confirmation_message: `Your meeting is confirmed for ${slot}. A calendar invite will be sent to ${args.lead_contact}.`,
  };
}

// ── Sales Closer tool handlers ───────────────────────────────────────────────

function handleGenerateQuote(args: any) {
  const tierLabels: Record<string, { label: string; price: string }> = {
    starter: { label: 'Starter', price: '$49/mo' },
    ai_pro:  { label: 'AI Pro',  price: '$149/mo' },
    enterprise: { label: 'Enterprise', price: '$499/mo' },
  };
  const tier = tierLabels[args.tier] || { label: args.tier, price: 'Custom' };

  return {
    quote_generated: true,
    prospect_name: args.prospect_name || 'Valued Client',
    scope: args.scope_summary,
    tier: tier.label,
    price: tier.price,
    summary: `Proposal for ${args.prospect_name || 'you'}: ${tier.label} plan at ${tier.price}. Scope: ${args.scope_summary}. This includes full onboarding, AI-powered website, and 30-day support.`,
    next_step: 'Use stripe_checkout to finalize payment.',
  };
}

async function handleApplyDiscount(args: any) {
  const requestedPct: number = args.requested_pct || 0;
  const businessId: string = args.business_id || '';

  // Default max is 10%. Override from site config if available.
  let maxDiscountPct = 10;
  try {
    const siteConfig = await storage.getSiteConfig(businessId);
    const configLimit = (siteConfig as any)?.agentConfig?.toolLimits?.max_discount_percent;
    if (typeof configLimit === 'number') maxDiscountPct = configLimit;
  } catch {
    // Use default
  }

  const approved = requestedPct <= maxDiscountPct;
  return {
    approved,
    requested_pct: requestedPct,
    approved_pct: approved ? requestedPct : maxDiscountPct,
    message: approved
      ? `Discount of ${requestedPct}% approved.`
      : `Requested ${requestedPct}% exceeds authorized limit of ${maxDiscountPct}%. Applying ${maxDiscountPct}% instead.`,
  };
}

async function handleStripeCheckout(args: any) {
  const { business_id, plan, customer_email } = args;

  // Reuse the existing checkout session endpoint internally
  try {
    const fetch = (await import('node-fetch')).default;
    const port = process.env.PORT || 3004;
    const response = await fetch(`http://localhost:${port}/api/subscriptions/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, siteConfigId: business_id, customerEmail: customer_email }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Checkout session failed: ${errText}`);
    }

    const data = await response.json() as { url?: string };
    return {
      checkout_created: true,
      url: data.url,
      message: `Secure payment link created. Sending to ${customer_email || 'the prospect'} now.`,
    };
  } catch (err: any) {
    console.error('[ToolHandler] stripe_checkout error:', err.message);
    return { checkout_created: false, error: 'Unable to create payment link right now. Please try again shortly.' };
  }
}

// ── Workspace MCP (read-only); Jason Standard: UUID scoping + plan check ─────

const WORKSPACE_PLAN_REQUIRED_MESSAGE =
  "I'd love to check your calendar and files, but that feature requires the Voice or Enterprise plan. Would you like to upgrade?";
const WORKSPACE_NOT_CONNECTED_MESSAGE =
  "Google Workspace isn't connected for this business. Connect it in the Workspace tab in your site settings to enable this.";

async function getWorkspaceContext(siteConfigId: string): Promise<
  { allowed: true; credentials: GoogleWorkspaceCredentials } | { allowed: false; error: string }
> {
  if (!siteConfigId || typeof siteConfigId !== "string") {
    return { allowed: false, error: "siteConfigId is required." };
  }
  const siteConfig = await storage.getSiteConfig(siteConfigId);
  if (!siteConfig) {
    return { allowed: false, error: "Site not found." };
  }
  const plan = (siteConfig as any).plan || "free";
  if (!isKnowledgeWorkerPlan(plan)) {
    return { allowed: false, error: WORKSPACE_PLAN_REQUIRED_MESSAGE };
  }
  const row = await db.query.workspaceConfigurations.findFirst({
    where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
    columns: { accessToken: true, refreshToken: true, tokenExpiry: true },
  });
  if (!row?.accessToken) {
    return { allowed: false, error: WORKSPACE_NOT_CONNECTED_MESSAGE };
  }
  const credentials: GoogleWorkspaceCredentials = {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? undefined,
    expiryDate: row.tokenExpiry ? new Date(row.tokenExpiry).getTime() : undefined,
  };
  return { allowed: true, credentials };
}

async function handleMcpSearchDrive(args: any) {
  const ctx = await getWorkspaceContext(args.siteConfigId);
  if (!ctx.allowed) {
    const isPlanGating = ctx.error === WORKSPACE_PLAN_REQUIRED_MESSAGE;
    return {
      error: ctx.error,
      plan_required: isPlanGating,
      audio_cue: isPlanGating
        ? "I need a quick permission update in the Workspace tab to see that. If you hop into your Admin Panel and connect Google Workspace, I'll be able to access those files instantly. Should we keep talking strategy in the meantime?"
        : "I'm trying to access those files for you, but it looks like I don't have the green light on my end yet. Should we keep talking strategy while you sort that out?",
      ui_action: isPlanGating ? "SHOW_UPGRADE_MODAL" : "SHOW_WORKSPACE_CONNECT",
    };
  }
  const service = createGoogleWorkspaceService(ctx.credentials);
  try {
    const result = await service.searchDriveFiles(args.query, args.mimeType);
    if (!result.success) {
      return {
        error: result.error || "Drive search failed.",
        audio_cue: "I'm hitting a bit of digital static with that Drive search right now — let's try a different angle. Tell me more about what you're looking for and I'll keep searching in the background.",
      };
    }
    return {
      audio_cue: "Found it!",
      summary: (result.data as any).summary,
      count: (result.data as any).count,
      files: (result.data as any).files,
    };
  } catch (err: any) {
    return {
      error: err.message || "Unexpected Drive error.",
      audio_cue: "I'm hitting a bit of digital static with the Drive search — let's try another angle.",
    };
  }
}

async function handleMcpReadCalendar(args: any) {
  const ctx = await getWorkspaceContext(args.siteConfigId);
  if (!ctx.allowed) {
    const isPlanGating = ctx.error === WORKSPACE_PLAN_REQUIRED_MESSAGE;
    return {
      error: ctx.error,
      plan_required: isPlanGating,
      audio_cue: isPlanGating
        ? "I'd love to check your calendar, but that feature requires the Voice or Enterprise plan. Would you like me to walk you through the upgrade?"
        : "I need the calendar connection set up first — you can do that quickly in the Workspace tab of your Admin Panel.",
      ui_action: isPlanGating ? "SHOW_UPGRADE_MODAL" : "SHOW_WORKSPACE_CONNECT",
    };
  }
  const service = createGoogleWorkspaceService(ctx.credentials);
  try {
    const result = await service.listCalendarEvents(
      20,
      args.timeMin,
      args.timeMax
    );
    if (!result.success) {
      return {
        error: result.error || "Calendar read failed.",
        audio_cue: "I'm hitting a bit of digital static with the calendar right now — let's keep talking while I try again.",
      };
    }
    const events = (result.data as any).events || [];
    const summary =
      events.length === 0
        ? "No events in this time range."
        : `You have ${events.length} event(s): ${events.map((e: any) => `${e.summary || "Untitled"} (${e.start}–${e.end})`).join("; ")}`;
    return {
      audio_cue: events.length === 0 ? "Your schedule looks clear in that window." : "Got your schedule — let me walk you through it.",
      summary,
      events,
      count: events.length,
    };
  } catch (err: any) {
    return {
      error: err.message || "Unexpected Calendar error.",
      audio_cue: "I'm getting a bit of digital static on the calendar feed — let's keep talking strategy while that sorts itself out.",
    };
  }
}

// ── Sales Closer / Onboarding ────────────────────────────────────────────────

async function handleSendOnboardingEmail(args: any) {
  const { platformId, customerEmail, customerName, planName, agentName } = args;

  if (!platformId || !customerEmail || !customerName || !planName) {
    return { sent: false, error: 'Missing required fields: platformId, customerEmail, customerName, planName.' };
  }

  // Guard 1 — Resolve siteConfigId from platformId (grounding check)
  const siteConfigId = await storage.getSiteConfigIdByPlatformId(platformId);
  if (!siteConfigId) {
    console.error(`[ToolSecurity] send_onboarding_email blocked: platformId ${platformId} not found in platform_business_map.`);
    return { sent: false, error: 'Identity mismatch. Business not found.' };
  }

  // Guard 2 — Payment verification (pre-flight check)
  const siteConfig = await storage.getSiteConfig(siteConfigId);
  if (!siteConfig) {
    console.error(`[ToolSecurity] send_onboarding_email blocked: siteConfig not found for ${siteConfigId}.`);
    return { sent: false, error: 'Business configuration not found.' };
  }

  const dbPlan = (siteConfig.plan || 'free').toLowerCase();
  const requestedPlan = planName.toLowerCase().replace(/\s+/g, '_');
  const isPaid = dbPlan !== 'free';

  if (!isPaid) {
    console.warn(`[ToolSecurity] send_onboarding_email blocked: DB plan is '${dbPlan}', payment not yet verified.`);
    return {
      sent: false,
      error: 'Verification failed. Our records show the upgrade is not yet complete.',
      helpText: 'Please complete the Stripe checkout to unlock this tool. There may be a brief sync delay — try again in a moment.',
    };
  }

  // Guard 3 — Plan name sanity check (prevent tier spoofing)
  const planMatches = dbPlan === requestedPlan ||
    dbPlan.includes(requestedPlan) ||
    requestedPlan.includes(dbPlan);

  if (!planMatches) {
    console.warn(`[ToolSecurity] send_onboarding_email blocked: requested plan '${requestedPlan}' does not match DB plan '${dbPlan}'.`);
    return {
      sent: false,
      error: `Verification failed. Your account is on the '${siteConfig.plan}' plan, not '${planName}'.`,
    };
  }

  // Point of no return — all guards passed
  const result = await sendPlatformEmail({
    to: customerEmail,
    customerName,
    businessName: siteConfig.name || 'Your Business',
    planName,
    platformId,
    agentName: agentName || 'Your AI Business Agent',
    siteUrl: (siteConfig as any).domain ? `https://${(siteConfig as any).domain}` : '',
  });

  if (!result.sent) {
    console.error(`[ToolSecurity] send_onboarding_email: email service error — ${result.error}`);
    return { sent: false, error: 'Email service temporarily unavailable. The upgrade is confirmed — we will retry delivery.' };
  }

  const verbalConfirmation = `I've got that confirmed, ${customerName}. I just sent your complete onboarding kit to ${customerEmail}. It includes your unique Platform ID and everything you need to configure your new ${planName} tools. Welcome aboard!`;

  return {
    sent: true,
    tool_type: 'email_sent',
    verbal_confirmation: verbalConfirmation,
  };
}

/**
 * Main dispatcher that routes Gemini's function calls to internal services.
 * Every tool declared in the client's setupMessage must be handled here.
 * @param context Optional session context (e.g. siteConfigId) for site-anchored tools.
 */
export async function handleToolCall(toolCall: ToolCall, context?: ToolCallContext) {
  console.log(`[ToolHandler] 🛠️ Executing tool: ${toolCall.name} with args:`, toolCall.args);

  try {
    switch (toolCall.name) {
      case "get_hotel_inventory":
        return await handleGetHotelInventory({
          ...toolCall.args,
          _sessionSiteConfigId: context?.siteConfigId ?? undefined,
        });

      case "fetch_city_warrants":
        return await handleFetchCityWarrants({
          ...toolCall.args,
          _sessionSiteConfigId: context?.siteConfigId ?? undefined,
        });

      case "vine_lookup_and_dispatch":
        return await handleVineLookupAndDispatch({
          ...toolCall.args,
          _sessionSiteConfigId: context?.siteConfigId ?? undefined,
        });
      case "get_business_details":
        return await getBusinessDetails(toolCall.args.placeId || toolCall.args.place_id);

      case "get_booking_and_pricing_info": {
        const siteConfigId = toolCall.args.siteConfigId || context?.siteConfigId;
        if (!siteConfigId) return { error: "Business context is required.", websiteUri: null, message: "I don't have the business website link right now. Please check the business listing or call them directly." };
        const siteConfig = await storage.getSiteConfig(siteConfigId);
        if (!siteConfig) return { error: "Business not found.", websiteUri: null, message: "I couldn't find that business's details. Please try calling or searching online." };
        const placeData = (siteConfig as any).placeData;
        const placeId = (siteConfig as any).placeId;
        let websiteUri: string | null = placeData?.websiteUri ?? placeData?.website ?? null;
        if (!websiteUri && placeId) {
          try {
            const details = await getPlaceDetails(placeId);
            websiteUri = (details as any).websiteUri ?? null;
          } catch (_) {
            // ignore
          }
        }
        const message = websiteUri
          ? `Our current pricing and booking are on our website: ${websiteUri}. I recommend checking there for the latest services and to schedule an appointment.`
          : "I don't have our website link handy. Please search for us online or call us for pricing and to book.";
        return { websiteUri, message };
      }

      case "get_business_reviews":
        return await getBusinessReviews(
          toolCall.args.placeId || toolCall.args.place_id,
          toolCall.args.maxReviews || toolCall.args.max_reviews || 5
        );

      case "query_knowledge_library": {
        const siteConfigIdForLib = toolCall.args.siteConfigId || context?.siteConfigId;
        if (!siteConfigIdForLib)
          return { error: "Business context is required.", results: [] };
        const question = toolCall.args.question?.trim() || "";
        if (!question) return { error: "A question is required.", results: [] };
        const results = await storage.searchKnowledgeLibrary(siteConfigIdForLib, question, 5);
        return { results };
      }

      case "get_business_intelligence":
        return await generateBusinessIntelligence(
          toolCall.args.businessName || toolCall.args.business_name,
          toolCall.args.focusArea
        );

      case "request_manual_input":
        return {
          status: "awaiting_user_input",
          prompt: toolCall.args.prompt || "Please provide the requested info.",
        };

      // Lead Qualifier tools
      case "search_crm":
        return await handleSearchCrm(toolCall.args);

      case "qualify_lead":
        return handleQualifyLead(toolCall.args);

      case "book_meeting":
        return await handleBookMeeting(toolCall.args);

      // Sales Closer tools
      case "generate_quote":
        return handleGenerateQuote(toolCall.args);

      case "apply_discount":
        return await handleApplyDiscount(toolCall.args);

      case "stripe_checkout":
        return await handleStripeCheckout(toolCall.args);

      case "send_onboarding_email":
        return await handleSendOnboardingEmail(toolCall.args);

      // Workspace MCP (read-only; plan + UUID guardrails)
      case "mcp_search_drive":
        return await handleMcpSearchDrive(toolCall.args);

      case "mcp_read_calendar":
        return await handleMcpReadCalendar(toolCall.args);

      // Canvas display — client renders the UI; server just acknowledges
      case "show_canvas":
        return {
          acknowledged: true,
          canvas_type: toolCall.args?.canvas_type,
          items_count: Array.isArray(toolCall.args?.items) ? toolCall.args.items.length : 0,
        };

      default:
        console.warn(`[ToolHandler] ⚠️ Tool not recognized: ${toolCall.name}`);
        return { error: `Tool ${toolCall.name} is not implemented on the server.` };
    }
  } catch (error) {
    console.error(`[ToolHandler] ❌ Error executing ${toolCall.name}:`, error);
    return { error: "I'm having trouble accessing that information right now." };
  }
}